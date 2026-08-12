import SpeedRunner from "./SpeedRunner";
import { activeLang, LANG_META } from "@/lib/lang";

export const dynamic = "force-dynamic";

export default async function SpeedPage() {
  const lang = await activeLang();
  return <SpeedRunner tts={LANG_META[lang].tts} />;
}
