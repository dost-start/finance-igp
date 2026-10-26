// Removes the demo orders made by demo-seed.mts, their receipts in Drive, and the history they left behind.
// It only ever touches orders named "DEMO ..." with the +demo email mark. Without --yes it just lists what it would remove.
// Run: npx tsx --env-file=.env.local scripts/demo-cleanup.mts [--yes]
import { inArray, like, sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import * as schema from "../src/db/schema";
import { DEMO_EMAIL_MARK, DEMO_NAME_PREFIX, isDemoOrder } from "../src/lib/demo-data";
import { getFileStore } from "../src/lib/storage";

async function main() {
  const yes = process.argv.includes("--yes");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, sql: client } = createDb(url);

  const candidates = await db.select({ id: schema.orders.id, orderId: schema.orders.orderId, name: schema.orders.buyerName, email: schema.orders.email }).from(schema.orders).where(like(schema.orders.buyerName, `${DEMO_NAME_PREFIX}%`));
  const demo = candidates.filter((o) => isDemoOrder(o.name, o.email));
  console.log(`${demo.length} demo orders found${candidates.length !== demo.length ? ` (${candidates.length - demo.length} named DEMO but without the ${DEMO_EMAIL_MARK} email mark are left alone)` : ""}.`);
  if (demo.length === 0 || !yes) {
    if (demo.length > 0) console.log(demo.map((o) => `  ${o.orderId} ${o.name}`).join("\n") + "\n\nNothing was removed. Run again with --yes to remove them.");
    await client.end({ timeout: 2 });
    return;
  }

  const ids = demo.map((o) => o.id);
  const proofs = await db.select({ fileId: schema.paymentProofs.driveFileId }).from(schema.paymentProofs).where(inArray(schema.paymentProofs.orderUuid, ids));
  const store = getFileStore();
  let files = 0;
  for (const p of proofs) {
    if (p.fileId && store.remove) {
      await store.remove(p.fileId).catch(() => undefined);
      files++;
    }
  }
  // History that belongs to the demo orders only: audit rows and email log rows about them.
  await db.delete(schema.auditLogs).where(inArray(schema.auditLogs.orderUuid, ids));
  await db.delete(schema.emailLogs).where(inArray(schema.emailLogs.orderUuid, ids));
  await db.delete(schema.orders).where(inArray(schema.orders.id, ids));

  const [{ left }] = await db.select({ left: sql<number>`count(*)::int` }).from(schema.orders);
  if (left === 0) await db.execute(sql`select setval('order_number_seq', 1, false)`);
  await client.end({ timeout: 2 });
  console.log(`Removed ${demo.length} demo orders and ${files} receipt files. ${left === 0 ? "No orders are left, so the Order ID counter starts again at 1." : `${left} real orders remain; the Order ID counter was left alone.`}`);
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
