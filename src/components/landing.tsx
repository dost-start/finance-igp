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
    <div className="min-w-[4.5rem] rounded-lg border border-zinc-200 px-3 py-3 text-center dark:border-zinc-800 sm:min-w-24 sm:px-5">
      <div className="text-3xl font-semibold tabular-nums sm:text-5xl">{String(value).padStart(2, "0")}</div>
      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{label}</div>
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
      <a href={url} className="mt-3 inline-block rounded-md bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900">
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
      <section className="mx-auto max-w-3xl pt-6 text-center sm:pt-12">
        <p className="text-sm font-medium tracking-widest text-sky-800 uppercase dark:text-sky-300">START-DOST presents</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">START: COLLECTIONS</h1>
        <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300">The official merchandise of the DOST technoscholar community. Wear what you stand for.</p>

        {!known && <div role="status" aria-busy="true" className="mx-auto mt-10 h-28 max-w-lg animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"><span className="sr-only">Loading the launch countdown…</span></div>}

        {known && !live && (
          <div className="mt-10" data-phase="countdown">
            <p className="text-sm font-medium">The store opens in</p>
            <div className="mt-3 flex flex-wrap justify-center gap-3" aria-hidden="true">
              <Unit value={c.days} label="days" />
              <Unit value={c.hours} label="hours" />
              <Unit value={c.minutes} label="minutes" />
              <Unit value={c.seconds} label="seconds" />
            </div>
            <p role="timer" className="sr-only">{countdownSentence(c)}</p>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Opens {formatLaunch(launchAt)}</p>
            <p className="mt-6 text-sm">
              Already ordered?{" "}
              <Link href="/track" className="font-medium underline underline-offset-4">
                Track your order
              </Link>
            </p>
          </div>
        )}

        {live && (
          <div className="mt-10" data-phase="live">
            <p className="text-2xl font-semibold">The store is open</p>
            <p className="mt-2 text-zinc-700 dark:text-zinc-300">Everyone is welcome. No key, no ID, just pick your merch.</p>
            <Link href="/shop" className="mt-5 inline-block rounded-md bg-sky-800 px-8 py-3 text-base font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
              Shop now
            </Link>
          </div>
        )}
      </section>

      {lineup.length > 0 && (
        <section aria-labelledby="lineup" className="mt-16">
          <h2 id="lineup" className="text-xl font-semibold">
            {live ? "The lineup" : "A sneak peek"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{live ? "Tap an item to choose your size." : "A first look at what is coming. Prices and sizes arrive on launch day."}</p>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {lineup.map((p) => {
              const tile = (
                <>
                  <div className="relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
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
