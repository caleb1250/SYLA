// All SYLA meetings happen in Georgia (US Eastern time). Vercel servers run in
// UTC, so every date shown or computed on the server must name this time zone
// explicitly — otherwise a 6:30 PM meeting renders as 10:30 PM, and a check-in
// made at 9 PM lands on "tomorrow".
export const APP_TIME_ZONE = "America/New_York";

/** YYYY-MM-DD for "today" in the app's time zone. */
export function todayInAppTz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Month (1-12) and day-of-month of an instant, in the app's time zone. */
export function monthDayInAppTz(iso: string): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { month: get("month"), day: get("day") };
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" }) {
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: APP_TIME_ZONE, ...opts });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { timeZone: APP_TIME_ZONE, hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Offset (ms) between the app time zone's wall clock and UTC at a given instant. */
function tzOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Converts a wall-clock value from <input type="datetime-local"> (e.g. "2026-10-02T18:30"),
 * understood as app-time-zone local time, into a UTC ISO string.
 */
export function appLocalToUtcIso(local: string): string {
  const guess = Date.parse(`${local.length === 16 ? `${local}:00` : local}Z`);
  if (Number.isNaN(guess)) throw new Error(`Invalid date: ${local}`);
  const first = guess - tzOffsetMs(guess);
  const second = guess - tzOffsetMs(first);
  return new Date(second).toISOString();
}

// Students can check themselves in from 1 hour before a meeting until 3 hours
// after it starts. Keep in sync with the attendance policy in supabase/migrations.
export const ATTENDANCE_OPENS_BEFORE_MIN = 60;
export const ATTENDANCE_CLOSES_AFTER_MIN = 180;

export type AttendanceWindow = "before" | "open" | "closed";

export function attendanceWindow(startsAt: string, now: number = Date.now()): AttendanceWindow {
  const start = new Date(startsAt).getTime();
  if (now < start - ATTENDANCE_OPENS_BEFORE_MIN * 60_000) return "before";
  if (now > start + ATTENDANCE_CLOSES_AFTER_MIN * 60_000) return "closed";
  return "open";
}
