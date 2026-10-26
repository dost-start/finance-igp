import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { signInAdmin } from "./helpers";

// Sprint 3D: the Technology team adds products and sets photos without a code change. Throwaway tech
// admin and throwaway product; cleanup removes both and the audit rows from this run.
const RUN = Date.now();
const START = new Date();
const TECH = `e2e-catalog-tech-${RUN}@example.test`;
const FINANCE = `e2e-catalog-finance-${RUN}@example.test`;
const NAME = `E2E Catalog Tee ${RUN}`;
const SLUG = `e2e-catalog-tee-${RUN}`;

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });

test.beforeAll(async () => {
  await sql`insert into admin_accounts (name, email, role, active) values ('E2E tech', ${TECH}, 'tech', true), ('E2E finance', ${FINANCE}, 'finance', true)`;
});

test.afterAll(async () => {
  await sql`delete from audit_logs where created_at >= ${START}`;
  await sql`delete from products where slug = ${SLUG}`;
  await sql`delete from admin_accounts where email in (${TECH}, ${FINANCE})`;
  await sql.end();
});

test("tech adds a product with photos, finance cannot", async ({ page, context }) => {
  test.setTimeout(180_000);

  // Finance has no way in.
  await signInAdmin(context, FINANCE);
  await page.goto("/admin/products/new");
  await expect(page).toHaveURL(/\/admin\?notice=tech_only/);

  await context.clearCookies();
  await signInAdmin(context, TECH);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: "Add a product" }).click();
  await expect(page.getByRole("heading", { name: "Add a product" })).toBeVisible();

  // Missing fields are explained and what was typed is kept.
  await page.getByLabel("Name", { exact: true }).fill(NAME);
  await page.getByLabel("Price in pesos").fill("350");
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByText("Choose what kind of product it is")).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(NAME);
  expect((await sql`select 1 from products where slug = ${SLUG}`).length).toBe(0);

  // A bad photo name is refused.
  await page.getByLabel("Kind of product").selectOption("sticker");
  await page.getByLabel("Photos", { exact: true }).fill("../secret.png");
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByText("is not a photo file name")).toBeVisible();
  expect((await sql`select 1 from products where slug = ${SLUG}`).length).toBe(0);

  // A good one. The web address is made from the name; a preview shows while typing.
  await page.getByLabel("Photos", { exact: true }).fill("sticker-01.svg\nsticker-02.svg");
  await expect(page.getByRole("img", { name: "Preview of sticker-01.svg" })).toBeVisible();
  await page.getByLabel("Web address").fill(SLUG);
  await page.getByLabel("On sale").check();
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByText(`Saved “${NAME}”.`)).toBeVisible();
  const [row] = await sql`select name, product_type, price_centavos, active, images, sort_order from products where slug = ${SLUG}`;
  expect(row.price_centavos).toBe(35000);
  expect(row.product_type).toBe("sticker");
  expect(row.active).toBe(true);
  expect(row.images.map((i: { url: string }) => i.url)).toEqual(["/products/sticker-01.svg", "/products/sticker-02.svg"]);

  // The same web address cannot be used twice.
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill("Another");
  await page.getByLabel("Kind of product").selectOption("tote");
  await page.getByLabel("Web address").fill(SLUG);
  await page.getByLabel("Price in pesos").fill("100");
  await page.getByRole("button", { name: "Add product" }).click();
  await expect(page.getByText("already used")).toBeVisible();

  // It is in the shop with its photo.
  await page.goto("/shop");
  const card = page.locator("li", { hasText: NAME });
  await expect(card).toContainText("₱350");
  await expect(card.locator("img")).toHaveCount(1);
  await page.goto(`/products/${SLUG}`);
  await expect(page.getByRole("heading", { name: NAME })).toBeVisible();

  // Edit: change the photos and see the change.
  await page.goto("/admin/products");
  await page.locator("tr", { hasText: NAME }).getByRole("link", { name: "Edit" }).click();
  await expect(page.getByLabel("Photos", { exact: true })).toHaveValue("sticker-01.svg\nsticker-02.svg");
  await page.getByLabel("Photos", { exact: true }).fill("sticker-03.svg");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText(`Saved “${NAME}”.`)).toBeVisible();
  const [edited] = await sql`select images from products where slug = ${SLUG}`;
  expect(edited.images.map((i: { url: string }) => i.url)).toEqual(["/products/sticker-03.svg"]);
});
