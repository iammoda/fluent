import { NextResponse } from "next/server";
import { generateScenario, gradeScenario, latestTask } from "@/lib/write";
import { activeProvider } from "@/lib/llm";
import { activeLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

/** POST /api/write {action:'generate'} | {action:'grade', taskId, response} */
export async function POST(req: Request) {
  const lang = await activeLang();
  const body = await req.json();
  try {
    if (body.action === "generate") {
      const task = await generateScenario(lang, body.kind === "boss" ? "boss" : "scenario");
      return NextResponse.json({ task, provider: activeProvider() });
    }
    if (body.action === "grade") {
      const { task, feedback } = await gradeScenario(lang, body.taskId, String(body.response ?? ""));
      return NextResponse.json({ task, feedback, provider: activeProvider() });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed" },
      { status: 500 },
    );
  }
}

/** GET /api/write — latest task */
export async function GET() {
  const lang = await activeLang();
  return NextResponse.json({ task: latestTask(lang), provider: activeProvider() });
}
