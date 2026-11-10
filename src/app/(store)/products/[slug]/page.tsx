import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ShelfRow } from "@/components/shelf-row";
import { getActiveProducts, getProductBySlug } from "@/lib/catalog";
import { formatPeso } from "@/lib/money";
import { isCutout, shelfOf } from "@/lib/shelves";

export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.name ?? "Product" };
}

// The address part is read inside Suspense, as Next requires, so the page shell can show at once. Unknown
// product addresses never get here: src/proxy.ts answers 404.
async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getProductBySlug(slug), getActiveProducts()]);
  if (!product) notFound();

  const images = product.images.length ? product.images : [{ url: "/products/jacket.svg", kind: "flat" as const }];
  const shelf = shelfOf(product.productType);
  // "More ..." row: the rest of this product's shelf, or, when it is alone on its shelf, the rest of the shop.
  const sameShelf = all.filter((p) => p.id !== product.id && shelfOf(p.productType).id === shelf.id);
  const related = sameShelf.length ? sameShelf : all.filter((p) => p.id !== product.id).slice(0, 8);
  const relatedTitle = sameShelf.length ? `More ${shelf.label.toLowerCase()}` : "More from the collection";

  return (
    <main>
      <Link
        href={`/shop#${shelf.id}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
        Back to shop
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12 lg:gap-16">
        <ProductGallery name={product.name} images={images} fit={isCutout(product.productType) ? "contain" : "cover"} />

        {/* Scrolls with the photos (it is shorter than they are, so pinning it only made the columns drift). */}
        <div>
          <p className="inline-flex rounded-full bg-brand-yellow px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-950">{shelf.label}</p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-2xl font-bold tabular-nums">{formatPeso(product.priceCentavos)}</p>

          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
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
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="shop-reveal mt-20">
          <h2 id="related-heading" className="text-2xl font-extrabold tracking-tight">
            {relatedTitle}
          </h2>
          <div className="mt-5">
            <ShelfRow label={relatedTitle}>
              {related.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </ShelfRow>
          </div>
        </section>
      )}
    </main>
  );
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<div role="status" aria-busy="true" className="mt-8 h-96 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-900"><span className="sr-only">Loading product…</span></div>}>
      <ProductContent params={params} />
    </Suspense>
  );
}
