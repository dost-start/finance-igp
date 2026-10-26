import { describe, expect, it } from "vitest";
import { checkoutSchema, isGoogleMapsLink } from "./checkout";
import { formatOrderId, ORDER_ID_PATTERN } from "./order-id";
import { lastFour, normalizePhone } from "./phone";

const valid = {
  name: "Juan Dela Cruz",
  university: "University of the Philippines Diliman",
  universityAddress: "Quezon City, Metro Manila",
  regionCode: "13",
  homeAddressLink: "https://maps.app.goo.gl/abc123",
  homeLandmark: "Beside the blue church",
  contactNumber: "0917 123 4567",
  email: "Juan@Example.com",
  emailConfirm: "juan@example.com ",
  consent: "on",
  idempotencyKey: "6f1c1d4e-2f4b-4c3a-9d55-0a1b2c3d4e5f",
  items: [{ productId: "3f262f80-c88b-4740-9fa7-2988d2bedd1c", size: "M", quantity: 2 }],
};

describe("order id (FR02.01)", () => {
  it("builds R + region + 6 digits with no dash", () => {
    expect(formatOrderId("13", 1)).toBe("R13000001");
    expect(formatOrderId("16", 123456)).toBe("R16123456");
    expect(ORDER_ID_PATTERN.test(formatOrderId("07", 42))).toBe(true);
  });
  it("rejects unknown regions and out-of-range numbers", () => {
    expect(() => formatOrderId("15", 1)).toThrow();
    expect(() => formatOrderId("13", 0)).toThrow();
    expect(() => formatOrderId("13", 1_000_000)).toThrow();
  });
});

describe("phone", () => {
  it("normalizes Philippine mobile formats and extracts the last 4 digits", () => {
    for (const raw of ["0917 123 4567", "+63 917 123 4567", "917-123-4567", "(0917) 1234567"]) {
      expect(normalizePhone(raw)).toBe("09171234567");
    }
    expect(lastFour("09171234567")).toBe("4567");
  });
  it("accepts other international numbers and rejects junk", () => {
    expect(normalizePhone("+65 9123 4567")).toBe("+6591234567");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("call me maybe")).toBeNull();
  });
});

describe("google maps link", () => {
  it("accepts Google Maps links only", () => {
    expect(isGoogleMapsLink("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isGoogleMapsLink("https://www.google.com/maps/place/Manila")).toBe(true);
    expect(isGoogleMapsLink("https://www.google.com.ph/maps?q=1,2")).toBe(true);
    expect(isGoogleMapsLink("http://maps.app.goo.gl/abc")).toBe(false);
    expect(isGoogleMapsLink("https://evil.example.com/maps")).toBe(false);
    expect(isGoogleMapsLink("https://google.com.evil.com/maps")).toBe(false);
    expect(isGoogleMapsLink("javascript:alert(1)")).toBe(false);
    expect(isGoogleMapsLink("not a url")).toBe(false);
  });
});

describe("checkout schema", () => {
  it("accepts a valid order and lowercases the email", () => {
    const r = checkoutSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("juan@example.com");
  });
  it("requires the email twice to match", () => {
    const r = checkoutSchema.safeParse({ ...valid, emailConfirm: "other@example.com" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["emailConfirm"]);
  });
  it("rejects a missing region, missing consent, empty cart and a filled honeypot", () => {
    expect(checkoutSchema.safeParse({ ...valid, regionCode: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, consent: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });
});
