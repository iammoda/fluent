/**
 * Session planner — three-level adaptation, language-scoped:
 *  1. per-item: FSRS due items come first
 *  2. per-pattern: active weaknesses inject targeted contrast drills
 *  3. session mix: new-item introduction throttled, prompt types varied
 */
import { and, desc, eq, gte, inArray, isNull, lte, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, items, prompts, srsStates } from "@/db/schema";
import type { Lang } from "@/lib/lang";

export const SESSION_SIZE = 20;
export const MAX_NEW_PER_SESSION = 6;
const WEAKNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const WEAKNESS_THRESHOLD = 3; // corroboration: >=3 errors of a type in the window
const WEAKNESS_INJECT_COUNT = 3;

/** contrast-drillable weakness types */
const CONTRAST_WEAKNESSES = new Set(["ser_estar", "etre_avoir"]);

export interface PlannedPrompt {
  promptId: number;
  itemId: number;
  promptType: string;
  promptText: string;
  reason: "due" | "new" | "weakness";
}

export interface Weakness {
  errorType: string;
  count: number;
}

export function getActiveWeaknesses(lang: Lang): Weakness[] {
  const since = Date.now() - WEAKNESS_WINDOW_MS;
  const rows = db
    .select({
      errorType: attempts.errorType,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(attempts)
    .where(
      and(
        gte(attempts.createdAt, since),
        eq(attempts.lang, lang),
        eq(attempts.correct, 0),
        sql`${attempts.errorType} is not null`,
        sql`${attempts.errorType} != 'accent'`,
      ),
    )
    .groupBy(attempts.errorType)
    .having(sql`count(*) >= ${WEAKNESS_THRESHOLD}`)
    .orderBy(desc(sql`count(*)`))
    .all();
  return rows.filter((r) => r.errorType != null) as Weakness[];
}

function pickPromptForItem(itemId: number, exclude: Set<number>): PlannedPrompt | null {
  const candidates = db
    .select()
    .from(prompts)
    .where(eq(prompts.itemId, itemId))
    .all()
    .filter((p) => !exclude.has(p.id));
  if (candidates.length === 0) return null;
  // encoding variability: prefer the LEAST-practiced prompt for this item,
  // so retrieval happens in varied sentence frames instead of one memorized line
  const counts = new Map(
    db
      .select({ pid: attempts.promptId, c: sql<number>`count(*)`.as("c") })
      .from(attempts)
      .where(inArray(attempts.promptId, candidates.map((p) => p.id)))
      .groupBy(attempts.promptId)
      .all()
      .map((r) => [r.pid, r.c]),
  );
  const min = Math.min(...candidates.map((p) => counts.get(p.id) ?? 0));
  const pool = candidates.filter((p) => (counts.get(p.id) ?? 0) === min);
  const p = pool[Math.floor(Math.random() * pool.length)];
  return {
    promptId: p.id,
    itemId: p.itemId,
    promptType: p.promptType,
    promptText: p.promptText,
    reason: "due",
  };
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function planSession(lang: Lang): PlannedPrompt[] {
  const now = Date.now();
  const plan: PlannedPrompt[] = [];
  const usedPrompts = new Set<number>();
  const usedItems = new Set<number>();

  // 1. Weakness injection: targeted drills for corroborated error types
  const weaknesses = getActiveWeaknesses(lang);
  for (const w of weaknesses) {
    if (CONTRAST_WEAKNESSES.has(w.errorType)) {
      const contrastPrompts = db
        .select({
          id: prompts.id,
          itemId: prompts.itemId,
          promptType: prompts.promptType,
          promptText: prompts.promptText,
        })
        .from(prompts)
        .innerJoin(items, eq(items.id, prompts.itemId))
        .where(and(eq(prompts.promptType, "contrast"), eq(items.lang, lang), eq(items.status, "active")))
        .all();
      for (const p of shuffle([...contrastPrompts]).slice(0, WEAKNESS_INJECT_COUNT)) {
        if (usedPrompts.has(p.id)) continue;
        plan.push({
          promptId: p.id,
          itemId: p.itemId,
          promptType: p.promptType,
          promptText: p.promptText,
          reason: "weakness",
        });
        usedPrompts.add(p.id);
        usedItems.add(p.itemId);
      }
    }
    if (w.errorType === "person") {
      const failedItems = db
        .select({ itemId: attempts.itemId })
        .from(attempts)
        .where(
          and(
            gte(attempts.createdAt, now - WEAKNESS_WINDOW_MS),
            eq(attempts.lang, lang),
            eq(attempts.correct, 0),
            eq(attempts.errorType, "person"),
          ),
        )
        .groupBy(attempts.itemId)
        .limit(WEAKNESS_INJECT_COUNT)
        .all();
      for (const f of failedItems) {
        const tp = db
          .select()
          .from(prompts)
          .where(and(eq(prompts.itemId, f.itemId), eq(prompts.promptType, "transformation")))
          .all();
        const p = tp[Math.floor(Math.random() * tp.length)];
        if (!p || usedPrompts.has(p.id)) continue;
        plan.push({
          promptId: p.id,
          itemId: p.itemId,
          promptType: p.promptType,
          promptText: p.promptText,
          reason: "weakness",
        });
        usedPrompts.add(p.id);
        usedItems.add(p.itemId);
      }
    }
  }

  // 2. Due items (FSRS)
  const due = db
    .select({ itemId: srsStates.itemId })
    .from(srsStates)
    .innerJoin(items, eq(items.id, srsStates.itemId))
    .where(
      and(
        eq(srsStates.direction, "productive"),
        lte(srsStates.due, now),
        eq(items.lang, lang),
        eq(items.status, "active"),
      ),
    )
    .orderBy(srsStates.due)
    .limit(SESSION_SIZE)
    .all();
  for (const d of due) {
    if (plan.length >= SESSION_SIZE) break;
    if (usedItems.has(d.itemId)) continue;
    const p = pickPromptForItem(d.itemId, usedPrompts);
    if (!p) continue;
    p.reason = "due";
    plan.push(p);
    usedPrompts.add(p.promptId);
    usedItems.add(d.itemId);
  }

  // 3. New items in curriculum order (throttled)
  const remaining = SESSION_SIZE - plan.length;
  const maxNew = Math.min(MAX_NEW_PER_SESSION, remaining);
  if (maxNew > 0) {
    const withState = db
      .select({ itemId: srsStates.itemId })
      .from(srsStates)
      .where(eq(srsStates.direction, "productive"))
      .all()
      .map((r) => r.itemId);
    const newItems = db
      .select({ id: items.id })
      .from(items)
      .where(
        and(
          eq(items.lang, lang),
          eq(items.status, "active"),
          withState.length > 0 ? notInArray(items.id, withState) : sql`1=1`,
        ),
      )
      .orderBy(items.orderIndex)
      .limit(maxNew)
      .all();
    for (const n of newItems) {
      if (usedItems.has(n.id)) continue;
      // new items always get their canonical production prompt (en_cue/question), not a transformation
      const p = db
        .select()
        .from(prompts)
        .where(and(eq(prompts.itemId, n.id), inArray(prompts.promptType, ["en_cue", "question"])))
        .limit(1)
        .all()[0];
      if (!p || usedPrompts.has(p.id)) continue;
      plan.push({
        promptId: p.id,
        itemId: p.itemId,
        promptType: p.promptType,
        promptText: p.promptText,
        reason: "new",
      });
      usedPrompts.add(p.id);
      usedItems.add(n.id);
    }
  }

  // Interleave: shuffle so due/new/weakness are mixed (contextual interference)
  return shuffle(plan).slice(0, SESSION_SIZE);
}

/** Count of items due now (for dashboard) */
export function dueCount(lang: Lang): number {
  const now = Date.now();
  const r = db
    .select({ c: sql<number>`count(*)` })
    .from(srsStates)
    .innerJoin(items, eq(items.id, srsStates.itemId))
    .where(
      and(
        eq(srsStates.direction, "productive"),
        lte(srsStates.due, now),
        eq(items.lang, lang),
        eq(items.status, "active"),
      ),
    )
    .all();
  return r[0]?.c ?? 0;
}

/** Count of items never seen */
export function newCount(lang: Lang): number {
  const r = db
    .select({ c: sql<number>`count(*)` })
    .from(items)
    .leftJoin(
      srsStates,
      and(eq(srsStates.itemId, items.id), eq(srsStates.direction, "productive")),
    )
    .where(and(isNull(srsStates.id), eq(items.lang, lang), eq(items.status, "active")))
    .all();
  return r[0]?.c ?? 0;
}
