import Link from "next/link";
import { and, desc, eq, gt, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, items, retells, srsStates } from "@/db/schema";
import { reviveCard } from "@/lib/fsrs";
import { activeLang, LANG_META } from "@/lib/lang";
import { getActiveWeaknesses } from "@/lib/planner";
import { ERROR_LABELS, type ErrorType } from "@/lib/taxonomy";
import { xp } from "@/lib/today";
import { Card, Stat, Sticker } from "@/components/ui";
import { Sparkbars, Heatmap } from "@/components/charts";
import { Star, DoodleField, EMOJI_SETS } from "@/components/Doodles";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function accuracyByDay(lang: string, days: number): number[] {
  const since = Date.now() - days * DAY;
  const rows = db
    .select({ createdAt: attempts.createdAt, correct: attempts.correct })
    .from(attempts)
    .where(and(gte(attempts.createdAt, since), eq(attempts.lang, lang), eq(attempts.helpUsed, "none")))
    .all();
  const buckets = new Map<string, { good: number; total: number }>();
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    const b = buckets.get(k) ?? { good: 0, total: 0 };
    b.total++;
    if (r.correct === 1) b.good++;
    buckets.set(k, b);
  }
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(Date.now() - i * DAY);
    const b = buckets.get(k);
    out.push(b ? Math.round((b.good / b.total) * 100) : 0);
  }
  return out;
}

function latencyByWeek(lang: string, weeks: number): number[] {
  const now = Date.now();
  const out: number[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const from = now - (w + 1) * 7 * DAY;
    const to = now - w * 7 * DAY;
    const lat = db
      .select({ latencyMs: attempts.latencyMs })
      .from(attempts)
      .where(
        and(
          gte(attempts.createdAt, from),
          sql`${attempts.createdAt} < ${to}`,
          eq(attempts.lang, lang),
          eq(attempts.correct, 1),
          eq(attempts.helpUsed, "none"),
          gt(attempts.latencyMs, 0),
        ),
      )
      .all()
      .map((r) => r.latencyMs)
      .sort((a, b) => a - b);
    out.push(lat.length > 0 ? Math.round(lat[Math.floor(lat.length / 2)] / 100) / 10 : 0);
  }
  return out;
}

