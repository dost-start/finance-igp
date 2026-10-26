import { describe, expect, it } from "vitest";
import { limitInFlight } from "./limit";

// A stand-in for postgres.js: queries are lazy and only start when awaited, like the real ones.
function fakeSql() {
  const state = { inFlight: 0, peak: 0, started: 0 };
  const sql = {
    unsafe(_text: string, _params?: unknown[], options?: { fail?: boolean }) {
      let result: Promise<string[]> | undefined;
      const q = {
        isValues: false,
        values() {
          q.isValues = true;
          return q;
        },
        then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          result ??= (async () => {
            state.started++;
            state.inFlight++;
            state.peak = Math.max(state.peak, state.inFlight);
            await new Promise((r) => setTimeout(r, 5));
            state.inFlight--;
            if (options?.fail) throw new Error("boom");
            return q.isValues ? ["row-as-array"] : ["row"];
          })();
          return result.then(resolve, reject);
        },
      };
      return q;
    },
  };
  return { sql, state };
}

describe("limitInFlight", () => {
  it("never runs more than the limit at once, and still finishes every query", async () => {
    const { sql, state } = fakeSql();
    limitInFlight(sql, 3);
    const results = await Promise.all(Array.from({ length: 25 }, () => sql.unsafe("select 1", [])));
    expect(results).toHaveLength(25);
    expect(state.started).toBe(25);
    expect(state.peak).toBeLessThanOrEqual(3);
    expect(state.peak).toBeGreaterThan(1); // still runs in parallel up to the limit
  });

  it("keeps .values() working, because drizzle calls it", async () => {
    const { sql } = fakeSql();
    limitInFlight(sql, 2);
    expect(await sql.unsafe("select 1", []).values()).toEqual(["row-as-array"]);
  });

  it("frees the slot when a query fails, so later queries are not stuck", async () => {
    const { sql, state } = fakeSql();
    limitInFlight(sql, 1);
    await expect(sql.unsafe("bad", [], { fail: true })).rejects.toThrow("boom");
    await expect(Promise.all([sql.unsafe("a", []), sql.unsafe("b", [])])).resolves.toHaveLength(2);
    expect(state.peak).toBe(1);
  });
});
