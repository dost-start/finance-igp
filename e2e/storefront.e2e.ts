import { expect, test } from "@playwright/test";

// Regression: ISSUE-001 (QA, Sprint 1). The product-page proxy also caught /products/<name>.svg,
// so every product image answered 404 in production.
test("product images load and unknown product pages are still a real 404", async ({ page, request }) => {
  await page.goto("/shop");
  const srcs = await page.locator('a[href^="/products/"] img').evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).currentSrc));
  expect(srcs.length).toBeGreaterThan(5);
  for (const src of srcs.slice(0, 4)) {
    const res = await request.get(src);
    expect(res.status(), src).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
  }
  await expect(page.locator('a[href^="/products/"] img').first()).toHaveJSProperty("complete", true);

  const unknown = await request.get("/products/no-such-product");
  expect(unknown.status()).toBe(404);
});
