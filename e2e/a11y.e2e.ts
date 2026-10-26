import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { PHONE, signInAdmin } from "./helpers";

// Accessibility basics (WCAG 2.1 A and AA rules from axe-core) on every key page, in light and dark mode.
// Serious and critical findings fail the test; the rest are listed in the output.
const RUN = Date.now();
const BUYER = `e2e-a11y-${RUN}@example.test`;
const ORDER = "00000000-0000-4000-8000-0000000000c9";
const PAID = "00000000-0000-4000-8000-0000000000ca";

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });
let productId = "";

test.beforeAll(async () => {
  await sql`insert into orders (id, order_id, region_code, buyer_name, university, university_address, home_address_link, home_landmark, contact_number, contact_last4, email, total_centavos, status) values
    (${ORDER}, 'R13999941', '13', 'E2E A11y', 'U', 'addr', 'https://maps.google.com/x', 'lm', ${PHONE}, ${PHONE.slice(-4)}, ${BUYER}, 5000, 'order_received'),
    (${PAID}, 'R13999942', '13', 'E2E A11y Paid', 'U', 'addr', 'https://maps.google.com/x', 'lm', ${PHONE}, ${PHONE.slice(-4)}, ${BUYER}, 5000, 'pending_payment')`;
  await sql`insert into payment_proofs (order_uuid, channel, reference_number, ocr_result, ocr_amount, ocr_reference) values (${PAID}, 'gcash', '8880000000001', 'mismatch', '40.00', '8880000000001')`;
  productId = (await sql`select id from products where slug = 'tshirt-design-a'`)[0].id;
});

test.afterAll(async () => {
  await sql`delete from orders where email = ${BUYER}`;
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  if (n === 0) await sql`select setval('order_number_seq', 1, false)`;
  await sql.end();
});

type Finding = { page: string; mode: string; id: string; impact: string; help: string; nodes: string[] };

async function scan(page: Page, path: string, mode: "light" | "dark", found: Finding[]) {
  await page.emulateMedia({ colorScheme: mode });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  for (const v of results.violations) {
    found.push({ page: path, mode, id: v.id, impact: v.impact ?? "unknown", help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) });
  }
}

test("public pages have no serious accessibility problems", async ({ page }) => {
  test.setTimeout(240_000);
  const found: Finding[] = [];
  await page.goto("/products/tshirt-design-a");
  await page.locator("label", { hasText: /^M$/ }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByText("Added to your cart.").waitFor();
  for (const mode of ["light", "dark"] as const) {
    for (const path of ["/", "/shop", "/products/tshirt-design-a", "/cart", "/checkout", "/track", "/privacy", `/pay/${ORDER}`, "/admin/signin"]) await scan(page, path, mode, found);
  }
  const bad = found.filter((f) => f.impact === "serious" || f.impact === "critical");
  console.log("A11Y public: " + JSON.stringify(found, null, 1));
  expect(bad, JSON.stringify(bad, null, 1)).toEqual([]);
});

test("admin pages have no serious accessibility problems", async ({ page, context }) => {
  test.setTimeout(240_000);
  await signInAdmin(context);
  const found: Finding[] = [];
  for (const mode of ["light", "dark"] as const) {
    for (const path of ["/admin", `/admin/orders/${PAID}`, "/admin/emails", "/admin/audit", "/admin/changelog", "/admin/products", "/admin/products/new", "/admin/system", "/admin/help", `/admin/products/${productId}`]) await scan(page, path, mode, found);
  }
  const bad = found.filter((f) => f.impact === "serious" || f.impact === "critical");
  console.log("A11Y admin: " + JSON.stringify(found, null, 1));
  expect(bad, JSON.stringify(bad, null, 1)).toEqual([]);
});
