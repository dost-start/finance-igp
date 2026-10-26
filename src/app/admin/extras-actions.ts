"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireAdmin, requireTech, writeAudit } from "@/lib/admin";
import { changedFields, parseProductEdit, type ProductEditErrors } from "@/lib/product-edit";
import { isStoreLocked, saveStoreLocked } from "@/lib/store";

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

export type ProductFormState = { ok: false; errors: ProductEditErrors; values: { name: string; price: string; active: boolean; sizesJson: string } } | null;

// Editing a product: Technology team only. Prices are always re-read from the database at checkout, so
// an edit never changes an order that already exists (each order keeps the price it was placed at).
export async function saveProduct(productId: string, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const admin = await requireTech();
  if (!z.uuid().safeParse(productId).success) redirect("/admin/products");

  const values = {
    name: String(formData.get("name") ?? ""),
    price: String(formData.get("price") ?? ""),
    active: formData.get("active") === "on",
    sizesJson: String(formData.get("sizes") ?? "[]"),
  };
  const parsed = parseProductEdit(values);
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values };

  const db = getDb();
  const [before] = await db.select().from(schema.products).where(eq(schema.products.id, productId)).limit(1);
  if (!before) redirect("/admin/products");

  const after = parsed.data;
  const beforeEdit = { name: before.name, priceCentavos: before.priceCentavos, active: before.active, sizes: before.sizes };
  const changed = changedFields(beforeEdit, after);
  if (changed.length > 0) {
    await db.transaction(async (tx) => {
      await tx.update(schema.products).set({ name: after.name, priceCentavos: after.priceCentavos, active: after.active, sizes: after.sizes }).where(eq(schema.products.id, productId));
      await writeAudit(tx, { adminId: admin.id, action: "product.update", before: beforeEdit, after: { ...after, changed } });
    });
    updateTag("catalog"); // the shop shows the edit straight away
    revalidatePath("/");
  }
  redirect(`/admin/products?saved=${encodeURIComponent(after.name)}`);
}
