import Image from "next/image";
import Link from "next/link";
import { getActiveProducts } from "@/lib/catalog";
import { formatPeso } from "@/lib/money";

export const metadata = { title: "Shop" };

export default async function Shop() {
  const products = await getActiveProducts();

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">Shop</h1>
      <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
        Merchandise for the START-DOST community of DOST technoscholars. Placeholder items and prices while the real catalog is being finalized.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const soldOut = p.sizes.every((s) => !s.available);
          return (
            <li key={p.id}>
              <Link href={`/products/${p.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
                <div className="relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                  <Image
                    src={p.images[0]?.url ?? "/products/jacket.svg"}
                    alt={p.name}
                    width={600}
                    height={600}
                    unoptimized
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.03]"
                  />
                  {soldOut && <span className="absolute left-2 top-2 rounded bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">Sold out</span>}
                </div>
                <p className="mt-3 text-sm font-medium group-hover:underline">{p.name}</p>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{formatPeso(p.priceCentavos)}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
