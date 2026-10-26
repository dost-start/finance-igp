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
