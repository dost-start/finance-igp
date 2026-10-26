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
      <Link href="/admin/products" className="text-sm underline underline-offset-4">
        All products
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Add a product</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">It starts hidden unless you tick On sale, and you can edit everything except the web address afterwards.</p>
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
