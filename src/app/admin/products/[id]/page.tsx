import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ProductForm } from "@/components/admin/product-form";
import { getDb, schema } from "@/db";
import { requireTech } from "@/lib/admin";
import { photosToText } from "@/lib/product-edit";

export const metadata: Metadata = { title: "Edit product" };

async function Edit({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  await requireTech();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [product] = await getDb().select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  if (!product) notFound();

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
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Address in the shop: <span className="font-mono">/products/{product.slug}</span>
      </p>
      <ProductForm productId={product.id} initial={{ name: product.name, priceCentavos: product.priceCentavos, active: product.active, sizes: product.sizes, photos: photosToText(product.images) }} />
    </>
  );
}

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading product…</p>}>
        <Edit params={params} />
      </Suspense>
    </main>
  );
}
