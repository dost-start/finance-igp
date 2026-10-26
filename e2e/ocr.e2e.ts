import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { placeOrder, signInAdmin } from "./helpers";

// Receipt reading (sprint 2A): the buyer's phone reads the receipt, finance sees it next to the
// typed values and the order total, and a reused reference number is flagged. OCR never confirms.
const RUN = Date.now();
const email = (n: string) => `e2e-ocr-${n}-${RUN}@example.test`;
const REF = "8012345678901";

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });

test.afterAll(async () => {
  await sql`delete from orders where email like ${`e2e-ocr-%-${RUN}@example.test`}`;
  await sql`delete from email_logs where recipient like ${`e2e-ocr-%-${RUN}@example.test`}`;
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  if (n === 0) await sql`select setval('order_number_seq', 1, false)`;
  await sql.end();
});

test("receipt reading is shown to finance, mismatches and reused references are flagged", async ({ page, context }) => {
  // A: clear receipt, right amount, right reference.
  const a = await placeOrder(page, { name: "OCR A", email: email("a"), reference: REF, receipt: { amount: "450.00" } });
  // B: wrong amount on the receipt, and the same reference number as A.
  const b = await placeOrder(page, { name: "OCR B", email: email("b"), reference: REF, receipt: { amount: "400.00" } });
  // C: a blank image that cannot be read. The buyer still gets through.
  const c = await placeOrder(page, { name: "OCR C", email: email("c"), reference: "C0FFEE123456", receipt: { amount: null, blank: true } });

  const rows = await sql`select o.buyer_name, p.ocr_result, p.ocr_amount, p.ocr_reference from payment_proofs p join orders o on o.id = p.order_uuid where o.email like ${`e2e-ocr-%-${RUN}@example.test`} order by o.buyer_name`;
  expect(rows.map((r) => [r.buyer_name, r.ocr_result])).toEqual([
    ["OCR A", "match"],
    ["OCR B", "mismatch"],
    ["OCR C", "unreadable"],
  ]);
  expect(rows[0].ocr_amount).toBe("450.00");
  expect(rows[1].ocr_amount).toBe("400.00");

  await signInAdmin(context);

  await page.goto(`/admin/orders/${a}`);
  await expect(page.getByText("Reading matches")).toBeVisible();
  await expect(page.getByText("✓ Match")).toHaveCount(2);
  await expect(page.getByText("This reference number was already used on another order.")).toBeVisible();

  await page.goto(`/admin/orders/${b}`);
  await expect(page.getByText("Reading does not match: check first")).toBeVisible();
  await expect(page.getByText("✗ Different")).toHaveCount(1);
  await expect(page.getByText("This reference number was already used on another order.")).toBeVisible();

  await page.goto(`/admin/orders/${c}`);
  await expect(page.getByText("Could not be read: check by eye")).toBeVisible();
  await expect(page.getByText("This reference number was already used on another order.")).toHaveCount(0);

  // OCR never confirms: even a matching order stays Pending Payment until finance clicks Confirm.
  const [statusRow] = await sql`select status from orders where id = ${a}`;
  expect(statusRow.status).toBe("pending_payment");
});
