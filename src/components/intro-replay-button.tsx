"use client";

import type { ReactNode } from "react";
import { INTRO_REPLAY_EVENT } from "@/lib/intro";

// Wraps a piece of the page (the hero's "START") so pressing it plays the logo intro again.
export function IntroReplayButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      title="Watch the intro again"
      aria-describedby="intro-replay-hint"
      onClick={() => window.dispatchEvent(new Event(INTRO_REPLAY_EVENT))}
      className="relative isolate inline-block cursor-pointer rounded-md transition-transform duration-300 ease-out hover:-rotate-2 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-950 active:scale-[0.98]"
    >
      {children}
      <span id="intro-replay-hint" className="sr-only">
        Plays the START logo intro again
      </span>
    </button>
  );
}
