import { latestStory } from "@/lib/story";
import { activeProvider } from "@/lib/llm";
import { activeLang, LANG_META } from "@/lib/lang";
import StoryReader, { type StoryView } from "./StoryReader";

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const lang = await activeLang();
  const row = latestStory(lang);
  const story: StoryView | null = row
    ? {
        id: row.id,
        title: row.title,
        topic: row.topic,
        createdAt: row.createdAt,
        content: JSON.parse(row.content),
        targets: JSON.parse(row.targets),
        missing: JSON.parse(row.missing),
      }
    : null;

  return <StoryReader initialStory={story} provider={activeProvider()} ttsLang={LANG_META[lang].tts} />;
}
