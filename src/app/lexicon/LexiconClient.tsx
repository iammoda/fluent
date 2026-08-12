"use client";

/**
 * Personal lexicon — capture anything from real life in 10 seconds.
 * LLM drafts the drill; you approve; it jumps the new-item queue.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Sticker } from "@/components/ui";
import { Emoji, DoodleField, EMOJI_SETS } from "@/components/Doodles";
import { sfx } from "@/lib/sfx";

interface Draft {
  canonical: string;
  en: string;
  prompts: { promptType: string; promptText: string; expected: string; accepted: string[] }[];
}

interface CustomItem {
  id: number;
  es: string;
  en: string;
}

export default function LexiconClient({
  langName,
  flag,
  provider,
}: {
  langName: string;
  flag: string;
  provider: string;
}) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [list, setList] = useState<CustomItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/lexicon")
      .then((r) => r.json())
      .then((d) => setList(d.items ?? []));
  useEffect(() => {
    load();
  }, []);

  const makeDraft = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/lexicon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", text, note }),
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
    if (res.ok) {
      sfx.correct();
      setDraft(null);
      setText("");
      setNote("");
      load();
    } else {
      setError((await res.json()).error ?? "failed");
    }
    setBusy(false);
  };

  const remove = async (id: number) => {
    await fetch("/api/lexicon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", itemId: id }),
    });
    load();
  };

  return (
    <div className="relative mx-auto max-w-2xl">
      <DoodleField set={EMOJI_SETS.write} count={5} />
      <Link href="/" className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
        ← today
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-4xl font-bold">📥 Lexicon {flag}</h1>
        {provider === "mock" && (
          <Sticker color="sun" tilt={-2} className="normal-case">
            mock LLM — you&apos;ll write the gloss yourself
          </Sticker>
        )}
      </div>
      <p className="mt-1 text-ink-soft">
        Heard a {langName} word at dinner or in Babbel? Drop it here — it becomes a drill and jumps
        tomorrow&apos;s queue.
      </p>

      <Card color="paper" className="mt-5 p-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) makeDraft();
          }}
          placeholder={`the ${langName} word or chunk…`}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-2xl border-2 border-ink bg-cream px-4 py-2.5 text-lg outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="where/how you heard it (optional — helps the gloss)"
          className="mt-2 w-full rounded-2xl border-2 border-ink bg-cream px-4 py-2 text-sm outline-none focus:shadow-[3px_3px_0_0_#1a1a1a]"
        />
        <div className="mt-3 flex justify-end">
          <Button color="coral" onClick={makeDraft} disabled={busy || !text.trim()}>
            {busy ? "drafting…" : "draft the drill →"}
          </Button>
        </div>
      </Card>

      {error && (
        <Card color="blush" className="mt-3 p-3 text-sm font-medium">
          {error}
        </Card>
      )}

      {draft && (
        <Card color="mint" tilt={-0.6} className="mt-4 p-4">
          <div className="font-display text-xs font-bold uppercase tracking-wide text-ink-soft">preview — edit before saving</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={draft.canonical}
              onChange={(e) => setDraft({ ...draft, canonical: e.target.value })}
              className="font-display flex-1 rounded-xl border-2 border-ink bg-paper px-2 py-1 text-xl font-bold outline-none"
            />
            <input
              value={draft.en}
              onChange={(e) => setDraft({ ...draft, en: e.target.value })}
              className="flex-1 rounded-xl border-2 border-ink bg-paper px-2 py-1 text-sm outline-none"
              placeholder="English gloss"
            />
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {draft.prompts.map((p, i) => (
              <li key={i} className="text-ink-soft">
                {p.promptText} <span className="text-limey-deep">→ {p.expected}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button color="lime" size="sm" onClick={save} disabled={busy}>
              ✓ save to my deck
            </Button>
            <Button color="paper" size="sm" onClick={() => setDraft(null)}>
              discard
            </Button>
          </div>
        </Card>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">your captures ({list.length})</h2>
        {list.length === 0 ? (
          <div className="mt-4 text-center">
            <Emoji size={44} animation="floaty">🫙</Emoji>
            <p className="mt-2 text-sm text-ink-soft">empty jar — capture your first word</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {list.map((it) => (
              <Card key={it.id} color="paper" className="flex items-center gap-3 p-3">
                <span className="font-display text-lg font-bold">{it.es}</span>
                <span className="flex-1 truncate text-sm text-ink-soft">{it.en}</span>
                <button
                  onClick={() => remove(it.id)}
                  className="text-sm text-ink-soft hover:text-coral-deep"
                  title="delete"
                >
                  ✕
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
