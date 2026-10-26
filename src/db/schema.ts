import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// One counter for all Order IDs across regions (PRD FR02.01). Gaps from rejected orders are fine.
export const orderNumberSeq = pgSequence("order_number_seq", {
  startWith: 1,
  increment: 1,
  minValue: 1,
  maxValue: 999999,
  cycle: false,
});

export const ORDER_STATUSES = [
  "order_received",
  "pending_payment",
  "payment_confirmation",
  "in_production",
  "out_for_shipping",
  "received_successfully",
  "canceled",
  "refund_in_process",
  "refund_successful",
  "payment_rejected",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderStatus = pgEnum("order_status", ORDER_STATUSES);
export const ocrResult = pgEnum("ocr_result", ["not_checked", "match", "mismatch", "unreadable"]);
export const adminRole = pgEnum("admin_role", ["finance", "tech"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// Money is stored in centavos (integer) so totals never drift.
export type ProductSize = { size: string; available: boolean };
export type ProductImage = { url: string; kind: "flat" | "model" };

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  productType: text("product_type").notNull(), // tshirt, jacket, lanyard, tote, sticker
  designVariant: text("design_variant"),
  priceCentavos: integer("price_centavos").notNull(),
  sizes: jsonb("sizes").$type<ProductSize[]>().notNull(),
  images: jsonb("images").$type<ProductImage[]>().notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
}).enableRLS();

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(), // internal, used in the pay-page URL
    orderId: text("order_id").notNull().unique(), // R + region + 6 digits, shown after verification only
    regionCode: text("region_code").notNull(),
    buyerName: text("buyer_name").notNull(),
    university: text("university").notNull(),
    universityAddress: text("university_address").notNull(),
    homeAddressLink: text("home_address_link").notNull(),
    homeLandmark: text("home_landmark").notNull(),
    contactNumber: text("contact_number").notNull(),
    contactLast4: text("contact_last4").notNull(),
    email: text("email").notNull(),
    totalCentavos: integer("total_centavos").notNull(),
    status: orderStatus("status").notNull().default("order_received"),
    trackingTokenHash: text("tracking_token_hash"), // sha-256 of the emailed token, minted at confirmation
    idempotencyKey: text("idempotency_key").unique(), // one checkout page load = one order, even on double taps
    privacyConsentAt: timestamp("privacy_consent_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_created_idx").on(t.createdAt)],
).enableRLS();

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderUuid: uuid("order_uuid").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id),
    size: text("size").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCentavos: integer("unit_price_centavos").notNull(), // price snapshot at order time
  },
  (t) => [index("order_items_order_idx").on(t.orderUuid)],
).enableRLS();

export const adminAccounts = pgTable("admin_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: adminRole("role").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}).enableRLS();

export const paymentProofs = pgTable("payment_proofs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderUuid: uuid("order_uuid").notNull().unique().references(() => orders.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(), // the payment channel the buyer chose (the "bank" field)
  referenceNumber: text("reference_number").notNull(),
  driveFileId: text("drive_file_id"),
  ocrAmount: text("ocr_amount"),
  ocrReference: text("ocr_reference"),
  ocrResult: ocrResult("ocr_result").notNull().default("not_checked"),
  verifiedBy: uuid("verified_by").references(() => adminAccounts.id),
  createdAt: createdAt(),
}).enableRLS();

export const statusEvents = pgTable(
  "status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderUuid: uuid("order_uuid").notNull().references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatus("status").notNull(),
    changedBy: uuid("changed_by").references(() => adminAccounts.id), // null = system
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("status_events_order_idx").on(t.orderUuid)],
).enableRLS();

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").notNull().references(() => adminAccounts.id),
    action: text("action").notNull(),
    orderUuid: uuid("order_uuid").references(() => orders.id, { onDelete: "set null" }),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
).enableRLS();

export const emailLogs = pgTable(
  "email_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderUuid: uuid("order_uuid").references(() => orders.id, { onDelete: "set null" }),
    template: text("template").notNull(), // one of the 9 templates in PRD Appendix F
    recipient: text("recipient").notNull(),
    result: text("result").notNull(), // sent | failed: reason
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_logs_sent_idx").on(t.sentAt)],
).enableRLS();

// Payment QR codes are data, not code, so finance can change them without a deploy (NF10).
export const paymentChannels = pgTable("payment_channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // gcash, landbank, gotyme, maribank
  label: text("label").notNull(),
  qrDriveFileId: text("qr_drive_file_id"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}).enableRLS();

// Failed order-tracking attempts per hashed key (visitor address or Order ID) inside a time window,
// so the last-4-digits lookup cannot be guessed (PRD FR05.05). Written by the server only.
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

// Store-wide switches, one row per setting. Today: "store_locked" = "true" | "false" (PRD FR07.05).
// Written only by signed-in admins, read by the server on every order and payment.
export const storeSettings = pgTable("store_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => adminAccounts.id),
}).enableRLS();

export const nextOrderNumber = sql`nextval('order_number_seq')`;
