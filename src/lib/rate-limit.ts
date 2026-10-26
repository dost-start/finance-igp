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
