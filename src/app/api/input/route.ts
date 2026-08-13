import { NextResponse } from "next/server";
import { db } from "@/db";
import { inputLogs } from "@/db/schema";
import { activeLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

/** POST /api/input {minutes, source?} — log external comprehensible input */
export async function POST(req: Request) {
  const lang = await activeLang();
  const body = await req.json();
  const minutes = Math.min(300, Math.max(1, Math.round(Number(body.minutes) || 0)));
  if (!minutes) return NextResponse.json({ error: "bad minutes" }, { status: 400 });
  db.insert(inputLogs)
    .values({
      lang,
      minutes,
      source: typeof body.source === "string" ? body.source.slice(0, 120) : null,
      createdAt: Date.now(),
    })
    .run();
  return NextResponse.json({ ok: true });
}
