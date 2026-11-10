"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { createProduct, saveProduct, type ProductFormState } from "@/app/admin/extras-actions";
import type { ProductSize } from "@/db/schema";
import { downscaleImage } from "@/lib/image-resize";
import { MAX_PHOTOS, MAX_SIZES, PRODUCT_TYPES, parsePhotos, slugify } from "@/lib/product-edit";

// Big fields (16px text, 48px tall) so they are easy to hit and to type in, on a phone as well as a laptop.
const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base outline-none transition hover:border-zinc-400 focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500 aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-600/15";

const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "One size"] as const;

const pesos = (centavos: number) => (centavos % 100 === 0 ? String(centavos / 100) : (centavos / 100).toFixed(2));

function Save({ create, uploading }: { create: boolean; uploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || uploading}
      className="flex w-full items-center justify-center rounded-full bg-brand-yellow px-5 py-3.5 text-base font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-brand-yellow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Saving…" : uploading ? "Uploading photos…" : create ? "Add product" : "Save changes"}
    </button>
  );
}

function Err({ id, children }: { id: string; children?: string }) {
  return children ? (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-700 dark:text-red-400">
      <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" aria-hidden="true" fill="currentColor">
        <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.9 4.2h1.8v5H9.1v-5Zm0 6.4h1.8v1.8H9.1v-1.8Z" />
      </svg>
      {children}
    </p>
  ) : null;
}

function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
      {children}
    </p>
  );
}

// A numbered card, like the shop's checkout: a heading, one line on what it is for, then the fields.
function Card({ n, title, note, children }: { n: number; title: string; note: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`card-${n}`} className="lift-card rounded-3xl border border-zinc-200/70 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-start gap-3.5">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-yellow text-base font-extrabold text-zinc-950">
          {n}
        </span>
        <div>
          <h2 id={`card-${n}`} className="text-xl font-extrabold tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{note}</p>
        </div>
      </header>
      <div className="mt-6 grid gap-6">{children}</div>
    </section>
  );
}

