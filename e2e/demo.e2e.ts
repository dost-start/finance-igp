import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { DEMO_ORDERS } from "../src/lib/demo-data";
import { signInAdmin } from "./helpers";

// The finance demo kit: the seed fills the admin screens with one of every situation, the cleanup removes
// it all again. Runs against the local file store (Drive switched off) and always cleans up.
const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
const env = { ...process.env, DRIVE_FOLDER_ID: "", DRIVE_REFRESH_TOKEN: "", SMTP_USER: "", SMTP_PASS: "" };
const run = (script: string, ...args: string[]) => execFileSync("npx", ["tsx", "--env-file=.env.local", script, ...args], { env, encoding: "utf8", timeout: 180_000 });

test.afterAll(async () => {
  try {
    run("scripts/demo-cleanup.mts", "--yes");
  } catch {
    // already clean
  }
  await sql`delete from audit_logs where created_at >= now() - interval '1 hour' and order_uuid is null and action = 'orders.export'`;
  await sql.end();
});

test("the demo seed fills every admin screen and the cleanup leaves nothing behind", async ({ page, context }) => {
  test.setTimeout(300_000);
  const [{ before }] = await sql`select count(*)::int as before from orders`;
  expect(before, "the database must hold no real orders for this test").toBe(0);

  // The cleanup lists first and removes nothing without --yes.
  expect(run("scripts/demo-cleanup.mts")).toContain("0 demo orders found");

  const out = run("scripts/demo-seed.mts");
  expect(out).toContain(`Created ${DEMO_ORDERS.length} demo orders`);
  const rows = await sql`select o.order_id, o.buyer_name, o.status, o.email, p.ocr_result, p.drive_file_id from orders o left join payment_proofs p on p.order_uuid = o.id order by o.order_id`;
  expect(rows).toHaveLength(DEMO_ORDERS.length);
  expect(rows.every((r) => String(r.buyer_name).startsWith("DEMO ") && String(r.email).includes("+demo@"))).toBe(true);
  expect(new Set(rows.map((r) => r.status)).size).toBe(9); // every status is represented
  expect((await sql`select count(*)::int as n from email_logs`)[0].n).toBe(0); // no email is ever sent by the seed

  // Seeding twice is refused rather than doubling up.
  expect(() => run("scripts/demo-seed.mts")).toThrow();

  await signInAdmin(context);

  // The order list: the four orders that need a look come first and say so.
  await page.goto("/admin");
  await expect(page.getByText("waiting for verification").first()).toBeVisible();
  const first = await page.locator("tbody tr td:nth-child(3)").allInnerTexts();
  expect(first.slice(0, 4).sort()).toEqual(["DEMO Carla Dizon", "DEMO Dan Uy", "DEMO Eli Cruz", "DEMO Fe Lim"]);
  await expect(page.getByText("Check first")).toHaveCount(4);
  await expect(page.getByText("Reused reference").first()).toBeVisible();

  // Opening a mismatch order shows its receipt picture, and the reading that disagrees with the total.
  const carla = rows.find((r) => r.buyer_name === "DEMO Carla Dizon")!;
  const carlaId = (await sql`select id from orders where order_id = ${carla.order_id}`)[0].id as string;
  await page.goto(`/admin/orders/${carlaId}`);
  await expect(page.getByText("Reading does not match: check first")).toBeVisible();
  await expect(page.getByText("✗ Different")).toHaveCount(1);
  const receipt = await page.request.get(`/api/admin/receipts/${carlaId}`);
  expect(receipt.status()).toBe(200);
  expect(receipt.headers()["content-type"]).toBe("image/png");

  // A buyer can track a confirmed demo order with its Order ID and the last 4 digits.
  const gio = rows.find((r) => r.buyer_name === "DEMO Gio Tan")!;
  await context.clearCookies();
  await page.goto("/track");
  await page.getByLabel("Order ID").fill(String(gio.order_id));
  await page.getByLabel("Last 4 digits of your contact number").fill("4567");
  await page.getByRole("button", { name: "Track my order" }).click();
  await expect(page.getByText("Finance confirmed your payment.")).toBeVisible();

  // Cleanup removes every demo order and starts the Order ID counter again.
  const cleaned = run("scripts/demo-cleanup.mts", "--yes");
  expect(cleaned).toContain(`Removed ${DEMO_ORDERS.length} demo orders`);
  const [{ after }] = await sql`select count(*)::int as after from orders`;
  expect(after).toBe(0);
  expect((await sql`select is_called from order_number_seq`)[0].is_called).toBe(false);
});
