import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";
import { CheckoutGate } from "@/components/checkout-gate";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// While the store is closed the form is replaced by a friendly message (CheckoutGate). Placing the
// order is also refused on the server (src/app/checkout/actions.ts), so a page left open cannot get
// around the lock.
export default function CheckoutPage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutGate>
        <CheckoutForm />
      </CheckoutGate>
    </main>
  );
}
