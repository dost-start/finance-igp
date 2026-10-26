import { describe, expect, it } from "vitest";
import { KEEP_BACKUPS, agoText, backupFileName, backupsToDelete, isStale, parseLastBackup } from "./backup-plan";

describe("backup file names", () => {
  it("use Manila time, so a night-time backup carries the Manila date", () => {
    expect(backupFileName(new Date("2026-11-12T18:00:00Z"))).toBe("backup-2026-11-13-0200.json.gz");
    expect(backupFileName(new Date("2026-11-13T03:05:00Z"))).toBe("backup-2026-11-13-1105.json.gz");
  });
});

describe("keeping the newest backups", () => {
  const make = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `backup-2026-11-${String(i + 1).padStart(2, "0")}-0200.json.gz`, createdAt: `2026-11-${String(i + 1).padStart(2, "0")}T18:00:00Z` }));
  it("deletes only what is beyond the newest fourteen, oldest first to go", () => {
    const gone = backupsToDelete(make(17));
    expect(gone).toHaveLength(17 - KEEP_BACKUPS);
    expect(gone.map((f) => f.name)).toEqual(["backup-2026-11-03-0200.json.gz", "backup-2026-11-02-0200.json.gz", "backup-2026-11-01-0200.json.gz"]);
  });
  it("deletes nothing while there are fourteen or fewer", () => {
    expect(backupsToDelete(make(14))).toEqual([]);
    expect(backupsToDelete([])).toEqual([]);
  });
  it("never touches a file that is not one of our backups, such as a receipt or QR image", () => {
    const mixed = [...make(16), { name: "R13000001.jpg", createdAt: "2020-01-01T00:00:00Z" }, { name: "qr-gcash.jpg", createdAt: "2020-01-01T00:00:00Z" }, { name: "backup-notes.txt", createdAt: "2020-01-01T00:00:00Z" }];
    const gone = backupsToDelete(mixed).map((f) => f.name);
    expect(gone).toHaveLength(2);
    expect(gone.every((n) => n.startsWith("backup-2026"))).toBe(true);
  });
});

describe("last backup record", () => {
  it("reads a good record and refuses a broken one", () => {
    const rec = { at: "2026-11-13T18:00:00Z", file: "backup-x.json.gz", bytes: 1234, counts: { orders: 3 } };
    expect(parseLastBackup(JSON.stringify(rec))).toEqual(rec);
    for (const bad of [null, "", "not json", "{}", JSON.stringify({ ...rec, bytes: "big" }), JSON.stringify({ ...rec, counts: null })]) expect(parseLastBackup(bad as string | null)).toBeNull();
  });
  it("says how fresh it is in plain words", () => {
    const now = Date.parse("2026-11-13T18:00:00Z");
    expect(agoText("2026-11-13T17:59:30Z", now)).toBe("just now");
    expect(agoText("2026-11-13T17:15:00Z", now)).toBe("45 minutes ago");
    expect(agoText("2026-11-13T09:00:00Z", now)).toBe("9 hours ago");
    expect(agoText("2026-11-10T18:00:00Z", now)).toBe("3 days ago");
  });
  it("calls a backup stale after 30 hours, which means a night was missed", () => {
    const now = Date.parse("2026-11-14T06:00:00Z");
    expect(isStale("2026-11-13T18:00:00Z", now)).toBe(false);
    expect(isStale("2026-11-12T06:00:00Z", now)).toBe(true);
  });
});
