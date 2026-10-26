import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { limitInFlight } from "./limit";
import * as schema from "./schema";

// Plain factory, safe for scripts. App code goes through src/db/index.ts (server-only).
// Supabase's transaction pooler (port 6543) does not support prepared statements.
//
// WATCH OUT: against that pooler, several queries running at the same moment never finish (measured:
// 4 at once on 1 connection hang, 6 on 2). So the pool has 3 connections and limitInFlight (see
// limit.ts) lets at most 3 queries run at once; the rest wait in line inside the app.
export function createDb(url: string) {
  const sql = limitInFlight(postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 }), 3);
  return { sql, db: drizzle(sql, { schema }) };
}