type PhotoItem = { key: string; url: string | null; preview: string | null; status: "uploading" | "done" | "error"; message?: string; name: string };

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Small photos go up as they are (a PNG keeps its see-through background); big ones are shrunk first.
const SEND_AS_IS_BYTES = 3_500_000;
let photoKey = 0;
const nextKey = () => `photo-${++photoKey}`;

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
  const [photoList, setPhotoList] = useState<PhotoItem[]>(() => {
    const parsed = parsePhotos(v.photos);
    return parsed.ok ? parsed.images.map((i) => ({ key: nextKey(), url: i.url, preview: null, status: "done" as const, name: i.url.split("/").pop() ?? "photo" })) : [];
  });
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useRef<Set<string>>(new Set());
  const [name, setName] = useState(v.name);
  const [type, setType] = useState(v.type);
  const [customSize, setCustomSize] = useState("");
  const [active, setActive] = useState(v.active);
  const photosValue = photoList.filter((p) => p.status === "done" && p.url).map((p) => p.url as string).join("\n");

  // Give the temporary previews' memory back when the page goes away.
  useEffect(() => {
    const held = previews.current;
    return () => held.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const patchPhoto = (key: string, patch: Partial<PhotoItem>) => setPhotoList((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const movePhoto = (i: number, by: -1 | 1) =>
    setPhotoList((list) => {
      const j = i + by;
      if (j < 0 || j >= list.length) return list;
      const copy = [...list];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  async function addFiles(files: FileList | File[]) {
    const room = MAX_PHOTOS - photoList.length;
    const picked = [...files].filter((f) => PHOTO_TYPES.includes(f.type)).slice(0, Math.max(0, room));
    const skipped = files.length - picked.length;
    const items: PhotoItem[] = picked.map((f) => {
      const preview = URL.createObjectURL(f);
      previews.current.add(preview);
      return { key: nextKey(), url: null, preview, status: "uploading", name: f.name };
    });
    if (skipped > 0) {
      items.push({ key: nextKey(), url: null, preview: null, status: "error", name: "", message: room <= 0 ? `A product can have at most ${MAX_PHOTOS} photos.` : `Only JPG, PNG or WebP photos, and at most ${MAX_PHOTOS} per product, were added.` });
    }
    setPhotoList((list) => [...list, ...items]);
    await Promise.all(
      picked.map(async (file, n) => {
        const key = items[n].key;
        try {
          const blob = file.size <= SEND_AS_IS_BYTES ? file : await downscaleImage(file);
          const fd = new FormData();
          fd.set("photo", new File([blob], file.size <= SEND_AS_IS_BYTES ? file.name : "photo.jpg", { type: blob.type }));
          const res = await fetch("/api/admin/product-photos", { method: "POST", body: fd });
          const json = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; message?: string };
          if (!res.ok || !json.ok || !json.url) throw new Error(json.message ?? "Upload failed. Please try again.");
          patchPhoto(key, { url: json.url, status: "done" });
        } catch (e) {
          patchPhoto(key, { status: "error", message: e instanceof Error ? e.message : "Upload failed. Please try again." });
        }
      }),
    );
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
  }

  const has = (label: string) => sizes.some((s) => s.size.toLowerCase() === label.toLowerCase());
  const addSize = (label: string) => {
    const clean = label.trim();
    if (!clean || has(clean) || sizes.length >= MAX_SIZES) return;
    setSizes((list) => [...list, { size: clean, available: true }]);
  };
  const update = (i: number, patch: Partial<ProductSize>) => setSizes((list) => list.map((s, n) => (n === i ? { ...s, ...patch } : s)));

  return (
    <form
      key={failed ? `${failed.values.name}|${failed.values.price}|${failed.values.sizesJson}|${failed.values.photos}` : "form"}
      action={dispatch}
      className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8"
      noValidate
    >
      <div className="space-y-5">
        <Card n={1} title="The basics" note="What it is called and what kind of product it is.">
          <div>
            <label htmlFor="name" className="text-sm font-semibold">
              Product name
            </label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. START T-Shirt, Design C"
              autoComplete="off"
              className={inputClass}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            <Err id="name-error">{errors.name}</Err>
          </div>

          {create && (
            <>
              <fieldset>
                <legend className="text-sm font-semibold">Kind of product</legend>
                <div role="radiogroup" className="mt-2 flex flex-wrap gap-2">
                  {PRODUCT_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-700 ${
                        type === t.value ? "border-sky-800 bg-sky-800 text-white" : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                      }`}
                    >
                      <input type="radio" name="type" value={t.value} checked={type === t.value} onChange={() => setType(t.value)} className="sr-only" />
                      {t.label}
                    </label>
                  ))}
                </div>
                <Err id="type-error">{errors.type}</Err>
              </fieldset>

              <div>
                <label htmlFor="variant" className="text-sm font-semibold">
                  Design variant <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
                </label>
                <input id="variant" name="variant" defaultValue={v.variant} maxLength={30} placeholder="e.g. A, or Dark" autoComplete="off" className={inputClass} />
                <Hint>Tells apart designs of the same product, like Design A and Design B.</Hint>
              </div>

              <div>
                <label htmlFor="slug" className="text-sm font-semibold">
                  Web address <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
                </label>
                <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950">
                  <span className="grid place-items-center bg-zinc-100 px-3 font-mono text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">/products/</span>
                  <input
                    id="slug"
                    name="slug"
                    defaultValue={v.slug}
                    placeholder={slugify(name) || "tee-design-c"}
                    autoComplete="off"
                    className="h-12 min-w-0 flex-1 bg-transparent px-3 font-mono text-base outline-none"
                    aria-invalid={errors.slug ? true : undefined}
                    aria-describedby="slug-hint slug-error"
                  />
                </div>
                <Hint id="slug-hint">Leave it empty and it is made from the name. It cannot be changed after the product is added.</Hint>
                <Err id="slug-error">{errors.slug}</Err>
              </div>
            </>
          )}
        </Card>

        <Card n={2} title="Price" note="What buyers are charged at checkout.">
          <div>
            <label htmlFor="price" className="text-sm font-semibold">
              Price in pesos
            </label>
            <div className="mt-1.5 flex items-stretch overflow-hidden rounded-xl border border-zinc-300 bg-white focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950">
              <span aria-hidden="true" className="grid place-items-center bg-zinc-100 px-4 text-lg font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                ₱
              </span>
              <input
                id="price"
                name="price"
                inputMode="decimal"
                defaultValue={v.price}
                placeholder="450"
                autoComplete="off"
                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-lg font-semibold tabular-nums outline-none"
                aria-invalid={errors.price ? true : undefined}
                aria-describedby="price-hint price-error"
              />
            </div>
            <Hint id="price-hint">Type 450 or 450.50. Orders already placed keep the price they were placed at.</Hint>
            <Err id="price-error">{errors.price}</Err>
          </div>
        </Card>

        <Card n={3} title="Sizes" note="Tap the sizes you have. Mark one sold out to keep it listed but not orderable.">
          <div>
            <p className="text-sm font-semibold">Add a size</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESET_SIZES.map((p) => {
                const on = has(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => (on ? setSizes((list) => list.filter((s) => s.size.toLowerCase() !== p.toLowerCase())) : addSize(p))}
                    aria-pressed={on}
                    className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                      on ? "border-sky-800 bg-sky-800 text-white" : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
                    }`}
                  >
                    {on ? "✓ " : "+ "}
                    {p}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <label htmlFor="custom-size" className="sr-only">
                Another size
              </label>
              <input
                id="custom-size"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSize(customSize);
                    setCustomSize("");
                  }
                }}
                placeholder="Another size, e.g. 4XL or 32"
                autoComplete="off"
                className={`${inputClass} !mt-0 max-w-xs`}
              />
              <button
                type="button"
                onClick={() => {
                  addSize(customSize);
                  setCustomSize("");
                }}
                disabled={!customSize.trim() || sizes.length >= MAX_SIZES}
                className="rounded-full border border-zinc-300 px-5 text-sm font-semibold transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">
              Sizes on this product <span className="font-normal text-zinc-500 dark:text-zinc-400">({sizes.length})</span>
            </p>
            {sizes.length === 0 ? (
              <p className="mt-2 rounded-2xl border-2 border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">No sizes yet. Tap one above. Items without sizes use &ldquo;One size&rdquo;.</p>
            ) : (
              <ul className="mt-2 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {sizes.map((s, i) => (
                  <li key={`${s.size}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <label className="sr-only" htmlFor={`size-${i}`}>
                      Size name {i + 1}
                    </label>
                    <input
                      id={`size-${i}`}
                      value={s.size}
                      onChange={(e) => update(i, { size: e.target.value })}
                      className="h-10 w-28 rounded-lg border border-zinc-300 bg-white px-3 text-base font-semibold outline-none focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    <button
                      type="button"
                      onClick={() => update(i, { available: !s.available })}
                      aria-pressed={!s.available}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        s.available ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200" : "bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-950 dark:text-red-200"
                      }`}
                    >
                      {s.available ? "Available" : "Sold out"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSizes((list) => list.filter((_, n) => n !== i))}
                      className="ml-auto rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                      aria-label={`Remove size ${s.size || i + 1}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input type="hidden" name="sizes" value={JSON.stringify(sizes)} />
            <Err id="sizes-error">{errors.sizes}</Err>
          </div>
        </Card>

        <Card n={4} title="Photos" note="Upload up to 6. The first one is the main photo shown on the shelf.">
          <div>
            <label
              htmlFor="photo-files"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`block cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-700 ${
                photoList.length >= MAX_PHOTOS ? "cursor-not-allowed opacity-60" : dragging ? "border-brand-blue bg-brand-blue/10" : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
              }`}
            >
              <input
                ref={fileInput}
                id="photo-files"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={photoList.length >= MAX_PHOTOS}
                onChange={(e) => {
                  if (e.target.files?.length) void addFiles(e.target.files);
                  e.target.value = ""; // so the same photo can be picked again
                }}
                className="sr-only"
                aria-describedby="photos-hint photos-error"
              />
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-yellow text-zinc-950">
                <svg viewBox="0 0 20 20" className="size-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 13v2.5h12V13" />
                </svg>
              </span>
              <span className="mt-3 block text-base font-semibold">{photoList.length >= MAX_PHOTOS ? "That is the most photos a product can have" : "Choose photos"}</span>
              {photoList.length < MAX_PHOTOS && <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">or drop them here</span>}
            </label>
            <Hint id="photos-hint">JPG, PNG or WebP. Big photos are shrunk on your computer before they upload.</Hint>
            <Err id="photos-error">{errors.photos}</Err>
            <input type="hidden" name="photos" value={photosValue} />
          </div>

          {photoList.length > 0 && (
            <ul aria-label="Product photos" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photoList.map((p, i) => (
                <li key={p.key} className="rounded-2xl border border-zinc-200 p-2 dark:border-zinc-800">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                    {(p.preview || p.url) && (
                      // A plain img so a missing file is visible straight away
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url ?? p.preview ?? ""} alt={p.name ? `Photo ${i + 1}: ${p.name}` : `Photo ${i + 1}`} className={`size-full object-cover ${p.status === "uploading" ? "opacity-50" : ""}`} />
                    )}
                    {i === 0 && p.status === "done" && <span className="absolute left-2 top-2 rounded-full bg-brand-yellow px-2.5 py-0.5 text-[0.7rem] font-extrabold text-zinc-950">Main</span>}
                    {p.status === "uploading" && (
                      <span role="status" className="absolute inset-0 grid place-items-center text-sm font-bold text-zinc-900">
                        <span className="rounded-full bg-white/90 px-3 py-1">Uploading…</span>
                      </span>
                    )}
                    {p.status === "error" && <span className="absolute inset-0 grid place-items-center bg-red-50/90 p-3 text-center text-xs font-semibold text-red-800">{p.message}</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <button type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="grid size-9 place-items-center rounded-full border border-zinc-300 text-sm font-bold transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800">
                      ←
                    </button>
                    <button type="button" onClick={() => movePhoto(i, 1)} disabled={i === photoList.length - 1} aria-label={`Move photo ${i + 1} later`} className="grid size-9 place-items-center rounded-full border border-zinc-300 text-sm font-bold transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:hover:bg-zinc-800">
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (p.preview) {
                          URL.revokeObjectURL(p.preview);
                          previews.current.delete(p.preview);
                        }
                        setPhotoList((list) => list.filter((x) => x.key !== p.key));
                      }}
                      className="ml-auto rounded-full px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* The publish card stays beside the form: whether it is on sale, and the one button to save. */}
      <aside className="lift-card space-y-5 rounded-3xl border border-zinc-200/70 bg-white p-5 sm:p-6 lg:sticky lg:top-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-extrabold tracking-tight">{create ? "Ready to add?" : "Save changes"}</h2>
        <label className="flex cursor-pointer items-start gap-4">
          <span className="relative mt-0.5 inline-flex h-7 w-12 shrink-0">
            <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="peer sr-only" />
            <span aria-hidden="true" className="absolute inset-0 rounded-full bg-zinc-300 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-700 dark:bg-zinc-700" />
            <span aria-hidden="true" className="absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </span>
          <span>
            <span className="block text-base font-bold">{active ? "On sale" : "Hidden from the shop"}</span>
            <span className="mt-0.5 block text-sm leading-5 text-zinc-500 dark:text-zinc-400">
              {active ? "Buyers can see and order it as soon as you save." : create ? "Finish it first and turn this on when it is ready." : "Turn this on to put it back in the shop."}
            </span>
          </span>
        </label>
        <div className="space-y-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <Save create={create} uploading={photoList.some((p) => p.status === "uploading")} />
          <Link href="/admin/products" className="block rounded-full border border-zinc-300 px-5 py-2.5 text-center text-sm font-semibold transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Cancel
          </Link>
        </div>
      </aside>
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
