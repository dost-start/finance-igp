import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <main>
      {/* The heading row (title, item count, continue shopping) lives in CartView, which knows the count. */}
      <CartView />
    </main>
  );
}
