import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attempts, items, prompts, srsStates, sessions } from "@/db/schema";
import { gradeAnswer } from "@/lib/grading";
import { classifyError, type FormIndex, type FormInfo, ERROR_LABELS, type ErrorType } from "@/lib/taxonomy";
import { newCard, reviveCard, serializeCard, ratingFor, applyRating } from "@/lib/fsrs";
import { complete, extractJson, activeProvider } from "@/lib/llm";
import { Rating } from "ts-fsrs";
import { normLoose } from "@/lib/grading";

export const dynamic = "force-dynamic";

function buildFormIndex(lang: string): FormIndex {
  const rows = db
    .select({ es: items.es, lemma: items.lemma, tense: items.tense, person: items.person })
    .from(items)
    .where(and(eq(items.type, "verb_form"), eq(items.lang, lang)))
    .all();
  const idx: FormIndex = new Map();
  for (const r of rows) {
    if (r.lemma && r.tense && r.person) {
      idx.set(normLoose(r.es), { lemma: r.lemma, tense: r.tense, person: r.person });
    }
  }
  return idx;
}

interface AttemptBody {
  sessionId: number | null;
  promptId: number;
  answer: string;
  latencyMs: number;
  helpUsed?: "none" | "hint" | "reveal";
  modality?: "typed" | "spoken";
  end?: boolean; // mark session ended
}

/** POST /api/attempt — grade, classify, log, update FSRS. Returns feedback. */
export async function POST(req: Request) {
  const body = (await req.json()) as AttemptBody;
  const helpUsed = body.helpUsed ?? "none";
  const modality = body.modality ?? "typed";

  const prompt = db.select().from(prompts).where(eq(prompts.id, body.promptId)).all()[0];
  if (!prompt) return NextResponse.json({ error: "prompt not found" }, { status: 404 });
  const item = db.select().from(items).where(eq(items.id, prompt.itemId)).all()[0];
  if (!item) return NextResponse.json({ error: "item not found" }, { status: 404 });

  const accepted = JSON.parse(prompt.accepted) as string[];

  let correct = false;
  let errorType: ErrorType | null = null;

  if (helpUsed === "reveal") {
    correct = false;
    errorType = null; // a reveal is a lapse, not a classified error
  } else {
    const g = gradeAnswer(body.answer, accepted);
    correct = g.correct;
    if (g.correct && g.accentOnly) {
      errorType = "accent";
    } else if (!g.correct) {
      const formIndex = buildFormIndex(item.lang);
      const expectedForm: FormInfo | null =
        item.type === "verb_form" && item.lemma && item.tense && item.person
          ? { lemma: item.lemma, tense: item.tense, person: item.person }
          : null;
      errorType = classifyError({
        expected: prompt.expected,
        answer: body.answer,
        formIndex,
        expectedForm,
        lang: item.lang,
      });
    }
  }

  // ---- FSRS update (productive direction) --------------------------------
  const rating = ratingFor({ correct, latencyMs: body.latencyMs, helpUsed, modality });
  const existing = db
    .select()
    .from(srsStates)
    .where(and(eq(srsStates.itemId, item.id), eq(srsStates.direction, "productive")))
    .all()[0];

  const card = existing ? reviveCard(existing.card) : newCard();
  const next = applyRating(card, rating);
  const ser = serializeCard(next);

  if (existing) {
    db.update(srsStates)
      .set({ card: ser.json, due: ser.due })
      .where(eq(srsStates.id, existing.id))
      .run();
  } else {
    db.insert(srsStates)
      .values({ itemId: item.id, direction: "productive", card: ser.json, due: ser.due })
      .run();
  }

  // ---- Log the attempt (verbatim answer) ----------------------------------
  const [attemptRow] = db.insert(attempts)
    .values({
      sessionId: body.sessionId,
      lang: item.lang,
      itemId: item.id,
      promptId: prompt.id,
      promptType: prompt.promptType,
      expected: prompt.expected,
      userAnswer: body.answer,
      correct: correct ? 1 : 0,
      errorType,
      latencyMs: body.latencyMs,
      modality,
      helpUsed,
      createdAt: Date.now(),
    })
    .returning({ id: attempts.id })
    .all();

  if (body.end && body.sessionId != null) {
    db.update(sessions).set({ endedAt: Date.now() }).where(eq(sessions.id, body.sessionId)).run();
  }

  return NextResponse.json({
    attemptId: attemptRow.id,
    correct,
    expected: prompt.expected,
    errorType,
    errorLabel: errorType ? ERROR_LABELS[errorType] : null,
    itemEs: item.es,
    itemEn: item.en,
  });
}

/**
 * PATCH /api/attempt — "I was right" override.
 * With an LLM key: adjudicated first. Keyless: trusted (it's your app).
 * Accepted answer is added to the prompt so it never mis-grades again;
 * the attempt flips to correct and FSRS gets a corrective Good review.
 */
export async function PATCH(req: Request) {
  const { attemptId } = await req.json();
  const attempt = db.select().from(attempts).where(eq(attempts.id, Number(attemptId))).all()[0];
  if (!attempt) return NextResponse.json({ error: "attempt not found" }, { status: 404 });
  if (attempt.correct === 1) return NextResponse.json({ accepted: true, reason: "already correct" });
  if (!attempt.userAnswer.trim()) return NextResponse.json({ accepted: false, reason: "Nothing was answered — reveals can't be overridden." });

  const prompt = db.select().from(prompts).where(eq(prompts.id, attempt.promptId)).all()[0];
  if (!prompt) return NextResponse.json({ error: "prompt not found" }, { status: 404 });

  // adjudicate when a real LLM is available
  if (activeProvider() !== "mock") {
    try {
      const verdict = extractJson<{ valid: boolean; reason: string }>(
        await complete({
          system: "You judge whether a language learner's answer is an acceptable alternative. Be fair: accept natural, grammatical variants; reject actual errors. Strict JSON only.",
          user: `Exercise prompt: "${prompt.promptText}"\nExpected answer: "${prompt.expected}"\nLearner's answer: "${attempt.userAnswer}"\nIs the learner's answer a valid, grammatical way to satisfy the prompt? Output {"valid": boolean, "reason": string (one short sentence)}`,
        }),
      );
      if (!verdict.valid) {
        return NextResponse.json({ accepted: false, reason: verdict.reason });
      }
    } catch {
      /* adjudicator down -> fall through and trust the learner */
    }
  }

  // add to accepted list permanently
  const accepted = JSON.parse(prompt.accepted) as string[];
  db.update(prompts)
    .set({ accepted: JSON.stringify([...new Set([...accepted, attempt.userAnswer.trim()])]) })
    .where(eq(prompts.id, prompt.id))
    .run();

  // flip the attempt
  db.update(attempts)
    .set({ correct: 1, errorType: null })
    .where(eq(attempts.id, attempt.id))
    .run();

  // corrective FSRS review (the Again scheduling was wrong)
  const srs = db
    .select()
    .from(srsStates)
    .where(and(eq(srsStates.itemId, attempt.itemId), eq(srsStates.direction, "productive")))
    .all()[0];
  if (srs) {
    const next = applyRating(reviveCard(srs.card), Rating.Good);
    const ser = serializeCard(next);
    db.update(srsStates).set({ card: ser.json, due: ser.due }).where(eq(srsStates.id, srs.id)).run();
  }

  return NextResponse.json({ accepted: true, reason: "Added to accepted answers — this will never mis-grade again." });
}
