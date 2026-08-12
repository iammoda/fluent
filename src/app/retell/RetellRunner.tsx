"use client";

/**
 * 4/3/2 retell — arcade edition. Same content, three rounds, shrinking
 * timer. Continuous dictation supplies live word count + wpm telemetry.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useDictation } from "../session/useSpeech";
import { sfx } from "@/lib/sfx";
import { Button, ButtonLink, Card, Sticker } from "@/components/ui";
import { Emoji, DoodleField, EMOJI_SETS } from "@/components/Doodles";

const ROUNDS = [60, 45, 30];

interface RoundResult {
  seconds: number;
  words: number;
  wpm: number;
  transcript: string;
}

interface StoryRef {
  id: number;
  title: string;
  sentences: string[];
}

type Phase = "choose" | "ready" | "running" | "between" | "done";

export default function RetellRunner({ story, stt = "es-MX" }: { story: StoryRef | null; stt?: string }) {
  const [source, setSource] = useState<"story" | "day" | null>(null);
  const [phase, setPhase] = useState<Phase>("choose");
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUNDS[0]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [peek, setPeek] = useState(false);
  const [saved, setSaved] = useState(false);
  const dictation = useDictation(stt);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confettiFired = useRef(false);
  const transcriptRef = useRef("");
  useEffect(() => {
    transcriptRef.current = dictation.transcript;
  }, [dictation.transcript]);

  const startRound = () => {
    setSecondsLeft(ROUNDS[round]);
    setPhase("running");
    setPeek(false);
    dictation.start();
  };

  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          endRound();
          return 0;
        }
        if (s <= 6) sfx.tick();
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const endRound = () => {
    dictation.stop();
    const seconds = ROUNDS[round];
    setTimeout(() => {
      const transcript = transcriptRef.current;
      const words = transcript.split(/\s+/).filter(Boolean).length;
      setResults((rs) => [...rs, { seconds, words, wpm: Math.round((words / seconds) * 60), transcript }]);
      if (round + 1 < ROUNDS.length) {
        setRound((r) => r + 1);
        setPhase("between");
      } else {
        setPhase("done");
      }
    }, 300);
  };

  useEffect(() => {
    if (phase === "done" && results.length === ROUNDS.length && !saved) {
      setSaved(true);
      sfx.complete();
      if (!confettiFired.current) {
        confettiFired.current = true;
        import("canvas-confetti").then(({ default: confetti }) =>
          confetti({ particleCount: 80, spread: 80, origin: { y: 0.55 } }),
        );
      }
      fetch("/api/retell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: source === "story" ? (story?.id ?? null) : null,
          source,
          rounds: results,
        }),
      });
    }
  }, [phase, results, saved, source, story]);

  if (!dictation.supported) {
    return (
      <div className="py-20 text-center">
        <Emoji size={60}>🎙️</Emoji>
        <h1 className="font-display mt-4 text-2xl font-bold">Mic needed</h1>
        <p className="mt-2 text-ink-soft">Retells need speech recognition — open this in Chrome or Edge.</p>
        <div className="mt-6">
          <ButtonLink href="/" color="sun">🎯 Today</ButtonLink>
        </div>
      </div>
    );
  }

  if (phase === "choose") {
    return (
      <div className="relative mx-auto max-w-xl">
        <DoodleField set={EMOJI_SETS.retell} count={6} />
        <h1 className="font-display text-4xl font-bold">🗣 4/3/2 RETELL</h1>
        <p className="mt-2 text-ink-soft">
          Tell the same thing three times — {ROUNDS.join("s → ")}s. Less time each round. This is the drill
          that makes speaking feel automatic.
        </p>
        <div className="mt-8 space-y-4">
          {story && (
            <button
              onClick={() => {
                setSource("story");
                setPhase("ready");
              }}
              className="w-full text-left"
            >
              <Card color="sky" tilt={-0.8} className="p-5 transition-transform hover:rotate-0 hover:scale-[1.01]">
                <div className="font-display text-xl font-bold">📖 Retell the story</div>
                <div className="mt-1 text-sm text-ink-soft">&ldquo;{story.title}&rdquo; — in your own words</div>
              </Card>
            </button>
          )}
          <button
            onClick={() => {
              setSource("day");
              setPhase("ready");
            }}
            className="w-full text-left"
          >
            <Card color="mint" tilt={0.8} className="p-5 transition-transform hover:rotate-0 hover:scale-[1.01]">
              <div className="font-display text-xl font-bold">☀️ Describe your day</div>
              <div className="mt-1 text-sm text-ink-soft">what you do, want to do, have to do — present tense is fine</div>
            </Card>
          </button>
        </div>
        <div className="mt-6">
          <Link href="/" className="font-display text-sm font-semibold text-ink-soft underline">
            ← back
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "ready" || phase === "between") {
    const isFirst = phase === "ready";
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-bold">
          Round {round + 1} <span className="text-ink-soft">of {ROUNDS.length}</span> — {ROUNDS[round]}s
        </h1>
        {!isFirst && results.length > 0 && (
          <Card color="paper" className="mt-4 p-4">
            <span className="font-display font-bold">last round:</span> {results[results.length - 1].words} words (
            {results[results.length - 1].wpm} wpm). Same content, <b>faster</b> this time.
          </Card>
        )}
        {source === "story" && story && (
          <div className="mt-4">
            <button onClick={() => setPeek((v) => !v)} className="font-display text-sm font-semibold underline">
              {peek ? "hide story" : "👀 peek at the story first"}
            </button>
            {peek && (
              <Card color="paper" className="mt-2 p-4 text-sm">
                {story.sentences.map((s, i) => (
                  <p key={i} className="font-display text-base">{s}</p>
                ))}
              </Card>
            )}
          </div>
        )}
        <Button color="sky" size="xl" className="mt-8 w-full" onClick={startRound}>
          {isFirst ? "🎙 START SPEAKING" : `▶ ROUND ${round + 1}`}
        </Button>
      </div>
    );
  }

  if (phase === "running") {
    const liveWords =
      dictation.words + (dictation.interim ? dictation.interim.split(/\s+/).filter(Boolean).length : 0);
    return (
      <div className="py-10 text-center">
        <motion.div
          key={secondsLeft}
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          className={`font-display text-8xl font-bold tabular-nums ${secondsLeft <= 5 ? "text-coral-deep" : ""}`}
        >
          {secondsLeft}
        </motion.div>
        <div className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-coral-deep">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-deep opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-coral-deep" />
          </span>
          recording — keep talking, don&apos;t stop!
        </div>
        <div className="mx-auto mt-8 w-fit">
          <Card color="lime" tilt={-1.5} className="px-8 py-4">
            <div className="font-display text-5xl font-bold">{liveWords}</div>
            <div className="font-display text-xs font-semibold uppercase tracking-widest">words</div>
          </Card>
        </div>
        {dictation.interim && <p className="mt-4 text-sm italic text-ink-soft">{dictation.interim}</p>}
        <button
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            endRound();
          }}
          className="font-display mt-10 text-sm font-semibold text-ink-soft underline"
        >
          end round early
        </button>
      </div>
    );
  }

  const best = Math.max(...results.map((r) => r.wpm));
  const gained = results.length >= 2 && results[results.length - 1].wpm > results[0].wpm;
  return (
    <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto max-w-xl py-6">
      <h1 className="font-display text-4xl font-bold">RETELL CLEAR 🏁</h1>
      <div className="mt-6 space-y-3">
        {results.map((r, i) => (
          <Card key={i} color={r.wpm === best ? "lime" : "paper"} tilt={i % 2 === 0 ? -0.6 : 0.6} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold">
                Round {i + 1} · {r.seconds}s
              </span>
              <span className="font-display text-2xl font-bold">
                {r.wpm} wpm {r.wpm === best && "⭐"}
              </span>
            </div>
            <div className="text-sm text-ink-soft">{r.words} words</div>
            {r.transcript && <p className="mt-2 border-t-2 border-ink/10 pt-2 text-sm text-ink-soft">{r.transcript}</p>}
          </Card>
        ))}
      </div>
      {gained && (
        <div className="mt-4">
          <Sticker color="tang" tilt={-3} className="text-sm">
            🚀 +{results[results.length - 1].wpm - results[0].wpm} wpm from round 1 — automatization!
          </Sticker>
        </div>
      )}
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/" color="paper">🎯 Today</ButtonLink>
        <Button color="sky" onClick={() => window.location.reload()}>
          ▶ again
        </Button>
      </div>
    </motion.div>
  );
}
