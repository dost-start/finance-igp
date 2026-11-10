"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ShelfRow } from "@/components/shelf-row";
import { DEFAULT_LAUNCH_AT, countdown, countdownSentence, formatLaunch, launchMs } from "@/lib/launch";
import { formatPeso } from "@/lib/money";
import { useStoreInfo } from "@/lib/use-store-locked";

export type LineupItem = { slug: string; name: string; image: string; priceCentavos: number; soldOut: boolean };

// A clock that ticks every second on the page and says "not known yet" (0) while the page is built.
function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const useSecond = (): number => useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 1000), () => 0);

// One countdown tile. Each new value is a new element (key), so it rolls in with .lp-tick (src/app/shop.css).
function Unit({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className="min-w-0 flex-1 text-center sm:w-24 sm:flex-none">
      <div className="overflow-hidden rounded-2xl bg-zinc-950 py-3 text-white shadow-lg shadow-zinc-950/25 sm:py-4">
        <span key={text} className="lp-tick block text-2xl font-extrabold tabular-nums tracking-tight min-[400px]:text-3xl sm:text-5xl">
          {text}
        </span>
      </div>
      <div className="mt-2 text-[0.65rem] font-semibold uppercase tracking-wider sm:text-xs">{label}</div>
    </div>
  );
}

// The yellow colon between two tiles.
const Colon = () => <span className="shrink-0 pt-3 text-xl font-extrabold text-brand-yellow sm:pt-4 sm:text-4xl">:</span>;

// The circuit art from the START mark, drawing itself in behind the title (styles in src/app/shop.css).
function CircuitArt() {
  return (
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
  );
}

// Reserved for the puzzle (it has its own PRD). It never blocks the store: with no address set it is empty.
function PuzzleSlot() {
  const url = process.env.NEXT_PUBLIC_PUZZLE_URL;
  if (!url) return <section id="puzzle" aria-label="Puzzle" data-slot="puzzle" />;
  return (
    <section id="puzzle" aria-label="Puzzle" data-slot="puzzle" className="mt-12 rounded-lg border border-sky-300 bg-sky-50 p-6 text-center dark:border-sky-900 dark:bg-sky-950">
      <h2 className="text-lg font-semibold">The START puzzle</h2>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">Solve it for a surprise. You do not need it to shop.</p>
      <a href={url} className="mt-3 inline-block rounded-full bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900">
        Open the puzzle
      </a>
    </section>
  );
}

