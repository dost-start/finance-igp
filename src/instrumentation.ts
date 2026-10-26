import type { Instrumentation } from "next";

// Saves server errors to the error_logs table so the Technology team sees them on the admin System
// page. It must never make things worse: it ignores expected control flow, saves at most a few dozen
// a minute, and swallows its own failures.
let windowStart = 0;
let inWindow = 0;

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { cleanMessage, cleanRoute, isExpectedError, MAX_LOGGED_PER_MINUTE } = await import("@/lib/error-log");
    if (isExpectedError(err)) return;
    const now = Date.now();
    if (now - windowStart > 60_000) {
      windowStart = now;
      inWindow = 0;
    }
    if (++inWindow > MAX_LOGGED_PER_MINUTE) return;

    const { getDb, schema } = await import("@/db");
    const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest).slice(0, 40) : null;
    await getDb().insert(schema.errorLogs).values({ route: cleanRoute(context.routePath || request.path), method: request.method.slice(0, 10), message: cleanMessage(err), digest });
  } catch {
    // Saving the error failed: nothing more to do, and nothing to throw.
  }
};
