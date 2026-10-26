# Sprint 3 – "Ready for launch"

**Dates:** Nov 3 – Nov 6  |  **Final check:** Nov 7 (Axiom stress test on the live system)
**Who reviews:** Finance, Marketing, EL

## The goal in one line

The system is about 95% complete and deployable by Nov 7: the real website is live, holds up under thousands of visitors, and is loaded with real content.

## What you will see in the MVP

**Landing page**
- START merch branding, a teaser preview of the merch, and a countdown to the launch date.
- On launch day it switches to the launch view, shows the merch lineup, and links to the store. The date is one setting, so a date change needs no rebuild.
- A reserved section where the puzzle plugs in. The puzzle is optional and never blocks the store.
- Once the store is open, anyone can enter with no key and no ID.

**Real content**
- Real product photos, prices, sizes and variants.
- Final QR codes and bank list.
- Final email wording.

**Works on every device**
- Laptop and desktop first, then phones down to a 360 px wide screen.
- Catalog, checkout and tracking load in about 3 seconds on a typical phone connection.
- Receipt reading tested on a low-end Android phone, an iPhone, and in-app browsers (Messenger and similar).

**Security and reliability**
- Only signed-in admins can see buyer details and receipts. The tracking page shows status only.
- Bot and spam protection on checkout and tracking.
- Protection against floods of requests during the launch burst.
- Nightly backups of all orders during the launch period.
- Error monitoring and an uptime check, so we know about problems before buyers do.
- A load test at 500 concurrent visitors with no errors.

**Handover**
- A short guide for finance: confirm a payment, reject one, update statuses, export, read the audit log.
- Admin onboarding: finance can update an order status in under 2 minutes without developer help.

## Try it yourself (demo script)

1. Open the landing page. See the countdown, then switch the launch date to simulate launch day.
2. Run a full order on a phone, from landing page to tracking.
3. Run a finance review session with real products and real QR codes.
4. Try the tracking page with a wrong Order ID several times and see it lock.

## Not in this MVP (after launch)

- Anything not in the PRD. New ideas go to the post-launch backlog (for example a map pin for addresses).
- The puzzle itself, which has its own PRD. Only the landing-page section for it is built here.

## What we need from Finance

| Needed | By | Why |
|---|---|---|
| Product catalog: sizes, variants, prices, stop-sale conditions | Nov 4 | Loaded as real data |
| Product photos (consistently named files) | Nov 5 | Imported for launch |
| Final launch date confirmation | Nov 5 | Single setting on the landing page |
| Finance members available for onboarding | Nov 6 | Practice session on the live system |
| Sign-off on the final system | Nov 7 | Ready for Axiom stress test and launch |

## Good to know

- If we run short on time, we cut in this order: status timeline, CSV export, duplicate-reference flag. We never cut manual payment verification, the Order ID email, tracking, receipt privacy, or the store lock.
- Nov 11 to 12 is the puzzle preview and Nov 13 is launch. The store opens on launch day.
