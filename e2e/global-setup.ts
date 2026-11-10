import postgres from "postgres";
import { E2E_PORT } from "../playwright.config";
import { ADMIN_EMAIL } from "./helpers";

// The dev server compiles a page the first time it is asked for it, and may reload the browser once
// when that finishes. Asking for every page up front, once, keeps that out of the tests. Rate-limit
// counters left by an earlier run are cleared so they cannot block this one.
export default async function globalSetup() {
  const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
  await sql`delete from rate_limits`.catch(() => undefined);

  // Every admin test signs in as ADMIN_EMAIL, which must already be an active admin account. Without it each
  // admin page redirects to sign-in and the tests fail later with confusing "empty table" errors.
  const admins = await sql`select 1 from admin_accounts where lower(email) = ${ADMIN_EMAIL.toLowerCase()} and active`.catch(() => []);
  if (admins.length === 0) {
    await sql.end({ timeout: 1 }).catch(() => undefined);
    throw new Error(`e2e setup: ${ADMIN_EMAIL} is not an active row in admin_accounts. Add it to SEED_ADMIN_EMAILS and run "npm run db:seed", then run the tests again.`);
  }
  await sql.end({ timeout: 1 }).catch(() => undefined);

  const base = `http://localhost:${E2E_PORT}`;
  for (const path of ["/", "/shop", "/products/tshirt-design-a", "/cart", "/checkout", "/track", "/privacy", "/admin/signin", "/admin", "/api/store", "/pay/00000000-0000-4000-8000-000000000000"]) {
    await fetch(`${base}${path}`, { redirect: "manual" }).catch(() => undefined);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
