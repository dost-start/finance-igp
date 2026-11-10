# START: COLLECTIONS

The official merchandise shop of START-DOST: *Wear what you stand for.*

Buyers browse the lineup, check out, pay by GCash (scan the QR, enter the reference number, upload a receipt screenshot) and track their order. Finance staff work in an admin back office that verifies receipts, moves orders through their statuses, handles refunds and cancellations, and keeps an audit and email log. Receipt reading (OCR) flags duplicate, mismatched or unreadable receipts but never confirms a payment by itself.

Live site: <https://start-shop-six.vercel.app>

## Stack

| Area | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Database | Postgres on Supabase, Drizzle ORM and migrations |
| Admin sign-in | Auth.js with Google |
| Receipts | Google Drive (private folder), Tesseract.js for receipt reading |
| Email | Gmail over SMTP (Nodemailer) |
| Hosting | Vercel |
| Tests | Vitest (unit), Playwright with axe-core (end-to-end and accessibility) |

## Getting started

Requires Node.js 20.12 or newer (22 LTS recommended).

```bash
npm install
cp .env.example .env.local   # fill in the values; never commit real ones
npm run db:migrate           # create the tables
npm run db:seed              # products, settings and admin accounts
npm run dev                  # http://localhost:3000
```

`.env.example` explains every variable. The Drive folder for receipts can be created with `node scripts/create-drive-folder.mjs`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop, build and serve the app |
| `npm run lint` / `typecheck` / `test` | ESLint, TypeScript and Vitest unit tests |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run db:generate` / `db:migrate` | Create and apply Drizzle migrations |
| `npm run db:seed` / `db:check` | Seed the database and check its contents |
| `npm run changelog` | Regenerate `CHANGELOG.md` from `src/lib/changelog.ts` |
| `npm run guide` | Regenerate `docs/finance-guide.md` from `src/lib/guide.ts` |
| `npm run demo:seed` / `demo:cleanup` | Add or remove the demo orders used in the walkthrough |
| `npm run verify-backup` | Check that a database backup restores |
| `npm run loadtest` / `loadtest:orders` | Load tests for pages and order placement |

## Project layout

```
src/
  app/(store)/     storefront: landing, shop, product, cart, checkout, pay, order tracking
  app/admin/       finance back office: orders, products, audit, emails, system, help, release notes
  app/api/         route handlers: auth, health, receipts, product photos, QR, cron
  components/      shared UI
  db/              Drizzle schema, client, seed data
  lib/             business logic: orders, payments, OCR, email, backups, changelog
drizzle/           SQL migrations
e2e/               Playwright tests
scripts/           one-off and maintenance scripts
public/            brand assets and product photos
docs/              guides, runbooks, QA reports and sprint plans
```

## Documentation

See [`docs/`](docs/README.md) for the finance guide, demo script, email templates, backup and restore runbook, load test results, release process, QA reports and sprint plans. [`CHANGELOG.md`](CHANGELOG.md) lists what changed in each version, and [`PRODUCT.md`](PRODUCT.md) describes the product and its users.
