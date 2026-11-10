"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

// One shop shelf as a single row that scrolls sideways. Cards snap into place, the next card peeks in at the
// edge, and on pointer devices two arrow buttons page through it; each button hides when there is nothing
// further that way, so a shelf that fits on screen shows none.
export function ShelfRow({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  const arrow =
    "absolute top-[calc(50%-1.75rem)] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white/90 text-zinc-950 shadow-md backdrop-blur transition-opacity hover:bg-brand-yellow pointer-fine:grid dark:border-zinc-700";

  return (
    <div className="relative">
      <ul
        ref={ref}
        aria-label={label}
        className="shop-row -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      <button
        type="button"
        aria-label={`Scroll ${label} back`}
        onClick={() => page(-1)}
        className={`${arrow} -left-3 ${edge.start ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={`Scroll ${label} forward`}
        onClick={() => page(1)}
        className={`${arrow} -right-3 ${edge.end ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.5 4.5 13 10l-5.5 5.5" />
        </svg>
      </button>
    </div>
  );
}
