import { describe, expect, it } from "vitest";
import { PAYMENT_STATES, attentionRank, csvCell, filtersToQuery, hasFilters, likePattern, parseFilters, statusesForPay, toCsv } from "./order-filters";
import { ORDER_STATUSES } from "@/db/schema";

describe("parseFilters", () => {
  it("reads valid values", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(parseFilters({ status: "in_production", pay: "confirmed", product: id, ocr: "attention", duplicate: "1", q: " juan ", page: "3" })).toEqual({
      status: "in_production",
      pay: "confirmed",
      product: id,
      ocr: "attention",
      duplicate: true,
      q: "juan",
      page: 3,
    });
  });
  it("ignores unknown or malformed values instead of passing them on", () => {
    const f = parseFilters({ status: "hacked", pay: "x", product: "1; drop table orders", ocr: "nope", duplicate: "yes", page: "-5" });
    expect(f).toEqual({ status: undefined, pay: undefined, product: undefined, ocr: undefined, duplicate: undefined, q: undefined, page: 1 });
    expect(hasFilters(f)).toBe(false);
  });
  it("takes the first of repeated values and caps page and search length", () => {
    expect(parseFilters({ status: ["canceled", "in_production"] }).status).toBe("canceled");
    expect(parseFilters({ page: "99999" }).page).toBe(400);
    expect(parseFilters({ page: "abc" }).page).toBe(1);
    expect(parseFilters({ q: "x".repeat(300) }).q).toHaveLength(80);
  });
  it("round-trips through the address", () => {
    const f = parseFilters({ status: "canceled", ocr: "mismatch", q: "ana", page: "2" });
    expect(filtersToQuery(f)).toBe("?status=canceled&ocr=mismatch&q=ana&page=2");
    expect(filtersToQuery(f, { page: 1 })).toBe("?status=canceled&ocr=mismatch&q=ana");
    expect(filtersToQuery(parseFilters({}))).toBe("");
  });
});

describe("payment states", () => {
  it("cover every status exactly once", () => {
    const all = PAYMENT_STATES.flatMap((p) => [...p.statuses]);
    expect([...all].sort()).toEqual([...ORDER_STATUSES].sort());
    expect(new Set(all).size).toBe(all.length);
  });
  it("map a state to its statuses", () => {
    expect(statusesForPay("verifying")).toEqual(["pending_payment"]);
    expect(statusesForPay("refund")).toContain("refund_successful");
  });
});

describe("likePattern", () => {
  it("escapes wildcard characters in a search", () => {
    expect(likePattern("50%_off")).toBe("%50\\%\\_off%");
    expect(likePattern("a\\b")).toBe("%a\\\\b%");
  });
});

describe("attentionRank", () => {
  const o = (status: Parameters<typeof attentionRank>[0]["status"], ocr: Parameters<typeof attentionRank>[0]["ocr"], duplicate = false) => attentionRank({ status, ocr, duplicate });
  it("puts reused references first, then mismatches, then unreadable, then the rest, then handled orders", () => {
    expect(o("pending_payment", "match", true)).toBe(0);
    expect(o("pending_payment", "mismatch")).toBe(1);
    expect(o("pending_payment", "unreadable")).toBe(2);
    expect(o("pending_payment", "match")).toBe(3);
    expect(o("pending_payment", "not_checked")).toBe(3);
    expect(o("in_production", "mismatch")).toBe(4);
  });
});

describe("CSV", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell(450)).toBe("450");
    expect(csvCell(null)).toBe("");
  });
  it("defuses spreadsheet formulas typed by buyers", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+639171234567")).toBe("'+639171234567");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("normal text")).toBe("normal text");
  });
  it("starts with a byte order mark and ends rows with CRLF", () => {
    const csv = toCsv([["a", "b"], ["1", "2"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1)).toBe("a,b\r\n1,2\r\n");
  });
});
