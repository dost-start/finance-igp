// Write-path load test. Creates N orders at the same moment using the same steps as checkout (take the
// next order number, save the order, its items and its first status in one transaction) through the
// app's own database client, then checks that every order got its own number and cleans up.
// Run: npx tsx --env-file=.env.local scripts/loadtest-orders.mts [orders]
// It touches the real database, so it deletes what it made and resets the order counter afterwards.
import { eq, inArray, like, sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import * as schema from "../src/db/schema";
import { formatOrderId } from "../src/lib/order-id";

async function main() {
  const n = Number(process.argv[2] ?? 200);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, sql: client } = createDb(url);
  const tag = `loadtest-${Date.now()}`;

  const [product] = await db.select().from(schema.products).limit(1);
  const [{ before }] = await db.select({ before: sql<number>`count(*)::int` }).from(schema.orders);
  if (before !== 0) throw new Error(`Refusing to run: the database already has ${before} orders. This test resets the order counter, so it only runs on an empty shop.`);

  const t0 = Date.now();
  await db.execute(sql`select 1`);
  const rtt = Date.now() - t0;

  const started = Date.now();
  const outcomes = await Promise.allSettled(
    Array.from({ length: n }, async (_, i) => {
      const t = Date.now();
      const id = await db.transaction(async (tx) => {
        const seq = await tx.execute(sql`select nextval('order_number_seq')::int as n`);
        const orderId = formatOrderId("13", Number(seq[0].n));
        const [order] = await tx
          .insert(schema.orders)
          .values({
            orderId, regionCode: "13", buyerName: `Load ${i}`, university: "U", universityAddress: "addr", homeAddressLink: "https://maps.google.com/x", homeLandmark: "lm",
            contactNumber: "09171234567", contactLast4: "4567", email: `${tag}@example.test`, totalCentavos: product.priceCentavos, idempotencyKey: `${tag}-${i}`,
          })
          .returning({ id: schema.orders.id, orderId: schema.orders.orderId });
        await tx.insert(schema.orderItems).values({ orderUuid: order.id, productId: product.id, size: product.sizes[0].size, quantity: 1, unitPriceCentavos: product.priceCentavos });
        await tx.insert(schema.statusEvents).values({ orderUuid: order.id, status: "order_received" });
        return order.orderId;
      });
      return { id, ms: Date.now() - t };
    }),
  );
  const elapsed = Date.now() - started;

  const ok = outcomes.flatMap((o) => (o.status === "fulfilled" ? [o.value] : []));
  const failed = outcomes.length - ok.length;
  const ids = ok.map((o) => o.id);
  const unique = new Set(ids).size;
  const times = ok.map((o) => o.ms).sort((a, b) => a - b);
  const pct = (p: number) => times[Math.min(times.length - 1, Math.floor((p / 100) * times.length))] ?? 0;

  await db.delete(schema.orders).where(like(schema.orders.email, `${tag}%`));
  await db.execute(sql`select setval('order_number_seq', 1, false)`);
  const [{ after }] = await db.select({ after: sql<number>`count(*)::int` }).from(schema.orders);
  void eq; void inArray;
  await client.end({ timeout: 2 });

  console.log(`Database round trip from here: ${rtt} ms (from Vercel in Singapore it is a few ms)`);
  console.log(`${n} orders created at once: ${ok.length} saved, ${failed} failed, ${unique} distinct order numbers (${unique === ok.length ? "no duplicates" : "DUPLICATES"})`);
  console.log(`Total ${elapsed} ms = ${((ok.length / elapsed) * 1000).toFixed(1)} orders per second; each order took p50 ${pct(50)} ms, p95 ${pct(95)} ms, max ${times.at(-1) ?? 0} ms`);
  console.log(`Cleanup: ${after} orders left, order counter reset.`);
  process.exit(failed === 0 && unique === ok.length && after === 0 ? 0 : 1);
}
void main();
