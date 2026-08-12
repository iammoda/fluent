/**
 * Today engine — computes the daily quest board from real activity.
 * Blocks in research order; "next" is the first incomplete one.
 */
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, items, outputTasks, retells, sessions, srsStates, stories } from "@/db/schema";
import { dueCount, newCount } from "@/lib/planner";
import { curriculumState } from "@/lib/factory";
import type { Lang } from "@/lib/lang";

export interface QuestBlock {
  key: string;
  title: string;
  sub: string;
  emoji: string;
  href: string;
  color: "sun" | "coral" | "grape" | "tang" | "midnight";
  done: boolean;
  minutes: number;
}

function localMidnight(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function curriculumBanner(lang: Lang): { show: boolean; pending: number; low: boolean; pastReady: boolean } {
  const st = curriculumState(lang);
  const low = st.newCount < 12;
  const pastReady = st.pastUnlocked && !st.pastStarted;
  return { show: low || st.pendingCount > 0 || pastReady, pending: st.pendingCount, low, pastReady };
}

export function questBoard(lang: Lang): { blocks: QuestBlock[]; next: QuestBlock | null; progress: number } {
  const midnight = localMidnight();
  const due = dueCount(lang);
  const fresh = newCount(lang);

  // drill reps today (attempts inside kind='drill' sessions)
  const drillReps =
    db
      .select({ c: sql<number>`count(*)` })
      .from(attempts)
      .innerJoin(sessions, eq(sessions.id, attempts.sessionId))
      .where(
        and(gte(attempts.createdAt, midnight), eq(attempts.lang, lang), eq(sessions.kind, "drill")),
      )
      .all()[0]?.c ?? 0;

  const storyToday =
    db
      .select({ c: sql<number>`count(*)` })
      .from(stories)
      .where(and(gte(stories.createdAt, midnight), eq(stories.lang, lang)))
      .all()[0]?.c ?? 0;

  const scenarioToday =
    db
      .select({ c: sql<number>`count(*)` })
      .from(outputTasks)
      .where(
        and(
          eq(outputTasks.lang, lang),
          sql`${outputTasks.gradedAt} is not null`,
          gte(sql`coalesce(${outputTasks.gradedAt}, 0)`, midnight),
        ),
      )
      .all()[0]?.c ?? 0;

  const retellToday =
    db
      .select({ c: sql<number>`count(*)` })
      .from(retells)
      .where(and(gte(retells.createdAt, midnight), eq(retells.lang, lang)))
      .all()[0]?.c ?? 0;

  const speedToday =
    db
      .select({ c: sql<number>`count(*)` })
      .from(sessions)
      .innerJoin(attempts, eq(attempts.sessionId, sessions.id))
      .where(
        and(gte(sessions.startedAt, midnight), eq(sessions.kind, "speed"), eq(attempts.lang, lang)),
      )
      .all()[0]?.c ?? 0;

  const blocks: QuestBlock[] = [
    {
      key: "review",
      title: "Drills",
      sub: due > 0 ? `${due} due · ${fresh} new waiting` : fresh > 0 ? `${fresh} new waiting` : "all clear — keep it warm",
      emoji: "🧠",
      href: "/session",
      color: "sun",
      done: drillReps >= 10 || (due === 0 && drillReps > 0),
      minutes: 10,
    },
    {
      key: "story",
      title: "Story",
      sub: "fresh episode woven from your due forms",
      emoji: "📖",
      href: "/story",
      color: "coral",
      done: storyToday > 0,
      minutes: 15,
    },
    {
      key: "write",
      title: "Scenario",
      sub: "write it — errors feed your weak spots",
      emoji: "✍️",
      href: "/write",
      color: "grape",
      done: scenarioToday > 0,
      minutes: 8,
    },
    {
      key: "fluency",
      title: "Fluency",
      sub: "speed round or a 4/3/2 retell",
      emoji: "⚡",
      href: "/speed",
      color: "tang",
      done: retellToday > 0 || speedToday > 0,
      minutes: 8,
    },
    {
      key: "cast",
      title: "Night cast",
      sub: "play today's items as you fall asleep",
      emoji: "🌙",
      href: "/cast",
      color: "midnight",
      done: false, // untracked by design — it's a bedtime ritual
      minutes: 5,
    },
  ];

  const tracked = blocks.filter((b) => b.key !== "cast");
  const next = tracked.find((b) => !b.done) ?? null;
  const progress = tracked.filter((b) => b.done).length / tracked.length;
  return { blocks, next, progress };
}

/** small sample of due item texts for the marquee */
export function dueSample(lang: Lang, n = 4): string[] {
  return db
    .select({ es: items.es })
    .from(srsStates)
    .innerJoin(items, eq(items.id, srsStates.itemId))
    .where(and(eq(srsStates.direction, "productive"), eq(items.lang, lang)))
    .orderBy(srsStates.due)
    .limit(n)
    .all()
    .map((r) => r.es);
}

/** XP = lifetime attempts for this lang */
export function xp(lang: Lang): number {
  return (
    db
      .select({ c: sql<number>`count(*)` })
      .from(attempts)
      .where(eq(attempts.lang, lang))
      .all()[0]?.c ?? 0
  );
}
