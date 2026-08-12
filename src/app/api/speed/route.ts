import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { items, prompts, sessions, srsStates } from "@/db/schema";
import { reviveCard } from "@/lib/fsrs";
import { activeLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

const SPEED_ROUND_SIZE = 10;

/**
 * GET /api/speed — a speed round plan.
 * Fluency development strand: ONLY already-known material, produced fast.
 * Strong = reps >= 2 (fallback: any tracked item if the deck is young).
 */
export async function GET() {
  const lang = await activeLang();
  const rows = db
    .select({ itemId: srsStates.itemId, card: srsStates.card })
    .from(srsStates)
    .innerJoin(items, eq(items.id, srsStates.itemId))
    .where(and(eq(srsStates.direction, "productive"), eq(items.lang, lang)))
    .all();

  let strong = rows.filter((r) => reviveCard(r.card).reps >= 2).map((r) => r.itemId);
  if (strong.length < 4) strong = rows.map((r) => r.itemId); // young deck fallback

  // shuffle, take N
  for (let i = strong.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [strong[i], strong[j]] = [strong[j], strong[i]];
  }
  const chosen = strong.slice(0, SPEED_ROUND_SIZE);
  if (chosen.length === 0) return NextResponse.json({ queue: [] });

  const candidatePrompts = db
    .select()
    .from(prompts)
    .where(
      and(inArray(prompts.itemId, chosen), inArray(prompts.promptType, ["en_cue", "question"])),
    )
    .all();

  const queue = chosen
    .map((itemId) => {
      const ps = candidatePrompts.filter((p) => p.itemId === itemId);
      if (ps.length === 0) return null;
      const p = ps[Math.floor(Math.random() * ps.length)];
      return {
        promptId: p.id,
        promptType: p.promptType,
        promptText: p.promptText,
        reason: "due" as const,
      };
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  // track speed rounds as sessions (feeds the Today quest board)
  const [s] = db
    .insert(sessions)
    .values({ startedAt: Date.now(), kind: "speed", plannedCount: queue.length })
    .returning({ id: sessions.id })
    .all();

  return NextResponse.json({ sessionId: s.id, queue });
}
