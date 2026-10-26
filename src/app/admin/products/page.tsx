import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { getDb, schema } from "@/db";
import { requireTech } from "@/lib/admin";
import { formatPeso } from "@/lib/money";

export const metadata: Metadata = { title: "Products" };

async function Products({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  await requireTech();
  const sp = await searchParams;
  const saved = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;
  const rows = await getDb().select().from(schema.products).orderBy(asc(schema.products.sortOrder));

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">Change a product&apos;s name, price, sizes and whether it is on sale. Edits show in the shop straight away. Orders already placed keep the price they were placed at. Only the Technology team sees this page.</p>
      {saved && (
        <p role="status" className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          Saved &ldquo;{saved}&rdquo;.
        </p>
      )}
      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
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
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((p) => (
              <tr key={p.id} className={p.active ? undefined : "text-zinc-500 dark:text-zinc-400"}>
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 tabular-nums">{formatPeso(p.priceCentavos)}</td>
                <td className="px-3 py-2">
                  {p.sizes.map((s) => (s.available ? s.size : `${s.size} (sold out)`)).join(", ")}
                </td>
                <td className="px-3 py-2">{p.active ? "Yes" : "No, hidden"}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/products/${p.id}`} className="font-medium underline underline-offset-4">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
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
