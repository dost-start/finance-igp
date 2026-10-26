import { describe, expect, it } from "vitest";
import { BUYER_STATUS_TEXT, isTimelineStatus, last4Matches, TOKEN_SHAPE, trackFormSchema } from "./tracking-view";

describe("tracking form", () => {
  it("accepts an Order ID and 4 digits, tidying case and spaces", () => {
    const r = trackFormSchema.safeParse({ orderId: "  r13000001 ", last4: " 1234 " });
    expect(r.success && r.data).toEqual({ orderId: "R13000001", last4: "1234" });
  });
  it("rejects anything that is not an Order ID or not exactly 4 digits", () => {
    for (const orderId of ["", "13000001", "R1300001", "R130000012", "R13-000001"]) {
      expect(trackFormSchema.safeParse({ orderId, last4: "1234" }).success).toBe(false);
    }
    for (const last4 of ["", "123", "12345", "12a4", "+123"]) {
      expect(trackFormSchema.safeParse({ orderId: "R13000001", last4 }).success).toBe(false);
    }
  });
});

describe("last4Matches", () => {
  it("matches only the exact 4 digits", () => {
    expect(last4Matches("1234", "1234")).toBe(true);
    expect(last4Matches("1234", "1235")).toBe(false);
    expect(last4Matches("1234", "123")).toBe(false);
    expect(last4Matches("1234", "12345")).toBe(false);
    expect(last4Matches("1234", "")).toBe(false);
  });
  it("never matches when the stored value is not 4 characters", () => {
    expect(last4Matches("", "")).toBe(false);
    expect(last4Matches("12", "12##")).toBe(false);
  });
});

describe("buyer view", () => {
  it("hides the steps that happen before the buyer has an Order ID", () => {
    for (const s of ["order_received", "pending_payment", "payment_rejected"] as const) expect(isTimelineStatus(s)).toBe(false);
    for (const s of ["payment_confirmation", "in_production", "out_for_shipping", "received_successfully", "canceled", "refund_in_process", "refund_successful"] as const) {
      expect(isTimelineStatus(s)).toBe(true);
      expect(BUYER_STATUS_TEXT[s]).toBeTruthy();
    }
  });
  it("accepts only 64 lowercase hex characters as a tracking token", () => {
    expect(TOKEN_SHAPE.test("a".repeat(64))).toBe(true);
    for (const t of ["", "a".repeat(63), "a".repeat(65), "A".repeat(64), `${"a".repeat(63)}g`, "../admin"]) expect(TOKEN_SHAPE.test(t)).toBe(false);
  });
});
