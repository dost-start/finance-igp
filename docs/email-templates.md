# START: COLLECTIONS – Automated Email Templates (v2, Tech revision)

Revision of finance's 9 templates to match the PRD (S2026-05012, Appendix F). Text in `{{double braces}}` is filled in by the system. All emails are sent from the finance Gmail as **no-reply** messages.

---

## Notes for Finance (please review)

**What Tech changed**

1. **Every email is no-reply.** Removed all "Reply to this email" lines (old emails 5, 6, 7). Questions, changes and cancellations now point to the merch ticket form. A standard no-reply footer is added to all 9 emails.
2. **Email 1 – shipping and totals.** The system has no shipping fee, so "Subtotal" and "Shipping Fee" are removed. "Total Amount Paid" is now **"Total Amount Due"**, because payment is not verified yet. Reworded "You lack an Order ID" to match the message shown at checkout.
3. **Email 5 renamed.** The old subject "Order Received: Thank You…" looked like email 1. It is now **"Order Delivered"**. The internal status is still "Received Successfully".
4. **Emails 3, 4, 7, 8 – no per-order typed details.** The system does not store estimated completion date, courier, tracking number, refund channel, or masked account number. Those lines are removed. Where they mattered, there is an optional **note** box finance can fill when changing the status. The note is inserted into the email.
5. **Wording.** "wear this piece" is now "use or wear" (the catalog includes lanyards, stickers and tote bags). Sign-offs are consistent. Typos and a stray colon in the email 4 subject are fixed. Email 2 now also mentions looking up the order with the Order ID and the last 4 phone digits.

**Questions for Finance**

- **Q1 (email 1):** Is it correct that no shipping fee is charged in the system (shipping is either included in prices or handled outside)?
- **Q2 (email 1):** Can finance promise to review payments within **24–48 hours**? If not, we remove the line.
- **Q3 (email 7):** Please give one fixed **refund timeframe**. It is set once in the system, not per order. Until finance gives it, moving an order to Refund in Process is switched off, so no buyer gets an invented or blank promise.
- **Q4 (email 9):** Please give one fixed **submission deadline rule** (a number of hours after rejection). The system computes the date. Until finance gives it, Reject payment is switched off, so no buyer gets an invented deadline.
- **Q5 (email 9):** The rejection reason is a dropdown: *Unreadable receipt / Incorrect amount / Invalid reference number*. Add or remove options?
- **Q6 (email 9):** Since the buyer has no Order ID yet, the ticket form should also ask for their **contact number** so finance can match the new receipt to the right order. Can the form be updated?
- **Q7 (emails 7, 8):** Refund channel and account details come from the refund Google Form and are not stored in the system. Finance adds the transaction reference number in the note box on email 8 if you want it included. OK?

---

## Variables

| Variable | Filled by |
|---|---|
| `{{buyer_name}}`, `{{order_id}}`, `{{tracking_link}}`, `{{items}}`, `{{delivery_address}}`, `{{total}}`, `{{status_date}}` | System |
| `{{store_link}}`, `{{ticket_form_link}}`, `{{refund_timeframe}}`, `{{submission_deadline}}` | Config, set by Tech/Finance (not per order) |
| `{{cancel_reason}}` | Finance, free text, required when canceling |
| `{{reject_reason}}` | Finance, dropdown, required when rejecting |
| `{{note}}` | Finance, optional free text at status change. Omitted if empty |

**Footer on every email:**
> This is an automated message from a no-reply address. Please do not reply. For questions, changes, or cancellations, use the merch ticket form: {{ticket_form_link}}

---

## 1. Order Received (Payment Pending)

**Sent when:** The buyer submits the order. *(System trigger, not a finance action.)*

**Subject:** START: COLLECTIONS Order Received – Payment Pending Verification

Hello {{buyer_name}},

Thank you for placing an order with START: COLLECTIONS. Your purchase generates support for START-DOST and connects you with DOST technoscholars across the Philippines.

We received your order submission. Our finance team is verifying your payment. Your Order ID will be sent once your payment has been finalized by the Finance Team.

**Order Summary**
{{items}}
Total Amount Due: {{total}}
Delivery Address: {{delivery_address}}

Our finance team reviews payment submissions within 24–48 hours. You will receive a confirmation email with your Order ID and tracking link after finance verifies your payment.

Best regards,
START: COLLECTIONS Team

---

## 2. Payment Confirmation

**Sent when:** Finance verifies the payment.

**Subject:** START: COLLECTIONS Payment Confirmed – Order ID {{order_id}}

Hello {{buyer_name}},

Our finance team verified your payment. Your START: COLLECTIONS order is now confirmed. Your purchase builds your connection to our nationwide network of DOST technoscholars.

**Order Confirmation Details**
Order ID: **{{order_id}}**
Tracking Link: {{tracking_link}}
Items Ordered: {{items}}
Total Verified: {{total}}

