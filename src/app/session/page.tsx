import SessionRunner from "./SessionRunner";
import { activeLang, LANG_META } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function SessionPage() {
  const lang = await activeLang();
  return <SessionRunner tts={LANG_META[lang].tts} />;
}
