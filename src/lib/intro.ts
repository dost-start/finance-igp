// sessionStorage key for the landing logo intro: set once it has played (or been skipped), so it plays once
// per browser session. Read by the root layout's pre-paint script and written by src/components/start-intro.tsx.
export const INTRO_SEEN_KEY = "start-intro-seen";

// Window event that plays the logo intro again (sent by src/components/intro-replay-button.tsx, handled by
// src/components/start-intro.tsx on pages that have the intro).
export const INTRO_REPLAY_EVENT = "start-intro-replay";
