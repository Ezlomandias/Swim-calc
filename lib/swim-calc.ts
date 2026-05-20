export type PaceInterval = 50 | 100;

export type SplitPoint = {
  distance: number;
  cumulativeTime: number;
};

export function segmentCount(distance: number, paceIn: PaceInterval): number {
  if (distance <= 0 || distance % paceIn !== 0) return 0;
  return distance / paceIn;
}

/** Average pace per interval (seconds) = totalTime / number of segments */
export function averagePaceSeconds(
  totalTimeSeconds: number,
  distance: number,
  paceIn: PaceInterval,
): number | null {
  const count = segmentCount(distance, paceIn);
  if (count === 0 || totalTimeSeconds <= 0) return null;
  return totalTimeSeconds / count;
}

export function buildEvenPaces(
  totalTimeSeconds: number,
  distance: number,
  paceIn: PaceInterval,
): number[] {
  const count = segmentCount(distance, paceIn);
  if (count === 0) return [];
  const avg = totalTimeSeconds / count;
  return Array.from({ length: count }, () => avg);
}

export function totalTimeFromPaces(paces: number[]): number {
  return paces.reduce((sum, p) => sum + p, 0);
}

export function buildSplits(
  paces: number[],
  paceIn: PaceInterval,
): SplitPoint[] {
  let cumulative = 0;
  return paces.map((pace, i) => {
    cumulative += pace;
    return {
      distance: (i + 1) * paceIn,
      cumulativeTime: cumulative,
    };
  });
}

/** Cumulative time at a given distance (linear interpolation between splits). */
export function timeAtDistance(
  splits: SplitPoint[],
  targetDist: number,
): number | null {
  if (targetDist < 0 || splits.length === 0) return null;
  if (targetDist === 0) return 0;

  let prev = { distance: 0, cumulativeTime: 0 };
  for (const s of splits) {
    if (s.distance < targetDist) {
      prev = s;
      continue;
    }
    if (s.distance === targetDist) return s.cumulativeTime;
    if (s.distance > targetDist) {
      const span = s.distance - prev.distance;
      if (span === 0) return s.cumulativeTime;
      const ratio = (targetDist - prev.distance) / span;
      return (
        prev.cumulativeTime + ratio * (s.cumulativeTime - prev.cumulativeTime)
      );
    }
  }

  const last = splits[splits.length - 1];
  return targetDist <= last.distance ? last.cumulativeTime : null;
}

const Y_DISTANCE_MARKERS = [100, 200, 400, 800, 1500] as const;
const X_DISTANCE_MARKERS = [200, 400, 800] as const;

export function graphYTicks(distance: number): number[] {
  const ticks = Y_DISTANCE_MARKERS.filter((d) => d <= distance);
  if (!ticks.includes(distance)) {
    ticks.push(distance);
  }
  return ticks;
}

export function graphXTicks(
  distance: number,
  splits: SplitPoint[],
  totalTime: number,
): { distance: number; time: number }[] {
  const markers = [
    ...X_DISTANCE_MARKERS.filter((d) => d < distance),
    distance,
  ];
  return markers.map((d) => ({
    distance: d,
    time:
      d >= distance
        ? totalTime
        : (timeAtDistance(splits, d) ?? totalTime),
  }));
}

export function scalePacesToTotal(
  paces: number[],
  targetTotalSeconds: number,
): number[] {
  const current = totalTimeFromPaces(paces);
  if (current === 0 || paces.length === 0) return paces;
  const factor = targetTotalSeconds / current;
  return paces.map((p) => p * factor);
}
