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
