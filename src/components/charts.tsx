/** Chunky candy charts — pure SVG, server-safe. */

/** Rounded bar sparkline — responsive (scales to container width) */
export function Sparkbars({
  values,
  color = "#7cb518",
  width = 260,
  height = 56,
  className = "",
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length === 0) return <span className="text-xs text-ink-soft">no data yet</span>;
  const max = Math.max(...values, 1);
  const gap = 3;
  const bw = Math.max(4, (width - gap * (values.length - 1)) / values.length);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "auto", maxWidth: width * 1.6 }}
      className={className}
      aria-hidden
    >
      {values.map((v, i) => {
        const zero = v === 0;
        const h = zero ? 3 : Math.max(5, (v / max) * (height - 4));
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={height - h}
            width={bw}
            height={h}
            rx={zero ? 1.5 : Math.min(4, bw / 2)}
            fill={zero ? "#d9cfba" : color}
            stroke={zero ? "none" : "#1a1a1a"}
            strokeWidth="1.6"
          />
        );
      })}
    </svg>
  );
}

/** GitHub-style activity heatmap (weeks x 7) */
export function Heatmap({
  days, // ordered oldest->newest, one entry per day
  className = "",
}: {
  days: { date: string; count: number }[];
  className?: string;
}) {
  const cell = 13;
  const gap = 3;
  const weeks = Math.ceil(days.length / 7);
  const max = Math.max(...days.map((d) => d.count), 1);
  const colorFor = (c: number) => {
    if (c === 0) return "#f0e6d2";
    const t = c / max;
    if (t < 0.34) return "#ffd43b";
    if (t < 0.67) return "#b2e061";
    return "#7cb518";
  };
  return (
    <svg
      width={weeks * (cell + gap)}
      height={7 * (cell + gap)}
      className={className}
      aria-label="activity heatmap"
    >
      {days.map((d, i) => {
        const w = Math.floor(i / 7);
        const r = i % 7;
        return (
          <rect
            key={d.date}
            x={w * (cell + gap)}
            y={r * (cell + gap)}
            width={cell}
            height={cell}
            rx={3.5}
            fill={colorFor(d.count)}
            stroke="#1a1a1a"
            strokeWidth="1.2"
          >
            <title>{`${d.date}: ${d.count} reps`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
