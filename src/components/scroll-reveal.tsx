"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Eases each .shop-reveal block (and its cards, one after another) into place the first time it scrolls into
// view, then leaves it alone. Blocks stay visible until this runs, so the page never depends on it; the CSS
// in src/app/shop.css only hides blocks marked data-reveal="wait".
export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".shop-reveal:not([data-reveal='in'])"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.reveal = "in";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const el of els) {
      // Already on screen at load: show as is, no animation.
      if (el.dataset.reveal !== "wait" && el.getBoundingClientRect().top < window.innerHeight * 0.88) continue;
      el.dataset.reveal = "wait";
      io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
