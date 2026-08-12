"use client";

/**
 * AmbientSpawner — living background. Emojis pop in at random spots,
 * bob/drift for a while, fade away; 1–3 new ones spawn every ~minute.
 * Fixed, z-[-1], pointer-events-none: pure atmosphere, never in the way.
 * Respects prefers-reduced-motion (spawns nothing).
 */
import { useEffect, useRef, useState } from "react";
import { Emoji } from "./Doodles";

interface Sprite {
  id: number;
  emoji: string;
  top: number; // vh %
  left: number; // vw %
  size: number;
  tilt: number;
  anim: "floaty" | "drift";
  dying: boolean;
}

const MAX_LIVE = 8;
const LIFETIME_MS: [number, number] = [22_000, 40_000]; // each sprite's life
const SPAWN_EVERY_MS: [number, number] = [40_000, 80_000]; // "every minute or so"
const FADE_MS = 900;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export default function AmbientSpawner({ set }: { set: readonly string[] }) {
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const setRef = useRef(set);
  setRef.current = set;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const later = (ms: number, fn: () => void) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
      return t;
    };

    const spawnOne = () => {
      const id = nextId.current++;
      const sprite: Sprite = {
        id,
        emoji: setRef.current[Math.floor(Math.random() * setRef.current.length)],
        top: rand(6, 86),
        left: rand(2, 92),
        size: rand(18, 42),
        tilt: rand(-14, 14),
        anim: Math.random() < 0.5 ? "floaty" : "drift",
        dying: false,
      };
      setSprites((prev) => {
        const live = prev.filter((s) => !s.dying);
        if (live.length >= MAX_LIVE) return prev;
        return [...prev, sprite];
      });
      // schedule its death: fade, then remove
      later(rand(LIFETIME_MS[0], LIFETIME_MS[1]), () => {
        setSprites((prev) => prev.map((s) => (s.id === id ? { ...s, dying: true } : s)));
        later(FADE_MS + 100, () => {
          setSprites((prev) => prev.filter((s) => s.id !== id));
        });
      });
    };

    // opening act: a few staggered pops so the page feels alive right away
    later(1200, spawnOne);
    later(4500, spawnOne);
    later(9000, spawnOne);

    // then the recurring drizzle: 1–3 pops every ~minute
    const loop = () => {
      later(rand(SPAWN_EVERY_MS[0], SPAWN_EVERY_MS[1]), () => {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) later(i * rand(800, 2200), spawnOne);
        loop();
      });
    };
    loop();

    const currentTimers = timers.current;
    return () => {
      currentTimers.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden" aria-hidden>
      {sprites.map((s) => (
        <span
          key={s.id}
          className="animate-pop-in absolute"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            opacity: s.dying ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease`,
          }}
        >
          <Emoji size={s.size} tilt={s.tilt} animation={s.anim}>
            {s.emoji}
          </Emoji>
        </span>
      ))}
    </div>
  );
}
