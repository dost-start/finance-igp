// The launch date (PRD FR07.03, NF10): one setting that decides whether the landing page shows the
// countdown or the launch view. It is stored in the database and changed from the admin area, so a
// date change needs no rebuild. Manila has no daylight saving, so it is always UTC+8.
export const LAUNCH_KEY = "launch_at";
// 13 November 2026 is the planned launch day (docs/sprint-plan.md). Finance has not given a time of day,
// so the day starts at midnight Manila time; it is a setting, not a fixed fact.
export const DEFAULT_LAUNCH_AT = "2026-11-13T00:00:00+08:00";
const MIN_YEAR = 2026;
const MAX_YEAR = 2030;

const MANILA_MS = 8 * 3_600_000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// A stored value that is missing or not a real date falls back to the planned date.
export function parseLaunchAt(value: string | null | undefined): string {
  if (!value) return DEFAULT_LAUNCH_AT;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return DEFAULT_LAUNCH_AT;
  const year = new Date(ms).getUTCFullYear();
  return year >= MIN_YEAR && year <= MAX_YEAR ? value : DEFAULT_LAUNCH_AT;
}

// Has launch time arrived? (A helper so screens do not read the clock themselves.)
export const hasLaunched = (iso: string, nowMs: number = Date.now()): boolean => launchMs(iso) <= nowMs;

export const launchMs = (iso: string): number => Date.parse(parseLaunchAt(iso));

// From the admin date-and-time box ("2026-11-13T00:00", typed in Manila time) to a stored value.
export function manilaInputToIso(input: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input.trim());
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+08:00`;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  // Date.parse rolls impossible dates over (31 February): require the parts to come back unchanged.
  if (isoToManilaInput(iso) !== `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`) return null;
  const year = Number(m[1]);
  return year >= MIN_YEAR && year <= MAX_YEAR ? iso : null;
}

// And back, for the box's current value.
export function isoToManilaInput(iso: string): string {
  return new Date(launchMs(iso) + MANILA_MS).toISOString().slice(0, 16);
}

export function formatLaunch(iso: string): string {
  const d = new Date(launchMs(iso) + MANILA_MS);
  const h = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} at ${h % 12 === 0 ? 12 : h % 12}:${minutes} ${h < 12 ? "AM" : "PM"} (Manila time)`;
}

export type Countdown = { done: boolean; days: number; hours: number; minutes: number; seconds: number };

export function countdown(targetMs: number, nowMs: number): Countdown {
  const left = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return { done: targetMs <= nowMs, days: Math.floor(left / 86_400), hours: Math.floor((left % 86_400) / 3600), minutes: Math.floor((left % 3600) / 60), seconds: left % 60 };
}

// A sentence for screen readers, changing once a minute instead of every second.
export function countdownSentence(c: Countdown): string {
  if (c.done) return "The store is open.";
  const part = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  return `Opens in ${part(c.days, "day")}, ${part(c.hours, "hour")} and ${part(c.minutes, "minute")}.`;
}
