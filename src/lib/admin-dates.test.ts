import { describe, expect, it } from "vitest";
import { dayLabel, formatManilaTime, groupByDay } from "./admin-dates";

// Manila is UTC+8, so 2026-11-03T16:30Z is already Nov 4 at 12:30 AM there.
const now = new Date("2026-11-11T04:00:00Z"); // Nov 11, noon in Manila

describe("admin day grouping", () => {
  it("labels today, yesterday and older days by the Manila date", () => {
    expect(dayLabel(new Date("2026-11-11T00:30:00Z"), now)).toBe("Today");
    expect(dayLabel(new Date("2026-11-10T03:00:00Z"), now)).toBe("Yesterday");
    expect(dayLabel(new Date("2026-11-03T02:27:00Z"), now)).toContain("Nov 3, 2026");
    expect(dayLabel(new Date("2026-11-03T16:30:00Z"), now)).toContain("Nov 4, 2026");
  });
  it("shows just the time of day", () => {
    expect(formatManilaTime(new Date("2026-11-03T02:27:00Z"))).toMatch(/10:27\s?am/i);
  });
  it("groups consecutive rows of the same day and keeps the order", () => {
    const rows = [
      { id: 1, at: new Date("2026-11-11T03:00:00Z") },
      { id: 2, at: new Date("2026-11-11T01:00:00Z") },
      { id: 3, at: new Date("2026-11-03T02:00:00Z") },
    ];
    const g = groupByDay(rows, (r) => r.at, now);
    expect(g.map((x) => [x.label === "Today", x.rows.map((r) => r.id)])).toEqual([
      [true, [1, 2]],
      [false, [3]],
    ]);
  });
});
