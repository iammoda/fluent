import Link from "next/link";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, outputTasks } from "@/db/schema";
import { activeLang, LANG_META } from "@/lib/lang";
import { activeProvider } from "@/lib/llm";
import WriteRunner from "../write/WriteRunner";
import { Card } from "@/components/ui";
import { Emoji } from "@/components/Doodles";

export const dynamic = "force-dynamic";

const GATE_DAYS = 4;

function mondayMs(): number {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export default async function BossPage() {
  const lang = await activeLang();
  const since = mondayMs();

  const activeDays =
    db
      .select({
        d: sql<string>`date(${attempts.createdAt} / 1000, 'unixepoch', 'localtime')`.as("d"),
      })
      .from(attempts)
      .where(and(gte(attempts.createdAt, since), eq(attempts.lang, lang)))
      .groupBy(sql`d`)
      .all().length;

  const beatenThisWeek =
    db
      .select({ c: sql<number>`count(*)` })
      .from(outputTasks)
      .where(
        and(
          eq(outputTasks.lang, lang),
          eq(outputTasks.kind, "boss"),
          sql`${outputTasks.gradedAt} is not null`,
          gte(sql`coalesce(${outputTasks.gradedAt}, 0)`, since),
        ),
      )
      .all()[0]?.c ?? 0;

  if (activeDays < GATE_DAYS) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <Emoji size={64} animation="wiggle">👾</Emoji>
        <h1 className="font-display mt-4 text-4xl font-bold">The boss sleeps…</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-soft">
          Train <b>{GATE_DAYS} days this week</b> to summon the weekly boss — a big scenario mixing
          everything you&apos;ve practiced.
        </p>
        <Card color="paper" className="mx-auto mt-6 w-fit px-8 py-4">
          <div className="font-display text-4xl font-bold">
            {activeDays}<span className="text-ink-soft">/{GATE_DAYS}</span>
          </div>
          <div className="text-xs text-ink-soft">active days this week</div>
        </Card>
        <div className="mt-6">
          <Link href="/session" className="font-display font-semibold underline">
            → go train
          </Link>
        </div>
      </div>
    );
  }

  if (beatenThisWeek > 0) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <Emoji size={64}>🏆</Emoji>
        <h1 className="font-display mt-4 text-4xl font-bold">Boss already beaten!</h1>
        <p className="mt-3 text-ink-soft">
          You cleared this week&apos;s boss. A new one spawns Monday. Keep the streak warm.
        </p>
        <div className="mt-6">
          <Link href="/" className="font-display font-semibold underline">
            ← today
          </Link>
        </div>
      </div>
    );
  }

  return <WriteRunner langName={LANG_META[lang].name} provider={activeProvider()} accentLang={lang} mode="boss" />;
}
