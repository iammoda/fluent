import { activeLang, LANG_META } from "@/lib/lang";
import { activeProvider } from "@/lib/llm";
import IslandsClient from "./IslandsClient";

export const dynamic = "force-dynamic";

export default async function IslandsPage() {
  const lang = await activeLang();
  return (
    <IslandsClient
      langName={LANG_META[lang].name}
      flag={LANG_META[lang].flag}
      tts={LANG_META[lang].tts}
      provider={activeProvider()}
    />
  );
}
