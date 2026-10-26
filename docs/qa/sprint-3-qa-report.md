# Sprint 3 QA report

**Date:** 2026-10-27  |  **Version:** 0.3.0  |  **Checked against:** `docs/sprints/sprint-3.md`, PRD S2026-05012 (NF03, NF07), Sprint 1 and 2 reports

## Result

Demo-ready for finance. Every item in the Sprint 3 demo script runs; the full local suite (unit, build, Playwright end to end with accessibility scans) passes against the real database and cleans up after itself. Open items are at the end.

## Checks

| Area | Result | Evidence |
|---|---|---|
| Landing page, countdown, launch date setting | PASS | `landing.e2e`: countdown before launch, shop and lineup after, admin changes the date, audit row written |
| Shop moved to /shop, links and tests updated | PASS | storefront, happy-path, dashboard e2e on `/shop` |
| Nightly backup | PASS | Production backup file downloaded from Drive and compared with the database: every table matches (`npm run verify-backup`); cron route refuses missing or wrong secret (`reliability.e2e`) |
| System page, error log, upload limit | PASS | `reliability.e2e` (3 tests); unit tests for error cleaning and rate caps |
| Load test (NF03) | PASS locally, production blocked by platform protection | 500 connections: 201,021 requests, 0 failed, p99 117 ms; 200 simultaneous orders, 0 failed, 200 distinct numbers. See `docs/load-test.md` |
| Finance guide and demo data | PASS | `guide.test`, `demo-data.test`, `demo.e2e` (seed, review, cleanup) |
| Product add and photos (tech only) | PASS | `catalog.e2e`: finance refused, bad photo name and duplicate address explained, created product appears in the shop with its photos, photo edit saved |
| Accessibility | PASS | axe-core WCAG 2.1 A/AA, light and dark, now including landing, system, help and add-product pages |
| Unit tests, typecheck, lint, build | PASS | 213 unit tests |

## Bug found and fixed in this pass

The browser kept a copy of the store status (closed or open, launch date) and showed it for one more page view after finance changed it, so the landing page and the closed banner could lag a visit behind. Fixed: the page now asks the server to confirm each time (the CDN copy still lasts up to 10 seconds). Caught by the landing and store-lock end-to-end tests.

## Production check

Version 0.3.0 deployed; `/api/health` reports 0.3.0 with the database connected and 17 products; `/`, `/shop`, `/track`, `/privacy` answer 200; admin pages redirect to sign-in; the backup route answers 401 without the secret. Database after all runs: 0 orders, 0 audit rows, 0 emails, 0 rate-limit counters, 4 admins, 17 products, no error rows, one settings row (the real nightly backup record).

## Open items

1. **Real catalog, product photos, real receipts and logo** are still pending from finance. Photos are added to `public/products/` by the developer; the Products screen only points at them by file name.
2. **Production load test** from a single address is blocked by Vercel flood protection. Plan the Axiom test around it (`docs/load-test.md`).
3. **NF08 on real receipts** still unproven (92% on synthetic).
4. **Uptime monitor** (UptimeRobot on `/api/health`) is not set up; it needs an account the Technology lead owns.
5. **Defaults chosen by Technology, not finance:** checkout limit 30 per 15 minutes, upload limit 60 per 15 minutes, email cap 500 a day, launch time of day 00:00 Manila.
6. Email 1 still says "within 24-48 hours"; privacy notice is still marked DRAFT for finance.
7. OCR speed on low-end Android and in-app browsers still needs a real-device check.
