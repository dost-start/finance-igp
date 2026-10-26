import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { getActiveProducts, getProductBySlug } from "@/lib/catalog";
import { formatPeso } from "@/lib/money";

export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.name ?? "Product" };
}

// The address part is read inside Suspense, as Next requires, so the page shell (breadcrumb space
// and layout) can show at once. Unknown product addresses never get here: src/proxy.ts answers 404.
async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const images = product.images.length ? product.images : [{ url: "/products/jacket.svg", kind: "flat" as const }];

  return (
    <main>
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-500">
        <Link href="/" className="underline underline-offset-4">
          Shop
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="space-y-4">
          {images.map((img, idx) => (
            <Image
              key={img.url + idx}
              src={img.url}
              alt={idx === 0 ? product.name : `${product.name}, ${img.kind} view`}
              width={900}
              height={900}
              unoptimized
              priority={idx === 0}
              className="aspect-square w-full rounded-lg bg-zinc-100 object-cover dark:bg-zinc-900"
            />
          ))}
        </div>

        <div className="md:sticky md:top-6 md:self-start">
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-2 text-2xl">{formatPeso(product.priceCentavos)}</p>
          <AddToCart
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              priceCentavos: product.priceCentavos,
              image: images[0].url,
              sizes: product.sizes,
            }}
          />
        </div>
      </div>
    </main>
  );
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<div role="status" aria-busy="true" className="mt-8 h-96 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"><span className="sr-only">Loading product…</span></div>}>
      <ProductContent params={params} />
    </Suspense>
  );
}
