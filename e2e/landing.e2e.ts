import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { signInAdmin } from "./helpers";

// Sprint 3: the landing page (countdown, teaser, launch view) and the launch date setting.
const START = new Date();
const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
let hadSetting = false;

test.beforeAll(async () => {
  hadSetting = (await sql`select 1 from store_settings where key = 'launch_at'`).length > 0;
});

test.afterAll(async () => {
  if (!hadSetting) await sql`delete from store_settings where key = 'launch_at'`;
  await sql`delete from audit_logs where created_at >= ${START}`;
  await sql.end();
});

test("the landing page counts down, previews the merch, and switches to the launch view on the launch date", async ({ page, context }) => {
  test.setTimeout(150_000);

  // 1. A visitor sees the countdown to the planned date and a teaser without prices.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "START: COLLECTIONS", exact: true })).toBeVisible();
  await expect(page.getByText("The store opens in")).toBeVisible();
  await expect(page.getByText("Opens November 13, 2026 at 12:00 AM (Manila time)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "A sneak peek" })).toBeVisible();
  await expect(page.getByText("Coming soon").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop now" })).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("₱"); // prices wait for launch day
  await expect(page.locator("[data-slot=puzzle]")).toHaveCount(1); // the reserved puzzle slot exists and is empty
  expect(await page.locator("[data-slot=puzzle]").innerText()).toBe("");

  // 2. The shop itself is always open to browse at /shop, with prices.
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("₱");

  // 3. Finance sets a later launch date: the countdown follows.
  await signInAdmin(context);
  await page.goto("/admin");
  await page.getByLabel("New date and time (Manila)").fill("2027-01-15T09:30");
  await page.getByRole("button", { name: "Save launch date" }).click();
  await expect(page.getByText("Launch date saved.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Launch date: January 15, 2027 at 9:30 AM \(Manila time\)/ })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Opens January 15, 2027 at 9:30 AM (Manila time)")).toBeVisible();

  // 4. A date in the past shows the launch view: the store is open, the lineup has prices and links, Shop now goes to the shop.
  await page.goto("/admin");
  await page.getByLabel("New date and time (Manila)").fill("2026-10-01T09:00");
  await page.getByRole("button", { name: "Save launch date" }).click();
  await expect(page.getByText("The landing page is showing the launch view.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("The store is open")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The lineup" })).toBeVisible();
  await expect(page.locator("main")).toContainText("₱");
  await expect(page.getByText("Coming soon")).toHaveCount(0);
  await expect(page.getByText("The store opens in")).toHaveCount(0);
  const shopNow = page.getByRole("link", { name: "Shop now" });
  await expect(shopNow).toHaveAttribute("href", "/shop");
  await shopNow.click();
  await expect(page).toHaveURL(/\/shop$/);

  // 5. The status endpoint carries the date, and the change is in the audit log.
  const status = await (await page.request.get("/api/store")).json();
  expect(status.launchAt).toBe("2026-10-01T09:00:00+08:00");
  expect(status.locked).toBe(false);
  await page.goto("/admin/audit?action=launch.update");
  await expect(page.locator("tbody").getByText("Changed the launch date").first()).toBeVisible();
  await expect(page.locator("tbody").getByText(/From .* to October 1, 2026 at 9:00 AM \(Manila time\)/).first()).toBeVisible();

  // 6. Back to the planned date: the countdown returns for visitors.
  await page.goto("/admin");
  await page.getByLabel("New date and time (Manila)").fill("2026-11-13T00:00");
  await page.getByRole("button", { name: "Save launch date" }).click();
  await expect(page.getByText("Launch date saved.")).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("The store opens in")).toBeVisible();
});
