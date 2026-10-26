import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";

// The order list's filters live in the address (?status=...&ocr=...), so a filtered view can be
// bookmarked, shared with another finance member, and reused by the CSV export. Everything arriving
// from the address is untrusted: unknown values are ignored, never passed to the database.
export const PAYMENT_STATES = [
  { key: "no_receipt", label: "No receipt yet", statuses: ["order_received"] },
  { key: "verifying", label: "Awaiting verification", statuses: ["pending_payment"] },
  { key: "confirmed", label: "Payment confirmed", statuses: ["payment_confirmation", "in_production", "out_for_shipping", "received_successfully"] },
  { key: "rejected", label: "Payment rejected", statuses: ["payment_rejected"] },
  { key: "refund", label: "Canceled or refunded", statuses: ["canceled", "refund_in_process", "refund_successful"] },
] as const satisfies readonly { key: string; label: string; statuses: readonly OrderStatus[] }[];
export type PaymentStateKey = (typeof PAYMENT_STATES)[number]["key"];

export const OCR_FILTERS = [
  { key: "attention", label: "Needs a closer look (not matching or unreadable)" },
  { key: "match", label: "Matching" },
  { key: "mismatch", label: "Not matching" },
  { key: "unreadable", label: "Unreadable" },
  { key: "not_checked", label: "Not checked" },
] as const;
export type OcrFilterKey = (typeof OCR_FILTERS)[number]["key"];

export const PAGE_SIZE = 50;
export const MAX_PAGE = 400;

export type OrderFilters = {
  status?: OrderStatus;
  pay?: PaymentStateKey;
  product?: string; // product id
  ocr?: OcrFilterKey;
  duplicate?: boolean;
  q?: string;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(params: Params): OrderFilters {
  const status = one(params.status);
  const pay = one(params.pay);
  const product = one(params.product);
  const ocr = one(params.ocr);
  const q = one(params.q)?.trim().slice(0, 80);
  const page = Number.parseInt(one(params.page) ?? "1", 10);
  return {
    status: (ORDER_STATUSES as readonly string[]).includes(status ?? "") ? (status as OrderStatus) : undefined,
    pay: PAYMENT_STATES.some((p) => p.key === pay) ? (pay as PaymentStateKey) : undefined,
    product: product && UUID.test(product) ? product.toLowerCase() : undefined,
    ocr: OCR_FILTERS.some((o) => o.key === ocr) ? (ocr as OcrFilterKey) : undefined,
    duplicate: one(params.duplicate) === "1" ? true : undefined,
    q: q ? q : undefined,
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

export const hasFilters = (f: OrderFilters): boolean => Boolean(f.status || f.pay || f.product || f.ocr || f.duplicate || f.q);

export function filtersToQuery(f: OrderFilters, extra: { page?: number } = {}): string {
  const p = new URLSearchParams();
  if (f.status) p.set("status", f.status);
  if (f.pay) p.set("pay", f.pay);
  if (f.product) p.set("product", f.product);
  if (f.ocr) p.set("ocr", f.ocr);
  if (f.duplicate) p.set("duplicate", "1");
  if (f.q) p.set("q", f.q);
  const page = extra.page ?? f.page;
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const statusesForPay = (pay: PaymentStateKey): readonly OrderStatus[] => PAYMENT_STATES.find((p) => p.key === pay)?.statuses ?? [];

// Escapes % _ \ so a search for "50%" finds "50%" instead of everything.
export const likePattern = (q: string): string => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

// How urgently an order needs a person: reused reference first, then not matching, then unreadable,
// then the rest of the waiting orders. Orders not waiting for verification come last.
export function attentionRank(o: { status: OrderStatus; ocr: "not_checked" | "match" | "mismatch" | "unreadable" | null; duplicate: boolean }): number {
  if (o.status !== "pending_payment") return 4;
  if (o.duplicate) return 0;
  if (o.ocr === "mismatch") return 1;
  if (o.ocr === "unreadable") return 2;
  return 3;
}

// CSV (PRD FR06.05). A cell that starts with = + - @ would run as a formula when opened in Excel or
// Sheets, and buyers type some of these values, so such cells are prefixed with an apostrophe.
export function csvCell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// The byte order mark makes Excel read the file as UTF-8, so peso signs and names show correctly.
export const toCsv = (rows: (string | number | null | undefined)[][]): string => `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
