import { describe, expect, it } from "vitest";
import { AUDIT_ACTIONS, auditLabel, describeAudit, isAuditAction } from "./audit";
import { changedFields, MAX_SIZES, parseProductEdit, pesosToCentavos } from "./product-edit";
import { STORE_CLOSED_MESSAGE, parseLocked } from "./store-lock";

describe("pesosToCentavos", () => {
  it("reads typed prices", () => {
    expect(pesosToCentavos("450")).toBe(45000);
    expect(pesosToCentavos("450.5")).toBe(45050);
    expect(pesosToCentavos("1,250.75")).toBe(125075);
    expect(pesosToCentavos("₱ 99")).toBe(9900);
    expect(pesosToCentavos("PHP 99.00")).toBe(9900);
  });
  it("rejects nonsense, zero, negative, too many decimals and absurd prices", () => {
    for (const bad of ["", "abc", "0", "0.50", "-5", "12.345", "1e3", "999999999", "100000.01"]) expect(pesosToCentavos(bad), bad).toBeNull();
    expect(pesosToCentavos("100000")).toBe(10_000_000);
  });
});

describe("parseProductEdit", () => {
  const ok = { name: "START Tee", price: "450", active: true, sizesJson: JSON.stringify([{ size: "S", available: true }, { size: "M", available: false }]) };
  it("accepts a good edit and returns centavos and trimmed names", () => {
    const r = parseProductEdit({ ...ok, name: "  START Tee  ", sizesJson: JSON.stringify([{ size: " S ", available: true }]) });
    expect(r).toEqual({ ok: true, data: { name: "START Tee", priceCentavos: 45000, active: true, sizes: [{ size: "S", available: true }] } });
  });
  it("explains each problem in plain words", () => {
    const r = parseProductEdit({ name: "x", price: "free", active: true, sizesJson: "[]" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toContain("product name");
      expect(r.errors.price).toContain("price in pesos");
      expect(r.errors.sizes).toContain("at least one size");
    }
  });
  it("rejects duplicate sizes ignoring case, blank names and too many sizes", () => {
    const dup = parseProductEdit({ ...ok, sizesJson: JSON.stringify([{ size: "M", available: true }, { size: "m", available: true }]) });
    expect(!dup.ok && dup.errors.sizes).toContain("once");
    const blank = parseProductEdit({ ...ok, sizesJson: JSON.stringify([{ size: "  ", available: true }]) });
    expect(!blank.ok && blank.errors.sizes).toContain("needs a name");
    const many = parseProductEdit({ ...ok, sizesJson: JSON.stringify(Array.from({ length: MAX_SIZES + 1 }, (_, i) => ({ size: `S${i}`, available: true }))) });
    expect(many.ok).toBe(false);
  });
  it("survives broken size data", () => {
    const r = parseProductEdit({ ...ok, sizesJson: "{not json" });
    expect(!r.ok && r.errors.sizes).toContain("could not be read");
  });
});

describe("changedFields", () => {
  const base = { name: "A", priceCentavos: 100, active: true, sizes: [{ size: "S", available: true }] };
  it("lists only what changed, for the audit log", () => {
    expect(changedFields(base, base)).toEqual([]);
    expect(changedFields(base, { ...base, name: "B", priceCentavos: 200 })).toEqual(["name", "price"]);
    expect(changedFields(base, { ...base, active: false })).toEqual(["taken off sale"]);
    expect(changedFields({ ...base, active: false }, base)).toEqual(["put on sale"]);
    expect(changedFields(base, { ...base, sizes: [{ size: "S", available: false }] })).toEqual(["sizes"]);
  });
});

describe("audit descriptions", () => {
  it("names every action in plain words", () => {
    for (const a of AUDIT_ACTIONS) expect(auditLabel(a)).not.toBe(a);
    expect(isAuditAction("status.change")).toBe(true);
    expect(isAuditAction("drop.tables")).toBe(false);
    expect(auditLabel("something.new")).toBe("something.new");
  });
  it("describes status changes and corrections with their note or reason", () => {
    expect(describeAudit("status.change", { status: "payment_confirmation" }, { status: "in_production", note: "Batch 1" })).toBe("Payment Confirmation to In Production, note: Batch 1");
    expect(describeAudit("status.correction", { status: "refund_successful" }, { status: "refund_in_process", reason: "Clicked too early" })).toBe("Refund Successful to Refund in Process, reason: Clicked too early");
    expect(describeAudit("status.change", { status: "in_production" }, { status: "out_for_shipping", note: null })).toBe("In Production to Out for Shipping");
  });
  it("describes rejects, exports, product edits and the store lock", () => {
    expect(describeAudit("payment.reject", null, { reason: "Incorrect amount" })).toBe("Reason: Incorrect amount");
    expect(describeAudit("orders.export", null, { rows: 12, filters: "?ocr=mismatch" })).toBe("12 orders, filters ?ocr=mismatch");
    expect(describeAudit("orders.export", null, { rows: 3, filters: "(none)" })).toBe("3 orders, no filters");
    expect(describeAudit("product.update", { name: "Tee" }, { name: "Tee", changed: ["price", "sizes"] })).toBe("Tee: changed price, sizes");
    expect(describeAudit("store.lock", null, null)).toContain("No new orders");
    expect(describeAudit("store.unlock", null, null)).toContain("open again");
  });
  it("copes with missing or odd data", () => {
    expect(describeAudit("status.change", null, null)).toBe("");
    expect(describeAudit("product.update", null, { changed: "oops" })).toBe("");
    expect(describeAudit("unknown.action", { a: 1 }, { b: 2 })).toBe("");
  });
});

describe("store lock", () => {
  it("reads the saved flag strictly", () => {
    expect(parseLocked("true")).toBe(true);
    for (const v of ["false", "", "TRUE", "1", null, undefined]) expect(parseLocked(v as string | null | undefined)).toBe(false);
  });
  it("has a friendly closed message that names both orders and payments", () => {
    expect(STORE_CLOSED_MESSAGE).toContain("orders");
    expect(STORE_CLOSED_MESSAGE).toContain("payments");
  });
});
