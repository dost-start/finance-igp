import { z } from "zod";
import { MAX_LINES, MAX_QTY } from "./cart";
import { normalizePhone } from "./phone";
import { isRegionCode } from "./regions";

// Finance staff open the home-address link, so only Google Maps links are accepted.
export function isGoogleMapsLink(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "maps.app.goo.gl" || host === "maps.google.com") return true;
    if (host === "goo.gl") return u.pathname.startsWith("/maps");
    const isGoogle = host === "google.com" || host === "www.google.com" || /^(www\.)?google\.com\.[a-z]{2}$/.test(host);
    return isGoogle && u.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

const lower = z.string().trim().toLowerCase();

export const checkoutItemSchema = z.object({
  productId: z.uuid(),
  size: z.string().min(1).max(30),
  quantity: z.number().int().min(1).max(MAX_QTY),
});

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(120),
    university: z.string().trim().min(2, "Enter your university").max(160),
    universityAddress: z.string().trim().min(5, "Enter your university address").max(300),
    regionCode: z.string().refine(isRegionCode, "Choose the region of your university"),
    homeAddressLink: z
      .string()
      .trim()
      .max(500)
      .refine(isGoogleMapsLink, "Paste a Google Maps link, like https://maps.app.goo.gl/... or https://www.google.com/maps/..."),
    homeLandmark: z.string().trim().min(2, "Add a landmark near your home").max(200),
    contactNumber: z.string().trim().refine((v) => normalizePhone(v) !== null, "Enter a valid mobile number, like 0917 123 4567"),
    email: lower.pipe(z.email("Enter a valid email address")).pipe(z.string().max(200)),
    emailConfirm: lower,
    consent: z.string().refine((v) => v === "on", "Please confirm you have read the Privacy Notice"),
    idempotencyKey: z.uuid(),
    website: z.string().max(0).optional(), // honeypot: real people never fill it
    items: z.array(checkoutItemSchema).min(1, "Your cart is empty").max(MAX_LINES),
  })
  .refine((v) => v.email === v.emailConfirm, { path: ["emailConfirm"], message: "The two email addresses do not match" });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const FIELD_NAMES = [
  "name",
  "university",
  "universityAddress",
  "regionCode",
  "homeAddressLink",
  "homeLandmark",
  "contactNumber",
  "email",
  "emailConfirm",
  "consent",
] as const;
