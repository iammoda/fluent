import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { islands, items, srsStates } from "@/db/schema";
import { getActiveWeaknesses } from "@/lib/planner";
import { ERROR_LABELS, ERROR_TIPS, type ErrorType } from "@/lib/taxonomy";
import { activeLang, LANG_META } from "@/lib/lang";
import { Card, Sticker } from "@/components/ui";
import { DoodleField, EMOJI_SETS } from "@/components/Doodles";
import DebriefCapture from "./DebriefCapture";

export const dynamic = "force-dynamic";

/**
 * Babbel brief — the cheat sheet before external conversation practice.
 */
export default async function BriefPage() {
  const lang = await activeLang();
  const targets = db
    .select({ es: items.es, en: items.en, type: items.type, due: srsStates.due })
    .from(srsStates)
    .innerJoin(items, eq(items.id, srsStates.itemId))
    .where(and(eq(srsStates.direction, "productive"), eq(items.lang, lang)))
    .orderBy(srsStates.due)
    .limit(6)
    .all();

  const weaknesses = getActiveWeaknesses(lang);
  const myIslands = db
    .select({ id: islands.id, title: islands.title })
    .from(islands)
    .where(eq(islands.lang, lang))
    .all();

  return (
    <div className="relative mx-auto max-w-2xl">
      <DoodleField set={EMOJI_SETS[lang]} count={7} />
      <Link href="/" className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
        ← today
      </Link>
      <h1 className="font-display mt-2 text-4xl font-bold">
        💬 Babbel brief {LANG_META[lang].flag}
      </h1>
      <p className="mt-1 text-ink-soft">
        Read this before you open Babbel&apos;s AI conversation. Steer the chat to use these —
        that&apos;s pushed output on your due items.
      </p>

      <section className="mt-8">
        <h2 className="font-display mb-3 text-xl font-bold">🎯 sneak these in today</h2>
        {targets.length === 0 ? (
          <Card color="paper" className="p-4 text-sm text-ink-soft">
            No tracked items yet — do a session first, then the brief fills in.
          </Card>
        ) : (
          <div className="space-y-3">
            {targets.map((t, i) => (
              <Card key={i} color={i % 2 === 0 ? "mint" : "sun"} tilt={i % 2 === 0 ? -0.7 : 0.7} className="p-4">
                <span className="font-display text-xl font-bold">{t.es}</span>
                <span className="ml-3 text-sm text-ink-soft">{t.en}</span>
              </Card>
            ))}
          </div>
        )}
      </section>

      {myIslands.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display mb-3 text-xl font-bold">🏝️ deploy an island</h2>
          <div className="flex flex-wrap gap-2">
            {myIslands.map((i) => (
              <Link key={i.id} href="/islands">
                <Sticker color="sky" tilt={-2} className="text-sm normal-case">
                  {i.title}
                </Sticker>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Steer the conversation toward one of your rehearsed monologues — that&apos;s what they&apos;re for.
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display mb-3 text-xl font-bold">⚠️ watch out for</h2>
        {weaknesses.length === 0 ? (
          <Card color="paper" className="p-4 text-sm text-ink-soft">
            No recurring errors this week. Speak freely. 🕊️
          </Card>
        ) : (
          <div className="space-y-3">
            {weaknesses.map((w) => (
              <Link key={w.errorType} href={`/lesson/${w.errorType}`} className="block">
                <Card color="blush" tilt={-0.6} className="p-4 transition-transform hover:rotate-0">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">
                      {ERROR_LABELS[w.errorType as ErrorType] ?? w.errorType}
                    </span>
                    <Sticker color="paper" tilt={3}>lesson →</Sticker>
                  </div>
                  {ERROR_TIPS[w.errorType] && (
                    <div className="mt-1 text-sm text-ink-soft">{ERROR_TIPS[w.errorType]}</div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <DebriefCapture langName={LANG_META[lang].name} />
      </section>
    </div>
  );
}
