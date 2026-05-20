"use client";

import type { SplitPoint } from "@/lib/swim-calc";
import { graphXTicks, graphYTicks } from "@/lib/swim-calc";
import { formatTime } from "@/lib/time";

type Props = {
  distance: number;
  splits: SplitPoint[];
  totalTime: number;
};

const PAD = { top: 16, right: 16, bottom: 36, left: 48 };
const W = 560;
const H = 220;

export function PaceGraph({ distance, splits, totalTime }: Props) {
  if (distance <= 0 || totalTime <= 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        Zadej distance a time pro graf
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
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950"
      role="img"
      aria-label="Graf vzdálenosti vůči času"
    >
      <rect
        x={PAD.left}
        y={PAD.top}
        width={plotW}
        height={plotH}
        fill="none"
        stroke="currentColor"
        className="text-zinc-200 dark:text-zinc-700"
        strokeWidth={1}
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
              stroke="currentColor"
              className="text-zinc-100 dark:text-zinc-800"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={sy + 4}
              textAnchor="end"
              className="fill-zinc-500 text-[10px] font-mono"
            >
              {d}
            </text>
          </g>
        );
      })}

      {xTicks.map(({ distance: d, time }) => {
        const { sx } = toSvg(time, 0);
        return (
          <g key={`x-${d}`}>
            <line
              x1={sx}
              x2={sx}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="currentColor"
              className="text-zinc-100 dark:text-zinc-800"
              strokeWidth={1}
            />
            <text
              x={sx}
              y={H - 8}
              textAnchor="middle"
              className="fill-zinc-500 text-[10px] font-mono"
            >
              {formatTime(time)}
            </text>
          </g>
        );
      })}

      <text
        x={12}
        y={PAD.top + plotH / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${PAD.top + plotH / 2})`}
        className="fill-zinc-600 text-[10px]"
      >
        m
      </text>
      <text
        x={PAD.left + plotW / 2}
        y={H - 2}
        textAnchor="middle"
        className="fill-zinc-600 text-[10px]"
      >
        čas
      </text>

      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        className="text-blue-600 dark:text-blue-400"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {points.map((p, i) => {
        const { sx, sy } = toSvg(p.x, p.y);
        return (
          <circle
            key={i}
            cx={sx}
            cy={sy}
            r={i === 0 ? 3 : 4}
            className="fill-blue-600 dark:fill-blue-400"
          />
        );
      })}
    </svg>
  );
}
