import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { CheckoutGate } from "@/components/checkout-gate";
import { OrderSteps } from "@/components/order-steps";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// While the store is closed the form is replaced by a friendly message (CheckoutGate). Placing the
// order is also refused on the server (src/app/checkout/actions.ts), so a page left open cannot get
// around the lock.
export default function CheckoutPage() {
  return (
    <main>
      <div className="page-enter flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">A few details and you are on to payment. It takes about a minute.</p>
        </div>
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
        >
          <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 4.5 7 10l5.5 5.5" />
          </svg>
          Back to cart
        </Link>
      </div>
      <div className="page-enter mt-5" style={{ "--enter-delay": "70ms" } as CSSProperties}>
        <OrderSteps current={2} />
      </div>
      <CheckoutGate>
        <CheckoutForm />
      </CheckoutGate>
    </main>
  );
}
