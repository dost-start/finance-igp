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
import { formatManilaShort } from "@/lib/email/templates";
import { formatPeso } from "@/lib/money";
import { correctionTargets, generalNextStatuses, STATUS_LABEL } from "@/lib/status";

export const metadata: Metadata = { title: "Review order" };

const NOTICE: Record<string, string> = {
  changed: "Someone else changed this order first. Nothing was saved.",
  reason: "Choose a reason before rejecting.",
  cancel_reason: "Add the reason for canceling. The buyer reads it in the email.",
  correction_reason: "Say what went wrong before saving a correction.",
};
const DONE: Record<string, string> = { confirmed: "Payment confirmed. Next order waiting.", rejected: "Payment rejected. Next order waiting.", status: "Status updated.", corrected: "Status corrected and recorded. The buyer was not emailed." };

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-sm break-words">{children}</dd>
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
        <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5l-5 5 5 5" />
          </svg>
          All orders
        </Link>
        {next && (
          <Link href={`/admin/orders/${next.id}`} className="ml-auto rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Next order waiting
          </Link>
        )}
      </div>

      {limitMessage && !limitMessage.ok && (
        <p role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {limitMessage.message}
        </p>
      )}
      {notice && NOTICE[notice] && (
        <p role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {NOTICE[notice]}
        </p>
      )}
      {done && DONE[done] && (
        <p role="status" className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {DONE[done]}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-mono text-3xl font-extrabold tracking-tight">{order.orderId}</h1>
        <StatusBadge status={order.status} />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Submitted {formatManilaShort(proof?.createdAt ?? order.createdAt)}</p>
      </div>

      {/* Two independent columns, so every card is only as tall as its own content: the receipt and the items on
          the left, the decision and the details on the right. */}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="receipt-heading" className="lift-card rounded-2xl border border-zinc-200/70 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="receipt-heading" className="mb-4 text-lg font-extrabold tracking-tight">
              Receipt
            </h2>
            {proof ? (
              <ReceiptViewer src={`/api/admin/receipts/${order.id}`} />
            ) : (
              <p className="rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">No receipt uploaded yet.</p>
            )}
          </section>

          <section aria-labelledby="buyer-heading" className="lift-card rounded-2xl border border-zinc-200/70 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="buyer-heading" className="text-lg font-extrabold tracking-tight">
              Buyer
            </h2>
            <dl className="mt-4 space-y-3.5">
              <Fact label="Name">{order.buyerName}</Fact>
              <Fact label="Email">{order.email}</Fact>
              <Fact label="Contact number">{order.contactNumber}</Fact>
              <Fact label="Name of University/College">{order.university}</Fact>
              <Fact label="University/College Address">{order.universityAddress}</Fact>
              <Fact label="Home address">
                {mapOk ? (
                  <a href={order.homeAddressLink} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4">
                    Open in Google Maps
                  </a>
                ) : (
                  "-"
                )}
              </Fact>
              <Fact label="Landmark">{order.homeLandmark}</Fact>
            </dl>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          {proof && (
            <OcrPanel
              totalCentavos={order.totalCentavos}
              typedReference={proof.referenceNumber}
              channel={proof.channel}
              ocrAmount={proof.ocrAmount}
              ocrReference={proof.ocrReference}
              ocrResult={proof.ocrResult}
              duplicates={duplicates}
            />
          )}

          <aside aria-labelledby="decision-heading" className="lift-card rounded-2xl border border-zinc-200/70 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="decision-heading" className="text-lg font-extrabold tracking-tight">
              Decision
            </h2>
            {canReview ? (
              <div className="mt-4">
                <ReviewActions orderUuid={order.id} />
              </div>
            ) : order.status === "order_received" ? (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">The buyer has not uploaded a receipt yet.</p>
            ) : (
              <div className="mt-3">
                <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">Now {STATUS_LABEL[order.status]}. Next step:</p>
                <StatusControl orderUuid={order.id} options={generalNextStatuses(order.status)} />
                <CorrectionForm orderUuid={order.id} targets={correctionTargets(order.status)} />
              </div>
            )}
          </aside>

          <section aria-labelledby="items-heading" className="lift-card rounded-2xl border border-zinc-200/70 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="items-heading" className="text-lg font-extrabold tracking-tight">
              Items
            </h2>
            <ul className="mt-3 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {items.map((i, n) => (
                <li key={n} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Size {i.size} · {i.quantity} × {formatPeso(i.unit)}
                    </p>
                  </div>
                  <p className="tabular-nums">{formatPeso(i.unit * i.quantity)}</p>
                </li>
              ))}
              <li className="flex items-center justify-between gap-4 pt-3 text-base font-extrabold">
                <span>Total</span>
                <span className="tabular-nums">{formatPeso(order.totalCentavos)}</span>
              </li>
            </ul>
          </section>

          <section aria-labelledby="history-heading" className="lift-card rounded-2xl border border-zinc-200/70 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id="history-heading" className="text-lg font-extrabold tracking-tight">
              History
            </h2>
            <ol className="mt-4 space-y-4 border-l-2 border-zinc-200 pl-4 text-sm dark:border-zinc-800">
              {events.map((e, n) => (
                <li key={n} className="relative">
                  <span aria-hidden="true" className="absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full bg-brand-yellow ring-4 ring-white dark:ring-zinc-900" />
                  <p className="font-semibold">{STATUS_LABEL[e.status]}</p>
                  <p className="text-zinc-500 dark:text-zinc-400">{formatManilaShort(e.at)}</p>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    {e.by ? `by ${e.by}` : "by the system"}
                    {e.note ? `, ${e.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}

export default function OrderReviewPage({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading order…</p>}>
        <Review params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
