"use client";

/**
 * Web Speech API wrapper for the spoken production gate.
 * Chrome/Edge/Safari support webkitSpeechRecognition; feature-detected,
 * the UI falls back to typed-only when unavailable.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/* Minimal typings — lib.dom doesn't ship SpeechRecognition */
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
}
interface SREvent {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function useSpeech(lang = "es-MX") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef<((transcript: string) => void) | null>(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: SREvent) => {
      let final = "";
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else inter += r[0].transcript;
      }
      if (inter) setInterim(inter);
      if (final) {
        setInterim("");
        onFinalRef.current?.(final.trim());
      }
    };
    rec.onend = () => {
      listeningRef.current = false;
      setListening(false);
      setInterim("");
    };
    rec.onerror = () => {
      listeningRef.current = false;
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    };
  }, [lang]);

  const start = useCallback((onFinal: (transcript: string) => void) => {
    const rec = recRef.current;
    if (!rec || listeningRef.current) return;
    onFinalRef.current = onFinal;
    setInterim("");
    try {
      rec.start();
      listeningRef.current = true;
      setListening(true);
    } catch {
      /* start() throws if already started — ignore */
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
  }, []);

  return { supported, listening, interim, start, stop };
}

/**
 * Continuous dictation for retell telemetry: accumulates final transcripts,
 * auto-restarts when the engine stops on silence, counts words live.
 */
export function useDictation(lang = "es-MX") {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: SREvent) => {
      let final = "";
      let inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript + " ";
        else inter += r[0].transcript;
      }
      if (final) setTranscript((t) => (t + " " + final).trim());
      setInterim(inter);
    };
    rec.onend = () => {
      // Chrome stops on silence — restart while a round is active
      if (activeRef.current) {
        try {
          rec.start();
        } catch {
          activeRef.current = false;
          setActive(false);
        }
      } else {
        setActive(false);
      }
      setInterim("");
    };
    rec.onerror = () => {
      /* onend fires next and handles restart/stop */
    };
    recRef.current = rec;
    return () => {
      activeRef.current = false;
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec || activeRef.current) return;
    setTranscript("");
    setInterim("");
    activeRef.current = true;
    setActive(true);
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
  }, []);

  const words = transcript.split(/\s+/).filter(Boolean).length;

  return { supported, active, transcript, interim, words, start, stop };
}

/* ============================================================
 * Speech output engine
 * Priority: server TTS (/api/tts, OpenAI, cached) → browser voices.
 * Unified queue so single plays, sequences (karaoke), and casts all
 * share cancellation and fallback logic.
 * ============================================================ */

/* ---------- user prefs ---------- */
export function getVoicePref(lang: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`fluent.voice.${lang}`);
}
export function setVoicePref(lang: string, voiceURI: string | null) {
  if (voiceURI) localStorage.setItem(`fluent.voice.${lang}`, voiceURI);
  else localStorage.removeItem(`fluent.voice.${lang}`);
}
export function getRatePref(): number {
  if (typeof window === "undefined") return 0.95;
  const r = parseFloat(localStorage.getItem("fluent.rate") ?? "0.95");
  return Number.isFinite(r) ? r : 0.95;
}
export function setRatePref(r: number) {
  localStorage.setItem("fluent.rate", String(r));
}

/* ---------- browser voice loading & ranking ---------- */
let voicesCache: SpeechSynthesisVoice[] | null = null;

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return resolve([]);
    if (voicesCache && voicesCache.length > 0) return resolve(voicesCache);
    const synth = window.speechSynthesis;
    const now = synth.getVoices();
    if (now.length > 0) {
      voicesCache = now;
      return resolve(now);
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      voicesCache = synth.getVoices();
      resolve(voicesCache);
    };
    synth.addEventListener("voiceschanged", finish, { once: true });
    setTimeout(finish, 1500); // some browsers never fire the event
  });
}

/** quality rank: premium > enhanced > siri > default > compact */
export function voiceQuality(v: SpeechSynthesisVoice): number {
  const u = `${v.voiceURI} ${v.name}`.toLowerCase();
  if (u.includes("premium")) return 4;
  if (u.includes("enhanced")) return 3;
  if (u.includes("siri")) return 2;
  if (u.includes("compact")) return 0;
  return 1;
}

