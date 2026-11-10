import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { getDb, schema } from "@/db";
import { requireTech } from "@/lib/admin";
import { formatPeso } from "@/lib/money";
import { MORE_SHELF, SHELVES, shelfOf } from "@/lib/shelves";

export const metadata: Metadata = { title: "Products" };

async function Products({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  await requireTech();
  const sp = await searchParams;
  const saved = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;
  const rows = await getDb().select().from(schema.products).orderBy(asc(schema.products.sortOrder));
  const picked = Array.isArray(sp.category) ? sp.category[0] : sp.category;

  // The same categories as the shop's shelves, so what is listed here is where it shows in the shop.
  const categories = [...SHELVES.map((s) => ({ id: s.id as string, label: s.label as string })), { id: MORE_SHELF.id as string, label: MORE_SHELF.label as string }]
    .map((c) => ({ ...c, rows: rows.filter((p) => shelfOf(p.productType).id === c.id) }))
    .filter((c) => c.rows.length > 0);
  const shown = categories.filter((c) => !picked || c.id === picked);

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Products</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">Change a product&apos;s name, price, sizes and whether it is on sale. Edits show in the shop straight away. Add new products here as the real catalog arrives. Orders already placed keep the price they were placed at. Only the Technology team sees this page.</p>
      <p className="mt-4">
        <Link href="/admin/products/new" className="inline-block rounded-full bg-sky-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
          Add a product
        </Link>
      </p>
      <nav aria-label="Categories" className="mt-6 inline-flex max-w-full flex-wrap items-center gap-1 rounded-full bg-zinc-200/60 p-1 dark:bg-zinc-900">
        {[{ id: "", label: "All", count: rows.length }, ...categories.map((c) => ({ id: c.id, label: c.label, count: c.rows.length }))].map((c) => {
          const active = (picked ?? "") === c.id || (!picked && c.id === "");
          return (
            <Link
              key={c.id || "all"}
              href={c.id ? `/admin/products?category=${c.id}` : "/admin/products"}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                active ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950" : "text-zinc-600 hover:bg-white hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              }`}
            >
              {c.label} <span className={active ? "opacity-70" : "text-zinc-400"}>{c.count}</span>
            </Link>
          );
        })}
      </nav>
      {saved && (
        <p role="status" className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Saved &ldquo;{saved}&rdquo;.
        </p>
      )}
      <div className="mt-4 overflow-x-auto lift-card rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:text-zinc-400 uppercase dark:bg-zinc-900">
            <tr>
              {["Product", "Price", "Sizes", "On sale", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          {shown.map((c) => (
            <tbody key={c.id} className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr>
                <th colSpan={5} scope="colgroup" className="bg-zinc-50 px-3 py-2 text-left text-xs font-bold tracking-wide text-zinc-600 uppercase dark:bg-zinc-950 dark:text-zinc-300">
                  {c.label} <span className="font-medium text-zinc-400">({c.rows.length})</span>
                </th>
              </tr>
              {c.rows.map((p) => (
                <tr key={p.id} className={p.active ? undefined : "text-zinc-500 dark:text-zinc-400"}>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 tabular-nums">{formatPeso(p.priceCentavos)}</td>
                  <td className="px-3 py-2">{p.sizes.map((sz) => (sz.available ? sz.size : `${sz.size} (sold out)`)).join(", ")}</td>
                  <td className="px-3 py-2">{p.active ? "Yes" : "No, hidden"}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/products/${p.id}`} className="font-medium underline underline-offset-4">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}

export default function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading products…</p>}>
        <Products searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
