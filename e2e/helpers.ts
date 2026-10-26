import type { BrowserContext, Page } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { E2E_AUTH_SECRET, E2E_PORT } from "../playwright.config";

export const ADMIN_EMAIL = "ethandreizbaltazar0@gmail.com"; // seeded in admin_accounts
export const PHONE = "09171234567";

// Signs finance in without Google, using a session signed with the test-only secret.
export async function signInAdmin(context: BrowserContext, email: string = ADMIN_EMAIL) {
  const session = await encode({ token: { email, name: "E2E Admin", sub: "e2e" }, secret: E2E_AUTH_SECRET, salt: "authjs.session-token", maxAge: 1800 });
  await context.addCookies([{ name: "authjs.session-token", value: session, url: `http://localhost:${E2E_PORT}` }]);
}

// Draws a receipt like an e-wallet screenshot. amount null leaves the amount line out; blank draws nothing.
export async function drawReceipt(page: Page, opts: { amount: string | null; reference: string; blank?: boolean }): Promise<Buffer> {
  const dataUrl = await page.evaluate(({ amount, reference, blank }) => {
    const c = document.createElement("canvas");
    c.width = 1080;
    c.height = 1500;
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    if (!blank) {
      g.fillStyle = "#0a5cff";
      g.fillRect(0, 0, c.width, 220);
      g.fillStyle = "#fff";
      g.font = "bold 56px Arial";
      g.fillText("GCash  Express Send", 60, 130);
      const rows: [string, string][] = [];
      if (amount) rows.push(["Amount", `PHP ${amount}`]);
      rows.push(["Sent to", "START DOST FINANCE"], ["Date", "Oct 27, 2026 10:15 AM"], ["Reference No.", reference], ["Status", "Successful"]);
      rows.forEach(([k, v], i) => {
        const y = 340 + i * 150;
        g.fillStyle = "#6b7280";
        g.font = "36px Arial";
        g.fillText(k, 60, y);
        g.fillStyle = "#1a1a1a";
        g.font = "bold 44px Arial";
        g.fillText(v, 60, y + 60);
      });
    }
    return c.toDataURL("image/png");
  }, opts);
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

// Shop to submitted payment for one T-shirt (total 450 pesos). Returns the internal order id.
export async function placeOrder(page: Page, o: { name: string; email: string; reference: string; receipt: { amount: string | null; reference?: string; blank?: boolean } }): Promise<string> {
  await page.goto("/products/tshirt-design-a");
  await page.locator("label", { hasText: /^M$/ }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByText("Added to your cart.").waitFor();
  await page.goto("/cart");
  await page.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Full name").fill(o.name);
  await page.getByLabel("University", { exact: true }).fill("Test University");
  await page.getByLabel("University address").fill("1 Test Street, Quezon City");
  await page.getByLabel("Region of your university").selectOption("13");
  await page.getByLabel("Home address (Google Maps link)").fill("https://maps.app.goo.gl/e2etest");
  await page.getByLabel("Landmark near your home").fill("Beside the test store");
  await page.getByLabel("Contact number").fill(PHONE);
  await page.getByLabel("Email address", { exact: true }).fill(o.email);
  await page.getByLabel("Confirm email address").fill(o.email);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.waitForURL(/\/pay\/[0-9a-f-]{36}$/);
  const orderUuid = page.url().split("/").pop() as string;

  const image = await drawReceipt(page, { amount: o.receipt.amount, reference: o.receipt.reference ?? o.reference, blank: o.receipt.blank });
  await page.getByLabel("Reference number").fill(o.reference);
  await page.getByLabel("Receipt image").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: image });
  await page.getByRole("button", { name: /Submit payment details|Checking receipt|Uploading/ }).click();
  await page.getByText("Payment details received").waitFor({ timeout: 45_000 });
  return orderUuid;
}
