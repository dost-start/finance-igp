"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { FIELD_NAMES, checkoutSchema } from "@/lib/checkout";
import { lineTotal } from "@/lib/money";
import { formatOrderId } from "@/lib/order-id";
import { lastFour, normalizePhone } from "@/lib/phone";

export type CheckoutState =
  | { ok: true; orderUuid: string }
  | { ok: false; message?: string; errors?: Partial<Record<(typeof FIELD_NAMES)[number], string>>; values?: Record<string, string> };

const TEXT_FIELDS = ["name", "university", "universityAddress", "regionCode", "homeAddressLink", "homeLandmark", "contactNumber", "email", "emailConfirm"] as const;

const fail = (message: string, values?: Record<string, string>): CheckoutState => ({ ok: false, message, values });

export async function createOrder(_prev: CheckoutState | null, formData: FormData): Promise<CheckoutState> {
  const values: Record<string, string> = {};
  for (const f of TEXT_FIELDS) values[f] = String(formData.get(f) ?? "");
  values.consent = formData.get("consent") === "on" ? "on" : "";

  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return fail("We could not read your cart. Please go back to the cart and try again.", values);
  }

  const parsed = checkoutSchema.safeParse({
    ...values,
    consent: String(formData.get("consent") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    website: String(formData.get("website") ?? ""),
    items,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if ((FIELD_NAMES as readonly string[]).includes(key) && !errors[key]) errors[key] = issue.message;
    }
    if (Object.keys(errors).length === 0) return fail("Please check your cart and the form, then try again.", values);
    return { ok: false, errors, values };
  }
  const input = parsed.data;
  const db = getDb();

  try {
    // Double tap or retry: the same checkout page load always maps to the same order.
    const [existing] = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.idempotencyKey, input.idempotencyKey)).limit(1);
    if (existing) return { ok: true, orderUuid: existing.id };

    // The server is the price authority: look every item up and recompute the total.
    const ids = [...new Set(input.items.map((i) => i.productId))];
    const rows = await db.select().from(schema.products).where(inArray(schema.products.id, ids));
    const byId = new Map(rows.map((p) => [p.id, p]));

    const unavailable: string[] = [];
    const lines = input.items.map((i) => {
      const p = byId.get(i.productId);
      const sizeOk = p?.sizes.some((s) => s.size === i.size && s.available);
      if (!p || !p.active || !sizeOk) {
        unavailable.push(p?.name ?? "");
        return null;
      }
      return { productId: p.id, size: i.size, quantity: i.quantity, unitPriceCentavos: p.priceCentavos };
    });
    if (unavailable.length) {
      const names = [...new Set(unavailable.filter((n) => n !== ""))];
      const which = names.length ? `: ${names.join(", ")}` : "";
      return fail(`Some items in your cart are no longer available${which}. Please update your cart.`, values);
    }
    const valid = lines.filter((l): l is NonNullable<typeof l> => l !== null);
    const total = valid.reduce((sum, l) => sum + lineTotal(l.unitPriceCentavos, l.quantity), 0);
    const phone = normalizePhone(input.contactNumber) as string;

    const orderUuid = await db.transaction(async (tx) => {
      const seq = await tx.execute(sql`select nextval('order_number_seq')::int as n`);
      const orderId = formatOrderId(input.regionCode, Number(seq[0].n));
      const [order] = await tx
        .insert(schema.orders)
        .values({
          orderId,
          regionCode: input.regionCode,
          buyerName: input.name,
          university: input.university,
          universityAddress: input.universityAddress,
          homeAddressLink: input.homeAddressLink,
          homeLandmark: input.homeLandmark,
          contactNumber: phone,
          contactLast4: lastFour(phone),
          email: input.email,
          totalCentavos: total,
          idempotencyKey: input.idempotencyKey,
        })
        .returning({ id: schema.orders.id });
      await tx.insert(schema.orderItems).values(valid.map((l) => ({ ...l, orderUuid: order.id })));
      await tx.insert(schema.statusEvents).values({ orderUuid: order.id, status: "order_received" });
      return order.id;
    });
    return { ok: true, orderUuid };
  } catch (e) {
    // Two taps racing on the same key: the loser finds the winner's order.
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "23505") {
      const [again] = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.idempotencyKey, input.idempotencyKey)).limit(1);
      if (again) return { ok: true, orderUuid: again.id };
    }
    console.error("createOrder failed");
    return fail("Something went wrong saving your order. Nothing was charged, so please try again in a moment.", values);
  }
}