Open the tracking link above to check the progress of your order at any time. You can also check your order on our tracking page using your Order ID and the last 4 digits of your contact number. We will send another update when our team starts production.

Best regards,
START: COLLECTIONS Team

---

## 3. In Production

**Sent when:** Finance starts production.

**Subject:** START: COLLECTIONS – In Production

Hello {{buyer_name}},

Our team started production on your START: COLLECTIONS order.

**Production Notice**
Order ID: {{order_id}}
Order Status: In Production
Tracking Link: {{tracking_link}}
{{note}}

Your START: COLLECTIONS item represents intellect, regional pride, and belonging in the DOST technoscholar network. We will email you again when your order ships.

Best regards,
START: COLLECTIONS Team

---

## 4. Out for Shipping

**Sent when:** The order ships.

**Subject:** START: COLLECTIONS – Out for Shipping

Hello {{buyer_name}},

Your START: COLLECTIONS order left our facility and is on the way to your address. Soon you will use or wear a symbol of our unified technoscholar community.

**Shipping Notice**
Order ID: {{order_id}}
Tracking Link: {{tracking_link}}
Delivery Address: {{delivery_address}}
{{note}}

Please keep your phone line open for updates from the delivery rider.

Best regards,
START: COLLECTIONS Team

---

## 5. Order Delivered (status: Received Successfully)

**Sent when:** Finance marks the order received.

**Subject:** Order Delivered: Thank You for Supporting START: COLLECTIONS

Hello {{buyer_name}},

Our finance team marked your START: COLLECTIONS order as received.

Thank you for buying from START: COLLECTIONS. Your purchase supports START-DOST projects and connects you with fellow DOST technoscholars across the Philippines. Whenever you use or wear your item, peers across the country will recognize you as part of our community.

**Order Summary**
Order ID: {{order_id}}
Order Status: Received Successfully
Date Completed: {{status_date}}

If you need help with your order, submit a request through the merch ticket form within 2 days: {{ticket_form_link}}

Best regards,
START: COLLECTIONS Team

---

## 6. Canceled

**Sent when:** Finance cancels a confirmed order.

**Subject:** START: COLLECTIONS – Order Canceled

Hello {{buyer_name}},

Our finance team canceled your confirmed START: COLLECTIONS order.

**Cancellation Notice**
Order ID: {{order_id}}
Reason for Cancellation: {{cancel_reason}}

**Next Steps**

1. Our finance team will start your refund process and send a separate email with your refund schedule.
2. Visit {{store_link}} if you want to submit a new START: COLLECTIONS order.
3. If you have questions about this notice, submit them through the merch ticket form with your Order ID: {{ticket_form_link}}

Thank you for your patience and support for the DOST technoscholar network.

Best regards,
START: COLLECTIONS Finance Team

---

## 7. Refund in Process

**Sent when:** Finance starts the refund.

**Subject:** START: COLLECTIONS – Refund in Process

Hello {{buyer_name}},

Our finance team started the refund for your START: COLLECTIONS order.

**Refund Schedule and Details**
Order ID: {{order_id}}
Refund Amount: {{total}}
Refund Destination: the account you provided in the refund form
Refund Timeframe: {{refund_timeframe}}
{{note}}

**Refund Process from Finance**

1. Finance validates your payment record and receiving account details.
2. Finance approves and schedules the payout transfer.
3. Finance sends the funds.

If you need to update your receiving account details, submit the change through the merch ticket form: {{ticket_form_link}}

Best regards,
START: COLLECTIONS Finance Team

---

## 8. Refund Successful

**Sent when:** The refund is sent.

**Subject:** START: COLLECTIONS – Refund Successful

Hello {{buyer_name}},

Our finance team sent the refund for your START: COLLECTIONS order.

**Refund Details from Finance**
Order ID: {{order_id}}
Amount Sent: {{total}}
Date Sent: {{status_date}}
{{note}}

Check your account balance to confirm receipt of the funds. We hope to connect with you again on future START: COLLECTIONS releases.

Best regards,
START: COLLECTIONS Finance Team

---

## 9. Payment Rejected

**Sent when:** Finance rejects the payment.

**Subject:** [Action Required] START: COLLECTIONS – Payment Rejected

Hello {{buyer_name}},

Our finance team reviewed your order and rejected your payment submission.

**Reason for Rejection:** {{reject_reason}}

**Next Steps**
Submit a new payment receipt through our merch ticket form to keep your order active.

Merch Ticket Form Link: {{ticket_form_link}}
Submission Deadline: {{submission_deadline}}

**Instructions for Submission**

1. Open the merch ticket form link above.
2. Enter the full name, email address, and contact number from your order.
3. Upload a readable image of your payment receipt showing the reference number, date, and amount paid.
4. Submit the form before the deadline listed above.

Finance will send your Order ID and tracking link after verifying your new receipt.

Best regards,
START: COLLECTIONS Finance Team
