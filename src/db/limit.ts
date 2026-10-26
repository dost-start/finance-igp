// Caps how many queries a process has in flight at once.
//
// Why: against Supabase's transaction pooler, a handful of queries running at the same moment on
// the same client never finish (measured: 4 at once on 1 connection, 6 on 2). A busy page, or
// Next prefetching several pages together, easily reaches that. Waiting in line inside the app costs
// a few milliseconds; hanging costs the whole page. Queries inside a transaction are not counted
// (they run on their own reserved connection).
type Waiter = () => void;
type Lazy = PromiseLike<unknown> & { values?: (...args: unknown[]) => unknown };

export function limitInFlight<T extends { unsafe: (...args: never[]) => unknown }>(sql: T, limit: number): T {
  let active = 0;
  const waiting: Waiter[] = [];

  const release = () => {
    const next = waiting.shift();
    if (next) next(); // hand the slot straight to the next in line
    else active--;
  };
  // Starts the query now when a slot is free (no extra waiting step), otherwise when one frees up.
  const run = (query: Lazy): Promise<unknown> => {
    const start = (): Promise<unknown> => Promise.resolve(query.then((v) => { release(); return v; }, (e) => { release(); throw e; }));
    if (active < limit) {
      active++;
      return start();
    }
    return new Promise((resolve, reject) => waiting.push(() => start().then(resolve, reject)));
  };

  const unsafe = sql.unsafe.bind(sql) as (...args: unknown[]) => Lazy;
  (sql as { unsafe: unknown }).unsafe = (...args: unknown[]) => {
    const query = unsafe(...args);
    // postgres.js queries are lazy: they start when awaited, so the slot is taken at that moment.
    const guarded: Lazy = new Proxy(query, {
      get(target, prop) {
        if (prop === "then") return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => run(target).then(resolve, reject);
        if (prop === "values") return (...a: unknown[]) => { target.values?.(...a); return guarded; }; // .values() returns the same query
        const value = (target as unknown as Record<PropertyKey, unknown>)[prop];
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    return guarded;
  };
  return sql;
}
