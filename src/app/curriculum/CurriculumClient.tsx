"use client";

/**
 * Curriculum workshop — generate the next tranche, review every item
 * before it enters your SRS. Nothing unreviewed ever reaches drills.
 */
import { useState } from "react";
import Link from "next/link";
import { Button, Card, Sticker } from "@/components/ui";
import { Emoji, DoodleField, EMOJI_SETS } from "@/components/Doodles";
import { sfx } from "@/lib/sfx";

interface PendingItem {
  id: number;
  type: string;
  lemma: string | null;
  tense: string | null;
  person: string | null;
  form: string;
  en: string;
  prompts: { promptType: string; promptText: string; expected: string }[];
}

interface State {
  newCount: number;
  pendingCount: number;
  pastUnlocked: boolean;
  pastStarted: boolean;
  staleCount: number;
}

export default function CurriculumClient({
  langName,
  flag,
  initialState,
  initialPending,
  provider,
}: {
  langName: string;
  flag: string;
  initialState: State;
  initialPending: PendingItem[];
  provider: string;
}) {
  const [state, setState] = useState(initialState);
  const [pending, setPending] = useState(initialPending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGen, setLastGen] = useState<{ inserted: number; dropped: { form: string; reason: string }[] } | null>(null);
  const [freshMsg, setFreshMsg] = useState<string | null>(null);

  const generate = async (past: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: past ? "generate_past" : "generate" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "failed");
      setState(d.state);
      setLastGen(d.result);
      window.location.reload(); // refetch pending list server-side
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
      setBusy(false);
    }
  };

  const review = async (ids: number[], decision: "approve" | "reject") => {
    const res = await fetch("/api/curriculum", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review", ids, decision }),
    });
    const d = await res.json();
    if (res.ok) {
      setPending((p) => p.filter((i) => !ids.includes(i.id)));
      setState(d.state);
      if (decision === "approve") sfx.correct();
    }
  };

  return (
    <div className="relative mx-auto max-w-3xl">
      <DoodleField set={EMOJI_SETS.review} count={6} />
      <Link href="/" className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
        ← today
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-4xl font-bold">🏭 Curriculum workshop {flag}</h1>
        {provider === "mock" && (
          <Sticker color="sun" tilt={-2} className="normal-case">
            mock LLM — tiny fixture tranches only
          </Sticker>
        )}
      </div>
      <p className="mt-1 text-ink-soft">
        Generate the next {langName} tranche, then review every item. Only approved items enter your
        drills.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card color="sun" tilt={-1} className="p-4">
          <div className="font-display text-3xl font-bold">{state.newCount}</div>
          <div className="text-xs text-ink-soft">unseen items left</div>
        </Card>
        <Card color="grape" tilt={0.8} className="p-4">
          <div className="font-display text-3xl font-bold">{state.pendingCount}</div>
          <div className="text-xs text-ink-soft">awaiting your review</div>
        </Card>
        <Card color={state.pastUnlocked ? "lime" : "paper"} tilt={-0.6} className="p-4">
          <div className="font-display text-xl font-bold">
            {state.pastStarted ? "✓ unlocked" : state.pastUnlocked ? "🔓 ready!" : "🔒 locked"}
          </div>
          <div className="text-xs text-ink-soft">
            past tense {state.pastUnlocked ? "" : "(master 60% of present first)"}
          </div>
        </Card>
        <Card color={state.staleCount > 0 ? "sun" : "paper"} tilt={0.6} className="p-4">
          <div className="font-display text-3xl font-bold">{state.staleCount}</div>
          <div className="text-xs text-ink-soft">over-practiced sentences</div>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button color="coral" onClick={() => generate(false)} disabled={busy}>
          {busy ? "authoring…" : "⚒️ generate next tranche"}
        </Button>
        {state.pastUnlocked && (
          <Button color="lime" onClick={() => generate(true)} disabled={busy}>
            {busy ? "authoring…" : "🕰 generate PAST TENSE"}
          </Button>
        )}
        {state.staleCount > 0 && (
          <Button
            color="sky"
            onClick={async () => {
              setBusy(true);
              setFreshMsg(null);
              const res = await fetch("/api/curriculum", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "freshen" }),
              });
              const d = await res.json();
              if (res.ok) {
                setState(d.state);
                setFreshMsg(`added ${d.result.added} fresh sentence frames (${d.result.skipped} skipped)`);
              } else setError(d.error ?? "failed");
              setBusy(false);
            }}
            disabled={busy}
          >
            {busy ? "writing…" : "♻️ freshen stale prompts"}
          </Button>
        )}
      </div>
      {freshMsg && (
        <Card color="mint" className="mt-4 p-3 text-sm font-medium">
          {freshMsg} — new frames enter rotation automatically.
        </Card>
      )}

      {error && (
        <Card color="blush" className="mt-4 p-3 text-sm font-medium">
          {error}
        </Card>
      )}
      {lastGen && lastGen.dropped.length > 0 && (
        <Card color="paper" className="mt-4 p-3 text-xs text-ink-soft">
          validator dropped {lastGen.dropped.length}: {lastGen.dropped.map((d) => `${d.form} (${d.reason})`).join(" · ")}
        </Card>
      )}

      {pending.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Review queue</h2>
            <div className="flex gap-2">
              <Button color="lime" size="sm" onClick={() => review(pending.map((p) => p.id), "approve")}>
                ✓ approve all
              </Button>
              <Button color="blush" size="sm" onClick={() => review(pending.map((p) => p.id), "reject")}>
                ✗ reject all
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {pending.map((it, i) => (
              <Card key={it.id} color="paper" tilt={i % 2 === 0 ? -0.4 : 0.4} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xl font-bold">{it.form}</span>
                  <span className="text-sm text-ink-soft">{it.en}</span>
                  <Sticker color={it.type === "verb_form" ? "sky" : "mint"} tilt={-2}>
                    {it.type === "verb_form" ? `${it.lemma} · ${it.tense} · ${it.person}` : "chunk"}
                  </Sticker>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {it.prompts.map((p, j) => (
                    <li key={j} className="text-ink-soft">
                      <span className="font-semibold text-ink">{p.promptType}:</span> {p.promptText}{" "}
                      <span className="text-limey-deep">→ {p.expected}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button color="lime" size="sm" onClick={() => review([it.id], "approve")}>
                    ✓ approve
                  </Button>
                  <Button color="blush" size="sm" onClick={() => review([it.id], "reject")}>
                    ✗ reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && state.pendingCount === 0 && (
        <div className="mt-10 text-center">
          <Emoji size={48} animation="floaty">🏭</Emoji>
          <p className="mt-3 text-ink-soft">Nothing awaiting review. Generate a tranche when you run low.</p>
        </div>
      )}
    </div>
  );
}
