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
