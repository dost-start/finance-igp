// Day grouping for the admin logs. Days are Manila days (the team's time), whatever the server's clock says.
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
const NICE = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric", year: "numeric" });
const TIME = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

const dayKey = (d: Date) => DAY.format(d); // "2026-11-03", sorts and compares as text

export function formatManilaTime(d: Date): string {
  return TIME.format(d);
}

// "Today", "Yesterday", or "Tue, Nov 3, 2026".
export function dayLabel(d: Date, now: Date = new Date()): string {
  const key = dayKey(d);
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(new Date(now.getTime() - 86_400_000))) return "Yesterday";
  return NICE.format(d);
}

// Splits rows (already newest first) into one group per day, keeping their order.
export function groupByDay<T>(rows: T[], at: (row: T) => Date, now: Date = new Date()): { key: string; label: string; rows: T[] }[] {
  const groups: { key: string; label: string; rows: T[] }[] = [];
  for (const row of rows) {
    const d = at(row);
    const key = dayKey(d);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, label: dayLabel(d, now), rows: [row] });
  }
  return groups;
}
