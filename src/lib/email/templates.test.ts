import { describe, expect, it } from "vitest";
import { renderEmail1, ticketFormUrl } from "./templates";

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
  const { subject, text } = renderEmail9({ buyerName: "Juan", reason: "Incorrect amount", deadline: rejectionDeadline(from, 48) }, "https://forms.example/ticket");
  it("states the reason and links the ticket form, without an Order ID", () => {
    expect(subject).toBe("[Action Required] START: COLLECTIONS - Payment Rejected");
    expect(text).toContain("Reason for Rejection: Incorrect amount");
    expect(text).toContain("Merch Ticket Form Link: https://forms.example/ticket");
    expect(text).not.toMatch(/R\d{8}/);
  });
  it("computes the deadline 48 hours later in Manila time", () => {
    expect(formatManila(rejectionDeadline(from, 48))).toContain("November 15, 2026");
    expect(text).toContain("Submission Deadline: November 15, 2026");
  });
  it("offers exactly the three agreed reasons", () => {
    expect(REJECT_REASONS).toEqual(["Unreadable receipt", "Incorrect amount", "Invalid reference number"]);
  });
});
