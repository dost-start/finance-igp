import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ProductForm } from "@/components/admin/product-form";
import { getDb, schema } from "@/db";
import { requireTech } from "@/lib/admin";

export const metadata: Metadata = { title: "Edit product" };

async function Edit({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  await requireTech();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [product] = await getDb().select().from(schema.products).where(eq(schema.products.id, id)).limit(1);
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/products" className="text-sm underline underline-offset-4">
        All products
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{product.name}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Address in the shop: <span className="font-mono">/products/{product.slug}</span>. Photos are added when the real ones arrive.
      </p>
      <ProductForm productId={product.id} initial={{ name: product.name, priceCentavos: product.priceCentavos, active: product.active, sizes: product.sizes }} />
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
