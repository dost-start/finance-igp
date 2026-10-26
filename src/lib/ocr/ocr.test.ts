import { describe, expect, it } from "vitest";
import { fieldChecks, judgeOcr, readingFromFields } from "./judge";
import { amountField, extractAmount, extractReference, normalizeReference, parseCentavos } from "./parse";

// Text shaped like what the reader returns for typical e-wallet and bank screenshots.
const GCASH = "GCash Express Send | Amount | PHP 450.00 | Sent to | START DOST FINANCE | Date | Oct 27, 2026 10:15 AM | Reference No. | 8012 345 678 901 | Status | Successful";
const LANDBANK = "LANDBANK Transfer\nTotal Amount Debited PHP 1,350.00\nService Fee PHP 0.00\nReference No: LBP2026102712345\nDate 27 Oct 2026 14:02";
const GOTYME = "GoTyme Bank\nYou sent\nP2,100.50\nTransaction ID GT-9988-7766-5544\nBalance P5,400.00";
const NOISY = "Amcunt\nPHP 570.00\nRef 1002938475610";

describe("money parsing", () => {
  it("reads pesos with commas and decimals into centavos", () => {
    expect(parseCentavos("450.00")).toBe(45000);
    expect(parseCentavos("1,350.00")).toBe(135000);
    expect(parseCentavos("570")).toBe(57000);
    expect(parseCentavos("12.5")).toBe(1250);
    expect(parseCentavos("abc")).toBeNull();
  });
  it("writes centavos back as a plain decimal", () => {
    expect(amountField(135000)).toBe("1350.00");
    expect(amountField(2100050 / 10)).toBe("2100.05");
    expect(amountField(5)).toBe("0.05");
  });
});

describe("amount extraction", () => {
  it("finds the amount next to its label", () => {
    expect(extractAmount(GCASH)).toBe(45000);
    expect(extractAmount(LANDBANK)).toBe(135000);
    expect(extractAmount(GOTYME)).toBe(210050);
  });
  it("ignores fees and balances", () => {
    expect(extractAmount("Amount PHP 450.00\nService Fee PHP 15.00\nBalance PHP 9,999.00")).toBe(45000);
    expect(extractAmount("Fee 15.00\nBalance 5,000.00")).toBeNull();
  });
  it("takes a lone unlabelled amount but refuses to guess between several", () => {
    expect(extractAmount("PHP 570.00")).toBe(57000);
    expect(extractAmount("PHP 570.00\nPHP 80.00")).toBeNull();
  });
  it("does not mistake a time or a reference number for money", () => {
    expect(extractAmount("Sent 10.15 AM\nRef 1002938475610")).toBeNull();
  });
  it("copes with a garbled label when a currency sign is present", () => {
    expect(extractAmount(NOISY)).toBe(57000);
  });
});

describe("reference extraction", () => {
  it("reads the value after a label, including grouped digits", () => {
    expect(extractReference(GCASH)).toBe("8012 345 678 901");
    expect(extractReference(LANDBANK)).toBe("LBP2026102712345");
    expect(extractReference(GOTYME)).toBe("GT-9988-7766-5544");
    expect(extractReference(NOISY)).toBe("1002938475610");
  });
  it("prefers the reference the buyer typed when it appears anywhere on the receipt", () => {
    expect(extractReference("Some text 8012345678901 more text", "8012 345 678 901")).toBe("8012 345 678 901");
  });
  it("returns nothing when no reference is present", () => {
    expect(extractReference("Amount PHP 450.00\nStatus Successful")).toBeNull();
  });
});

describe("reference normalising", () => {
  it("ignores spaces, dashes and case, and look-alike characters", () => {
    expect(normalizeReference("gt-9988 7766")).toBe(normalizeReference("GT99887766"));
    expect(normalizeReference("LBP2O26")).toBe(normalizeReference("LBP2026"));
    expect(normalizeReference("A1B")).toBe(normalizeReference("AlB"));
  });
});

describe("judging a reading", () => {
  const expected = { totalCentavos: 45000, typedReference: "8012345678901" };
  it("is match only when both fields agree", () => {
    expect(judgeOcr({ status: "read", amountCentavos: 45000, reference: "8012 345 678 901" }, expected)).toBe("match");
  });
  it("is mismatch when anything that was read disagrees", () => {
    expect(judgeOcr({ status: "read", amountCentavos: 40000, reference: "8012 345 678 901" }, expected)).toBe("mismatch");
    expect(judgeOcr({ status: "read", amountCentavos: 45000, reference: "9999999999" }, expected)).toBe("mismatch");
    expect(judgeOcr({ status: "read", amountCentavos: null, reference: "9999999999" }, expected)).toBe("mismatch");
  });
  it("is unreadable when nothing usable was read or only half agrees", () => {
    expect(judgeOcr({ status: "read", amountCentavos: null, reference: null }, expected)).toBe("unreadable");
    expect(judgeOcr({ status: "read", amountCentavos: 45000, reference: null }, expected)).toBe("unreadable");
    expect(judgeOcr({ status: "timeout", amountCentavos: null, reference: null }, expected)).toBe("unreadable");
    expect(judgeOcr({ status: "unreadable", amountCentavos: null, reference: null }, expected)).toBe("unreadable");
  });
  it("is not_checked when the reader was never run", () => {
    expect(judgeOcr({ status: "skipped", amountCentavos: null, reference: null }, expected)).toBe("not_checked");
    expect(judgeOcr({ status: null, amountCentavos: 45000, reference: "8012345678901" }, expected)).toBe("not_checked");
  });
  it("gives per-field marks for the review screen", () => {
    expect(fieldChecks({ amountCentavos: 45000, reference: null }, expected)).toEqual({ amount: "match", reference: "unknown" });
    expect(fieldChecks({ amountCentavos: 1, reference: "8012345678901" }, expected)).toEqual({ amount: "mismatch", reference: "match" });
  });
  it("accepts browser strings and ignores unknown statuses", () => {
    expect(readingFromFields("read", "450.00", " 8012345678901 ")).toEqual({ status: "read", amountCentavos: 45000, reference: "8012345678901" });
    expect(readingFromFields("hacked", "450.00", "x").status).toBeNull();
    expect(readingFromFields(null, null, "")).toEqual({ status: null, amountCentavos: null, reference: null });
  });
});
