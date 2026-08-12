import { activeLang, LANG_META } from "@/lib/lang";
import { activeProvider } from "@/lib/llm";
import WriteRunner from "./WriteRunner";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const lang = await activeLang();
  return <WriteRunner langName={LANG_META[lang].name} provider={activeProvider()} accentLang={lang} />;
}
