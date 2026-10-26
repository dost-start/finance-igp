import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { signInAdmin } from "./helpers";

// Sprint 2D: audit log for every finance member, the tech-only product editor, and the store lock.
// It uses throwaway finance and tech accounts and a throwaway product, so nothing real is edited, and
// the cleanup always reopens the store.
const RUN = Date.now();
const START = new Date();
const FINANCE = `e2e-extras-finance-${RUN}@example.test`;
const TECH = `e2e-extras-tech-${RUN}@example.test`;
const SLUG = `e2e-extras-product-${RUN}`;
const BUYER = `e2e-extras-buyer-${RUN}@example.test`;
const ORDER_UUID = "00000000-0000-4000-8000-0000000000e1";

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
let storeRowExisted = false;

test.beforeAll(async () => {
  storeRowExisted = (await sql`select 1 from store_settings where key = 'store_locked'`).length > 0;
  await sql`insert into admin_accounts (name, email, role, active) values ('E2E finance', ${FINANCE}, 'finance', true), ('E2E tech', ${TECH}, 'tech', true)`;
  await sql`insert into products (slug, name, product_type, price_centavos, sizes, images, active, sort_order) values (${SLUG}, 'E2E Product', 'sticker', 5000, '[{"size":"One size","available":true}]'::jsonb, '[]'::jsonb, false, 9999)`;
  await sql`delete from orders where id = ${ORDER_UUID}`;
  await sql`insert into orders (id, order_id, region_code, buyer_name, university, university_address, home_address_link, home_landmark, contact_number, contact_last4, email, total_centavos, status) values (${ORDER_UUID}, 'R13999971', '13', 'E2E Extras', 'U', 'addr', 'https://maps.google.com/x', 'lm', '09171234567', '4567', ${BUYER}, 5000, 'order_received')`;
});

test.afterAll(async () => {
  // Always leave the store open and the catalog as it was.
  if (storeRowExisted) await sql`update store_settings set value = 'false', updated_by = null where key = 'store_locked'`;
  else await sql`delete from store_settings where key = 'store_locked'`;
  await sql`delete from audit_logs where created_at >= ${START}`;
  await sql`delete from orders where id = ${ORDER_UUID}`;
  await sql`delete from products where slug = ${SLUG}`;
  await sql`delete from admin_accounts where email in (${FINANCE}, ${TECH})`;
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  if (n === 0) await sql`select setval('order_number_seq', 1, false)`;
  await sql.end();
});

