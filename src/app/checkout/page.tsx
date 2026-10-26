import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutForm />
    </main>
  );
}
