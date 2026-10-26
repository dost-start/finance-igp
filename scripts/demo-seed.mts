// Fills the shop with demo orders for the finance walkthrough (docs/demo-script.md): every status, every
// receipt-reading result, and a reused reference number. Demo buyers are named "DEMO ..." and use a plus-address
// of the tech lead's own Gmail, so nothing reaches a stranger. No emails are sent.
// Run: npx tsx --env-file=.env.local scripts/demo-seed.mts        Remove again: npx tsx --env-file=.env.local scripts/demo-cleanup.mts --yes
import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { chromium } from "playwright";
import { createDb } from "../src/db/client";
import * as schema from "../src/db/schema";
import { DEMO_EMAIL_MARK, DEMO_NAME_PREFIX, DEMO_ORDERS, hasTrackingToken, historyFor, type DemoOrder } from "../src/lib/demo-data";
import { formatOrderId } from "../src/lib/order-id";
import { getFileStore } from "../src/lib/storage";

const CHANNEL_STYLE: Record<string, { title: string; color: string }> = {
  gcash: { title: "GCash  Express Send", color: "#0a5cff" },
  landbank: { title: "LANDBANK Transfer", color: "#0b7a3b" },
  gotyme: { title: "GoTyme Bank", color: "#1f2937" },
  maribank: { title: "Maribank", color: "#e11d48" },
};

// One receipt picture per order, showing that order's own amount and reference (or a blur for "unreadable").
async function drawReceipts(specs: { channel: string; amount: string; reference: string; blur: boolean }[]): Promise<Buffer[]> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent("<html><body></body></html>");
    const urls: string[] = await page.evaluate((specs) => {
      return specs.map((s) => {
        const c = document.createElement("canvas");
        c.width = 1080;
        c.height = 1500;
        const g = c.getContext("2d")!;
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, 1080, 1500);
        g.fillStyle = s.color;
        g.fillRect(0, 0, 1080, 220);
        g.fillStyle = "#fff";
        g.font = "bold 56px Arial";
        g.fillText(s.title, 60, 130);
        const rows: [string, string][] = [["Amount", `PHP ${s.amount}`], ["Sent to", "START DOST FINANCE"], ["Date", "Oct 27, 2026 10:15 AM"], ["Ref No.", s.reference], ["Status", "Successful"]];
        rows.forEach(([k, v], i) => {
          const y = 340 + i * 150;
          g.fillStyle = "#6b7280";
          g.font = "36px Arial";
          g.fillText(k, 60, y);
          g.fillStyle = "#1a1a1a";
          g.font = "bold 44px Arial";
          g.fillText(v, 60, y + 60);
        });
        g.fillStyle = "rgba(220,38,38,0.35)";
        g.font = "bold 60px Arial";
        g.fillText("DEMO RECEIPT - NOT A REAL PAYMENT", 60, 1380);
        if (!s.blur) return c.toDataURL("image/png");
        const t = document.createElement("canvas");
        t.width = 1080;
        t.height = 1500;
        const tg = t.getContext("2d")!;
        tg.filter = "blur(9px)";
        tg.drawImage(c, 0, 0);
        return t.toDataURL("image/png");
      });
    }, specs.map((s) => ({ ...s, ...CHANNEL_STYLE[s.channel], title: CHANNEL_STYLE[s.channel].title, color: CHANNEL_STYLE[s.channel].color })));
    return urls.map((u) => Buffer.from(u.split(",")[1], "base64"));
  } finally {
    await browser.close();
  }
}

