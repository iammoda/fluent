import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, items, prompts } from "@/db/schema";
import { activeLang, LANG_META } from "@/lib/lang";
import CastPlayer from "./CastPlayer";

export const dynamic = "force-dynamic";

const WINDOW_MS = 18 * 60 * 60 * 1000; // "today" = last 18h

/**
 * Consolidation cast — passive audio of today's new + struggled items,
 * to play as the last thing before sleep (pre-sleep learning is retained
 * better; sleep replay consolidates). Tomorrow's session retrieves them.
 */
export default async function CastPage() {
  const lang = await activeLang();
  const since = Date.now() - WINDOW_MS;

  // items touched today
  const today = db
    .select({
      itemId: attempts.itemId,
      failed: sql<number>`sum(case when ${attempts.correct} = 0 then 1 else 0 end)`.as("failed"),
    })
    .from(attempts)
    .where(and(gte(attempts.createdAt, since), eq(attempts.lang, lang), sql`${attempts.itemId} > 0`))
    .groupBy(attempts.itemId)
    .all();

  // first-ever attempt per item (to detect "introduced today")
  const ids = today.map((t) => t.itemId);
  let entries: { es: string; en: string; sentence: string }[] = [];
  if (ids.length > 0) {
    const firstSeen = db
      .select({
        itemId: attempts.itemId,
        first: sql<number>`min(${attempts.createdAt})`.as("first"),
      })
      .from(attempts)
      .where(inArray(attempts.itemId, ids))
      .groupBy(attempts.itemId)
      .all();
    const firstMap = new Map(firstSeen.map((f) => [f.itemId, f.first]));

    const chosen = today
      .filter((t) => (t.failed ?? 0) > 0 || (firstMap.get(t.itemId) ?? 0) >= since)
      .slice(0, 15)
      .map((t) => t.itemId);

    if (chosen.length > 0) {
      const rows = db
        .select({ id: items.id, es: items.es, en: items.en })
        .from(items)
        .where(inArray(items.id, chosen))
        .all();
      const ctx = db
        .select({ itemId: prompts.itemId, expected: prompts.expected })
        .from(prompts)
        .where(and(inArray(prompts.itemId, chosen), inArray(prompts.promptType, ["en_cue", "question"])))
        .all();
      const ctxMap = new Map<number, string>();
      for (const c of ctx) if (!ctxMap.has(c.itemId)) ctxMap.set(c.itemId, c.expected);
      entries = rows.map((r) => ({
        es: r.es,
        en: r.en,
        sentence: ctxMap.get(r.id) ?? r.es,
      }));
    }
  }

  return <CastPlayer entries={entries} ttsLang={LANG_META[lang].tts} langName={LANG_META[lang].name} />;
}
