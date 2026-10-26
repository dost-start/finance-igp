import { z } from "zod";

// Receipt uploads. The browser shrinks images to about 1 MB first (src/lib/image-resize.ts),
// but nothing from the browser is trusted: the server checks size and the real file type from
// the first bytes. The cap stays under Vercel's 4.5 MB request body limit.
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export const IMAGE_EXTENSION: Record<ImageMime, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Magic-byte check: the declared file type and file name are ignored.
export function detectImageType(b: Uint8Array): ImageMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "image/png";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export type ReceiptCheck = { ok: true; mime: ImageMime } | { ok: false; reason: "empty" | "too_large" | "bad_type" };

export function checkReceipt(bytes: Uint8Array): ReceiptCheck {
  if (bytes.length === 0) return { ok: false, reason: "empty" };
  if (bytes.length > MAX_RECEIPT_BYTES) return { ok: false, reason: "too_large" };
  const mime = detectImageType(bytes);
  return mime ? { ok: true, mime } : { ok: false, reason: "bad_type" };
}

// Bank and e-wallet reference numbers are letters, digits and a few separators.
export const referenceSchema = z
  .string()
  .trim()
  .min(4, "Enter the reference number from your receipt")
  .max(40, "That reference number is too long")
  .regex(/^[A-Za-z0-9 \-_/]+$/, "Use only letters, numbers, spaces and dashes");

export const CHANNEL_KEY = /^[a-z0-9]{2,20}$/;

// What the buyer's phone reports about reading the receipt. Anything odd fails validation and the
// order simply gets no reading, so a strange value can never block a submit.
export const ocrFieldsSchema = z.object({
  status: z.enum(["read", "unreadable", "timeout", "skipped"]).optional(),
  amount: z
    .string()
    .regex(/^\d{1,9}(\.\d{2})?$/)
    .optional(),
  reference: z
    .string()
    .trim()
    .max(60)
    .regex(/^[A-Za-z0-9 \-_/]+$/)
    .optional(),
});
