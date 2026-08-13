"use client";

/**
 * Arcade drill session — combo counter, SFX, card-slide transitions,
 * accent toolbar, confetti level-clear. Engine calls unchanged.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, animate } from "motion/react";
import { useSpeech, speak } from "./useSpeech";
import { sfx } from "@/lib/sfx";
import AccentBar from "@/components/AccentBar";
import { Sticker, Button, ButtonLink, Card, Stat } from "@/components/ui";
import { ERROR_TIPS } from "@/lib/taxonomy";
import { Emoji, Star, DoodleField, EMOJI_SETS } from "@/components/Doodles";

interface QueueItem {
  promptId: number;
  promptType: string;
  promptText: string;
  reason: "due" | "new" | "weakness" | "relearn";
}

interface Feedback {
  attemptId?: number;
  correct: boolean;
  expected: string;
  errorType: string | null;
  errorLabel: string | null;
  itemEs: string;
  itemEn: string;
}

interface AttemptRecord {
  correct: boolean;
  errorType: string | null;
  latencyMs: number;
  revealed: boolean;
}

const TYPE_BADGE: Record<string, { label: string; color: "sun" | "grape" | "tang" | "blush" }> = {
  en_cue: { label: "say it!", color: "sun" },
  question: { label: "ask it!", color: "grape" },
  transformation: { label: "transform!", color: "tang" },
  contrast: { label: "which one?", color: "blush" },
};

function CountUp({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const c = animate(0, to, { duration: 0.9, onUpdate: (v) => setN(v) });
    return () => c.stop();
  }, [to]);
  return (
    <>
      {n.toFixed(decimals)}
      {suffix}
    </>
  );
}

export default function SessionRunner({ tts = "es-MX" }: { tts?: string }) {
  const accentLang = tts.slice(0, 2);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [records, setRecords] = useState<AttemptRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [speakMode, setSpeakMode] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const shownAt = useRef<number>(Date.now());
  const spokenLatency = useRef<number | null>(null);
  const answeredBySpeech = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const confettiFired = useRef(false);
  const feedbackAt = useRef(0);
  // successive relearning: attempts per prompt this session (max 3 => 2 re-queues)
  const attemptCounts = useRef<Map<number, number>>(new Map());
  const [relearns, setRelearns] = useState(0);
  const [overrideMsg, setOverrideMsg] = useState<string | null>(null);
  const [overriding, setOverriding] = useState(false);

  const claimRight = async () => {
    if (!feedback?.attemptId || overriding) return;
    setOverriding(true);
    const res = await fetch("/api/attempt", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: feedback.attemptId }),
    });
    const d = await res.json();
    if (d.accepted) {
      sfx.correct();
      setFeedback((f) => (f ? { ...f, correct: true, errorType: null, errorLabel: null } : f));
      setRecords((r) => r.map((rec, i) => (i === r.length - 1 ? { ...rec, correct: true, errorType: null } : rec)));
      setCombo((c) => c + 1);
      setOverrideMsg(null);
    } else {
      setOverrideMsg(d.reason ?? "adjudicator disagreed");
    }
    setOverriding(false);
  };

  const speech = useSpeech(tts);

  useEffect(() => {
    setSpeakMode(localStorage.getItem("fluent.speakMode") === "1");
    setTtsOn(localStorage.getItem("fluent.tts") !== "0");
  }, []);

  useEffect(() => {
    fetch("/api/session", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        setSessionId(d.sessionId);
        setQueue(d.queue);
        shownAt.current = Date.now();
      });
  }, []);

  useEffect(() => {
    if (!feedback) inputRef.current?.focus();
  }, [idx, feedback, queue]);

  const current = queue?.[idx];
  const done = queue !== null && queue.length > 0 && idx >= queue.length;

  // level-clear celebration
  useEffect(() => {
    if (done && !confettiFired.current) {
      confettiFired.current = true;
      sfx.complete();
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
        setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } }), 250);
        setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }), 400);
      });
    }
  }, [done]);

  const startListening = useCallback(() => {
    speech.start((transcript) => {
      spokenLatency.current = Date.now() - shownAt.current;
      answeredBySpeech.current = true;
      setAnswer(transcript);
      inputRef.current?.focus();
    });
  }, [speech]);

  useEffect(() => {
    if (speakMode && speech.supported && !feedback && current) startListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, speakMode, feedback, queue === null]);

  useEffect(() => {
    if (feedback && ttsOn) speak(feedback.expected, { lang: tts });
  }, [feedback, ttsOn, tts]);

  const submit = useCallback(
    async (helpUsed: "none" | "reveal") => {
      if (!current || submitting || feedback) return;
      if (helpUsed === "none" && answer.trim() === "") return;
      speech.stop();
      setSubmitting(true);
      const latencyMs =
        answeredBySpeech.current && spokenLatency.current !== null
          ? spokenLatency.current
          : Date.now() - shownAt.current;
      const modality = answeredBySpeech.current ? "spoken" : "typed";
      const isLast = queue !== null && idx === queue.length - 1;
      const res = await fetch("/api/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          promptId: current.promptId,
          answer: helpUsed === "reveal" ? "" : answer,
          latencyMs,
          helpUsed,
          modality,
          end: isLast,
        }),
      });
      const fb = (await res.json()) as Feedback;
      feedbackAt.current = Date.now();
      setFeedback(fb);
      // successive relearning: a missed item re-queues in THIS session
      // until one clean recall (Rawson & Dunlosky 2018, d = 1.5-4.2)
      const tries = (attemptCounts.current.get(current.promptId) ?? 0) + 1;
      attemptCounts.current.set(current.promptId, tries);
      if (!fb.correct && tries < 3) {
        setQueue((q) => {
          if (!q) return q;
          const nq = [...q];
          nq.splice(Math.min(idx + 5, nq.length), 0, { ...current, reason: "relearn" });
          return nq;
        });
        setRelearns((r) => r + 1);
      }
      if (fb.correct) {
        const c = combo + 1;
        setCombo(c);
        setBestCombo((b) => Math.max(b, c));
        if (c >= 3) sfx.combo(c);
        else sfx.correct();
      } else {
        setCombo(0);
        if (helpUsed === "reveal") sfx.whiff();
        else sfx.wrong();
      }
      setRecords((r) => [
        ...r,
        { correct: fb.correct, errorType: fb.errorType, latencyMs, revealed: helpUsed === "reveal" },
      ]);
      setSubmitting(false);
    },
    [current, submitting, feedback, answer, queue, idx, sessionId, speech, combo],
  );

  const next = useCallback(() => {
    setFeedback(null);
    setAnswer("");
    setOverrideMsg(null);
    spokenLatency.current = null;
    answeredBySpeech.current = false;
    setIdx((i) => i + 1);
    shownAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat && Date.now() - feedbackAt.current > 300) next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [feedback, next]);

  /* ---------------------------------------------------------- states */
  if (queue === null) {
    return (
      <div className="py-24 text-center">
        <Emoji size={54} animation="wiggle">🎰</Emoji>
        <p className="font-display mt-4 text-xl font-semibold text-ink-soft">loading your round…</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="py-20 text-center">
        <Emoji size={60}>🏖️</Emoji>
        <h1 className="font-display mt-4 text-3xl font-bold">All clear!</h1>
        <p className="mt-2 text-ink-soft">Nothing due, nothing new. Go read a story or hit a speed round.</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/story" color="coral">📖 Story</ButtonLink>
          <ButtonLink href="/speed" color="tang">⚡ Speed</ButtonLink>
        </div>
      </div>
    );
  }

  if (done) {
    const n = records.length;
    const good = records.filter((r) => r.correct).length;
    const pct = n > 0 ? Math.round((good / n) * 100) : 0;
    const avgLatency = n > 0 ? Math.round(records.reduce((s, r) => s + r.latencyMs, 0) / n / 100) / 10 : 0;
    const errCounts = new Map<string, number>();
    for (const r of records) {
      if (!r.correct && r.errorType) errCounts.set(r.errorType, (errCounts.get(r.errorType) ?? 0) + 1);
    }
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-10 text-center">
        <h1 className="font-display text-5xl font-bold">
          LEVEL CLEAR <Star size={34} className="ml-1" animation="wiggle" />
        </h1>
        <div className="mx-auto mt-8 grid max-w-md grid-cols-3 gap-3">
          <Stat value={<CountUp to={pct} suffix="%" />} label="accuracy" color="lime" tilt={-2} />
          <Stat value={<CountUp to={n} />} label="reps (+XP)" color="sun" tilt={1.5} />
          <Stat value={<CountUp to={avgLatency} suffix="s" decimals={1} />} label="avg speed" color="sky" tilt={-1} />
        </div>
        {(bestCombo >= 3 || relearns > 0) && (
          <div className="mt-5 flex justify-center gap-2">
            {bestCombo >= 3 && (
              <Sticker color="tang" tilt={-4} className="text-base">🔥 best combo ×{bestCombo}</Sticker>
            )}
            {relearns > 0 && (
              <Sticker color="sky" tilt={3} className="text-base">🔁 {relearns} relearned to criterion</Sticker>
            )}
          </div>
        )}
        {errCounts.size > 0 && (
          <Card color="paper" className="mx-auto mt-6 max-w-md p-4 text-left">
            <div className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              boss damage taken
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {[...errCounts.entries()].map(([t, c]) => (
                <li key={t} className="flex justify-between">
                  <Link href={`/lesson/${t}`} className="underline decoration-dotted hover:text-coral-deep">
                    {t}
                  </Link>
                  <span className="font-mono">×{c}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/" color="paper">🎯 Today</ButtonLink>
          <Button color="coral" onClick={() => window.location.reload()}>
            ▶ again
          </Button>
        </div>
      </motion.div>
    );
  }

  const badge = TYPE_BADGE[current!.promptType] ?? { label: current!.promptType, color: "sun" as const };

  return (
    <div className="relative mx-auto max-w-2xl">
      <DoodleField set={EMOJI_SETS.review} count={5} />
      {/* top bar */}
      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="font-display font-semibold text-ink-soft hover:text-ink">
          ← quit
        </Link>
        <div className="flex items-center gap-2">
          {combo >= 3 && (
            <motion.span key={combo} initial={{ scale: 1.6, rotate: -8 }} animate={{ scale: 1, rotate: -4 }}>
              <Sticker color="tang" tilt={-4}>🔥 combo ×{combo}</Sticker>
            </motion.span>
          )}
          {speech.supported && (
            <button
              onClick={() => {
                setSpeakMode((v) => {
                  const nv = !v;
                  localStorage.setItem("fluent.speakMode", nv ? "1" : "0");
                  if (!nv) speech.stop();
                  return nv;
                });
              }}
              className={`card-pop rounded-xl px-2.5 py-1 text-sm font-semibold ${speakMode ? "bg-limey" : "bg-paper"}`}
            >
              🎤
            </button>
          )}
          <button
            onClick={() =>
              setTtsOn((v) => {
                const nv = !v;
                localStorage.setItem("fluent.tts", nv ? "1" : "0");
                return nv;
              })
            }
            className={`card-pop rounded-xl px-2.5 py-1 text-sm font-semibold ${ttsOn ? "bg-limey" : "bg-paper"}`}
          >
            {ttsOn ? "🔊" : "🔇"}
          </button>
          <span className="font-display font-bold">
            {idx + 1}<span className="text-ink-soft">/{queue.length}</span>
          </span>
        </div>
      </div>

      {/* progress */}
      <div className="card-pop mt-3 h-4 overflow-hidden rounded-full bg-paper">
        <div
          className="h-full rounded-full bg-limey transition-all duration-300"
          style={{ width: `${(idx / queue.length) * 100}%` }}
        />
      </div>

      {/* prompt card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ x: 60, opacity: 0, rotate: 1.5 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          exit={{ x: -60, opacity: 0, rotate: -1.5 }}
          transition={{ duration: 0.18 }}
        >
          <Card color="paper" className={`mt-6 p-6 ${feedback && !feedback.correct ? "animate-shake" : ""}`}>
            <div className="flex items-center gap-2">
              <Sticker color={badge.color} tilt={-3}>{badge.label}</Sticker>
              {current!.reason === "new" && <Sticker color="sky" tilt={4}>new!</Sticker>}
              {current!.reason === "weakness" && <Sticker color="blush" tilt={-5}>boss fight</Sticker>}
              {current!.reason === "relearn" && <Sticker color="tang" tilt={4}>round 2 — make it stick</Sticker>}
            </div>
            <p className="font-display mt-4 text-3xl font-semibold leading-snug lg:text-4xl">{current!.promptText}</p>

            {!feedback ? (
              <div className="mt-6">
                {speakMode && speech.supported && (
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    {speech.listening ? (
                      <>
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-deep opacity-60" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-coral-deep" />
                        </span>
                        <span className="font-medium text-ink-soft">
                          listening… <em>{speech.interim}</em>
                        </span>
                      </>
                    ) : (
                      <button onClick={startListening} className="font-display text-sm font-semibold underline">
                        🎤 {answeredBySpeech.current ? "re-record" : "start mic"}
                      </button>
                    )}
                  </div>
                )}
                <input
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => {
                    answeredBySpeech.current = false;
                    setAnswer(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.repeat) submit("none");
                  }}
                  placeholder={speakMode && speech.supported ? "speak, or type…" : "type your answer…"}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-2xl border-2 border-ink bg-cream px-4 py-3 text-xl outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
                />
                <AccentBar lang={accentLang} inputRef={inputRef} value={answer} onChange={setAnswer} />
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => submit("reveal")}
                    className="font-display text-sm font-semibold text-ink-soft underline decoration-dotted hover:text-ink"
                  >
                    no idea — show me
                  </button>
                  <Button color="lime" onClick={() => submit("none")} disabled={submitting || answer.trim() === ""}>
                    check ⏎
                  </Button>
                </div>
              </div>
            ) : (
              <div className="animate-pop-in mt-6">
                <div
                  className={`card-pop rounded-2xl p-4 ${feedback.correct ? "bg-limey" : "bg-blush"}`}
                >
                  <div className="font-display text-lg font-bold">
                    {feedback.correct
                      ? feedback.errorType === "accent"
                        ? "✓ right — mind the accents!"
                        : combo >= 3
                          ? `✓ ${["nice", "sweet", "wow", "unreal", "legend"][Math.min(4, combo - 3)]}!`
                          : "✓ correct!"
                      : "✗ not quite"}
                  </div>
                  <div className="font-display mt-2 flex items-center gap-2 text-2xl font-semibold">
                    {feedback.expected}
                    <button onClick={() => speak(feedback.expected, { lang: tts })} className="text-base" title="hear it">
                      🔊
                    </button>
                  </div>
                  {feedback.errorLabel && !feedback.correct && feedback.errorType && (
                    <>
                      <Link href={`/lesson/${feedback.errorType}`} className="mt-2 inline-block">
                        <Sticker color="paper" tilt={-2} className="normal-case">
                          {feedback.errorLabel} → lesson
                        </Sticker>
                      </Link>
                      {ERROR_TIPS[feedback.errorType] && (
                        <p className="mt-2 text-sm leading-snug text-ink-soft">
                          💡 {ERROR_TIPS[feedback.errorType]}
                        </p>
                      )}
                    </>
                  )}
                  <div className="mt-2 text-sm text-ink-soft">
                    {feedback.itemEs} · {feedback.itemEn}
                  </div>
                  {!feedback.correct && feedback.attemptId && answer.trim() !== "" && (
                    <div className="mt-2">
                      <button
                        onClick={claimRight}
                        disabled={overriding}
                        className="font-display text-sm font-semibold underline decoration-dotted hover:text-limey-deep disabled:opacity-50"
                      >
                        🙋 I was right — accept my answer
                      </button>
                      {overrideMsg && <p className="mt-1 text-xs text-ink-soft">⚖️ {overrideMsg}</p>}
                    </div>
                  )}
                </div>
                <Button color="sun" className="mt-4 w-full" onClick={next}>
                  next ⏎
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
