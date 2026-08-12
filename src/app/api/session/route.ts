import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { planSession } from "@/lib/planner";
import { activeLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

/** POST /api/session — plan a session and create the session record */
export async function POST() {
  const lang = await activeLang();
  const plan = planSession(lang);
  if (plan.length === 0) {
    return NextResponse.json({ sessionId: null, queue: [] });
  }
  const [s] = db
    .insert(sessions)
    .values({ startedAt: Date.now(), plannedCount: plan.length })
    .returning({ id: sessions.id })
    .all();

  // Never leak expected answers to the client
  return NextResponse.json({
    sessionId: s.id,
    queue: plan.map((p) => ({
      promptId: p.promptId,
      promptType: p.promptType,
      promptText: p.promptText,
      reason: p.reason,
    })),
  });
}
