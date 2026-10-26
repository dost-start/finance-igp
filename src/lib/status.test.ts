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

import { buyerTimeline, canCorrect, correctionTargets } from "./status";

describe("corrections", () => {
  it("allow moving back or skipping ahead inside the delivery line", () => {
    expect(correctionTargets("out_for_shipping")).toEqual(["payment_confirmation", "in_production", "received_successfully"]);
    expect(canCorrect("received_successfully", "in_production")).toBe(true);
    expect(canCorrect("in_production", "received_successfully")).toBe(true);
  });
  it("allow moving back inside the cancel and refund line", () => {
    expect(correctionTargets("refund_successful")).toEqual(["canceled", "refund_in_process"]);
    expect(canCorrect("refund_in_process", "canceled")).toBe(true);
  });
  it("never reach payment checking or cross between the two lines", () => {
    for (const s of ["order_received", "pending_payment", "payment_rejected"] as const) {
      expect(canCorrect("in_production", s)).toBe(false);
      expect(correctionTargets(s)).toEqual([]);
    }
    expect(canCorrect("in_production", "canceled")).toBe(false);
    expect(canCorrect("canceled", "in_production")).toBe(false);
    expect(canCorrect("in_production", "in_production")).toBe(false);
  });
});

describe("buyer timeline", () => {
  const at = (h: number) => new Date(Date.UTC(2026, 10, 13, h));
  it("lists the steps in order with their dates", () => {
    const t = buyerTimeline(
      [
        { status: "payment_confirmation" as const, at: at(1) },
        { status: "in_production" as const, at: at(2) },
      ],
      "in_production",
    );
    expect(t.map((e) => e.status)).toEqual(["payment_confirmation", "in_production"]);
  });
  it("drops a step that was set by mistake and corrected away", () => {
    const t = buyerTimeline(
      [
        { status: "payment_confirmation" as const, at: at(1) },
        { status: "in_production" as const, at: at(2) },
        { status: "out_for_shipping" as const, at: at(3) },
        { status: "in_production" as const, at: at(4) }, // correction back
      ],
      "in_production",
    );
    expect(t.map((e) => [e.status, e.at.getUTCHours()])).toEqual([
      ["payment_confirmation", 1],
      ["in_production", 4],
    ]);
  });
  it("shows the cancel and refund steps after cancel, with the confirmed payment before them", () => {
    const t = buyerTimeline(
      [
        { status: "payment_confirmation" as const, at: at(1) },
        { status: "canceled" as const, at: at(2) },
        { status: "refund_in_process" as const, at: at(3) },
      ],
      "refund_in_process",
    );
    expect(t.map((e) => e.status)).toEqual(["payment_confirmation", "canceled", "refund_in_process"]);
  });
  it("hides a refund step that was corrected away", () => {
    const t = buyerTimeline(
      [
        { status: "payment_confirmation" as const, at: at(1) },
        { status: "canceled" as const, at: at(2) },
        { status: "refund_in_process" as const, at: at(3) },
        { status: "refund_successful" as const, at: at(4) },
        { status: "refund_in_process" as const, at: at(5) },
      ],
      "refund_in_process",
    );
    expect(t.map((e) => e.status)).toEqual(["payment_confirmation", "canceled", "refund_in_process"]);
  });
  it("ignores steps buyers never see", () => {
    const t = buyerTimeline([{ status: "pending_payment" as const, at: at(1) }, { status: "payment_confirmation" as const, at: at(2) }], "payment_confirmation");
    expect(t.map((e) => e.status)).toEqual(["payment_confirmation"]);
  });
});
