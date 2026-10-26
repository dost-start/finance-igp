import { z } from "zod";
import type { ProductImage, ProductSize } from "@/db/schema";

// Tech edits a product's name, price, sizes and whether it is on sale, with no code change (PRD
// FR01.05 / US3.1). Prices are typed in pesos and stored as whole centavos, like everywhere else.
export const MIN_PRICE_CENTAVOS = 100; // 1 peso
export const MAX_PRICE_CENTAVOS = 10_000_000; // 100,000 pesos: a typo guard, not a business rule
export const MAX_SIZES = 12;

export function pesosToCentavos(input: string): number | null {
  const cleaned = input.replace(/[₱,\s]/g, "").replace(/^php/i, "");
  const m = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!m) return null;
  const centavos = Number(m[1]) * 100 + (m[2] ? Number(m[2].padEnd(2, "0")) : 0);
  return centavos >= MIN_PRICE_CENTAVOS && centavos <= MAX_PRICE_CENTAVOS ? centavos : null;
}

const sizeSchema = z.object({ size: z.string().trim().min(1, "A size needs a name").max(20, "Keep size names under 20 characters"), available: z.boolean() });

export const productEditSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(120, "That name is too long"),
  price: z.string().refine((v) => pesosToCentavos(v) !== null, "Enter a price in pesos, like 450 or 450.50 (at least 1 and at most 100,000)"),
  active: z.boolean(),
  sizes: z
    .array(sizeSchema)
    .min(1, "Add at least one size (use \"One size\" for items without sizes)")
    .max(MAX_SIZES, `At most ${MAX_SIZES} sizes`)
    .refine((list) => new Set(list.map((s) => s.size.toLowerCase())).size === list.length, "Each size can appear once"),
});

export type ProductEdit = { name: string; priceCentavos: number; active: boolean; sizes: ProductSize[]; images?: ProductImage[] };
export type ProductEditErrors = Partial<Record<"name" | "price" | "sizes" | "photos" | "slug" | "type", string>>;

// Photos are files kept in the site's public/products folder (added with the code, named consistently), so a
// photo is just a file name. Only plain file names are accepted: no folders, no web addresses, no "..".
export const MAX_PHOTOS = 6;
const PHOTO_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.(jpg|jpeg|png|webp|avif|svg)$/i;

export function parsePhotos(input: string, existing: ProductImage[] = []): { ok: true; images: ProductImage[] } | { ok: false; message: string } {
  const names = [...new Set(input.split(/[\n,]+/).map((l) => l.trim().replace(/^\/products\//, "")).filter(Boolean))];
  if (names.length > MAX_PHOTOS) return { ok: false, message: `At most ${MAX_PHOTOS} photos` };
  const bad = names.find((n) => !PHOTO_FILE.test(n) || n.includes(".."));
  if (bad) return { ok: false, message: `"${bad.slice(0, 40)}" is not a photo file name. Use just the file name, like tee-front.jpg (jpg, png, webp, avif or svg)` };
  const kindOf = new Map(existing.map((i) => [i.url, i.kind]));
  return { ok: true, images: names.map((n) => ({ url: `/products/${n}`, kind: kindOf.get(`/products/${n}`) ?? "flat" })) };
}

export const photosToText = (images: ProductImage[]): string => images.map((i) => i.url.replace(/^\/products\//, "")).join("\n");

// A web address for a new product from its name: "START Tee, Design C" becomes "start-tee-design-c".
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
export const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PRODUCT_TYPES = [
  { value: "tshirt", label: "T-shirt" },
  { value: "jacket", label: "Jacket" },
  { value: "lanyard", label: "Lanyard" },
  { value: "tote", label: "Tote bag" },
  { value: "sticker", label: "Sticker" },
  { value: "other", label: "Other" },
] as const;

export function parseProductEdit(input: { name: string; price: string; active: boolean; sizesJson: string; photos?: string; existingImages?: ProductImage[] }): { ok: true; data: ProductEdit } | { ok: false; errors: ProductEditErrors } {
  let sizes: unknown = [];
  try {
    sizes = JSON.parse(input.sizesJson);
  } catch {
    return { ok: false, errors: { sizes: "The sizes could not be read. Reload the page and try again." } };
  }
  const parsed = productEditSchema.safeParse({ name: input.name, price: input.price, active: input.active, sizes });
  if (!parsed.success) {
    const errors: ProductEditErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] === "sizes" ? "sizes" : issue.path[0] === "price" ? "price" : "name";
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const d = parsed.data;
  let images: ProductImage[] | undefined;
  if (input.photos !== undefined) {
    const photos = parsePhotos(input.photos, input.existingImages);
    if (!photos.ok) return { ok: false, errors: { photos: photos.message } };
    images = photos.images;
  }
  return { ok: true, data: { name: d.name, priceCentavos: pesosToCentavos(d.price) as number, active: d.active, sizes: d.sizes.map((s) => ({ size: s.size, available: s.available })), ...(images ? { images } : {}) } };
}

// Which fields differ, for the audit log.
export function changedFields(before: ProductEdit, after: ProductEdit): string[] {
  const out: string[] = [];
  if (before.name !== after.name) out.push("name");
  if (before.priceCentavos !== after.priceCentavos) out.push("price");
  if (before.active !== after.active) out.push(after.active ? "put on sale" : "taken off sale");
  if (JSON.stringify(before.sizes) !== JSON.stringify(after.sizes)) out.push("sizes");
  if (before.images && after.images && JSON.stringify(before.images.map((i) => i.url)) !== JSON.stringify(after.images.map((i) => i.url))) out.push("photos");
  return out;
}
