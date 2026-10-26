import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDE, renderGuideMarkdown } from "./guide";

describe("finance guide", () => {
  it("has unique sections that each explain themselves in a few steps", () => {
    expect(new Set(GUIDE.map((s) => s.id)).size).toBe(GUIDE.length);
    for (const s of GUIDE) {
      expect(s.title.length, s.id).toBeGreaterThan(3);
      expect(s.summary.length, s.id).toBeGreaterThan(10);
      expect(s.steps.length, s.id).toBeGreaterThan(0);
      for (const step of s.steps) expect(step.trim().length, `${s.id}: empty step`).toBeGreaterThan(10);
    }
  });
  it("leads with the two-minute status update and fits it in four steps", () => {
    expect(GUIDE[0].id).toBe("quick-status");
    expect(GUIDE[0].steps).toHaveLength(4);
  });
  it("covers every job the demo asks finance to be able to do", () => {
    const ids = GUIDE.map((s) => s.id);
    for (const need of ["confirm", "reject", "quick-status", "bulk", "cancel-refund", "correct", "export", "audit", "emails", "store-launch", "problems"]) expect(ids, need).toContain(need);
  });
  it("states the values finance gave, matching the settings in the code", () => {
    expect(GUIDE.find((s) => s.id === "reject")?.steps.join(" ")).toContain("48 hours");
  });
  it("matches docs/finance-guide.md exactly (run npm run guide if this fails)", () => {
    expect(readFileSync(join(process.cwd(), "docs", "finance-guide.md"), "utf8")).toBe(renderGuideMarkdown());
  });
});
