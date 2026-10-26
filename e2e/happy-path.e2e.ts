import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { encode } from "next-auth/jwt";
import { E2E_AUTH_SECRET } from "../playwright.config";

// The money path from the PRD demo: browse, order, pay, finance confirms, buyer tracks.
const EMAIL = `e2e-${Date.now()}@example.test`;
const PHONE = "09171234567";
const ADMIN_EMAIL = "ethandreizbaltazar0@gmail.com"; // seeded in admin_accounts
const ONE_PIXEL_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

const START = new Date();
const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });

test.afterAll(async () => {
  // Remove what this run created and, when no real orders exist, hand the Order ID numbers back.
  await sql`delete from orders where email = ${EMAIL}`;
  await sql`delete from email_logs where recipient = ${EMAIL}`;
  await sql`delete from rate_limits`;
  await sql`delete from audit_logs where created_at >= ${START}`;
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  if (n === 0) await sql`select setval('order_number_seq', 1, false)`;
  await sql.end();
});

test("buyer orders and pays, finance confirms, buyer tracks the order", async ({ page, context }) => {
  // 1. Pick a T-shirt size and add it to the cart.
  await page.goto("/products/tshirt-design-a");
  await page.locator("label", { hasText: /^M$/ }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText("Added to your cart.")).toBeVisible();

  // 2. Cart to checkout.
  await page.goto("/cart");
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Full name").fill("E2E Happy Path");
  await page.getByLabel("University", { exact: true }).fill("Test University");
  await page.getByLabel("University address").fill("1 Test Street, Quezon City");
  await page.getByLabel("Region of your university").selectOption("13");
  await page.getByLabel("Home address (Google Maps link)").fill("https://maps.app.goo.gl/e2etest");
  await page.getByLabel("Landmark near your home").fill("Beside the test store");
  await page.getByLabel("Contact number").fill(PHONE);
  await page.getByLabel("Email address", { exact: true }).fill(EMAIL);
  await page.getByLabel("Confirm email address").fill(EMAIL);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to payment" }).click();

  // 3. Pay page: the Order ID stays hidden, the receipt goes up.
  await page.waitForURL(/\/pay\/[0-9a-f-]{36}$/);
  const orderUuid = page.url().split("/").pop() as string;
  await expect(page.locator("body")).not.toContainText(/R13\d{6}/);
  await page.getByLabel("Reference number").fill("E2E123456789");
  await page.getByLabel("Receipt image").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: ONE_PIXEL_PNG });
  await page.getByRole("button", { name: "Submit payment details" }).click();
  await expect(page.getByText("Your Order & Tracking ID will be sent once your payment has been finalized by the Finance Team.")).toBeVisible();
  const [order] = await sql`select order_id, status from orders where id = ${orderUuid}`;
  expect(order.status).toBe("pending_payment");

  // 4. Before confirmation, the buyer cannot track it, even with the right details.
  await page.goto("/track");
  await page.getByLabel("Order ID").fill(order.order_id);
  await page.getByLabel("Last 4 digits of your contact number").fill(PHONE.slice(-4));
  await page.getByRole("button", { name: "Track my order" }).click();
  await expect(page.getByText("We could not find an order with those details")).toBeVisible();

  // 5. Signed out, the admin area and the receipt stay closed.
  const closed = await page.request.get(`/api/admin/receipts/${orderUuid}`);
  expect(closed.status()).toBe(401);
  await page.goto(`/admin/orders/${orderUuid}`);
  await expect(page).toHaveURL(/\/admin\/signin/);

  // 6. Finance signs in (session minted with the test secret) and confirms.
  const session = await encode({ token: { email: ADMIN_EMAIL, name: "E2E Admin", sub: "e2e" }, secret: E2E_AUTH_SECRET, salt: "authjs.session-token", maxAge: 1800 });
  await context.addCookies([{ name: "authjs.session-token", value: session, url: "http://localhost:3101" }]);
  await page.goto(`/admin/orders/${orderUuid}`);
  await expect(page.getByRole("heading", { name: order.order_id })).toBeVisible();
  await expect(page.getByAltText(/receipt/i)).toBeVisible();
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Payment confirmed." })).toBeVisible();
  const [confirmed] = await sql`select status, tracking_token_hash from orders where id = ${orderUuid}`;
  expect(confirmed.status).toBe("payment_confirmation");
  expect(confirmed.tracking_token_hash).toMatch(/^[0-9a-f]{64}$/);
  // The email is sent after the response, so wait for its log row (skipped: SMTP is off in this run).
  await expect
    .poll(async () => (await sql`select 1 from email_logs where recipient = ${EMAIL} and template = '2-payment-confirmation'`).length, { timeout: 15_000 })
    .toBe(1);

  // 7. The buyer now tracks it with the Order ID and the last 4 digits.
  await context.clearCookies();
  await page.goto("/track");
  await page.getByLabel("Order ID").fill(order.order_id);
  await page.getByLabel("Last 4 digits of your contact number").fill(PHONE.slice(-4));
  await page.getByRole("button", { name: "Track my order" }).click();
  await expect(page.getByText("Finance confirmed your payment.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
});
