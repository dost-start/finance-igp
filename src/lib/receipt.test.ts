import { describe, expect, it } from "vitest";
import { MAX_RECEIPT_BYTES, checkReceipt, detectImageType, referenceSchema } from "./receipt";

const jpeg = (n = 10) => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...Array(n).fill(1)]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const webp = Uint8Array.from([...Buffer.from("RIFF"), 1, 2, 3, 4, ...Buffer.from("WEBP"), 0]);

describe("receipt checks", () => {
  it("recognizes jpeg, png and webp from the first bytes", () => {
    expect(detectImageType(jpeg())).toBe("image/jpeg");
    expect(detectImageType(png)).toBe("image/png");
    expect(detectImageType(webp)).toBe("image/webp");
  });
  it("rejects other types even if they look like an image by name", () => {
    expect(detectImageType(Uint8Array.from(Buffer.from("GIF89a...")))).toBeNull();
    expect(detectImageType(Uint8Array.from(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")))).toBeNull();
    expect(detectImageType(Uint8Array.from(Buffer.from("%PDF-1.7")))).toBeNull();
    expect(detectImageType(Uint8Array.from(Buffer.from("<?php echo 1;")))).toBeNull();
    expect(detectImageType(new Uint8Array(0))).toBeNull();
  });
  it("enforces the size limits", () => {
    expect(checkReceipt(jpeg())).toEqual({ ok: true, mime: "image/jpeg" });
    expect(checkReceipt(new Uint8Array(0))).toEqual({ ok: false, reason: "empty" });
    const big = new Uint8Array(MAX_RECEIPT_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(checkReceipt(big)).toEqual({ ok: false, reason: "too_large" });
    const atLimit = new Uint8Array(MAX_RECEIPT_BYTES);
    atLimit.set([0xff, 0xd8, 0xff]);
    expect(checkReceipt(atLimit).ok).toBe(true);
    expect(checkReceipt(Uint8Array.from(Buffer.from("not an image at all")))).toEqual({ ok: false, reason: "bad_type" });
  });
});

describe("reference number", () => {
  it("accepts typical bank and e-wallet references", () => {
    for (const r of ["1234 567 890123", "AB12-CD34", "InstaPay 000123456789", "  1234567890  "]) {
      expect(referenceSchema.safeParse(r).success).toBe(true);
    }
    expect(referenceSchema.parse("  1234567890  ")).toBe("1234567890");
  });
  it("rejects empty, too short, too long and odd characters", () => {
    for (const r of ["", "123", "x".repeat(41), "12345<script>", "ref;drop table"]) {
      expect(referenceSchema.safeParse(r).success).toBe(false);
    }
  });
});
