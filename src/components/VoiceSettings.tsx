"use client";

/**
 * Voice settings popover — pick your exact voice per language from what's
 * installed, set a global speech rate, and see whether OpenAI TTS is active.
 */
import { useEffect, useRef, useState } from "react";
import {
  loadVoices,
  pickVoice,
  voiceQuality,
  getVoicePref,
  setVoicePref,
  getRatePref,
  setRatePref,
  speak,
} from "@/app/session/useSpeech";
import { LANG_META, type Lang } from "@/lib/lang-shared";

const SAMPLES: Record<Lang, string> = {
  es: "Hola, ¿qué tal? Tengo que practicar mi español.",
  fr: "Salut ! Je dois pratiquer mon français.",
};

function VoiceRow({ lang, voices }: { lang: Lang; voices: SpeechSynthesisVoice[] }) {
  const locale = LANG_META[lang].tts;
  const [pref, setPref] = useState<string | null>(null);
  useEffect(() => setPref(getVoicePref(locale)), [locale]);

  const options = voices
    .filter((v) => v.lang.replace("_", "-").startsWith(lang))
    .sort((a, b) => voiceQuality(b) - voiceQuality(a));
  const auto = pickVoice(voices, locale);

  return (
    <div className="mt-3">
      <label className="font-display flex items-center justify-between text-sm font-bold">
        <span>
          {LANG_META[lang].flag} {LANG_META[lang].name} voice
        </span>
        <button
          type="button"
          onClick={() => speak(SAMPLES[lang], { lang: locale })}
          className="rounded-lg border-2 border-ink bg-limey px-2 py-0.5 text-xs shadow-[2px_2px_0_0_#1a1a1a] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none"
        >
          🔊 test
        </button>
      </label>
      <select
        value={pref ?? ""}
        onChange={(e) => {
          const v = e.target.value || null;
          setPref(v);
          setVoicePref(locale, v);
        }}
        className="mt-1.5 w-full rounded-xl border-2 border-ink bg-cream px-2 py-1.5 text-sm outline-none"
      >
        <option value="">
          auto — {auto ? `${auto.name}${voiceQuality(auto) >= 3 ? " ★" : ""}` : "best available"}
        </option>
        {options.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name}
            {voiceQuality(v) >= 3 ? " ★" : ""} ({v.lang})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function VoiceSettings() {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [rate, setRate] = useState(0.95);
  const [serverTts, setServerTts] = useState<boolean | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setRate(getRatePref());
    loadVoices().then(setVoices);
    fetch("/api/tts")
      .then((r) => setServerTts(r.ok))
      .catch(() => setServerTts(false));
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`card-pop rounded-2xl px-3 py-1.5 text-base ${open ? "bg-sun" : "bg-paper"}`}
        title="Voice settings"
      >
        ⚙️
      </button>

      {open && (
        <div className="card-pop absolute right-0 top-full z-50 mt-2 w-80 rounded-3xl bg-paper p-4">
          <div className="font-display text-lg font-bold">Voice settings</div>

          {serverTts === true ? (
            <div className="mt-2 rounded-xl border-2 border-ink bg-mint px-2 py-1.5 text-xs font-semibold">
              ✨ OpenAI TTS active — sentences are synthesized once and cached. Browser voices below
              are the offline fallback.
            </div>
          ) : (
            <div className="mt-2 rounded-xl border-2 border-ink bg-cream px-2 py-1.5 text-xs text-ink-soft">
              Using your Mac&apos;s voices. ★ = enhanced/premium. Add OPENAI_API_KEY in .env.local for
              studio-quality speech.
            </div>
          )}

          <VoiceRow lang="es" voices={voices} />
          <VoiceRow lang="fr" voices={voices} />

          <div className="mt-4">
            <label className="font-display flex items-center justify-between text-sm font-bold">
              <span>speech rate</span>
              <span className="font-mono text-xs">{rate.toFixed(2)}×</span>
            </label>
            <input
              type="range"
              min={0.7}
              max={1.1}
              step={0.05}
              value={rate}
              onChange={(e) => {
                const r = parseFloat(e.target.value);
                setRate(r);
                setRatePref(r);
              }}
              className="mt-1.5 w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] text-ink-soft">
              <span>slower</span>
              <span>natural</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
