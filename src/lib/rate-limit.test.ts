import { describe, expect, it } from "vitest";
import { isBlocked, orderKey, recordFailure, visitorKey, type LimitStore } from "./rate-limit";

function memoryStore(): LimitStore & { counts: Map<string, number> } {
  const counts = new Map<string, number>();
  return {
    counts,
    async failures(key) {
      return counts.get(key) ?? 0;
    },
    async addFailure(key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    },
  };
}

describe("tracking rate limit", () => {
  const rules = [
    { key: "visitor:a", max: 3 },
    { key: "order:R13000001", max: 2 },
  ];

  it("lets a fresh visitor through", async () => {
    expect(await isBlocked(memoryStore(), rules)).toBe(false);
  });

  it("blocks once either counter reaches its limit", async () => {
    const store = memoryStore();
    await recordFailure(store, rules);
    expect(await isBlocked(store, rules)).toBe(false);
    await recordFailure(store, rules); // the order counter hits 2
    expect(await isBlocked(store, rules)).toBe(true);
  });

  it("blocks a visitor who keeps guessing different orders", async () => {
    const store = memoryStore();
    for (let i = 0; i < 3; i++) await recordFailure(store, [{ key: "visitor:a", max: 3 }, { key: `order:R1300000${i}`, max: 2 }]);
    expect(await isBlocked(store, [{ key: "visitor:a", max: 3 }, { key: "order:R13000009", max: 2 }])).toBe(true);
  });

  it("keys never contain the raw address", () => {
    expect(visitorKey("203.0.113.9")).not.toContain("203.0.113.9");
    expect(visitorKey("203.0.113.9")).toBe(visitorKey("203.0.113.9"));
    expect(visitorKey("203.0.113.9")).not.toBe(visitorKey("203.0.113.10"));
    expect(orderKey("R13000001")).toBe("order:R13000001");
  });
});

import { CHECKOUT_DEFAULT_MAX, CHECKOUT_DEFAULT_WINDOW_MINUTES, checkoutKey, checkoutLimit, recordHit } from "./rate-limit";
import { visitorAddress } from "./visitor";

describe("checkout order limit", () => {
  it("uses generous defaults, because students share a university network", () => {
    expect(checkoutLimit({})).toEqual({ max: CHECKOUT_DEFAULT_MAX, windowSeconds: CHECKOUT_DEFAULT_WINDOW_MINUTES * 60 });
  });
  it("can be changed with settings, and ignores bad values", () => {
    expect(checkoutLimit({ CHECKOUT_RATE_MAX: "50", CHECKOUT_RATE_WINDOW_MINUTES: "10" })).toEqual({ max: 50, windowSeconds: 600 });
    for (const bad of ["", "0", "-3", "abc", "1.5", "99999999"]) {
      expect(checkoutLimit({ CHECKOUT_RATE_MAX: bad, CHECKOUT_RATE_WINDOW_MINUTES: bad })).toEqual({ max: CHECKOUT_DEFAULT_MAX, windowSeconds: CHECKOUT_DEFAULT_WINDOW_MINUTES * 60 });
    }
    expect(checkoutLimit({ CHECKOUT_RATE_MAX: "10001" }).max).toBe(CHECKOUT_DEFAULT_MAX); // above the ceiling
  });
  it("blocks the visitor who has made the allowed number of orders, and nobody else", async () => {
    const store = memoryStore();
    const mine = [{ key: checkoutKey("203.0.113.9"), max: 3 }];
    const other = [{ key: checkoutKey("198.51.100.4"), max: 3 }];
    for (let i = 0; i < 2; i++) await recordHit(store, mine);
    expect(await isBlocked(store, mine)).toBe(false);
    await recordHit(store, mine);
    expect(await isBlocked(store, mine)).toBe(true);
    expect(await isBlocked(store, other)).toBe(false);
  });
  it("keeps checkout counters apart from tracking counters and never stores the raw address", () => {
    expect(checkoutKey("203.0.113.9")).toMatch(/^checkout:[0-9a-f]{32}$/);
    expect(checkoutKey("203.0.113.9")).not.toBe(visitorKey("203.0.113.9"));
    expect(checkoutKey("203.0.113.9")).not.toContain("203.0.113.9");
  });
});

describe("visitorAddress", () => {
  const headers = (h: Record<string, string>) => ({ get: (k: string) => h[k.toLowerCase()] ?? null });
  it("takes the first forwarded address, else the real address, else unknown", () => {
    expect(visitorAddress(headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(visitorAddress(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(visitorAddress(headers({}))).toBe("unknown");
  });
});
