import type { Metadata } from "next";
import { and, asc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { CorrectionForm } from "@/components/admin/correction-form";
import { OcrPanel } from "@/components/admin/ocr-panel";
import { ReceiptViewer } from "@/components/admin/receipt-viewer";
import { ReviewActions } from "@/components/admin/review-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusControl } from "@/components/admin/status-control";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { findDuplicateReferences } from "@/lib/duplicates";
import { emailBudget } from "@/lib/email/budget";
import { checkBudget } from "@/lib/email/limit";
import { formatManila } from "@/lib/email/templates";
import { formatPeso } from "@/lib/money";
import { correctionTargets, generalNextStatuses, STATUS_LABEL } from "@/lib/status";

export const metadata: Metadata = { title: "Review order" };

const NOTICE: Record<string, string> = {
  changed: "Someone else already changed this order, so nothing was saved. Here is its current state.",
  reason: "Choose a reason before rejecting.",
  cancel_reason: "Add the reason for canceling. The buyer reads it in their email.",
  correction_reason: "Say what went wrong before saving a correction.",
};
const DONE: Record<string, string> = { confirmed: "Payment confirmed. Here is the next order waiting.", rejected: "Payment rejected. Here is the next order waiting.", status: "Status updated.", corrected: "Status corrected and recorded. The buyer was not emailed." };

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-zinc-500">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

async function Review({ params, searchParams }: { params: PageProps<"/admin/orders/[id]">["params"]; searchParams: PageProps<"/admin/orders/[id]">["searchParams"] }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const notice = one(sp.notice);
  const limitMessage = notice === "email_limit" ? checkBudget(await emailBudget(), 1) : null;
  const done = one(sp.done);
  if (!z.uuid().safeParse(id).success) notFound();

  const db = getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).limit(1);
  if (!order) notFound();
  // These four do not depend on each other, so they run together instead of one round trip after another.
  const [[proof], items, events, [next], duplicates] = await Promise.all([
    db.select().from(schema.paymentProofs).where(eq(schema.paymentProofs.orderUuid, id)).limit(1),
    db
      .select({ name: schema.products.name, size: schema.orderItems.size, quantity: schema.orderItems.quantity, unit: schema.orderItems.unitPriceCentavos })
      .from(schema.orderItems)
      .innerJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
      .where(eq(schema.orderItems.orderUuid, id)),
    db
      .select({ status: schema.statusEvents.status, at: schema.statusEvents.createdAt, note: schema.statusEvents.note, by: schema.adminAccounts.email })
      .from(schema.statusEvents)
      .leftJoin(schema.adminAccounts, eq(schema.adminAccounts.id, schema.statusEvents.changedBy))
      .where(eq(schema.statusEvents.orderUuid, id))
      .orderBy(asc(schema.statusEvents.createdAt)),
    db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .innerJoin(schema.paymentProofs, eq(schema.paymentProofs.orderUuid, schema.orders.id))
      .where(and(eq(schema.orders.status, "pending_payment"), ne(schema.orders.id, id)))
      .orderBy(asc(schema.paymentProofs.createdAt))
      .limit(1),
    findDuplicateReferences(id),
  ]);

  const canReview = order.status === "pending_payment" && !!proof;
  const mapOk = order.homeAddressLink.startsWith("https://");

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin" className="text-sm underline underline-offset-4">
          All orders
        </Link>
        {next && (
          <Link href={`/admin/orders/${next.id}`} className="ml-auto rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700">
            Next order waiting
          </Link>
        )}
      </div>

      {limitMessage && !limitMessage.ok && (
        <p role="alert" className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {limitMessage.message}
        </p>
      )}
      {notice && NOTICE[notice] && (
        <p role="alert" className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {NOTICE[notice]}
        </p>
      )}
      {done && DONE[done] && (
        <p role="status" className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {DONE[done]}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{order.orderId}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Receipt</h2>
            {proof ? <ReceiptViewer src={`/api/admin/receipts/${order.id}`} /> : <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">No receipt uploaded yet.</p>}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Check against the receipt</h2>
            <dl className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <Fact label="Total the buyer owes">
                <strong className="text-base tabular-nums">{formatPeso(order.totalCentavos)}</strong>
              </Fact>
              <Fact label="Paid via">{proof?.channel ?? "-"}</Fact>
              <Fact label="Reference typed">
                <span className="font-mono">{proof?.referenceNumber ?? "-"}</span>
              </Fact>
            </dl>
            {proof && (
              <div className="mt-4">
                <OcrPanel
                  totalCentavos={order.totalCentavos}
                  typedReference={proof.referenceNumber}
                  ocrAmount={proof.ocrAmount}
                  ocrReference={proof.ocrReference}
                  ocrResult={proof.ocrResult}
                  duplicates={duplicates}
                />
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Items</h2>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {items.map((i, n) => (
                    <tr key={n}>
                      <td className="px-3 py-2">{i.name}</td>
                      <td className="px-3 py-2 text-zinc-500">Size {i.size}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {i.quantity} × {formatPeso(i.unit)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatPeso(i.unit * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Buyer</h2>
            <dl className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <Fact label="Name">{order.buyerName}</Fact>
              <Fact label="Email">{order.email}</Fact>
              <Fact label="Contact number">{order.contactNumber}</Fact>
              <Fact label="University">{order.university}</Fact>
              <Fact label="University address">{order.universityAddress}</Fact>
              <Fact label="Home address">
                {mapOk ? (
                  <a href={order.homeAddressLink} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    Open in Google Maps
                  </a>
                ) : (
                  "-"
                )}
              </Fact>
              <Fact label="Landmark">{order.homeLandmark}</Fact>
            </dl>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">History</h2>
            <ol className="space-y-2 text-sm">
              {events.map((e, n) => (
                <li key={n} className="flex flex-wrap gap-x-3">
                  <span className="w-44 text-zinc-500">{formatManila(e.at)}</span>
                  <span className="font-medium">{STATUS_LABEL[e.status]}</span>
                  <span className="text-zinc-500">
                    {e.by ? `by ${e.by}` : "by the system"}
                    {e.note ? `, ${e.note}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-zinc-200 p-5 lg:sticky lg:top-6 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Decision</h2>
          {canReview ? (
            <div className="mt-4">
              <ReviewActions orderUuid={order.id} />
            </div>
          ) : order.status === "order_received" ? (
            <p className="mt-3 text-sm text-zinc-500">The buyer has not uploaded a receipt yet, so there is nothing to verify.</p>
          ) : (
            <div className="mt-3">
              <p className="mb-3 text-sm text-zinc-500">This order is {STATUS_LABEL[order.status]}. Move it one step forward:</p>
              <StatusControl orderUuid={order.id} options={generalNextStatuses(order.status)} />
              <CorrectionForm orderUuid={order.id} targets={correctionTargets(order.status)} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

export default function OrderReviewPage({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading order…</p>}>
        <Review params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
