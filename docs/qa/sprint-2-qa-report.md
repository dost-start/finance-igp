# Sprint 1 + 2 full-system QA report

**Date:** 2026-10-27/28  |  **Target:** https://start-shop-six.vercel.app (production) plus the local Playwright suite (same code, same database, email switched off)  |  **Checked against:** `docs/sprints/sprint-1.md`, `docs/sprints/sprint-2.md`, PRD S2026-05012 (NF01 to NF10)

## Result

Everything in both demo scripts passes. No data leaks, no way found to get an order or payment through the store lock, to change a charge by editing the cart, or to read admin data without a valid admin account. One class of real defects was found and fixed: accessibility (names of three controls and faint grey text in dark mode). Open items are listed at the end; none blocks the Sprint 2 demo.

The branded email layout (2F) was cancelled at Ethan's request and reverted; emails are back to the clickable-link HTML copy. One sample of the branded Email 2 had already been sent to Ethan's Gmail before the cancellation.

## Demo script, step by step

### Sprint 1

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Add two items, check out with test details | PASS | Production run at 360 px (phone) and 1280 px (desktop), no sideways scrolling; Playwright `happy-path` |
| 2 | Pay: QR, receipt image, bank, reference number | PASS | Production: receipts stored in the private Drive folder; verdict recorded |
| 3 | Email 1 arrives with no Order ID | PASS | Production email log: Email 1 "sent" for both test orders; the pay page never shows an Order ID; unit test: Email 1 never contains one |
| 4 | Finance signs in and confirms | PASS | Real Google sign-in confirmed by Ethan (Oct 26); live confirm on production (Oct 26); Playwright confirm |
| 5 | Email 2, open the tracking link | PASS | Live (Oct 26: the emailed link opened the tracking page); Playwright tracking |
| 6 | Second order, reject, Email 9 | PASS | Live (Oct 26: Email 9 arrived with reason and deadline); Playwright reject |

### Sprint 2

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Several orders with different receipts (clear, blurry, wrong amount) | PASS | Production: clear receipt (format "Ref No. 0046567041072 Oct 27,2026 12:33 AM") read as **match** on a 360 px phone in 3.8 s; wrong amount flagged **mismatch**. Local: blurry receipt still submits and gets a verdict, blank image is **unreadable** and still submits |
| 2 | Dashboard highlights orders, filter by receipt reading | PASS | Playwright `dashboard`: not matching first, then unreadable, "Check first" in words, every filter |
| 3 | Confirm some, reject one, bulk move to In Production, check emails | PASS (see open item 1) | Playwright `dashboard`, `status-flow`: bulk skips orders that cannot make the move, note and email logged per order |
| 4 | Cancel a confirmed order and walk the refund statuses, check emails | PASS (see open item 1) | Playwright `status-flow`: reason required to cancel; Emails 6, 7, 8 logged; correction recorded with no email; buyer timeline hides corrected-away steps |
| 5 | Audit log and CSV export | PASS | Playwright `admin-extras`, `dashboard`: every action listed with actor; CSV filtered, links to orders, formula-safe, 401 when signed out, export itself audited |
| 6 | Lock the store, try to order, unlock | PASS | Playwright `admin-extras`: a filled-in checkout form open before the lock is refused on the server; pay page, receipt upload (423) and checkout page closed; banner; reopen restores everything |

## What was tested, by area

