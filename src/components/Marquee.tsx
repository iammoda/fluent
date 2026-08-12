/** Scrolling ticker strip — content duplicated for a seamless loop. */
import type { ReactNode } from "react";

export default function Marquee({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`card-pop overflow-hidden rounded-2xl bg-ink py-2 text-cream ${className}`}
    >
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap pr-8">
        <div className="flex items-center gap-8">{children}</div>
        <div className="flex items-center gap-8" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
