import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { PHONE, placeOrder, signInAdmin } from "./helpers";

// Sprint 2C: the cancel and refund line, rejection, corrections, the email log, and the daily email limit.
const RUN = Date.now();
const START = new Date();
const email = (n: string) => `e2e-flow-${n}-${RUN}@example.test`;
const like = `e2e-flow-%-${RUN}@example.test`;

const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 1 });

test.afterAll(async () => {
  await sql`delete from orders where email like ${like}`;
  await sql`delete from email_logs where recipient like ${like}`;
  await sql`delete from audit_logs where created_at >= ${START}`;
  const [{ n }] = await sql`select count(*)::int as n from orders`;
  if (n === 0) await sql`select setval('order_number_seq', 1, false)`;
  await sql.end();
});

const emailsFor = async (to: string) => (await sql`select template from email_logs where recipient = ${to} order by sent_at`).map((r) => r.template as string);

test("cancel, refund, reject, correct, email log and the daily email limit", async ({ page, context }) => {
  test.setTimeout(300_000);
  const x = await placeOrder(page, { name: "FLOW X", email: email("x"), reference: "6660000000001", receipt: { amount: "450.00" } });
  const y = await placeOrder(page, { name: "FLOW Y", email: email("y"), reference: "6660000000002", receipt: { amount: "450.00" } });
  const w = await placeOrder(page, { name: "FLOW W", email: email("w"), reference: "6660000000003", receipt: { amount: "450.00" } });
  const [{ order_id: orderIdX }] = await sql`select order_id from orders where id = ${x}`;
  await signInAdmin(context);

  // 1. Confirm X, then cancel it. Canceling needs a reason.
  await page.goto(`/admin/orders/${x}`);
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Payment confirmed" })).toBeVisible();
  await page.goto(`/admin/orders/${x}`);
  await page.getByRole("button", { name: "Move to Canceled" }).click();
  await expect(page.getByText("Add the reason for canceling")).toBeVisible();
  await page.getByLabel(/Note for the buyer/).fill("Out of stock");
  await page.getByRole("button", { name: "Move to Canceled" }).click();
  await expect(page.getByText("Status updated.")).toBeVisible();
  await expect.poll(async () => emailsFor(email("x")), { timeout: 20_000 }).toContain("6-canceled");

  // 2. Refund in process, then refund successful, each with its email.
  await page.getByLabel(/Note for the buyer/).fill("Sent via bank transfer, ref 123");
  await page.getByRole("button", { name: "Move to Refund in Process" }).click();
  await expect(page.getByText("Status updated.")).toBeVisible();
  await page.getByRole("button", { name: "Move to Refund Successful" }).click();
  await expect(page.getByText("Status updated.")).toBeVisible();
  await expect.poll(async () => emailsFor(email("x")), { timeout: 20_000 }).toEqual(expect.arrayContaining(["2-payment-confirmation", "6-canceled", "7-refund-in-process", "8-refund-successful"]));
  await expect(page.getByText("No further steps for this order.")).toBeVisible();

  // 3. A mistake: Refund Successful was clicked too early. Correct it back; it needs a reason and sends no email.
  const before = (await emailsFor(email("x"))).length;
  await page.getByText("Set a wrong status right").click();
  await page.getByLabel("Correct status").selectOption("refund_in_process");
  await page.getByLabel("What went wrong").fill("Clicked too early, the transfer is still pending");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.getByText("Status corrected and recorded. The buyer was not emailed.")).toBeVisible();
  const [row] = await sql`select status from orders where id = ${x}`;
  expect(row.status).toBe("refund_in_process");
  const [ev] = await sql`select note from status_events where order_uuid = ${x} order by created_at desc limit 1`;
  expect(ev.note).toBe("Correction: Clicked too early, the transfer is still pending");
  const [audit] = await sql`select count(*)::int as n from audit_logs where action = 'status.correction' and order_uuid = ${x}`;
  expect(audit.n).toBe(1);
  await page.waitForTimeout(1500);
  expect((await emailsFor(email("x"))).length).toBe(before); // no email for a correction
  // The history shows both the step and the correction.
  await expect(page.getByText("Correction: Clicked too early")).toBeVisible();

  // The buyer's tracking page no longer lists the step that was corrected away.
  await context.clearCookies();
  await page.goto("/track");
  await page.getByLabel("Order ID").fill(orderIdX);
  await page.getByLabel("Last 4 digits of your contact number").fill(PHONE.slice(-4));
  await page.getByRole("button", { name: "Track my order" }).click();
  await expect(page.getByText("Your refund is being processed.")).toBeVisible();
  const timeline = await page.locator("ol li").allInnerTexts();
  expect(timeline.join("|")).toContain("Canceled");
  expect(timeline.join("|")).toContain("Refund in Process");
  expect(timeline.join("|")).not.toContain("Refund Successful");

  await signInAdmin(context);

  // 4. Reject Y with the deadline set: Email 9 goes out.
  await page.goto(`/admin/orders/${y}`);
  await page.getByLabel("Reason for rejecting").selectOption("Incorrect amount");
  await page.getByRole("button", { name: "Reject payment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Payment rejected" })).toBeVisible();
  await expect.poll(async () => emailsFor(email("y")), { timeout: 20_000 }).toContain("9-payment-rejected");

  // 5. Email log screen lists them; the problems filter keeps only the ones not delivered (email is off in this run).
  await page.goto("/admin/emails");
  await expect(page.getByRole("heading", { name: "Email log" })).toBeVisible();
  await expect(page.getByText("6 Canceled").first()).toBeVisible();
  await expect(page.getByText("9 Payment rejected").first()).toBeVisible();
  await expect(page.getByText("Not sent: email is not set up on this server").first()).toBeVisible();
  await page.goto("/admin/emails?show=problems");
  await expect(page.getByText("Not sent: email is not set up on this server").first()).toBeVisible();

  // 6. Daily email limit (set to 5 for this run): with 5 emails already sent in 24 hours, a status change that needs an
  //    email is refused and nothing changes. Freeing the room lets it through.
  const fake = Array.from({ length: 5 }, () => ({ recipient: email("limit"), template: "1-order-received", result: "sent" }));
  await sql`insert into email_logs ${sql(fake, "recipient", "template", "result")}`;
  await page.goto(`/admin/orders/${w}`);
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByText("The email limit is nearly used up (5 of 5 sent in the last 24 hours, 0 left)")).toBeVisible();
  const [still] = await sql`select status from orders where id = ${w}`;
  expect(still.status).toBe("pending_payment");
  await sql`delete from email_logs where recipient = ${email("limit")}`;
  await page.goto(`/admin/orders/${w}`);
  await page.getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Payment confirmed" })).toBeVisible();
  const [now] = await sql`select status from orders where id = ${w}`;
  expect(now.status).toBe("payment_confirmation");
});