test("finance and tech: audit log, product editor and the store lock", async ({ page, context }) => {
  test.setTimeout(240_000);

  // 1. Finance: sees the audit log, not the product editor.
  await signInAdmin(context, FINANCE);
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Audit log" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Products" })).toHaveCount(0);
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\?notice=tech_only/);
  await expect(page.getByText("Editing products is only for the Technology team")).toBeVisible();
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();

  // 2. Open store: the pay page shows the payment form, the checkout is a form, no banner.
  await page.goto(`/pay/${ORDER_UUID}`);
  await expect(page.getByLabel("Reference number")).toBeVisible();

  // A buyer has the checkout form open (filled in) when finance closes the store.
  const buyer = await context.browser()!.newContext();
  const buyerPage = await buyer.newPage();
  await buyerPage.goto("/products/tshirt-design-a");
  await buyerPage.locator("label", { hasText: /^M$/ }).click();
  await buyerPage.getByRole("button", { name: "Add to cart" }).click();
  await buyerPage.getByText("Added to your cart.").waitFor();
  await buyerPage.goto("/checkout");
  await buyerPage.getByLabel("Full name").fill("E2E Closed");
  await buyerPage.getByLabel("University", { exact: true }).fill("Test University");
  await buyerPage.getByLabel("University address").fill("1 Test Street, Quezon City");
  await buyerPage.getByLabel("Region of your university").selectOption("13");
  await buyerPage.getByLabel("Home address (Google Maps link)").fill("https://maps.app.goo.gl/e2etest");
  await buyerPage.getByLabel("Landmark near your home").fill("Beside the test store");
  await buyerPage.getByLabel("Contact number").fill("09171234567");
  await buyerPage.getByLabel("Email address", { exact: true }).fill(BUYER);
  await buyerPage.getByLabel("Confirm email address").fill(BUYER);
  await buyerPage.getByRole("checkbox").check();

  // 3. Finance closes the store.
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "The store is open" })).toBeVisible();
  await page.getByRole("button", { name: "Close the store" }).click();
  await expect(page.getByText("The store is closed. Buyers cannot place orders or send payments until you reopen it.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The store is CLOSED" })).toBeVisible();
  const [lock] = await sql`select value from store_settings where key = 'store_locked'`;
  expect(lock.value).toBe("true");

  //    The buyer's open checkout form is refused on the server with the friendly message; no order is created.
  await buyerPage.getByRole("button", { name: "Continue to payment" }).click();
  await expect(buyerPage.getByText("The store is closed for now, so we are not taking new orders or payments")).toBeVisible();
  expect((await sql`select 1 from orders where email = ${BUYER} and id <> ${ORDER_UUID}`).length).toBe(0);

  //    The pay page and the receipt upload are closed too.
  await page.goto(`/pay/${ORDER_UUID}`);
  await expect(page.getByText("The store is closed for now", { exact: true })).toBeVisible(); // the notice title that replaces the form
  await expect(page.getByLabel("Reference number")).toHaveCount(0);
  const upload = await page.request.post("/api/receipt", { multipart: { orderUuid: ORDER_UUID, channel: "gcash", reference: "ABC1234567", receipt: { name: "r.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
  expect(upload.status()).toBe(423);
  expect((await upload.json()).error).toBe("store_closed");

  //    The shop pages show the closed banner (it is a few seconds behind at most), and the checkout page shows the message.
  await expect
    .poll(async () => {
      await buyerPage.goto("/checkout");
      return buyerPage.getByText("The store is closed for now", { exact: true }).count();
    }, { timeout: 60_000, intervals: [2_000] })
    .toBeGreaterThan(0);
  await buyerPage.goto("/");
  await expect(buyerPage.getByRole("status").filter({ hasText: "The store is closed for now" }).first()).toBeVisible();

  // 4. Reopen: the pay form is back.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Reopen the store" }).click();
  await expect(page.getByText("The store is open again.")).toBeVisible();
  await page.goto(`/pay/${ORDER_UUID}`);
  await expect(page.getByLabel("Reference number")).toBeVisible();
  await buyer.close();

  // 5. Tech: the product editor.
  await context.clearCookies();
  await signInAdmin(context, TECH);
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
  await page.getByRole("link", { name: "Products" }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await page.locator("tr", { hasText: "E2E Product" }).getByRole("link", { name: "Edit" }).click();

  //    A bad price and a duplicate size are explained, and nothing is saved.
  await page.getByLabel("Price in pesos").fill("free");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Enter a price in pesos")).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("E2E Product"); // what was typed is kept
  const [untouched] = await sql`select price_centavos, active from products where slug = ${SLUG}`;
  expect(untouched.price_centavos).toBe(5000);

  //    A good edit: new name, price and sizes, put on sale.
  await page.getByLabel("Name", { exact: true }).fill("E2E Edited Product");
  await page.getByLabel("Price in pesos").fill("123.45");
  await page.getByRole("button", { name: "Add a size" }).click();
  await page.getByLabel("Size name 2").fill("Large");
  await page.getByLabel("Available").nth(1).uncheck(); // Large shows as sold out
  await page.getByLabel("On sale").check();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Saved “E2E Edited Product”.")).toBeVisible();
  const [edited] = await sql`select name, price_centavos, active, sizes from products where slug = ${SLUG}`;
  expect(edited.name).toBe("E2E Edited Product");
  expect(edited.price_centavos).toBe(12345);
  expect(edited.active).toBe(true);
  expect(edited.sizes).toEqual([{ size: "One size", available: true }, { size: "Large", available: false }]);

  //    The shop shows it straight away, at the new price.
  await page.goto("/");
  await expect(page.getByText("E2E Edited Product")).toBeVisible();
  await expect(page.locator("li", { hasText: "E2E Edited Product" })).toContainText("₱123.45");

  //    Hide it again: it leaves the shop.
  await page.goto("/admin/products");
  await page.locator("tr", { hasText: "E2E Edited Product" }).getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("On sale").uncheck();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Saved “E2E Edited Product”.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("E2E Edited Product")).toHaveCount(0);

  // 6. The audit log shows all of it, with who did it (finance can read it).
  await context.clearCookies();
  await signInAdmin(context, FINANCE);
  await page.goto("/admin/audit");
  const rows = page.locator("tbody");
  await expect(rows.getByText("Closed the store").first()).toBeVisible();
  await expect(rows.getByText("Reopened the store").first()).toBeVisible();
  await expect(rows.getByText("Edited a product").first()).toBeVisible();
  await expect(rows.getByText("E2E Edited Product: changed name, price, put on sale, sizes").first()).toBeVisible();
  await expect(rows.getByText(TECH).first()).toBeVisible();
  await page.goto("/admin/audit?action=store.lock");
  await expect(page.locator("tbody").getByText("Closed the store").first()).toBeVisible();
  await expect(page.locator("tbody").getByText("Edited a product")).toHaveCount(0);
});
