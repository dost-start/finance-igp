// Gmail caps how many emails an account may send in a day, and going over blocks sending for hours.
// This guard counts what was sent in the last 24 hours and stops before the cap, so finance sees a
// clear message instead of buyers silently missing their emails (PRD FR08.04).
//
// 500 is Google's published daily cap for an ordinary @gmail.com account. If the sending account is a
// Google Workspace account (a higher cap), set EMAIL_DAILY_LIMIT to its cap.
export const DEFAULT_EMAIL_DAILY_LIMIT = 500;

export function emailDailyLimit(env: Record<string, string | undefined> = process.env): number {
  const raw = env.EMAIL_DAILY_LIMIT?.trim();
  if (!raw || !/^\d{1,6}$/.test(raw)) return DEFAULT_EMAIL_DAILY_LIMIT;
  const n = Number(raw);
  return n >= 1 ? n : DEFAULT_EMAIL_DAILY_LIMIT;
}

export type Budget = { limit: number; used: number; remaining: number };
export const budgetOf = (limit: number, used: number): Budget => ({ limit, used, remaining: Math.max(0, limit - used) });

// Can `needed` more emails go out? When not, a plain message for the admin screen.
export function checkBudget(budget: Budget, needed: number): { ok: true } | { ok: false; message: string } {
  if (needed <= budget.remaining) return { ok: true };
  const emails = needed === 1 ? "1 buyer email" : `${needed} buyer emails`;
  return {
    ok: false,
    message: `The email limit is nearly used up (${budget.used} of ${budget.limit} sent in the last 24 hours, ${budget.remaining} left) and ${emails} would be needed. Nothing was changed. ${
      budget.remaining > 0 ? `Choose ${budget.remaining} or fewer, or try again later.` : "Try again later."
    }`,
  };
}

// True once the last 24 hours are close to the cap, for a warning on the admin screens.
export const isNearLimit = (b: Budget): boolean => b.remaining <= Math.max(10, Math.floor(b.limit * 0.1));
