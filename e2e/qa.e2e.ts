import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { encode } from "next-auth/jwt";
import { E2E_PORT } from "../playwright.config";
import { PHONE, placeOrder, signInAdmin } from "./helpers";

// Sprint 2 QA: things a hostile or careless visitor might do. Throwaway rows only; all removed afterwards.
const RUN = Date.now();
const START = new Date();
const BUYER = `e2e-qa-${RUN}@example.test`;
const INACTIVE_ADMIN = `e2e-qa-inactive-${RUN}@example.test`;
const STRANGER = `e2e-qa-stranger-${RUN}@example.test`;
const P_INACTIVE = `e2e-qa-inactive-product-${RUN}`;
const P_SOLDOUT = `e2e-qa-soldout-product-${RUN}`;
const ORDER = "00000000-0000-4000-8000-0000000000d1";

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
let ids: { tshirt: string; inactive: string; soldout: string };

test.beforeAll(async () => {
  await sql`insert into admin_accounts (name, email, role, active) values ('E2E inactive', ${INACTIVE_ADMIN}, 'finance', false)`;
  await sql`insert into products (slug, name, product_type, price_centavos, sizes, images, active, sort_order) values
    (${P_INACTIVE}, 'QA inactive', 'sticker', 5000, '[{"size":"One size","available":true}]'::jsonb, '[]'::jsonb, false, 9998),
    (${P_SOLDOUT}, 'QA sold out size', 'tshirt', 5000, '[{"size":"S","available":false},{"size":"M","available":true}]'::jsonb, '[]'::jsonb, false, 9999)`;
  // The sold-out product stays inactive so shoppers never see it; its size rules are what is under test,
  // so make it active only for the moment the test needs it.
  const [t] = await sql`select id from products where slug = 'tshirt-design-a'`;
  const [i] = await sql`select id from products where slug = ${P_INACTIVE}`;
  const [s] = await sql`select id from products where slug = ${P_SOLDOUT}`;
  ids = { tshirt: t.id, inactive: i.id, soldout: s.id };
  await sql`insert into orders (id, order_id, region_code, buyer_name, university, university_address, home_address_link, home_landmark, contact_number, contact_last4, email, total_centavos, status) values (${ORDER}, 'R13999951', '13', 'E2E QA', 'U', 'addr', 'https://maps.google.com/x', 'lm', ${PHONE}, ${PHONE.slice(-4)}, ${BUYER}, 5000, 'order_received')`;
});

test.afterAll(async () => {
  await sql`delete from orders where email = ${BUYER} or id = ${ORDER}`;
  await sql`delete from email_logs where recipient = ${BUYER}`;
  await sql`delete from audit_logs where created_at >= ${START}`;
  await sql`delete from products where slug in (${P_INACTIVE}, ${P_SOLDOUT})`;
  await sql`delete from admin_accounts where email = ${INACTIVE_ADMIN}`;
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  if (n === 0) await sql`select setval('order_number_seq', 1, false)`;
  await sql.end();
});

