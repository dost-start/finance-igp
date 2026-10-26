// Labels for the email log screen.
export const TEMPLATE_LABEL: Record<string, string> = {
  "1-order-received": "1 Order received",
  "2-payment-confirmation": "2 Payment confirmation",
  "3-in-production": "3 In production",
  "4-out-for-shipping": "4 Out for shipping",
  "5-order-delivered": "5 Order delivered",
  "6-canceled": "6 Canceled",
  "7-refund-in-process": "7 Refund in process",
  "8-refund-successful": "8 Refund successful",
  "9-payment-rejected": "9 Payment rejected",
};

export const templateLabel = (t: string): string => TEMPLATE_LABEL[t] ?? t;

// "sent" is fine. Anything else (failed, skipped, blocked by the daily limit) is a buyer who did
// not get an email, so finance needs to see it.
export const isProblem = (result: string): boolean => result !== "sent";

export function resultLabel(result: string): string {
  if (result === "sent") return "Sent";
  if (result.startsWith("failed")) return `Failed (${result.replace(/^failed:?\s*/, "") || "unknown reason"})`;
  if (result.startsWith("blocked")) return "Not sent: daily email limit reached";
  if (result.startsWith("skipped")) return "Not sent: email is not set up on this server";
  return result;
}
