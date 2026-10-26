"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveProduct, type ProductFormState } from "@/app/admin/extras-actions";
import type { ProductSize } from "@/db/schema";
import { MAX_SIZES } from "@/lib/product-edit";

const inputClass = "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700 aria-[invalid=true]:border-red-600";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-sky-800 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:opacity-60">
      {pending ? "Saving…" : "Save product"}
    </button>
  );
}

const pesos = (centavos: number) => (centavos % 100 === 0 ? String(centavos / 100) : (centavos / 100).toFixed(2));

export function ProductForm({ productId, initial }: { productId: string; initial: { name: string; priceCentavos: number; active: boolean; sizes: ProductSize[] } }) {
  const [state, action] = useActionState<ProductFormState, FormData>(saveProduct.bind(null, productId), null);
  const startSizes: ProductSize[] = state?.ok === false ? safeSizes(state.values.sizesJson, initial.sizes) : initial.sizes;
  const [sizes, setSizes] = useState<ProductSize[]>(startSizes);
  const errors = state?.ok === false ? state.errors : {};
  const v = state?.ok === false ? state.values : { name: initial.name, price: pesos(initial.priceCentavos), active: initial.active };

  const update = (i: number, patch: Partial<ProductSize>) => setSizes((list) => list.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  return (
    <form key={state?.ok === false ? `${state.values.name}|${state.values.price}|${state.values.sizesJson}` : "form"} action={action} className="mt-6 max-w-xl space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" defaultValue={v.name} className={inputClass} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "name-error" : undefined} />
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="price" className="text-sm font-medium">
          Price in pesos
        </label>
        <input id="price" name="price" inputMode="decimal" defaultValue={v.price} className={inputClass} aria-invalid={errors.price ? true : undefined} aria-describedby="price-hint price-error" />
        <p id="price-hint" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Like 450 or 450.50. Buyers are charged this at checkout. Orders already placed keep their price.
        </p>
        {errors.price && (
          <p id="price-error" role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
            {errors.price}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Sizes</legend>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Untick &ldquo;Available&rdquo; to show a size as sold out. Use one row named &ldquo;One size&rdquo; for items without sizes.</p>
        <ul className="mt-2 space-y-2">
          {sizes.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <label className="sr-only" htmlFor={`size-${i}`}>
                Size name {i + 1}
              </label>
              <input id={`size-${i}`} value={s.size} onChange={(e) => update(i, { size: e.target.value })} className="w-40 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.available} onChange={(e) => update(i, { available: e.target.checked })} className="size-4" />
                Available
              </label>
              <button type="button" onClick={() => setSizes((list) => list.filter((_, n) => n !== i))} className="text-sm underline underline-offset-4" aria-label={`Remove size ${s.size || i + 1}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        {sizes.length < MAX_SIZES && (
          <button type="button" onClick={() => setSizes((list) => [...list, { size: "", available: true }])} className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Add a size
          </button>
        )}
        <input type="hidden" name="sizes" value={JSON.stringify(sizes)} />
        {errors.sizes && (
          <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">
            {errors.sizes}
          </p>
        )}
      </fieldset>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={v.active} className="mt-0.5 size-4" />
        <span>
          <span className="font-medium">On sale</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">Untick to hide this product from the shop. It can be put back at any time.</span>
        </span>
      </label>

      <Save />
    </form>
  );
}

function safeSizes(json: string, fallback: ProductSize[]): ProductSize[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as ProductSize[]) : fallback;
  } catch {
    return fallback;
  }
}
