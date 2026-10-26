// What gets saved when the server hits an error (see src/instrumentation.ts). The aim is "enough to
// find the problem, nothing that identifies a buyer": no query strings, no request data, and database
// error messages are cut before the values they carry (those can hold emails and phone numbers).
export const MAX_MESSAGE = 240;

// Redirects and "not found" pages are normal control flow in Next, not problems.
export function isExpectedError(err: unknown): boolean {
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : "";
  const message = err instanceof Error ? err.message : String(err);
  return /^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test(digest) || /NEXT_(REDIRECT|NOT_FOUND)/.test(message);
}

export function cleanMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : "Error";
  let message = err instanceof Error ? err.message : String(err);
  // Database errors repeat the query and its values: keep only the part before them.
  message = message.split(/\bparams?:|\bValues?:|\bvalues\s*\(|\bwhere\b/i)[0];
  message = message.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]").replace(/\+?\d[\d\s().-]{8,}\d/g, "[number]").replace(/\s+/g, " ").trim();
  return `${name}: ${message}`.slice(0, MAX_MESSAGE);
}

// "/pay/123e4567-e89b-12d3-a456-426614174000?x=1" becomes "/pay/:id"; a tracking token becomes ":token".
export function cleanRoute(path: string): string {
  const noQuery = path.split("?")[0].split("#")[0];
  return noQuery
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ":id")
    .replace(/\b[0-9a-f]{64}\b/gi, ":token")
    .slice(0, 120);
}

// Several errors a second means something is badly wrong; saving each one would only add load.
export const MAX_LOGGED_PER_MINUTE = 30;
