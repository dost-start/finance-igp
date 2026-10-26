import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { OrderStatus } from "@/db/schema";
import { ORDER_ID_PATTERN } from "./order-id";

// What the buyer sees on the tracking page: the current status and a dated timeline, nothing else
// (no name, address, items or payment details).
export const BUYER_STATUS_TEXT: Partial<Record<OrderStatus, string>> = {
  payment_confirmation: "Finance confirmed your payment. Your order will move into production soon.",
  in_production: "Your merchandise is being made.",
  out_for_shipping: "Your order is on its way to you.",
  received_successfully: "Your order was received. Thank you for supporting START: COLLECTIONS.",
  canceled: "This order was canceled.",
  refund_in_process: "Your refund is being processed.",
  refund_successful: "Your refund has been sent.",
};

// Order Received, Pending Payment and Payment Rejected happen before the buyer has an Order ID, so they never show.
const TIMELINE: readonly OrderStatus[] = ["payment_confirmation", "in_production", "out_for_shipping", "received_successfully", "canceled", "refund_in_process", "refund_successful"];
export const isTimelineStatus = (s: OrderStatus): boolean => TIMELINE.includes(s);

export const TOKEN_SHAPE = /^[0-9a-f]{64}$/;

export const trackFormSchema = z.object({
  orderId: z
    .string()
    .trim()
    .toUpperCase()
    .regex(ORDER_ID_PATTERN, "Enter your Order ID the way it appears in your email, like R13000001."),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter the last 4 digits of your contact number."),
});

// Constant-time comparison so the response time does not reveal how many digits were right.
export function last4Matches(stored: string, typed: string): boolean {
  const a = Buffer.from(stored.padEnd(4, "#").slice(0, 4));
  const b = Buffer.from(typed.padEnd(4, "!").slice(0, 4));
  return timingSafeEqual(a, b) && stored.length === 4 && typed.length === 4;
}

export type TrackedOrder = {
  orderId: string;
  status: OrderStatus;
  text: string;
  timeline: { status: OrderStatus; at: string }[];
};
