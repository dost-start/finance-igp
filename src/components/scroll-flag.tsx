"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Marks <html data-scrolled> once the page has scrolled past the top, so CSS can change the header (it turns into
// a floating pill and shows the shop name; see src/app/start-intro.css). Renders nothing.
const THRESHOLD_PX = 40;

// Checkout and payment keep the plain top-of-page header the whole way down (it scrolls away with the page):
// their own title and steps already say where you are, so the pill and the shop name would only repeat it.
const PLAIN_HEADER = /^\/(checkout|pay)/;

export function ScrollFlag() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const plain = PLAIN_HEADER.test(pathname);
    root.toggleAttribute("data-plain-header", plain);
    let frame = 0;
    const update = () => {
      frame = 0;
      root.toggleAttribute("data-scrolled", !plain && window.scrollY > THRESHOLD_PX);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      root.removeAttribute("data-scrolled");
      root.removeAttribute("data-plain-header");
    };
  }, [pathname]);
  return null;
}
