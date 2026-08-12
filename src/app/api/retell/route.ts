import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activeLang } from "@/lib/lang";
import { retells } from "@/db/schema";

export const dynamic = "force-dynamic";

export interface RetellRound {
  seconds: number;
  words: number;
  wpm: number;
  transcript: string;
}

/** POST /api/retell — save a completed 4/3/2 set */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    storyId: number | null;
    source: "story" | "day";
    rounds: RetellRound[];
  };
  if (!Array.isArray(body.rounds) || body.rounds.length === 0) {
    return NextResponse.json({ error: "no rounds" }, { status: 400 });
  }
  const lang = await activeLang();
  const [row] = db
    .insert(retells)
    .values({
      createdAt: Date.now(),
      lang,
      storyId: body.storyId,
      source: body.source,
      rounds: JSON.stringify(body.rounds),
    })
    .returning()
    .all();
  return NextResponse.json({ retell: row });
}

/** GET /api/retell — recent retells (telemetry) */
export async function GET() {
  const lang = await activeLang();
  const rows = db
    .select()
    .from(retells)
    .where(eq(retells.lang, lang))
    .orderBy(desc(retells.id))
    .limit(10)
    .all();
  return NextResponse.json({ retells: rows });
}
