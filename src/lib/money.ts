// Prices and totals are integer centavos everywhere. Only the display layer shows pesos.
export function formatPeso(centavos: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  }).format(centavos / 100);
}

export function lineTotal(unitPriceCentavos: number, quantity: number): number {
  if (!Number.isInteger(unitPriceCentavos) || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Invalid price or quantity");
  }
  return unitPriceCentavos * quantity;
}
