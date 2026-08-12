/**
 * Story generation pipeline — the memory-state → generation-constraint loop.
 * Known inventory + due items + weak spots parameterize every story.
 * A validator pass checks that due verb forms actually appear; one retry
 * with a stronger instruction, then missing targets are recorded honestly.
 *
 * Stories are exposure only: they never write to FSRS (ground truth for
 * memory comes from the production gate, per the hybrid-SRS design).
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { items, srsStates, stories } from "@/db/schema";
import { complete, extractJson } from "./llm";
import { getActiveWeaknesses } from "./planner";
import { pastUnlocked } from "./factory";
import { LANG_META, type Lang } from "./lang";
import { normLoose } from "./grading";
import { ERROR_LABELS, type ErrorType } from "./taxonomy";

export interface StorySentence {
  es: string;
  en: string;
}
export interface StoryContent {
  title: string;
  sentences: StorySentence[];
  new_words: { es: string; en: string }[];
  questions: { q_es: string; a_es: string }[];
}

const MAX_TARGET_FORMS = 8;
const MAX_TARGET_PATTERNS = 4;

interface LearnerState {
  targetForms: { es: string; lemma: string }[];
  targetPatterns: { es: string; en: string }[];
  knownWords: string[];
  weaknesses: string[];
  pastOk: boolean;
}

function gatherLearnerState(lang: Lang): LearnerState {
  const soon = Date.now() + 24 * 60 * 60 * 1000; // due now or within 24h
  const tracked = db
    .select({
      es: items.es,
      en: items.en,
      type: items.type,
      lemma: items.lemma,
      due: srsStates.due,
    })
    .from(srsStates)
    .innerJoin(items, eq(items.id, srsStates.itemId))
    .where(and(eq(srsStates.direction, "productive"), eq(items.lang, lang)))
    .orderBy(srsStates.due)
    .all();

  const dueForms = tracked
    .filter((t) => t.type === "verb_form" && t.due <= soon)
    .slice(0, MAX_TARGET_FORMS)
    .map((t) => ({ es: t.es, lemma: t.lemma ?? "" }));

  const duePatterns = tracked
    .filter((t) => t.type === "pattern" && t.due <= soon)
    .slice(0, MAX_TARGET_PATTERNS)
    .map((t) => ({ es: t.es, en: t.en }));

  return {
    targetForms: dueForms,
    targetPatterns: duePatterns,
    knownWords: tracked.map((t) => t.es),
    weaknesses: getActiveWeaknesses(lang).map(
      (w) => ERROR_LABELS[w.errorType as ErrorType] ?? w.errorType,
    ),
    pastOk: pastUnlocked(lang),
  };
}

const systemFor = (lang: Lang) =>
  `You are a ${LANG_META[lang].name} content generator inside a personal language-learning app for an English-speaking absolute beginner (A1). You write tiny serial stories with recurring characters ${LANG_META[lang].characters}, set in everyday situations. You follow vocabulary constraints exactly and you only ever output strict JSON.`;

function buildUserPrompt(state: LearnerState, topic: string | null, retryMissing?: string[]) {
  const lines: string[] = [];
  lines.push(`Write the next episode of the serial story.`);
  lines.push(`Topic: ${topic || "everyday life"}.`);
  lines.push(``);
  lines.push(`HARD CONSTRAINTS:`);
  if (state.pastOk) {
    lines.push(
      `- 8 to 12 sentences, each at most 12 words. Mostly present-tense dialogue, BUT use past-tense narration for 2-3 scene-setting sentences (imperfect for background, preterite/passé composé for events) — the learner is starting to acquire past tense through stories. Gloss any past forms in new_words.`,
    );
  } else {
    lines.push(`- 8 to 12 sentences, each at most 12 words. Mostly dialogue. PRESENT TENSE ONLY.`);
  }
  if (state.targetForms.length > 0) {
    lines.push(
      `- You MUST use each of these exact verb forms at least once: ${state.targetForms
        .map((f) => `"${f.es}" (${f.lemma})`)
        .join(", ")}.`,
    );
  }
  if (state.targetPatterns.length > 0) {
    lines.push(
      `- Try to naturally include these constructions: ${state.targetPatterns
        .map((p) => `${p.es} (${p.en})`)
        .join("; ")}.`,
    );
  }
  lines.push(
    `- The learner's tracked vocabulary (safe to use freely): ${state.knownWords.join(", ")}.`,
  );
  lines.push(
    `- Function words (articles, prepositions, pronouns, conjunctions, numbers, names, common adverbs like hoy/ahora/sí/no) are always allowed.`,
  );
  lines.push(
    `- At most 8 NEW content words beyond that. Choose only very high-frequency, useful words. List every new content word in new_words with an English gloss.`,
  );
  if (state.weaknesses.length > 0) {
    lines.push(
      `- The learner's current weak spots: ${state.weaknesses.join("; ")}. Write sentences that showcase the correct usage clearly (e.g., for ser/estar include clear examples of both).`,
    );
  }
  if (retryMissing && retryMissing.length > 0) {
    lines.push(
      `- PREVIOUS ATTEMPT FAILED validation: these required forms were missing: ${retryMissing.join(", ")}. This time every required form MUST literally appear.`,
    );
  }
  lines.push(``);
  lines.push(`OUTPUT: strict JSON only, no prose, no markdown fences, exactly this shape:`);
  lines.push(
    `{"title": string, "sentences": [{"es": string, "en": string}], "new_words": [{"es": string, "en": string}], "questions": [{"q_es": string, "a_es": string}]}`,
  );
  lines.push(
    `questions: exactly 2 simple comprehension questions in Spanish with short Spanish answers, answerable from the story.`,
  );
  return lines.join("\n");
}

/** Which required verb forms are missing from the story text (loose token match)? */
function missingTargets(content: StoryContent, targetForms: { es: string }[]): string[] {
  const text = content.sentences.map((s) => s.es).join(" ");
  const tokenSet = new Set(normLoose(text).split(" "));
  return targetForms
    .map((f) => f.es)
    .filter((form) => {
      // multiword forms (e.g. pattern chunks) → check full containment
      if (form.includes(" ")) return !normLoose(text).includes(normLoose(form));
      return !tokenSet.has(normLoose(form));
    });
}

export async function generateStory(lang: Lang, topic: string | null) {
  const state = gatherLearnerState(lang);
  const system = systemFor(lang);

  let content = extractJson<StoryContent>(
    await complete({ system, user: buildUserPrompt(state, topic) }),
  );
  let missing = missingTargets(content, state.targetForms);

  if (missing.length > 0) {
    // one retry with the failure fed back
    try {
      const retry = extractJson<StoryContent>(
        await complete({ system, user: buildUserPrompt(state, topic, missing) }),
      );
      const retryMissing = missingTargets(retry, state.targetForms);
      if (retryMissing.length < missing.length) {
        content = retry;
        missing = retryMissing;
      }
    } catch {
      /* keep first attempt */
    }
  }

  const [row] = db
    .insert(stories)
    .values({
      createdAt: Date.now(),
      lang,
      topic,
      title: content.title,
      content: JSON.stringify(content),
      targets: JSON.stringify(state.targetForms.map((f) => f.es)),
      missing: JSON.stringify(missing),
    })
    .returning()
    .all();

  return row;
}

export function latestStory(lang: Lang) {
  return (
    db
      .select()
      .from(stories)
      .where(eq(stories.lang, lang))
      .orderBy(desc(stories.id))
      .limit(1)
      .all()[0] ?? null
  );
}
