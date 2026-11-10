"use client";

import Image from "next/image";
import Link from "next/link";
import { MAX_QTY } from "@/lib/cart";
import { useCart } from "@/lib/cart-store";
import { formatPeso } from "@/lib/money";

export function CartView() {
  const { ready, items, count, total, setQty, remove } = useCart();

  if (!ready) {
    return (
      <div role="status" aria-busy="true" className="mt-8 h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900">
        <span className="sr-only">Loading your cart</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <p className="font-medium">Your cart is empty.</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Pick something from the shop and it will show up here.</p>
        <Link href="/" className="mt-5 inline-block rounded-md bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <ul className="divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {items.map((i) => {
          const key = { productId: i.productId, size: i.size };
          return (
            <li key={`${i.productId}:${i.size}`} className="flex gap-4 py-5">
              <Link href={`/products/${i.slug}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
                <Image src={i.image ?? "/products/jacket.svg"} alt="" width={96} height={96} unoptimized className="size-24 rounded-md object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${i.slug}`} className="font-medium hover:underline">
                      {i.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      Size: {i.size} · {formatPeso(i.unitPriceCentavos)} each
                    </p>
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatPeso(i.unitPriceCentavos * i.quantity)}</p>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700">
                    <button type="button" onClick={() => setQty(key, i.quantity - 1)} className="px-3 py-1.5 text-lg leading-none" aria-label={`Decrease quantity of ${i.name}, size ${i.size}`}>
                      <span aria-hidden="true">−</span>
                    </button>
                    <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                      {i.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(key, i.quantity + 1)}
                      disabled={i.quantity >= MAX_QTY}
                      className="px-3 py-1.5 text-lg leading-none disabled:opacity-40"
                      aria-label={`Increase quantity of ${i.name}, size ${i.size}`}
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(key)} className="text-sm text-zinc-500 dark:text-zinc-400 underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100">
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Order total</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">
              {count} {count === 1 ? "item" : "items"}
            </dt>
            <dd className="tabular-nums">{formatPeso(total)}</dd>
          </div>
        </dl>
        <p className="mt-4 flex justify-between border-t border-zinc-200 pt-4 text-lg font-semibold dark:border-zinc-800">
          <span>Total</span>
          <span className="tabular-nums">{formatPeso(total)}</span>
        </p>
        <Link href="/checkout" className="mt-5 block w-full rounded-md bg-sky-800 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          Checkout
        </Link>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">The final total is confirmed at checkout.</p>
      </aside>
    </div>
  );
}