export function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  // explicit user pref wins
  const pref = getVoicePref(lang);
  if (pref) {
    const chosen = voices.find((v) => v.voiceURI === pref);
    if (chosen) return chosen;
  }
  const prefix = lang.slice(0, 2);
  const exact = voices.filter((v) => v.lang === lang || v.lang.replace("_", "-") === lang);
  const near = voices.filter((v) => v.lang.startsWith(prefix));
  const best = (list: SpeechSynthesisVoice[]) =>
    list.length > 0 ? [...list].sort((a, b) => voiceQuality(b) - voiceQuality(a))[0] : null;
  return best(exact) ?? best(near);
}

/* ---------- server TTS availability ---------- */
let serverTts: boolean | null = null; // null = unknown

async function serverTtsAvailable(): Promise<boolean> {
  if (serverTts !== null) return serverTts;
  try {
    const res = await fetch("/api/tts");
    serverTts = res.ok;
  } catch {
    serverTts = false;
  }
  return serverTts;
}

/* ---------- unified playback queue ---------- */
interface PlayItem {
  text: string;
  lang: string;
  rate: number;
  onStart?: () => void;
  onQueueEnd?: () => void; // fired after the LAST item of a speakSeq finishes
}

let queue: PlayItem[] = [];
let pumping = false;
let generation = 0;
let currentAudio: HTMLAudioElement | null = null;

function cancelPlayback() {
  generation++;
  queue = [];
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

async function playViaServer(item: PlayItem, gen: number): Promise<boolean> {
  try {
    const url = `/api/tts?text=${encodeURIComponent(item.text)}&lang=${encodeURIComponent(item.lang)}&rate=${item.rate}`;
    const res = await fetch(url);
    if (res.status === 503) {
      serverTts = false;
      return false;
    }
    if (!res.ok) return false;
    const blob = await res.blob();
    if (gen !== generation) return true; // cancelled while fetching — swallow
    return await new Promise<boolean>((resolve) => {
      const audio = new Audio(URL.createObjectURL(blob));
      currentAudio = audio;
      item.onStart?.();
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        resolve(true);
      };
      audio.onerror = () => resolve(false);
      audio.play().catch(() => resolve(false));
    });
  } catch {
    return false;
  }
}

async function playViaBrowser(item: PlayItem, gen: number): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const voices = await loadVoices();
  if (gen !== generation) return;
  const voice = pickVoice(voices, item.lang);
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = item.lang;
    if (voice) u.voice = voice;
    u.rate = item.rate;
    u.onstart = () => item.onStart?.();
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
    // safety valve: headless/broken synths that never fire events
    setTimeout(resolve, 2000 + item.text.length * 120);
  });
}

async function pump() {
  if (pumping) return;
  pumping = true;
  const gen = generation;
  while (queue.length > 0 && gen === generation) {
    const item = queue.shift()!;
    let played = false;
    if (serverTts !== false && (await serverTtsAvailable())) {
      played = await playViaServer(item, gen);
    }
    if (!played && gen === generation) {
      await playViaBrowser(item, gen);
    }
    if (gen === generation) item.onQueueEnd?.();
  }
  pumping = false;
}

/* ---------- public API (signatures unchanged) ---------- */

/** Speak text aloud with the best available voice for the given locale. */
export function speak(text: string, opts?: { lang?: string; queue?: boolean; rate?: number }) {
  if (typeof window === "undefined") return;
  if (!opts?.queue) cancelPlayback();
  queue.push({
    text,
    lang: opts?.lang ?? "es-MX",
    rate: opts?.rate ?? getRatePref(),
  });
  void pump();
}

/** @deprecated use speak(text, {lang}) */
export function speakSpanish(text: string, opts?: { queue?: boolean; rate?: number }) {
  speak(text, { ...opts, lang: "es-MX" });
}

export function stopSpeaking() {
  cancelPlayback();
}

/**
 * Speak a sequence with per-item callbacks (karaoke highlighting).
 * onIndex(i) fires as each item starts; onIndex(null) when the run ends.
 */
export function speakSeq(
  texts: string[],
  opts: { lang?: string; rate?: number; onIndex?: (i: number | null) => void } = {},
) {
  if (typeof window === "undefined" || texts.length === 0) return;
  cancelPlayback();
  const lang = opts.lang ?? "es-MX";
  const rate = opts.rate ?? getRatePref();
  texts.forEach((text, i) => {
    queue.push({
      text,
      lang,
      rate,
      onStart: () => opts.onIndex?.(i),
      onQueueEnd: i === texts.length - 1 ? () => opts.onIndex?.(null) : undefined,
    });
  });
  void pump();
}
