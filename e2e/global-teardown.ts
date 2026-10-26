import postgres from "postgres";

// The checkout order counter grows with every order the tests place; clear it when the run ends.
export default async function globalTeardown() {
  const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
  await sql`delete from rate_limits`.catch(() => undefined);
  await sql.end({ timeout: 1 }).catch(() => undefined);
}
