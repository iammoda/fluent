import { NextResponse } from "next/server";
import { activeLang } from "@/lib/lang";
import { activeProvider } from "@/lib/llm";
import { curriculumState, generateTranche, generateFreshPrompts, reviewItems } from "@/lib/factory";

export const dynamic = "force-dynamic";

/** GET /api/curriculum — state */
export async function GET() {
  const lang = await activeLang();
  return NextResponse.json({ state: curriculumState(lang), provider: activeProvider() });
}

/** POST — {action:'generate'|'generate_past'} | {action:'review', ids, decision} */
export async function POST(req: Request) {
  const lang = await activeLang();
  const body = await req.json();
  try {
    if (body.action === "generate" || body.action === "generate_past") {
      const result = await generateTranche(lang, body.action === "generate_past" ? "past" : "next");
      return NextResponse.json({ result, state: curriculumState(lang) });
    }
    if (body.action === "freshen") {
      const result = await generateFreshPrompts(lang);
      return NextResponse.json({ result, state: curriculumState(lang) });
    }
    if (body.action === "review") {
      const n = reviewItems(
        (body.ids as number[]).filter((n) => Number.isInteger(n)),
        body.decision === "reject" ? "reject" : "approve",
      );
      return NextResponse.json({ reviewed: n, state: curriculumState(lang) });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
