// Cache of active product slugs used by src/proxy.ts to answer unknown product URLs with a
// real 404 before any page code runs. Pure logic: the loader and the clock are injected so it
// can be unit tested.
//
// - Fresh for ttlMs: no database access at all.
// - A slug that is not in the set triggers at most one refresh per minRefreshMs, so a product
//   added a moment ago is found quickly while a flood of junk URLs cannot hammer the database.
// - If the database fails: keep serving the stale set, or fail open (treat the slug as known)
//   when nothing was ever loaded, and back off before trying again.
export type SlugCacheOptions = {
  load: () => Promise<string[]>;
  ttlMs?: number;
  minRefreshMs?: number;
  backoffMs?: number;
  now?: () => number;
};

export function createSlugCache({ load, ttlMs = 60_000, minRefreshMs = 5_000, backoffMs = 10_000, now = Date.now }: SlugCacheOptions) {
  let slugs: Set<string> | null = null;
  let loadedAt = 0;
  let blockedUntil = 0;
  let inflight: Promise<void> | null = null;

  function refresh(): Promise<void> {
    if (!inflight) {
      inflight = (async () => {
        try {
          slugs = new Set(await load());
          loadedAt = now();
        } catch {
          blockedUntil = now() + backoffMs;
        }
      })().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }

  return {
    // true = known (or unknown because the database is down), false = definitely not a product
    async has(slug: string): Promise<boolean> {
      const t = now();
      if (t >= blockedUntil) {
        if (!slugs || t - loadedAt >= ttlMs) await refresh();
      }
      if (!slugs) return true; // never loaded: fail open
      if (slugs.has(slug)) return true;
      // Unknown slug: maybe a brand-new product. Re-check, but not more than once per minRefreshMs.
      if (now() >= blockedUntil && now() - loadedAt >= minRefreshMs) {
        await refresh();
        return slugs ? slugs.has(slug) : true;
      }
      return false;
    },
  };
}
