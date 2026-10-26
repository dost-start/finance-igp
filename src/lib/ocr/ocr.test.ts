import { describe, expect, it } from "vitest";
import { fieldChecks, judgeOcr, readingFromFields } from "./judge";
import { amountField, extractAmount, extractReference, normalizeReference, parseCentavos } from "./parse";

// Text shaped like what the reader returns for typical e-wallet and bank screenshots.
const GCASH = "GCash Express Send | Amount | PHP 450.00 | Sent to | START DOST FINANCE | Date | Oct 27, 2026 10:15 AM | Reference No. | 8012 345 678 901 | Status | Successful";
const LANDBANK = "LANDBANK Transfer\nTotal Amount Debited PHP 1,350.00\nService Fee PHP 0.00\nReference No: LBP2026102712345\nDate 27 Oct 2026 14:02";
const GOTYME = "GoTyme Bank\nYou sent\nP2,100.50\nTransaction ID GT-9988-7766-5544\nBalance P5,400.00";
const NOISY = "Amcunt\nPHP 570.00\nRef 1002938475610";

// Real GCash screenshots read with tesseract (found by QA): the reference was blurred, so the word
// after the label must not be taken as the reference; a history list must not give one amount.
const GCASH_BLURRED = "Sent via GCash\nAmount 800.00\nTotal Amount Sent P800.00\nGCash Reference Number\nTara\nJ 1319 (gco2e)";
const HISTORY_LIST = "Transaction History\nSend Money -100.00\nOnline Payment - Auto ... -1,500.00\nSend Money +1,500.00\nSend Money -10.00";

describe("receipts that are not a clean receipt", () => {
  it("keeps the amount but returns no reference when the number after the label is a word", () => {
    expect(extractAmount(GCASH_BLURRED)).toBe(80000);
    expect(extractReference(GCASH_BLURRED)).toBeNull();
  });
  it("gives no reference for 'History' after a Transaction label", () => {
    expect(extractReference(HISTORY_LIST)).toBeNull();
  });
  it("gives no single amount for a transaction history list", () => {
    expect(extractAmount(HISTORY_LIST)).toBeNull();
  });
  it("still reads a lone signed amount on a detail screen", () => {
    expect(extractAmount("Amount\n-800.00\nReference No. 8012 345 678 901")).toBe(80000);
  });
  it("rejects labelled references that are short or have no digits, but keeps long ones", () => {
    expect(extractReference("Reference No. ABCDEFGHIJ")).toBeNull();
    expect(extractReference("Reference No. 12345")).toBeNull();
    expect(extractReference("Transaction ID 123456")).toBeNull(); // 6 digits only count straight after Reference/Ref
    expect(extractReference("Reference No. 12345678")).toBe("12345678");
  });
  it("still finds the typed reference even when the label is unreadable", () => {
    expect(extractReference(GCASH_BLURRED.replace("Tara", "8012345678901"), "8012345678901")).toBe("8012345678901");
    expect(extractReference("Rfrence Nmbr\n8012345678901 x", "8012 345 678 901")).toBe("8012 345 678 901");
  });
  it("makes a blurred-reference receipt half read, so the verdict is unreadable and not a false mismatch", () => {
    const reading = { status: "read" as const, amountCentavos: extractAmount(GCASH_BLURRED), reference: extractReference(GCASH_BLURRED) };
    expect(judgeOcr(reading, { totalCentavos: 80000, typedReference: "8012345678901" })).toBe("unreadable");
  });
});

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

// Real receipts read with tesseract (found by QA). The label's line can carry the date and time after the number.
describe("references on real receipts", () => {
  it("stops at the date and time that follow a GCash 'Ref No.'", () => {
    const text = "Sent via GCash\nAmount 1.00\nTotal Amount Sent P1.00\nRef No. 0046567041072 Oct 27,2026 12:33 AM\nSend Again";
    expect(extractReference(text)).toBe("0046567041072");
    expect(extractAmount(text)).toBe(100);
  });
  it("reads a GCash 'Reference Number' and a GoTyme 'Reference No.'", () => {
    expect(extractReference("Express Send\nReference Number 0046346647561")).toBe("0046346647561");
    expect(extractReference("GoTyme Bank\nReference No. CAR261026120058269857\nStatus Successful")).toBe("CAR261026120058269857");
  });
  it("reads the 6-digit MariBank and InstaPay references straight after a Reference label", () => {
    expect(extractReference("Maribank\nReference Number 181965")).toBe("181965");
    expect(extractReference("Maribank\nReference Number 322312")).toBe("322312");
    expect(extractReference("Reference Number\n181965")).toBe("181965"); // value on the next line
  });
  it("understands the other ways a label is written", () => {
    expect(extractReference("Ref. No. 0046567041072")).toBe("0046567041072");
    expect(extractReference("Ref # 0046567041072")).toBe("0046567041072");
    expect(extractReference("Reference ID: 0046567041072")).toBe("0046567041072");
    expect(extractReference("Confirmation No. CNF12345678")).toBe("CNF12345678");
  });
  it("never takes a date, a time or a word as the reference", () => {
    for (const text of ["Ref No. Oct 27,2026 12:33 AM", "Ref No. 27/10/2026", "Ref No. 2026-10-27", "Ref No. 12:33 AM", "Reference Number 27 Oct 2026", "Reference Number\nTara", "Transaction History"]) {
      expect(extractReference(text), text).toBeNull();
    }
  });
  it("still returns the typed reference when it is on the receipt, whatever the label", () => {
    expect(extractReference("Ref No. Oct 27,2026\n0046567041072", "0046567041072")).toBe("0046567041072");
  });
  it("a 6-digit reference is judged against what was typed", () => {
    const reading = { status: "read" as const, amountCentavos: 57000, reference: extractReference("Amount PHP 570.00\nReference Number 181965") };
    expect(judgeOcr(reading, { totalCentavos: 57000, typedReference: "181965" })).toBe("match");
    expect(judgeOcr(reading, { totalCentavos: 57000, typedReference: "181966" })).toBe("mismatch");
  });
});
