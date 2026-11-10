"use client";

import { useEffect } from "react";

// Marks <html data-scrolled> once the page has scrolled past the top, so CSS can change the header (it turns into
// a floating pill and shows the shop name; see src/app/start-intro.css). Renders nothing.
const THRESHOLD_PX = 40;

export function ScrollFlag() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.toggleAttribute("data-scrolled", window.scrollY > THRESHOLD_PX);
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
    };
  }, []);
  return null;
}
