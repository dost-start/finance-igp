# Sprint 2 – "Run a launch-day queue"

**Dates:** Oct 29 – Nov 2  |  **Demo:** Nov 2, on the staging link
**Who reviews:** Finance, Marketing, EL

## The goal in one line

Take the Sprint 1 MVP and make it ready for real volume: receipts are pre-read automatically, finance can process many orders fast, and every email goes out.

## What you will see in the MVP

**Receipt reading (OCR)**
- When a buyer uploads a receipt, their phone reads the amount and reference number (up to 15 seconds). If it can't, the buyer can still submit.
- Finance sees the OCR reading next to what the buyer typed and the order total, with matches marked.
- Orders that don't match, or can't be read, are highlighted so you check them first.
- A reference number already used on another order is flagged.
- OCR never confirms a payment. Finance still confirms every one.

**Finance dashboard**
- Filters: status, payment state, product, and OCR result (matching, not matching, unreadable).
- Select many orders and update their status together. Each buyer gets the right email automatically.
- Full status flow, including cancel and refund: Canceled, Refund in Process, Refund Successful.
- Corrections to a wrong status are allowed and recorded.
- An audit log: who changed what, and when. Every finance member can view it.
- Export orders to CSV, with a link back to each order.
- Tech admin only: edit products, prices, sizes and active status without code changes.
- A switch to lock and unlock the store.

**Emails**
- All 9 templates working, sent from the finance Gmail as no-reply messages.
- A log of every email sent, including any that failed, and protection against the Gmail daily limit.
- Finance can add an optional note when changing a status, and it appears in the email.

**Buyer tracking**
- A status timeline showing the date each status was reached.
- Protection against someone guessing Order IDs: repeated wrong lookups are blocked.

## Try it yourself (demo script)

1. Place several orders with different receipt images: one clear, one blurry, one with a wrong amount.
2. Open the finance dashboard. See which orders are highlighted, and filter by OCR result.
3. Confirm a few orders, reject one, and bulk-move the confirmed ones to In Production. Check the emails.
4. Cancel a confirmed order and walk it through the refund statuses. Check the emails.
5. Open the audit log and the CSV export.
6. Lock the store, try to order, then unlock it.

## Not in this MVP yet (Sprint 3)

- Landing page with the launch countdown and the puzzle section.
- Real product photos, prices and final QR codes (they arrive around Nov 7).
- Final performance, security and phone testing.

## What we need from Finance

| Needed | By | Why |
|---|---|---|
| Final email wording (refund timeframe, rejection deadline rule) | Oct 30 | Fixed values loaded into Emails 7 and 9 |
| Finance members' Gmail accounts (all of them) | Oct 30 | Real accounts for the dashboard |
| A few real receipt screenshots from different banks and e-wallets | Oct 30 | To test the receipt reading on real examples |
| Feedback after the demo | Nov 3 | Revisions go into Sprint 3 |

## Good to know

- OCR accuracy target: at least 90% of clear receipts read correctly. We will report the actual result at the demo.
- If receipt reading turns out unreliable on some phones, the order still goes through and finance checks it by hand. A paid fallback (Google Cloud Vision) is only built if testing shows we need it.
