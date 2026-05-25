"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SplitPoint } from "@/lib/swim-calc";
import { graphXTicks, graphYTicks } from "@/lib/swim-calc";
import { formatTime } from "@/lib/time";

type Props = {
  distance: number;
  splits: SplitPoint[];
  totalTime: number;
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgWidth, setSvgWidth] = useState(600);
  const [cursor, setCursor] = useState<{ svgX: number; time: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSvgWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const narrow = svgWidth < 420;
  const W = svgWidth;
  const H = narrow ? 200 : 260;
  const PAD = narrow
    ? { top: 12, right: 10, bottom: 34, left: 38 }
    : { top: 16, right: 14, bottom: 44, left: 46 };

  if (distance <= 0 || totalTime <= 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-muted px-4 py-10 text-center sm:min-h-[240px]">
        <svg viewBox="0 0 48 28" fill="none" className="size-10 text-border" aria-hidden="true">
          <path
            d="M2 20 C5 13, 10 26, 15 19 C19 13.5, 22 24, 27 18 C30.5 13, 33.5 22, 38 17 C40.5 14, 42.5 17, 46 16"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground-soft">Graf průběhu</p>
          <p className="text-xs text-muted">Zadej délku a čas</p>
        </div>
      </div>
    );
  }

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // viewBox matches actual size → coordinates are 1:1 pixels
    const svgX = e.clientX - rect.left;
    if (svgX < PAD.left || svgX > PAD.left + plotW) { setCursor(null); return; }
    const clampedX = Math.max(0, Math.min(svgX - PAD.left, plotW));
    const time = (clampedX / plotW) * totalTime;
    setCursor({ svgX: PAD.left + clampedX, time });
  }, [totalTime, plotW, PAD.left]);

  const handleMouseLeave = useCallback(() => setCursor(null), []);

  const points: { x: number; y: number }[] = [
    { x: 0, y: 0 },
    ...splits.map((s) => ({
      x: s.cumulativeTime,
      y: s.distance,
    })),
  ];

  const maxTime = totalTime;
  const yTicks = graphYTicks(distance);
  const allXTicks = graphXTicks(distance, splits, totalTime);
  const xTicks = narrow && allXTicks.length > 4
    ? allXTicks.filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % 2 === 0)
    : allXTicks;

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

  // Fill area path: follow line points, then close along the bottom
  const firstPt = toSvg(points[0].x, points[0].y);
  const lastPt = toSvg(points[points.length - 1].x, points[points.length - 1].y);
  const fillPath = [
    linePath,
    `L ${lastPt.sx} ${PAD.top + plotH}`,
    `L ${firstPt.sx} ${PAD.top + plotH}`,
    "Z",
  ].join(" ");

  return (
    <div ref={containerRef} className="overflow-hidden rounded-xl border border-border-subtle bg-surface-muted">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="block min-w-0 text-foreground"
        role="img"
        aria-label="Graf vzdálenosti vůči času"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "crosshair", display: "block" }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>

        {/* Plot background */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          className="fill-surface-muted stroke-border-subtle"
          strokeWidth={1}
          rx={6}
        />

        {/* Y axis grid lines */}
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
                strokeDasharray="3 4"
              />
              <text
                x={PAD.left - 6}
                y={sy + 4}
                textAnchor="end"
                fontSize={narrow ? 9 : 10}
                className="fill-foreground-soft font-mono"
              >
                {d}
              </text>
            </g>
          );
        })}

        {/* X axis ticks */}
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
                className={isFinish ? "stroke-accent/50" : "stroke-border-subtle"}
                strokeWidth={isFinish ? 1.5 : 1}
                strokeDasharray={isFinish ? undefined : "3 4"}
              />
              <text
                x={labelX}
                y={H - (narrow ? 8 : 12)}
                textAnchor={anchor}
                fontSize={narrow ? 8 : 10}
                className={isFinish ? "fill-accent font-mono font-semibold" : "fill-muted font-mono"}
              >
                {formatTimeAxis(time)}
              </text>
            </g>
          );
        })}

        {/* Y axis label */}
        <text
          x={narrow ? 10 : 14}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          transform={`rotate(-90 ${narrow ? 10 : 14} ${PAD.top + plotH / 2})`}
          fontSize={narrow ? 9 : 10}
          className="fill-accent font-medium"
        >
          m
        </text>

        {/* Gradient fill area */}
        <path
          d={fillPath}
          fill="url(#areaGrad)"
          strokeWidth={0}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          className="stroke-accent"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, i) => {
          const { sx, sy } = toSvg(p.x, p.y);
          const isEnd = i === points.length - 1;
          const isStart = i === 0;
          if (isEnd) {
            return (
              <g key={i}>
                {/* outer glow ring */}
                <circle
                  cx={sx}
                  cy={sy}
                  r={9}
                  className="fill-accent/15 stroke-none"
                />
                <circle
                  cx={sx}
                  cy={sy}
                  r={5.5}
                  className="fill-accent stroke-surface-elevated stroke-2"
                />
              </g>
            );
          }
          return (
            <circle
              key={i}
              cx={sx}
              cy={sy}
              r={isStart ? 3 : 4}
              className="fill-surface-elevated stroke-accent-light stroke-[1.5]"
            />
          );
        })}

        {/* Total time badge near end point */}
        {(() => {
          const endPt = toSvg(totalTime, distance);
          const label = formatTime(totalTime);
          const fs = narrow ? 9 : 10;
          const charW = narrow ? 5.4 : 6.2;
          const badgeW = label.length * charW + 10;
          const badgeH = narrow ? 14 : 16;
          const isRight = endPt.sx > PAD.left + plotW * 0.6;
          const badgeX = isRight
            ? Math.max(endPt.sx - badgeW - 8, PAD.left + 2)
            : Math.min(endPt.sx + 8, PAD.left + plotW - badgeW - 2);
          const badgeY = Math.max(endPt.sy - badgeH - 8, PAD.top + 2);
          return (
            <g>
              <line
                x1={isRight ? badgeX + badgeW : badgeX}
                y1={badgeY + badgeH / 2}
                x2={endPt.sx}
                y2={endPt.sy}
                className="stroke-accent/40"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <rect
                x={badgeX}
                y={badgeY}
                width={badgeW}
                height={badgeH}
                rx={4}
                className="fill-accent stroke-accent/30"
                strokeWidth={1}
              />
              <text
                x={badgeX + badgeW / 2}
                y={badgeY + badgeH / 2 + fs * 0.38}
                textAnchor="middle"
                fontSize={fs}
                className="fill-white font-mono font-bold"
              >
                {label}
              </text>
            </g>
          );
        })()}

        {/* Cursor crosshair */}
        {cursor && (() => {
          const label = formatTime(cursor.time);
          const fs = narrow ? 9 : 10;
          const charW = narrow ? 5.4 : 6.2;
          const badgeW = label.length * charW + 12;
          const badgeH = narrow ? 15 : 18;
          const badgeX = cursor.svgX + 6 + badgeW > PAD.left + plotW
            ? cursor.svgX - badgeW - 6
            : cursor.svgX + 6;
          const badgeY = PAD.top + 4;
          return (
            <g style={{ pointerEvents: "none" }}>
              <line
                x1={cursor.svgX}
                x2={cursor.svgX}
                y1={PAD.top}
                y2={PAD.top + plotH}
                className="stroke-accent"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.85}
              />
              <rect
                x={badgeX}
                y={badgeY}
                width={badgeW}
                height={badgeH}
                rx={4}
                className="fill-accent stroke-accent/30"
                strokeWidth={1}
              />
              <text
                x={badgeX + badgeW / 2}
                y={badgeY + badgeH / 2 + fs * 0.38}
                textAnchor="middle"
                fontSize={fs}
                className="fill-white font-mono font-bold"
              >
                {label}
              </text>
            </g>
          );
        })()}

      </svg>
    </div>
  );
}
