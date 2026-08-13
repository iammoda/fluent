"use client";

/**
 * Inline input logger — the quest block for external comprehensible input.
 * Expands in place: quick minute buttons + curated source list.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Sticker } from "@/components/ui";
import { sfx } from "@/lib/sfx";
import type { QuestBlock } from "@/lib/today";
import type { InputSource } from "@/lib/input-sources";

export default function InputBlock({
  block,
  sources,
  tilt,
}: {
  block: QuestBlock;
  sources: InputSource[];
  tilt: number;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const log = async (minutes: number) => {
    setBusy(true);
    const res = await fetch("/api/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    if (res.ok) {
      sfx.correct();
      router.refresh();
    }
    setBusy(false);
  };

  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="group block w-full text-left">
        <Card
          color={block.color}
          tilt={tilt}
          className={`flex items-center gap-4 p-4 transition-transform group-hover:rotate-0 group-hover:scale-[1.015] ${
            block.done ? "opacity-70" : ""
          }`}
        >
          <span className="font-display grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-paper text-3xl shadow-[2.5px_2.5px_0_0_#1a1a1a]">
            {block.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-xl font-bold">{block.title}</div>
            <div className="truncate text-sm text-ink-soft">{block.sub}</div>
          </div>
          {block.done ? (
            <Sticker color="lime" tilt={-6}>✓ done!</Sticker>
          ) : (
            <span className="font-display text-sm font-semibold text-ink-soft">
              ~{block.minutes} min {open ? "▴" : "▾"}
            </span>
          )}
        </Card>
      </button>

      {open && (
        <Card color="paper" className="mt-2 p-4">
          <div className="font-display text-sm font-bold">log what you watched/listened/read:</div>
          <div className="mt-2 flex gap-2">
            {[10, 20, 30, 45].map((m) => (
              <button
                key={m}
                onClick={() => log(m)}
                disabled={busy}
                className="btn-pop font-display rounded-xl bg-mint px-3 py-1.5 text-sm font-bold disabled:opacity-40"
              >
                +{m} min
              </button>
            ))}
          </div>
          <div className="font-display mt-4 text-sm font-bold">good places to spend it:</div>
          <ul className="mt-1.5 space-y-1">
            {sources.map((s) => (
              <li key={s.name} className="text-sm">
                <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold underline decoration-dotted hover:text-limey-deep">
                  {s.name}
                </a>{" "}
                <span className="text-ink-soft">— {s.what}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            Rule of thumb: content where you understand ~80–90% without straining. Volume beats
            difficulty.
          </p>
        </Card>
      )}
    </div>
  );
}
