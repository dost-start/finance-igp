import "server-only";
import { createDb } from "./client";
import * as schema from "./schema";

// One connection per server instance, created on first use so builds do not need DATABASE_URL.
let cached: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    cached = createDb(url);
  }
  return cached.db;
}

export { schema };
