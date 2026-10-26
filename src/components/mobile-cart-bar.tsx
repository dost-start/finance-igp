"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatPeso } from "@/lib/money";
import { useCart } from "@/lib/cart-store";

// Keeps the running total in view on phones (hidden on laptops and on the cart, checkout and payment pages).
export function MobileCartBar() {
  const { count, total } = useCart();
  const pathname = usePathname();
  if (count === 0 || pathname === "/cart" || pathname.startsWith("/checkout") || pathname.startsWith("/pay") || pathname.startsWith("/admin") || pathname.startsWith("/track")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      <Link href="/cart" className="flex items-center justify-between rounded-md bg-sky-800 px-4 py-3 text-white">
        <span className="text-sm">
          {count} {count === 1 ? "item" : "items"} · {formatPeso(total)}
        </span>
        <span className="text-sm font-semibold">View cart</span>
      </Link>
    </div>
  );
}
