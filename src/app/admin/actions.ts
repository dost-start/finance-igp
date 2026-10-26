"use server";

import { and, asc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { sendOrderEmail } from "@/lib/email/send";
import { REJECT_REASONS, STATUS_EMAIL_STATUSES, cleanNote, rejectionDeadline, renderEmail2, renderEmail9, ticketFormUrl, type RejectReason } from "@/lib/email/templates";
import { changeStatus, sendStatusEmails, type ChangedOrder } from "@/lib/status-change";
import { canTransition, STATUS_LABEL } from "@/lib/status";
import { mintTrackingToken, trackingUrl } from "@/lib/tracking";

const uuid = z.uuid();

// After a review, jump to the oldest order still waiting, so finance can work through the queue.
async function nextPendingId(excludeId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .innerJoin(schema.paymentProofs, eq(schema.paymentProofs.orderUuid, schema.orders.id))
    .where(and(eq(schema.orders.status, "pending_payment"), ne(schema.orders.id, excludeId)))
    .orderBy(asc(schema.paymentProofs.createdAt))
    .limit(1);
  return row?.id ?? null;
}

async function goNext(done: string, orderUuid: string): Promise<never> {
  const next = await nextPendingId(orderUuid);
  redirect(next ? `/admin/orders/${next}?done=${done}` : `/admin?done=${done}`);
}

function stale(orderUuid: string): never {
  redirect(`/admin/orders/${orderUuid}?notice=changed`);
}

async function loadOrder(orderUuid: string) {
  const db = getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderUuid)).limit(1);
  return order ?? null;
}

async function itemsFor(orderUuid: string) {
  return getDb()
    .select({ name: schema.products.name, size: schema.orderItems.size, quantity: schema.orderItems.quantity })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
    .where(eq(schema.orderItems.orderUuid, orderUuid));
}

// Confirm: Pending Payment -> Payment Confirmation. Mints the tracking token (only its hash is
// stored), records who verified, and emails the Order ID and tracking link.
export async function confirmPayment(orderUuid: string) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(orderUuid).success) redirect("/admin");
  const order = await loadOrder(orderUuid);
  if (!order) redirect("/admin");
  if (!canTransition(order.status, "payment_confirmation")) stale(orderUuid);

  const { token, hash } = mintTrackingToken();
  const db = getDb();
  const ok = await db.transaction(async (tx) => {
    const moved = await tx
      .update(schema.orders)
      .set({ status: "payment_confirmation", trackingTokenHash: hash })
      .where(and(eq(schema.orders.id, orderUuid), eq(schema.orders.status, "pending_payment")))
      .returning({ id: schema.orders.id });
    if (moved.length === 0) return false;
    await tx.update(schema.paymentProofs).set({ verifiedBy: admin.id }).where(eq(schema.paymentProofs.orderUuid, orderUuid));
    await tx.insert(schema.statusEvents).values({ orderUuid, status: "payment_confirmation", changedBy: admin.id });
    await writeAudit(tx, { adminId: admin.id, action: "payment.confirm", orderUuid, before: { status: "pending_payment" }, after: { status: "payment_confirmation" } });
    return true;
  });
  if (!ok) stale(orderUuid);

  after(async () => {
    const content = renderEmail2(
      { buyerName: order.buyerName, orderId: order.orderId, trackingUrl: trackingUrl(token), items: await itemsFor(orderUuid), totalCentavos: order.totalCentavos },
      ticketFormUrl(),
    );
    await sendOrderEmail({ orderUuid, template: "2-payment-confirmation", to: order.email, content });
  });
  await goNext("confirmed", orderUuid);
}

