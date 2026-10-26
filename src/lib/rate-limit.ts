import { createHash } from "node:crypto";

// Failure counters for the tracking lookup (PRD FR05.05). Only failed attempts count, so a buyer
// who types the right details is never slowed down. The store is injected so the rules can be
// tested without a database.
export type LimitStore = {
  failures(key: string, windowSeconds: number): Promise<number>;
  addFailure(key: string, windowSeconds: number): Promise<void>;
};

export type LimitRule = { key: string; max: number };

export const TRACK_WINDOW_SECONDS = 15 * 60;
export const TRACK_MAX_PER_VISITOR = 20;
export const TRACK_MAX_PER_ORDER = 8;

// Visitor and Order ID are stored as hashes or as the Order ID the visitor typed, never the raw address.
export const visitorKey = (address: string): string => `visitor:${createHash("sha256").update(address).digest("hex").slice(0, 32)}`;
export const orderKey = (orderId: string): string => `order:${orderId}`;

export async function isBlocked(store: LimitStore, rules: LimitRule[], windowSeconds = TRACK_WINDOW_SECONDS): Promise<boolean> {
  for (const rule of rules) {
    if ((await store.failures(rule.key, windowSeconds)) >= rule.max) return true;
  }
  return false;
}

export async function recordFailure(store: LimitStore, rules: LimitRule[], windowSeconds = TRACK_WINDOW_SECONDS): Promise<void> {
  await Promise.all(rules.map((rule) => store.addFailure(rule.key, windowSeconds)));
}

// Order creation at checkout. Without a limit, one script could burn through the six-digit Order ID
// numbers and fill the database. The numbers are settings (CHECKOUT_RATE_MAX orders per
// CHECKOUT_RATE_WINDOW_MINUTES per visitor) and the defaults are generous on purpose: students on one
// university network share an address, so a tight limit would turn real buyers away.
export const CHECKOUT_DEFAULT_MAX = 30;
export const CHECKOUT_DEFAULT_WINDOW_MINUTES = 15;

export function checkoutLimit(env: Record<string, string | undefined> = process.env): { max: number; windowSeconds: number } {
  const whole = (raw: string | undefined, fallback: number, ceiling: number) => {
    const t = raw?.trim();
    if (!t || !/^\d{1,5}$/.test(t)) return fallback;
    const n = Number(t);
    return n >= 1 && n <= ceiling ? n : fallback;
  };
  return {
    max: whole(env.CHECKOUT_RATE_MAX, CHECKOUT_DEFAULT_MAX, 10_000),
    windowSeconds: whole(env.CHECKOUT_RATE_WINDOW_MINUTES, CHECKOUT_DEFAULT_WINDOW_MINUTES, 1_440) * 60,
  };
}

export const checkoutKey = (address: string): string => `checkout:${createHash("sha256").update(address).digest("hex").slice(0, 32)}`;

// Counts one thing against a key. (The same counter that counts failed tracking lookups, here
// counting orders created.)
export const recordHit = recordFailure;
