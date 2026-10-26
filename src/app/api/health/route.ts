import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { CURRENT_VERSION } from "@/lib/changelog";

// Uptime and deploy check. Reports only counts and status, never connection details.
export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.products);
    return Response.json(
      { status: "ok", version: CURRENT_VERSION, database: "connected", products: count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", version: CURRENT_VERSION, database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
