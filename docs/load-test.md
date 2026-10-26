# Load test (NF03)

Target: 500 concurrent visitors with no errors. Tools: `npm run loadtest -- http://localhost:3000 500 30` (autocannon, reads, against `npm run build && npm start`) and `npm run loadtest:orders` (writes).

## Results, 2026-10-27

**Reads, local production build, 500 connections, 8 public pages mixed:** 6,701 requests/s, p99 117 ms, 201,021 requests, 0 failed.

**Orders, 200 checkouts at the same moment** through the app's own database client against the real Supabase database: 0 failed, 200 distinct order numbers, 8.8 orders/s from a laptop. The script refuses to run if orders already exist, deletes what it made and resets the counter.

`/api/store` and `/api/health` measured only 19 and 29 requests/s from the laptop. That is the 40 ms round trip from Manila to the Singapore database repeated per request, not a limit of the deployed site (the deployed `/api/store` is served from the CDN cache for 10 seconds).

## Production

A 500-connection read test against `https://start-shop-six.vercel.app` from one laptop was stopped by Vercel's automatic flood protection (HTTP 403, `x-vercel-mitigated: challenge`). That is the protection working as intended: one address sending hundreds of requests per second looks like an attack. Real launch traffic comes from many addresses and is not affected.

**For the Axiom stress test (Nov 7):** tell Axiom the traffic should come from several addresses, or ask Technology to switch the Vercel Firewall to log-only for the test window and back afterwards.

## Limits worth knowing

- Database connections: the app keeps at most 3 per server instance and 3 queries in flight (`src/db/limit.ts`), because the Supabase pooler stalls when more run at once.
- Checkout: 30 orders per visitor per 15 minutes. Receipt upload: 60 per visitor per 15 minutes. Tracking: 8 tries per order and 20 per visitor per 15 minutes.
- Gmail: 500 emails a day (see `EMAIL_DAILY_LIMIT`). Each order sends a few emails, so a few hundred orders a day is the ceiling on a plain Gmail account.
- OCR runs in the buyer's browser, so it adds no server load.
