"use client";

/**
 * Consolidation cast — the one intentionally calm, dark screen.
 * Slow audio loop of today's material with karaoke highlight;
 * play state resets itself when the playlist ends.
 */
import { useState } from "react";
import Link from "next/link";
import { speak, speakSeq, stopSpeaking } from "../session/useSpeech";
import { Card } from "@/components/ui";
import { Emoji } from "@/components/Doodles";

interface Entry {
  es: string;
  en: string;
  sentence: string;
}

const REPEATS = 2;

export default function CastPlayer({
  entries,
  ttsLang,
  langName,
}: {
  entries: Entry[];
  ttsLang: string;
  langName: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const playAll = () => {
    setPlaying(true);
    const texts: string[] = [];
    for (let r = 0; r < REPEATS; r++) for (const e of entries) texts.push(e.sentence);
    speakSeq(texts, {
      lang: ttsLang,
      rate: 0.8,
      onIndex: (i) => {
        if (i === null) {
          setPlaying(false);
          setActiveIdx(null);
        } else {
          setActiveIdx(i % entries.length);
        }
      },
    });
  };

  const stop = () => {
    stopSpeaking();
    setPlaying(false);
    setActiveIdx(null);
  };

  return (
    <div className="relative mx-auto max-w-2xl">
      <span className="pointer-events-none absolute -top-2 right-0"><Emoji size={26} animation="drift">🌌</Emoji></span>
      <span className="pointer-events-none absolute left-[-8%] top-[30%] hidden lg:block"><Emoji size={22} animation="floaty">🦉</Emoji></span>
      <span className="pointer-events-none absolute right-[-8%] top-[55%] hidden lg:block"><Emoji size={20} animation="floaty">🌠</Emoji></span>

      <Link href="/" className="font-display text-sm font-semibold text-cream/60 hover:text-cream">
        ← today
      </Link>

      <Card color="midnight" className="relative mt-4 overflow-hidden p-6 text-cream">
        <span className="absolute right-5 top-4"><Emoji size={30} animation="drift">🌙</Emoji></span>
        <span className="absolute right-16 top-12"><Emoji size={16} animation="floaty">⭐</Emoji></span>
        <span className="absolute left-6 bottom-5"><Emoji size={18} animation="floaty">💤</Emoji></span>

        <h1 className="font-display text-4xl font-bold">Night cast</h1>
        <p className="mt-2 max-w-md text-sm text-cream/70">
          Today&apos;s new + struggled {langName} items, read slowly, twice through (~
          {Math.max(1, Math.round((entries.length * 2 * 4) / 60))} min). Play it as the last thing before
          sleep — tomorrow opens by retrieving exactly these.
        </p>

        {entries.length === 0 ? (
          <p className="mt-6 rounded-2xl border-2 border-midnight-soft bg-midnight-soft/60 p-4 text-cream/70">
            Nothing to consolidate yet today — do a session first, then come back tonight.
          </p>
        ) : (
          <>
            {!playing ? (
              <button
                onClick={playAll}
                className="font-display mt-6 w-full rounded-2xl border-2 border-ink bg-grape py-4 text-xl font-bold text-ink shadow-[4px_4px_0_0_#0d0b18] transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                ▶ play cast ({entries.length} items)
              </button>
            ) : (
              <button
                onClick={stop}
                className="font-display mt-6 w-full rounded-2xl border-2 border-cream/40 py-4 text-xl font-bold text-cream/90"
              >
                ■ stop
              </button>
            )}

            <ul className="mt-6 space-y-2">
              {entries.map((e, i) => (
                <li
                  key={i}
                  className={`rounded-2xl border-2 p-3 transition-colors ${
                    activeIdx === i
                      ? "border-grape bg-grape/20"
                      : "border-midnight-soft bg-midnight-soft/50"
                  }`}
                >
                  <button
                    onClick={() => speak(e.sentence, { lang: ttsLang, rate: 0.8 })}
                    className="mr-2 text-sm opacity-60 hover:opacity-100"
                  >
                    🔊
                  </button>
                  <span className="font-display text-lg text-grape">{e.sentence}</span>
                  <div className="ml-7 text-sm text-cream/50">
                    {e.es} · {e.en}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
