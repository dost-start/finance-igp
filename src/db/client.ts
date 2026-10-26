import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Plain factory, safe for scripts. App code goes through src/db/index.ts (server-only).
// Supabase's transaction pooler (port 6543) does not support prepared statements.
export function createDb(url: string) {
  const sql = postgres(url, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });
  return { sql, db: drizzle(sql, { schema }) };
}
