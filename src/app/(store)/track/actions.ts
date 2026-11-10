"use server";

import { headers } from "next/headers";
import { isBlocked, orderKey, recordFailure, TRACK_MAX_PER_ORDER, TRACK_MAX_PER_VISITOR, visitorKey, type LimitRule } from "@/lib/rate-limit";
import { dbLimitStore, trackByDetails } from "@/lib/track";
import { visitorAddress } from "@/lib/visitor";
import { trackFormSchema, type TrackedOrder } from "@/lib/tracking-view";

export type TrackState = { ok: true; order: TrackedOrder } | { ok: false; message: string; values: { orderId: string; last4: string } };

// One message for "no such order", "wrong digits" and "not confirmed yet", so the form cannot be
// used to find out which Order IDs exist.
const NOT_FOUND = "We could not find an order with those details. Check your Order ID and the last 4 digits of the contact number you used at checkout.";
const TOO_MANY = "Too many tries. Please wait 15 minutes, or open the tracking link in your confirmation email.";

export async function lookupOrder(_prev: TrackState | null, formData: FormData): Promise<TrackState> {
  const values = { orderId: String(formData.get("orderId") ?? ""), last4: String(formData.get("last4") ?? "") };
  const parsed = trackFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? NOT_FOUND, values };

  try {
    const h = await headers();
    const address = visitorAddress(h);
    const rules: LimitRule[] = [
      { key: visitorKey(address), max: TRACK_MAX_PER_VISITOR },
      { key: orderKey(parsed.data.orderId), max: TRACK_MAX_PER_ORDER },
    ];
    const store = dbLimitStore();
    if (await isBlocked(store, rules)) return { ok: false, message: TOO_MANY, values };

    const order = await trackByDetails(parsed.data.orderId, parsed.data.last4);
    if (!order) {
      await recordFailure(store, rules);
      return { ok: false, message: NOT_FOUND, values };
    }
    return { ok: true, order };
  } catch {
    console.error("lookupOrder failed");
    return { ok: false, message: "Something went wrong. Please try again in a moment.", values };
  }
}
