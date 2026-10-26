import { normalizeReference, parseCentavos } from "./parse";

// What the buyer's phone reports about its reading attempt, and what finance sees as a result.
// The reading happens on the buyer's device, so it is only a hint: finance still checks every receipt
// and OCR never confirms a payment (PRD FR03.03).
export const OCR_STATUSES = ["read", "unreadable", "timeout", "skipped"] as const;
export type OcrStatus = (typeof OCR_STATUSES)[number];
export type OcrResult = "not_checked" | "match" | "mismatch" | "unreadable";
export type FieldCheck = "match" | "mismatch" | "unknown";

export type OcrReading = { status: OcrStatus | null | undefined; amountCentavos: number | null; reference: string | null };
export type Expected = { totalCentavos: number; typedReference: string };

export function fieldChecks(reading: Pick<OcrReading, "amountCentavos" | "reference">, expected: Expected): { amount: FieldCheck; reference: FieldCheck } {
  const amount: FieldCheck = reading.amountCentavos === null ? "unknown" : reading.amountCentavos === expected.totalCentavos ? "match" : "mismatch";
  const reference: FieldCheck =
    reading.reference === null || normalizeReference(reading.reference) === ""
      ? "unknown"
      : normalizeReference(reading.reference) === normalizeReference(expected.typedReference)
        ? "match"
        : "mismatch";
  return { amount, reference };
}

// Not tried -> not_checked. Tried but nothing usable -> unreadable. Anything read that disagrees ->
// mismatch. Everything read agrees -> match. One field agrees and the other could not be read ->
// unreadable, because finance cannot rely on half a reading.
export function judgeOcr(reading: OcrReading, expected: Expected): OcrResult {
  if (!reading.status || reading.status === "skipped") return "not_checked";
  if (reading.status !== "read") return "unreadable";
  const { amount, reference } = fieldChecks(reading, expected);
  if (amount === "mismatch" || reference === "mismatch") return "mismatch";
  if (amount === "match" && reference === "match") return "match";
  return "unreadable";
}

// Values arriving from the browser as strings.
export function readingFromFields(status: string | null, amount: string | null, reference: string | null): OcrReading {
  const known = (OCR_STATUSES as readonly string[]).includes(status ?? "") ? (status as OcrStatus) : null;
  return { status: known, amountCentavos: amount ? parseCentavos(amount) : null, reference: reference?.trim() ? reference.trim() : null };
}
