"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildEvenPaces,
  buildSplits,
  segmentCount,
  totalTimeFromPaces,
  type PaceInterval,
} from "@/lib/swim-calc";
import {
  formatPace,
  formatTime,
  normalizePaceInput,
  parseTime,
} from "@/lib/time";
import { PaceGraph } from "./PaceGraph";

const DEFAULT_DISTANCE = "1500";
const DEFAULT_TIME = "20:00.00";

const inputClass =
  "w-full min-h-11 rounded-lg border border-border bg-surface-elevated px-3.5 py-3 font-mono text-base text-foreground transition-colors placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted sm:min-h-0 sm:py-2.5 sm:text-sm";

const labelClass =
  "text-[11px] font-medium uppercase tracking-wider text-foreground-soft sm:text-xs";

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M1 11 C3 7, 6 15, 9 10.5 C11.5 7, 13.5 14, 16.5 10 C18.5 7, 20.5 13, 23 10 C24 9, 24.5 9.5, 25.5 9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Panel({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="card-elevated-sm flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="shrink-0 bg-gradient-to-r from-accent-deep to-[#0d4f62] px-3.5 py-2.5 sm:px-4 sm:py-3">
        <h2 className="text-sm font-semibold tracking-wide text-white">
          {title}
        </h2>
      </div>
      {children}
      {footer ? (
        <div className="shrink-0 border-t border-border-subtle bg-surface-muted px-3.5 py-2 text-[11px] leading-snug text-muted sm:px-4 sm:text-xs">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

const STORAGE_KEY = "swim-calc-state";

function loadSaved(): { distanceStr: string; timeStr: string; paceIn: PaceInterval; paces: number[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.distanceStr !== "string" ||
      typeof parsed.timeStr !== "string" ||
      (parsed.paceIn !== 50 && parsed.paceIn !== 100) ||
      !Array.isArray(parsed.paces) ||
      !parsed.paces.every((p: unknown) => typeof p === "number")
    ) return null;
    return parsed as { distanceStr: string; timeStr: string; paceIn: PaceInterval; paces: number[] };
  } catch {
    return null;
  }
}

const DEFAULT_PACES = buildEvenPaces(parseTime(DEFAULT_TIME) ?? 0, Number(DEFAULT_DISTANCE), 100);

function getPaceDeviationClass(pace: number, avg: number): { stripe: string; text: string } {
  const dev = (pace - avg) / avg;
  if (dev > 0.025) return { stripe: "bg-warning", text: "text-warning" };
  if (dev < -0.025) return { stripe: "bg-success", text: "text-success" };
  return { stripe: "bg-transparent", text: "text-foreground" };
}

export function SwimCalculator() {
  const [distanceStr, setDistanceStr] = useState(DEFAULT_DISTANCE);
  const [timeStr, setTimeStr] = useState(DEFAULT_TIME);
  const [paceIn, setPaceIn] = useState<PaceInterval>(100);
  const [paces, setPaces] = useState<number[]>(DEFAULT_PACES);
  const [paceInputs, setPaceInputs] = useState<string[]>(() =>
    DEFAULT_PACES.map(formatPace),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setDistanceStr(saved.distanceStr);
      setTimeStr(saved.timeStr);
      setPaceIn(saved.paceIn);
      setPaces(saved.paces);
      setPaceInputs(saved.paces.map(formatPace));
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ distanceStr, timeStr, paceIn, paces }));
    } catch {
      // ignore (private browsing, quota exceeded)
    }
  }, [isHydrated, distanceStr, timeStr, paceIn, paces]);

  const setPacesOnly = useCallback((next: number[]) => {
    setPaces(next);
    setPaceInputs(next.map(formatPace));
  }, []);

  const distance = Number(distanceStr) || 0;
  const validDistance = segmentCount(distance, paceIn) > 0;

  const commitDistance = () => {
    const trimmed = distanceStr.trim();
    if (trimmed === "") return;
    const d = Number(trimmed);
    if (!Number.isFinite(d) || d <= 0) return;
    setDistanceStr(String(d));
    const t = parseTime(timeStr);
    if (t != null && segmentCount(d, paceIn) > 0) {
      setPacesOnly(buildEvenPaces(t, d, paceIn));
    }
  };

  const commitTime = () => {
    const t = parseTime(timeStr);
    if (t == null) return;
    setTimeStr(formatTime(t));
    if (validDistance) {
      setPacesOnly(buildEvenPaces(t, distance, paceIn));
    }
  };

  const handlePaceInChange = (interval: PaceInterval) => {
    setPaceIn(interval);
    const t = parseTime(timeStr);
    const d = Number(distanceStr) || 0;
    if (t != null && segmentCount(d, interval) > 0) {
      setPacesOnly(buildEvenPaces(t, d, interval));
    }
  };

  const commitPaceRow = (index: number, raw: string) => {
    const normalized = normalizePaceInput(raw);
    if (!normalized) {
      setPaceInputs((prev) => {
        const next = [...prev];
        next[index] = formatPace(paces[index] ?? 0);
        return next;
      });
      return;
    }
    const sec = parseTime(normalized);
    if (sec == null || sec <= 0) return;
    setPaces((prev) => {
      const next = [...prev];
      next[index] = sec;
      setPaceInputs(next.map(formatPace));
      setTimeStr(formatTime(totalTimeFromPaces(next)));
      return next;
    });
  };

  const totalTime = useMemo(() => totalTimeFromPaces(paces), [paces]);
  const splits = useMemo(() => buildSplits(paces, paceIn), [paces, paceIn]);
  const graphDistance = validDistance ? distance : 0;
  const graphTotalTime = validDistance ? totalTime : 0;
  const avgPace =
    validDistance && paces.length > 0 ? totalTime / paces.length : null;

  return (
    <div className="min-h-dvh px-3 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 sm:pb-12 sm:pt-8 lg:py-12">
      <div className="mx-auto w-full max-w-4xl space-y-5 sm:space-y-8">

        {/* Header */}
        <header className="card-elevated overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <div className="h-1.5 bg-gradient-to-r from-accent-deep via-accent-mid to-accent-light" />
          <div className="px-4 py-4 text-center sm:px-6 sm:py-5 sm:text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent sm:text-xs">
              Plavecká kalkulačka
            </p>
            <h1 className="mt-1.5 flex items-center justify-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:justify-start sm:text-4xl">
              <WaveIcon className="size-6 shrink-0 text-accent sm:size-8" />
              Swim Calc
            </h1>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-foreground-soft sm:mx-0 sm:max-w-xl">
              Délka, čas a tempo — splits a graf se dopočítají samy.
            </p>
          </div>
        </header>

        {/* Inputs */}
        <section className="card-elevated overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <div className="h-px bg-gradient-to-r from-accent-deep/60 via-accent/40 to-transparent" />
          <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-5">
              <label className="block space-y-1.5 sm:space-y-2">
                <span className={labelClass}>Délka</span>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={distanceStr}
                    onChange={(e) => setDistanceStr(e.target.value)}
                    onBlur={commitDistance}
                    placeholder="1500"
                    className={inputClass + " pr-8"}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
                    m
                  </span>
                </div>
                <span className="block text-[11px] text-muted sm:text-xs">
                  násobek {paceIn} m
                </span>
              </label>

              <label className="block space-y-1.5 sm:space-y-2">
                <span className={labelClass}>Čas</span>
                <input
                  type="text"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  onBlur={commitTime}
                  placeholder="20:00.00"
                  className={inputClass}
                />
                <span className="block text-[11px] text-muted sm:text-xs">
                  mm:ss nebo mm:ss.cs
                </span>
              </label>

              <div className="space-y-1.5 sm:space-y-2">
                <span className={labelClass}>Tempo na</span>
                <div className="grid min-h-11 grid-cols-2 gap-1 rounded-lg border border-border bg-surface-muted p-1 sm:min-h-0">
                  {([50, 100] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handlePaceInChange(n)}
                      className={`min-h-10 rounded-md px-3 py-2.5 font-mono text-sm font-semibold transition-all active:scale-[0.97] sm:min-h-0 sm:py-2 ${
                        paceIn === n
                          ? "bg-accent text-white shadow-sm"
                          : "text-foreground-soft hover:bg-surface-elevated hover:text-foreground"
                      }`}
                    >
                      {n} m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {distanceStr.trim() !== "" && !validDistance && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-warning/40 bg-warning-bg px-3 py-2.5 text-sm text-warning"
              >
                {distance > 0
                  ? `Délka musí být násobek ${paceIn} m.`
                  : "Zadej platnou délku."}
              </p>
            )}

            {avgPace != null && (
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border-subtle pt-5">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted sm:text-xs">
                    Průměrné tempo
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-bold tabular-nums text-accent sm:text-xl">
                      {formatPace(avgPace)}
                    </span>
                    <span className="text-sm text-muted">/ {paceIn} m</span>
                  </div>
                </div>
                {validDistance && (
                  <div className="flex flex-col gap-1 border-l border-border-subtle pl-3 sm:pl-4">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted sm:text-xs">
                      Celkový čas
                    </span>
                    <span className="font-mono text-2xl font-bold tabular-nums text-foreground sm:text-xl">
                      {formatTime(totalTime)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Pace + Splits panels */}
        <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <Panel title="Pace" footer="1:20 nebo 45 — po opuštění pole doplní .00">
            <ul className="max-h-[min(42dvh,280px)] overflow-y-auto overscroll-contain sm:max-h-72">
              {paces.length === 0 ? (
                <li className="px-3.5 py-10 text-center text-sm text-muted sm:px-4">
                  Zadej délku a čas
                </li>
              ) : (
                paces.map((pace, i) => {
                  const { stripe, text } = avgPace
                    ? getPaceDeviationClass(pace, avgPace)
                    : { stripe: "bg-transparent", text: "text-foreground" };
                  return (
                    <li
                      key={i}
                      className="group relative flex items-center gap-2 border-b border-border-subtle px-3 py-2.5 last:border-0 even:bg-surface-muted/80 sm:gap-3 sm:px-4 sm:py-2"
                    >
                      {/* deviation stripe */}
                      <div className={`absolute inset-y-0 left-0 w-0.5 ${stripe}`} />
                      <span className="w-11 shrink-0 pl-1.5 font-mono text-[11px] tabular-nums text-accent sm:w-12 sm:text-xs">
                        {i + 1}×{paceIn}
                      </span>
                      <input
                        type="text"
                        value={paceInputs[i] ?? ""}
                        placeholder="1:20"
                        onChange={(e) => {
                          const value = e.target.value;
                          setPaceInputs((prev) => {
                            const next = [...prev];
                            next[i] = value;
                            return next;
                          });
                        }}
                        onBlur={(e) => commitPaceRow(i, e.target.value)}
                        className={`min-h-10 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-2 font-mono text-base font-medium tabular-nums transition-colors group-hover:border-border focus:border-accent focus:bg-surface-elevated focus:outline-none focus:ring-2 focus:ring-accent-muted sm:min-h-0 sm:py-1 sm:text-sm ${text}`}
                      />
                    </li>
                  );
                })
              )}
            </ul>
          </Panel>

          <Panel title="Splits">
            <ul className="max-h-[min(42dvh,280px)] overflow-y-auto overscroll-contain sm:max-h-72">
              {splits.length === 0 ? (
                <li className="px-3.5 py-10 text-center text-sm text-muted sm:px-4">
                  —
                </li>
              ) : (
                splits.map((s) => {
                  const progress = distance > 0 ? (s.distance / distance) * 100 : 0;
                  const isFinish = s.distance >= distance;
                  return (
                    <li
                      key={s.distance}
                      className={`relative flex items-center justify-between gap-3 border-b border-border-subtle px-3 py-2.5 last:border-0 even:bg-surface-muted/80 sm:px-4 sm:py-2 ${isFinish ? "bg-accent-faint even:bg-accent-faint" : ""}`}
                    >
                      {/* progress bar */}
                      <div
                        className="pointer-events-none absolute bottom-0 left-0 h-[2px] rounded-full bg-accent/35"
                        style={{ width: `${progress}%` }}
                      />
                      <span className={`font-mono text-sm tabular-nums ${isFinish ? "font-semibold text-accent" : "text-foreground"}`}>
                        {s.distance}
                        <span className="ml-0.5 text-xs font-normal text-muted">
                          m
                        </span>
                      </span>
                      <span className={`font-mono text-sm font-semibold tabular-nums ${isFinish ? "text-accent" : "text-accent"}`}>
                        {formatTime(s.cumulativeTime)}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </Panel>
        </section>

        {/* Graph */}
        <section className="card-elevated-sm overflow-hidden rounded-xl border border-border bg-surface-elevated">
          <div className="shrink-0 bg-gradient-to-r from-accent-deep to-[#0d4f62] px-3.5 py-2.5 sm:px-4 sm:py-3">
            <h2 className="text-sm font-semibold tracking-wide text-white">
              Průběh závodu
            </h2>
          </div>
          <div className="p-4 sm:p-5">
            <PaceGraph
              distance={graphDistance}
              splits={splits}
              totalTime={graphTotalTime}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
