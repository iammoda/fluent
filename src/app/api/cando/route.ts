import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { candoChecks } from "@/db/schema";
import { activeLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

/** POST /api/cando {key} — toggle a can-do check */
export async function POST(req: Request) {
  const lang = await activeLang();
  const { key } = await req.json();
  if (typeof key !== "string" || !key) return NextResponse.json({ error: "bad key" }, { status: 400 });

  const existing = db
    .select()
    .from(candoChecks)
    .where(and(eq(candoChecks.lang, lang), eq(candoChecks.key, key)))
    .all()[0];

  if (existing) {
    db.delete(candoChecks).where(eq(candoChecks.id, existing.id)).run();
    return NextResponse.json({ checked: false });
  }
  db.insert(candoChecks).values({ lang, key, checkedAt: Date.now() }).run();
  return NextResponse.json({ checked: true });
}
