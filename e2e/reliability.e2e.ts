import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { E2E_CRON_SECRET } from "../playwright.config";
import { UPLOAD_MAX, uploadKey } from "../src/lib/rate-limit";
import { signInAdmin } from "./helpers";

// Sprint 3: nightly backup, the System page, the server error list, and the upload limit.
const START = new Date();
const MARK = `e2e-reliability-${Date.now()}`;
const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
let hadLastBackup = false;
const created: string[] = [];

test.beforeAll(async () => {
  hadLastBackup = (await sql`select 1 from store_settings where key = 'last_backup'`).length > 0;
});

test.afterAll(async () => {
  if (!hadLastBackup) await sql`delete from store_settings where key = 'last_backup'`;
  await sql`delete from error_logs where message like ${`%${MARK}%`}`;
  await sql`delete from audit_logs where created_at >= ${START}`;
  await sql.end();
  for (const f of created) rmSync(f, { force: true });
});

// The newest local backup file made since the test began (the development store keeps files under .data).
function newestBackup(): { path: string; json: { app: string; version: string; counts: Record<string, number>; tables: Record<string, unknown[]> } } | null {
  const dir = join(process.cwd(), ".data", "files");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => !f.endsWith(".mime"))
    .map((f) => ({ path: join(dir, f), at: statSync(join(dir, f)).mtimeMs }))
    .filter((f) => f.at >= START.getTime() - 1000)
    .sort((a, b) => b.at - a.at);
  for (const f of files) {
    try {
      const json = JSON.parse(gunzipSync(readFileSync(f.path)).toString("utf8"));
      if (json.app === "start-collections") return { path: f.path, json };
    } catch {
      // not a backup: another test's receipt
    }
  }
  return null;
}

test("the nightly backup needs the secret, saves a complete copy, and shows on the System page", async ({ page, context, request }) => {
  test.setTimeout(120_000);

  // 1. Nobody without the secret can start it.
  expect((await request.get("/api/cron/backup")).status()).toBe(401);
  expect((await request.get("/api/cron/backup", { headers: { authorization: "Bearer not-the-secret" } })).status()).toBe(401);
  expect((await request.get("/api/cron/backup", { headers: { authorization: E2E_CRON_SECRET } })).status()).toBe(401); // the bare secret without "Bearer"

  // 2. With the secret it saves a copy that matches the database.
  const res = await request.get("/api/cron/backup", { headers: { authorization: `Bearer ${E2E_CRON_SECRET}` } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.file).toMatch(/^backup-\d{4}-\d{2}-\d{2}-\d{4}\.json\.gz$/);
  const [{ orders }] = await sql`select count(*)::int as orders from orders`;
  const [{ products }] = await sql`select count(*)::int as products from products`;
  expect(body.counts.orders).toBe(orders);
  expect(body.counts.products).toBe(products);

  const copy = newestBackup();
  expect(copy, "a backup file was written").not.toBeNull();
  if (copy) created.push(copy.path, `${copy.path}.mime`);
  expect(copy?.json.counts.products).toBe(products);
  for (const [name, rows] of Object.entries(copy?.json.tables ?? {})) expect(rows.length, name).toBe(copy?.json.counts[name]);
  expect(Object.keys(copy?.json.tables ?? {})).toEqual(expect.arrayContaining(["orders", "order_items", "payment_proofs", "status_events", "products", "audit_logs", "email_logs"]));

  // 3. The System page shows it, and "Back up now" works for any signed-in member.
  await signInAdmin(context);
  await page.goto("/admin/system");
  await expect(page.getByRole("heading", { name: "System", exact: true })).toBeVisible();
  await expect(page.getByText("Connected, answered in")).toBeVisible();
  await expect(page.getByText(/just now|minutes ago/).first()).toBeVisible();
  await page.getByRole("button", { name: "Back up now" }).click();
  await expect(page.getByText("Backup saved.")).toBeVisible();
  const again = newestBackup();
  if (again && !created.includes(again.path)) created.push(again.path, `${again.path}.mime`);
  await page.goto("/admin/audit?action=backup.run");
  await expect(page.locator("tbody").getByText("Ran a backup by hand").first()).toBeVisible();
});

test("server errors are listed on the System page", async ({ page, context }) => {
  await sql`insert into error_logs (route, method, message) values ('/pay/:id', 'POST', ${`Error: something broke ${MARK}`})`;
  await signInAdmin(context);
  await page.goto("/admin/system");
  await expect(page.getByText(`Error: something broke ${MARK}`)).toBeVisible();
  await expect(page.getByText("POST /pay/:id")).toBeVisible();
  await expect(page.getByText(/server errors?\. The newest are listed below/)).toBeVisible();
});

test("one connection cannot hammer the receipt upload", async ({ request }) => {
  const address = "203.0.113.88";
  const key = uploadKey(address);
  const send = () =>
    request.post("/api/receipt", {
      headers: { "x-forwarded-for": address },
      multipart: { orderUuid: "00000000-0000-4000-8000-0000000000fe", channel: "gcash", reference: "x", receipt: { name: "r.png", mimeType: "image/png", buffer: Buffer.from("x") } },
    });
  await sql`insert into rate_limits (key, failures, window_start) values (${key}, ${UPLOAD_MAX}, now()) on conflict (key) do update set failures = ${UPLOAD_MAX}, window_start = now()`;
  const blocked = await send();
  expect(blocked.status()).toBe(429);
  expect((await blocked.json()).error).toBe("too_many");

  await sql`delete from rate_limits where key = ${key}`;
  const allowed = await send();
  expect(allowed.status()).toBe(422); // not rate limited: it reaches the normal checks, which refuse the one-letter reference
});
