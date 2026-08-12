import { latestStory } from "@/lib/story";
import type { StoryContent } from "@/lib/story";
import { activeLang, LANG_META } from "@/lib/lang";
import RetellRunner from "./RetellRunner";

export const dynamic = "force-dynamic";

export default async function RetellPage() {
  const lang = await activeLang();
  const row = latestStory(lang);
  const story = row
    ? {
        id: row.id,
        title: row.title,
        sentences: (JSON.parse(row.content) as StoryContent).sentences.map((s) => s.es),
      }
    : null;
  return <RetellRunner story={story} stt={LANG_META[lang].tts} />;
}
