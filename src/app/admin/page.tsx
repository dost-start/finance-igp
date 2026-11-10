import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BulkForm } from "@/components/admin/bulk-form";
import { OcrBadge } from "@/components/admin/ocr-badge";
import { SelectAll } from "@/components/admin/select-all";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin";
import { formatManilaShort } from "@/lib/email/templates";
import { formatPeso } from "@/lib/money";
import { OCR_FILTERS, PAGE_SIZE, PAYMENT_STATES, attentionRank, filtersToQuery, hasFilters, parseFilters, type OrderFilters } from "@/lib/order-filters";
import { listOrders, nextWaitingId, productOptions, waitingSummary, type OrderRow } from "@/lib/order-list";
import { ORDER_STATUSES } from "@/db/schema";
import { STATUS_LABEL, generalNextStatuses } from "@/lib/status";

export const metadata: Metadata = { title: "Orders" };

const fieldClass = "mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950";
const primaryButton = "rounded-full bg-sky-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

// Quick views. Each is just a payment filter in the address, so they can be bookmarked and shared.
const VIEWS = [
  { key: "verifying", label: "Needs you" },
  { key: "confirmed", label: "Paid" },
  { key: "rejected", label: "Rejected" },
  { key: "refund", label: "Canceled and refunds" },
] as const;

