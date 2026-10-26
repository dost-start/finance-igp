"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-store";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      Cart
      <span className="min-w-6 rounded-full bg-sky-800 px-1.5 text-center text-xs leading-5 text-white">{count}</span>
      <span className="sr-only">{count === 1 ? "item" : "items"}</span>
    </Link>
  );
}
