# Finance demo script (Sprint 3)

About 20 minutes. Production site: https://start-shop-six.vercel.app. Use a real phone for step 2 and a laptop signed in as a finance member for step 3.

## Before the demo (Technology, 10 minutes)

1. Store is open: `/admin` shows "The store is open".
2. Launch date: leave the real date (Nov 13, 2026) unless finance gave another one. Step 1 changes it for the demo and puts it back.
3. Load the demo orders (14 orders, every status, every receipt-reading result, one reused reference number):
   ```bash
   npm run demo:seed
   ```
   Demo buyers are named "DEMO …" and use a `+demo` address of the Technology lead's Gmail. No emails are sent.
4. Check `/admin/system`: database OK, a recent backup, no errors.
5. After the demo, remove everything the demo created:
   ```bash
   npm run demo:cleanup -- --yes
   ```
   Without `--yes` it only lists what it would remove.

## Step 1. Landing page and launch day

1. Open `/` on the laptop. A countdown to Nov 13 shows, with "A sneak peek" tiles marked "Coming soon" and no prices.
2. Signed in as finance, open `/admin` and use the **Launch date** card: set a time a few minutes ago and save. Reload `/`: the countdown is gone, "Shop now" and the priced lineup show.
3. Set it back to the real date. The audit log shows both changes with who made them.

## Step 2. A full order on a phone

1. Phone: open the site, tap **Shop**, pick a T-shirt, choose a size, **Add to cart**.
2. **Checkout**: fill in the form with any test details (use your own email), tick the consent box, **Continue to payment**. The page never shows an Order ID.
3. **Pay**: pick GCash, scan or save the QR, type a reference number, add a receipt screenshot, submit. The page shows the exact confirmation message. Email 1 arrives.
4. The receipt reading appears for finance in step 3 (match, mismatch or unreadable). It never confirms a payment by itself.

## Step 3. Finance review session

1. Open `/admin`. Orders waiting for payment come first. Point out the highlights: "Check first" for a wrong amount, an unreadable receipt, and the two orders sharing one reference (Eli Cruz and Fe Lim).
2. Open Ana Reyes (receipt matches). Compare the receipt image with the total and the typed reference. **Confirm payment**. Email 2 carries the Order ID and tracking link.
3. Open Carla Dizon (receipt shows 1,000 for a 1,200 order). **Reject** with the reason "Incorrect amount". Email 9 explains and gives the deadline.
4. Back on the list, tick Gio Tan and Hana Ong and use the bulk bar to move them forward. Orders that cannot make that move are skipped and listed.
5. Open Kai Sy (canceled) and Lia Co (refund in process) to show the refund steps and the emails behind them.
6. **Export** the filtered list to CSV, then open the **Audit log** to show every action above with the person who did it, and **Emails** to show what was sent.
7. Ask a finance member to update one status alone, with the stopwatch running. Target: under 2 minutes, no help.

## Step 4. Tracking and the lockout

1. Open `/track`. Use a confirmed order's Order ID (from `/admin`) with the right last 4 digits of the phone number (demo orders: `4567`). The status and dates show.
2. Enter the wrong 4 digits repeatedly. After a few tries the page says to wait and try later, and the right digits stop working for a while too. A wrong Order ID and a not-yet-confirmed order give the same message, so nobody can guess which orders exist.

## Optional extras

- `/admin/help` is the in-app guide for finance (same text as `docs/finance-guide.md`).
- `/admin/system` shows health, last nightly backup and recent errors. **Back up now** makes a copy right away.
- `/admin/changelog` lists every version and what changed.
- Technology only: **Products → Add a product** creates a product and sets photos by file name.

## What this demo does not cover

Real catalog, photos and receipts (pending from finance), the puzzle (own PRD), and the Axiom stress test on Nov 7.