function Views({ f }: { f: OrderFilters }) {
  const tab = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${active ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950" : "text-zinc-600 hover:bg-white hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"}`;
  return (
    <nav aria-label="Order views" className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full bg-zinc-200/60 p-1 dark:bg-zinc-900">
      <Link href="/admin" aria-current={!f.pay ? "page" : undefined} className={tab(!f.pay)}>
        All orders
      </Link>
      {VIEWS.map((v) => (
        <Link key={v.key} href={`/admin?pay=${v.key}`} aria-current={f.pay === v.key ? "page" : undefined} className={tab(f.pay === v.key)}>
          {v.label}
        </Link>
      ))}
    </nav>
  );
}

function SearchBar({ f, products }: { f: OrderFilters; products: { id: string; name: string }[] }) {
  const open = Boolean(f.status || f.product || f.ocr || f.duplicate || (f.pay && !VIEWS.some((v) => v.key === f.pay)));
  return (
    <form method="get" action="/admin" className="mt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[14rem] max-w-md flex-1">
          <label htmlFor="f-q" className="sr-only">
            Search
          </label>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M9 15.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM14 14l3.5 3.5" />
          </svg>
          <input id="f-q" name="q" type="search" defaultValue={f.q ?? ""} placeholder="Search by order ID, name or email" autoComplete="off" className="w-full rounded-full border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950" />
        </div>
        <button type="submit" className={primaryButton}>
          Search
        </button>
        <a href={`/api/admin/orders/export${filtersToQuery(f, { page: 1 })}`} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-800">
          Export CSV
        </a>
      </div>

      <details open={open} className="group mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-xl py-1 text-sm font-medium text-zinc-600 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:text-zinc-400 dark:hover:text-zinc-50 [&::-webkit-details-marker]:hidden">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5l5 5-5 5" />
          </svg>
          More filters
        </summary>
        <div className="mt-3 lift-card rounded-2xl border border-zinc-200/70 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="f-status" className="text-sm font-medium">
                Status
              </label>
              <select id="f-status" name="status" defaultValue={f.status ?? ""} className={fieldClass}>
                <option value="">Any</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-pay" className="text-sm font-medium">
                Payment
              </label>
              <select id="f-pay" name="pay" defaultValue={f.pay ?? ""} className={fieldClass}>
                <option value="">Any</option>
                {PAYMENT_STATES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-product" className="text-sm font-medium">
                Product
              </label>
              <select id="f-product" name="product" defaultValue={f.product ?? ""} className={fieldClass}>
                <option value="">Any</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="f-ocr" className="text-sm font-medium">
                Receipt reading
              </label>
              <select id="f-ocr" name="ocr" defaultValue={f.ocr ?? ""} className={fieldClass}>
                <option value="">Any</option>
                {OCR_FILTERS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="duplicate" value="1" defaultChecked={f.duplicate} className="size-4" />
              Only reused reference numbers
            </label>
            <button type="submit" className={primaryButton}>
              Apply filters
            </button>
            {hasFilters(f) && (
              <Link href="/admin" className="text-sm underline underline-offset-4">
                Clear filters
              </Link>
            )}
          </div>
        </div>
      </details>
    </form>
  );
}

// The receipt signals that matter for a row. A waiting order always shows what the receipt reading said;
// other orders only show a problem. "Reused reference" is shown wherever it is true.
function Flags({ r }: { r: OrderRow }) {
  const waiting = r.status === "pending_payment";
  const showOcr = r.ocrResult !== null && (waiting || r.ocrResult === "mismatch" || r.ocrResult === "unreadable");
  if (!showOcr && !r.duplicate) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {showOcr && <OcrBadge result={r.ocrResult} />}
      {r.duplicate && <span className="inline-block whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">Reused reference</span>}
    </div>
  );
}

function Table({ rows }: { rows: OrderRow[] }) {
  return (
    <div className="overflow-x-auto lift-card rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="w-10 px-3 py-2.5">
              <SelectAll />
            </th>
            <th className="px-3 py-2.5 font-medium">Order ID</th>
            <th className="px-3 py-2.5 font-medium">Buyer</th>
            <th className="px-3 py-2.5 text-right font-medium">Total</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((r) => {
            const urgent = attentionRank({ status: r.status, ocr: r.ocrResult, duplicate: r.duplicate }) < 3;
            const movable = generalNextStatuses(r.status).length > 0;
            return (
              <tr key={r.id} className={urgent ? "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"}>
                <td className={`border-l-4 px-3 py-3 align-top ${urgent ? "border-amber-400" : "border-transparent"}`}>
                  <input type="checkbox" name="ids" value={r.id} disabled={!movable} aria-label={`Select ${r.orderId}`} className="size-4" />
                </td>
                <td className="px-3 py-3 align-top font-mono">
                  <Link href={`/admin/orders/${r.id}`} className="underline underline-offset-4">
                    {r.orderId}
                  </Link>
                  {urgent && <span className="ml-2 whitespace-nowrap font-sans text-xs font-semibold text-amber-900 dark:text-amber-200">Check first</span>}
                </td>
                <td className="px-3 py-3 align-top">{r.buyer}</td>
                <td className="px-3 py-3 text-right align-top tabular-nums">{formatPeso(r.total)}</td>
                <td className="px-3 py-3 align-top">
                  <StatusBadge status={r.status} />
                  <Flags r={r} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-[13px] text-zinc-600 dark:text-zinc-400">{formatManilaShort(r.when)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pager({ f, total }: { f: OrderFilters; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages === 1) return null;
  return (
    <nav aria-label="Pages" className="mt-4 flex items-center gap-4 text-sm">
      {f.page > 1 ? (
        <Link href={`/admin${filtersToQuery(f, { page: f.page - 1 })}`} className="underline underline-offset-4">
          Previous
        </Link>
      ) : (
        <span className="text-zinc-400">Previous</span>
      )}
      <span className="text-zinc-500 dark:text-zinc-400">
        Page {f.page} of {pages}
      </span>
      {f.page < pages ? (
        <Link href={`/admin${filtersToQuery(f, { page: f.page + 1 })}`} className="underline underline-offset-4">
          Next
        </Link>
      ) : (
        <span className="text-zinc-400">Next</span>
      )}
    </nav>
  );
}

// The first thing finance sees: how many orders are waiting, and one button to start on the one that needs
// them most. Everything else on the page is for finding a particular order.
function Queue({ waiting, attention, nextId }: { waiting: number; attention: number; nextId: string | null }) {
  if (waiting === 0) {
    return (
      <section aria-label="Orders waiting for you" className="lift-card mt-6 flex items-center gap-4 rounded-3xl border border-zinc-200/70 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <svg viewBox="0 0 20 20" className="size-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Nothing waiting for verification</h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">You are all caught up. New receipts appear here.</p>
        </div>
      </section>
    );
  }
  return (
    <section aria-label="Orders waiting for you" className="lift-panel relative isolate mt-6 overflow-hidden rounded-3xl bg-brand-blue p-6 text-zinc-950 sm:p-8">
      <div aria-hidden="true" className="absolute -right-10 -top-10 -z-10 size-40 rounded-bl-full bg-brand-yellow sm:size-52" />
      <div aria-hidden="true" className="shop-dots absolute inset-0 -z-10" />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <p className="text-6xl font-extrabold leading-none tracking-tight tabular-nums sm:text-7xl">{waiting}</p>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            <Link href="/admin?pay=verifying" className="underline-offset-4 hover:underline">
              {waiting === 1 ? "order is" : "orders are"} waiting for verification
            </Link>
          </h2>
          {attention > 0 && (
            <p className="mt-1 text-sm font-semibold">
              <Link href="/admin?pay=verifying&ocr=attention" className="underline underline-offset-4">
                {attention} {attention === 1 ? "needs" : "need"} a closer look
              </Link>
            </p>
          )}
        </div>
        {nextId && (
          <Link href={`/admin/orders/${nextId}`} className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950">
            Review next order
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10h12m0 0-5-5m5 5-5 5" />
            </svg>
          </Link>
        )}
      </div>
    </section>
  );
}

const VIEW_TITLE: Record<string, string> = { verifying: "Waiting for verification", confirmed: "Paid orders", rejected: "Rejected payments", refund: "Canceled and refunded", no_receipt: "No receipt yet" };

async function Orders({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const done = Array.isArray(sp.done) ? sp.done[0] : sp.done;
  const notice = Array.isArray(sp.notice) ? sp.notice[0] : sp.notice;
  const [{ rows, total }, products, summary, nextId] = await Promise.all([listOrders(f), productOptions(), waitingSummary(), nextWaitingId()]);
  const title = hasFilters(f) ? "Matching orders" : "All orders";

  return (
    <>
      {done && (
        <p role="status" className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {done === "confirmed" ? "Payment confirmed." : done === "rejected" ? "Payment rejected." : "Saved."} No more orders are waiting.
        </p>
      )}
      {notice === "tech_only" && (
        <p role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Editing products is only for the Technology team. Ask them if a product, price or size needs to change.
        </p>
      )}
      <h1 className="text-3xl font-extrabold tracking-tight">Orders</h1>
      <Queue waiting={summary.waiting} attention={summary.attention} nextId={nextId} />

      <div className="mt-8">
        <Views f={f} />
        <SearchBar f={f} products={products} />
      </div>

      <h2 className="mt-8 text-xl font-extrabold tracking-tight">
        {f.pay && !f.status && !f.product && !f.ocr && !f.duplicate && !f.q ? (VIEW_TITLE[f.pay] ?? title) : title} ({total})
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{hasFilters(f) ? "No orders match these filters." : "No orders yet."}</p>
      ) : (
        <div className="mt-3">
          <BulkForm>
            <Table rows={rows} />
          </BulkForm>
          <Pager f={f} total={total} />
        </div>
      )}
    </>
  );
}

export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading orders…</p>}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
