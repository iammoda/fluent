import { NextResponse } from "next/server";
import { LANG_COOKIE } from "@/lib/lang";

export const dynamic = "force-dynamic";

/** POST /api/lang {lang: 'es'|'fr'} — switch active language */
export async function POST(req: Request) {
  const body = await req.json();
  const lang = body?.lang === "fr" ? "fr" : "es";
  const res = NextResponse.json({ lang });
  res.cookies.set(LANG_COOKIE, lang, { maxAge: 60 * 60 * 24 * 365, path: "/" });
  return res;
}
