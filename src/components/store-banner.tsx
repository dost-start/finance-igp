"use client";

import { useStoreLocked } from "@/lib/use-store-locked";
import { STORE_CLOSED_MESSAGE } from "@/lib/store-lock";

// A strip across every shop page while the store is closed. It appears a moment after the page
// opens; the order and payment steps check the lock exactly on the server.
export function StoreBanner() {
  if (useStoreLocked() !== true) return null;
  return (
    <div role="status" className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      {STORE_CLOSED_MESSAGE}
    </div>
  );
}
