import { describe, expect, it } from "vitest";
import { DEMO_ORDERS, DEMO_EMAIL_MARK, DEMO_NAME_PREFIX, hasTrackingToken, historyFor, isDemoOrder } from "./demo-data";
import { canTransition } from "./status";
import { isRegionCode } from "./regions";

describe("demo orders", () => {
  it("cover every situation the admin screens are built for", () => {
    const statuses = new Set(DEMO_ORDERS.map((o) => o.status));
    for (const s of ["order_received", "pending_payment", "payment_confirmation", "in_production", "out_for_shipping", "received_successfully", "canceled", "refund_in_process", "payment_rejected"]) expect(statuses.has(s as never), s).toBe(true);
    const waiting = DEMO_ORDERS.filter((o) => o.status === "pending_payment");
    for (const k of ["match", "mismatch", "unreadable"]) expect(waiting.some((o) => o.ocr === k), k).toBe(true);
  });
  it("include a reused reference number, claimed by two different orders", () => {
    const refs = DEMO_ORDERS.filter((o) => o.reference).map((o) => o.reference);
    expect(refs.length - new Set(refs).size).toBe(1);
  });
  it("use real regions, real product slugs and distinct names", () => {
    for (const o of DEMO_ORDERS) expect(isRegionCode(o.region), o.name).toBe(true);
    expect(new Set(DEMO_ORDERS.map((o) => o.name)).size).toBe(DEMO_ORDERS.length);
    for (const o of DEMO_ORDERS) expect(o.items.length, o.name).toBeGreaterThan(0);
  });
  it("only describe a payment where one was submitted", () => {
    for (const o of DEMO_ORDERS) {
      const submitted = o.status !== "order_received";
      expect(Boolean(o.reference && o.channel && o.ocr), `${o.name}`).toBe(submitted);
    }
  });
  it("tell a history that follows the real status rules", () => {
    for (const o of DEMO_ORDERS) {
      const h = historyFor(o.status);
      expect(h.at(-1), o.name).toBe(o.status);
      for (let i = 1; i < h.length; i++) expect(canTransition(h[i - 1], h[i]), `${o.name}: ${h[i - 1]} to ${h[i]}`).toBe(true);
    }
  });
  it("are recognisable, so cleanup can never touch a real order", () => {
    expect(DEMO_NAME_PREFIX).toBe("DEMO ");
    expect(isDemoOrder("DEMO Ana Reyes", "owner+demo@gmail.com")).toBe(true);
    expect(isDemoOrder("Ana Reyes", "owner+demo@gmail.com")).toBe(false); // a real buyer, even with that email
    expect(isDemoOrder("DEMO Ana Reyes", "ana@gmail.com")).toBe(false);
    expect(DEMO_EMAIL_MARK).toBe("+demo@");
  });
  it("give a tracking token only once payment was confirmed", () => {
    expect(hasTrackingToken("pending_payment")).toBe(false);
    expect(hasTrackingToken("payment_rejected")).toBe(false);
    expect(hasTrackingToken("in_production")).toBe(true);
    expect(hasTrackingToken("refund_in_process")).toBe(true);
  });
});
