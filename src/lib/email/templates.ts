import { formatPeso } from "../money";

// Wording from docs/email-templates.md (v2). All emails are no-reply, and Email 1 never
// contains the Order ID: buyers get it only after finance verifies the payment.
export type EmailContent = { subject: string; text: string };

export function ticketFormUrl(env: Record<string, string | undefined> = process.env): string | null {
  const url = env.MERCH_TICKET_FORM_URL?.trim();
  return url ? url : null;
}

function footer(ticketUrl: string | null): string {
  const help = ticketUrl
    ? `For questions, changes, or cancellations, use the merch ticket form: ${ticketUrl}`
    : "For questions, changes, or cancellations, please use the merch ticket form (link coming soon).";
  return `This is an automated message from a no-reply address. Please do not reply. ${help}`;
}

export type Email1Data = {
  buyerName: string;
  items: { name: string; size: string; quantity: number }[];
  totalCentavos: number;
  universityAddress: string;
  homeAddressLink: string;
  homeLandmark: string;
};

export function renderEmail1(d: Email1Data, ticketUrl: string | null): EmailContent {
  const lines = d.items.map((i) => `- ${i.quantity} x ${i.name} (Size: ${i.size})`).join("\n");
  const text = [
    `Hello ${d.buyerName},`,
    "",
    "Thank you for placing an order with START: COLLECTIONS. Your purchase generates support for START-DOST and connects you with DOST technoscholars across the Philippines.",
    "",
    "We received your order submission. Our finance team is verifying your payment. Your Order ID will be sent once your payment has been finalized by the Finance Team.",
    "",
    "Order Summary",
    lines,
    `Total Amount Due: ${formatPeso(d.totalCentavos)}`,
    `University Address: ${d.universityAddress}`,
    `Home Address (map link): ${d.homeAddressLink}`,
    `Landmark: ${d.homeLandmark}`,
    "",
    "Our finance team reviews payment submissions within 24-48 hours. You will receive a confirmation email with your Order ID and tracking link after finance verifies your payment.",
    "",
    "Best regards,",
    "START: COLLECTIONS Team",
    "",
    "--",
    footer(ticketUrl),
  ].join("\n");
  return { subject: "START: COLLECTIONS Order Received - Payment Pending Verification", text };
}

export type Email2Data = {
  buyerName: string;
  orderId: string;
  trackingUrl: string;
  items: { name: string; size: string; quantity: number }[];
  totalCentavos: number;
};

// Email 2: sent when finance confirms the payment. This is the first time the buyer sees the Order ID.
export function renderEmail2(d: Email2Data, ticketUrl: string | null): EmailContent {
  const lines = d.items.map((i) => `- ${i.quantity} x ${i.name} (Size: ${i.size})`).join("\n");
  const text = [
    `Hello ${d.buyerName},`,
    "",
    "Our finance team verified your payment. Your START: COLLECTIONS order is now confirmed. Your purchase builds your connection to our nationwide network of DOST technoscholars.",
    "",
    "Order Confirmation Details",
    `Order ID: ${d.orderId}`,
    `Tracking Link: ${d.trackingUrl}`,
    "Items Ordered:",
    lines,
    `Total Verified: ${formatPeso(d.totalCentavos)}`,
    "",
    "Open the tracking link above to check the progress of your order at any time. You can also check your order on our tracking page using your Order ID and the last 4 digits of your contact number. We will send another update when our team starts production.",
    "",
    "Best regards,",
    "START: COLLECTIONS Team",
    "",
    "--",
    footer(ticketUrl),
  ].join("\n");
  return { subject: `START: COLLECTIONS Payment Confirmed - Order ID ${d.orderId}`, text };
}

export const REJECT_REASONS = ["Unreadable receipt", "Incorrect amount", "Invalid reference number"] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

// Finance's final rule: buyers have 48 hours after a rejection to send a new receipt. It is a setting,
// not a guess: REJECTION_DEADLINE_HOURS (a whole number of hours) changes it without a code change.
export const REJECTION_DEADLINE_HOURS = 48;

export function rejectionDeadlineHours(env: Record<string, string | undefined> = process.env): number {
  const raw = env.REJECTION_DEADLINE_HOURS?.trim();
  return raw && /^\d{1,4}$/.test(raw) && Number(raw) >= 1 ? Number(raw) : REJECTION_DEADLINE_HOURS;
}

export function rejectionDeadline(from: Date, hours = rejectionDeadlineHours()): Date {
  return new Date(from.getTime() + hours * 3_600_000);
}

export function formatManila(date: Date): string {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" }).format(date);
}