function heatmapDays(lang: string, days: number) {
  const since = Date.now() - days * DAY;
  const rows = db
    .select({
      day: sql<string>`date(${attempts.createdAt} / 1000, 'unixepoch', 'localtime')`.as("day"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(attempts)
    .where(and(gte(attempts.createdAt, since), eq(attempts.lang, lang)))
    .groupBy(sql`day`)
    .all();
  const map = new Map(rows.map((r) => [r.day, r.count]));
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = dayKey(Date.now() - i * DAY);
    out.push({ date: k, count: map.get(k) ?? 0 });
  }
  return out;
}

/** verb mastery board: verbs x persons, bucket 0..3 by FSRS stability */
function masteryBoard(lang: string, tenseView: "pres" | "past") {
  const PERSONS = ["1s", "2s", "3s", "1p", "3p"];
  const PERSON_LABELS = lang === "fr" ? ["je", "tu", "il/elle", "nous", "ils"] : ["yo", "tú", "él/ella", "nos.", "ellos"];
  const forms = db
    .select({
      id: items.id,
      lemma: items.lemma,
      person: items.person,
      tense: items.tense,
      es: items.es,
      orderIndex: items.orderIndex,
      card: srsStates.card,
    })
    .from(items)
    .leftJoin(srsStates, and(eq(srsStates.itemId, items.id), eq(srsStates.direction, "productive")))
    .where(and(eq(items.type, "verb_form"), eq(items.lang, lang), eq(items.status, "active")))
    .orderBy(items.orderIndex)
    .all()
    .filter((f) =>
      tenseView === "pres" ? f.tense === "pres" : f.tense !== "pres" && f.tense !== null,
    );

  const verbs = new Map<string, { order: number; cells: Map<string, { form: string; bucket: number }> }>();
  for (const f of forms) {
    if (!f.lemma || !f.person) continue;
    let bucket = 0;
    if (f.card) {
      const c = reviveCard(f.card);
      const stability = c.stability ?? 0;
      bucket = stability >= 14 ? 3 : stability >= 3 ? 2 : 1;
    }
    const rowKey = tenseView === "pres" ? f.lemma : `${f.lemma} · ${f.tense}`;
    if (!verbs.has(rowKey)) verbs.set(rowKey, { order: f.orderIndex, cells: new Map() });
    verbs.get(rowKey)!.cells.set(f.person, { form: f.es, bucket });
  }
  const rows = [...verbs.entries()].sort((a, b) => a[1].order - b[1].order);
  return { rows, PERSONS, PERSON_LABELS };
}

const BUCKET_STYLE = [
  "bg-paper text-ink-soft/40", // untouched
  "bg-sun", // learning
  "bg-limey", // known
  "bg-limey-deep text-cream", // mastered -> gets a star
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tense?: string }>;
}) {
  const lang = await activeLang();
  const { tense } = await searchParams;
  const tenseView: "pres" | "past" = tense === "past" ? "past" : "pres";
  const meta = LANG_META[lang];
  const acc14 = accuracyByDay(lang, 14);
  const lat4 = latencyByWeek(lang, 4);
  const heat = heatmapDays(lang, 91);
  const { rows, PERSONS, PERSON_LABELS } = masteryBoard(lang, tenseView);
  const weaknesses = getActiveWeaknesses(lang);
  const points = xp(lang);

  const recentRetells = db
    .select()
    .from(retells)
    .where(eq(retells.lang, lang))
    .orderBy(desc(retells.id))
    .limit(10)
    .all()
    .reverse();
  const wpmTrend = recentRetells.map((r) =>
    Math.max(...(JSON.parse(r.rounds) as { wpm: number }[]).map((x) => x.wpm), 0),
  );

  const tracked =
    db
      .select({ c: sql<number>`count(*)` })
      .from(srsStates)
      .innerJoin(items, eq(items.id, srsStates.itemId))
      .where(and(eq(srsStates.direction, "productive"), eq(items.lang, lang)))
      .all()[0]?.c ?? 0;

  const last50 = db
    .select({ correct: attempts.correct })
    .from(attempts)
    .where(and(eq(attempts.lang, lang), eq(attempts.helpUsed, "none")))
    .orderBy(desc(attempts.createdAt))
    .limit(50)
    .all();
  const accNow =
    last50.length > 0 ? Math.round((last50.filter((r) => r.correct === 1).length / last50.length) * 100) : null;

  const errors7d = db
    .select({ errorType: attempts.errorType, count: sql<number>`count(*)`.as("count") })
    .from(attempts)
    .where(
      and(
        gte(attempts.createdAt, Date.now() - 7 * DAY),
        eq(attempts.lang, lang),
        eq(attempts.correct, 0),
        sql`${attempts.errorType} is not null`,
      ),
    )
    .groupBy(attempts.errorType)
    .orderBy(desc(sql`count(*)`))
    .all();
  const maxErr = Math.max(...errors7d.map((e) => e.count), 1);

  return (
    <div className="relative">
      <DoodleField set={EMOJI_SETS.stats} count={8} />

      <h1 className="font-display text-4xl font-bold">
        Trophy room <Star size={26} className="ml-1" animation="wiggle" />
      </h1>
      <p className="mt-1 text-ink-soft">{meta.name} — every number is real telemetry, no vanity metrics.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={points} label="XP (lifetime reps)" color="sun" tilt={-1} />
        <Stat value={tracked} label="items in training" color="sky" tilt={0.8} />
        <Stat value={accNow === null ? "—" : `${accNow}%`} label="accuracy (last 50)" color="lime" tilt={-0.6} />
        <Stat
          value={wpmTrend.length > 0 ? `${wpmTrend[wpmTrend.length - 1]}` : "—"}
          label="latest retell wpm"
          color="blush"
          tilt={1}
        />
      </div>

      {/* mastery board */}
      <section className="mt-10">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold">Conjugation board</h2>
          <div className="card-pop flex gap-1 rounded-2xl bg-paper p-1 text-sm">
            <Link
              href="/stats"
              className={`font-display rounded-xl px-2.5 py-0.5 font-bold ${tenseView === "pres" ? "border-2 border-ink bg-sun" : "text-ink-soft"}`}
            >
              present
            </Link>
            <Link
              href="/stats?tense=past"
              className={`font-display rounded-xl px-2.5 py-0.5 font-bold ${tenseView === "past" ? "border-2 border-ink bg-sun" : "text-ink-soft"}`}
            >
              past
            </Link>
          </div>
        </div>
        <p className="mb-3 mt-1 text-sm text-ink-soft">
          Your 8 core verbs × 5 persons, colored by real memory strength. ⭐ = mastered (2+ weeks stable).
        </p>
        <Card color="paper" className="overflow-x-auto p-4">
          <table className="w-full border-separate" style={{ borderSpacing: "4px" }}>
            <thead>
              <tr>
                <th className="font-display pr-2 text-left text-xs text-ink-soft">verb</th>
                {PERSON_LABELS.map((p) => (
                  <th key={p} className="font-display px-1 text-center text-xs text-ink-soft">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([lemma, v]) => (
                <tr key={lemma}>
                  <td className="font-display pr-2 text-sm font-bold">{lemma}</td>
                  {PERSONS.map((p) => {
                    const cell = v.cells.get(p);
                    const bucket = cell?.bucket ?? 0;
                    return (
                      <td key={p}>
                        <div
                          className={`font-display grid h-11 min-w-16 place-items-center rounded-xl border-2 border-ink text-sm font-semibold ${BUCKET_STYLE[bucket]}`}
                          title={cell ? `${cell.form}` : ""}
                        >
                          {bucket === 3 ? "⭐" : cell?.form ?? ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* charts */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Card color="paper" className="p-4" tilt={-0.5}>
          <div className="font-display font-bold">Accuracy · 14 days</div>
          <div className="mt-3">
            <Sparkbars values={acc14} color="#7cb518" />
          </div>
        </Card>
        <Card color="paper" className="p-4" tilt={0.5}>
          <div className="font-display font-bold">Answer speed · 4 weeks (s, lower = better)</div>
          <div className="mt-3">
            <Sparkbars values={lat4} color="#2b8fd9" />
          </div>
        </Card>
        <Card color="paper" className="p-4" tilt={0.4}>
          <div className="font-display font-bold">Retell wpm · last {wpmTrend.length || "—"}</div>
          <div className="mt-3">
            <Sparkbars values={wpmTrend} color="#f4511e" />
          </div>
        </Card>
        <Card color="paper" className="p-4" tilt={-0.4}>
          <div className="font-display font-bold">Errors · 7 days</div>
          <div className="mt-3 space-y-1.5">
            {errors7d.length === 0 && <div className="text-sm text-ink-soft">clean sheet ✨</div>}
            {errors7d.map((e) => (
              <Link key={e.errorType} href={`/lesson/${e.errorType}`} className="block">
                <div className="flex items-center gap-2">
                  <div className="h-5 rounded-md border-2 border-ink bg-coral" style={{ width: `${(e.count / maxErr) * 70}%`, minWidth: 14 }} />
                  <span className="text-xs font-medium text-ink-soft">
                    {ERROR_LABELS[e.errorType as ErrorType] ?? e.errorType} ({e.count})
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      {/* heatmap */}
      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Showing up · 13 weeks</h2>
        <p className="mb-3 mt-1 text-sm text-ink-soft">The one chart that predicts everything else.</p>
        <Card color="paper" className="overflow-x-auto p-4">
          <Heatmap days={heat} />
        </Card>
      </section>

      {weaknesses.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display mb-3 text-2xl font-bold">Active boss fights</h2>
          <div className="flex flex-wrap gap-2">
            {weaknesses.map((w) => (
              <Link key={w.errorType} href={`/lesson/${w.errorType}`}>
                <Sticker color="blush" tilt={-3} className="text-sm">
                  {ERROR_LABELS[w.errorType as ErrorType] ?? w.errorType} ×{w.count}
                </Sticker>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
