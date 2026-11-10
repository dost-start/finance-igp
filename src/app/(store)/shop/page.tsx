import Image from "next/image";
import { getActiveProducts } from "@/lib/catalog";
import { IntroReplayButton } from "@/components/intro-replay-button";
import { ProductCard } from "@/components/product-card";
import { ShelfRow } from "@/components/shelf-row";
import { StartIntro } from "@/components/start-intro";
import { MORE_SHELF, SHELVES } from "@/lib/shelves";

export const metadata = { title: "Shop" };

type Product = Awaited<ReturnType<typeof getActiveProducts>>[number];

const imageOf = (p: Product) => p.images[0]?.url ?? "/products/jacket.svg";

export default async function Shop() {
  const products = await getActiveProducts();

  const known = new Set<string>(SHELVES.flatMap((s) => s.types));
  const shelves = [
    ...SHELVES.map((s) => ({ ...s, items: products.filter((p) => (s.types as readonly string[]).includes(p.productType)) })),
    { ...MORE_SHELF, items: products.filter((p) => !known.has(p.productType)) },
  ].filter((s) => s.items.length > 0);

  const stickers = products.filter((p) => p.productType === "sticker");

  // The hero collage uses real products: one of each kind that reads best at a glance.
  const firstOf = (type: string) => products.find((p) => p.productType === type);
  const collage = {
    jacket: firstOf("jacket"),
    tee: firstOf("tshirt"),
    pin: firstOf("pin"),
    sticker: stickers.find((p) => /just start/i.test(p.name)) ?? stickers[0],
  };

  return (
    <main className="shop-page">
      {/* The logo intro, when this is the first page opened this session (see the root layout). */}
      <StartIntro />
      {/* Hero: a brand-blue panel. The big quarter circles are the tiles of the START mark; the collage on the
          right is real products, tilted like things laid out on a desk, drifting gently. The text side stays short:
          title and one button. */}
      <section className="lift-panel relative isolate overflow-hidden rounded-3xl bg-brand-blue text-zinc-950">
        <div aria-hidden="true" className="absolute -right-10 -top-10 -z-10 size-56 rounded-bl-full bg-brand-yellow sm:size-80" />
        <div aria-hidden="true" className="absolute -bottom-20 right-[20%] -z-10 size-56 rounded-t-full bg-white/20 sm:size-72" />
        {/* A fine dot grid gives the flat blue some texture. */}
        <div aria-hidden="true" className="shop-dots absolute inset-0 -z-10" />
        {/* Circuit lines and nodes, the motif of the mark's top-left tile, drawing themselves in behind the title. */}
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 260 180"
          className="shop-circuit absolute -left-4 -top-2 -z-10 w-56 text-white/45 sm:left-2 sm:top-2 sm:w-72"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path pathLength={1} d="M18 30 L62 58 L104 50 L150 84 L206 76" />
          <path pathLength={1} d="M62 58 L48 104 L86 138 L140 130" />
          <path pathLength={1} d="M104 50 L120 18 L170 22" />
          <path pathLength={1} d="M150 84 L168 132 L230 150" />
          <path pathLength={1} d="M86 138 L70 170" />
          <g fill="currentColor" stroke="none">
            <circle cx="62" cy="58" r="7" />
            <circle cx="150" cy="84" r="8" />
            <circle cx="86" cy="138" r="6" />
            <circle cx="18" cy="30" r="3.5" />
            <circle cx="206" cy="76" r="3.5" />
            <circle cx="170" cy="22" r="3.5" />
            <circle cx="140" cy="130" r="3.5" />
            <circle cx="230" cy="150" r="3.5" />
            <circle cx="70" cy="170" r="3.5" />
          </g>
        </svg>

        <div className="grid items-center gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1fr_1fr] lg:gap-6">
          <div>
            <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              The{" "}
              {/* A yellow bar under START, cut like a step of the wordmark's pyramid. */}
              {/* START is also a button: pressing it plays the logo intro again. */}
              <IntroReplayButton>
                <span aria-hidden="true" className="shop-highlight absolute -inset-x-[0.1em] bottom-[0.06em] -z-10 h-[0.36em] bg-brand-yellow" />
                START
              </IntroReplayButton>
              <br />
              Collection.
            </h1>

            <div className="mt-8">
              <a
                href={`#${shelves[0]?.id ?? "apparel"}`}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              >
                Start browsing
                <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 4v12m0 0-5-5m5 5 5-5" />
                </svg>
              </a>
            </div>
          </div>

          <div aria-hidden="true" className="relative mx-auto aspect-[5/4] w-full max-w-md lg:max-w-none">
            {collage.jacket && (
              <div className="absolute left-[2%] top-[2%] w-[54%] -rotate-6">
                <div className="shop-float overflow-hidden rounded-2xl bg-product-backdrop shadow-2xl shadow-zinc-950/30 ring-4 ring-white">
                  <Image src={imageOf(collage.jacket)} alt="" width={500} height={500} unoptimized priority className="aspect-square w-full object-cover" />
                </div>
              </div>
            )}
            {collage.tee && (
              <div className="absolute right-[2%] top-[14%] w-[50%] rotate-[5deg]">
                <div className="shop-float overflow-hidden rounded-2xl bg-product-backdrop shadow-2xl shadow-zinc-950/30 ring-4 ring-white [animation-delay:-2s]">
                  <Image src={imageOf(collage.tee)} alt="" width={500} height={500} unoptimized priority className="aspect-square w-full object-cover" />
                </div>
              </div>
            )}
            {collage.pin && (
              <div className="absolute bottom-[0%] left-[26%] w-[26%] -rotate-12">
                <div className="shop-float drop-shadow-xl [animation-delay:-4s]">
                  <Image src={imageOf(collage.pin)} alt="" width={260} height={260} unoptimized className="w-full" />
                </div>
              </div>
            )}
            {collage.sticker && (
              <div className="absolute bottom-[4%] right-[6%] w-[32%] rotate-[8deg]">
                <div className="shop-float drop-shadow-xl [animation-delay:-1s]">
                  <Image src={imageOf(collage.sticker)} alt="" width={300} height={300} unoptimized className="w-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Jump-to pills, pinned just under the floating header as you scroll the shelves. */}
      <nav aria-label="Shop sections" className="sticky top-[4.75rem] z-20 mt-2 sm:top-[5.25rem]">
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 sm:justify-center [scrollbar-width:none]">
          {shelves.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/75 px-4 py-2 text-sm font-semibold shadow-[0_6px_16px_-8px_rgb(18_18_18/0.3)] backdrop-blur-md transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900/75 dark:hover:border-brand-yellow dark:hover:bg-brand-yellow"
              >
                {s.label}
                <span className="rounded-full bg-zinc-900/10 px-1.5 text-xs tabular-nums dark:bg-white/15">{s.items.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* An endless strip of sticker art, like a laptop lid. Decorative: every sticker is also on its shelf below. */}
      {stickers.length > 3 && (
        <div aria-hidden="true" className="shop-rail lift-card mt-5 overflow-hidden rounded-2xl bg-white py-4 dark:bg-zinc-900">
          <div className="shop-track">
            {[...stickers, ...stickers].map((p, i) => (
              <div key={`${p.id}-${i}`} className="shrink-0 px-4 sm:px-6">
                <Image src={imageOf(p)} alt="" width={160} height={160} unoptimized loading="lazy" className="size-16 object-contain sm:size-20" />
              </div>
            ))}
          </div>
        </div>
      )}

      {shelves.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="shop-reveal shop-shelf mt-14 scroll-mt-[9.5rem]">
          <h2 id={`${s.id}-heading`} className="flex items-baseline gap-2 text-2xl font-extrabold tracking-tight">
            <span className="shop-shelf-title">{s.label}</span>
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{s.items.length}</span>
          </h2>
          <div className="mt-5">
            <ShelfRow label={s.label}>
              {s.items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </ShelfRow>
          </div>
        </section>
      ))}
    </main>
  );
}
