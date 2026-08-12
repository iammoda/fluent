/**
 * Seed runner: builds items + prompts per language, additively.
 * Usage: pnpm db:seed [--force]  (--force wipes EVERYTHING and reseeds)
 * A language is skipped if it already has items, so adding a new language
 * later never touches your existing data.
 */
import { eq } from "drizzle-orm";
import { db } from "../index";
import { items, prompts, srsStates, attempts, sessions, stories, retells, outputTasks } from "../schema";
import {
  VERBS,
  PATTERNS,
  SER_ESTAR_CONTRASTS,
  TRANSFORM_PAIRS,
  PERSONS,
  PRONOUN_EN,
  PRONOUN_ES,
  PERSON_LABEL_ES,
  type PersonCode,
} from "./corpus";
import {
  FR_VERBS,
  FR_PATTERNS,
  ETRE_AVOIR_CONTRASTS,
  PRONOUN_EN_FR,
  PERSON_LABEL_FR,
} from "./corpus-fr";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function langHasItems(lang: string): boolean {
  return db.select({ id: items.id }).from(items).where(eq(items.lang, lang)).limit(1).all().length > 0;
}

// ---------------------------------------------------------------------------
// Spanish
// ---------------------------------------------------------------------------
function seedSpanish() {
  let itemCount = 0;
  let promptCount = 0;
  const formItemId = new Map<string, number>();
  const acceptedForms = (person: PersonCode, sentence: string) => [
    sentence,
    ...PRONOUN_ES[person].map((p) => `${p} ${sentence}`),
  ];

  for (const verb of VERBS) {
    for (let pi = 0; pi < PERSONS.length; pi++) {
      const person = PERSONS[pi];
      const form = verb.forms[person];
      const [row] = db
        .insert(items)
        .values({
          lang: "es",
          type: "verb_form",
          lemma: verb.lemma,
          tense: "pres",
          person,
          es: form,
          en: `${PRONOUN_EN[person]} ${verb.frame.enVerb[person]} (${verb.lemma}, ${verb.en})`,
          contrastGroup: verb.lemma === "ser" || verb.lemma === "estar" ? "ser_estar" : null,
          orderIndex: verb.order + pi,
        })
        .returning({ id: items.id })
        .all();
      formItemId.set(`${verb.lemma}:${person}`, row.id);
      itemCount++;

      const expected = `${form} ${verb.frame.esRest}`;
      db.insert(prompts)
        .values({
          itemId: row.id,
          promptType: "en_cue",
          promptText: `${PRONOUN_EN[person]} ${verb.frame.enVerb[person]} ${verb.frame.enRest}.`,
          expected,
          accepted: JSON.stringify(acceptedForms(person, expected)),
        })
        .run();
      promptCount++;
    }

    for (const [from, to] of TRANSFORM_PAIRS) {
      const sourceSentence = cap(`${verb.forms[from]} ${verb.frame.esRest}`) + ".";
      const expected = `${verb.forms[to]} ${verb.frame.esRest}`;
      db.insert(prompts)
        .values({
          itemId: formItemId.get(`${verb.lemma}:${to}`)!,
          promptType: "transformation",
          promptText: `Cambia a "${PERSON_LABEL_ES[to]}": ${sourceSentence}`,
          expected,
          accepted: JSON.stringify(acceptedForms(to, expected)),
        })
        .run();
      promptCount++;
    }
  }

  for (const c of SER_ESTAR_CONTRASTS) {
    db.insert(prompts)
      .values({
        itemId: formItemId.get(`${c.lemma}:${c.person}`)!,
        promptType: "contrast",
        promptText: c.text,
        expected: c.expected,
        accepted: JSON.stringify(c.accepted),
      })
      .run();
    promptCount++;
  }

  for (const pat of PATTERNS) {
    const [row] = db
      .insert(items)
      .values({
        lang: "es",
        type: "pattern",
        lemma: pat.key,
        es: pat.es,
        en: pat.en,
        orderIndex: pat.order,
      })
      .returning({ id: items.id })
      .all();
    itemCount++;
    for (const p of pat.prompts) {
      db.insert(prompts)
        .values({
          itemId: row.id,
          promptType: p.type === "question" ? "question" : "en_cue",
          promptText: p.text,
          expected: p.expected,
          accepted: JSON.stringify([p.expected, ...p.accepted]),
        })
        .run();
      promptCount++;
    }
  }
  return { itemCount, promptCount };
}

