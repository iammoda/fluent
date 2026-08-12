"use client";

/** CEFR can-do map — honest self-assessment, a visible path to "conversational". */
import { useState } from "react";
import Link from "next/link";
import { CANDOS, LEVEL_LABEL } from "@/lib/cando";
import { Card, ProgressBar } from "@/components/ui";
import { Emoji, DoodleField, EMOJI_SETS } from "@/components/Doodles";
import { sfx } from "@/lib/sfx";

export default function GoalsClient({
  langName,
  flag,
  initialChecked,
}: {
  langName: string;
  flag: string;
  initialChecked: string[];
}) {
  const [checked, setChecked] = useState(new Set(initialChecked));

  const toggle = async (key: string) => {
    const res = await fetch("/api/cando", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    const d = await res.json();
    setChecked((prev) => {
      const next = new Set(prev);
      if (d.checked) {
        next.add(key);
        sfx.correct();
      } else next.delete(key);
      return next;
    });
  };

  const levels = ["A1", "A2", "B1"] as const;

  return (
    <div className="relative mx-auto max-w-2xl">
      <DoodleField set={EMOJI_SETS.stats} count={5} />
      <Link href="/" className="font-display text-sm font-semibold text-ink-soft hover:text-ink">
        ← today
      </Link>
      <h1 className="font-display mt-2 text-4xl font-bold">🗺️ The map to conversational {flag}</h1>
      <p className="mt-1 text-ink-soft">
        Honest self-assessment: check a box only when you can do it <em>in a real moment</em>, not
        just in a drill. B1 is the &ldquo;conversational&rdquo; you asked for.
      </p>

      {levels.map((level) => {
        const rows = CANDOS.filter((c) => c.level === level);
        const done = rows.filter((c) => checked.has(c.key)).length;
        return (
          <section key={level} className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">{LEVEL_LABEL[level]}</h2>
              <span className="font-display text-sm font-bold text-ink-soft">
                {done}/{rows.length}
              </span>
            </div>
            <ProgressBar value={done / rows.length} color={level === "B1" ? "grape" : level === "A2" ? "sky" : "lime"} />
            <Card color="paper" className="mt-3 divide-y-2 divide-ink/5 p-2">
              {rows.map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(c.key)}
                    onChange={() => toggle(c.key)}
                    className="h-5 w-5 accent-[var(--accent)]"
                  />
                  <span className={checked.has(c.key) ? "text-ink-soft line-through" : ""}>
                    {c.text}
                  </span>
                  {checked.has(c.key) && <Emoji size={16} animation="none">✅</Emoji>}
                </label>
              ))}
            </Card>
          </section>
        );
      })}

      <p className="mt-8 text-center text-sm text-ink-soft">
        All of B1 checked = you&apos;re conversational in {langName}. That&apos;s the win condition. 🏁
      </p>
    </div>
  );
}
