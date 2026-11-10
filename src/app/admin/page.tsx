import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BulkForm } from "@/components/admin/bulk-form";
import { OcrBadge } from "@/components/admin/ocr-badge";
import { SelectAll } from "@/components/admin/select-all";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin";
import { formatManila } from "@/lib/email/templates";
import { formatPeso } from "@/lib/money";
import { OCR_FILTERS, PAGE_SIZE, PAYMENT_STATES, attentionRank, filtersToQuery, hasFilters, parseFilters, type OrderFilters } from "@/lib/order-filters";
import { listOrders, nextWaitingId, productOptions, waitingSummary, type OrderRow } from "@/lib/order-list";
import { ORDER_STATUSES } from "@/db/schema";
import { STATUS_LABEL, generalNextStatuses } from "@/lib/status";

export const metadata: Metadata = { title: "Orders" };

const fieldClass = "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const primaryButton = "rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

// Quick views. Each is just a payment filter in the address, so they can be bookmarked and shared.
const VIEWS = [
  { key: "verifying", label: "Needs you" },
  { key: "confirmed", label: "Paid" },
  { key: "rejected", label: "Rejected" },
  { key: "refund", label: "Canceled and refunds" },
] as const;

function Views({ f }: { f: OrderFilters }) {
  const tab = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${active ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"}`;
  return (
    <nav aria-label="Order views" className="flex flex-wrap items-center gap-1">
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
        <div className="min-w-[14rem] max-w-md flex-1">
          <label htmlFor="f-q" className="sr-only">
            Search
          </label>
          <input id="f-q" name="q" type="search" defaultValue={f.q ?? ""} placeholder="Search by order ID, name or email" autoComplete="off" className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
        </div>
        <button type="submit" className={primaryButton}>
          Search
        </button>
        <a href={`/api/admin/orders/export${filtersToQuery(f, { page: 1 })}`} className="ml-auto text-sm font-medium underline underline-offset-4">
          Export CSV
        </a>
      </div>

      <details open={open} className="group mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md py-1 text-sm font-medium text-zinc-600 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:text-zinc-400 dark:hover:text-zinc-50 [&::-webkit-details-marker]:hidden">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 5l5 5-5 5" />
          </svg>
          More filters
        </summary>
        <div className="mt-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
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
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
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
                <td className="px-3 py-3 align-top">
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
                <td className="whitespace-nowrap px-3 py-3 align-top text-[13px] text-zinc-600 dark:text-zinc-400">{formatManila(r.when)}</td>
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
  return (
    <section aria-label="Orders waiting for you" className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        {waiting > 0 ? (
          <>
            <h2 className="text-lg font-semibold">
              <Link href="/admin?pay=verifying" className="underline-offset-4 hover:underline">
                {waiting} waiting for verification
              </Link>
            </h2>
            {attention > 0 && (
              <p className="mt-1 text-sm">
                <Link href="/admin?pay=verifying&ocr=attention" className="font-medium text-amber-900 underline underline-offset-4 dark:text-amber-200">
                  {attention} {attention === 1 ? "needs" : "need"} a closer look
                </Link>
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Nothing waiting for verification</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">New receipts appear here.</p>
          </>
        )}
      </div>
      {waiting > 0 && nextId && (
        <Link href={`/admin/orders/${nextId}`} className="rounded-md bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          Review next order
        </Link>
      )}
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
        <p role="status" className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {done === "confirmed" ? "Payment confirmed." : done === "rejected" ? "Payment rejected." : "Saved."} No more orders are waiting.
        </p>
      )}
      {notice === "tech_only" && (
        <p role="alert" className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Editing products is only for the Technology team. Ask them if a product, price or size needs to change.
        </p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <Queue waiting={summary.waiting} attention={summary.attention} nextId={nextId} />

      <div className="mt-8">
        <Views f={f} />
        <SearchBar f={f} products={products} />
      </div>

      <h2 className="mt-6 text-lg font-semibold">
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
