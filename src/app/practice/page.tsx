import Link from "next/link";
import { activeLang, LANG_META } from "@/lib/lang";
import { Card } from "@/components/ui";
import { DoodleField, EMOJI_SETS, Rocket } from "@/components/Doodles";
import type { Candy } from "@/components/ui";

export const dynamic = "force-dynamic";

const CABINETS: {
  href: string;
  emoji: string;
  title: string;
  desc: string;
  color: Candy;
  strand: string;
}[] = [
  {
    href: "/session",
    emoji: "🧠",
    title: "Drills",
    desc: "Adaptive session — due forms, transformations, contrasts",
    color: "sun",
    strand: "language focus",
  },
  {
    href: "/speed",
    emoji: "⚡",
    title: "Speed round",
    desc: "Stuff you know, against the clock. Say it before you think",
    color: "tang",
    strand: "fluency",
  },
  {
    href: "/retell",
    emoji: "🗣️",
    title: "4/3/2 retell",
    desc: "Same story, three times, shrinking timer. WPM telemetry",
    color: "sky",
    strand: "fluency",
  },
  {
    href: "/story",
    emoji: "📖",
    title: "Story",
    desc: "A fresh episode woven from exactly what you're due to review",
    color: "coral",
    strand: "input",
  },
  {
    href: "/write",
    emoji: "✍️",
    title: "Scenario",
    desc: "Write your way out. Errors feed the weak-spot engine",
    color: "grape",
    strand: "output",
  },
  {
    href: "/dictation",
    emoji: "👂",
    title: "Dictation",
    desc: "Type what you hear at natural speed. Decoding training",
    color: "lime",
    strand: "input",
  },
  {
    href: "/brief",
    emoji: "💬",
    title: "Babbel brief",
    desc: "Your cheat sheet before external conversation practice",
    color: "mint",
    strand: "output",
  },
  {
    href: "/cast",
    emoji: "🌙",
    title: "Night cast",
    desc: "Today's items, slow audio, as you fall asleep",
    color: "midnight",
    strand: "consolidation",
  },
  {
    href: "/islands",
    emoji: "🏝️",
    title: "Islands",
    desc: "Your personal monologues, drilled until automatic",
    color: "blush",
    strand: "fluency",
  },
  {
    href: "/lexicon",
    emoji: "📥",
    title: "Lexicon",
    desc: "Capture words from real life — they jump tomorrow's queue",
    color: "paper",
    strand: "language focus",
  },
  {
    href: "/boss",
    emoji: "👾",
    title: "Weekly boss",
    desc: "Train 4 days to summon it. Everything from your week, one fight",
    color: "grape",
    strand: "output",
  },
  {
    href: "/goals",
    emoji: "🗺️",
    title: "The map",
    desc: "CEFR can-do checklist — the visible path to conversational",
    color: "sun",
    strand: "progress",
  },
];

export default async function PracticePage() {
  const lang = await activeLang();
  return (
    <div className="relative">
      <DoodleField set={EMOJI_SETS.today} count={9} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">The arcade</h1>
          <p className="mt-1 text-ink-soft">
            Every machine trains a different {LANG_META[lang].name} muscle. Pick one.
          </p>
        </div>
        <Rocket className="mr-3 hidden sm:block" size={56} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {CABINETS.map((c, i) => (
          <Link key={c.href} href={c.href} className="group block">
            <Card
              color={c.color}
              tilt={i % 3 === 0 ? -1 : i % 3 === 1 ? 0.8 : -0.4}
              className={`h-full p-5 transition-transform group-hover:rotate-0 group-hover:scale-[1.02] ${
                c.color === "midnight" ? "text-cream" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-4xl">{c.emoji}</span>
                <span
                  className={`font-display rounded-lg border-2 border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    c.color === "midnight" ? "bg-midnight-soft text-cream" : "bg-paper text-ink"
                  }`}
                >
                  {c.strand}
                </span>
              </div>
              <div className="font-display mt-3 text-2xl font-bold">{c.title}</div>
              <p className={`mt-1 text-sm ${c.color === "midnight" ? "text-cream/70" : "text-ink-soft"}`}>
                {c.desc}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
