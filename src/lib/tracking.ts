import { createHash, randomBytes } from "node:crypto";

// Tracking tokens (PRD FR05.01): 32 random bytes in the emailed link. Only the SHA-256 hash is
// stored, so a database leak cannot be used to open anyone's tracking page.
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

export function mintTrackingToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}

export function trackingUrl(token: string, siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"): string {
  return `${siteUrl.replace(/\/$/, "")}/track/${token}`;
}
