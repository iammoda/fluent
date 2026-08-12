"use client";

/** Tap-to-insert special characters, language-aware, caret-preserving. */
import type { RefObject } from "react";

const CHARS: Record<string, string[]> = {
  es: ["á", "é", "í", "ó", "ú", "ü", "ñ", "¿", "¡"],
  fr: ["é", "è", "ê", "à", "â", "ç", "ù", "î", "ô", "œ"],
};

export default function AccentBar({
  lang,
  inputRef,
  value,
  onChange,
}: {
  lang: string;
  inputRef: RefObject<HTMLInputElement | null> | RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  const chars = CHARS[lang] ?? CHARS.es;

  const insert = (ch: string) => {
    const el = inputRef.current;
    if (!el) {
      onChange(value + ch);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ch + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 1, start + 1);
    });
  };

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chars.map((ch) => (
        <button
          key={ch}
          type="button"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()} /* keep input focus */
          onClick={() => insert(ch)}
          className="font-display h-9 min-w-9 rounded-xl border-2 border-ink bg-paper px-2 text-lg font-semibold text-ink shadow-[2px_2px_0_0_#1a1a1a] transition-transform active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none"
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