// ---------------------------------------------------------------------------
// French
// ---------------------------------------------------------------------------
function seedFrench() {
  let itemCount = 0;
  let promptCount = 0;
  const formItemId = new Map<string, number>();

  for (const verb of FR_VERBS) {
    for (let pi = 0; pi < PERSONS.length; pi++) {
      const person = PERSONS[pi];
      const form = verb.forms[person];
      const [row] = db
        .insert(items)
        .values({
          lang: "fr",
          type: "verb_form",
          lemma: verb.lemma,
          tense: "pres",
          person,
          es: form.bare, // canonical form field (column name is legacy 'es')
          en: `${PRONOUN_EN_FR[person]} ${verb.frame.enVerb[person]} (${verb.lemma}, ${verb.en})`,
          contrastGroup: verb.lemma === "être" || verb.lemma === "avoir" ? "etre_avoir" : null,
          orderIndex: verb.order + pi,
        })
        .returning({ id: items.id })
        .all();
      formItemId.set(`${verb.lemma}:${person}`, row.id);
      itemCount++;

      const expected = `${form.full} ${verb.frame.frRest}`;
      const accepted = [expected, ...(form.alts ?? []).map((a) => `${a} ${verb.frame.frRest}`)];
      db.insert(prompts)
        .values({
          itemId: row.id,
          promptType: "en_cue",
          promptText: `${PRONOUN_EN_FR[person]} ${verb.frame.enVerb[person]} ${verb.frame.enRest}.`,
          expected,
          accepted: JSON.stringify(accepted),
        })
        .run();
      promptCount++;
    }

    for (const [from, to] of TRANSFORM_PAIRS) {
      const src = verb.forms[from];
      const tgt = verb.forms[to];
      const sourceSentence = cap(`${src.full} ${verb.frame.frRest}`) + ".";
      const expected = `${tgt.full} ${verb.frame.frRest}`;
      const accepted = [expected, ...(tgt.alts ?? []).map((a) => `${a} ${verb.frame.frRest}`)];
      db.insert(prompts)
        .values({
          itemId: formItemId.get(`${verb.lemma}:${to}`)!,
          promptType: "transformation",
          promptText: `Mets à « ${PERSON_LABEL_FR[to]} » : ${sourceSentence}`,
          expected,
          accepted: JSON.stringify(accepted),
        })
        .run();
      promptCount++;
    }
  }

  for (const c of ETRE_AVOIR_CONTRASTS) {
    db.insert(prompts)
      .values({
        itemId: formItemId.get(`${c.lemma}:${c.person}`)!,
        promptType: "contrast",
        promptText: c.text,
        expected: c.expected,
        accepted: JSON.stringify(c.accepted),
      })
      .run();
    promptCount++;
  }

  for (const pat of FR_PATTERNS) {
    const [row] = db
      .insert(items)
      .values({
        lang: "fr",
        type: "pattern",
        lemma: pat.key,
        es: pat.fr,
        en: pat.en,
        orderIndex: pat.order,
      })
      .returning({ id: items.id })
      .all();
    itemCount++;
    for (const p of pat.prompts) {
      db.insert(prompts)
        .values({
          itemId: row.id,
          promptType: p.type === "question" ? "question" : "en_cue",
          promptText: p.text,
          expected: p.expected,
          accepted: JSON.stringify([p.expected, ...p.accepted]),
        })
        .run();
      promptCount++;
    }
  }
  return { itemCount, promptCount };
}

// ---------------------------------------------------------------------------
async function main() {
  const force = process.argv.includes("--force");
  if (force) {
    console.log("Wiping ALL data (--force)...");
    db.delete(retells).run(); // references stories
    db.delete(stories).run();
    db.delete(outputTasks).run();
    db.delete(attempts).run();
    db.delete(sessions).run();
    db.delete(srsStates).run();
    db.delete(prompts).run();
    db.delete(items).run();
  }

  if (langHasItems("es")) {
    console.log("es: already seeded, skipping.");
  } else {
    const r = seedSpanish();
    console.log(`es: seeded ${r.itemCount} items, ${r.promptCount} prompts.`);
  }

  if (langHasItems("fr")) {
    console.log("fr: already seeded, skipping.");
  } else {
    const r = seedFrench();
    console.log(`fr: seeded ${r.itemCount} items, ${r.promptCount} prompts.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
