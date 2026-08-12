import { eq } from "drizzle-orm";
import { db } from "@/db";
import { candoChecks } from "@/db/schema";
import { activeLang, LANG_META } from "@/lib/lang";
import GoalsClient from "./GoalsClient";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const lang = await activeLang();
  const checked = db
    .select({ key: candoChecks.key })
    .from(candoChecks)
    .where(eq(candoChecks.lang, lang))
    .all()
    .map((r) => r.key);

  return <GoalsClient langName={LANG_META[lang].name} flag={LANG_META[lang].flag} initialChecked={checked} />;
}
