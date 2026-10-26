"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createProduct, saveProduct, type ProductFormState } from "@/app/admin/extras-actions";
import type { ProductSize } from "@/db/schema";
import { MAX_SIZES, PRODUCT_TYPES, parsePhotos, slugify } from "@/lib/product-edit";

const inputClass = "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700 aria-[invalid=true]:border-red-600";

function Save({ create }: { create: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-md bg-sky-800 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:opacity-60">
      {pending ? "Saving…" : create ? "Add product" : "Save product"}
    </button>
  );
}

const pesos = (centavos: number) => (centavos % 100 === 0 ? String(centavos / 100) : (centavos / 100).toFixed(2));

function Err({ id, children }: { id: string; children?: string }) {
  return children ? (
    <p id={id} role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
      {children}
    </p>
  ) : null;
}

type Initial = { name: string; priceCentavos: number; active: boolean; sizes: ProductSize[]; photos: string };

// One form for editing a product and for adding one. Adding asks for three more things: what kind of
// product it is, its web address (made from the name unless typed) and an optional design variant.
export function ProductForm({ productId, initial, create = false }: { productId?: string; initial: Initial; create?: boolean }) {
  const action = create ? createProduct : saveProduct.bind(null, productId as string);
  const [state, dispatch] = useActionState<ProductFormState, FormData>(action, null);
  const failed = state?.ok === false ? state : null;
  const startSizes: ProductSize[] = failed ? safeSizes(failed.values.sizesJson, initial.sizes) : initial.sizes;
  const [sizes, setSizes] = useState<ProductSize[]>(startSizes);
  const errors = failed?.errors ?? {};
  const v = failed ? failed.values : { name: initial.name, price: pesos(initial.priceCentavos), active: initial.active, photos: initial.photos, slug: "", type: "", variant: "" };
  const [photos, setPhotos] = useState(v.photos);
  const [name, setName] = useState(v.name);
  const preview = parsePhotos(photos);

  const update = (i: number, patch: Partial<ProductSize>) => setSizes((list) => list.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  return (
    <form key={failed ? `${failed.values.name}|${failed.values.price}|${failed.values.sizesJson}|${failed.values.photos}` : "form"} action={dispatch} className="mt-6 max-w-xl space-y-5" noValidate>
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "name-error" : undefined} />
        <Err id="name-error">{errors.name}</Err>
      </div>

      {create && (
        <>
          <div>
            <label htmlFor="type" className="text-sm font-medium">
              Kind of product
            </label>
            <select id="type" name="type" defaultValue={v.type} className={inputClass} aria-invalid={errors.type ? true : undefined} aria-describedby={errors.type ? "type-error" : undefined}>
              <option value="" disabled>
                Choose one
              </option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Err id="type-error">{errors.type}</Err>
          </div>
          <div>
            <label htmlFor="slug" className="text-sm font-medium">
              Web address
            </label>
            <input id="slug" name="slug" defaultValue={v.slug} placeholder={slugify(name) || "tee-design-c"} className={`${inputClass} font-mono`} aria-invalid={errors.slug ? true : undefined} aria-describedby="slug-hint slug-error" />
            <p id="slug-hint" className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Leave empty to make it from the name. It cannot be changed later.
            </p>
            <Err id="slug-error">{errors.slug}</Err>
          </div>
          <div>
            <label htmlFor="variant" className="text-sm font-medium">
              Design variant <span className="font-normal text-zinc-600 dark:text-zinc-400">(optional, like A or Dark)</span>
            </label>
            <input id="variant" name="variant" defaultValue={v.variant} maxLength={30} className={inputClass} />
          </div>
        </>
      )}

      <div>
        <label htmlFor="price" className="text-sm font-medium">
          Price in pesos
        </label>
        <input id="price" name="price" inputMode="decimal" defaultValue={v.price} className={inputClass} aria-invalid={errors.price ? true : undefined} aria-describedby="price-hint price-error" />
        <p id="price-hint" className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Like 450 or 450.50. Buyers are charged this at checkout. Orders already placed keep their price.
        </p>
        <Err id="price-error">{errors.price}</Err>
      </div>

      <div>
        <label htmlFor="photos" className="text-sm font-medium">
          Photos
        </label>
        <textarea id="photos" name="photos" rows={3} value={photos} onChange={(e) => setPhotos(e.target.value)} className={`${inputClass} font-mono`} aria-invalid={errors.photos ? true : undefined} aria-describedby="photos-hint photos-error" />
        <p id="photos-hint" className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          One file name per line, like tee-front.jpg. The first is the main photo. The files go in the site&apos;s products folder with the rest of the code; ask the developer to add them.
        </p>
        <Err id="photos-error">{errors.photos}</Err>
        {preview.ok && preview.images.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Photo previews">
            {preview.images.map((img) => (
              <li key={img.url}>
                {/* A plain img so a missing file is visible straight away */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Preview of ${img.url.replace("/products/", "")}`} width={72} height={72} className="size-[72px] rounded-md border border-zinc-300 bg-zinc-100 object-cover dark:border-zinc-700 dark:bg-zinc-900" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Sizes</legend>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Untick &ldquo;Available&rdquo; to show a size as sold out. Use one row named &ldquo;One size&rdquo; for items without sizes.</p>
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
        <Err id="sizes-error">{errors.sizes}</Err>
      </fieldset>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={v.active} className="mt-0.5 size-4" />
        <span>
          <span className="font-medium">On sale</span>
          <span className="block text-xs text-zinc-600 dark:text-zinc-400">{create ? "Tick to show it in the shop now. Leave unticked to finish it first." : "Untick to hide this product from the shop. It can be put back at any time."}</span>
        </span>
      </label>

      <Save create={create} />
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
