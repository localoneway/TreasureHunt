"use client";

import { useMemo, useState } from "react";
import { formatCents } from "@/lib/money";

type Point = { capturedAt: string; priceCents: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_L = 56;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;

export default function PriceHistoryChart({ points }: { points: Point[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...points].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()),
    [points],
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-[#898781]">No price history yet — check back after the next poll.</p>
    );
  }

  const times = sorted.map((p) => new Date(p.capturedAt).getTime());
  const prices = sorted.map((p) => p.priceCents);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const priceSpan = maxP - minP || 1;
  const timeSpan = maxT - minT || 1;

  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;

  const x = (t: number) => PAD_L + ((t - minT) / timeSpan) * innerW;
  const y = (p: number) => PAD_T + innerH - ((p - minP) / priceSpan) * innerH;

  const linePath = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(new Date(p.capturedAt).getTime())} ${y(p.priceCents)}`)
    .join(" ");

  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => PAD_T + (innerH / gridLines) * i);

  const hovered = hoverIdx != null ? sorted[hoverIdx] : null;

  return (
    <div
      className="viz-root relative"
      style={
        {
          ["--text-secondary" as string]: "#52514e",
          ["--muted" as string]: "#898781",
          ["--grid" as string]: "#e1e0d9",
          ["--series-1" as string]: "#2a78d6",
        } as React.CSSProperties
      }
    >
      <style>{`
        .viz-root { color-scheme: light; }
        @media (prefers-color-scheme: dark) {
          .viz-root { color-scheme: dark; --text-secondary: #c3c2b7; --muted: #898781; --grid: #2c2c2a; --series-1: #3987e5; }
        }
      `}</style>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Price history line chart"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {gridYs.map((gy, i) => (
          <line key={i} x1={PAD_L} x2={WIDTH - PAD_R} y1={gy} y2={gy} stroke="var(--grid)" strokeWidth={1} />
        ))}
        {gridYs.map((gy, i) => {
          const price = maxP - (priceSpan / gridLines) * i;
          return (
            <text key={i} x={PAD_L - 8} y={gy} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted)">
              {formatCents(Math.round(price))}
            </text>
          );
        })}

        <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {sorted.map((p, i) => (
          <circle key={i} cx={x(new Date(p.capturedAt).getTime())} cy={y(p.priceCents)} r={3} fill="var(--series-1)" />
        ))}

        {sorted.map((p, i) => (
          <rect
            key={`hit-${i}`}
            x={x(new Date(p.capturedAt).getTime()) - 12}
            y={PAD_T}
            width={24}
            height={innerH}
            fill="transparent"
            onPointerEnter={() => setHoverIdx(i)}
            onFocus={() => setHoverIdx(i)}
            tabIndex={0}
          />
        ))}

        {hovered && (
          <line
            x1={x(new Date(hovered.capturedAt).getTime())}
            x2={x(new Date(hovered.capturedAt).getTime())}
            y1={PAD_T}
            y2={PAD_T + innerH}
            stroke="var(--muted)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 rounded border border-[#e1e0d9] dark:border-[#2c2c2a] bg-[#fcfcfb] dark:bg-[#1a1a19] px-2 py-1 text-xs shadow-sm"
          style={{
            left: `${(x(new Date(hovered.capturedAt).getTime()) / WIDTH) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-semibold">{formatCents(hovered.priceCents)}</div>
          <div className="text-[var(--text-secondary)]">
            {new Date(hovered.capturedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
      )}
    </div>
  );
}
