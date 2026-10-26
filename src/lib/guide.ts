// The finance guide (PRD NF09: a trained committee member updates an order status in under 2 minutes
// without developer help). One source of truth: the admin Help page shows it, and docs/finance-guide.md
// is generated from it (npm run guide) so the printable copy never drifts. Plain words, no jargon.
export type GuideSection = { id: string; title: string; summary: string; steps: string[]; tips?: string[] };

export const GUIDE: GuideSection[] = [
  {
    id: "quick-status",
    title: "Update an order's status (the 2-minute job)",
    summary: "This is the thing you will do most. It takes four steps.",
    steps: [
      "Open the admin area and tap the order's Order ID in the list. Use the search box if you have the buyer's name or email.",
      "On the right, under Decision, tap the button for the next step, for example Move to In Production.",
      "Optional: type a short note first. It is printed in the email the buyer receives.",
      "That is it. The buyer is emailed and their tracking page updates straight away.",
    ],
    tips: ["Statuses only move forward. If you tapped the wrong one, see Fix a mistake below."],
  },
  {
    id: "sign-in",
    title: "Signing in",
    summary: "Use the Google account the Technology team added for you.",
    steps: ["Open the admin address and tap Sign in with Google.", "Choose your own Google account.", "If you see \"That Google account does not have admin access\", it was not added yet. Ask the Technology team."],
    tips: ["You are signed out after about 8 hours. Just sign in again."],
  },
  {
    id: "order-list",
    title: "Reading the order list",
    summary: "The list is sorted so the orders that need you come first.",
    steps: [
      "Orders marked Check first are at the top: a receipt number used twice, a receipt that does not match, or one that could not be read.",
      "The Receipt reading column is a hint from the buyer's phone. It never confirms a payment. You always compare the receipt yourself.",
      "Use the filters (status, payment, product, receipt reading) or the search box (Order ID, name or email) to narrow the list. Tap Clear filters to start again.",
    ],
    tips: ["A reused reference number means the same payment may be claimed twice. Open both orders before confirming either."],
  },
  {
    id: "confirm",
    title: "Confirm a payment",
    summary: "Do this once you have seen the money arrive.",
    steps: [
      "Open the order. The receipt is on the left, with zoom buttons.",
      "Check three things against the receipt: the amount equals the Total the buyer owes, the reference number matches, and the payment really reached your account.",
      "Tap Confirm payment.",
      "The buyer gets Email 2 with their Order ID and a tracking link, and you land on the next order that is waiting.",
    ],
    tips: ["Payments are always confirmed one at a time, on purpose."],
  },
  {
    id: "reject",
    title: "Reject a payment",
    summary: "Use this when the receipt is unreadable, the amount is wrong, or the reference is invalid.",
    steps: [
      "Open the order and choose the reason under Reason for rejecting.",
      "Tap Reject payment.",
      "The buyer gets Email 9 with the reason and the merch ticket form to send a new receipt within 48 hours.",
    ],
  },
  {
    id: "bulk",
    title: "Move many orders at once",
    summary: "For example, everything that is now in production.",
    steps: [
      "On the order list, tick the orders (the box at the top ticks all of them on the page).",
      "At the bottom, choose Move to and the status. Add a note if you want the buyers to read one.",
      "Tap Update. Each buyer is emailed for their own order.",
      "Orders that cannot make that move are skipped and listed, so nothing goes wrong silently.",
    ],
    tips: ["Canceling needs a reason in the note. Confirming and rejecting payments are never done in bulk."],
  },
  {
    id: "cancel-refund",
    title: "Cancel and refund",
    summary: "Only for orders whose payment was already confirmed.",
    steps: [
      "Open the order and tap Move to Canceled. Type the reason in the note: the buyer reads it in Email 6.",
      "When you start the refund, tap Move to Refund in Process (Email 7 states the refund time).",
      "When the money has been sent, tap Move to Refund Successful. Add the transaction reference in the note if you want it in Email 8.",
    ],
  },
  {
    id: "correct",
    title: "Fix a mistake",
    summary: "If a status was set by accident.",
    steps: [
      "Open the order and tap Set a wrong status right.",
      "Choose the correct status and write what went wrong.",
      "Tap Save correction. It is recorded in the history with your name and the buyer is not emailed.",
    ],
    tips: ["A correction can go back or skip ahead within the same line (production to delivery, or cancel to refund). It cannot move an order back into payment checking."],
  },
  {
    id: "export",
    title: "Export orders to a spreadsheet",
    summary: "A CSV file you can open in Excel or Google Sheets.",
    steps: ["Filter the list the way you want it (or leave it as it is for everything).", "Tap Export these orders to CSV above the table.", "Open the file. Each row has a link back to the order."],
    tips: ["The file holds buyers' personal details. Keep it private and delete it when you are done."],
  },
  {
    id: "audit",
    title: "See who did what",
    summary: "The audit log records every confirmation, rejection, status change, correction, export, product edit and store switch.",
    steps: ["Tap Audit log at the top.", "Use Show to pick one kind of action.", "Each row says who, what, when, and links to the order."],
    tips: ["Nobody can edit or delete it."],
  },
  {
    id: "emails",
    title: "Check that emails went out",
    summary: "Every email the system sends is listed, including the ones that failed.",
    steps: ["Tap Email log at the top.", "Tap Not delivered only to see problems.", "Gmail allows a limited number of emails a day. If it is nearly used up, actions that need an email wait and tell you so."],
  },
  {
    id: "store-launch",
    title: "Open or close the store, and the launch date",
    summary: "Both are on the first screen of the admin area.",
    steps: [
      "Close the store to stop new orders and payments at once. Buyers see a friendly message. Orders already in stay yours to work on. Tap Reopen the store to open it again.",
      "The launch date controls the landing page countdown. Type a new date and time (Manila) and tap Save launch date. A date in the past shows launch day, which is handy for a preview.",
    ],
    tips: ["After a preview, set the real launch date again."],
  },
  {
    id: "problems",
    title: "If something looks wrong",
    summary: "Check the System page, then tell the Technology team.",
    steps: ["Tap System at the top. A ⚠ marks anything that needs attention: the database, the nightly backup, emails, errors.", "Tell the Technology team what you were doing and what you saw. Release notes lists what changed in each version."],
  },
];

export function renderGuideMarkdown(sections: GuideSection[] = GUIDE): string {
  const out = ["# Finance guide", "", "How to run the START: COLLECTIONS admin area. This file is generated from `src/lib/guide.ts` (run `npm run guide`); the same text is on the admin Help page. Edit that file, not this one.", ""];
  for (const s of sections) {
    out.push(`## ${s.title}`, "", s.summary, "", ...s.steps.map((t, i) => `${i + 1}. ${t}`), "");
    if (s.tips?.length) out.push(...s.tips.map((t) => `> ${t}`), "");
  }
  return `${out.join("\n").trimEnd()}\n`;
}
