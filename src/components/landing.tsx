"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
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

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[4.25rem] rounded-xl bg-brand-yellow px-3 py-3 text-center text-zinc-950 sm:min-w-24 sm:px-5">
      <div className="text-3xl font-extrabold tabular-nums tracking-tight sm:text-5xl">{String(value).padStart(2, "0")}</div>
      <div className="mt-0.5 text-xs font-medium">{label}</div>
    </div>
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
      {/* The brand-blue field runs edge to edge under the header. Yellow Nova is the brand book's mascot for
          countdowns and hype posts, so it hosts the launch. */}
      <section className="-mt-8 mx-[calc(50%-50vw)] bg-brand-blue text-zinc-950 dark:bg-sky-950 dark:text-zinc-50">
        <div className="mx-auto grid max-w-6xl items-center gap-4 px-4 pb-10 pt-10 sm:pb-14 sm:pt-14 md:grid-cols-[1.5fr_1fr] md:gap-8">
          <div>
            <h1 className="text-[2.75rem] font-extrabold leading-[0.95] tracking-[-0.03em] min-[400px]:text-5xl sm:text-7xl">START: COLLECTIONS</h1>
            <p className="mt-5 max-w-md text-lg font-medium text-sky-950 dark:text-sky-100">The official merchandise of the DOST technoscholar community. Wear what you stand for.</p>

            {!known && <div role="status" aria-busy="true" className="mt-8 h-28 max-w-lg animate-pulse rounded-xl bg-white/30 dark:bg-white/10"><span className="sr-only">Loading the launch countdown…</span></div>}

            {known && !live && (
              <div className="mt-8" data-phase="countdown">
                <p className="text-sm font-semibold">The store opens in</p>
                <div className="mt-3 flex flex-wrap gap-2 sm:gap-3" aria-hidden="true">
                  <Unit value={c.days} label="days" />
                  <Unit value={c.hours} label="hours" />
                  <Unit value={c.minutes} label="minutes" />
                  <Unit value={c.seconds} label="seconds" />
                </div>
                <p role="timer" className="sr-only">{countdownSentence(c)}</p>
                <p className="mt-4 text-sm font-medium text-sky-950 dark:text-sky-100">Opens {formatLaunch(launchAt)}</p>
                <p className="mt-5 text-sm">
                  Already ordered?{" "}
                  <Link href="/track" className="font-semibold underline underline-offset-4 focus-visible:outline-zinc-950 dark:focus-visible:outline-brand-yellow">
                    Track your order
                  </Link>
                </p>
              </div>
            )}

            {live && (
              <div className="mt-8" data-phase="live">
                <p className="text-2xl font-extrabold tracking-tight">The store is open</p>
                <p className="mt-2 font-medium text-sky-950 dark:text-sky-100">Everyone is welcome. No key, no ID, just pick your merch.</p>
                <Link href="/shop" className="mt-5 inline-block rounded-full bg-brand-yellow px-8 py-3 text-base font-bold text-zinc-950 hover:bg-[#ffcf00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:focus-visible:outline-brand-yellow">
                  Shop now
                </Link>
              </div>
            )}
          </div>
          <Image src="/brand/nova-yellow.webp" alt="Nova, the START-DOST mascot, giving two thumbs up" width={730} height={900} unoptimized priority className="mx-auto h-auto w-40 sm:w-56 md:mr-0 md:w-72 lg:w-80" />
        </div>
      </section>

      {lineup.length > 0 && (
        <section aria-labelledby="lineup" className="mt-14 sm:mt-20">
          <h2 id="lineup" className="text-2xl font-extrabold sm:text-3xl">
            {live ? "The lineup" : "A sneak peek"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{live ? "Tap an item to choose your size." : "A first look at what is coming. Prices and sizes arrive on launch day."}</p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {lineup.map((p) => {
              const tile = (
                <>
                  <div className="relative overflow-hidden rounded-lg bg-product-backdrop">
                    <Image src={p.image} alt={p.name} width={600} height={600} unoptimized className="aspect-square w-full object-cover" />
                    {live && p.soldOut && <span className="absolute left-2 top-2 rounded bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">Sold out</span>}
                  </div>
                  <p className="mt-3 text-sm font-medium">{p.name}</p>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{live ? formatPeso(p.priceCentavos) : "Coming soon"}</p>
                </>
              );
              return (
                <li key={p.slug}>
                  {live ? (
                    <Link href={`/products/${p.slug}`} className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">
                      {tile}
                    </Link>
                  ) : (
                    tile
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <PuzzleSlot />
    </main>
  );
}
