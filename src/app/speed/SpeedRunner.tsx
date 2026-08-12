"use client";

/**
 * Speed round — arcade fuse edition. The timer is a fuse burning across
 * the screen edge; timeout = miss. Attempts flow through /api/attempt.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useSpeech } from "../session/useSpeech";
import { sfx } from "@/lib/sfx";
import AccentBar from "@/components/AccentBar";
import { Button, ButtonLink, Card, Stat, Sticker } from "@/components/ui";
import { Emoji } from "@/components/Doodles";

const PROMPT_SECONDS = 15;
const TICK_MS = 100;

interface QueueItem {
  promptId: number;
  promptType: string;
  promptText: string;
}

interface Result {
  correct: boolean;
  expected: string;
  latencyMs: number;
  timedOut: boolean;
}

export default function SpeedRunner({ tts = "es-MX" }: { tts?: string }) {
  const accentLang = tts.slice(0, 2);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [msLeft, setMsLeft] = useState(PROMPT_SECONDS * 1000);
  const [results, setResults] = useState<Result[]>([]);
  const [flash, setFlash] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const shownAt = useRef(Date.now());
  const answeredBySpeech = useRef(false);
  const spokenLatency = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const confettiFired = useRef(false);
  const speech = useSpeech(tts);
  const [speakMode, setSpeakMode] = useState(false);
  const answerRef = useRef("");
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    setSpeakMode(localStorage.getItem("fluent.speakMode") === "1");
    fetch("/api/speed")
      .then((r) => r.json())
      .then((d) => {
        setSessionId(d.sessionId ?? null);
        setQueue(d.queue);
      });
  }, []);

  const current = queue?.[idx];
  const done = queue !== null && queue.length > 0 && idx >= queue.length;

  useEffect(() => {
    if (done && !confettiFired.current) {
      confettiFired.current = true;
      sfx.complete();
      import("canvas-confetti").then(({ default: confetti }) =>
        confetti({ particleCount: 80, spread: 90, origin: { y: 0.5 } }),
      );
    }
  }, [done]);

  const submit = useCallback(
    async (finalAnswer: string, timedOut: boolean) => {
      if (!current || submittingRef.current) return;
      submittingRef.current = true;
      speech.stop();
      const latencyMs =
        answeredBySpeech.current && spokenLatency.current !== null
          ? spokenLatency.current
          : Math.min(Date.now() - shownAt.current, PROMPT_SECONDS * 1000);
      const isLast = queue !== null && idx === queue.length - 1;
      const res = await fetch("/api/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          promptId: current.promptId,
          answer: finalAnswer,
          latencyMs,
          helpUsed: "none",
          modality: answeredBySpeech.current ? "spoken" : "typed",
          end: isLast,
        }),
      });
      const fb = await res.json();
      const result: Result = { correct: fb.correct, expected: fb.expected, latencyMs, timedOut };
      if (fb.correct) sfx.correct();
      else sfx.wrong();
      setResults((r) => [...r, result]);
      setFlash(result);
      setTimeout(() => {
        setFlash(null);
        setAnswer("");
        answeredBySpeech.current = false;
        spokenLatency.current = null;
        setIdx((i) => i + 1);
        setMsLeft(PROMPT_SECONDS * 1000);
        shownAt.current = Date.now();
        submittingRef.current = false;
      }, 900);
    },
    [current, speech, sessionId, queue, idx],
  );

  // fuse countdown
  useEffect(() => {
    if (!running || !current || flash) return;
    const t = setInterval(() => {
      setMsLeft((ms) => {
        if (ms <= TICK_MS) {
          clearInterval(t);
          submit(answerRef.current, true);
          return 0;
        }
        if (ms < 4000 && Math.round(ms / 1000) !== Math.round((ms - TICK_MS) / 1000)) sfx.tick();
        return ms - TICK_MS;
      });
    }, TICK_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx, flash, queue === null]);

  // mic auto-listen
  useEffect(() => {
    if (running && speakMode && speech.supported && current && !flash) {
      speech.start((transcript) => {
        spokenLatency.current = Date.now() - shownAt.current;
        answeredBySpeech.current = true;
        setAnswer(transcript);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx, speakMode, flash]);

  useEffect(() => {
    if (running && !flash) inputRef.current?.focus();
  }, [running, idx, flash]);

  if (queue === null)
    return (
      <div className="py-24 text-center">
        <Emoji size={54} animation="wiggle">⚡</Emoji>
        <p className="font-display mt-4 text-xl font-semibold text-ink-soft">warming up the machine…</p>
      </div>
    );

  if (queue.length === 0)
    return (
      <div className="py-20 text-center">
        <Emoji size={60}>🔌</Emoji>
        <h1 className="font-display mt-4 text-3xl font-bold">Nothing to race yet</h1>
        <p className="mt-2 text-ink-soft">Do a drill session first — then come race what you know.</p>
        <div className="mt-6">
          <ButtonLink href="/session" color="sun">🧠 Drills</ButtonLink>
        </div>
      </div>
    );

  if (!running)
    return (
      <div className="relative py-14 text-center">
        <Emoji size={66} animation="drift" className="absolute right-8 top-2">🏎️</Emoji>
        <h1 className="font-display text-5xl font-bold">⚡ SPEED ROUND</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          {queue.length} prompts you already know. {PROMPT_SECONDS} seconds each. The goal isn&apos;t
          knowing — it&apos;s <em className="font-semibold">speed</em>. Say it before you think.
        </p>
        <Button
          color="tang"
          size="xl"
          className="mt-8"
          onClick={() => {
            setRunning(true);
            shownAt.current = Date.now();
          }}
        >
          INSERT COIN ▶
        </Button>
        <div className="mt-6">
          <Link href="/" className="font-display text-sm font-semibold text-ink-soft underline">
            ← back
          </Link>
        </div>
      </div>
    );

  if (done) {
    const n = results.length;
    const good = results.filter((r) => r.correct).length;
    const goodLat = results.filter((r) => r.correct).map((r) => r.latencyMs);
    const avg = goodLat.length > 0 ? Math.round(goodLat.reduce((a, b) => a + b, 0) / goodLat.length / 100) / 10 : null;
    return (
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-12 text-center">
        <h1 className="font-display text-4xl font-bold">RACE OVER 🏁</h1>
        <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
          <Stat value={`${Math.round((good / n) * 100)}%`} label="hit rate" color="lime" tilt={-1.5} />
          <Stat value={avg !== null ? `${avg}s` : "—"} label="avg speed" color="sky" tilt={1} />
          <Stat value={results.filter((r) => r.timedOut).length} label="timeouts" color="blush" tilt={-1} />
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/" color="paper">🎯 Today</ButtonLink>
          <Button color="tang" onClick={() => window.location.reload()}>
            ▶ again
          </Button>
        </div>
      </motion.div>
    );
  }

  const pct = msLeft / (PROMPT_SECONDS * 1000);
  const fuseColor = pct > 0.4 ? "bg-limey" : pct > 0.15 ? "bg-sun" : "bg-coral";

  return (
    <div className="mx-auto max-w-2xl">
      {/* the fuse */}
      <div className="card-pop h-7 overflow-hidden rounded-full bg-paper">
        <div
          className={`flex h-full items-center justify-end rounded-full pr-1.5 transition-none ${fuseColor}`}
          style={{ width: `${pct * 100}%` }}
        >
          <span className="text-xs">{pct > 0.06 ? "🔥" : ""}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <Link href="/" className="font-display font-semibold text-ink-soft hover:text-ink">
          ← quit
        </Link>
        <span className="font-display font-bold">
          {idx + 1}<span className="text-ink-soft">/{queue.length}</span>
        </span>
      </div>

      <AnimatePresence mode="wait">
        {flash ? (
          <motion.div
            key={`flash-${idx}`}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-12"
          >
            <Card color={flash.correct ? "lime" : "blush"} tilt={flash.correct ? -1.5 : 1.5} className="p-8 text-center">
              <div className="font-display text-3xl font-bold">
                {flash.correct ? `✓ ${(flash.latencyMs / 1000).toFixed(1)}s` : flash.timedOut ? "⏰ TIME!" : "✗"}
              </div>
              {!flash.correct && <div className="font-display mt-2 text-xl">{flash.expected}</div>}
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key={idx}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="mt-10"
          >
            <p className="font-display text-center text-3xl font-semibold leading-snug lg:text-4xl">{current!.promptText}</p>
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => {
                answeredBySpeech.current = false;
                setAnswer(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.repeat && answer.trim() !== "") submit(answer, false);
              }}
              placeholder={speakMode && speech.supported ? "speak fast, or type…" : "FAST!"}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-6 w-full rounded-2xl border-2 border-ink bg-paper px-4 py-3 text-center text-xl outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
            />
            <AccentBar lang={accentLang} inputRef={inputRef} value={answer} onChange={setAnswer} />
            {speakMode && speech.supported && speech.listening && (
              <p className="mt-2 text-center text-xs font-semibold text-coral-deep">
                ● listening {speech.interim && `— ${speech.interim}`}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
