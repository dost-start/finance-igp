"use client";

import Image from "next/image";
import Link from "next/link";
import { MAX_QTY } from "@/lib/cart";
import { useCart } from "@/lib/cart-store";
import { formatPeso } from "@/lib/money";

// Cart lines keep no product type, so cut-out art (stickers, pins) is recognised by its photo's file name; it sits
// inside the frame instead of being cropped.
const isCutoutImage = (image: string | null | undefined) => /\/(sticker|pin)-/.test(image ?? "");

// "Your cart" title with the item count and a way back to the shop.
function Heading({ count }: { count?: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Your cart
        {count ? (
          <span className="rounded-full bg-brand-yellow px-2.5 py-0.5 text-sm font-bold tabular-nums text-zinc-950">
            {count} {count === 1 ? "item" : "items"}
          </span>
        ) : null}
      </h1>
      <Link
        href="/shop"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
        Continue shopping
      </Link>
    </div>
  );
}

export function CartView() {
  const { ready, items, count, total, setQty, remove } = useCart();

  if (!ready) {
    return (
      <>
        <Heading />
        <div role="status" aria-busy="true" className="mt-8 h-48 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-900">
          <span className="sr-only">Loading your cart</span>
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Heading />
        {/* Blue Nova is the brand book's mascot for informational screens. */}
        <section className="lift-panel relative isolate mt-8 overflow-hidden rounded-3xl bg-brand-blue px-6 py-10 text-zinc-950 sm:px-10">
          <div aria-hidden="true" className="absolute -right-10 -top-10 -z-10 size-40 rounded-bl-full bg-brand-yellow sm:size-56" />
          <div aria-hidden="true" className="shop-dots absolute inset-0 -z-10" />
          <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-2xl font-extrabold tracking-tight sm:text-3xl">Your cart is empty.</p>
              <p className="mt-2 max-w-sm font-medium text-zinc-950/80">Pick something from the shop and it will show up here.</p>
              <Link
                href="/shop"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Browse the shop
                <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10h12m0 0-5-5m5 5-5 5" />
                </svg>
              </Link>
            </div>
            <Image src="/brand/nova-blue.webp" alt="" width={900} height={876} unoptimized className="shop-float mx-auto h-auto w-32 drop-shadow-xl sm:w-44" />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Heading count={count} />
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_22rem] lg:gap-8">
        <ul className="space-y-3">
          {items.map((i) => {
            const key = { productId: i.productId, size: i.size };
            return (
              <li key={`${i.productId}:${i.size}`} className="flex gap-4 rounded-2xl border border-zinc-200/70 bg-white p-3 shadow-[0_10px_30px_-12px_rgb(18_18_18/0.18)] transition-shadow hover:shadow-[0_16px_40px_-14px_rgb(18_18_18/0.28)] sm:gap-5 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)]">
                <Link href={`/products/${i.slug}`} className="shrink-0" aria-hidden="true" tabIndex={-1}>
                  <Image src={i.image ?? "/products/jacket.svg"} alt="" width={128} height={128} unoptimized className={`size-24 rounded-xl bg-product-backdrop sm:size-28 ${isCutoutImage(i.image) ? "object-contain p-2.5" : "object-cover"}`} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/products/${i.slug}`} className="group font-semibold">
                        <span className="shop-name">{i.name}</span>
                      </Link>
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Size: {i.size}</span>
                        <span>{formatPeso(i.unitPriceCentavos)} each</span>
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-bold tabular-nums">{formatPeso(i.unitPriceCentavos * i.quantity)}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-4 pt-3">
                    <div className="inline-flex h-10 items-center rounded-full border border-zinc-300 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => setQty(key, i.quantity - 1)}
                        className="grid size-10 place-items-center rounded-full text-lg leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        aria-label={`Decrease quantity of ${i.name}, size ${i.size}`}
                      >
                        <span aria-hidden="true">−</span>
                      </button>
                      <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                        {i.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(key, i.quantity + 1)}
                        disabled={i.quantity >= MAX_QTY}
                        className="grid size-10 place-items-center rounded-full text-lg leading-none hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                        aria-label={`Increase quantity of ${i.name}, size ${i.size}`}
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(key)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                    >
                      <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6h12M8 6V4.5h4V6M6 6l.7 9.5h6.6L14 6" />
                      </svg>
                      {/* Icon only on phones, where the word does not fit beside the stepper. */}
                      <span className="max-sm:sr-only">Remove</span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* The summary: a light card in light mode, the brand's dark ground in dark mode, with the yellow call to action. */}
        <aside className="lift-card relative isolate overflow-hidden rounded-3xl border border-zinc-200/70 bg-white p-6 text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100">
          <div aria-hidden="true" className="absolute -right-8 -top-8 -z-10 size-24 rounded-bl-full bg-brand-blue" />
          <h2 className="text-lg font-bold">Order summary</h2>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500 dark:text-zinc-400">
                {count} {count === 1 ? "item" : "items"}
              </dt>
              <dd className="tabular-nums">{formatPeso(total)}</dd>
            </div>
          </dl>
          <p className="mt-5 flex items-baseline justify-between border-t border-zinc-200 dark:border-white/10 pt-5">
            <span className="font-semibold">Total</span>
            <span className="text-3xl font-extrabold tabular-nums">{formatPeso(total)}</span>
          </p>
          <Link
            href="/checkout"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand-yellow px-5 py-3.5 text-center text-base font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-brand-yellow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
          >
            Checkout
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10h12m0 0-5-5m5 5-5 5" />
            </svg>
          </Link>
        </aside>
      </div>
    </>
  );
}
