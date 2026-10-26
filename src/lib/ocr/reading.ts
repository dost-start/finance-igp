import type { OcrStatus } from "./judge";
import { amountField, extractAmount, extractReference } from "./parse";

// What the reader gave back, before we know which reference number the buyer typed.
export type RawRead = { status: "read"; text: string } | { status: "unreadable" | "timeout" };

export type ReceiptReading = { status: OcrStatus; amount: string | null; reference: string | null };

// Reading text is not the same as finding an amount and a reference in it: if neither could be
// found, say "unreadable" so finance knows to look by eye.
export function buildReading(raw: RawRead, typedReference: string): ReceiptReading {
  if (raw.status !== "read") return { status: raw.status, amount: null, reference: null };
  const centavos = extractAmount(raw.text);
  const reference = extractReference(raw.text, typedReference);
  if (centavos === null && reference === null) return { status: "unreadable", amount: null, reference: null };
  return { status: "read", amount: centavos === null ? null : amountField(centavos), reference };
}
