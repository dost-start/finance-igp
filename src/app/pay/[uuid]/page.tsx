import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { formatPeso } from "@/lib/money";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

async function Order({ params }: { params: PageProps<"/pay/[uuid]">["params"] }) {
  const { uuid } = await params;
  if (!z.uuid().safeParse(uuid).success) notFound();
  const [order] = await getDb()
    .select({ total: schema.orders.totalCentavos, status: schema.orders.status })
    .from(schema.orders)
    .where(eq(schema.orders.id, uuid))
    .limit(1);
  if (!order) notFound();

  // The Order ID is deliberately not shown: buyers get it by email after finance verifies payment.
  return (
    <div className="mt-6 max-w-xl rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <p className="font-medium">Your order is saved.</p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Amount to pay: <strong className="text-base text-zinc-900 dark:text-zinc-100">{formatPeso(order.total)}</strong>
      </p>
      <p className="mt-4 text-sm text-zinc-500">
        The payment step, with the QR codes and receipt upload, is built in the next step. Your Order ID will be emailed once the Finance Team
        verifies your payment.
      </p>
      <Link href="/" className="mt-5 inline-block text-sm underline underline-offset-4">
        Back to the shop
      </Link>
    </div>
  );
}

export default function PayPage({ params }: PageProps<"/pay/[uuid]">) {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">Payment</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-zinc-500">Loading your order…</p>}>
        <Order params={params} />
      </Suspense>
    </main>
  );
}
