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
    <div className="mt-6 space-y-5">
      {!single && (
        <fieldset>
          <legend className="text-sm font-medium">Size</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const selected = size === s.size;
              return (
                <label
                  key={s.size}
                  className={[
                    "relative cursor-pointer rounded-md border px-4 py-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-700",
                    s.available
                      ? selected
                        ? "border-sky-800 bg-sky-800 text-white"
                        : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
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
        <label htmlFor="qty" className="block text-sm font-medium">
          Quantity
        </label>
        <div className="mt-2 inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-2 text-lg leading-none" aria-label="Decrease quantity">
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
            className="w-12 bg-transparent py-2 text-center text-sm outline-none"
          />
          <button type="button" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} className="px-3 py-2 text-lg leading-none" aria-label="Increase quantity">
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onAdd}
          disabled={!firstAvailable}
          className="w-full rounded-md bg-sky-800 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:w-auto dark:disabled:bg-zinc-700"
        >
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
