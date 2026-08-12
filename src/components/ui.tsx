/**
 * Candy UI kit — cream base, ink borders, hard offset shadows,
 * press-down buttons, tilted stickers. Server-safe (no hooks).
 */
import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";

/* ---------------------------------------------------------------- colors */
export const CANDY = {
  sun: "bg-sun",
  coral: "bg-coral",
  tang: "bg-tang",
  sky: "bg-skyc",
  grape: "bg-grape",
  lime: "bg-limey",
  mint: "bg-mint",
  blush: "bg-blush",
  paper: "bg-paper",
  midnight: "bg-midnight text-cream",
} as const;
export type Candy = keyof typeof CANDY;

/* ---------------------------------------------------------------- Button */
interface ButtonBaseProps {
  color?: Candy;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children: ReactNode;
}

const BTN_SIZES = {
  sm: "px-3 py-1.5 text-sm rounded-xl",
  md: "px-5 py-2.5 text-base rounded-2xl",
  lg: "px-7 py-3.5 text-lg rounded-2xl",
  xl: "px-9 py-5 text-2xl rounded-3xl",
};

function btnCls({ color = "sun", size = "md", className = "" }: Omit<ButtonBaseProps, "children">) {
  return `btn-pop font-display inline-flex items-center justify-center gap-2 font-semibold text-ink disabled:pointer-events-none disabled:opacity-40 ${CANDY[color]} ${BTN_SIZES[size]} ${className}`;
}

export function Button({
  color,
  size,
  className,
  children,
  ...rest
}: ButtonBaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={btnCls({ color, size, className })} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  color,
  size,
  className,
  children,
}: ButtonBaseProps & { href: string }) {
  return (
    <Link href={href} className={btnCls({ color, size, className })}>
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- Card */
export function Card({
  color = "paper",
  tilt = 0,
  className = "",
  children,
}: {
  color?: Candy;
  tilt?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`card-pop card-tilt rounded-3xl ${CANDY[color]} ${className}`}
      style={tilt ? ({ "--tilt": `${tilt}deg` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- Sticker */
export function Sticker({
  color = "blush",
  tilt = -4,
  className = "",
  children,
}: {
  color?: Candy;
  tilt?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`font-display inline-block rounded-xl border-2 border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink shadow-[2.5px_2.5px_0_0_#1a1a1a] ${CANDY[color]} ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- ProgressBar */
export function ProgressBar({
  value, // 0..1
  color = "lime",
  className = "",
}: {
  value: number;
  color?: Candy;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`card-pop h-6 overflow-hidden rounded-full bg-paper ${className}`}>
      <div
        className={`h-full rounded-full border-r-2 border-ink transition-all duration-500 ${CANDY[color]}`}
        style={{ width: `${pct}%`, borderRightWidth: pct === 0 || pct === 100 ? 0 : 2 }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Stat */
export function Stat({
  value,
  label,
  color = "paper",
  tilt = 0,
}: {
  value: ReactNode;
  label: string;
  color?: Candy;
  tilt?: number;
}) {
  return (
    <Card color={color} tilt={tilt} className="p-4">
      <div className="font-display text-3xl font-bold leading-none">{value}</div>
      <div className="mt-1.5 text-xs font-medium text-ink-soft">{label}</div>
    </Card>
  );
}
