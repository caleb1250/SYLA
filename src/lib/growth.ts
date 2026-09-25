import type { DailyCheckin } from "@/lib/types";

// Pure helpers for streaks and the monthly activity calendar.
// All dates are YYYY-MM-DD strings in the app time zone (see lib/date.ts),
// so arithmetic is done on UTC midnights to avoid DST surprises.

export type CheckinRow = Pick<DailyCheckin, "checkin_date" | "bible_reading" | "meditation" | "memorization" | "pray_note">;

export const CHECKIN_ITEMS = 4;

export function checkedCount(c: CheckinRow): number {
  return Number(c.bible_reading) + Number(c.meditation) + Number(c.memorization) + Number(c.pray_note);
}

function toUtc(d: string): number {
  return Date.parse(`${d}T00:00:00Z`);
}

export function addDays(d: string, n: number): string {
  return new Date(toUtc(d) + n * 86_400_000).toISOString().slice(0, 10);
}

/** Map of date → number of items checked (only days with ≥ 1). */
export function activityByDay(rows: CheckinRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const n = checkedCount(r);
    if (n > 0) m.set(r.checkin_date, n);
  }
  return m;
}

export type Streaks = {
  /** Consecutive active days ending yesterday — today can still extend it. */
  untilYesterday: number;
  todayActive: boolean;
  /** Current streak including today if today is already checked. */
  current: number;
  best: number;
};

export function computeStreaks(active: Map<string, number>, today: string): Streaks {
  let untilYesterday = 0;
  for (let d = addDays(today, -1); active.has(d); d = addDays(d, -1)) untilYesterday++;
  const todayActive = active.has(today);

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of [...active.keys()].sort()) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  return { untilYesterday, todayActive, current: untilYesterday + (todayActive ? 1 : 0), best };
}

export type MonthView = {
  key: string; // YYYY-MM
  year: number;
  month: number; // 1-12
  prevKey: string;
  nextKey: string | null; // null when the next month is in the future
  /** Weeks (Sunday first); null for padding cells outside the month. */
  weeks: (string | null)[][];
};

function monthKey(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function monthView(requested: string | undefined, today: string): MonthView {
  const [ty, tm] = today.split("-").map(Number);
  let year = ty;
  let month = tm;
  const match = requested?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    // never show a future month
    if (m >= 1 && m <= 12 && (y < ty || (y === ty && m <= tm))) {
      year = y;
      month = m;
    }
  }

  const first = monthKey(year, month) + "-01";
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = new Date(toUtc(first)).getUTCDay();

  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${monthKey(year, month)}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prev = month === 1 ? monthKey(year - 1, 12) : monthKey(year, month - 1);
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  const nextKey = nextY < ty || (nextY === ty && nextM <= tm) ? monthKey(nextY, nextM) : null;

  return { key: monthKey(year, month), year, month, prevKey: prev, nextKey, weeks };
}
