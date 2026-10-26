import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { placeOrder, signInAdmin } from "./helpers";

// Sprint 2B: the finance order list. Orders that need a closer look come first, filters narrow the
// list, selected orders move together with an email each, and the list exports to CSV.
const RUN = Date.now();
const START = new Date();
const email = (n: string) => `e2e-dash-${n}-${RUN}@example.test`;
const like = `e2e-dash-%-${RUN}@example.test`;

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });

test.afterAll(async () => {
  await sql`delete from orders where email like ${like}`;
  await sql`delete from email_logs where recipient like ${like}`;
  await sql`delete from audit_logs where created_at >= ${START}`;
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  if (n === 0) await sql`select setval('order_number_seq', 1, false)`;
  await sql.end();
});

test("finance sorts, filters, bulk-updates and exports orders", async ({ page, context, request }) => {
  test.setTimeout(240_000);
  // A: clear receipt that matches. B: wrong amount. C: blank image that cannot be read.
  const a = await placeOrder(page, { name: "DASH A", email: email("a"), reference: "5550000000001", receipt: { amount: "450.00" } });
  const b = await placeOrder(page, { name: "DASH B", email: email("b"), reference: "5550000000002", receipt: { amount: "400.00" } });
  const c = await placeOrder(page, { name: "DASH C", email: email("c"), reference: "5550000000003", receipt: { amount: null, blank: true } });
  const ids = Object.fromEntries((await sql`select id, order_id, buyer_name from orders where email like ${like}`).map((r) => [r.buyer_name, { uuid: r.id as string, orderId: r.order_id as string }]));

  await signInAdmin(context);

  // 1. Not matching first, then unreadable, then the matching one; the first two are marked "Check first".
  await page.goto("/admin?q=DASH");
  const orderIds = await page.locator("tbody tr td:nth-child(2)").allInnerTexts();
  expect(orderIds.map((t) => t.replace(/\s*Check first/, "").trim())).toEqual([ids["DASH B"].orderId, ids["DASH C"].orderId, ids["DASH A"].orderId]);
  await expect(page.locator("tbody tr", { hasText: ids["DASH B"].orderId })).toContainText("Check first");
  await expect(page.locator("tbody tr", { hasText: ids["DASH C"].orderId })).toContainText("Check first");
  await expect(page.locator("tbody tr", { hasText: ids["DASH A"].orderId })).not.toContainText("Check first");

  // 2. Filters.
  await page.goto("/admin?q=DASH&ocr=mismatch");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText(ids["DASH B"].orderId);
  await page.goto("/admin?q=DASH&ocr=attention");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.goto("/admin?q=DASH&pay=verifying");
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.goto("/admin?q=DASH&pay=confirmed");
  await expect(page.getByText("No orders match these filters.")).toBeVisible();
  const [{ id: tshirt }] = await sql`select id from products where slug = 'tshirt-design-a'`;
  await page.goto(`/admin?q=DASH&product=${tshirt}`);
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.goto("/admin?q=DASH&product=00000000-0000-4000-8000-000000000000");
  await expect(page.getByText("No orders match these filters.")).toBeVisible();
  await page.goto("/admin?q=DASH&status=hacked"); // an unknown value is ignored, not an error
  await expect(page.locator("tbody tr")).toHaveCount(3);

  // 3. Confirm A and B on their own screens (payments are never confirmed in bulk).
  for (const uuid of [a, b]) {
    await page.goto(`/admin/orders/${uuid}`);
    await page.getByRole("button", { name: "Confirm payment" }).click();
    await expect(page.getByText("Payment confirmed")).toBeVisible();
  }

  // 4. Select A, B and C. C is still waiting for payment, so the bulk move skips it and says so.
  await page.goto("/admin?q=DASH");
  await expect(page.getByLabel(`Select ${ids["DASH C"].orderId}`)).toBeDisabled(); // nothing to bulk-move yet
  await page.getByLabel(`Select ${ids["DASH A"].orderId}`).check();
  await page.getByLabel(`Select ${ids["DASH B"].orderId}`).check();
  await expect(page.getByRole("button", { name: "Update 2 selected" })).toBeEnabled();

  // Canceling needs a reason: refused, and the selection is kept.
  await page.getByLabel("Move to").selectOption("canceled");
  await page.getByRole("button", { name: "Update 2 selected" }).click();
  await expect(page.getByText("Add the reason for canceling")).toBeVisible();
  await expect(page.getByLabel(`Select ${ids["DASH A"].orderId}`)).toBeChecked();

  await page.getByLabel("Move to").selectOption("in_production");
  await page.getByLabel(/Note for the buyers/).fill("Batch 1 of 3");
  await page.getByRole("button", { name: "Update 2 selected" }).click();
  await expect(page.getByText("2 orders moved to In Production. Buyers are being emailed.")).toBeVisible();

  const moved = await sql`select buyer_name, status from orders where email like ${like} order by buyer_name`;
  expect(moved.map((r) => [r.buyer_name, r.status])).toEqual([
    ["DASH A", "in_production"],
    ["DASH B", "in_production"],
    ["DASH C", "pending_payment"],
  ]);
  const events = await sql`select note from status_events where order_uuid in (${a}, ${b}) and status = 'in_production'`;
  expect(events.map((e) => e.note)).toEqual(["Batch 1 of 3", "Batch 1 of 3"]);
  await expect.poll(async () => (await sql`select 1 from email_logs where recipient like ${like} and template = '3-in-production'`).length, { timeout: 20_000 }).toBe(2);

  // Selecting an order that cannot make the move reports it instead of failing the rest.
  await page.goto("/admin?q=DASH");
  await page.getByLabel(`Select ${ids["DASH A"].orderId}`).check();
  await page.getByLabel("Move to").selectOption("refund_successful");
  await page.getByRole("button", { name: "Update 1 selected" }).click();
  await expect(page.getByText("No orders were changed. 1 skipped.")).toBeVisible();
  await expect(page.getByText(`${ids["DASH A"].orderId} is In Production, which cannot move to Refund Successful`)).toBeVisible();

  // 5. CSV: a signed-in admin gets the filtered rows with a link to each order; a stranger gets nothing.
  const csv = await page.request.get("/api/admin/orders/export?q=DASH&pay=confirmed");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain(ids["DASH A"].orderId);
  expect(text).toContain(ids["DASH B"].orderId);
  expect(text).not.toContain(ids["DASH C"].orderId); // C is not confirmed, so the filter leaves it out
  expect(text).toContain(`/admin/orders/${a}`);
  expect(text.split("\r\n")[0]).toContain("Order ID,Status,Buyer");
  expect((await request.get("/api/admin/orders/export")).status()).toBe(401);
  const [audit] = await sql`select count(*)::int as n from audit_logs where action = 'orders.export' and created_at >= ${START}`;
  expect(audit.n).toBe(1);

  // 6. A single order: the note field, and canceling needs its reason.
  await page.goto(`/admin/orders/${c}`);
  await expect(page.getByText("has not uploaded a receipt")).toHaveCount(0); // C has a receipt, so review actions show
  await page.goto(`/admin/orders/${a}`);
  await page.getByLabel(/Note for the buyer/).fill("Packed and ready");
  await page.getByRole("button", { name: "Move to Out for Shipping" }).click();
  await expect(page.getByText("Status updated.")).toBeVisible();
  await expect.poll(async () => (await sql`select 1 from email_logs where recipient = ${email("a")} and template = '4-out-for-shipping'`).length, { timeout: 20_000 }).toBe(1);
});
