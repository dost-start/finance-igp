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

export function rejectionDeadline(from: Date, hours = Number(process.env.REJECTION_DEADLINE_HOURS) || 48): Date {
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
