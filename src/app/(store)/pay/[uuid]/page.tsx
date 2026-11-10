import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { OrderSteps } from "@/components/order-steps";
import { PaymentForm } from "@/components/payment-form";
import { StoreClosed } from "@/components/store-closed";
import { isStoreLocked } from "@/lib/store";
import { getDb, schema } from "@/db";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

async function Payment({ params }: { params: PageProps<"/pay/[uuid]">["params"] }) {
  const { uuid } = await params;
  if (!z.uuid().safeParse(uuid).success) notFound();

  const db = getDb();
  const [order] = await db
    .select({ total: schema.orders.totalCentavos, status: schema.orders.status })
    .from(schema.orders)
    .where(eq(schema.orders.id, uuid))
    .limit(1);
  if (!order) notFound();

  // The Order ID is deliberately never shown here: buyers get it by email after finance verifies payment.
  if (order.status !== "order_received" && order.status !== "pending_payment") {
    return (
      <div className="lift-card mt-8 max-w-xl rounded-3xl border border-zinc-200/70 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xl font-extrabold tracking-tight">This order is no longer open for payment.</p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">If you have questions, use the merch ticket form linked in your emails.</p>
        <Link href="/shop" className="mt-5 inline-flex items-center rounded-full bg-sky-800 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sky-900">
          Back to the shop
        </Link>
      </div>
    );
  }

  // While the store is locked a payment cannot be started. A buyer who already submitted their receipt
  // keeps seeing their confirmation.
  if (order.status === "order_received" && (await isStoreLocked())) return <StoreClosed />;

  const channels = await db
    .select({ key: schema.paymentChannels.key, label: schema.paymentChannels.label, hasQr: sql<boolean>`${schema.paymentChannels.qrDriveFileId} is not null` })
    .from(schema.paymentChannels)
    .where(eq(schema.paymentChannels.active, true))
    .orderBy(asc(schema.paymentChannels.sortOrder));

  return <PaymentForm orderUuid={uuid} totalCentavos={order.total} channels={channels} alreadySubmitted={order.status === "pending_payment"} />;
}

export default function PayPage({ params }: PageProps<"/pay/[uuid]">) {
  return (
    <main>
      <h1 className="page-enter text-3xl font-extrabold tracking-tight sm:text-4xl">Payment</h1>
      <p className="page-enter mt-2 text-zinc-600 dark:text-zinc-400" style={{ "--enter-delay": "50ms" } as CSSProperties}>Scan the QR, pay the exact amount, then send us your receipt.</p>
      <div className="page-enter mt-5" style={{ "--enter-delay": "90ms" } as CSSProperties}>
        <OrderSteps current={3} />
      </div>
      <Suspense fallback={<div role="status" aria-busy="true" className="mt-8 h-64 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-900"><span className="sr-only">Loading your order</span></div>}>
        <Payment params={params} />
      </Suspense>
    </main>
  );
}
