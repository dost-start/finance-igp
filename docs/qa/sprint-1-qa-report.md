# Sprint 1 QA report

**Date:** 2026-10-26  |  **Target:** https://start-shop-six.vercel.app (live) and this repo  |  **Scope:** `docs/sprints/sprint-1.md`

## Summary

One high-severity bug found and fixed (every product image was missing in production). Two low issues fixed, three findings recorded for later sprints. The money path (order, pay, confirm, reject, track) already passed a live check with real emails on the same day. QA created no orders; the database holds 0 orders.

| Result | Count |
|---|---|
| Fixed and deployed | 3 |
| Recorded for Sprint 2 or 3 | 3 |

## Fixed

| ID | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| 001 | High | All product images returned a 404 page. The proxy that returns real 404s for unknown products (`/products/:slug`) also matched `/products/tshirt-design-a.svg`, failed the slug shape check, and rewrote it to 404. Shop and product pages showed blank squares. Broken since commit `5741ab4`. | `src/proxy.ts` lets file paths (anything ending in an extension) through. | Playwright `e2e/storefront.e2e.ts` fails without the fix (404) and passes with it. Live: images return 200 `image/svg+xml`, shop shows the placeholders. |
| 002 | Low | "Track order" link wrapped onto two lines at 360 px (added with the tracking pages). | `src/app/layout.tsx`: no-wrap link, smaller logo text on phones. | Measured at 360 px: link is one line. |
| 003 | Low | Privacy page tab title doubled the brand ("Privacy Notice \| START: COLLECTIONS \| START: COLLECTIONS"). | `src/app/privacy/page.tsx`: title is "Privacy Notice", the layout adds the brand. | Live: `<title>Privacy Notice \| START: COLLECTIONS</title>`. |

## Recorded, not fixed

| ID | Severity | Finding | Suggested handling |
|---|---|---|---|
| 004 | Medium | Nothing limits how fast one visitor can create orders at checkout (only a honeypot field). A bot could burn Order ID numbers (6 digits, 999,999 max) and fill the free database. The existing `rate_limits` table could carry it. | Sprint 3 hardening: limit checkout and receipt uploads per visitor. Needs a decision on the number, because university networks share addresses. |
| 005 | Low | `/pay/<unknown or malformed id>` answers HTTP 200 with the "404" page and `noindex` (the same streaming effect fixed earlier for products). Buyers see the right page; only the status code is off. | Optional: hard 404 like `/products` if it ever matters. |
| 006 | Low | If two upload taps race, the second Drive file can be left behind (the database keeps one proof, the extra receipt file stays in the folder). The payment form already blocks double taps. | Add a delete-file step to the storage layer when convenient. |

Also noted, already known: admin pages show the shop header and cart link; the privacy notice is still marked DRAFT for Finance review (retention period and contact route), and the Google consent screen and the checkout consent box both link to it.

## What passed

- **Routes:** home, cart, checkout, privacy, product pages, track and sign-in return 200; unknown or malformed product and tracking URLs return a real 404; `/admin` and admin order URLs redirect to sign-in; admin receipt route returns 401 signed out; QR route returns 404 without a real open order; `/api/receipt` rejects wrong method (405), bad body (400) and non-image files (415).
- **Security headers:** nosniff, frame deny, referrer policy, permissions policy, HSTS, partial CSP. Framing the site is blocked.
- **Phone width (360 px):** no horizontal overflow on home, product, cart, checkout, track, privacy, sign-in. Size picker sits above Add to cart. "Choose a size first." appears when no size is picked. Cart keeps two sizes with the right total (₱1,350) and survives navigation. Mobile cart bar shows total.
- **Checkout validation (server side):** empty form lists every field; an `http://` map link, a bad phone number, mismatched emails and a missing consent box are each refused. No order was created.
- **Receipts and QR:** receipt files and QR images are served only through gated routes; no Drive link or permission is ever created.
- **Order ID privacy:** the pay page never shows the Order ID; Email 1 has none (unit test); Email 2 and the tracking page show it after confirmation.
- **Checks:** typecheck, lint, 65 unit tests, build, and two Playwright tests all pass. `npm audit --omit=dev`: 0 vulnerabilities.

## Not covered

- Real Google sign-in is not automated (confirmed manually earlier today).
- No browser testing on real low-end Android or iPhone in-app browsers (planned for Sprint 3).
- No load test (Sprint 3).