// Email 9: payment rejected. No Order ID here: the order is not confirmed yet.
export function renderEmail9(d: { buyerName: string; reason: RejectReason; deadline: Date }, ticketUrl: string | null): EmailContent {
  const form = ticketUrl ?? "(the merch ticket form link will be added soon)";
  const text = [
    `Hello ${d.buyerName},`,
    "",
    "Our finance team reviewed your order and rejected your payment submission.",
    "",
    `Reason for Rejection: ${d.reason}`,
    "",
    "Next Steps",
    "Submit a new payment receipt through our merch ticket form to keep your order active.",
    "",
    `Merch Ticket Form Link: ${form}`,
    `Submission Deadline: ${formatManila(d.deadline)}`,
    "",
    "Instructions for Submission",
    "1. Open the merch ticket form link above.",
    "2. Enter the full name, email address, and contact number from your order.",
    "3. Upload a readable image of your payment receipt showing the reference number, date, and amount paid.",
    "4. Submit the form before the deadline listed above.",
    "",
    "Finance will send your Order ID and tracking link after verifying your new receipt.",
    "",
    "Best regards,",
    "START: COLLECTIONS Finance Team",
    "",
    "--",
    footer(ticketUrl),
  ].join("\n");
  return { subject: "[Action Required] START: COLLECTIONS - Payment Rejected", text };
}

// ---------------------------------------------------------------------------------------------
// Emails 3 to 8: one per status finance moves an order to after payment is confirmed. Wording is
// from docs/email-templates.md. Finance can add an optional note when changing a status; it is
// printed on its own line. Only a hash of the tracking token is stored, so these emails link to
// the tracking page (Order ID plus last 4 digits) and not to a personal link; the link in Email 2
// keeps working.
export const STATUS_EMAIL_STATUSES = ["in_production", "out_for_shipping", "received_successfully", "canceled", "refund_in_process", "refund_successful"] as const;
export type StatusEmailStatus = (typeof STATUS_EMAIL_STATUSES)[number];
export const isStatusEmailStatus = (s: string): s is StatusEmailStatus => (STATUS_EMAIL_STATUSES as readonly string[]).includes(s);

export type StatusEmailData = {
  buyerName: string;
  orderId: string;
  totalCentavos: number;
  universityAddress: string;
  homeAddressLink: string;
  homeLandmark: string;
  note?: string | null;
  at: Date; // when the status was set
};

export type StatusEmailConfig = { siteUrl: string; refundTimeframe: string };

// Finance's final refund timeframe, the same for every order: 5 to 7 business days. It is a setting,
// not a guess: REFUND_TIMEFRAME changes the wording without a code change.
export const DEFAULT_REFUND_TIMEFRAME = "5 to 7 business days";

