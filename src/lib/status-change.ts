import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { writeAudit } from "@/lib/admin";
import type { Admin } from "@/lib/admin-accounts";
import { sendOrderEmail } from "@/lib/email/send";
import { cleanNote, isStatusEmailStatus, renderStatusEmail, ticketFormUrl } from "@/lib/email/templates";
import { canCorrect, generalNextStatuses } from "@/lib/status";

// One status change after payment confirmation (production, shipping, received, cancel, refund).
// Used for a single order and for each order in a bulk update, so both follow the same rules:
// forward steps only, checked against the order's current status in the same statement that saves it.
export type ChangedOrder = {
  uuid: string;
  orderId: string;
  buyerName: string;
  email: string;
  totalCentavos: number;
  universityAddress: string;
  homeAddressLink: string;
  homeLandmark: string;
  to: OrderStatus;
  note: string | null;
  at: Date;
};

export type ChangeResult =
  | { ok: true; order: ChangedOrder }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "not_allowed"; orderId: string; from: OrderStatus };

export async function changeStatus(admin: Admin, orderUuid: string, to: OrderStatus, rawNote: string | null): Promise<ChangeResult> {
  const db = getDb();
  const note = cleanNote(rawNote);
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderUuid)).limit(1);
  if (!order) return { ok: false, reason: "missing" };
  if (!generalNextStatuses(order.status).includes(to)) return { ok: false, reason: "not_allowed", orderId: order.orderId, from: order.status };

  const at = new Date();
  const moved = await db.transaction(async (tx) => {
    const updated = await tx
      .update(schema.orders)
      .set({ status: to })
      .where(and(eq(schema.orders.id, orderUuid), eq(schema.orders.status, order.status)))
      .returning({ id: schema.orders.id });
    if (updated.length === 0) return false;
    await tx.insert(schema.statusEvents).values({ orderUuid, status: to, changedBy: admin.id, note });
    await writeAudit(tx, { adminId: admin.id, action: "status.change", orderUuid, before: { status: order.status }, after: { status: to, note } });
    return true;
  });
  // Someone else changed it between the read and the write: report the current state, change nothing.
  if (!moved) return { ok: false, reason: "not_allowed", orderId: order.orderId, from: order.status };

  return {
    ok: true,
    order: {
      uuid: order.id,
      orderId: order.orderId,
      buyerName: order.buyerName,
      email: order.email,
      totalCentavos: order.totalCentavos,
      universityAddress: order.universityAddress,
      homeAddressLink: order.homeAddressLink,
      homeLandmark: order.homeLandmark,
      to,
      note,
      at,
    },
  };
}

const EMAIL_CONCURRENCY = 4;

// Sends the status email for each changed order, a few at a time so a bulk update of a hundred
// orders neither hammers Gmail nor runs for minutes. Every attempt is logged by sendOrderEmail.
export async function sendStatusEmails(changed: ChangedOrder[]): Promise<void> {
  const queue = changed.filter((c) => isStatusEmailStatus(c.to));
  const form = ticketFormUrl();
  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      if (!isStatusEmailStatus(next.to)) continue;
      const { template, content } = renderStatusEmail(
        next.to,
        {
          buyerName: next.buyerName,
          orderId: next.orderId,
          totalCentavos: next.totalCentavos,
          universityAddress: next.universityAddress,
          homeAddressLink: next.homeAddressLink,
          homeLandmark: next.homeLandmark,
          note: next.note,
          at: next.at,
        },
        form,
      );
      await sendOrderEmail({ orderUuid: next.uuid, template, to: next.email, content });
    }
  }
  await Promise.all(Array.from({ length: Math.min(EMAIL_CONCURRENCY, queue.length) }, worker));
}

export type CorrectionResult = { ok: true } | { ok: false; reason: "missing" | "not_allowed" | "no_reason" };

// Fixes a wrong status. It is recorded in the order's history and the audit log with the reason, and
// does not email the buyer (nothing new happened to their order, a mistake was undone).
export async function correctStatus(admin: Admin, orderUuid: string, to: OrderStatus, rawReason: string | null): Promise<CorrectionResult> {
  const reason = cleanNote(rawReason);
  if (!reason) return { ok: false, reason: "no_reason" };
  const db = getDb();
  const [order] = await db.select({ id: schema.orders.id, status: schema.orders.status }).from(schema.orders).where(eq(schema.orders.id, orderUuid)).limit(1);
  if (!order) return { ok: false, reason: "missing" };
  if (!canCorrect(order.status, to)) return { ok: false, reason: "not_allowed" };

  const moved = await db.transaction(async (tx) => {
    const updated = await tx
      .update(schema.orders)
      .set({ status: to })
      .where(and(eq(schema.orders.id, orderUuid), eq(schema.orders.status, order.status)))
      .returning({ id: schema.orders.id });
    if (updated.length === 0) return false;
    await tx.insert(schema.statusEvents).values({ orderUuid, status: to, changedBy: admin.id, note: `Correction: ${reason}` });
    await writeAudit(tx, { adminId: admin.id, action: "status.correction", orderUuid, before: { status: order.status }, after: { status: to, reason } });
    return true;
  });
  return moved ? { ok: true } : { ok: false, reason: "not_allowed" };
}
