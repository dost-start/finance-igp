import postgres from "postgres";
import { E2E_PORT } from "../playwright.config";

// The dev server compiles a page the first time it is asked for it, and may reload the browser once
// when that finishes. Asking for every page up front, once, keeps that out of the tests. Rate-limit
// counters left by an earlier run are cleared so they cannot block this one.
export default async function globalSetup() {
  const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
  await sql`delete from rate_limits`.catch(() => undefined);
  await sql.end({ timeout: 1 }).catch(() => undefined);

  const base = `http://localhost:${E2E_PORT}`;
  for (const path of ["/", "/products/tshirt-design-a", "/cart", "/checkout", "/track", "/privacy", "/admin/signin", "/admin", "/pay/00000000-0000-4000-8000-000000000000"]) {
    await fetch(`${base}${path}`, { redirect: "manual" }).catch(() => undefined);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
