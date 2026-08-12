/**
 * Item Factory — LLM curriculum generation with validation and human review.
 * Generated items land as status='pending'; nothing enters your SRS until
 * you approve it on /curriculum. Keyless mode produces a small fixture.
 */
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, items, prompts, srsStates } from "@/db/schema";
import { complete, extractJson } from "./llm";
import { normLoose } from "./grading";
import { reviveCard } from "./fsrs";
import { LANG_META, type Lang } from "./lang-shared";

const TRANCHE_MAX = 35;
const PAST_UNLOCK_THRESHOLD = 0.6; // 60% of present forms "known"
const KNOWN_STABILITY_DAYS = 3;

export interface FactoryItem {
  type: "verb_form" | "pattern";
  lemma: string;
  tense?: string | null;
  person?: string | null;
  form: string; // canonical target-language text (bare form or chunk)
  en: string;
  contrastGroup?: string | null;
  prompts: {
    promptType: "en_cue" | "transformation" | "contrast" | "question";
    promptText: string;
    expected: string;
    accepted: string[];
  }[];
}

/* ------------------------------------------------------------------ state */

export function curriculumState(lang: Lang) {
  const newCount =
    db
      .select({ c: sql<number>`count(*)` })
      .from(items)
      .leftJoin(srsStates, and(eq(srsStates.itemId, items.id), eq(srsStates.direction, "productive")))
      .where(and(eq(items.lang, lang), eq(items.status, "active"), sql`${srsStates.id} is null`))
      .all()[0]?.c ?? 0;

  const pendingCount =
    db
      .select({ c: sql<number>`count(*)` })
      .from(items)
      .where(and(eq(items.lang, lang), eq(items.status, "pending")))
      .all()[0]?.c ?? 0;

  const pastItemCount =
    db
      .select({ c: sql<number>`count(*)` })
      .from(items)
      .where(
        and(
          eq(items.lang, lang),
          eq(items.type, "verb_form"),
          ne(items.tense, "pres"),
          ne(items.status, "rejected"),
        ),
      )
      .all()[0]?.c ?? 0;

  return {
    newCount,
    pendingCount,
    pastUnlocked: pastUnlocked(lang),
    pastStarted: pastItemCount > 0,
    staleCount: staleItems(lang).length,
  };
}

/**
 * Stale items: every prompt has been answered correctly >=3 times — the
 * learner is now memorizing sentences, not forms (overfitting). Capped at
 * 5 prompts per item so variants don't grow unboundedly.
 */
const STALE_CORRECT_REPS = 3;
const MAX_PROMPTS_PER_ITEM = 5;

export function staleItems(lang: Lang): { itemId: number; form: string; en: string; expecteds: string[] }[] {
  const rows = db
    .select({
      itemId: items.id,
      form: items.es,
      en: items.en,
      promptId: prompts.id,
      expected: prompts.expected,
    })
    .from(items)
    .innerJoin(prompts, eq(prompts.itemId, items.id))
    .where(and(eq(items.lang, lang), eq(items.status, "active")))
    .all();
  if (rows.length === 0) return [];

  const correctCounts = new Map(
    db
      .select({ pid: attempts.promptId, c: sql<number>`count(*)`.as("c") })
      .from(attempts)
      .where(and(eq(attempts.lang, lang), eq(attempts.correct, 1)))
      .groupBy(attempts.promptId)
      .all()
      .map((r) => [r.pid, r.c]),
  );

  const byItem = new Map<number, { form: string; en: string; expecteds: string[]; minCorrect: number; promptCount: number }>();
  for (const r of rows) {
    const e = byItem.get(r.itemId) ?? { form: r.form, en: r.en, expecteds: [], minCorrect: Infinity, promptCount: 0 };
    e.expecteds.push(r.expected);
    e.promptCount++;
    e.minCorrect = Math.min(e.minCorrect, correctCounts.get(r.promptId) ?? 0);
    byItem.set(r.itemId, e);
  }

  return [...byItem.entries()]
    .filter(([, e]) => e.minCorrect >= STALE_CORRECT_REPS && e.promptCount < MAX_PROMPTS_PER_ITEM)
    .map(([itemId, e]) => ({ itemId, form: e.form, en: e.en, expecteds: e.expecteds }));
}

/**
 * Generate one fresh sentence frame per stale item (encoding variability).
 * Validated like factory output; auto-added — these are rephrasings of
 * items the learner already approved.
 */
