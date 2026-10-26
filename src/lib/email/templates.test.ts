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
