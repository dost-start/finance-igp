"use client";

import Link from "next/link";
import { useState } from "react";
import { MAX_QTY } from "@/lib/cart";
import { useCart } from "@/lib/cart-store";
import type { ProductSize } from "@/db/schema";

type Props = {
  product: { id: string; slug: string; name: string; priceCentavos: number; image: string; sizes: ProductSize[] };
};

// Size comes first, then quantity, then the button. Sold-out sizes stay visible but cannot be picked.
export function AddToCart({ product }: Props) {
  const { add } = useCart();
  const firstAvailable = product.sizes.find((s) => s.available)?.size ?? null;
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? firstAvailable : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const single = product.sizes.length === 1;

  function onAdd() {
    if (!size) {
      setError("Choose a size first.");
      return;
    }
    setError("");
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      size,
      quantity: qty,
      unitPriceCentavos: product.priceCentavos,
      image: product.image,
    });
    setAdded(true);
  }

  return (
    <div className="space-y-6">
      {!single && (
        <fieldset>
          <legend className="text-sm font-semibold">Size</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const selected = size === s.size;
              return (
                <label
                  key={s.size}
                  className={[
                    "relative grid h-11 min-w-12 cursor-pointer place-items-center rounded-full border px-4 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-700",
                    s.available
                      ? selected
                        ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-zinc-300 hover:border-zinc-950 dark:border-zinc-700 dark:hover:border-zinc-300"
                      : "cursor-not-allowed border-zinc-200 text-zinc-400 line-through dark:border-zinc-800 dark:text-zinc-600",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s.size}
                    disabled={!s.available}
                    checked={selected}
                    onChange={() => {
                      setSize(s.size);
                      setError("");
                      setAdded(false);
                    }}
                    className="sr-only"
                  />
                  {s.size}
                  {!s.available && <span className="sr-only"> (sold out)</span>}
                </label>
              );
            })}
          </div>
          {product.sizes.some((s) => !s.available) && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Crossed-out sizes are sold out.</p>}
        </fieldset>
      )}

      <div>
        <label htmlFor="qty" className="block text-sm font-semibold">
          Quantity
        </label>
        <div className="mt-3 inline-flex h-11 items-center rounded-full border border-zinc-300 dark:border-zinc-700">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-11 place-items-center rounded-full text-lg leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Decrease quantity">
            <span aria-hidden="true">−</span>
          </button>
          <input
            id="qty"
            inputMode="numeric"
            value={qty}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ""));
              setQty(Math.min(MAX_QTY, Math.max(1, n || 1)));
              setAdded(false);
            }}
            className="w-10 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
          />
          <button type="button" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} className="grid size-11 place-items-center rounded-full text-lg leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Increase quantity">
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!firstAvailable}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-zinc-950/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none dark:bg-brand-yellow dark:text-zinc-950 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
        >
          {firstAvailable && (
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 6h12l-1.5 7.5h-9zM5 6 4.3 3H2.5M8 17a1 1 0 1 0 0-.01M14.5 17a1 1 0 1 0 0-.01" />
            </svg>
          )}
          {firstAvailable ? "Add to cart" : "Sold out"}
        </button>
        <p role="status" className="mt-2 min-h-5 text-sm">
          {error ? <span className="text-red-700 dark:text-red-400">{error}</span> : null}
          {added && !error ? (
            <span className="text-emerald-800 dark:text-emerald-400">
              Added to your cart.{" "}
              <Link href="/cart" className="font-medium underline underline-offset-4">
                View cart
              </Link>
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
