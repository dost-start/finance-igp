import { createHmac, timingSafeEqual } from "node:crypto";

// Product photos uploaded in the admin live in the same private Drive folder as receipts, but they are shown to
// every shopper, so they are served through /api/product-photo/<file id>.<signature>. The signature is an HMAC
// of the file id with the site's secret: only photos this app uploaded have one, so that route can never be used
// to read a receipt or any other file. Server only (it uses node:crypto); the shape check for the form is in
// product-edit.ts.
const SIG_LENGTH = 32;

function sign(fileId: string, secret: string): string {
  return createHmac("sha256", secret).update(`product-photo:${fileId}`).digest("hex").slice(0, SIG_LENGTH);
}

export function productPhotoUrl(fileId: string, secret: string): string {
  return `/api/product-photo/${fileId}.${sign(fileId, secret)}`;
}

// The Drive file id from a token, or null when the signature is wrong or the token is not well formed.
export function verifyPhotoToken(token: string, secret: string): string | null {
  const m = /^([A-Za-z0-9_-]{6,80})\.([0-9a-f]{32})$/.exec(token);
  if (!m) return null;
  const expected = Buffer.from(sign(m[1], secret));
  const given = Buffer.from(m[2]);
  return given.length === expected.length && timingSafeEqual(given, expected) ? m[1] : null;
}