const peso = (centavos: number) => (centavos / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { db, sql: client } = createDb(url);

  const existing = await db.select({ n: sql<number>`count(*)::int` }).from(schema.orders).where(like(schema.orders.buyerName, `${DEMO_NAME_PREFIX}%`));
  if (existing[0].n > 0) throw new Error(`There are already ${existing[0].n} demo orders. Remove them first: npx tsx --env-file=.env.local scripts/demo-cleanup.mts --yes`);

  const [tech] = await db.select().from(schema.adminAccounts).where(and(eq(schema.adminAccounts.role, "tech"), eq(schema.adminAccounts.active, true))).limit(1);
  if (!tech) throw new Error("No active tech admin account to attribute the demo confirmations to");
  const [local, domain] = tech.email.split("@");
  const email = `${local}${DEMO_EMAIL_MARK}${domain}`;

  const products = await db.select().from(schema.products);
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  for (const o of DEMO_ORDERS) for (const i of o.items) if (!bySlug.has(i.slug)) throw new Error(`Demo order for ${o.name} needs the product "${i.slug}", which is not in the catalog`);
  const totalOf = (o: DemoOrder) => o.items.reduce((t, i) => t + (bySlug.get(i.slug)?.priceCentavos ?? 0) * i.quantity, 0);

  console.log("Drawing the demo receipts…");
  const withProof = DEMO_ORDERS.filter((o) => o.reference);
  const images = await drawReceipts(
    withProof.map((o) => ({ channel: o.channel as string, amount: peso(o.receiptAmountPesos ? o.receiptAmountPesos * 100 : totalOf(o)), reference: o.reference as string, blur: o.ocr === "unreadable" })),
  );
  const imageOf = new Map(withProof.map((o, i) => [o.name, images[i]]));
  const store = getFileStore();

  const created: { name: string; orderId: string; status: string }[] = [];
  for (const o of DEMO_ORDERS) {
    const total = totalOf(o);
    const at = (hours: number) => new Date(Date.now() - hours * 3_600_000);
    const history = historyFor(o.status);
    const stepHours = (i: number) => o.hoursAgo - (o.hoursAgo * i) / Math.max(1, history.length) * 0.9;
    let driveFileId: string | null = null;
    if (o.reference) driveFileId = await store.put({ name: `${DEMO_NAME_PREFIX.trim()}-${o.name.replace(/\s+/g, "-")}.png`, mime: "image/png", bytes: imageOf.get(o.name) as Buffer });

    const orderId = await db.transaction(async (tx) => {
      const seq = await tx.execute(sql`select nextval('order_number_seq')::int as n`);
      const orderId = formatOrderId(o.region, Number(seq[0].n));
      const [row] = await tx
        .insert(schema.orders)
        .values({
          orderId, regionCode: o.region, buyerName: `${DEMO_NAME_PREFIX}${o.name}`, university: "Demo University", universityAddress: "1 Demo Street, Quezon City",
          homeAddressLink: "https://maps.app.goo.gl/demo", homeLandmark: "Beside the demo store", contactNumber: "09171234567", contactLast4: "4567", email,
          totalCentavos: total, status: o.status, trackingTokenHash: hasTrackingToken(o.status) ? createHash("sha256").update(randomBytes(32)).digest("hex") : null,
          idempotencyKey: `demo-${randomBytes(8).toString("hex")}`, createdAt: at(o.hoursAgo),
        })
        .returning({ id: schema.orders.id });
      await tx.insert(schema.orderItems).values(o.items.map((i) => ({ orderUuid: row.id, productId: bySlug.get(i.slug)!.id, size: i.size, quantity: i.quantity, unitPriceCentavos: bySlug.get(i.slug)!.priceCentavos })));
      await tx.insert(schema.statusEvents).values(
        history.map((status, i) => ({
          orderUuid: row.id, status, createdAt: at(stepHours(i)),
          changedBy: ["payment_confirmation", "in_production", "out_for_shipping", "received_successfully", "canceled", "refund_in_process", "payment_rejected"].includes(status) ? tech.id : null,
          note: (status === "canceled" || status === "payment_rejected") && o.note ? o.note : null,
        })),
      );
      if (o.reference && o.ocr) {
        const shown = o.receiptAmountPesos ? o.receiptAmountPesos * 100 : total;
        await tx.insert(schema.paymentProofs).values({
          orderUuid: row.id, channel: o.channel as string, referenceNumber: o.reference, driveFileId,
          ocrAmount: o.ocr === "unreadable" ? null : (shown / 100).toFixed(2), ocrReference: o.ocr === "unreadable" ? null : o.reference, ocrResult: o.ocr,
          verifiedBy: hasTrackingToken(o.status) ? tech.id : null, createdAt: at(stepHours(1)),
        });
      }
      return orderId;
    });
    created.push({ name: o.name, orderId, status: o.status });
  }
  await client.end({ timeout: 2 });

  console.log(`\nCreated ${created.length} demo orders (buyer email ${email}):`);
  for (const c of created) console.log(`  ${c.orderId}  ${c.name.padEnd(14)} ${c.status}`);
  console.log("\nTrack any confirmed one with its Order ID and the last 4 digits 4567.\nRemove them all when the demo is over: npx tsx --env-file=.env.local scripts/demo-cleanup.mts --yes");
  void inArray;
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
