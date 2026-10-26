import { isRegionCode } from "./regions";

// PRD FR02.01: R + 2-digit PSGC region code of the buyer's university + 6-digit sequential
// number, no dash (R13000001). One counter runs across all regions.
export const ORDER_ID_PATTERN = /^R\d{8}$/;

export function formatOrderId(regionCode: string, sequence: number): string {
  if (!isRegionCode(regionCode)) throw new Error("Unknown region code");
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999999) throw new Error("Order number out of range");
  return `R${regionCode}${String(sequence).padStart(6, "0")}`;
}
