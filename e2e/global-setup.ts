import { E2E_PORT } from "../playwright.config";

// The dev server compiles a page the first time it is asked for it, and may reload the browser once
// when that finishes. Asking for every page up front, once, keeps that out of the tests.
export default async function globalSetup() {
  const base = `http://localhost:${E2E_PORT}`;
  for (const path of ["/", "/products/tshirt-design-a", "/cart", "/checkout", "/track", "/privacy", "/admin/signin", "/admin"]) {
    await fetch(`${base}${path}`, { redirect: "manual" }).catch(() => undefined);
  }
  await new Promise((r) => setTimeout(r, 1500));
}
