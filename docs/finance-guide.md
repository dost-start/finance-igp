# Finance guide

How to run the START: COLLECTIONS admin area. This file is generated from `src/lib/guide.ts` (run `npm run guide`); the same text is on the admin Help page. Edit that file, not this one.

## Update an order's status (the 2-minute job)

This is the thing you will do most. It takes four steps.

1. Open the admin area and tap the order's Order ID in the list. Use the search box if you have the buyer's name or email.
2. On the right, under Decision, tap the button for the next step, for example Move to In Production.
3. Optional: type a short note first. It is printed in the email the buyer receives.
4. That is it. The buyer is emailed and their tracking page updates straight away.

> Statuses only move forward. If you tapped the wrong one, see Fix a mistake below.

## Signing in

Use the Google account the Technology team added for you.

1. Open the admin address and tap Sign in with Google.
2. Choose your own Google account.
3. If you see "That Google account does not have admin access", it was not added yet. Ask the Technology team.

> You are signed out after about 8 hours. Just sign in again.

## Reading the order list

The list is sorted so the orders that need you come first.

1. Orders marked Check first are at the top: a receipt number used twice, a receipt that does not match, or one that could not be read.
2. The Receipt reading column is a hint from the buyer's phone. It never confirms a payment. You always compare the receipt yourself.
3. Use the filters (status, payment, product, receipt reading) or the search box (Order ID, name or email) to narrow the list. Tap Clear filters to start again.

> A reused reference number means the same payment may be claimed twice. Open both orders before confirming either.

## Confirm a payment

Do this once you have seen the money arrive.

1. Open the order. The receipt is on the left, with zoom buttons.
2. Check three things against the receipt: the amount equals the Total the buyer owes, the reference number matches, and the payment really reached your account.
3. Tap Confirm payment.
4. The buyer gets Email 2 with their Order ID and a tracking link, and you land on the next order that is waiting.

> Payments are always confirmed one at a time, on purpose.

## Reject a payment

Use this when the receipt is unreadable, the amount is wrong, or the reference is invalid.

1. Open the order and choose the reason under Reason for rejecting.
2. Tap Reject payment.
3. The buyer gets Email 9 with the reason and the merch ticket form to send a new receipt within 48 hours.

## Move many orders at once

For example, everything that is now in production.

1. On the order list, tick the orders (the box at the top ticks all of them on the page).
2. At the bottom, choose Move to and the status. Add a note if you want the buyers to read one.
3. Tap Update. Each buyer is emailed for their own order.
4. Orders that cannot make that move are skipped and listed, so nothing goes wrong silently.

> Canceling needs a reason in the note. Confirming and rejecting payments are never done in bulk.

## Cancel and refund

Only for orders whose payment was already confirmed.

1. Open the order and tap Move to Canceled. Type the reason in the note: the buyer reads it in Email 6.
2. When you start the refund, tap Move to Refund in Process (Email 7 states the refund time).
3. When the money has been sent, tap Move to Refund Successful. Add the transaction reference in the note if you want it in Email 8.

## Fix a mistake

If a status was set by accident.

1. Open the order and tap Set a wrong status right.
2. Choose the correct status and write what went wrong.
3. Tap Save correction. It is recorded in the history with your name and the buyer is not emailed.

> A correction can go back or skip ahead within the same line (production to delivery, or cancel to refund). It cannot move an order back into payment checking.

## Export orders to a spreadsheet

A CSV file you can open in Excel or Google Sheets.

1. Filter the list the way you want it (or leave it as it is for everything).
2. Tap Export these orders to CSV above the table.
3. Open the file. Each row has a link back to the order.

> The file holds buyers' personal details. Keep it private and delete it when you are done.

## See who did what

The audit log records every confirmation, rejection, status change, correction, export, product edit and store switch.

1. Tap Audit log at the top.
2. Use Show to pick one kind of action.
3. Each row says who, what, when, and links to the order.

> Nobody can edit or delete it.

## Check that emails went out

Every email the system sends is listed, including the ones that failed.

1. Tap Email log at the top.
2. Tap Not delivered only to see problems.
3. Gmail allows a limited number of emails a day. If it is nearly used up, actions that need an email wait and tell you so.

## Open or close the store, and the launch date

Both are on the first screen of the admin area.

1. Close the store to stop new orders and payments at once. Buyers see a friendly message. Orders already in stay yours to work on. Tap Reopen the store to open it again.
2. The launch date controls the landing page countdown. Type a new date and time (Manila) and tap Save launch date. A date in the past shows launch day, which is handy for a preview.

> After a preview, set the real launch date again.

## If something looks wrong

Check the System page, then tell the Technology team.

1. Tap System at the top. A ⚠ marks anything that needs attention: the database, the nightly backup, emails, errors.
2. Tell the Technology team what you were doing and what you saw. Release notes lists what changed in each version.
