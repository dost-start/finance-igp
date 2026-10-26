import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CURRENT_VERSION, RELEASES, formatReleaseDate, groupChanges, renderChangelogMarkdown } from "./changelog";

const semver = (v: string) => v.split(".").map(Number);
const newer = (a: string, b: string) => {
  const [x, y] = [semver(a), semver(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

describe("release list", () => {
  it("has valid, unique versions, newest first, with real dates that never go backwards", () => {
    const versions = RELEASES.map((r) => r.version);
    for (const v of versions) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    expect(new Set(versions).size).toBe(versions.length);
    for (let i = 1; i < RELEASES.length; i++) {
      expect(newer(RELEASES[i - 1].version, RELEASES[i].version), `${RELEASES[i - 1].version} must be newer than ${RELEASES[i].version}`).toBeGreaterThan(0);
      expect(RELEASES[i - 1].date >= RELEASES[i].date).toBe(true);
    }
    for (const r of RELEASES) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(r.date))).toBe(false);
    }
  });
  it("describes every release with a title and at least one change in plain words", () => {
    for (const r of RELEASES) {
      expect(r.title.trim().length).toBeGreaterThan(3);
      expect(r.changes.length).toBeGreaterThan(0);
      for (const c of r.changes) {
        expect(c.text.trim().length, `${r.version}: empty change`).toBeGreaterThan(10);
        expect(c.text).not.toMatch(/\bTODO\b|lorem/i);
      }
    }
  });
});

describe("version bookkeeping", () => {
  it("package.json carries the newest release's version", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as { version: string };
    expect(pkg.version, "bump package.json when you add a release").toBe(CURRENT_VERSION);
  });
  it("CHANGELOG.md is exactly what the release list generates (run npm run changelog if this fails)", () => {
    expect(readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8")).toBe(renderChangelogMarkdown());
  });
});

describe("rendering", () => {
  it("writes each release as a heading with its sections in a fixed order", () => {
    const md = renderChangelogMarkdown([{ version: "1.2.3", date: "2026-11-01", title: "Test", changes: [{ kind: "fixed", text: "Fixed something real." }, { kind: "added", text: "Added something new." }] }]);
    expect(md).toContain("## 1.2.3: Test (2026-11-01)");
    expect(md.indexOf("### Added")).toBeLessThan(md.indexOf("### Fixed"));
    expect(md).toContain("- Added something new.");
    expect(md.endsWith("\n")).toBe(true);
  });
  it("groups a release's changes for the admin page and skips empty groups", () => {
    const groups = groupChanges({ version: "1.0.0", date: "2026-11-01", title: "T", changes: [{ kind: "security", text: "Locked a door." }, { kind: "added", text: "Added a door." }] });
    expect(groups.map((g) => g.label)).toEqual(["Added", "Security"]);
  });
  it("writes dates in words", () => {
    expect(formatReleaseDate("2026-10-27")).toBe("October 27, 2026");
    expect(formatReleaseDate("2026-01-05")).toBe("January 5, 2026");
  });
});
