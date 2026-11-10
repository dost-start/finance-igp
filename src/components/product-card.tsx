import Image from "next/image";
import Link from "next/link";
import { isCutout } from "@/lib/shelves";
import { formatPeso } from "@/lib/money";
import type { ProductImage, ProductSize } from "@/db/schema";

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  productType: string;
  priceCentavos: number;
  images: ProductImage[];
  sizes: ProductSize[];
};

// Every card is the same width on every shelf row: two and a bit on phones, four and a bit on wide screens, so
// the next card always peeks in when a row has more to scroll to.
const CARD_WIDTH = "w-[44%] sm:w-[30%] lg:w-[23%]";

// One product in a ShelfRow (the shop's shelves, a product page's "More ..." row).
export function ProductCard({ p }: { p: CardProduct }) {
  const soldOut = p.sizes.every((s) => !s.available);
  return (
    <li className={`${CARD_WIDTH} shrink-0 snap-start`}>
      <Link
        href={`/products/${p.slug}`}
        className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700"
      >
        <div className="lift-card relative overflow-hidden rounded-2xl bg-product-backdrop">
          <Image
            src={p.images[0]?.url ?? "/products/jacket.svg"}
            alt={p.name}
            width={600}
            height={600}
            unoptimized
            className={`aspect-square w-full transition-transform duration-500 ease-out group-hover:scale-[1.04] ${isCutout(p.productType) ? "object-contain p-[12%]" : "object-cover"}`}
          />
          {soldOut && (
            <span className="absolute left-3 top-3 rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white">Sold out</span>
          )}
          {/* The price sits on the photo as a small tag, so the name below gets the full width. */}
          <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-sm font-semibold tabular-nums text-zinc-950 shadow-sm backdrop-blur">
            {formatPeso(p.priceCentavos)}
          </span>
        </div>
        <p className="mt-3 text-sm font-medium">
          <span className="shop-name">{p.name}</span>
        </p>
      </Link>
    </li>
  );
}
