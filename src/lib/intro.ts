// sessionStorage key for the landing logo intro: set once it has played (or been skipped), so it plays once
// per browser session. Read by the root layout's pre-paint script and written by src/components/start-intro.tsx.
export const INTRO_SEEN_KEY = "start-intro-seen";