export async function generateFreshPrompts(lang: Lang): Promise<{ added: number; skipped: number }> {
  const stale = staleItems(lang).slice(0, 15);
  if (stale.length === 0) return { added: 0, skipped: 0 };
  const langName = LANG_META[lang].name;

  const system = `You write fresh drill sentences for a ${langName} learning app. The learner has over-practiced the existing sentences and needs NEW sentence frames for the same forms. Strict JSON only.`;
  const user = [
    `For each item, write ONE new en_cue prompt: a natural English sentence cue whose ${langName} answer uses the given form/chunk — but in a DIFFERENT context than the existing sentences.`,
    lang === "fr"
      ? `French requires subject pronouns in answers; accepted must include il/elle/on variants where relevant.`
      : `Spanish answers omit subject pronouns; accepted must include pronoun-prefixed variants.`,
    `Sentences ≤ 9 words, everyday register.`,
    ``,
    `Items:`,
    ...stale.map(
      (s) =>
        `- itemId ${s.itemId}: form "${s.form}" (${s.en}). Existing sentences to AVOID repeating: ${s.expecteds.join(" | ")}`,
    ),
    ``,
    `Output: {"prompts":[{"itemId":number,"promptText":string,"expected":string,"accepted":[string]}]}`,
  ].join("\n");

  const mockResponse = JSON.stringify({ prompts: [] });
  const raw = await complete({ system, user, maxTokens: 6000, mockResponse });
  const parsed = extractJson<{ prompts: { itemId: number; promptText: string; expected: string; accepted: string[] }[] }>(raw);

  let added = 0;
  let skipped = 0;
  const staleMap = new Map(stale.map((s) => [s.itemId, s]));
  for (const cand of parsed.prompts ?? []) {
    const target = staleMap.get(cand.itemId);
    if (!target || !cand.promptText?.trim() || !cand.expected?.trim()) {
      skipped++;
      continue;
    }
    // must be a genuinely new sentence
    const isDupe = target.expecteds.some((e) => normLoose(e) === normLoose(cand.expected));
    if (isDupe) {
      skipped++;
      continue;
    }
    db.insert(prompts)
      .values({
        itemId: cand.itemId,
        promptType: "en_cue",
        promptText: cand.promptText.trim(),
        expected: cand.expected.trim(),
        accepted: JSON.stringify([...new Set([cand.expected.trim(), ...(cand.accepted ?? [])])]),
      })
      .run();
    added++;
  }
  return { added, skipped };
}

/** past tense unlocks when most present-tense forms are FSRS-stable */
export function pastUnlocked(lang: Lang): boolean {
  const rows = db
    .select({ card: srsStates.card })
    .from(items)
    .leftJoin(srsStates, and(eq(srsStates.itemId, items.id), eq(srsStates.direction, "productive")))
    .where(and(eq(items.lang, lang), eq(items.type, "verb_form"), eq(items.tense, "pres"), eq(items.status, "active")))
    .all();
  if (rows.length === 0) return false;
  const known = rows.filter((r) => r.card && reviveCard(r.card).stability >= KNOWN_STABILITY_DAYS).length;
  return known / rows.length >= PAST_UNLOCK_THRESHOLD;
}

/* ------------------------------------------------------------- generation */

function existingInventory(lang: Lang) {
  const rows = db
    .select({ es: items.es, lemma: items.lemma, type: items.type, tense: items.tense })
    .from(items)
    .where(and(eq(items.lang, lang), ne(items.status, "rejected")))
    .all();
  return {
    forms: new Set(rows.map((r) => normLoose(r.es))),
    verbLemmas: [...new Set(rows.filter((r) => r.type === "verb_form").map((r) => r.lemma!))],
    patternKeys: [...new Set(rows.filter((r) => r.type === "pattern").map((r) => r.lemma!))],
  };
}

const OUTPUT_SHAPE = `{"items":[{"type":"verb_form"|"pattern","lemma":string (infinitive for verbs, snake_case key for patterns),"tense":string|null ("pres"|"pret"|"impf"|"pc" or null for patterns),"person":string|null ("1s"|"2s"|"3s"|"1p"|"3p"),"form":string (the conjugated form alone for verb_form; the canonical chunk for pattern),"en":string (short gloss),"prompts":[{"promptType":"en_cue"|"transformation"|"contrast","promptText":string,"expected":string (full short sentence),"accepted":[string] (ALL reasonable variants: with/without subject pronoun for Spanish, il/elle/on variants for French, synonym objects)}]}]}`;

