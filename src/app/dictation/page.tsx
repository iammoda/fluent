import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { items, prompts } from "@/db/schema";
import { latestStory } from "@/lib/story";
import type { StoryContent } from "@/lib/story";
import { activeLang, LANG_META } from "@/lib/lang";
import DictationRunner from "./DictationRunner";

export const dynamic = "force-dynamic";

const DRILL_SIZE = 6;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default async function DictationPage() {
  const lang = await activeLang();

  // Prefer sentences from your latest story (known-ish content, connected speech);
  // fall back to curriculum sentences.
  let sentences: string[] = [];
  const story = latestStory(lang);
  if (story) {
    sentences = (JSON.parse(story.content) as StoryContent).sentences.map((s) => s.es);
  }
  if (sentences.length < DRILL_SIZE) {
    const rows = db
      .select({ expected: prompts.expected })
      .from(prompts)
      .innerJoin(items, eq(items.id, prompts.itemId))
      .where(and(eq(items.lang, lang), inArray(prompts.promptType, ["en_cue", "question"])))
      .all();
    sentences = [...sentences, ...rows.map((r) => r.expected)];
  }
  const drill = shuffle([...new Set(sentences)]).slice(0, DRILL_SIZE);

  return <DictationRunner sentences={drill} ttsLang={LANG_META[lang].tts} />;
}