export function Landing({ lineup }: { lineup: LineupItem[] }) {
  const info = useStoreInfo();
  const second = useSecond();
  const launchAt = info?.launchAt ?? DEFAULT_LAUNCH_AT;
  // Until the clock and the setting are both known, show a quiet placeholder instead of a wrong state.
  const known = info !== null && second !== 0;
  const now = second * 1000;
  const c = countdown(launchMs(launchAt), now);
  const live = known && c.done;

  return (
    <main>
      {/* Hero: the brand-blue panel of the shop page (tiles of the START mark in the corners, a dot grid, circuit art),
          with Yellow Nova, the brand book's mascot for countdowns and hype posts, hosting the launch. */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-brand-blue text-zinc-950">
        <div aria-hidden="true" className="absolute -right-10 -top-10 -z-10 size-56 rounded-bl-full bg-brand-yellow sm:size-80" />
        <div aria-hidden="true" className="absolute -bottom-20 right-[22%] -z-10 size-56 rounded-t-full bg-white/20 sm:size-72" />
        <div aria-hidden="true" className="shop-dots absolute inset-0 -z-10" />
        <CircuitArt />

        <div className="grid items-center gap-6 px-5 py-10 sm:px-10 sm:py-14 md:grid-cols-[1.5fr_1fr] md:gap-8">
          <div>
            <h1 className="text-[2.75rem] font-extrabold leading-[0.95] tracking-[-0.03em] min-[400px]:text-5xl sm:text-7xl">
              <span className="relative isolate inline-block">
                <span aria-hidden="true" className="shop-highlight absolute -inset-x-[0.08em] bottom-[0.04em] -z-10 h-[0.32em] bg-brand-yellow" />
                START:
              </span>{" "}
              COLLECTIONS
            </h1>
            <p className="mt-5 max-w-md text-lg font-medium text-zinc-950/80">The official merchandise of the DOST technoscholar community. Wear what you stand for.</p>

            {!known && <div role="status" aria-busy="true" className="mt-8 h-36 max-w-lg animate-pulse rounded-2xl bg-white/30"><span className="sr-only">Loading the launch countdown…</span></div>}

            {known && !live && (
              <div className="mt-8" data-phase="countdown">
                <p className="text-sm font-bold uppercase tracking-wider">The store opens in</p>
                <div className="mt-3 flex max-w-md items-start gap-1 sm:max-w-none sm:gap-3" aria-hidden="true">
                  <Unit value={c.days} label="days" />
                  <Colon />
                  <Unit value={c.hours} label="hours" />
                  <Colon />
                  <Unit value={c.minutes} label="minutes" />
                  <Colon />
                  <Unit value={c.seconds} label="seconds" />
                </div>
                <p role="timer" className="sr-only">{countdownSentence(c)}</p>
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/85 px-3.5 py-1.5 text-sm font-semibold text-zinc-950 shadow-sm">
                  <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5.5h12v10H4zM4 9h12M7.5 3.5v3M12.5 3.5v3" />
                  </svg>
                  Opens {formatLaunch(launchAt)}
                </p>
                <p className="mt-5 text-sm font-medium">
                  Already ordered?{" "}
                  <Link href="/track" className="font-bold underline underline-offset-4 focus-visible:outline-zinc-950">
                    Track your order
                  </Link>
                </p>
              </div>
            )}

            {live && (
              <div className="mt-8" data-phase="live">
                <p className="text-2xl font-extrabold tracking-tight">The store is open</p>
                <p className="mt-2 font-medium text-zinc-950/80">Everyone is welcome. No key, no ID, just pick your merch.</p>
                <Link
                  href="/shop"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-7 py-3 text-base font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
                >
                  Shop now
                  <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10h12m0 0-5-5m5 5-5 5" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
          <Image
            src="/brand/nova-yellow.webp"
            alt="Nova, the START-DOST mascot, giving two thumbs up"
            width={730}
            height={900}
            unoptimized
            priority
            className="shop-float mx-auto h-auto w-40 drop-shadow-2xl sm:w-56 md:mr-0 md:w-72 lg:w-80"
          />
        </div>
      </section>

      {lineup.length > 0 && (
        <section aria-labelledby="lineup" className="mt-14 sm:mt-16">
          <h2 id="lineup" className="text-2xl font-extrabold tracking-tight">
            {live ? "The lineup" : "A sneak peek"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{live ? "Tap an item to choose your size." : "A first look at what is coming. Prices and sizes arrive on launch day."}</p>
          <div className="mt-5">
            <ShelfRow label={live ? "The lineup" : "A sneak peek"}>
              {lineup.map((p) => {
                const tile = (
                  <>
                    <div className="relative overflow-hidden rounded-2xl bg-product-backdrop transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-zinc-900/15">
                      <Image src={p.image} alt={p.name} width={600} height={600} unoptimized className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
                      {live && p.soldOut && <span className="absolute left-3 top-3 rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white">Sold out</span>}
                      <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-sm font-semibold tabular-nums text-zinc-950 shadow-sm backdrop-blur">
                        {live ? formatPeso(p.priceCentavos) : "Coming soon"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium">
                      <span className="shop-name">{p.name}</span>
                    </p>
                  </>
                );
                return (
                  <li key={p.slug} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[23%]">
                    {live ? (
                      <Link href={`/products/${p.slug}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
                        {tile}
                      </Link>
                    ) : (
                      tile
                    )}
                  </li>
                );
              })}
            </ShelfRow>
          </div>
        </section>
      )}

      <PuzzleSlot />
    </main>
  );
}