function buildTranchePrompt(lang: Lang, mode: "next" | "past"): { system: string; user: string } {
  const inv = existingInventory(lang);
  const langName = LANG_META[lang].name;
  const system = `You are a curriculum author for a ${langName} morphosyntax drill app used by an English-speaking beginner. You output strict JSON only. Every prompt must be a full, natural sentence exercise — never a bare conjugation-table request. Accepted-answer lists must be generous and realistic.`;

  const shared = [
    `Existing verb lemmas (do NOT regenerate their existing tenses): ${inv.verbLemmas.join(", ")}.`,
    `Existing pattern keys: ${inv.patternKeys.join(", ")}.`,
    `Rules:`,
    `- Sentences short (≤10 words), everyday, A1-A2 vocabulary.`,
    `- Every verb_form item gets one en_cue prompt (English sentence → ${langName}) and, where natural, one transformation prompt (change person: "Cambia a..."/"Mets à..." style with the source sentence included).`,
    lang === "fr"
      ? `- French REQUIRES subject pronouns; expected answers include them (je/tu/elle/nous/ils, elide j'). accepted must include il/elle/on and elles variants.`
      : `- Spanish subject pronouns optional; expected answers omit them; accepted must include pronoun-prefixed variants (yo/tú/él/ella/usted/nosotros/ellos...).`,
    `- Output at most ${TRANCHE_MAX} items. ${OUTPUT_SHAPE}`,
  ];

  if (mode === "past") {
    const user = [
      `Generate the PAST TENSE expansion for verbs the learner already knows in the present.`,
      lang === "es"
        ? `For each of these verbs, produce pretérito (tense "pret") and imperfecto (tense "impf") forms for persons 1s, 3s, 1p (skip 2s/3p for now): ${inv.verbLemmas.join(", ")}.`
        : `For each of these verbs, produce passé composé (tense "pc") and imparfait (tense "impf") forms for persons 1s, 3s, 1p (skip 2s/3p for now): ${inv.verbLemmas.join(", ")}.`,
      `Also include 6 aspect-CONTRAST prompts (promptType "contrast") pitting the two past tenses against each other in classic minimal contexts (ongoing/habitual vs completed), attached to the relevant forms, prompt text in English with the hint "(ongoing or completed?)".`,
      ...shared,
    ].join("\n");
    return { system, user };
  }

  const user = [
    `Generate the NEXT curriculum tranche: 8 NEW high-frequency verbs (present tense "pres", persons 1s,2s,3s,1p,3p) that are not in the existing list, chosen for conversational usefulness, plus 8 NEW high-frequency conversational patterns/chunks.`,
    ...shared,
  ].join("\n");
  return { system, user };
}

const MOCK_TRANCHE: Record<Lang, string> = {
  es: JSON.stringify({
    items: [
      {
        type: "verb_form", lemma: "comer", tense: "pres", person: "1s", form: "como",
        en: "I eat (comer, to eat)",
        prompts: [
          { promptType: "en_cue", promptText: "I eat tacos on Tuesdays.", expected: "como tacos los martes", accepted: ["como tacos los martes", "yo como tacos los martes"] },
        ],
      },
      {
        type: "verb_form", lemma: "comer", tense: "pres", person: "3s", form: "come",
        en: "She eats (comer, to eat)",
        prompts: [
          { promptType: "en_cue", promptText: "She eats at home.", expected: "come en casa", accepted: ["come en casa", "ella come en casa", "él come en casa"] },
          { promptType: "transformation", promptText: 'Cambia a "ella": Como en casa.', expected: "come en casa", accepted: ["come en casa", "ella come en casa"] },
        ],
      },
      {
        type: "pattern", lemma: "vamos_a_ver", tense: null, person: null, form: "vamos a ver",
        en: "let's see / we'll see",
        prompts: [
          { promptType: "en_cue", promptText: "We'll see what happens.", expected: "vamos a ver qué pasa", accepted: ["vamos a ver qué pasa", "vamos a ver que pasa"] },
        ],
      },
    ],
  }),
  fr: JSON.stringify({
    items: [
      {
        type: "verb_form", lemma: "manger", tense: "pres", person: "1s", form: "mange",
        en: "I eat (manger, to eat)",
        prompts: [
          { promptType: "en_cue", promptText: "I eat at home.", expected: "je mange à la maison", accepted: ["je mange à la maison"] },
        ],
      },
      {
        type: "pattern", lemma: "on_verra", tense: null, person: null, form: "on verra",
        en: "we'll see",
        prompts: [
          { promptType: "en_cue", promptText: "We'll see tomorrow.", expected: "on verra demain", accepted: ["on verra demain", "nous verrons demain"] },
        ],
      },
    ],
  }),
};

interface ValidationResult {
  inserted: number;
  dropped: { form: string; reason: string }[];
}

