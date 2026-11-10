"use client";

import { useCallback, useEffect, useRef } from "react";
import { INTRO_SVG } from "@/components/start-intro-svg";
import { INTRO_SEEN_KEY } from "@/lib/intro";

const HOLD_MS = 450; // how long the finished logo stays on screen before it lifts away
const LEAVE_MS = 1000; // depart + curtain
const FALLBACK_MS = 6000; // if the browser never reports the animations as finished

// The landing intro. Its markup is always on the page but stays hidden (display: none) unless the root
// layout's pre-paint script marked this visit with <html data-intro="playing">; the CSS timeline in
// src/app/start-intro.css then runs from the first paint. This component only decides when it ends.
export function StartIntro() {
  const ref = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "playing") return;
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {}
    root.dataset.intro = "done";
  }, []);

  useEffect(() => {
    const pre = ref.current;
    if (!pre || document.documentElement.dataset.intro !== "playing") return;

    let cancelled = false;
    const timers: number[] = [];
    const leave = () => {
      if (cancelled || pre.classList.contains("si-leave")) return;
      pre.classList.add("si-leave");
      timers.push(window.setTimeout(finish, LEAVE_MS));
    };

    // Wait for every part of the build to finish, hold a moment, then lift away.
    const running = pre.getAnimations({ subtree: true });
    if (running.length) {
      Promise.allSettled(running.map((a) => a.finished)).then(() => timers.push(window.setTimeout(leave, HOLD_MS)));
    } else {
      timers.push(window.setTimeout(leave, HOLD_MS));
    }
    timers.push(window.setTimeout(leave, FALLBACK_MS));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
    };
  }, [finish]);

  return (
    <div ref={ref} className="si-pre" role="status" aria-label="Loading START: COLLECTIONS">
      <div className="si-pre-bg" />
      <div className="si-brand" dangerouslySetInnerHTML={{ __html: INTRO_SVG }} />
      <button type="button" className="si-skip" onClick={finish}>
        Skip intro
      </button>
    </div>
  );
}
