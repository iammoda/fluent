import { NextResponse } from "next/server";
import { generateStory, latestStory } from "@/lib/story";
import { activeProvider } from "@/lib/llm";
import { activeLang } from "@/lib/lang";

export const dynamic = "force-dynamic";

/** POST /api/story {topic?} — generate a new story from current memory state */
export async function POST(req: Request) {
  const lang = await activeLang();
  let topic: string | null = null;
  try {
    const body = await req.json();
    topic = typeof body?.topic === "string" && body.topic.trim() !== "" ? body.topic.trim() : null;
  } catch {
    /* empty body ok */
  }
  try {
    const story = await generateStory(lang, topic);
    return NextResponse.json({ story, provider: activeProvider() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "generation failed" },
      { status: 500 },
    );
  }
}

/** GET /api/story — latest story */
export async function GET() {
  const lang = await activeLang();
  return NextResponse.json({ story: latestStory(lang), provider: activeProvider() });
}
