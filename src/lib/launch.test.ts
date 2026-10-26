import { describe, expect, it } from "vitest";
import { DEFAULT_LAUNCH_AT, countdown, countdownSentence, formatLaunch, isoToManilaInput, launchMs, manilaInputToIso, parseLaunchAt } from "./launch";

describe("launch date setting", () => {
  it("falls back to the planned date when missing, broken or out of range", () => {
    for (const bad of [null, undefined, "", "soon", "2020-01-01T00:00:00+08:00", "2032-06-01T00:00:00+08:00"]) expect(parseLaunchAt(bad as string | null | undefined)).toBe(DEFAULT_LAUNCH_AT);
    expect(parseLaunchAt("2026-12-01T09:00:00+08:00")).toBe("2026-12-01T09:00:00+08:00");
  });
  it("plans for 13 November 2026 at the start of the day in Manila", () => {
    expect(DEFAULT_LAUNCH_AT).toBe("2026-11-13T00:00:00+08:00");
    expect(launchMs(DEFAULT_LAUNCH_AT)).toBe(Date.UTC(2026, 10, 12, 16, 0, 0));
  });
});

describe("Manila time conversion", () => {
  it("turns the admin box value into a stored value and back", () => {
    expect(manilaInputToIso("2026-11-13T00:00")).toBe("2026-11-13T00:00:00+08:00");
    expect(manilaInputToIso("2026-11-13T18:30")).toBe("2026-11-13T18:30:00+08:00");
    expect(isoToManilaInput("2026-11-13T18:30:00+08:00")).toBe("2026-11-13T18:30");
    expect(isoToManilaInput("2026-11-12T16:00:00Z")).toBe("2026-11-13T00:00");
  });
  it("refuses things that are not a real moment", () => {
    for (const bad of ["", "tomorrow", "2026-13-01T00:00", "2026-02-31T10:00", "2026-11-13", "2026-11-13T25:00", "2019-11-13T00:00", "2035-11-13T00:00"]) expect(manilaInputToIso(bad), bad).toBeNull();
  });
  it("writes the date in words with a 12-hour clock", () => {
    expect(formatLaunch("2026-11-13T00:00:00+08:00")).toBe("November 13, 2026 at 12:00 AM (Manila time)");
    expect(formatLaunch("2026-11-13T12:05:00+08:00")).toBe("November 13, 2026 at 12:05 PM (Manila time)");
    expect(formatLaunch("2026-12-01T18:45:00+08:00")).toBe("December 1, 2026 at 6:45 PM (Manila time)");
  });
});

describe("countdown", () => {
  const target = Date.UTC(2026, 10, 12, 16, 0, 0);
  it("splits the time left into days, hours, minutes and seconds", () => {
    expect(countdown(target, target - (2 * 86_400 + 3 * 3600 + 4 * 60 + 5) * 1000)).toEqual({ done: false, days: 2, hours: 3, minutes: 4, seconds: 5 });
  });
  it("is done at the moment of launch and after, and never goes negative", () => {
    expect(countdown(target, target)).toEqual({ done: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(countdown(target, target + 99_999).done).toBe(true);
    expect(countdown(target, target - 999).done).toBe(false);
  });
  it("says it for screen readers without the seconds", () => {
    expect(countdownSentence({ done: false, days: 1, hours: 1, minutes: 1, seconds: 30 })).toBe("Opens in 1 day, 1 hour and 1 minute.");
    expect(countdownSentence({ done: false, days: 12, hours: 0, minutes: 5, seconds: 0 })).toBe("Opens in 12 days, 0 hours and 5 minutes.");
    expect(countdownSentence({ done: true, days: 0, hours: 0, minutes: 0, seconds: 0 })).toBe("The store is open.");
  });
});
