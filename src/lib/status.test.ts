import { describe, expect, it } from "vitest";
import { ORDER_STATUSES } from "@/db/schema";
import { STATUS_LABEL, canTransition, generalNextStatuses, isBuyerVisible, nextStatuses } from "./status";

describe("status rules", () => {
  it("has a label for every status", () => {
    for (const s of ORDER_STATUSES) expect(STATUS_LABEL[s]).toBeTruthy();
  });
  it("follows the happy path in order, one step at a time", () => {
    const path = ["order_received", "pending_payment", "payment_confirmation", "in_production", "out_for_shipping", "received_successfully"] as const;
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i], path[i + 1])).toBe(true);
    expect(canTransition("pending_payment", "in_production")).toBe(false);
    expect(canTransition("in_production", "payment_confirmation")).toBe(false); // never backwards
  });
  it("only reaches Payment Confirmation from Pending Payment", () => {
    for (const s of ORDER_STATUSES) expect(canTransition(s, "payment_confirmation")).toBe(s === "pending_payment");
  });
  it("allows Canceled only after payment was confirmed, then the refund steps", () => {
    for (const s of ORDER_STATUSES) expect(canTransition(s, "canceled")).toBe(s === "payment_confirmation");
    expect(canTransition("canceled", "refund_in_process")).toBe(true);
    expect(canTransition("refund_in_process", "refund_successful")).toBe(true);
    expect(canTransition("canceled", "refund_successful")).toBe(false);
  });
  it("lets a rejected payment come back to Pending Payment", () => {
    expect(nextStatuses("pending_payment")).toContain("payment_rejected");
    expect(canTransition("payment_rejected", "pending_payment")).toBe(true);
  });
  it("has no way out of the final statuses", () => {
    expect(nextStatuses("received_successfully")).toEqual([]);
    expect(nextStatuses("refund_successful")).toEqual([]);
  });
  it("keeps confirm and reject out of the generic status control", () => {
    expect(generalNextStatuses("pending_payment")).toEqual([]);
    expect(generalNextStatuses("payment_confirmation")).toEqual(["in_production", "canceled"]);
    expect(generalNextStatuses("in_production")).toEqual(["out_for_shipping"]);
  });
  it("hides the two internal statuses from buyers", () => {
    expect(isBuyerVisible("order_received")).toBe(false);
    expect(isBuyerVisible("pending_payment")).toBe(false);
    expect(isBuyerVisible("payment_confirmation")).toBe(true);
    expect(isBuyerVisible("payment_rejected")).toBe(true);
  });
});
