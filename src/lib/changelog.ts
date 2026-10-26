// What changed in each version of the shop, in plain words for finance and the committee. This list is
// the single source of truth: CHANGELOG.md is generated from it (npm run changelog), the admin
// "Release notes" page shows it, and a test makes sure the file and package.json agree with it.
// To release: add a new entry at the TOP, set package.json "version" to match, run npm run changelog.
export type ChangeKind = "added" | "changed" | "fixed" | "removed" | "security";
export type Change = { kind: ChangeKind; text: string };
export type Release = { version: string; date: string; title: string; changes: Change[] };

export const KIND_LABEL: Record<ChangeKind, string> = { added: "Added", changed: "Changed", fixed: "Fixed", removed: "Removed", security: "Security" };
const KIND_ORDER: ChangeKind[] = ["added", "changed", "fixed", "removed", "security"];

export const RELEASES: Release[] = [
  {
    version: "0.2.2",
    date: "2026-10-27",
    title: "Version numbers and release notes",
    changes: [
      { kind: "added", text: "Every version now has a number and a dated list of what changed. Finance and tech can read it under Release notes in the admin area, and it is kept in CHANGELOG.md in the code." },
      { kind: "added", text: "The health check shows which version is running." },
    ],
  },
  {
    version: "0.2.1",
    date: "2026-10-27",
    title: "Sprint 2 QA",
    changes: [
      { kind: "fixed", text: "Receipt reading now finds the reference number when a date follows it (for example \"Ref No. 0046567041072 Oct 27,2026 12:33 AM\") and accepts the 6-digit MariBank and InstaPay references. Plain words, dates and transaction-history lists are still never taken as a reference." },
      { kind: "fixed", text: "Accessibility: the Cart link and the + and − buttons are announced correctly by screen readers, the cart's picture link is no longer an unnamed link, and grey helper text is readable in dark mode." },
      { kind: "changed", text: "The refund timeframe (5 to 7 business days) and the rejection deadline (48 hours) are finance's final settings, not placeholders." },
      { kind: "removed", text: "The branded email layout was taken out again because it did not render correctly. Emails are back to clear text with clickable links." },
      { kind: "added", text: "Automated checks for hostile carts, forged admin sessions, a blurry receipt and an accessibility scan of every page, plus a written QA report for Sprints 1 and 2." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-10-27",
    title: "Sprint 2: run a launch-day queue",
    changes: [
      { kind: "added", text: "Receipt reading on the buyer's phone: the amount and reference are read in up to 15 seconds and never stop the buyer from submitting. Finance sees the reading next to what the buyer typed and the order total, with matches and mismatches marked. A reference number used on another order is flagged. Reading never confirms a payment." },
      { kind: "added", text: "The order list can be filtered by status, payment, product, receipt reading and search. Orders that need a closer look come first. Many orders can be moved to the next status together, with an optional note that goes into the buyers' emails, and the list exports to CSV." },
      { kind: "added", text: "Emails 3 to 8: In Production, Out for Shipping, Order Delivered, Canceled, Refund in Process and Refund Successful, each with an optional note from finance." },
      { kind: "added", text: "Cancel and refund statuses, and a way to correct a wrong status with a reason (recorded, and the buyer is not emailed)." },
      { kind: "added", text: "Email log screen that also shows emails that did not go out, and a guard that stops before Gmail's daily sending limit." },
      { kind: "added", text: "Audit log that every finance member can read, a product, price and size editor for the Technology team only, and a store lock switch that closes ordering and payments with a friendly message." },
      { kind: "added", text: "A limit on how many orders one visitor can create in a short time, and a real \"not found\" page for payment links that are not orders." },
      { kind: "added", text: "A branded email layout (it was live for a short time and was removed again in 0.2.1)." },
      { kind: "changed", text: "The buyer's tracking page now hides progress steps that finance corrected away." },
      { kind: "fixed", text: "A database hang that could freeze admin pages when several things loaded at once: queries now wait their turn." },
      { kind: "security", text: "Hostile carts, forged sessions and unsigned requests are refused on the server; every admin action checks the signed-in account first." },
    ],
  },
  {
    version: "0.1.1",
    date: "2026-10-26",
    title: "Sprint 1 polish",
    changes: [
      { kind: "added", text: "Emails now also come with a second copy that has clickable links, besides the plain text." },
      { kind: "added", text: "Placeholder pictures for the demo products." },
      { kind: "changed", text: "The site now runs in Singapore, next to the database, so admin pages respond faster." },
      { kind: "fixed", text: "Product pictures did not show on the shop pages; fixed." },
      { kind: "fixed", text: "The Track order link wrapped onto two lines on phones, and the privacy page title repeated the shop's name." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-10-26",
    title: "Sprint 1: from browsing to a confirmed order",
    changes: [
      { kind: "added", text: "The shop: product grid, product pages with sizes and quantity, a cart with a running total, usable down to a 360 px phone." },
      { kind: "added", text: "Checkout with name, university, delivery details (a Google Maps link and a landmark), contact number and email typed twice. The Order ID (R, a region code and six digits) stays hidden until finance confirms the payment." },
      { kind: "added", text: "Payment page: choose GCash, Landbank, GoTyme or MariBank, scan the QR, enter the reference number and upload the receipt, which is shrunk on the phone first." },
      { kind: "added", text: "Finance sign-in with Google for approved accounts only, an order list, and a review screen with a zoomable receipt beside the total and the details the buyer typed. Confirm or Reject, then the next order." },
      { kind: "added", text: "Emails 1 (order received), 2 (payment confirmed, with the Order ID and tracking link) and 9 (payment rejected, with the reason and the merch ticket form), sent from the finance Gmail as no-reply messages and all logged." },
      { kind: "added", text: "Tracking page: the Order ID plus the last 4 digits of the phone number, or the link from the email." },
      { kind: "added", text: "Privacy notice page." },
      { kind: "security", text: "Receipts and payment QR codes are kept in a private Google Drive folder and only shown through signed-in or order-specific routes; the tracking page shows status only and locks after repeated wrong tries; security headers on every page." },
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0].version;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function formatReleaseDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// CHANGELOG.md, generated from RELEASES so the file and the admin page can never disagree.
export function renderChangelogMarkdown(releases: Release[] = RELEASES): string {
  const out = ["# Changelog", "", "What changed in each version of the START: COLLECTIONS shop, newest first. Versions follow major.minor.patch: a new sprint raises the middle number, a fix or polish raises the last. This file is generated from `src/lib/changelog.ts` (run `npm run changelog`); edit that file, not this one.", ""];
  for (const r of releases) {
    out.push(`## ${r.version}: ${r.title} (${r.date})`, "");
    for (const kind of KIND_ORDER) {
      const items = r.changes.filter((c) => c.kind === kind);
      if (items.length === 0) continue;
      out.push(`### ${KIND_LABEL[kind]}`, "", ...items.map((c) => `- ${c.text}`), "");
    }
  }
  return `${out.join("\n").trimEnd()}\n`;
}

export function groupChanges(release: Release): { kind: ChangeKind; label: string; items: string[] }[] {
  return KIND_ORDER.map((kind) => ({ kind, label: KIND_LABEL[kind], items: release.changes.filter((c) => c.kind === kind).map((c) => c.text) })).filter((g) => g.items.length > 0);
}
