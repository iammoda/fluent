"use client";

/**
 * Arcade SFX — synthesized WebAudio blips, zero assets.
 * Toggle persisted in localStorage ("fluent.sfx", default on).
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function sfxEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("fluent.sfx") !== "0";
}

export function setSfxEnabled(on: boolean) {
  localStorage.setItem("fluent.sfx", on ? "1" : "0");
}

function blip(freq: number, start: number, dur: number, type: OscillatorType = "square", gain = 0.05) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  correct() {
    if (!sfxEnabled()) return;
    blip(660, 0, 0.09, "square", 0.045);
    blip(880, 0.08, 0.14, "square", 0.045);
  },
  wrong() {
    if (!sfxEnabled()) return;
    blip(196, 0, 0.16, "sawtooth", 0.05);
    blip(147, 0.1, 0.22, "sawtooth", 0.045);
  },
  /** soft descending whiff — for reveals (asking for help isn't failure) */
  whiff() {
    if (!sfxEnabled()) return;
    blip(440, 0, 0.12, "triangle", 0.035);
    blip(330, 0.09, 0.16, "triangle", 0.03);
  },
  /** escalating arpeggio with combo size */
  combo(n: number) {
    if (!sfxEnabled()) return;
    const base = [523, 659, 784, 1047, 1319];
    const notes = Math.min(base.length, 2 + Math.floor(n / 3));
    for (let i = 0; i < notes; i++) blip(base[i], i * 0.055, 0.1, "triangle", 0.05);
  },
  tick() {
    if (!sfxEnabled()) return;
    blip(1200, 0, 0.03, "square", 0.02);
  },
  complete() {
    if (!sfxEnabled()) return;
    const seq = [523, 659, 784, 1047, 784, 1047];
    seq.forEach((f, i) => blip(f, i * 0.11, 0.16, "triangle", 0.055));
  },
};
