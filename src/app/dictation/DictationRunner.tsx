"use client";

/**
 * Dictation decoding drill — arcade edition. Big jukebox play button,
 * word-diff scoring, SFX.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { speak } from "../session/useSpeech";
import { normLoose } from "@/lib/grading";
import { sfx } from "@/lib/sfx";
import AccentBar from "@/components/AccentBar";
import { Button, ButtonLink, Card, Stat } from "@/components/ui";
import { Emoji, DoodleField, EMOJI_SETS } from "@/components/Doodles";

export default function DictationRunner({
  sentences,
  ttsLang,
}: {
  sentences: string[];
  ttsLang: string;
}) {
  const accentLang = ttsLang.slice(0, 2);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [plays, setPlays] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [rate, setRate] = useState(1.0);
  const inputRef = useRef<HTMLInputElement>(null);
  const checkedAt = useRef(0);

  const current = sentences[idx];
  const done = idx >= sentences.length;

  const play = () => {
    speak(current, { lang: ttsLang, rate });
    setPlays((p) => p + 1);
  };

  const diff = (): { word: string; ok: boolean }[] => {
    const exp = normLoose(current).split(" ").filter(Boolean);
    const got = new Set(normLoose(answer).split(" ").filter(Boolean));
    return exp.map((w) => ({ word: w, ok: got.has(w) }));
  };

  const check = () => {
    const d = diff();
    const score = d.length > 0 ? d.filter((x) => x.ok).length / d.length : 0;
    if (score >= 0.8) sfx.correct();
    else sfx.wrong();
    setScores((s) => [...s, score]);
    checkedAt.current = Date.now();
    setChecked(true);
  };

  const next = () => {
    setIdx((i) => i + 1);
    setAnswer("");
    setChecked(false);
    setPlays(0);
  };

  // Enter advances the result screen (with auto-repeat guard)
  useEffect(() => {
    if (!checked) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.repeat && Date.now() - checkedAt.current > 300) next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  if (sentences.length === 0) {
    return (
      <div className="py-20 text-center">
        <Emoji size={60}>🎧</Emoji>
        <h1 className="font-display mt-4 text-3xl font-bold">No tracks loaded</h1>
        <p className="mt-2 text-ink-soft">Do a session or generate a story first, then come listen.</p>
        <div className="mt-6">
          <ButtonLink href="/" color="sun">🎯 Today</ButtonLink>
        </div>
      </div>
    );
  }

  if (done) {
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
    return (
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-12 text-center">
        <h1 className="font-display text-4xl font-bold">EARS LEVELED UP 👂</h1>
        <div className="mx-auto mt-6 max-w-56">
          <Stat value={`${avg}%`} label="words decoded" color="lime" tilt={-1.5} />
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <ButtonLink href="/" color="paper">🎯 Today</ButtonLink>
          <Button color="lime" onClick={() => window.location.reload()}>
            ▶ again
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl">
      <DoodleField set={EMOJI_SETS.dictation} count={6} />
      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="font-display font-semibold text-ink-soft hover:text-ink">
          ← quit
        </Link>
        <div className="flex items-center gap-3">
          <label className="font-display flex items-center gap-1 text-xs font-semibold">
            speed
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="card-pop rounded-lg bg-paper px-1.5 py-0.5"
            >
              <option value={0.8}>slow</option>
              <option value={1.0}>natural</option>
              <option value={1.15}>fast</option>
            </select>
          </label>
          <span className="font-display font-bold">
            {idx + 1}<span className="text-ink-soft">/{sentences.length}</span>
          </span>
        </div>
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={play}
          className="btn-pop font-display h-28 w-28 rounded-full bg-limey text-5xl"
          title="play"
        >
          {plays === 0 ? "▶" : "↻"}
        </button>
        <p className="font-display mt-3 text-sm font-semibold text-ink-soft">
          {plays === 0 ? "listen, then type what you hear" : `played ×${plays}`}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!checked ? (
          <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
            <input
              ref={inputRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.repeat && answer.trim() !== "") check();
              }}
              placeholder="type what you heard…"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-2xl border-2 border-ink bg-paper px-4 py-3 text-xl outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
            />
            <AccentBar lang={accentLang} inputRef={inputRef} value={answer} onChange={setAnswer} />
            <Button color="lime" className="mt-4 w-full" onClick={check} disabled={answer.trim() === ""}>
              check ⏎
            </Button>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-8">
            <Card color="paper" className="p-5">
              <div className="font-display text-xs font-bold uppercase tracking-wide text-ink-soft">you heard:</div>
              <p className="font-display mt-2 text-2xl leading-relaxed">
                {diff().map((w, i) => (
                  <span
                    key={i}
                    className={
                      w.ok ? "text-limey-deep" : "rounded-md border-2 border-ink bg-blush px-1 text-ink"
                    }
                  >
                    {w.word}{" "}
                  </span>
                ))}
              </p>
              <div className="mt-2 text-sm text-ink-soft">you typed: {answer}</div>
            </Card>
            <Button color="sun" className="mt-4 w-full" onClick={next}>
              next ⏎
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
