const pad2 = (n: number) => n.toString().padStart(2, "0");

function parseSecondsPart(secStr: string): number | null {
  const trimmed = secStr.trim();
  if (trimmed === "" || Number.isNaN(Number(trimmed.replace(".", "")))) {
    return null;
  }
  if (!trimmed.includes(".")) {
    return Number(trimmed);
  }
  const [whole, frac = ""] = trimmed.split(".");
  const cs = Number((frac + "00").slice(0, 2));
  if (Number.isNaN(Number(whole)) || Number.isNaN(cs)) return null;
  return Number(whole) + cs / 100;
}

/**
 * Parse duration → seconds.
 * Supports: `80`, `45.5`, `1:20`, `1:20.00`, `0:45`, `20:00`, `20:00.00`, `1:02:03.50`
 */
export function parseTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (!trimmed.includes(":")) {
    const sec = parseSecondsPart(trimmed);
    return sec != null && sec >= 0 ? sec : null;
  }

  const parts = trimmed.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "")) return null;

  if (parts.length === 2) {
    const min = Number(parts[0]);
    const sec = parseSecondsPart(parts[1]);
    if (Number.isNaN(min) || sec == null || min < 0 || sec < 0) return null;
    return min * 60 + sec;
  }

  if (parts.length === 3) {
    const h = Number(parts[0]);
    const min = Number(parts[1]);
    const sec = parseSecondsPart(parts[2]);
    if (Number.isNaN(h) || Number.isNaN(min) || sec == null) return null;
    return h * 3600 + min * 60 + sec;
  }

  return null;
}

function splitSeconds(totalSeconds: number) {
  const totalCs = Math.round(totalSeconds * 100);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return { h, min, sec, cs };
}

export function formatTime(seconds: number): string {
  const { h, min, sec, cs } = splitSeconds(seconds);
  if (h > 0) {
    return `${h}:${pad2(min)}:${pad2(sec)}.${pad2(cs)}`;
  }
  return `${min}:${pad2(sec)}.${pad2(cs)}`;
}

/** Pace / split interval — always m:ss.cc (e.g. 1:20 → 1:20.00, 45 s → 0:45.00) */
export function formatPace(seconds: number): string {
  const { min, sec, cs } = splitSeconds(seconds);
  return `${min}:${pad2(sec)}.${pad2(cs)}`;
}

/** Normalize user input to m:ss.cc after edit */
export function normalizePaceInput(input: string): string | null {
  const sec = parseTime(input);
  if (sec == null || sec <= 0) return null;
  return formatPace(sec);
}
