"use client";

/**
 * Islands of fluency (Shekhtman) — personal monologues drilled to automatic.
 * Mic-free by design: rebuild (typed cloze) + timed read-aloud rounds.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { speak, stopSpeaking } from "@/app/session/useSpeech";
import { normLoose } from "@/lib/grading";
import { sfx } from "@/lib/sfx";
import { Button, Card, Sticker } from "@/components/ui";
import { Emoji, DoodleField, EMOJI_SETS } from "@/components/Doodles";

interface Island {
  id: number;
  title: string;
  enDraft: string;
  text: string;
}

const ROUNDS = [60, 45, 30];

/* ------------------------------------------------ rebuild (cloze) drill */
function RebuildDrill({ island, tts, onExit }: { island: Island; tts: string; onExit: () => void }) {
  const sentences = island.text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [scores, setScores] = useState<number[]>([]);

  const sentence = sentences[idx];
  const done = idx >= sentences.length;

  // blank every ~3rd content word (>3 chars)
  const tokens = sentence ? sentence.split(/(\s+)/) : [];
  const blanks: number[] = [];
  let contentCount = 0;
  tokens.forEach((t, i) => {
    if (/\S{4,}/.test(t)) {
      contentCount++;
      if (contentCount % 3 === 1) blanks.push(i);
    }
  });

  const check = () => {
    const ok = blanks.filter((b) => normLoose(answers[b] ?? "") === normLoose(tokens[b])).length;
    const score = blanks.length > 0 ? ok / blanks.length : 1;
    if (score >= 0.8) sfx.correct();
    else sfx.wrong();
    setScores((s) => [...s, score]);
    setChecked(true);
  };

  if (done) {
    const avg = Math.round((scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length)) * 100);
    return (
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <h2 className="font-display text-3xl font-bold">ISLAND REBUILT 🏝️</h2>
        <div className="mx-auto mt-4 w-fit">
          <Card color="lime" tilt={-1} className="px-8 py-4">
            <div className="font-display text-4xl font-bold">{avg}%</div>
            <div className="text-xs">chunks recalled</div>
          </Card>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Button color="paper" onClick={onExit}>← islands</Button>
          <Button color="sky" onClick={() => { setIdx(0); setScores([]); setAnswers({}); setChecked(false); }}>
            ▶ again
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <button onClick={onExit} className="font-display font-semibold text-ink-soft hover:text-ink">
          ← back
        </button>
        <span className="font-display font-bold">
          {idx + 1}<span className="text-ink-soft">/{sentences.length}</span>
        </span>
      </div>
      <Card color="paper" className="mt-4 p-5">
        <button onClick={() => speak(sentence, { lang: tts })} className="text-sm opacity-60 hover:opacity-100">
          🔊 hear it
        </button>
        <p className="font-display mt-3 text-2xl leading-loose">
          {tokens.map((t, i) =>
            blanks.includes(i) ? (
              <input
                key={i}
                value={answers[i] ?? ""}
                onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                size={Math.max(4, t.length)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={`mx-0.5 rounded-lg border-2 px-1 text-center text-xl outline-none ${
                  checked
                    ? normLoose(answers[i] ?? "") === normLoose(t)
                      ? "border-limey-deep bg-limey/40"
                      : "border-coral-deep bg-blush/60"
                    : "border-ink bg-cream"
                }`}
              />
            ) : (
              <span key={i}>{t}</span>
            ),
          )}
        </p>
        {checked && (
          <p className="mt-2 text-sm text-ink-soft">{sentence}</p>
        )}
        <div className="mt-4 flex justify-end">
          {!checked ? (
            <Button color="lime" onClick={check}>check</Button>
          ) : (
            <Button color="sun" onClick={() => { setIdx((i) => i + 1); setChecked(false); }}>
              next ⏎
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------ timed read-aloud */
function ReadAloud({ island, tts, onExit }: { island: Island; tts: string; onExit: () => void }) {
  const [round, setRound] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUNDS[0]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState<boolean[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setSecondsLeft(ROUNDS[round]);
    setRunning(true);
    timer.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          setRunning(false);
          sfx.tick();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const record = (madeIt: boolean) => {
    if (timer.current) clearInterval(timer.current);
    setRunning(false);
    setFinished((f) => [...f, madeIt]);
    if (madeIt) sfx.correct();
    if (round + 1 < ROUNDS.length) {
      setRound((r) => r + 1);
      setSecondsLeft(ROUNDS[round + 1]);
    }
  };

  const allDone = finished.length >= ROUNDS.length;

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <button onClick={onExit} className="font-display font-semibold text-ink-soft hover:text-ink">
          ← back
        </button>
        <span className="font-display font-bold">
          round {Math.min(round + 1, ROUNDS.length)}<span className="text-ink-soft">/{ROUNDS.length}</span> · {ROUNDS[Math.min(round, ROUNDS.length - 1)]}s
        </span>
      </div>

      {allDone ? (
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-8 text-center">
          <h2 className="font-display text-3xl font-bold">ISLAND DRILLED 🗿</h2>
          <p className="mt-2 text-ink-soft">
            {finished.filter(Boolean).length}/{ROUNDS.length} rounds completed in time. Same island again
            tomorrow — automaticity comes from repetition.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button color="paper" onClick={onExit}>← islands</Button>
            <Button color="sky" onClick={() => { setRound(0); setFinished([]); setSecondsLeft(ROUNDS[0]); }}>
              ▶ again
            </Button>
          </div>
        </motion.div>
      ) : (
        <>
          <Card color="paper" className="mt-4 p-5">
            <div className="mb-2 flex items-center gap-2">
              <button onClick={() => speak(island.text, { lang: tts })} className="text-sm opacity-60 hover:opacity-100">
                🔊 model
              </button>
              <button onClick={stopSpeaking} className="text-sm opacity-60 hover:opacity-100">■</button>
            </div>
            <p className="font-display text-2xl leading-relaxed">{island.text}</p>
          </Card>
          <div className="mt-5 text-center">
            {!running ? (
              <Button color="sky" size="lg" onClick={start}>
                🗣 read it aloud — {ROUNDS[round]}s
              </Button>
            ) : (
              <>
                <div className={`font-display text-7xl font-bold tabular-nums ${secondsLeft <= 5 ? "text-coral-deep" : ""}`}>
                  {secondsLeft}
                </div>
                <p className="mt-1 text-sm text-ink-soft">speak the whole island out loud — no mumbling!</p>
              </>
            )}
            {(running || secondsLeft === 0) && (
              <div className="mt-4 flex justify-center gap-3">
                <Button color="lime" size="sm" onClick={() => record(true)}>✓ finished it</Button>
                <Button color="blush" size="sm" onClick={() => record(false)}>didn&apos;t make it</Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------ main */
export default function IslandsClient({
  langName,
  flag,
  tts,
  provider,
}: {
  langName: string;
  flag: string;
  tts: string;
  provider: string;
}) {
  const [list, setList] = useState<Island[]>([]);
  const [mode, setMode] = useState<{ kind: "list" } | { kind: "edit"; island?: Island } | { kind: "rebuild"; island: Island } | { kind: "readaloud"; island: Island }>({ kind: "list" });
  const [title, setTitle] = useState("");
  const [enDraft, setEnDraft] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/islands")
      .then((r) => r.json())
      .then((d) => setList(d.islands ?? []));
  useEffect(() => {
    load();
  }, []);

  const writeIt = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/islands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", title, enDraft }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setText(d.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
    setBusy(false);
  };

  const save = async () => {
    setBusy(true);
    const id = mode.kind === "edit" ? mode.island?.id : undefined;
    const res = await fetch("/api/islands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", id, title, enDraft, text }),
    });
    if (res.ok) {
      sfx.correct();
      setMode({ kind: "list" });
      setTitle("");
      setEnDraft("");
      setText("");
      load();
    }
    setBusy(false);
  };

  const remove = async (id: number) => {
    await fetch("/api/islands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    load();
  };

  if (mode.kind === "rebuild") return <div className="mx-auto max-w-2xl"><RebuildDrill island={mode.island} tts={tts} onExit={() => setMode({ kind: "list" })} /></div>;
  if (mode.kind === "readaloud") return <div className="mx-auto max-w-2xl"><ReadAloud island={mode.island} tts={tts} onExit={() => setMode({ kind: "list" })} /></div>;

  if (mode.kind === "edit") {
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => setMode({ kind: "list" })} className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
          ← islands
        </button>
        <h1 className="font-display mt-2 text-3xl font-bold">{mode.island ? "Edit island" : "New island"}</h1>
        <Card color="paper" className="mt-4 p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='title — e.g. "Who I am", "My work", "My weekend"'
            className="font-display w-full rounded-2xl border-2 border-ink bg-cream px-4 py-2.5 text-lg font-semibold outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
          />
          <textarea
            value={enDraft}
            onChange={(e) => setEnDraft(e.target.value)}
            rows={4}
            placeholder="draft it in English — what do you want to be able to say fluently?"
            className="mt-2 w-full rounded-2xl border-2 border-ink bg-cream px-4 py-2.5 outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
          />
          <div className="mt-2 flex justify-end">
            <Button color="coral" size="sm" onClick={writeIt} disabled={busy || !title.trim() || !enDraft.trim()}>
              {busy ? "writing…" : `✍️ write it in ${langName}`}
            </Button>
          </div>
          {text && (
            <>
              <div className="font-display mt-4 text-xs font-bold uppercase tracking-wide text-ink-soft">
                your island — edit freely
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="font-display mt-1 w-full rounded-2xl border-2 border-ink bg-mint/40 px-4 py-2.5 text-lg outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button color="lime" size="sm" onClick={save} disabled={busy || !text.trim()}>
                  ✓ save island
                </Button>
              </div>
            </>
          )}
        </Card>
        {error && (
          <Card color="blush" className="mt-3 p-3 text-sm font-medium">
            {error}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl">
      <DoodleField set={EMOJI_SETS.retell} count={5} />
      <Link href="/" className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
        ← today
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-4xl font-bold">🏝️ Islands {flag}</h1>
        {provider === "mock" && (
          <Sticker color="sun" tilt={-2} className="normal-case">mock LLM — sample island only</Sticker>
        )}
      </div>
      <p className="mt-1 text-ink-soft">
        Personal monologues — who you are, your work, your opinions — drilled until automatic. Safe
        harbors for real conversations. Deploy them in Babbel.
      </p>

      <div className="mt-5">
        <Button color="coral" onClick={() => { setMode({ kind: "edit" }); setTitle(""); setEnDraft(""); setText(""); }}>
          + new island
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="mt-10 text-center">
          <Emoji size={52} animation="floaty">🏝️</Emoji>
          <p className="mt-3 text-ink-soft">No islands yet. Start with &ldquo;Who I am&rdquo; — you&apos;ll use it in every conversation forever.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {list.map((isl, i) => (
            <Card key={isl.id} color={i % 2 === 0 ? "sky" : "mint"} tilt={i % 2 === 0 ? -0.6 : 0.6} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-bold">{isl.title}</span>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => { setMode({ kind: "edit", island: isl }); setTitle(isl.title); setEnDraft(isl.enDraft); setText(isl.text); }}
                    className="underline decoration-dotted"
                  >
                    edit
                  </button>
                  <button onClick={() => remove(isl.id)} className="text-ink-soft hover:text-coral-deep">✕</button>
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{isl.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button color="grape" size="sm" onClick={() => setMode({ kind: "rebuild", island: isl })}>
                  🧩 rebuild
                </Button>
                <Button color="sun" size="sm" onClick={() => setMode({ kind: "readaloud", island: isl })}>
                  ⏱ timed read-aloud
                </Button>
                <Button color="paper" size="sm" onClick={() => speak(isl.text, { lang: tts })}>
                  🔊 listen
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
