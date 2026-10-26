"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runBackup } from "@/lib/backup";
import { getDb, schema } from "@/db";
import { requireAdmin, requireTech, writeAudit } from "@/lib/admin";
import { PRODUCT_TYPES, SLUG_SHAPE, changedFields, parseProductEdit, slugify, type ProductEditErrors } from "@/lib/product-edit";
import { manilaInputToIso } from "@/lib/launch";
import { getLaunchAt, isStoreLocked, saveLaunchAt, saveStoreLocked } from "@/lib/store";

// Closing or reopening the store: any signed-in finance or tech member. Recorded in the audit log.
export async function setStoreLock(lock: boolean) {
  const admin = await requireAdmin();
  const already = await isStoreLocked();
  if (already !== lock) {
    await saveStoreLocked(lock, admin.id);
    await writeAudit(getDb(), { adminId: admin.id, action: lock ? "store.lock" : "store.unlock", before: { locked: already }, after: { locked: lock } });
  }
  revalidatePath("/admin");
  redirect(`/admin?store=${lock ? "closed" : "open"}`);
}

export type ProductFormValues = { name: string; price: string; active: boolean; sizesJson: string; photos: string; slug: string; type: string; variant: string };
export type ProductFormState = { ok: false; errors: ProductEditErrors; values: ProductFormValues } | null;

function readProductForm(formData: FormData): ProductFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    price: String(formData.get("price") ?? ""),
    active: formData.get("active") === "on",
    sizesJson: String(formData.get("sizes") ?? "[]"),
    photos: String(formData.get("photos") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    type: String(formData.get("type") ?? ""),
    variant: String(formData.get("variant") ?? ""),
  };
}

// Editing a product: Technology team only. Prices are always re-read from the database at checkout, so
// an edit never changes an order that already exists (each order keeps the price it was placed at).
export async function saveProduct(productId: string, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const admin = await requireTech();
  if (!z.uuid().safeParse(productId).success) redirect("/admin/products");

  const values = readProductForm(formData);
  const db = getDb();
  const [before] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!before) redirect("/admin/products");

  const parsed = parseProductEdit({ ...values, existingImages: before.images });
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values };

  const after = parsed.data;
  const beforeEdit = { name: before.name, priceCentavos: before.priceCentavos, active: before.active, sizes: before.sizes, images: before.images };
  const changed = changedFields(beforeEdit, after);
  if (changed.length > 0) {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.products)
        .set({ name: after.name, priceCentavos: after.priceCentavos, active: after.active, sizes: after.sizes, ...(after.images ? { images: after.images } : {}) })
        .where(eq(schema.products.id, productId));
      await writeAudit(tx, { adminId: admin.id, action: "product.update", before: beforeEdit, after: { ...after, changed } });
    });
    updateTag("catalog"); // the shop shows the edit straight away
    revalidatePath("/");
    revalidatePath("/shop");
  }
  redirect(`/admin/products?saved=${encodeURIComponent(after.name)}`);
}

// Adding a product (the real catalog arrives as data, with no code change): Technology team only. A new
// product starts hidden unless switched on, so nothing half-finished reaches the shop by accident.
export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const admin = await requireTech();
  const values = readProductForm(formData);
  const parsed = parseProductEdit(values);
  const errors: ProductEditErrors = parsed.ok ? {} : { ...parsed.errors };

  const slug = values.slug.trim() || slugify(values.name);
  if (!SLUG_SHAPE.test(slug)) errors.slug = "The web address can only have lowercase letters, numbers and single dashes, like tee-design-c";
  const type = PRODUCT_TYPES.find((t) => t.value === values.type)?.value;
  if (!type) errors.type = "Choose what kind of product it is";
  if (!parsed.ok || Object.keys(errors).length > 0) return { ok: false, errors, values: { ...values, slug } };

  const db = getDb();
  const [taken] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, slug)).limit(1);
  if (taken) return { ok: false, errors: { slug: "That web address is already used by another product" }, values: { ...values, slug } };

  const [{ top }] = await db.select({ top: sql<number>`coalesce(max(${schema.products.sortOrder}), 0)::int` }).from(schema.products);
  const data = parsed.data;
  await db.transaction(async (tx) => {
    await tx.insert(schema.products).values({
      slug,
      name: data.name,
      productType: type as string,
      designVariant: values.variant.trim().slice(0, 30) || null,
      priceCentavos: data.priceCentavos,
      sizes: data.sizes,
      images: data.images ?? [],
      active: data.active,
      sortOrder: top + 1,
    });
    await writeAudit(tx, { adminId: admin.id, action: "product.create", after: { name: data.name, slug, priceCentavos: data.priceCentavos, active: data.active } });
  });
  updateTag("catalog");
  revalidatePath("/");
  revalidatePath("/shop");
  redirect(`/admin/products?saved=${encodeURIComponent(data.name)}`);
}

// Changing the launch date: any signed-in finance or tech member. A past date shows the launch view, which
// is how to preview launch day; set the real date again afterwards. Recorded in the audit log.
export async function setLaunchDate(formData: FormData) {
  const admin = await requireAdmin();
  const iso = manilaInputToIso(String(formData.get("launchAt") ?? ""));
  if (!iso) redirect("/admin?launch=invalid");
  const before = await getLaunchAt();
  if (before !== iso) {
    await saveLaunchAt(iso, admin.id);
    await writeAudit(getDb(), { adminId: admin.id, action: "launch.update", before: { launchAt: before }, after: { launchAt: iso } });
  }
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin?launch=saved");
}

// "Back up now" on the System page. The same copy the nightly job makes; any signed-in member can run it.
export async function runBackupNow() {
  const admin = await requireAdmin();
  try {
    const record = await runBackup();
    await writeAudit(getDb(), { adminId: admin.id, action: "backup.run", after: { file: record.file, bytes: record.bytes, counts: record.counts } });
  } catch {
    redirect("/admin/system?backup=failed");
  }
  revalidatePath("/admin/system");
  redirect("/admin/system?backup=done");
}