| Area | Result | Notes |
|---|---|---|
| Buyer path at 360 px and desktop | PASS | No overflow on shop, product, cart, checkout, pay, track, privacy, sign-in |
| Checkout validation | PASS | Empty form, `http://` map link, bad phone, mismatched emails, missing consent: all refused on the server, no order created |
| Tampered cart | PASS | 10 hostile carts refused (unknown product, bad size, hidden product, sold-out size, SQL in size, huge, negative and fractional quantity, empty, not a list), none creates an order; prices and totals sent by the visitor are ignored and the charge is rebuilt from the database |
| Receipts and OCR | PASS | Clear, blurry, wrong amount, blank; the verdict is computed on the server from the real total and the typed reference; OCR never confirms a payment; reused reference flagged on both orders |
| OCR accuracy (NF08, target 90%) | PASS on synthetic, **not yet on real receipts** | 22 of 24 clear synthetic receipts (4 bank styles) fully right (92%); all 24 amounts right; the 2 misses were long GoTyme references where the engine misread a character, and the app returns "unreadable" rather than guessing |
| Admin sign-in refusals | PASS | Cookie signed with the wrong secret (even with a real admin's email), a validly signed session for a non-admin, and a switched-off admin: every admin page goes to sign-in, no order data in the page, export and receipt routes answer 401 |
| Unauthenticated access (production) | PASS | `/admin/*` 307; export and admin receipts 401; QR route 404 without a real open order; `.env`, `.git`, source files 404; wrong HTTP methods 405 |
| Every admin action, route and page | PASS | Code check: all 7 server actions, both admin routes and all 6 admin pages start with a sign-in check; product editor and its action require the Technology role |
| Review, confirm, reject, bulk, corrections, cancel and refund | PASS | See demo steps |
| All 9 emails | PASS (content) | Unit tests: wording, subjects, Order ID only from Email 2 on, no-reply notice, links, finance's note, final refund timeframe and deadline settings; HTML copy keeps every line and escapes buyer text |
| Email log and daily limit | PASS | Failures and skipped emails visible; with the limit reached, an action that needs an email is refused before anything changes, and sending itself stops |
| Product editor (tech only) | PASS | Finance redirected with a plain message and never sees the link; bad price and duplicate sizes explained, typed values kept; saved edit shows in the shop at once; hidden product leaves the shop |
| Tracking and rate limits | PASS | Order ID plus last 4 digits; wrong digits, unconfirmed and unknown orders give the same message; locks after repeated failures; one visitor cannot create unlimited orders (see open item 6) |
| Security headers | PASS | HSTS, nosniff, frame deny, referrer policy, permissions policy, partial CSP on every route |
| Accessibility | PASS after fixes | axe-core (WCAG 2.1 A and AA) on 14 pages, light and dark mode: 0 findings. Found and fixed: header Cart link and quantity buttons whose spoken names did not match what is shown, decorative cart image link with no name, grey helper text too faint in dark mode (27 files) |
| Performance (NF02, target under 3 s) | PASS on 4G, marginal on 3G | Server answers in 0.14 to 0.5 s. Phone at 360 px on a slow 4G connection (1.6 Mbps, 150 ms): load 1.7 to 1.9 s, LCP 0.7 to 1.8 s. On fast-3G (0.75 Mbps, 300 ms): load 3.3 to 3.8 s, cart and checkout LCP about 3.3 to 3.5 s. Pages are about 700 KB uncompressed |
| Dependencies | PASS | `npm audit` for production dependencies: 0 vulnerabilities. 4 moderate findings remain in a build-time-only tool (drizzle-kit) that is not shipped |

## Bugs found and fixed in this pass

1. Header Cart link's spoken name did not match its visible text (every page). Fixed: the name now comes from the visible text.
2. Quantity buttons (+ and −) on the product and cart pages had names that did not contain the visible symbol. Fixed: symbol hidden from assistive technology, label kept.
3. The cart's product image link had no name. Fixed: hidden from assistive technology (the product name link beside it remains).
4. Muted grey text failed colour contrast in dark mode (hints, prices, dates). Fixed: lighter grey in dark mode across 27 files.

Earlier in the same QA effort (reported separately): product images 404 caused by the product-page proxy (fixed, Sprint 1 QA), a database hang under concurrent queries (fixed with a query limiter), the OCR reference parser misreading words and dates (fixed).

## Left open

1. **Emails 3 to 8 have not been delivered through real Gmail yet.** Their content, links and logging are tested, and Emails 1, 2 and 9 were delivered for real, but the browser tests run with email switched off. Suggested: a short live click-through to Ethan's Gmail before launch (the other session said none is needed for now).
2. **NF08 on real receipts.** 92% is on synthetic receipts, which are cleaner than real ones. Real screenshots from GCash, Landbank, GoTyme and MariBank are still needed to confirm the 90% target.
3. **NF03 load test (500 concurrent) and NF07 daily backups** are Sprint 3 items and were not done.
4. **Page weight and 3G.** About 700 KB uncompressed per page; on a 0.75 Mbps, 300 ms connection cart and checkout take about 3.3 to 3.5 s to finish painting. Worth a look in Sprint 3 (image sizes, JavaScript split).
5. **Forged session cookie.** With a cookie that is not a valid session, `/admin` answers HTTP 200 and the page then redirects to sign-in. No admin data is in the response (checked). A hard 307 would need the proxy to verify the cookie; low priority.
6. **Checkout order limit numbers are my technical defaults**, not finance values: 30 orders per 15 minutes per visitor. Changeable with `CHECKOUT_RATE_MAX` and `CHECKOUT_RATE_WINDOW_MINUTES`.
7. **Gmail daily limit default is 500** (Google's cap for an ordinary @gmail.com account). Set `EMAIL_DAILY_LIMIT` if the finance account is Google Workspace.
8. **Real Google sign-in of an account that is not on the allowlist** was not tried with a real Google account. The refusal paths (valid session for a non-admin, switched-off admin, forged cookie) and the "no admin access" message are tested.
9. **Email 1 still says "within 24-48 hours"** (original PRD wording, finance question Q2). The privacy notice is still marked DRAFT for finance (retention period, contact route).
10. **Store-lock banner can lag up to about 40 seconds** behind a change (CDN cache); the order and payment steps themselves check the real value every time.
11. **CSV export is capped at 5,000 rows** and the product editor edits existing products only (no "add product", photos arrive later).

## Database

Clean after every run: 0 orders, 0 emails, 0 audit rows, 0 rate-limit counters, no store-lock row, order counter reset to 1. The 4 real admin accounts and 17 products were not touched. The two production test orders created for this QA (and their two Drive receipts) were deleted; the Drive folder holds only the 4 QR images.
