import { expect, test } from "@playwright/test";
import { RELEASES } from "../src/lib/changelog";
import { signInAdmin } from "./helpers";

// Version numbers and release notes: visible to signed-in admins, closed to everyone else.
test("release notes show the running version and every release; signed-out visitors are sent to sign in", async ({ page, context, request }) => {
  const current = RELEASES[0];

  const health = await (await request.get("/api/health")).json();
  expect(health.version).toBe(current.version);

  await page.goto("/admin/changelog");
  await expect(page).toHaveURL(/\/admin\/signin/);

  await signInAdmin(context);
  await page.goto("/admin");
  await expect(page.getByRole("link", { name: `Release notes v${current.version}` })).toBeVisible();
  await page.getByRole("link", { name: /Release notes/ }).click();
  await expect(page.getByRole("heading", { name: "Release notes", exact: true })).toBeVisible();
  await expect(page.getByText(`version ${current.version}`)).toBeVisible();
  await expect(page.getByText("Running now")).toHaveCount(1);
  for (const r of RELEASES) await expect(page.getByRole("heading", { name: new RegExp(`^${r.version.replace(/\./g, "\\.")}: `) })).toBeVisible();
});
