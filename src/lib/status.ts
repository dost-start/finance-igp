import type { OrderStatus } from "@/db/schema";

// Order status rules (PRD FR05.02, Appendix A). Statuses only move forward. Payment
// Confirmation can only be reached by finance's manual verification: OCR never confirms.
export const STATUS_LABEL: Record<OrderStatus, string> = {
  order_received: "Order Received",
  pending_payment: "Pending Payment",
  payment_confirmation: "Payment Confirmation",
  in_production: "In Production",
  out_for_shipping: "Out for Shipping",
  received_successfully: "Received Successfully",
  canceled: "Canceled",
  refund_in_process: "Refund in Process",
  refund_successful: "Refund Successful",
  payment_rejected: "Payment Rejected",
};

const NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  order_received: ["pending_payment"],
  pending_payment: ["payment_confirmation", "payment_rejected"],
  payment_rejected: ["pending_payment"], // after the buyer sends a new receipt through the ticket form
  payment_confirmation: ["in_production", "canceled"], // Canceled only applies once payment was confirmed
  in_production: ["out_for_shipping"],
  out_for_shipping: ["received_successfully"],
  received_successfully: [],
  canceled: ["refund_in_process"],
  refund_in_process: ["refund_successful"],
  refund_successful: [],
};

export const nextStatuses = (from: OrderStatus): readonly OrderStatus[] => NEXT[from];
export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => NEXT[from].includes(to);

// Confirm and reject have their own review actions, so the generic status control skips them.
const REVIEW_ONLY: readonly OrderStatus[] = ["order_received", "pending_payment", "payment_confirmation", "payment_rejected"];
export const generalNextStatuses = (from: OrderStatus): readonly OrderStatus[] => NEXT[from].filter((s) => !REVIEW_ONLY.includes(s));

// Buyers see statuses from Payment Confirmation onward; Order Received and Pending Payment are internal.
export const isBuyerVisible = (s: OrderStatus): boolean => !["order_received", "pending_payment"].includes(s);

// Corrections (PRD FR05.03, FR06.04): fixing a wrong status is allowed and recorded. A correction can
// go back or skip ahead inside the same line of progress, but never into payment checking (that stays
// a manual review) and never between the delivery line and the cancel/refund line (those carry their
// own emails and decisions). It does not email the buyer.
const DELIVERY_LINE: readonly OrderStatus[] = ["payment_confirmation", "in_production", "out_for_shipping", "received_successfully"];
const REFUND_LINE: readonly OrderStatus[] = ["canceled", "refund_in_process", "refund_successful"];

export const correctionTargets = (from: OrderStatus): readonly OrderStatus[] => {
  const line = [DELIVERY_LINE, REFUND_LINE].find((l) => l.includes(from));
  return line ? line.filter((s) => s !== from) : [];
};
export const canCorrect = (from: OrderStatus, to: OrderStatus): boolean => correctionTargets(from).includes(to);

// The dated progress list a buyer sees. After a correction an order may have visited a status that no
// longer applies (shipped by mistake, then put back to In Production), so the list keeps only steps up
// to the order's current status, one line per step, each with the latest time that step was set.
export function buyerTimeline<T extends { status: OrderStatus; at: Date }>(events: T[], current: OrderStatus): T[] {
  const line = REFUND_LINE.includes(current) ? REFUND_LINE : DELIVERY_LINE;
  const limit = line.indexOf(current);
  const keep = (s: OrderStatus) => (REFUND_LINE.includes(s) ? REFUND_LINE.includes(current) && REFUND_LINE.indexOf(s) <= limit : DELIVERY_LINE.includes(s) && (REFUND_LINE.includes(current) || DELIVERY_LINE.indexOf(s) <= limit));
  const latest = new Map<OrderStatus, T>();
  for (const e of events) {
    if (!keep(e.status)) continue;
    const prev = latest.get(e.status);
    if (!prev || e.at >= prev.at) latest.set(e.status, e);
  }
  return [...latest.values()].sort((a, b) => a.at.getTime() - b.at.getTime());
}
