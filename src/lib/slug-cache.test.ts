import { describe, expect, it, vi } from "vitest";
import { createSlugCache } from "./slug-cache";

function setup(initial: string[] = ["tee", "jacket"]) {
  let t = 1_000_000;
  let slugs = initial;
  const load = vi.fn(async () => slugs);
  const cache = createSlugCache({ load, now: () => t });
  return {
    load,
    cache,
    advance: (ms: number) => void (t += ms),
    setSlugs: (s: string[]) => void (slugs = s),
    failNext: () => load.mockRejectedValueOnce(new Error("db down")),
  };
}

describe("slug cache", () => {
  it("loads once, then answers from memory while fresh", async () => {
    const { cache, load, advance } = setup();
    expect(await cache.has("tee")).toBe(true);
    advance(30_000);
    expect(await cache.has("jacket")).toBe(true);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("answers false for an unknown slug and does not re-query inside the minimum refresh gap", async () => {
    const { cache, load, advance } = setup();
    await cache.has("tee");
    advance(1_000);
    expect(await cache.has("nope")).toBe(false);
    expect(await cache.has("nope-2")).toBe(false);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("finds a newly added product within seconds, not after the full ttl", async () => {
    const { cache, load, advance, setSlugs } = setup();
    await cache.has("tee");
    setSlugs(["tee", "jacket", "new-cap"]);
    advance(6_000); // past minRefreshMs, well inside ttlMs
    expect(await cache.has("new-cap")).toBe(true);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("refreshes after the ttl and drops removed products", async () => {
    const { cache, load, advance, setSlugs } = setup();
    await cache.has("tee");
    setSlugs(["jacket"]);
    advance(61_000);
    expect(await cache.has("tee")).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight query between simultaneous requests", async () => {
    const { cache, load } = setup();
    await Promise.all([cache.has("tee"), cache.has("jacket"), cache.has("tee")]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("fails open when the database is down and nothing was ever loaded, then backs off", async () => {
    const { cache, load, advance, failNext } = setup();
    failNext();
    expect(await cache.has("anything")).toBe(true);
    expect(await cache.has("anything-else")).toBe(true);
    expect(load).toHaveBeenCalledTimes(1); // backing off, not hammering
    advance(11_000);
    expect(await cache.has("tee")).toBe(true);
    expect(await cache.has("nope")).toBe(false); // loaded now, so unknown slugs are 404 again
  });

  it("keeps serving the stale set if a later refresh fails", async () => {
    const { cache, advance, failNext } = setup();
    await cache.has("tee");
    advance(61_000);
    failNext();
    expect(await cache.has("tee")).toBe(true);
    expect(await cache.has("nope")).toBe(false);
  });
});
