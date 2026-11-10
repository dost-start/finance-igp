"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO_SVG } from "@/components/start-intro-svg";
import { INTRO_SEEN_KEY, INTRO_REPLAY_EVENT } from "@/lib/intro";

const HOLD_MS = 450; // how long the finished logo stays on screen before it lifts away
const LEAVE_MS = 1000; // depart + curtain
const FALLBACK_MS = 6000; // if the browser never reports the animations as finished

// Animations outside the intro that belong to its hand-over: the header's mark and wordmark reveal, and the shop
// hero's circuit art and START highlight. On a replay they are rewound, then played again as the curtain lifts.
const HANDOVER = ".si-hdr-mark, .si-hdr-tease, .si-hdr-tease-word, .shop-circuit path, .shop-circuit g, .shop-highlight";

// The logo intro. Its markup is always on the page but stays hidden (display: none) unless <html data-intro> is
// "playing": the root layout's pre-paint script sets that on the first visit of a session, and a replay
// (INTRO_REPLAY_EVENT, sent by IntroReplayButton) sets it again later. The CSS timeline in src/app/start-intro.css
// runs whenever the intro is shown; this component only decides when it ends.
export function StartIntro() {
  const ref = useRef<HTMLDivElement>(null);
  const rewound = useRef<Animation[]>([]);
  const [run, setRun] = useState(0); // bumps on every replay, so the timing below starts over

  const finish = useCallback(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "playing") return;
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {}
    root.dataset.intro = "done";
    rewound.current.forEach((a) => a.play());
    rewound.current = [];
  }, []);

  // Replays: rewind the hand-over animations, jump to the top, and show the intro again (going from display: none
  // back to visible restarts every CSS animation inside it).
  useEffect(() => {
    const replay = () => {
      const root = document.documentElement;
      const pre = ref.current;
      if (!pre || root.dataset.intro === "playing") return;
      rewound.current = Array.from(document.querySelectorAll(HANDOVER)).flatMap((el) => el.getAnimations());
      rewound.current.forEach((a) => a.cancel());
      pre.classList.remove("si-leave");
      window.scrollTo({ top: 0, behavior: "instant" });
      root.dataset.intro = "playing";
      setRun((n) => n + 1);
    };
    window.addEventListener(INTRO_REPLAY_EVENT, replay);
    return () => window.removeEventListener(INTRO_REPLAY_EVENT, replay);
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
  }, [finish, run]);

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
