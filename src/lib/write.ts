/**
 * Scenario output tasks — typed pushed output with LLM error mining.
 * The scenario is generated around due items; the graded response's errors
 * are classified into the taxonomy and inserted into `attempts`, so the
 * weak-spot machinery (dossier, planner injection, briefs) picks them up
 * with zero extra plumbing.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, items, outputTasks, srsStates } from "@/db/schema";
import { complete, extractJson } from "./llm";
import { normLoose } from "./grading";
import { LANG_META, type Lang } from "./lang-shared";
import type { ErrorType } from "./taxonomy";

const VALID_ERROR_TYPES = new Set<string>([
  "person",
  "tense",
  "ser_estar",
  "etre_avoir",
  "verb_choice",
  "reflexive_missing",
  "gustar_structure",
  "accent",
  "other",
]);

export interface WriteFeedback {
  feedback_en: string;
  targets_used: { target: string; used: boolean }[];
  errors: { quote: string; correction: string; error_type: string; explanation: string }[];
}

function dueTargets(lang: Lang, n = 6): { es: string; en: string; itemId: number }[] {
  return db
    .select({ es: items.es, en: items.en, itemId: items.id })
    .from(srsStates)
    .innerJoin(items, eq(items.id, srsStates.itemId))
    .where(and(eq(srsStates.direction, "productive"), eq(items.lang, lang)))
    .orderBy(srsStates.due)
    .limit(n)
    .all();
}

export async function generateScenario(lang: Lang, kind: "scenario" | "boss" = "scenario") {
  const targets = dueTargets(lang, kind === "boss" ? 10 : 6);
  if (targets.length === 0) throw new Error("No tracked items yet — do a session first.");
  const langName = LANG_META[lang].name;

  const system = `You create ${kind === "boss" ? "challenging weekly" : "tiny"} writing tasks for an English-speaking beginner learning ${langName}. Output strict JSON only.`;
  const user = [
    kind === "boss"
      ? `Create ONE multi-part BOSS scenario (3-4 sentences, in English) that forces the learner to write 5-6 ${langName} sentences. It must require several of these target forms/chunks and mix registers (statement, question, negation):`
      : `Create ONE short everyday scenario (2-3 sentences, in English) that naturally forces the learner to write 2-4 ${langName} sentences using these target forms/chunks:`,
    targets.map((t) => `"${t.es}" (${t.en})`).join(", "),
    ``,
    `The scenario should be concrete and personal (texting a friend, talking to a landlord, ordering food...). Do not include the answer.`,
    `Output: {"scenario": string}`,
  ].join("\n");

  const mockResponse = JSON.stringify({
    scenario:
      kind === "boss"
        ? `BOSS: You're planning a weekend trip with a friend who keeps changing plans. In ${langName} (5-6 sentences): say what you want to do, two things you have to do first, ask if they can help, say one thing you can't do, and end with a question about tomorrow.`
        : `Your friend texts you asking about your plans. Reply in ${langName} (2-4 sentences): say what you want to do today, one thing you have to do, and ask them a question.`,
  });

  const { scenario } = extractJson<{ scenario: string }>(
    await complete({ system, user, mockResponse }),
  );

  const [row] = db
    .insert(outputTasks)
    .values({
      createdAt: Date.now(),
      lang,
      kind,
      scenario,
      targets: JSON.stringify(targets.map((t) => t.es)),
    })
    .returning()
    .all();
  return row;
}

export async function gradeScenario(lang: Lang, taskId: number, response: string) {
  const task = db.select().from(outputTasks).where(eq(outputTasks.id, taskId)).all()[0];
  if (!task) throw new Error("task not found");
  const targets = JSON.parse(task.targets) as string[];
  const langName = LANG_META[lang].name;

  const system = `You are a precise but encouraging ${langName} teacher for an absolute beginner. You analyze learner writing and output strict JSON only. Only report REAL errors — do not invent problems. Quote the learner verbatim.`;
  const user = [
    `Task given to the learner: ${task.scenario}`,
    `Target forms/chunks they were asked to use: ${targets.join(", ")}`,
    ``,
    `Learner's response:`,
    response,
    ``,
    `Analyze it. Output exactly:`,
    `{"feedback_en": string (2-3 encouraging, specific sentences), "targets_used": [{"target": string, "used": boolean}], "errors": [{"quote": string (verbatim from learner), "correction": string, "error_type": one of "person"|"tense"|"ser_estar"|"etre_avoir"|"verb_choice"|"reflexive_missing"|"gustar_structure"|"accent"|"other", "explanation": string (one short sentence)}]}`,
  ].join("\n");

  // mock: local heuristic — target containment check, no error analysis
  const mockResponse = JSON.stringify({
    feedback_en:
      "Mock mode: targets checked locally, no error analysis. Set an API key in .env.local for real feedback.",
    targets_used: targets.map((t) => ({
      target: t,
      used: normLoose(response).includes(normLoose(t.split(" + ")[0])),
    })),
    errors: [],
  } satisfies WriteFeedback);

  const feedback = extractJson<WriteFeedback>(await complete({ system, user, mockResponse }));

  // sanitize error types
  feedback.errors = (feedback.errors ?? []).map((e) => ({
    ...e,
    error_type: VALID_ERROR_TYPES.has(e.error_type) ? e.error_type : "other",
  }));

  db.update(outputTasks)
    .set({ response, feedback: JSON.stringify(feedback), gradedAt: Date.now() })
    .where(eq(outputTasks.id, taskId))
    .run();

  // ---- Error mining: mined errors become attempts (the error dossier) ----
  const now = Date.now();
  for (const err of feedback.errors) {
    db.insert(attempts)
      .values({
        sessionId: null,
        lang,
        itemId: 0,
        promptId: 0,
        promptType: "scenario",
        expected: err.correction,
        userAnswer: err.quote,
        correct: 0,
        errorType: err.error_type as ErrorType,
        latencyMs: 0,
        modality: "typed",
        helpUsed: "none",
        createdAt: now,
      })
      .run();
  }
  // positive signal: targets actually deployed in free production
  const targetItems = dueTargets(lang, 12);
  for (const tu of feedback.targets_used ?? []) {
    if (!tu.used) continue;
    const match = targetItems.find((t) => t.es === tu.target);
    if (!match) continue;
    db.insert(attempts)
      .values({
        sessionId: null,
        lang,
        itemId: match.itemId,
        promptId: 0,
        promptType: "scenario",
        expected: tu.target,
        userAnswer: response,
        correct: 1,
        errorType: null,
        latencyMs: 0,
        modality: "typed",
        helpUsed: "none",
        createdAt: now,
      })
      .run();
  }

  return { task: { ...task, response, feedback: JSON.stringify(feedback) }, feedback };
}

export function latestTask(lang: Lang) {
  return (
    db
      .select()
      .from(outputTasks)
      .where(eq(outputTasks.lang, lang))
      .orderBy(desc(outputTasks.id))
      .limit(1)
      .all()[0] ?? null
  );
}
