# Sprint 1 – "From browsing to a verified order"

**Dates:** Oct 24 – Oct 28  |  **Demo:** Oct 28, on a staging link (a private test website, not the real one)
**Who reviews:** Finance, Marketing, EL

## The goal in one line

One complete order can travel the whole path: a buyer orders and uploads a receipt, finance confirms it, the buyer gets the Order ID by email and can track the order. It will look plain, because design polish comes later. What matters is that the money path works.

## What you will see in the MVP

**As a buyer**
- A product grid with photo, name and price (placeholder items and images for now).
- A product page where you pick a size and quantity, then add to cart.
- A cart you can edit, with a running total.
- Checkout: name, university and university address, home address (Google Maps link plus landmark), contact number, email typed twice.
- A summary with the exact total, then the payment screen: your QR codes, the amount due, and the upload form (receipt image, bank, reference number).
- The message: "Your Order & Tracking ID will be sent once your payment has been finalized by the Finance Team."
- An email right after submitting (Email 1: order received, no Order ID yet).
- After finance confirms: Email 2 with the Order ID and a tracking link.
- A tracking page: type Order ID and the last 4 digits of your phone number, or open the emailed link, to see the status.

**As finance**
- Sign in with your Google account (only approved Gmail addresses get in).
- A list of submitted orders.
- An order screen showing the receipt next to the total and what the buyer typed, with a zoomable receipt.
- **Confirm payment** or **Reject payment** buttons, then on to the next order. Rejecting sends Email 9 with the merch ticket form link.
- Change one order's status at a time (In Production, Out for Shipping, Received Successfully). The tracking page updates right away.

## Try it yourself (demo script)

1. Open the staging link, add two items to the cart, and check out with test details.
2. Pay nothing: use the test QR, upload any receipt image, enter a bank and a made-up reference number.
3. Check your inbox for Email 1. Notice there is no Order ID.
4. Sign in to the finance dashboard, open the order, and confirm it.
5. Check your inbox for Email 2, and open the tracking link.
6. Place a second order and reject it. Check Email 9.

## Not in this MVP yet (coming in Sprint 2 or 3)

- Automatic receipt reading (OCR) and mismatch highlighting. In Sprint 1 the OCR column simply reads "not checked yet" and finance checks every receipt by eye.
- Filters, bulk status updates, the audit log, CSV export.
- Emails 3 to 8 (production, shipping, received, cancel, refund). Status changes work, but only Emails 1, 2 and 9 are sent.
- Cancel and refund statuses.
- Store lock switch, landing page and countdown, real product photos and prices.

## What we need from Finance

| Needed | By | Why |
|---|---|---|
| Gmail addresses of finance members who will test | Oct 26 | So you can sign in at the demo |
| Real QR codes and bank / e-wallet list (images or files) | Oct 26 | Loaded into the payment screen |
| Merch ticket form link | Oct 26 | Goes into Email 9 |
| Answers to the 7 comments on the email templates | Oct 27 | Real wording in Emails 1, 2, 9 instead of placeholders |
| Feedback after the demo | Oct 29 | Revisions go into Sprint 2 |

## Good to know

- Changes to wording and layout are welcome any time. New features go through the change-control process in the PRD (Appendix C).
- Emails sent during testing go only to test addresses.
