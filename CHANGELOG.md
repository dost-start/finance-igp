# Changelog

What changed in each version of the START: COLLECTIONS shop, newest first. Versions follow major.minor.patch: a new sprint raises the middle number, a fix or polish raises the last. This file is generated from `src/lib/changelog.ts` (run `npm run changelog`); edit that file, not this one.

## 1.0.0: The redesigned shop, payment and admin area (2026-11-11)

### Added

- Checkout now takes you one step at a time: about you, delivery, then email. Each step checks what you typed before the next opens, and a message goes away as soon as you fix that field.
- The university or college field asks for the full name, and offers "Do you mean ...?" when someone types an abbreviation such as UP, DLSU or HAU (about 1,900 abbreviations known).
- The two email boxes on checkout tell the buyer straight away whether they match, and the home address label links to Google's guide on copying a Google Maps link.
- The payment page has two steps: scan and pay (with a Copy amount button), then send the receipt by choosing or dropping a photo. After sending, a new screen explains what happens next.
- The Payment Confirmed email now shows the buyer's tracking code (the last 4 digits of their contact number) so they can keep it with their Order ID.
- Technology can upload product photos in the admin (up to 6 per product, reorder, first is the main photo) instead of asking a developer to add files. Photos are kept in the private Drive folder.
- Products in the admin are grouped by the shop's categories (Apparel, Lanyards, Bags, Pins, Stickers) with a filter, and the add/edit product form is easier to fill in, with tappable kinds and sizes.

### Changed

- The admin area has a sidebar instead of a top menu (a drawer on phones), a clearer Orders screen with a big waiting-for-verification panel, and card layouts on order detail, Help and Release notes.
- The audit log and email log are grouped by day (Today, Yesterday, then dates), and dates across the admin are shorter, like Nov 3, 2026, 10:27 AM.
- Checkout and payment keep the plain top header while scrolling, pages ease in, and the cart summary and order summaries are light cards in light mode. The footer no longer repeats the cart link.

### Security

- Product photos are shown through a signed address, so only photos uploaded in the admin can ever be opened that way, never a receipt.

## 0.3.0: Sprint 3: demo-ready for finance (2026-10-27)

### Added

- A landing page at the main address with a countdown to launch, a sneak peek of the products, the full lineup once the store opens, and a space reserved for the puzzle. The shop moved to /shop. Finance or tech can change the launch date from the admin home page.
- A nightly backup of all orders and shop data to the private Drive folder, with a System page in the admin area showing health, the last backup, recent emails and any server errors, and a Back up now button.
- A built-in guide for finance (Help in the admin area, also saved as docs/finance-guide.md) covering confirm, reject, bulk updates, cancel and refund, corrections, export, the audit log and the store lock.
- Technology can add new products and set product photos by file name from the Products screen, with no code change.
- A demo kit: 14 sample orders covering every status and receipt result, loaded and removed with one command, plus a step-by-step demo script.
- A load test: 200 orders placed at the same moment with no failures and 500 visitors browsing at once with no errors.

### Security

- Receipt uploads are limited per visitor, and server errors are logged with personal details removed.

## 0.2.2: Version numbers and release notes (2026-10-27)

### Added

- Every version now has a number and a dated list of what changed. Finance and tech can read it under Release notes in the admin area, and it is kept in CHANGELOG.md in the code.
- The health check shows which version is running.

## 0.2.1: Sprint 2 QA (2026-10-27)

### Added

- Automated checks for hostile carts, forged admin sessions, a blurry receipt and an accessibility scan of every page, plus a written QA report for Sprints 1 and 2.

### Changed

- The refund timeframe (5 to 7 business days) and the rejection deadline (48 hours) are finance's final settings, not placeholders.

### Fixed

- Receipt reading now finds the reference number when a date follows it (for example "Ref No. 0046567041072 Oct 27,2026 12:33 AM") and accepts the 6-digit MariBank and InstaPay references. Plain words, dates and transaction-history lists are still never taken as a reference.
- Accessibility: the Cart link and the + and − buttons are announced correctly by screen readers, the cart's picture link is no longer an unnamed link, and grey helper text is readable in dark mode.

### Removed

- The branded email layout was taken out again because it did not render correctly. Emails are back to clear text with clickable links.

## 0.2.0: Sprint 2: run a launch-day queue (2026-10-27)

### Added

- Receipt reading on the buyer's phone: the amount and reference are read in up to 15 seconds and never stop the buyer from submitting. Finance sees the reading next to what the buyer typed and the order total, with matches and mismatches marked. A reference number used on another order is flagged. Reading never confirms a payment.
- The order list can be filtered by status, payment, product, receipt reading and search. Orders that need a closer look come first. Many orders can be moved to the next status together, with an optional note that goes into the buyers' emails, and the list exports to CSV.
- Emails 3 to 8: In Production, Out for Shipping, Order Delivered, Canceled, Refund in Process and Refund Successful, each with an optional note from finance.
- Cancel and refund statuses, and a way to correct a wrong status with a reason (recorded, and the buyer is not emailed).
- Email log screen that also shows emails that did not go out, and a guard that stops before Gmail's daily sending limit.
- Audit log that every finance member can read, a product, price and size editor for the Technology team only, and a store lock switch that closes ordering and payments with a friendly message.
- A limit on how many orders one visitor can create in a short time, and a real "not found" page for payment links that are not orders.
- A branded email layout (it was live for a short time and was removed again in 0.2.1).

### Changed

- The buyer's tracking page now hides progress steps that finance corrected away.

### Fixed

- A database hang that could freeze admin pages when several things loaded at once: queries now wait their turn.

### Security

- Hostile carts, forged sessions and unsigned requests are refused on the server; every admin action checks the signed-in account first.

## 0.1.1: Sprint 1 polish (2026-10-26)

### Added

- Emails now also come with a second copy that has clickable links, besides the plain text.
- Placeholder pictures for the demo products.

### Changed

- The site now runs in Singapore, next to the database, so admin pages respond faster.

### Fixed

- Product pictures did not show on the shop pages; fixed.
- The Track order link wrapped onto two lines on phones, and the privacy page title repeated the shop's name.

## 0.1.0: Sprint 1: from browsing to a confirmed order (2026-10-26)

### Added

- The shop: product grid, product pages with sizes and quantity, a cart with a running total, usable down to a 360 px phone.
- Checkout with name, university, delivery details (a Google Maps link and a landmark), contact number and email typed twice. The Order ID (R, a region code and six digits) stays hidden until finance confirms the payment.
- Payment page: choose GCash, Landbank, GoTyme or MariBank, scan the QR, enter the reference number and upload the receipt, which is shrunk on the phone first.
- Finance sign-in with Google for approved accounts only, an order list, and a review screen with a zoomable receipt beside the total and the details the buyer typed. Confirm or Reject, then the next order.
- Emails 1 (order received), 2 (payment confirmed, with the Order ID and tracking link) and 9 (payment rejected, with the reason and the merch ticket form), sent from the finance Gmail as no-reply messages and all logged.
- Tracking page: the Order ID plus the last 4 digits of the phone number, or the link from the email.
- Privacy notice page.

### Security

- Receipts and payment QR codes are kept in a private Google Drive folder and only shown through signed-in or order-specific routes; the tracking page shows status only and locks after repeated wrong tries; security headers on every page.
