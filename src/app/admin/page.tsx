import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BulkForm } from "@/components/admin/bulk-form";
import { StoreSwitch } from "@/components/admin/store-switch";
import { isStoreLocked } from "@/lib/store";
import { OcrBadge } from "@/components/admin/ocr-badge";
import { SelectAll } from "@/components/admin/select-all";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireAdmin } from "@/lib/admin";
import { formatManila } from "@/lib/email/templates";
import { formatPeso } from "@/lib/money";
import { OCR_FILTERS, PAGE_SIZE, PAYMENT_STATES, attentionRank, filtersToQuery, hasFilters, parseFilters, type OrderFilters } from "@/lib/order-filters";
import { listOrders, productOptions, waitingSummary, type OrderRow } from "@/lib/order-list";
import { ORDER_STATUSES } from "@/db/schema";
import { STATUS_LABEL, generalNextStatuses } from "@/lib/status";

export const metadata: Metadata = { title: "Orders" };

const selectClass = "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";

function FilterBar({ f, products }: { f: OrderFilters; products: { id: string; name: string }[] }) {
  return (
    <form method="get" action="/admin" className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="f-status" className="text-sm font-medium">
            Status
          </label>
          <select id="f-status" name="status" defaultValue={f.status ?? ""} className={selectClass}>
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
          <select id="f-pay" name="pay" defaultValue={f.pay ?? ""} className={selectClass}>
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
          <select id="f-product" name="product" defaultValue={f.product ?? ""} className={selectClass}>
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
          <select id="f-ocr" name="ocr" defaultValue={f.ocr ?? ""} className={selectClass}>
            <option value="">Any</option>
            {OCR_FILTERS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-q" className="text-sm font-medium">
            Search
          </label>
          <input id="f-q" name="q" defaultValue={f.q ?? ""} placeholder="Order ID, name or email" autoComplete="off" className={selectClass} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="duplicate" value="1" defaultChecked={f.duplicate} className="size-4" />
          Only reused reference numbers
        </label>
        <button type="submit" className="rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          Apply filters
        </button>
        {hasFilters(f) && (
          <Link href="/admin" className="text-sm underline underline-offset-4">
            Clear filters
          </Link>
        )}
        <a href={`/api/admin/orders/export${filtersToQuery(f, { page: 1 })}`} className="ml-auto text-sm font-medium underline underline-offset-4">
          Export these orders to CSV
        </a>
      </div>
    </form>
  );
}

function Flags({ r }: { r: OrderRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <OcrBadge result={r.ocrResult} />
      {r.duplicate && <span className="inline-block whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">Reused reference</span>}
    </div>
  );
}

function Table({ rows }: { rows: OrderRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 dark:text-zinc-400 uppercase dark:bg-zinc-900">
          <tr>
            <th className="w-10 px-3 py-2">
              <SelectAll />
            </th>
            {["Order ID", "Buyer", "Total", "Paid via", "Reference", "Receipt reading", "Submitted", "Status"].map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((r) => {
            const urgent = attentionRank({ status: r.status, ocr: r.ocrResult, duplicate: r.duplicate }) < 3;
            const movable = generalNextStatuses(r.status).length > 0;
            return (
              <tr key={r.id} className={urgent ? "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"}>
                <td className="px-3 py-2">
                  <input type="checkbox" name="ids" value={r.id} disabled={!movable} aria-label={`Select ${r.orderId}`} className="size-4" />
                </td>
                <td className="px-3 py-2 font-mono">
                  <Link href={`/admin/orders/${r.id}`} className="underline underline-offset-4">
                    {r.orderId}
                  </Link>
                  {urgent && <span className="ml-2 text-xs font-sans font-semibold text-amber-900 dark:text-amber-200">Check first</span>}
                </td>
                <td className="px-3 py-2">{r.buyer}</td>
                <td className="px-3 py-2 tabular-nums">{formatPeso(r.total)}</td>
                <td className="px-3 py-2">{r.channel ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-xs break-all">{r.reference ?? "-"}</td>
                <td className="px-3 py-2">
                  <Flags r={r} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatManila(r.when)}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
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

async function Orders({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const done = Array.isArray(sp.done) ? sp.done[0] : sp.done;
  const notice = Array.isArray(sp.notice) ? sp.notice[0] : sp.notice;
  const store = Array.isArray(sp.store) ? sp.store[0] : sp.store;
  const [{ rows, total }, products, summary, locked] = await Promise.all([listOrders(f), productOptions(), waitingSummary(), isStoreLocked()]);

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
      {store && (
        <p role="status" className="mb-6 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {store === "closed" ? "The store is closed. Buyers cannot place orders or send payments until you reopen it." : "The store is open again."}
        </p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <StoreSwitch locked={locked} />
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/admin?pay=verifying" className="font-medium underline underline-offset-4">
          {summary.waiting} waiting for verification
        </Link>
        {summary.attention > 0 && (
          <>
            {" · "}
            <Link href="/admin?pay=verifying&ocr=attention" className="font-medium text-amber-900 underline underline-offset-4 dark:text-amber-200">
              {summary.attention} need a closer look
            </Link>
          </>
        )}
        . Orders that need a closer look are listed first.
      </p>

      <div className="mt-5">
        <FilterBar f={f} products={products} />
      </div>

      <h2 className="mt-8 text-lg font-semibold">
        {hasFilters(f) ? "Matching orders" : "All orders"} ({total})
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{hasFilters(f) ? "No orders match these filters." : "No orders yet. New orders appear here as buyers check out."}</p>
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
