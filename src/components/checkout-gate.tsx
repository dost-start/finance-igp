"use client";

import type { ReactNode } from "react";
import { StoreClosed } from "@/components/store-closed";
import { useStoreLocked } from "@/lib/use-store-locked";

// Shows the friendly closed message in place of the checkout form while the store is closed. If the
// answer is slow or missing the form shows as usual: placing the order is refused on the server anyway.
export function CheckoutGate({ children }: { children: ReactNode }) {
  return useStoreLocked() === true ? <StoreClosed /> : children;
}
