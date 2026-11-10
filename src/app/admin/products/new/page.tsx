import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductForm } from "@/components/admin/product-form";
import { requireTech } from "@/lib/admin";

export const metadata: Metadata = { title: "Add a product" };

async function New() {
  await requireTech();
  return (
    <>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5l-5 5 5 5" />
        </svg>
        All products
      </Link>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">Add a product</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">It stays hidden from the shop until you turn on &ldquo;On sale&rdquo;. You can change everything except the web address later.</p>
      <ProductForm create initial={{ name: "", priceCentavos: 0, active: false, sizes: [{ size: "One size", available: true }], photos: "" }} />
    </>
  );
}

export default function NewProductPage() {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>}>
        <New />
      </Suspense>
    </main>
  );
}
