import { activeLang, LANG_META } from "@/lib/lang";
import { activeProvider } from "@/lib/llm";
import LexiconClient from "./LexiconClient";

export const dynamic = "force-dynamic";

export default async function LexiconPage() {
  const lang = await activeLang();
  return <LexiconClient langName={LANG_META[lang].name} flag={LANG_META[lang].flag} provider={activeProvider()} />;
}
