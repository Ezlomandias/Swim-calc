"use client";

import type { SplitPoint } from "@/lib/swim-calc";
import { graphXTicks, graphYTicks } from "@/lib/swim-calc";
import { formatTime } from "@/lib/time";

type Props = {
  distance: number;
  splits: SplitPoint[];
  totalTime: number;
};

const W = 600;
const H = 280;
const PAD = { top: 18, right: 12, bottom: 52, left: 44 };

function formatTimeAxis(seconds: number): string {
  const { h, min, sec, cs } = (() => {
    const totalCs = Math.round(seconds * 100);
    const cs = totalCs % 100;
    const totalSec = Math.floor(totalCs / 100);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600);
    return { h, min, sec, cs };
  })();
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(min)}`;
  if (min > 0) return `${min}:${pad(sec)}`;
  return `${sec}.${pad(cs)}`;
}

export function PaceGraph({ distance, splits, totalTime }: Props) {
  if (distance <= 0 || totalTime <= 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-muted px-4 py-10 text-center text-sm text-muted sm:min-h-[240px]">
        <span className="font-medium text-foreground">Graf průběhu</span>
        <span className="text-xs sm:text-sm">Zadej délku a čas</span>
      </div>
    );
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const points: { x: number; y: number }[] = [
    { x: 0, y: 0 },
    ...splits.map((s) => ({
      x: s.cumulativeTime,
      y: s.distance,
    })),
  ];

  const maxTime = totalTime;
  const yTicks = graphYTicks(distance);
  const xTicks = graphXTicks(distance, splits, totalTime);

  const toSvg = (time: number, dist: number) => ({
    sx: PAD.left + (time / maxTime) * plotW,
    sy: PAD.top + plotH - (dist / distance) * plotH,
  });

  const linePath = points
    .map((p, i) => {
      const { sx, sy } = toSvg(p.x, p.y);
      return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
    })
    .join(" ");

  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-muted">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full min-w-0 text-foreground"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Graf vzdálenosti vůči času"
      >
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          className="fill-surface-muted stroke-border-subtle"
          strokeWidth={1}
          rx={6}
        />

        {yTicks.map((d) => {
          const { sy } = toSvg(0, d);
          return (
            <g key={`y-${d}`}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={sy}
                y2={sy}
                className="stroke-border-subtle"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={sy + 4}
                textAnchor="end"
                className="fill-foreground-soft font-mono text-[10px] sm:text-[11px]"
              >
                {d}
              </text>
            </g>
          );
        })}

        {xTicks.map(({ distance: d, time }, idx) => {
          const { sx } = toSvg(time, 0);
          const isFinish = d >= distance;
          const anchor =
            idx === 0
              ? "start"
              : idx === xTicks.length - 1
                ? "end"
                : "middle";
          const labelX =
            idx === 0
              ? Math.max(sx, PAD.left + 2)
              : idx === xTicks.length - 1
                ? Math.min(sx, PAD.left + plotW - 2)
                : sx;
          return (
            <g key={`x-${d}`}>
              <line
                x1={sx}
                x2={sx}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className={
                  isFinish ? "stroke-accent/40" : "stroke-border-subtle"
                }
                strokeWidth={1}
                strokeDasharray={isFinish ? undefined : "3 3"}
              />
              <text
                x={labelX}
                y={H - 14}
                textAnchor={anchor}
                className={`font-mono text-[9px] sm:text-[10px] ${
                  isFinish ? "fill-accent font-semibold" : "fill-muted"
                }`}
              >
                {formatTimeAxis(time)}
              </text>
            </g>
          );
        })}

        <text
          x={12}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${PAD.top + plotH / 2})`}
          className="fill-accent text-[10px] font-medium"
        >
          m
        </text>

        <path
          d={linePath}
          fill="none"
          className="stroke-accent"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => {
          const { sx, sy } = toSvg(p.x, p.y);
          const isEnd = i === points.length - 1;
          return (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={isEnd ? 5 : i === 0 ? 3 : 4}
              className={
                isEnd
                  ? "fill-accent stroke-surface-elevated stroke-2"
                  : "fill-surface-elevated stroke-accent-light stroke-[1.5]"
              }
            />
          );
        })}
      </svg>
    </div>
  );
}
