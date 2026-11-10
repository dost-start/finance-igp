"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type GalleryImage = { url: string; kind: "flat" | "model" };

// One photo at a time with previous/next buttons (front and back of a shirt, say), instead of a long
// stack of photos. Works with the arrow keys and with a swipe on a phone. With a single photo it is
// just the photo, no buttons.
export function ProductGallery({ name, images, fit }: { name: string; images: GalleryImage[]; fit: "cover" | "contain" }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = images.length;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);
  const fitClass = fit === "contain" ? "object-contain p-2" : "object-cover";

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={`${name} photos`}
      tabIndex={count > 1 ? 0 : undefined}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          go(1);
        }
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null || count < 2) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
      className="relative rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-product-backdrop">
        {images.map((img, i) => (
          <Image
            key={img.url + i}
            src={img.url}
            alt={i === 0 ? name : `${name}, photo ${i + 1} of ${count}`}
            width={900}
            height={900}
            unoptimized
            priority={i === 0}
            loading={i === 0 ? undefined : "eager"}
            aria-hidden={i !== index}
            className={`absolute inset-0 size-full transition-opacity duration-200 ${fitClass} ${i === index ? "opacity-100" : "pointer-events-none opacity-0"}`}
          />
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-zinc-900/85 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-zinc-900/85 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden="true">
            {images.map((img, i) => (
              <span key={img.url + i} className={`size-2 rounded-full ${i === index ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-900/30 dark:bg-zinc-100/30"}`} />
            ))}
          </div>
          <p className="sr-only" aria-live="polite">
            Photo {index + 1} of {count}
          </p>
        </>
      )}
    </div>
  );
}
