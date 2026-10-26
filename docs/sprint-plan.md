# START-DOST Merch System – 3-Sprint Plan (replaces PRD Appendix B sprint breakdown)

Source of truth for scope: PRD S2026-05012. This changes only the schedule, not scope (Appendix C: sprint dates are a plan, not a scope change). Share the updated schedule with finance.

**Rule:** every sprint ends with a working MVP on a staging link. The next sprint iterates on that MVP, it does not start new disconnected pieces.

**Start state (Oct 24):** repo is empty (initial commit only). Nothing from the old Sprints 1–3 was built. Deadline stays: 95% complete and deployable Nov 7 (Axiom stress test), launch Nov 13.

| Sprint | Dates | MVP at the end |
|---|---|---|
| 1 | Oct 24 – Oct 28 | Browse → submitted order → finance confirms → buyer emailed Order ID → buyer tracks |
| 2 | Oct 29 – Nov 2 | Full finance workflow and all emails |
| 3 | Nov 3 – Nov 6 (Nov 7 = deploy + Axiom test) | Launch-ready: landing, hardening, content |

---

## Sprint 1 – Thin end-to-end loop (no OCR)

Goal: the whole money path works once, ugly but real.

- Project setup, Vercel + Supabase + Google Drive (receipts) wired, staging link
- Catalog grid + product detail from product data (placeholder items) – FR01.01, 01.02, 01.05 (config/seed first)
- Cart with running total – FR01.03
- Checkout with all fields, email entered twice, itemized total – FR02.02, 02.03
- Order ID generation (hidden) – FR02.01
- QR payment step, receipt upload to a private Google Drive folder, bank + reference number – FR02.04, FR03.01, FR03.06
- Submit message – FR02.02
- Admin sign-in (Google, Gmail allowlist) – FR06.01
- Review screen: receipt beside typed details, zoom, confirm / reject, next order – FR06.03
- Email 1 (on submit), email 2 (confirm), email 9 (reject) over Gmail SMTP – FR08.01–08.03
- Tracking page: Order ID + last 4 digits, plus emailed token link – FR05.01
- Statuses: Payment Confirmation onward set one order at a time

**Demo:** place an order, upload a receipt, confirm it as finance, receive the Order ID email, open the tracking page.

## Sprint 2 – Finance workflow and emails

Goal: finance can run a launch-day queue; every email fires.

- OCR: Tesseract.js, then PaddleOCR, 15 s cap, never blocks submit – FR03.02.x, FR03.03
- OCR result stored; mismatch / unreadable highlighting; duplicate reference flag – FR03.05, FR06.02, FR06.03
- Order list filters: status, payment state, product, OCR result – FR06.02
- Bulk status update; all 6 + 3 statuses incl. refund path; correction path with StatusEvent – FR05.02, FR05.03, FR06.04
- All 9 email templates + EmailLog + daily limit guard – FR08.01, FR08.04
- Audit log viewable by finance – FR06.06
- Tracking: rate limit, status timeline – FR05.04, FR05.05
- CSV export – FR06.05
- Store lock / unlock switch – FR07.05
- Tech admin: product and price editing – FR01.05, US3.1

**Demo:** full buyer flow with OCR, finance reviews a queue, bulk updates statuses, buyers get every email.

## Sprint 3 – Launch readiness

Goal: deployable, hardened, real content in.

- Landing page: branding, merch teaser, countdown from one config date, launch-view switch, puzzle slot (FR07.01–07.04, 07.06)
- Real product data and photos import (arrive around Nov 7), real QR codes and bank list
- Responsive pass down to 360 px, load time check – NF01, NF02
- Security pass: private receipts, signed links, admin-only data, tracking shows status only – NF05, NF06
- Daily backup / scheduled CSV backup, Supabase keep-alive – NF07
- Load test toward 500 concurrent – NF03
- Low-end Android, iPhone, in-app browser OCR test; decide on Cloud Vision (FR03.02.04) only if crashes are widespread
- Production deploy, final emails wording, admin onboarding notes

**Nov 7:** Axiom stress test on the deployed site.

---

## If we slip: cut in this order

1. FR03.02.04 Cloud Vision (already Could)
2. FR05.04 status timeline (Could)
3. FR06.05 CSV export (Should) – fall back to Supabase table export
4. FR03.05 duplicate reference flag, FR05.05 rate limit (Should) – rate limit is cheap, cut last
5. US3.1 product admin UI – fall back to seeding products from a JSON/CSV file

Never cut: manual verification flow, Order ID email, tracking, receipt privacy, store lock.

## Open inputs from finance (blockers)

- Finance team Gmail addresses (dashboard login) – needed by Sprint 1 for real accounts, until then only the CTO account
- Merch ticket form URL – config value for emails 5–9
- Answers to the 7 email-template comments
- QR codes + bank / e-wallet list
- SMTP app password – env var only, never in the repo
- Product catalog and photos (around Nov 7)
