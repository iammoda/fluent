"use client";

/**
 * Scenario writing task — arcade edition. Typed pushed output;
 * errors feed the weak-spot engine.
 */
import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ERROR_LABELS, type ErrorType } from "@/lib/taxonomy";
import { sfx } from "@/lib/sfx";
import AccentBar from "@/components/AccentBar";
import { Button, Card, Sticker } from "@/components/ui";
import { Emoji, DoodleField, EMOJI_SETS } from "@/components/Doodles";

interface Task {
  id: number;
  scenario: string;
  targets: string; // JSON string[]
}

interface Feedback {
  feedback_en: string;
  targets_used: { target: string; used: boolean }[];
  errors: { quote: string; correction: string; error_type: string; explanation: string }[];
}

export default function WriteRunner({
  langName,
  provider,
  accentLang = "es",
  mode = "scenario",
}: {
  langName: string;
  provider: string;
  accentLang?: string;
  mode?: "scenario" | "boss";
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [response, setResponse] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setFeedback(null);
    setResponse("");
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", kind: mode }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setTask(d.task);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
    setBusy(false);
  };

  const grade = async () => {
    if (!task || response.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grade", taskId: task.id, response }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setFeedback(d.feedback);
      const usedCount = (d.feedback?.targets_used ?? []).filter((u: { used: boolean }) => u.used).length;
      if (usedCount >= 2 && (d.feedback?.errors ?? []).length === 0) sfx.complete();
      else sfx.correct();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
    setBusy(false);
  };

  const targets: string[] = task ? JSON.parse(task.targets) : [];

  return (
    <div className="relative mx-auto max-w-2xl">
      <DoodleField set={EMOJI_SETS.write} count={6} />
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
          ← today
        </Link>
        {provider === "mock" && (
          <Sticker color="sun" tilt={-2} className="normal-case">
            mock LLM — real error analysis needs an API key
          </Sticker>
        )}
      </div>

      <h1 className="font-display mt-4 text-4xl font-bold">
        {mode === "boss" ? "👾 WEEKLY BOSS" : "✍️ Scenario"}
      </h1>
      <p className="mt-1 text-ink-soft">
        {mode === "boss"
          ? `The big one: 5–6 ${langName} sentences mixing everything from your week. Beat it and the confetti is extra.`
          : `Write 2–4 ${langName} sentences using the target chunks. Errors feed your weak spots; deployed targets count as production evidence.`}
      </p>

      {!task ? (
        <div className="mt-8 text-center">
          <Emoji size={56} animation="floaty">💌</Emoji>
          <div className="mt-4">
            <Button color="grape" size="lg" onClick={generate} disabled={busy}>
              {busy ? "creating…" : "deal me a scenario"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Card color="grape" tilt={-0.6} className="mt-6 p-5">
            <p className="font-display text-xl font-semibold">{task.scenario}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {targets.map((t) => {
                const used = feedback?.targets_used.find((u) => u.target === t)?.used;
                return (
                  <Sticker
                    key={t}
                    color={used === true ? "lime" : used === false ? "blush" : "paper"}
                    tilt={-2}
                    className="normal-case"
                  >
                    {used === true ? "✓ " : ""}
                    {t}
                  </Sticker>
                );
              })}
            </div>
          </Card>

          {!feedback ? (
            <div className="mt-4">
              <textarea
                ref={textRef}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                placeholder={`write your ${langName} here…`}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-2xl border-2 border-ink bg-paper px-4 py-3 text-lg outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
              />
              <AccentBar lang={accentLang} inputRef={textRef} value={response} onChange={setResponse} />
              <div className="mt-4 flex justify-end gap-3">
                <Button color="paper" size="sm" onClick={generate} disabled={busy}>
                  different scenario
                </Button>
                <Button color="lime" onClick={grade} disabled={busy || response.trim() === ""}>
                  {busy ? "checking…" : "check my writing"}
                </Button>
              </div>
            </div>
          ) : (
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4">
              <Card color="paper" className="p-4">
                <p className="whitespace-pre-wrap font-medium">{response}</p>
              </Card>
              <Card color="mint" tilt={0.6} className="mt-3 p-4">
                <p className="font-medium">{feedback.feedback_en}</p>
              </Card>
              {feedback.errors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                    corrections → your error dossier
                  </h2>
                  {feedback.errors.map((e, i) => (
                    <Card key={i} color="blush" tilt={i % 2 === 0 ? -0.5 : 0.5} className="p-3">
                      <div className="font-display text-lg">
                        <span className="line-through opacity-60">{e.quote}</span>
                        <span className="mx-2">→</span>
                        <span className="font-bold text-limey-deep">{e.correction}</span>
                      </div>
                      <div className="mt-1 text-sm text-ink-soft">{e.explanation}</div>
                      <Link href={`/lesson/${e.error_type}`} className="mt-2 inline-block">
                        <Sticker color="paper" tilt={-2} className="normal-case">
                          {ERROR_LABELS[e.error_type as ErrorType] ?? e.error_type} → lesson
                        </Sticker>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
              <Button color="grape" className="mt-6 w-full" onClick={generate} disabled={busy}>
                next scenario ▶
              </Button>
            </motion.div>
          )}
        </>
      )}

      {error && (
        <Card color="blush" className="mt-4 p-3 text-sm font-medium">
          {error}
        </Card>
      )}
    </div>
  );
}
