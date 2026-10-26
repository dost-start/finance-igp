import { describe, expect, it } from "vitest";
import { formatPeso, lineTotal } from "./money";

describe("money", () => {
  it("formats whole pesos without decimals and keeps centavos when present", () => {
    expect(formatPeso(45000)).toBe("₱450");
    expect(formatPeso(45050)).toBe("₱450.50");
  });
  it("multiplies in integer centavos", () => {
    expect(lineTotal(3000, 4)).toBe(12000);
  });
  it("rejects bad input", () => {
    expect(() => lineTotal(3000, 0)).toThrow();
    expect(() => lineTotal(30.5, 1)).toThrow();
  });
});
