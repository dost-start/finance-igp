# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two audiences share one app.
- Buyers: DOST technoscholars and their community across the Philippines, mostly on phones. They browse the lineup, check out, pay by GCash (scan or save a QR, enter a reference number, upload a receipt screenshot) and track the order.
- Finance staff (admin): verify receipts, move orders through statuses, refund or cancel, and review the audit log, email log and store settings. They work at a desk, in long sessions, and need to find orders that need a check first.

## Product Purpose
START: COLLECTIONS is the official merchandise shop of START-DOST. Each purchase supports START-DOST and connects the buyer with DOST technoscholars. The back office lets finance confirm payments reliably; receipt reading assists but never confirms a payment by itself.

## Positioning
A merch shop built for a manual GCash payment flow, with a finance back office that flags duplicate, mismatched or unreadable receipts. A generic store template cannot truthfully copy that.

## Operating Context
Launch day is a countdown on the landing page, then the store opens. Pages run on Next.js with a Postgres database. Finance works from `docs/finance-guide.md`; a demo kit and script exist in `docs/`.

## Capabilities and Constraints
- Routes: landing, shop, product pages, cart, checkout, pay, order tracking, privacy notice; admin (orders, products, audit, emails, system, help, changelog).
- Light and dark colour schemes follow the system setting.
- A reserved slot for a separate puzzle exists on the landing page and must stay empty when no address is set.
- Visual refinement must not change behavior, copy meaning, routes or data.

## Brand Commitments
- Name: START: COLLECTIONS; tagline in use: "Wear what you stand for."
- Existing product art is SVG in `public/products/`; there is no photography.

## Evidence on Hand
Product SVGs in `public/products/`. No testimonials, customer photos or press; none may be invented.

## Product Principles
- Money flows must be unambiguous: amounts, statuses and next steps readable at a glance.
- Phone first for buyers; dense but calm for finance.
- Never let design hide the "needs a check" signal from finance.

## Accessibility & Inclusion
Prior QA and accessibility work exists (see `docs/qa`). Keep WCAG AA contrast, visible keyboard focus, and screen-reader text for the countdown.

## Open Decisions
- Primary brand colour and typeface were not specified by the user; the app currently uses a sky-blue accent on zinc neutrals with Geist.
- Inferred from the repository, not confirmed by the user: users, positioning and constraints above beyond the "student merch shop + finance back office" answer.