export async function generateTranche(lang: Lang, mode: "next" | "past"): Promise<ValidationResult> {
  const { system, user } = buildTranchePrompt(lang, mode);
  const raw = await complete({ system, user, maxTokens: 8000, mockResponse: MOCK_TRANCHE[lang] });
  const parsed = extractJson<{ items: FactoryItem[] }>(raw);
  return validateAndInsert(lang, parsed.items ?? []);
}

const VALID_PERSONS = new Set(["1s", "2s", "3s", "1p", "3p"]);
const VALID_PROMPT_TYPES = new Set(["en_cue", "transformation", "contrast", "question"]);

function validateAndInsert(lang: Lang, candidates: FactoryItem[]): ValidationResult {
  const inv = existingInventory(lang);
  const dropped: { form: string; reason: string }[] = [];
  let inserted = 0;
  const seenThisBatch = new Set<string>();

  for (const c of candidates.slice(0, TRANCHE_MAX)) {
    const form = (c.form ?? "").trim();
    const reasons: string[] = [];
    if (!form) reasons.push("empty form");
    if (!c.en?.trim()) reasons.push("missing gloss");
    if (c.type !== "verb_form" && c.type !== "pattern") reasons.push("bad type");
    if (c.type === "verb_form") {
      if (!c.lemma?.trim()) reasons.push("verb without lemma");
      if (!c.person || !VALID_PERSONS.has(c.person)) reasons.push("bad person");
      if (!c.tense?.trim()) reasons.push("verb without tense");
    }
    const dupeKey =
      c.type === "verb_form"
        ? `v|${normLoose(c.lemma ?? "")}|${c.tense}|${c.person}`
        : `p|${normLoose(form)}`;
    if (seenThisBatch.has(dupeKey)) reasons.push("duplicate in batch");
    if (c.type === "pattern" && inv.forms.has(normLoose(form))) reasons.push("already in curriculum");
    if (c.type === "verb_form") {
      const existing = db
        .select({ id: items.id })
        .from(items)
        .where(
          and(
            eq(items.lang, lang),
            eq(items.type, "verb_form"),
            eq(items.lemma, c.lemma ?? ""),
            eq(items.tense, c.tense ?? ""),
            eq(items.person, c.person ?? ""),
            ne(items.status, "rejected"),
          ),
        )
        .limit(1)
        .all();
      if (existing.length > 0) reasons.push("form already exists");
    }
    const validPrompts = (c.prompts ?? []).filter(
      (p) =>
        p.promptText?.trim() &&
        p.expected?.trim() &&
        VALID_PROMPT_TYPES.has(p.promptType) &&
        Array.isArray(p.accepted),
    );
    if (validPrompts.length === 0) reasons.push("no valid prompts");

    if (reasons.length > 0) {
      dropped.push({ form: form || "(blank)", reason: reasons.join(", ") });
      continue;
    }
    seenThisBatch.add(dupeKey);

    const maxOrder =
      db
        .select({ m: sql<number>`coalesce(max(${items.orderIndex}), 0)` })
        .from(items)
        .where(eq(items.lang, lang))
        .all()[0]?.m ?? 0;

    const [row] = db
      .insert(items)
      .values({
        lang,
        type: c.type,
        lemma: c.lemma?.trim() ?? null,
        tense: c.type === "verb_form" ? c.tense : null,
        person: c.type === "verb_form" ? c.person : null,
        es: form,
        en: c.en.trim(),
        contrastGroup: c.contrastGroup ?? null,
        orderIndex: maxOrder + 1,
        status: "pending",
      })
      .returning({ id: items.id })
      .all();

    for (const p of validPrompts) {
      const accepted = [...new Set([p.expected, ...p.accepted])];
      db.insert(prompts)
        .values({
          itemId: row.id,
          promptType: p.promptType,
          promptText: p.promptText.trim(),
          expected: p.expected.trim(),
          accepted: JSON.stringify(accepted),
        })
        .run();
    }
    inserted++;
  }

  return { inserted, dropped };
}

/* --------------------------------------------------------------- review */

export function pendingItems(lang: Lang) {
  const rows = db
    .select()
    .from(items)
    .where(and(eq(items.lang, lang), eq(items.status, "pending")))
    .orderBy(items.orderIndex)
    .all();
  return rows.map((item) => ({
    item,
    prompts: db.select().from(prompts).where(eq(prompts.itemId, item.id)).all(),
  }));
}

export function reviewItems(ids: number[], decision: "approve" | "reject") {
  const status = decision === "approve" ? "active" : "rejected";
  for (const id of ids) {
    db.update(items).set({ status }).where(eq(items.id, id)).run();
  }
  return ids.length;
}
