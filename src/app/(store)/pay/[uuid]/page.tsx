import type { Metadata } from "next";
import { asc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
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
      <div className="mt-6 max-w-xl rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <p className="font-medium">This order is no longer open for payment.</p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">If you have questions, use the merch ticket form linked in your emails.</p>
        <Link href="/" className="mt-4 inline-block text-sm underline underline-offset-4">
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
      <h1 className="text-3xl font-semibold tracking-tight">Payment</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">Loading your order…</p>}>
        <Payment params={params} />
      </Suspense>
    </main>
  );
}
