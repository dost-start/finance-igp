import { describe, expect, it } from "vitest";
import { renderEmail1, ticketFormUrl } from "./templates";

const TEST_HOURS = 10; // a number for the tests only; the real deadline rule comes from finance
const TEST_TIMEFRAME = "TEST TIMEFRAME TEXT"; // a placeholder for the tests only

const data = {
  buyerName: "Juan Dela Cruz",
  items: [{ name: "START T-Shirt, Design A", size: "M", quantity: 2 }],
  totalCentavos: 99000,
  universityAddress: "Quezon City",
  homeAddressLink: "https://maps.app.goo.gl/x",
  homeLandmark: "Near the chapel",
};

describe("Email 1 (order received)", () => {
  const { subject, text } = renderEmail1(data, "https://forms.example/ticket");

  it("matches the approved wording and shows the amount due", () => {
    expect(subject).toBe("START: COLLECTIONS Order Received - Payment Pending Verification");
    expect(text).toContain("Hello Juan Dela Cruz,");
    expect(text).toContain("Total Amount Due: ₱990");
    expect(text).toContain("- 2 x START T-Shirt, Design A (Size: M)");
    expect(text).toContain("Your Order ID will be sent once your payment has been finalized by the Finance Team.");
  });
  it("never contains an Order ID, a shipping fee or a delivery method line", () => {
    expect(text).not.toMatch(/R\d{8}/);
    expect(text).not.toMatch(/Order ID:/i);
    expect(text).not.toMatch(/Shipping Fee|Method of Delivery/i);
  });
  it("is clearly no-reply and points to the ticket form", () => {
    expect(text).toContain("no-reply address. Please do not reply.");
    expect(text).toContain("https://forms.example/ticket");
  });
  it("still reads well while the ticket form link is missing", () => {
    expect(renderEmail1(data, null).text).toContain("merch ticket form (link coming soon)");
    expect(ticketFormUrl({ MERCH_TICKET_FORM_URL: "" })).toBeNull();
  });
});

import { REJECT_REASONS, formatManila, rejectionDeadline, renderEmail2, renderEmail9 } from "./templates";

describe("Email 2 (payment confirmation)", () => {
  const { subject, text } = renderEmail2(
    { buyerName: "Juan", orderId: "R13000001", trackingUrl: "https://shop.example/track/abc", items: data.items, totalCentavos: 99000 },
    "https://forms.example/ticket",
  );
  it("shows the Order ID, the tracking link and the verified total", () => {
    expect(subject).toBe("START: COLLECTIONS Payment Confirmed - Order ID R13000001");
    expect(text).toContain("Order ID: R13000001");
    expect(text).toContain("Tracking Link: https://shop.example/track/abc");
    expect(text).toContain("Total Verified: ₱990");
    expect(text).toContain("last 4 digits of your contact number");
  });
  it("is no-reply", () => {
    expect(text).toContain("no-reply address. Please do not reply.");
  });
});

describe("Email 9 (payment rejected)", () => {
  const from = new Date("2026-11-13T02:00:00Z");
  const { subject, text } = renderEmail9({ buyerName: "Juan", reason: "Incorrect amount", deadline: rejectionDeadline(from, TEST_HOURS) }, "https://forms.example/ticket");
  it("states the reason and links the ticket form, without an Order ID", () => {
    expect(subject).toBe("[Action Required] START: COLLECTIONS - Payment Rejected");
    expect(text).toContain("Reason for Rejection: Incorrect amount");
    expect(text).toContain("Merch Ticket Form Link: https://forms.example/ticket");
    expect(text).not.toMatch(/R\d{8}/);
  });
  it("prints the deadline the given number of hours later, in Manila time", () => {
    expect(formatManila(rejectionDeadline(from, TEST_HOURS))).toContain("November 13, 2026 at 8:00 PM");
    expect(text).toContain("Submission Deadline: November 13, 2026 at 8:00 PM");
    expect(formatManila(rejectionDeadline(from, 36))).toContain("November 14, 2026");
  });
  it("offers exactly the three agreed reasons", () => {
    expect(REJECT_REASONS).toEqual(["Unreadable receipt", "Incorrect amount", "Invalid reference number"]);
  });
});

