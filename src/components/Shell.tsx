"use client";

/**
 * App shell — awning-trimmed header, per-page candy wash, ambient doodles,
 * desktop left rail / mobile bottom tabs. Full-bleed on desktop.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LANG_META, type Lang } from "@/lib/lang-shared";
import { sfxEnabled, setSfxEnabled, sfx } from "@/lib/sfx";
import { Star, AmbientDoodles, EMOJI_SETS } from "@/components/Doodles";
import AmbientSpawner from "@/components/AmbientSpawner";
import VoiceSettings from "@/components/VoiceSettings";

const NAV = [
  { href: "/", label: "Today", emoji: "🎯" },
  { href: "/practice", label: "Practice", emoji: "🕹️" },
  { href: "/story", label: "Stories", emoji: "📖" },
  { href: "/stats", label: "Stats", emoji: "🏆" },
];

/** per-page candy washes */
const WASHES: [prefix: string, color: string, dark?: boolean][] = [
  ["/practice", "#cde9ff"],
  ["/story", "#ffdfc2"],
  ["/stats", "#d2f1dc"],
  ["/write", "#e6dbff"],
  ["/speed", "#ffddb0"],
  ["/dictation", "#e4f4c8"],
  ["/brief", "#cff0e4"],
  ["/retell", "#d8edff"],
  ["/cast", "#241f3d", true],
  ["/lesson", "#ffe0ea"],
  ["/session", "#ffe9a8"],
  ["/curriculum", "#ffe4c9"],
  ["/lexicon", "#e6dbff"],
  ["/islands", "#cdeee7"],
  ["/goals", "#e6f2c4"],
  ["/boss", "#ffd9d9"],
];

function washFor(pathname: string): { color: string; dark: boolean } {
  if (pathname === "/") return { color: "#ffe9a8", dark: false };
  for (const [prefix, color, dark] of WASHES) {
    if (pathname.startsWith(prefix)) return { color, dark: dark ?? false };
  }
  return { color: "#faf3e7", dark: false };
}

/** ambient emoji set per page (falls back to language set) */
function ambientSetFor(pathname: string, lang: Lang): readonly string[] {
  if (pathname.startsWith("/story")) return EMOJI_SETS.story;
  if (pathname.startsWith("/stats")) return EMOJI_SETS.stats;
  if (pathname.startsWith("/speed")) return EMOJI_SETS.speed;
  if (pathname.startsWith("/retell")) return EMOJI_SETS.retell;
  if (pathname.startsWith("/write")) return EMOJI_SETS.write;
  if (pathname.startsWith("/dictation")) return EMOJI_SETS.dictation;
  if (pathname.startsWith("/cast")) return EMOJI_SETS.cast;
  if (pathname.startsWith("/session")) return EMOJI_SETS.review;
  if (pathname.startsWith("/practice")) return EMOJI_SETS.today;
  if (pathname.startsWith("/islands")) return EMOJI_SETS.retell;
  if (pathname.startsWith("/goals")) return EMOJI_SETS.stats;
  if (pathname.startsWith("/boss")) return EMOJI_SETS.party;
  return EMOJI_SETS[lang];
}

function NavItems({ pathname, dark }: { pathname: string; dark: boolean }) {
  return (
    <>
      {NAV.map((n) => {
        const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`font-display flex items-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-base font-semibold transition-transform hover:-rotate-1 hover:scale-[1.03] ${
              active
                ? "border-ink bg-sun text-ink shadow-[3px_3px_0_0_#1a1a1a]"
                : dark
                  ? "border-transparent text-cream/70 hover:border-cream/50 hover:text-cream"
                  : "border-transparent text-ink-soft hover:border-ink hover:bg-paper"
            }`}
          >
            <span className="text-xl">{n.emoji}</span>
            <span>{n.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function StreakFlame() {
  const [streak, setStreak] = useState<number | null>(null);
  const [activeToday, setActiveToday] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    fetch("/api/streak")
      .then((r) => r.json())
      .then((d) => {
        setStreak(d.streak);
        setActiveToday(d.activeToday);
      })
      .catch(() => {});
  }, [pathname]);
  if (streak === null) return null;
  return (
    <span
      className={`font-display card-pop inline-flex items-center gap-1 rounded-2xl px-3 py-1.5 text-base font-bold ${
        activeToday ? "bg-tang" : "bg-paper"
      }`}
      title={activeToday ? "Streak alive — you showed up today!" : "Do anything today to keep the streak"}
    >
      <span className={activeToday ? "animate-wiggle inline-block" : "opacity-50"}>🔥</span>
      {streak}
    </span>
  );
}

function SfxToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(sfxEnabled()), []);
  return (
    <button
      onClick={() => {
        const next = !on;
        setOn(next);
        setSfxEnabled(next);
        if (next) sfx.correct();
      }}
      className="card-pop rounded-2xl bg-paper px-3 py-1.5 text-base"
      title="Arcade sounds"
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}

function LangPills({ current }: { current: Lang }) {
  const set = async (lang: Lang) => {
    if (lang === current) return;
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
    window.location.reload();
  };
  return (
    <div className="card-pop flex gap-1 rounded-2xl bg-paper p-1">
      {(Object.keys(LANG_META) as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          className={`font-display rounded-xl px-2.5 py-1 text-sm font-bold transition-transform ${
            l === current
              ? "border-2 border-ink bg-[var(--accent)] text-white shadow-[2px_2px_0_0_#1a1a1a]"
              : "text-ink-soft hover:scale-110"
          }`}
          title={LANG_META[l].name}
        >
          {LANG_META[l].flag}
        </button>
      ))}
    </div>
  );
}

export default function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  const pathname = usePathname();
  const wash = washFor(pathname);

  // sync body background so overscroll edges match the wash
  useEffect(() => {
    document.body.style.backgroundColor = wash.color;
  }, [wash.color]);

  return (
    <div
      className="isolate flex min-h-screen flex-col transition-colors duration-300"
      style={{ backgroundColor: wash.color }}
    >
      <AmbientDoodles set={ambientSetFor(pathname, lang)} />
      <AmbientSpawner set={ambientSetFor(pathname, lang)} />

      {/* header */}
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-cream/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-3 px-4 py-3 lg:px-12">
          <Link href="/" className="font-display flex items-center gap-1.5 text-3xl font-bold tracking-tight">
            fluent
            <Star size={22} tilt={12} animation="wiggle" />
          </Link>
          <div className="flex items-center gap-2">
            <StreakFlame />
            <VoiceSettings />
            <SfxToggle />
            <LangPills current={lang} />
          </div>
        </div>
        {/* awning trim */}
        <div className="scallops w-full" />
      </header>

      <div className="mx-auto flex w-full max-w-[1700px] flex-1 gap-6 px-4 pt-6 lg:gap-12 lg:px-12">
        {/* desktop rail */}
        <nav className="sticky top-24 hidden h-fit w-44 shrink-0 flex-col gap-2 md:flex">
          <NavItems pathname={pathname} dark={wash.dark} />
        </nav>

        {/* page content */}
        <main className="min-w-0 flex-1 pb-28 md:pb-16">{children}</main>
      </div>

      {/* mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex justify-around px-2 py-1.5">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`font-display flex flex-col items-center rounded-xl px-3 py-1 text-[11px] font-semibold ${
                  active ? "border-2 border-ink bg-sun shadow-[2px_2px_0_0_#1a1a1a]" : "text-ink-soft"
                }`}
              >
                <span className="text-xl leading-none">{n.emoji}</span>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