// Reject: Pending Payment -> Payment Rejected, with one of the agreed reasons, and Email 9.
export async function rejectPayment(orderUuid: string, formData: FormData) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(orderUuid).success) redirect("/admin");
  const reason = String(formData.get("reason") ?? "") as RejectReason;
  if (!REJECT_REASONS.includes(reason)) redirect(`/admin/orders/${orderUuid}?notice=reason`);
  const order = await loadOrder(orderUuid);
  if (!order) redirect("/admin");
  if (!canTransition(order.status, "payment_rejected")) stale(orderUuid);

  const ok = await getDb().transaction(async (tx) => {
    const moved = await tx
      .update(schema.orders)
      .set({ status: "payment_rejected" })
      .where(and(eq(schema.orders.id, orderUuid), eq(schema.orders.status, "pending_payment")))
      .returning({ id: schema.orders.id });
    if (moved.length === 0) return false;
    await tx.insert(schema.statusEvents).values({ orderUuid, status: "payment_rejected", changedBy: admin.id, note: reason });
    await writeAudit(tx, { adminId: admin.id, action: "payment.reject", orderUuid, before: { status: "pending_payment" }, after: { status: "payment_rejected", reason } });
    return true;
  });
  if (!ok) stale(orderUuid);

  after(async () => {
    const content = renderEmail9({ buyerName: order.buyerName, reason, deadline: rejectionDeadline(new Date()) }, ticketFormUrl());
    await sendOrderEmail({ orderUuid, template: "9-payment-rejected", to: order.email, content });
  });
  await goNext("rejected", orderUuid);
}

// One step forward after confirmation (production, shipping, received, cancel and the refund steps).
// Finance can add a note: it is saved in the order's history and printed in the buyer's email.
export async function setOrderStatus(orderUuid: string, to: OrderStatus, formData: FormData) {
  const admin = await requireAdmin();
  if (!uuid.safeParse(orderUuid).success) redirect("/admin");
  const note = String(formData.get("note") ?? "");
  if (to === "canceled" && !cleanNote(note)) redirect(`/admin/orders/${orderUuid}?notice=cancel_reason`);

  const result = await changeStatus(admin, orderUuid, to, note);
  if (!result.ok) {
    if (result.reason === "missing") redirect("/admin");
    stale(orderUuid);
  }
  after(() => sendStatusEmails([result.order]));
  redirect(`/admin/orders/${orderUuid}?done=status`);
}

export type BulkState = { ok: boolean; message: string; skipped?: string[] } | null;

const BULK_MAX = 100;
const BULK_TARGETS: readonly string[] = STATUS_EMAIL_STATUSES;

// Move many selected orders to the same next status. Each order is checked on its own: one that
// cannot make that move (wrong current status) is skipped and listed, the rest go through. Every
// buyer gets the email for the new status, with the same optional note.
export async function bulkSetStatus(_prev: BulkState, formData: FormData): Promise<BulkState> {
  const admin = await requireAdmin();
  const ids = [...new Set(formData.getAll("ids").map(String))];
  const to = String(formData.get("to") ?? "");
  const note = String(formData.get("note") ?? "");

  if (ids.length === 0) return { ok: false, message: "Select at least one order first." };
  if (ids.length > BULK_MAX) return { ok: false, message: `Select at most ${BULK_MAX} orders at a time.` };
  if (!ids.every((id) => uuid.safeParse(id).success)) return { ok: false, message: "Something was wrong with the selection. Reload the page and try again." };
  if (!BULK_TARGETS.includes(to)) return { ok: false, message: "Choose the status to move the orders to." };
  if (to === "canceled" && !cleanNote(note)) return { ok: false, message: "Add the reason for canceling: the buyers see it in their email." };

  const changed: ChangedOrder[] = [];
  const skipped: string[] = [];
  for (const id of ids) {
    const r = await changeStatus(admin, id, to as OrderStatus, note);
    if (r.ok) changed.push(r.order);
    else if (r.reason === "not_allowed") skipped.push(`${r.orderId} is ${STATUS_LABEL[r.from]}, which cannot move to ${STATUS_LABEL[to as OrderStatus]}`);
    else skipped.push("An order in the selection no longer exists");
  }
  if (changed.length > 0) after(() => sendStatusEmails(changed));
  revalidatePath("/admin");

  const label = STATUS_LABEL[to as OrderStatus];
  const head = changed.length > 0 ? `${changed.length} ${changed.length === 1 ? "order" : "orders"} moved to ${label}. Buyers are being emailed.` : "No orders were changed.";
  return { ok: changed.length > 0, message: skipped.length > 0 ? `${head} ${skipped.length} skipped.` : head, skipped };
}