import { STATUS_EMAIL_STATUSES, cleanNote, isStatusEmailStatus, renderStatusEmail, statusEmailConfig } from "./templates";

describe("Emails 3 to 8 (status updates)", () => {
  const base = {
    buyerName: "Juan Dela Cruz",
    orderId: "R13000001",
    totalCentavos: 99000,
    universityAddress: "Quezon City",
    homeAddressLink: "https://maps.app.goo.gl/x",
    homeLandmark: "Near the chapel",
    at: new Date("2026-11-13T02:00:00Z"),
  };
  const config = { siteUrl: "https://shop.example", refundTimeframe: TEST_TIMEFRAME };
  const form = "https://forms.example/ticket";
  const render = (s: (typeof STATUS_EMAIL_STATUSES)[number], note?: string) => renderStatusEmail(s, { ...base, note }, form, config);

  it("covers exactly the six statuses after confirmation, each with its own template name", () => {
    expect(STATUS_EMAIL_STATUSES).toEqual(["in_production", "out_for_shipping", "received_successfully", "canceled", "refund_in_process", "refund_successful"]);
    expect(STATUS_EMAIL_STATUSES.map((s) => render(s).template)).toEqual(["3-in-production", "4-out-for-shipping", "5-order-delivered", "6-canceled", "7-refund-in-process", "8-refund-successful"]);
    expect(isStatusEmailStatus("in_production")).toBe(true);
    expect(isStatusEmailStatus("payment_confirmation")).toBe(false);
  });

  it("uses the approved subjects", () => {
    expect(render("in_production").content.subject).toBe("START: COLLECTIONS - In Production");
    expect(render("out_for_shipping").content.subject).toBe("START: COLLECTIONS - Out for Shipping");
    expect(render("received_successfully").content.subject).toBe("Order Delivered: Thank You for Supporting START: COLLECTIONS");
    expect(render("canceled").content.subject).toBe("START: COLLECTIONS - Order Canceled");
    expect(render("refund_in_process").content.subject).toBe("START: COLLECTIONS - Refund in Process");
    expect(render("refund_successful").content.subject).toBe("START: COLLECTIONS - Refund Successful");
  });

  it("names the buyer and the Order ID in every email and stays no-reply", () => {
    for (const s of STATUS_EMAIL_STATUSES) {
      const { text } = render(s).content;
      expect(text).toContain("Hello Juan Dela Cruz,");
      expect(text).toContain("Order ID: R13000001");
      expect(text).toContain("no-reply address. Please do not reply.");
      expect(text).toContain(form);
    }
  });

  it("puts finance's note on its own line when given, and leaves no gap when not", () => {
    expect(render("in_production", "Batch 2 of 3").content.text).toContain("\nNote from finance: Batch 2 of 3\n");
    const none = render("in_production").content.text;
    expect(none).not.toContain("Note from finance");
    expect(none).not.toContain("undefined");
    expect(none).not.toMatch(/\{\{/);
  });

  it("links to the tracking page rather than a personal link", () => {
    expect(render("in_production").content.text).toContain("https://shop.example/track");
    expect(render("out_for_shipping").content.text).toContain("https://shop.example/track");
  });

  it("shows the delivery details in the shipping email", () => {
    const { text } = render("out_for_shipping").content;
    expect(text).toContain("Delivery Address: Quezon City");
    expect(text).toContain("https://maps.app.goo.gl/x");
    expect(text).toContain("Near the chapel");
  });

  it("uses the note as the cancellation reason, with a fallback", () => {
    expect(render("canceled", "Out of stock").content.text).toContain("Reason for Cancellation: Out of stock");
    expect(render("canceled").content.text).toContain("Reason for Cancellation: Canceled by the finance team");
    expect(render("canceled").content.text).toContain("https://shop.example");
  });

  it("states the refund amount and the fixed timeframe", () => {
    const e7 = render("refund_in_process").content.text;
    expect(e7).toContain("Refund Amount: ₱990");
    expect(e7).toContain(`Refund Timeframe: ${TEST_TIMEFRAME}`);
    expect(render("refund_successful").content.text).toContain("Amount Sent: ₱990");
    expect(render("refund_successful").content.text).toContain("Date Sent: November 13, 2026");
  });

  it("falls back gracefully while the ticket form link is missing", () => {
    const { text } = renderStatusEmail("received_successfully", base, null, config).content;
    expect(text).toContain("merch ticket form link will be added soon");
    expect(text).toContain("link coming soon");
  });

  it("reads the refund timeframe from the environment and assumes nothing when it is unset", () => {
    expect(statusEmailConfig({ NEXT_PUBLIC_SITE_URL: "https://x.example/" })).toEqual({ siteUrl: "https://x.example", refundTimeframe: null });
    expect(statusEmailConfig({ REFUND_TIMEFRAME: "   " }).refundTimeframe).toBeNull();
    expect(statusEmailConfig({ REFUND_TIMEFRAME: TEST_TIMEFRAME }).refundTimeframe).toBe(TEST_TIMEFRAME);
  });

  it("will not write a refund email without a timeframe, and never prints a blank one", () => {
    expect(() => renderStatusEmail("refund_in_process", base, form, { siteUrl: "https://shop.example", refundTimeframe: null })).toThrow("Refund timeframe is not set yet");
    for (const s of STATUS_EMAIL_STATUSES.filter((x) => x !== "refund_in_process")) {
      expect(() => renderStatusEmail(s, base, form, { siteUrl: "https://shop.example", refundTimeframe: null })).not.toThrow();
    }
  });

  it("tidies a note: one paragraph, 300 characters at most, empty becomes nothing", () => {
    expect(cleanNote("  hello \n\n  world  ")).toBe("hello world");
    expect(cleanNote("x".repeat(500))).toHaveLength(300);
    expect(cleanNote("   ")).toBeNull();
    expect(cleanNote(null)).toBeNull();
  });
});

import { SETTING_MISSING, missingSetting, rejectionDeadlineHours } from "./templates";

describe("values finance has not given yet", () => {
  it("treats an unset, empty or invalid deadline as not set, and never assumes a number", () => {
    expect(rejectionDeadlineHours({})).toBeNull();
    expect(rejectionDeadlineHours({ REJECTION_DEADLINE_HOURS: "" })).toBeNull();
    for (const bad of ["abc", "0", "-5", "1.5", "12h", "99999"]) expect(rejectionDeadlineHours({ REJECTION_DEADLINE_HOURS: bad })).toBeNull();
    expect(rejectionDeadlineHours({ REJECTION_DEADLINE_HOURS: "36" })).toBe(36);
  });

  it("refuses Reject payment with a plain message while the deadline is unset, and allows it once set", () => {
    expect(missingSetting("reject_payment", {})).toBe("Submission deadline is not set yet, ask tech.");
    expect(missingSetting("reject_payment", { REJECTION_DEADLINE_HOURS: "x" })).toBe(SETTING_MISSING.rejectionDeadline);
    expect(missingSetting("reject_payment", { REJECTION_DEADLINE_HOURS: "36" })).toBeNull();
  });

  it("refuses Refund in Process with a plain message while the timeframe is unset, and allows it once set", () => {
    expect(missingSetting("refund_in_process", {})).toBe("Refund timeframe is not set yet, ask tech.");
    expect(missingSetting("refund_in_process", { REFUND_TIMEFRAME: " " })).toBe(SETTING_MISSING.refundTimeframe);
    expect(missingSetting("refund_in_process", { REFUND_TIMEFRAME: TEST_TIMEFRAME })).toBeNull();
  });

  it("does not hold up anything else: the other status emails need neither value", () => {
    expect(missingSetting("refund_in_process", {})).not.toBe(SETTING_MISSING.rejectionDeadline);
    expect(missingSetting("reject_payment", { REFUND_TIMEFRAME: TEST_TIMEFRAME })).toBe(SETTING_MISSING.rejectionDeadline);
  });
});
