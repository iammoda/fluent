import Link from "next/link";
import { activeLang, LANG_META } from "@/lib/lang";
import { getActiveWeaknesses } from "@/lib/planner";
import { ERROR_LABELS, type ErrorType } from "@/lib/taxonomy";
import { questBoard, dueSample, xp, curriculumBanner } from "@/lib/today";
import { Card, ButtonLink, Sticker, ProgressBar } from "@/components/ui";
import Marquee from "@/components/Marquee";
import { Ufo, Star, Spark, DoodleField, EMOJI_SETS } from "@/components/Doodles";
import InputBlock from "./InputBlock";
import { INPUT_SOURCES } from "@/lib/input-sources";

export const dynamic = "force-dynamic";

const GREETING: Record<string, string> = { es: "¡Hola!", fr: "Salut !" };

export default async function TodayPage() {
  const lang = await activeLang();
  const meta = LANG_META[lang];
  const { blocks, next, progress } = questBoard(lang);
  const weaknesses = getActiveWeaknesses(lang);
  const due = dueSample(lang);
  const points = xp(lang);
  const curr = curriculumBanner(lang);

  const tickerBits = [
    ...due.map((d) => `“${d}”`),
    ...weaknesses.map((w) => `⚠ ${ERROR_LABELS[w.errorType as ErrorType] ?? w.errorType}`),
    `${points} XP`,
    meta.nameNative,
  ];

  return (
    <div className="relative">
      <DoodleField set={EMOJI_SETS[lang]} count={10} />

      {/* hero */}
      <section className="relative">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-5xl font-bold leading-tight">
              {GREETING[lang]}
              <Spark className="ml-2" size={30} />
            </h1>
            <p className="mt-1 font-medium text-ink-soft">
              Your {meta.name} quest for{" "}
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
          <Ufo className="mr-2 mt-1 hidden sm:inline-block" size={72} />
        </div>

        <Marquee className="mt-5">
          {tickerBits.map((b, i) => (
            <span key={i} className="font-display text-sm font-semibold tracking-wide">
              {b} <span className="mx-2 text-sun">★</span>
            </span>
          ))}
        </Marquee>
      </section>

      {/* progress + play */}
      <section className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink-soft">
            <span className="font-display">today&apos;s progress</span>
            <span className="font-display">{Math.round(progress * 100)}%</span>
          </div>
          <ProgressBar value={progress} color="lime" />
        </div>
        {next ? (
          <ButtonLink href={next.href} color="coral" size="xl" className="shrink-0">
            PLAY {next.emoji}
          </ButtonLink>
        ) : (
          <ButtonLink href="/cast" color="midnight" size="xl" className="shrink-0 text-cream">
            🌙 Night cast
          </ButtonLink>
        )}
      </section>

      <div className="mt-8 gap-10 lg:grid lg:grid-cols-[1fr_360px] lg:items-start">
      {/* quest board */}
      <section className="space-y-4">
        {curr.show && (
          <Link href="/curriculum" className="group block">
            <Card color="blush" tilt={-0.8} className="flex items-center gap-3 p-4 transition-transform group-hover:rotate-0">
              <span className="text-3xl">🏭</span>
              <div className="flex-1">
                <div className="font-display font-bold">
                  {curr.pastReady
                    ? "Past tense unlocked — generate it!"
                    : curr.pending > 0
                      ? `${curr.pending} items awaiting your review`
                      : "Curriculum running low"}
                </div>
                <div className="text-sm text-ink-soft">open the workshop →</div>
              </div>
            </Card>
          </Link>
        )}
        {blocks.map((b, i) =>
          b.key === "input" ? (
            <InputBlock key={b.key} block={b} sources={INPUT_SOURCES[lang]} tilt={i % 2 === 0 ? -0.6 : 0.6} />
          ) : (
          <Link key={b.key} href={b.href} className="group block">
            <Card
              color={b.color}
              tilt={i % 2 === 0 ? -0.6 : 0.6}
              className={`flex items-center gap-4 p-4 transition-transform group-hover:rotate-0 group-hover:scale-[1.015] ${
                b.done ? "opacity-70" : ""
              } ${b.color === "midnight" ? "text-cream" : ""}`}
            >
              <span className="font-display grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-paper text-3xl shadow-[2.5px_2.5px_0_0_#1a1a1a]">
                {b.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl font-bold">{b.title}</div>
                <div className={`truncate text-sm ${b.color === "midnight" ? "text-cream/70" : "text-ink-soft"}`}>
                  {b.sub}
                </div>
              </div>
              {b.done ? (
                <Sticker color="lime" tilt={-6}>
                  ✓ done!
                </Sticker>
              ) : next?.key === b.key ? (
                <Sticker color="blush" tilt={5} className="animate-wiggle">
                  ▶ next
                </Sticker>
              ) : (
                <span className={`font-display text-sm font-semibold ${b.color === "midnight" ? "text-cream/60" : "text-ink-soft"}`}>
                  ~{b.minutes} min
                </span>
              )}
            </Card>
          </Link>
          ),
        )}
      </section>

      {/* right column */}
      <div className="mt-10 lg:mt-0">
      {/* weak spots */}
      {weaknesses.length > 0 && (
        <section className="relative">
          <h2 className="font-display mb-3 text-2xl font-bold">
            Boss fights <Star size={20} className="ml-1" animation="wiggle" />
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {weaknesses.map((w) => (
              <Link key={w.errorType} href={`/lesson/${w.errorType}`} className="group block">
                <Card color="blush" tilt={-1} className="p-4 transition-transform group-hover:rotate-0">
                  <div className="font-display font-bold">
                    {ERROR_LABELS[w.errorType as ErrorType] ?? w.errorType}
                  </div>
                  <div className="mt-1 text-sm text-ink-soft">
                    {w.count} hits this week · tap for the micro-lesson
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* babbel brief shortcut */}
      <section className="mt-6 space-y-3">
        <Link href="/brief" className="group block">
          <Card color="paper" className="flex items-center gap-3 p-4 transition-transform group-hover:-rotate-1">
            <span className="text-2xl">💬</span>
            <div className="flex-1">
              <span className="font-display font-bold">Babbel brief</span>
              <span className="ml-2 text-sm text-ink-soft">read before your voice conversation</span>
            </div>
            <span className="font-display text-ink-soft">→</span>
          </Card>
        </Link>
        <Link href="/boss" className="group block">
          <Card color="grape" className="flex items-center gap-3 p-4 transition-transform group-hover:-rotate-1">
            <span className="text-2xl">👾</span>
            <div className="flex-1">
              <span className="font-display font-bold">Weekly boss</span>
              <span className="ml-2 text-sm text-ink-soft">train 4 days to summon it</span>
            </div>
            <span className="font-display">→</span>
          </Card>
        </Link>
        <Link href="/goals" className="group block">
          <Card color="paper" className="flex items-center gap-3 p-4 transition-transform group-hover:-rotate-1">
            <span className="text-2xl">🗺️</span>
            <div className="flex-1">
              <span className="font-display font-bold">The map</span>
              <span className="ml-2 text-sm text-ink-soft">your path to conversational</span>
            </div>
            <span className="font-display text-ink-soft">→</span>
          </Card>
        </Link>
      </section>
      </div>
      </div>
    </div>
  );
}
