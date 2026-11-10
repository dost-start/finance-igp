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
  const fitClass = fit === "contain" ? "object-contain p-[10%]" : "object-cover";

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
      className="relative rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-product-backdrop">
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
            className="absolute left-3 top-[calc((100%-4.75rem)/2)] flex size-11 -translate-y-1/2 sm:top-[calc((100%-5.75rem)/2)] items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-zinc-900/85 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next photo"
            className="absolute right-3 top-[calc((100%-4.75rem)/2)] flex size-11 -translate-y-1/2 sm:top-[calc((100%-5.75rem)/2)] items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-zinc-900/85 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Thumbnails under the photo: tap one to jump to it. */}
          <div className="mt-3 flex gap-3">
            {images.map((img, i) => (
              <button
                key={img.url + i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${count}`}
                aria-current={i === index ? "true" : undefined}
                className={`relative size-16 overflow-hidden rounded-xl bg-product-backdrop transition sm:size-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                  i === index ? "ring-2 ring-zinc-950 ring-offset-2 ring-offset-background dark:ring-zinc-100" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={img.url} alt="" width={160} height={160} unoptimized className={`size-full ${fit === "contain" ? "object-contain p-1.5" : "object-cover"}`} />
              </button>
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