export function statusEmailConfig(env: Record<string, string | undefined> = process.env): StatusEmailConfig {
  return {
    siteUrl: (env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
    refundTimeframe: env.REFUND_TIMEFRAME?.trim() || DEFAULT_REFUND_TIMEFRAME,
  };
}

// Finance-typed text goes into the email body, so keep it to one tidy paragraph.
export function cleanNote(note: string | null | undefined): string | null {
  const t = (note ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  return t === "" ? null : t;
}

const noteLine = (note: string | null | undefined): string[] => {
  const n = cleanNote(note);
  return n ? [`Note from finance: ${n}`] : [];
};

export function renderStatusEmail(
  status: StatusEmailStatus,
  d: StatusEmailData,
  ticketUrl: string | null,
  config: StatusEmailConfig = statusEmailConfig(),
): { template: string; content: EmailContent } {
  const trackUrl = `${config.siteUrl}/track`;
  const form = ticketUrl ?? "(the merch ticket form link will be added soon)";
  const when = formatManila(d.at);
  const sign = (team: string) => ["Best regards,", team, "", "--", footer(ticketUrl)];
  const lines = (parts: (string | string[])[]) => parts.flat().join("\n");

  switch (status) {
    case "in_production":
      return {
        template: "3-in-production",
        content: {
          subject: "START: COLLECTIONS - In Production",
          text: lines([
            `Hello ${d.buyerName},`,
            "",
            "Our team started production on your START: COLLECTIONS order.",
            "",
            "Production Notice",
            `Order ID: ${d.orderId}`,
            "Order Status: In Production",
            `Tracking Page: ${trackUrl} (use your Order ID and the last 4 digits of your contact number)`,
            noteLine(d.note),
            "",
            "Your START: COLLECTIONS item represents intellect, regional pride, and belonging in the DOST technoscholar network. We will email you again when your order ships.",
            "",
            sign("START: COLLECTIONS Team"),
          ]),
        },
      };
    case "out_for_shipping":
      return {
        template: "4-out-for-shipping",
        content: {
          subject: "START: COLLECTIONS - Out for Shipping",
          text: lines([
            `Hello ${d.buyerName},`,
            "",
            "Your START: COLLECTIONS order left our facility and is on the way to your address. Soon you will use or wear a symbol of our unified technoscholar community.",
            "",
            "Shipping Notice",
            `Order ID: ${d.orderId}`,
            `Tracking Page: ${trackUrl} (use your Order ID and the last 4 digits of your contact number)`,
            `Delivery Address: ${d.universityAddress}`,
            `Home Address (map link): ${d.homeAddressLink}`,
            `Landmark: ${d.homeLandmark}`,
            noteLine(d.note),
            "",
            "Please keep your phone line open for updates from the delivery rider.",
            "",
            sign("START: COLLECTIONS Team"),
          ]),
        },
      };
    case "received_successfully":
      return {
        template: "5-order-delivered",
        content: {
          subject: "Order Delivered: Thank You for Supporting START: COLLECTIONS",
          text: lines([
            `Hello ${d.buyerName},`,
            "",
            "Our finance team marked your START: COLLECTIONS order as received.",
            "",
            "Thank you for buying from START: COLLECTIONS. Your purchase supports START-DOST projects and connects you with fellow DOST technoscholars across the Philippines. Whenever you use or wear your item, peers across the country will recognize you as part of our community.",
            "",
            "Order Summary",
            `Order ID: ${d.orderId}`,
            "Order Status: Received Successfully",
            `Date Completed: ${when}`,
            noteLine(d.note),
            "",
            `If you need help with your order, submit a request through the merch ticket form within 2 days: ${form}`,
            "",
            sign("START: COLLECTIONS Team"),
          ]),
        },
      };
    case "canceled":
      return {
        template: "6-canceled",
        content: {
          subject: "START: COLLECTIONS - Order Canceled",
          text: lines([
            `Hello ${d.buyerName},`,
            "",
            "Our finance team canceled your confirmed START: COLLECTIONS order.",
            "",
            "Cancellation Notice",
            `Order ID: ${d.orderId}`,
            `Reason for Cancellation: ${cleanNote(d.note) ?? "Canceled by the finance team"}`,
            "",
            "Next Steps",
            "1. Our finance team will start your refund process and send a separate email with your refund schedule.",
            `2. Visit ${config.siteUrl} if you want to submit a new START: COLLECTIONS order.`,
            `3. If you have questions about this notice, submit them through the merch ticket form with your Order ID: ${form}`,
            "",
            "Thank you for your patience and support for the DOST technoscholar network.",
            "",
            sign("START: COLLECTIONS Finance Team"),
          ]),
        },
      };
    case "refund_in_process":
      return {
        template: "7-refund-in-process",
        content: {
          subject: "START: COLLECTIONS - Refund in Process",
          text: lines([
            `Hello ${d.buyerName},`,
            "",
            "Our finance team started the refund for your START: COLLECTIONS order.",
            "",
            "Refund Schedule and Details",
            `Order ID: ${d.orderId}`,
            `Refund Amount: ${formatPeso(d.totalCentavos)}`,
            "Refund Destination: the account you provided in the refund form",
            `Refund Timeframe: ${config.refundTimeframe}`,
            noteLine(d.note),
            "",
            "Refund Process from Finance",
            "1. Finance validates your payment record and receiving account details.",
            "2. Finance approves and schedules the payout transfer.",
            "3. Finance sends the funds.",
            "",
            `If you need to update your receiving account details, submit the change through the merch ticket form: ${form}`,
            "",
            sign("START: COLLECTIONS Finance Team"),
          ]),
        },
      };
    case "refund_successful":
      return {
        template: "8-refund-successful",
        content: {
          subject: "START: COLLECTIONS - Refund Successful",
          text: lines([
            `Hello ${d.buyerName},`,
            "",
            "Our finance team sent the refund for your START: COLLECTIONS order.",
            "",
            "Refund Details from Finance",
            `Order ID: ${d.orderId}`,
            `Amount Sent: ${formatPeso(d.totalCentavos)}`,
            `Date Sent: ${when}`,
            noteLine(d.note),
            "",
            "Check your account balance to confirm receipt of the funds. We hope to connect with you again on future START: COLLECTIONS releases.",
            "",
            sign("START: COLLECTIONS Finance Team"),
          ]),
        },
      };
  }
}
