/**
 * Doodle squadron — hand-drawn-style inline SVGs with float/drift animations.
 * Pure SVG, server-safe. Scatter these everywhere.
 */

interface DoodleProps {
  className?: string;
  size?: number;
  tilt?: number; // degrees
  animation?: "floaty" | "drift" | "spin" | "wiggle" | "none";
}

function wrap(animation: DoodleProps["animation"]) {
  switch (animation) {
    case "drift":
      return "animate-drift";
    case "spin":
      return "animate-spin-slow";
    case "wiggle":
      return "animate-wiggle";
    case "none":
      return "";
    default:
      return "animate-floaty";
  }
}

export function Ufo({ className = "", size = 56, tilt = -8, animation = "drift" }: DoodleProps) {
  return (
    <span
      className={`pointer-events-none inline-block select-none ${wrap(animation)} ${className}`}
      style={{ ["--tilt" as string]: `${tilt}deg` }}
      aria-hidden
    >
      <svg width={size} height={size * 0.62} viewBox="0 0 100 62" fill="none">
        {/* dome */}
        <path d="M35 26c0-9 7-16 15-16s15 7 15 16" fill="#8ed1e8" stroke="#1a1a1a" strokeWidth="3" />
        <circle cx="46" cy="18" r="3" fill="#fffaf0" opacity="0.8" />
        {/* saucer */}
        <ellipse cx="50" cy="32" rx="42" ry="13" fill="#cfd4dc" stroke="#1a1a1a" strokeWidth="3" />
        <ellipse cx="50" cy="28" rx="30" ry="7" fill="#eef1f5" stroke="#1a1a1a" strokeWidth="2" />
        {/* lights */}
        <circle cx="24" cy="35" r="3.4" fill="#ffd43b" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="50" cy="39" r="3.4" fill="#ff8a65" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="76" cy="35" r="3.4" fill="#b2e061" stroke="#1a1a1a" strokeWidth="2" />
        {/* beam sparkle */}
        <path d="M44 52l3-5m9 5l-3-5" stroke="#f5a623" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Star({ className = "", size = 40, tilt = 6, animation = "floaty" }: DoodleProps) {
  return (
    <span
      className={`pointer-events-none inline-block select-none ${wrap(animation)} ${className}`}
      style={{ ["--tilt" as string]: `${tilt}deg` }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <path
          d="M50 6l12.9 27.5L92 37.8 70.5 58.4l5.4 29.8L50 73.6 24.1 88.2l5.4-29.8L8 37.8l29.1-4.3L50 6z"
          fill="#ffd43b"
          stroke="#1a1a1a"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M50 22l7 15 16 2.4" stroke="#fffaf0" strokeWidth="6" strokeLinecap="round" opacity="0.75" />
      </svg>
    </span>
  );
}

export function Spark({ className = "", size = 26, tilt = 0, animation = "wiggle" }: DoodleProps) {
  return (
    <span
      className={`pointer-events-none inline-block select-none ${wrap(animation)} ${className}`}
      style={{ ["--tilt" as string]: `${tilt}deg` }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path
          d="M20 3v10M20 27v10M3 20h10M27 20h10M9 9l6 6M25 25l6 6M31 9l-6 6M15 25l-6 6"
          stroke="#1a1a1a"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="4" fill="#ff8a65" stroke="#1a1a1a" strokeWidth="2.4" />
      </svg>
    </span>
  );
}

export function Planet({ className = "", size = 48, tilt = -10, animation = "floaty" }: DoodleProps) {
  return (
    <span
      className={`pointer-events-none inline-block select-none ${wrap(animation)} ${className}`}
      style={{ ["--tilt" as string]: `${tilt}deg` }}
      aria-hidden
    >
      <svg width={size} height={size * 0.7} viewBox="0 0 100 70" fill="none">
        <circle cx="50" cy="35" r="22" fill="#b388ff" stroke="#1a1a1a" strokeWidth="3.4" />
        <circle cx="42" cy="28" r="5" fill="#d9c6ff" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="58" cy="42" r="3.4" fill="#d9c6ff" stroke="#1a1a1a" strokeWidth="2" />
        <ellipse cx="50" cy="38" rx="42" ry="10" stroke="#1a1a1a" strokeWidth="3.4" fill="none" transform="rotate(-14 50 38)" />
      </svg>
    </span>
  );
}

export function Cloud({ className = "", size = 52, tilt = 0, animation = "drift" }: DoodleProps) {
  return (
    <span
      className={`pointer-events-none inline-block select-none ${wrap(animation)} ${className}`}
      style={{ ["--tilt" as string]: `${tilt}deg` }}
      aria-hidden
    >
      <svg width={size} height={size * 0.62} viewBox="0 0 100 62" fill="none">
        <path
          d="M25 48a13 13 0 1 1 3-25.7A19 19 0 0 1 64 15a15 15 0 0 1 14 33H25z"
          fill="#fffaf0"
          stroke="#1a1a1a"
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Squiggle({ className = "", size = 64, tilt = 0, animation = "none" }: DoodleProps) {
  return (
    <span
      className={`pointer-events-none inline-block select-none ${wrap(animation)} ${className}`}
      style={{ ["--tilt" as string]: `${tilt}deg` }}
      aria-hidden
    >
      <svg width={size} height={size * 0.35} viewBox="0 0 100 35" fill="none">
        <path
          d="M4 22c10-18 16-18 24 0s16 18 24 0 16-18 24 0 12 12 20 4"
          stroke="#7cb518"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

export function Rocket({ className = "", size = 44, tilt = 24, animation = "floaty" }: DoodleProps) {
  return (
    <span
      className={`pointer-events-none inline-block select-none ${wrap(animation)} ${className}`}
      style={{ ["--tilt" as string]: `${tilt}deg` }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        <path d="M40 6c10 8 14 22 14 34l-14 8-14-8c0-12 4-26 14-34z" fill="#ff8a65" stroke="#1a1a1a" strokeWidth="3.4" strokeLinejoin="round" />
        <circle cx="40" cy="30" r="6.5" fill="#8ed1e8" stroke="#1a1a1a" strokeWidth="3" />
        <path d="M26 40l-9 13 12-3M54 40l9 13-12-3" fill="#ffd43b" stroke="#1a1a1a" strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 52v14" stroke="#f5a623" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 7" />
      </svg>
    </span>
  );
}

/** Any emoji as a floating doodle */
export function Emoji({
  children,
  className = "",
  size = 34,
  tilt = 0,
  animation = "floaty",
}: DoodleProps & { children: string }) {
  return (
    <span
      className={`pointer-events-none inline-block select-none ${wrap(animation)} ${className}`}
      style={{
        ["--tilt" as string]: `${tilt}deg`,
        fontSize: size,
        lineHeight: 1,
        filter: "drop-shadow(2px 3px 0 rgba(26,26,26,0.18))",
      }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/** Themed emoji sets per page/activity */
export const EMOJI_SETS = {
  today: ["🌮", "🥐", "☕", "🎯", "🕹️", "✨", "🎲", "🏆", "🫧", "🌈"],
  review: ["🧠", "⚡", "💫", "🎲", "🃏", "🎰", "✨", "🧩"],
  story: ["📖", "🌙", "🦜", "🍊", "🏝️", "🌅", "📚", "🧉", "🍋"],
  speed: ["⚡", "🏎️", "💨", "🔥", "🏁", "⏱️", "🚀", "💫"],
  retell: ["🎙️", "🗣️", "📣", "🎪", "🎤", "🌟", "🎭"],
  write: ["✍️", "💌", "📬", "🖍️", "📝", "💜", "📮", "🖋️"],
  dictation: ["👂", "🎧", "🔊", "🐚", "🎵", "🎶", "📻"],
  cast: ["🌙", "💤", "⭐", "🛌", "🌌", "🦉", "🌠"],
  stats: ["🏆", "📈", "🎖️", "💎", "🥇", "⭐", "🎗️", "👑"],
  party: ["🎉", "🎊", "🏅", "🌟", "🍾", "🎈", "🥳"],
  es: ["🌮", "💃", "🎸", "🌵", "🦎", "🌶️", "☀️", "🪅", "🍹"],
  fr: ["🥐", "🗼", "🧀", "🚲", "🎨", "🥖", "🍷", "⛵", "🌷"],
} as const;

type SpotAnim = "floaty" | "drift" | "spin" | "wiggle";

/**
 * Fixed scatter layout — right-edge spots first so low counts hug the
 * margins; deeper counts fill gutters. Deterministic so SSR === client.
 */
const SPOTS: {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  anim: SpotAnim;
}[] = [
  { top: "4%", right: "3%", size: 34, anim: "drift" },
  { top: "30%", left: "2%", size: 26, anim: "floaty" },
  { bottom: "22%", right: "5%", size: 30, anim: "floaty" },
  { top: "58%", right: "12%", size: 22, anim: "drift" },
  { bottom: "6%", left: "6%", size: 28, anim: "floaty" },
  { top: "12%", left: "14%", size: 20, anim: "drift" },
  { top: "44%", right: "2%", size: 24, anim: "wiggle" },
  { top: "72%", left: "3%", size: 30, anim: "drift" },
  { bottom: "38%", left: "10%", size: 18, anim: "floaty" },
  { top: "22%", right: "20%", size: 16, anim: "floaty" },
  { bottom: "10%", right: "16%", size: 22, anim: "drift" },
  { top: "86%", right: "30%", size: 18, anim: "floaty" },
];

/** occasionally season the field with an SVG doodle instead of an emoji */
const SVG_SQUAD = [Ufo, Star, Planet, Cloud];

/**
 * DoodleField — scatters floating doodles around a relative container.
 * Sits at z-[-1]: always behind content, never blocks clicks.
 */
export function DoodleField({
  set,
  count = 5,
  className = "",
}: {
  set: readonly string[];
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[-1] overflow-hidden ${className}`}
      aria-hidden
    >
      {SPOTS.slice(0, Math.min(count, SPOTS.length)).map((s, i) => {
        const tilt = (i % 2 === 0 ? 1 : -1) * (4 + i * 2);
        // deterministic seasoning: every 4th spot becomes an SVG doodle
        const Svg = i % 4 === 3 ? SVG_SQUAD[(i / 4) % SVG_SQUAD.length | 0] : null;
        return (
          <span
            key={i}
            className="absolute"
            style={{
              top: s.top,
              bottom: s.bottom,
              left: s.left,
              right: s.right,
              animationDelay: `${(i * 0.7) % 4}s`,
            }}
          >
            {Svg ? (
              <Svg size={s.size + 14} tilt={tilt} animation={s.anim} />
            ) : (
              <Emoji size={s.size} tilt={tilt} animation={s.anim}>
                {set[i % set.length]}
              </Emoji>
            )}
          </span>
        );
      })}
    </div>
  );
}

/**
 * AmbientDoodles — viewport-fixed background floaters (Shell-level),
 * so every page has life even before its own field renders.
 */
export function AmbientDoodles({ set }: { set: readonly string[] }) {
  const spots = [
    { top: "16%", left: "1.5%", size: 22, anim: "drift" as const },
    { top: "62%", right: "1.5%", size: 26, anim: "floaty" as const },
    { bottom: "8%", left: "3%", size: 20, anim: "floaty" as const },
    { top: "38%", right: "4%", size: 18, anim: "drift" as const },
    { bottom: "26%", right: "10%", size: 16, anim: "floaty" as const },
    { top: "80%", left: "12%", size: 18, anim: "drift" as const },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden" aria-hidden>
      {spots.map((s, i) => (
        <span
          key={i}
          className="absolute hidden md:block"
          style={{
            top: "top" in s ? s.top : undefined,
            bottom: "bottom" in s ? (s as { bottom?: string }).bottom : undefined,
            left: "left" in s ? (s as { left?: string }).left : undefined,
            right: "right" in s ? (s as { right?: string }).right : undefined,
            animationDelay: `${(i * 1.1) % 5}s`,
            opacity: 0.85,
          }}
        >
          <Emoji size={s.size} tilt={(i % 2 === 0 ? -1 : 1) * (3 + i * 2)} animation={s.anim}>
            {set[i % set.length]}
          </Emoji>
        </span>
      ))}
    </div>
  );
}
