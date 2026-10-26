import type { Metadata } from "next";
import { asc, desc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { formatManila } from "@/lib/email/templates";
import { formatPeso } from "@/lib/money";

export const metadata: Metadata = { title: "Orders" };

type Row = {
  id: string;
  orderId: string;
  buyer: string;
  total: number;
  status: (typeof schema.orders.$inferSelect)["status"];
  channel: string | null;
  reference: string | null;
  when: Date;
};

function Table({ rows, empty }: { rows: Row[]; empty: string }) {
  if (rows.length === 0) return <p className="mt-3 text-sm text-zinc-500">{empty}</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase dark:bg-zinc-900">
          <tr>
            {["Order ID", "Buyer", "Total", "Paid via", "Reference", "Submitted", "Status"].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <td className="px-3 py-2 font-mono">
                <Link href={`/admin/orders/${r.id}`} className="underline underline-offset-4">
                  {r.orderId}
                </Link>
              </td>
              <td className="px-3 py-2">{r.buyer}</td>
              <td className="px-3 py-2 tabular-nums">{formatPeso(r.total)}</td>
              <td className="px-3 py-2">{r.channel ?? "-"}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.reference ?? "-"}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatManila(r.when)}</td>
              <td className="px-3 py-2">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const done = Array.isArray(sp.done) ? sp.done[0] : sp.done;
  const db = getDb();
  const base = () =>
    db
      .select({
        id: schema.orders.id,
        orderId: schema.orders.orderId,
        buyer: schema.orders.buyerName,
        total: schema.orders.totalCentavos,
        status: schema.orders.status,
        channel: schema.paymentProofs.channel,
        reference: schema.paymentProofs.referenceNumber,
        when: schema.orders.createdAt,
      })
      .from(schema.orders)
      .leftJoin(schema.paymentProofs, eq(schema.paymentProofs.orderUuid, schema.orders.id));

  const [pending, processed, unpaid] = await Promise.all([
    base().where(eq(schema.orders.status, "pending_payment")).orderBy(asc(schema.paymentProofs.createdAt)),
    base().where(ne(schema.orders.status, "pending_payment")).orderBy(desc(schema.orders.createdAt)).limit(200),
    base().where(eq(schema.orders.status, "order_received")).orderBy(desc(schema.orders.createdAt)).limit(100),
  ]);
  const handled = processed.filter((r) => r.status !== "order_received");

  return (
    <>
      {done && (
        <p role="status" className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {done === "confirmed" ? "Payment confirmed." : done === "rejected" ? "Payment rejected." : "Saved."} No more orders are waiting.
        </p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>

      <h2 className="mt-8 text-lg font-semibold">Waiting for verification ({pending.length})</h2>
      <p className="text-sm text-zinc-500">Oldest first. Open one, compare the receipt with the total, then confirm or reject.</p>
      <Table rows={pending} empty="Nothing is waiting. New orders appear here after the buyer uploads a receipt." />

      <h2 className="mt-10 text-lg font-semibold">Everything else ({handled.length})</h2>
      <Table rows={handled} empty="No other orders yet." />

      <details className="mt-10">
        <summary className="cursor-pointer text-sm font-medium">Saved but not paid yet ({unpaid.length})</summary>
        <p className="mt-1 text-sm text-zinc-500">Buyers who finished checkout but have not uploaded a receipt.</p>
        <Table rows={unpaid} empty="None." />
      </details>
    </>
  );
}

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading orders…</p>}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