test("a tampered cart never changes what is charged, and bad carts are refused", async ({ page }) => {
  test.setTimeout(180_000);
  await sql`update products set active = true where id = ${ids.soldout}`; // so the size rule, not "inactive", is what refuses it
  try {
    // Replace the cart the form sends, as someone editing the request would.
    await page.addInitScript(() => {
      const original = FormData.prototype.set as (this: FormData, name: string, value: unknown, filename?: string) => void;
      FormData.prototype.set = function (this: FormData, name: string, value: unknown, filename?: string) {
        const w = window as unknown as { __tamper?: string };
        const sent = name === "items" && w.__tamper ? w.__tamper : value;
        if (filename === undefined) original.call(this, name, sent);
        else original.call(this, name, sent, filename);
      } as typeof FormData.prototype.set;
    });
    await page.goto("/products/tshirt-design-a");
    await page.locator("label", { hasText: /^M$/ }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByText("Added to your cart.").waitFor();
    await page.goto("/checkout");
    await page.getByLabel("Full name").fill("E2E Tamper");
    await page.getByLabel("University", { exact: true }).fill("Test University");
    await page.getByLabel("University address").fill("1 Test Street, Quezon City");
    await page.getByLabel("Region of your university").selectOption("13");
    await page.getByLabel("Home address (Google Maps link)").fill("https://maps.app.goo.gl/e2etest");
    await page.getByLabel("Landmark near your home").fill("Beside the test store");
    await page.getByLabel("Contact number").fill(PHONE);
    await page.getByLabel("Email address", { exact: true }).fill(BUYER);
    await page.getByLabel("Confirm email address").fill(BUYER);
    await page.getByRole("checkbox").check();

    const attempt = async (items: unknown) => {
      await page.evaluate((v) => ((window as unknown as { __tamper?: string }).__tamper = v), JSON.stringify(items));
      await page.getByRole("button", { name: "Continue to payment" }).click();
    };
    const orderCount = async () => (await sql`select count(*)::int as n from orders where email = ${BUYER} and id <> ${ORDER}`)[0].n as number;

    const refused: [string, unknown, string][] = [
      ["a product that does not exist", [{ productId: "00000000-0000-4000-8000-0000000000aa", size: "M", quantity: 1 }], "no longer available"],
      ["a size that does not exist", [{ productId: ids.tshirt, size: "XXXL", quantity: 1 }], "no longer available"],
      ["a hidden product", [{ productId: ids.inactive, size: "One size", quantity: 1 }], "no longer available"],
      ["a sold-out size", [{ productId: ids.soldout, size: "S", quantity: 1 }], "no longer available"],
      ["SQL in the size", [{ productId: ids.tshirt, size: "M'; drop table orders;--", quantity: 1 }], "no longer available"],
      ["a huge quantity", [{ productId: ids.tshirt, size: "M", quantity: 999 }], "check your cart"],
      ["a negative quantity", [{ productId: ids.tshirt, size: "M", quantity: -5 }], "check your cart"],
      ["a fractional quantity", [{ productId: ids.tshirt, size: "M", quantity: 1.5 }], "check your cart"],
      ["an empty cart", [], "check your cart"],
      ["a cart that is not a list", { productId: ids.tshirt }, "check your cart"],
    ];
    for (const [label, items, message] of refused) {
      await attempt(items);
      await expect(page.getByText(message, { exact: false }).first(), label).toBeVisible();
      expect(await orderCount(), `${label}: no order may be created`).toBe(0);
    }

    // Prices and totals sent by the visitor are ignored: the charge is rebuilt from the database.
    await attempt([{ productId: ids.tshirt, size: "M", quantity: 2, unitPriceCentavos: 1, priceCentavos: 1, price: 0.01, total: 1, totalCentavos: 1 }]);
    await page.waitForURL(/\/pay\/[0-9a-f-]{36}$/);
    const [order] = await sql`select total_centavos from orders where email = ${BUYER} and id <> ${ORDER}`;
    const [real] = await sql`select price_centavos from products where id = ${ids.tshirt}`;
    expect(order.total_centavos).toBe(2 * real.price_centavos);
    const [line] = await sql`select unit_price_centavos, quantity from order_items oi join orders o on o.id = oi.order_uuid where o.email = ${BUYER} and o.id <> ${ORDER}`;
    expect(line.unit_price_centavos).toBe(real.price_centavos);
  } finally {
    await sql`update products set active = false where id = ${ids.soldout}`;
  }
});

test("a blurry receipt still submits, and the reading is recorded without confirming anything", async ({ page }) => {
  test.setTimeout(120_000);
  const uuid = await placeOrder(page, { name: "QA Blurry", email: BUYER, reference: "7770000000042", receipt: { amount: "450.00", blur: 3 } });
  const [proof] = await sql`select p.ocr_result, o.status from payment_proofs p join orders o on o.id = p.order_uuid where o.id = ${uuid}`;
  expect(["match", "mismatch", "unreadable"]).toContain(proof.ocr_result); // a verdict was reached
  expect(proof.status).toBe("pending_payment"); // OCR never confirms
});

test("admin screens refuse forged, unknown and switched-off accounts", async ({ browser }) => {
  test.setTimeout(120_000);
  const forged = await encode({ token: { email: "ethandreizbaltazar0@gmail.com", sub: "x" }, secret: "not-the-real-secret-at-all-0123456789abcdef", salt: "authjs.session-token", maxAge: 600 });
  const real = (email: string) => import("../playwright.config").then(({ E2E_AUTH_SECRET }) => encode({ token: { email, sub: "x" }, secret: E2E_AUTH_SECRET, salt: "authjs.session-token", maxAge: 600 }));
  const cases: [string, string][] = [
    ["a cookie signed with the wrong secret (even with a real admin's email)", forged],
    ["a validly signed session for an account that is not an admin", await real(STRANGER)],
    ["a validly signed session for an admin switched off", await real(INACTIVE_ADMIN)],
  ];
  for (const [label, value] of cases) {
    const ctx = await browser.newContext({ baseURL: `http://localhost:${E2E_PORT}` });
    await ctx.addCookies([{ name: "authjs.session-token", value, url: `http://localhost:${E2E_PORT}` }]);
    const page = await ctx.newPage();
    for (const path of ["/admin", `/admin/orders/${ORDER}`, "/admin/emails", "/admin/audit", "/admin/products"]) {
      await page.goto(path);
      await expect(page, `${label}: ${path}`).toHaveURL(/\/admin\/signin/);
      await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
      expect(await page.content(), `${label}: ${path} must show no order data`).not.toMatch(/R13999951|E2E QA|Waiting for verification/);
    }
    for (const path of ["/api/admin/orders/export", `/api/admin/receipts/${ORDER}`]) {
      expect((await ctx.request.get(path)).status(), `${label}: ${path}`).toBe(401);
    }
    await ctx.close();
  }
  // The "no access" message for a Google account that is not on the list.
  const ctx = await browser.newContext({ baseURL: `http://localhost:${E2E_PORT}` });
  const page = await ctx.newPage();
  await page.goto("/admin/signin?error=AccessDenied");
  await expect(page.getByText("That Google account does not have admin access")).toBeVisible();
  await ctx.close();
});

test("a finance member can still use the order screens (control)", async ({ page, context }) => {
  await signInAdmin(context);
  await page.goto(`/admin/orders/${ORDER}`);
  await expect(page.getByRole("heading", { name: "R13999951" })).toBeVisible();
});
