"use client";

/**
 * Post-Babbel debrief — Swain's "noticing the gap": the things you WANTED
 * to say but couldn't are your highest-value learning data. Capture up to
 * three; each becomes a drill that jumps tomorrow's queue.
 */
import { useState } from "react";
import { Button, Card, Sticker } from "@/components/ui";
import { sfx } from "@/lib/sfx";

interface Draft {
  canonical: string;
  en: string;
  prompts: { promptType: string; promptText: string; expected: string; accepted: string[] }[];
}

export default function DebriefCapture({ langName }: { langName: string }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const makeDraft = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lexicon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", mode: "debrief", text, note: "post-conversation debrief" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setDraft(d.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
    setBusy(false);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const res = await fetch("/api/lexicon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", draft }),
    });
    const d = await res.json();
    if (res.ok) {
      sfx.correct();
      setSaved((s) => [...s, d.duplicate ? `${draft.canonical} (already in deck)` : draft.canonical]);
      setDraft(null);
      setText("");
    }
    setBusy(false);
  };

  return (
    <Card color="grape" tilt={-0.5} className="p-4">
      <h2 className="font-display text-xl font-bold">🎙 after your chat</h2>
      <p className="mt-1 text-sm text-ink-soft">
        What did you <em>want</em> to say but couldn&apos;t? That gap is gold — capture it and
        it&apos;s a drill tomorrow.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) makeDraft();
          }}
          placeholder='in English — e.g. "I wanted to ask for the check"'
          className="flex-1 rounded-2xl border-2 border-ink bg-paper px-3 py-2 text-sm outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
        />
        <Button color="sun" size="sm" onClick={makeDraft} disabled={busy || !text.trim()}>
          {busy && !draft ? "…" : `→ ${langName}`}
        </Button>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-coral-deep">{error}</p>}

      {draft && (
        <div className="card-pop mt-3 rounded-2xl bg-paper p-3">
          <input
            value={draft.canonical}
            onChange={(e) => setDraft({ ...draft, canonical: e.target.value })}
            className="font-display w-full rounded-xl border-2 border-ink bg-cream px-2 py-1 text-lg font-bold outline-none"
          />
          <input
            value={draft.en}
            onChange={(e) => setDraft({ ...draft, en: e.target.value })}
            className="mt-1.5 w-full rounded-xl border-2 border-ink bg-cream px-2 py-1 text-sm outline-none"
          />
          <div className="mt-2 flex gap-2">
            <Button color="lime" size="sm" onClick={save} disabled={busy}>
              ✓ drill it tomorrow
            </Button>
            <Button color="paper" size="sm" onClick={() => setDraft(null)}>
              discard
            </Button>
          </div>
        </div>
      )}

      {saved.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {saved.map((s, i) => (
            <Sticker key={i} color="lime" tilt={i % 2 === 0 ? -2 : 2} className="normal-case">
              ✓ {s}
            </Sticker>
          ))}
        </div>
      )}
    </Card>
  );
}
