import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { createHash } from "node:crypto";
import { checkoutKey, checkoutLimit } from "../src/lib/rate-limit";
import { PHONE } from "./helpers";

// Sprint 2E: the order limit at checkout, real 404s for payment links that are not orders, and the
// buyer's dated timeline.
const RUN = Date.now();
const BUYER = `e2e-hard-${RUN}@example.test`;
const OPEN_ORDER = "00000000-0000-4000-8000-0000000000f1";
const TRACKED_ORDER = "00000000-0000-4000-8000-0000000000f2";
const TOKEN_HASH = createHash("sha256").update(`e2e-hardening-${RUN}`).digest("hex");

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
const limit = checkoutLimit(); // the same numbers the server uses

test.beforeAll(async () => {
  await sql`delete from orders where id in (${OPEN_ORDER}, ${TRACKED_ORDER})`;
  await sql`insert into orders (id, order_id, region_code, buyer_name, university, university_address, home_address_link, home_landmark, contact_number, contact_last4, email, total_centavos, status) values (${OPEN_ORDER}, 'R13999961', '13', 'E2E Open', 'U', 'addr', 'https://maps.google.com/x', 'lm', ${PHONE}, ${PHONE.slice(-4)}, ${BUYER}, 5000, 'order_received')`;
  await sql`insert into orders (id, order_id, region_code, buyer_name, university, university_address, home_address_link, home_landmark, contact_number, contact_last4, email, total_centavos, status, tracking_token_hash) values (${TRACKED_ORDER}, 'R13999962', '13', 'E2E Tracked', 'U', 'addr', 'https://maps.google.com/x', 'lm', ${PHONE}, ${PHONE.slice(-4)}, ${BUYER}, 5000, 'in_production', ${TOKEN_HASH})`;
  await sql`insert into status_events (order_uuid, status, created_at) values
    (${TRACKED_ORDER}, 'order_received', '2026-11-10T01:00:00Z'),
    (${TRACKED_ORDER}, 'pending_payment', '2026-11-10T02:00:00Z'),
    (${TRACKED_ORDER}, 'payment_confirmation', '2026-11-11T03:30:00Z'),
    (${TRACKED_ORDER}, 'in_production', '2026-11-12T05:45:00Z')`;
});

test.afterAll(async () => {
  await sql`delete from orders where id in (${OPEN_ORDER}, ${TRACKED_ORDER}) or email = ${BUYER}`;
  await sql`delete from rate_limits`;
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  if (n === 0) await sql`select setval('order_number_seq', 1, false)`;
  await sql.end();
});

test("payment links that are not orders are a real 404", async ({ request }) => {
  expect((await request.get("/pay/00000000-0000-4000-8000-0000000000aa")).status()).toBe(404); // looks right, no such order
  expect((await request.get("/pay/not-a-uuid")).status()).toBe(404);
  expect((await request.get("/pay/12345")).status()).toBe(404);
  expect((await request.get(`/pay/${OPEN_ORDER}`)).status()).toBe(200); // a real order still opens
  expect((await request.get(`/pay/${OPEN_ORDER.toUpperCase()}`)).status()).toBe(200);
});

test("the buyer's timeline shows the date of each step", async ({ page }) => {
  await page.goto("/track");
  await page.getByLabel("Order ID").fill("R13999962");
  await page.getByLabel("Last 4 digits of your contact number").fill(PHONE.slice(-4));
  await page.getByRole("button", { name: "Track my order" }).click();
  const items = page.locator("ol li");
  await expect(items).toHaveCount(2); // Payment Confirmation and In Production; steps before the Order ID are never shown
  await expect(items.nth(0)).toContainText("Payment Confirmation");
  await expect(items.nth(0)).toContainText("November 11, 2026");
  await expect(items.nth(1)).toContainText("In Production");
  await expect(items.nth(1)).toContainText("November 12, 2026");
});

test("one visitor cannot create orders without limit", async ({ page }) => {
  test.setTimeout(120_000);
  // Fill the visitor's counter to the limit, as if they had just made that many orders.
  const address = "203.0.113.77"; // a fixed visitor address, sent as the first forwarded address (Vercel sets this header itself)
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": address });
  const key = checkoutKey(address);
  await sql`insert into rate_limits (key, failures, window_start) values (${key}, ${limit.max}, now()) on conflict (key) do update set failures = ${limit.max}, window_start = now()`;

  await page.goto("/products/tshirt-design-a");
  await page.locator("label", { hasText: /^M$/ }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByText("Added to your cart.").waitFor();
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("E2E Limit");
  await page.getByLabel("University", { exact: true }).fill("Test University");
  await page.getByLabel("University address").fill("1 Test Street, Quezon City");
  await page.getByLabel("Region of your university").selectOption("13");
  await page.getByLabel("Home address (Google Maps link)").fill("https://maps.app.goo.gl/e2etest");
  await page.getByLabel("Landmark near your home").fill("Beside the test store");
  await page.getByLabel("Contact number").fill(PHONE);
  await page.getByLabel("Email address", { exact: true }).fill(BUYER);
  await page.getByLabel("Confirm email address").fill(BUYER);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByText("There have been many orders from this connection in a short time")).toBeVisible();
  expect((await sql`select 1 from orders where email = ${BUYER} and id not in (${OPEN_ORDER}, ${TRACKED_ORDER})`).length).toBe(0); // no order was made

  // Once the counter is clear the same form goes through, and the order is counted.
  await sql`delete from rate_limits where key = ${key}`;
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/pay\/[0-9a-f-]{36}$/);
  const [counted] = await sql`select failures from rate_limits where key = ${key}`;
  expect(counted.failures).toBe(1);
});
