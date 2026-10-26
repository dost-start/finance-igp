import { describe, expect, it } from "vitest";
import { REGIONS, isRegionCode } from "./regions";

describe("regions (PRD Appendix E)", () => {
  it("has the 18 PSGC region codes, unique and two digits", () => {
    expect(REGIONS).toHaveLength(18);
    const codes = REGIONS.map((r) => r.code);
    expect(new Set(codes).size).toBe(18);
    expect(codes.every((c) => /^\d{2}$/.test(c))).toBe(true);
  });
  it("maps 13 to NCR, 16 to Caraga, and has no code 15", () => {
    expect(REGIONS.find((r) => r.code === "13")?.name).toContain("NCR");
    expect(REGIONS.find((r) => r.code === "16")?.name).toContain("Caraga");
    expect(isRegionCode("15")).toBe(false);
  });
});
