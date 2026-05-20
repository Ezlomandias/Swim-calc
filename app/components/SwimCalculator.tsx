"use client";

import { useCallback, useMemo, useState } from "react";
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

export function SwimCalculator() {
  const [distanceStr, setDistanceStr] = useState(DEFAULT_DISTANCE);
  const [timeStr, setTimeStr] = useState(DEFAULT_TIME);
  const [paceIn, setPaceIn] = useState<PaceInterval>(100);
  const initialPaces = (() => {
    const d = Number(DEFAULT_DISTANCE);
    const t = parseTime(DEFAULT_TIME) ?? 0;
    return buildEvenPaces(t, d, 100);
  })();
  const [paces, setPaces] = useState<number[]>(initialPaces);
  const [paceInputs, setPaceInputs] = useState<string[]>(() =>
    initialPaces.map(formatPace),
  );

  const setPacesOnly = useCallback((next: number[]) => {
    setPaces(next);
    setPaceInputs(next.map(formatPace));
  }, []);

  const distance = Number(distanceStr) || 0;
  const count = segmentCount(distance, paceIn);
  const validDistance = count > 0;
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

  const avgPace = validDistance && paces.length > 0 ? totalTime / paces.length : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Swim Calc</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Zadej distance a time — pace se dopočítá. Úprava jednotlivých temp
          změní celkový čas a splits.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Distance</span>
          <input
            type="text"
            inputMode="numeric"
            value={distanceStr}
            onChange={(e) => setDistanceStr(e.target.value)}
            onBlur={commitDistance}
            placeholder="1500"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <span className="text-xs text-zinc-500">metrů, dělitelné {paceIn}</span>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Time</span>
          <input
            type="text"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            onBlur={commitTime}
            placeholder="20:00.00"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
          <span className="text-xs text-zinc-500">
            např. 20:00 — doplní se po opuštění pole
          </span>
        </label>

        <div className="space-y-1">
          <span className="text-sm font-medium">Pace in</span>
          <div className="flex gap-2">
            {([50, 100] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handlePaceInChange(n)}
                className={`flex-1 rounded-md border px-3 py-2 font-mono text-sm transition-colors ${
                  paceIn === n
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-500">tempo na 50 nebo 100 m</span>
        </div>
      </section>

      {distanceStr.trim() !== "" && !validDistance && (
        <p className="text-sm text-amber-600">
          {distance > 0
            ? `Distance musí být násobek ${paceIn} (např. 1500 při pace 100).`
            : "Zadej platnou distance v metrech."}
        </p>
      )}

      {avgPace != null && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Průměrné tempo:{" "}
          <span className="font-mono font-medium">{formatPace(avgPace)}</span> na{" "}
          {paceIn} m
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h2 className="border-b border-zinc-200 px-3 py-2 text-sm font-semibold dark:border-zinc-700">
            Pace
          </h2>
          <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {paces.length === 0 ? (
              <li className="px-3 py-4 text-sm text-zinc-500">Žádné úseky</li>
            ) : (
              paces.map((_, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 font-mono text-sm"
                >
                  <span className="w-14 shrink-0 text-zinc-500">
                    {i + 1}.{paceIn}
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
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 hover:border-zinc-300 focus:border-blue-500 focus:bg-white focus:outline-none dark:focus:bg-zinc-900"
                  />
                </li>
              ))
            )}
          </ul>
          <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
            Tempo: 1:20, 45 nebo 0:32 — po opuštění pole se doplní .00
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
          <h2 className="border-b border-zinc-200 px-3 py-2 text-sm font-semibold dark:border-zinc-700">
            Splits
          </h2>
          <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {splits.length === 0 ? (
              <li className="px-3 py-4 text-sm text-zinc-500">—</li>
            ) : (
              splits.map((s) => (
                <li
                  key={s.distance}
                  className="flex justify-between px-3 py-1.5 font-mono text-sm"
                >
                  <span>{s.distance}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatTime(s.cumulativeTime)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <PaceGraph
        distance={graphDistance}
        splits={splits}
        totalTime={graphTotalTime}
      />
    </div>
  );
}
