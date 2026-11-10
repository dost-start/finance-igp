// The shop's shelves, in the order they appear on /shop. Each product type lands on one shelf; a type not listed
// here goes on a last "More" shelf so a new kind of item never disappears. Product pages use the same grouping
// for their category tag and their "More ..." row.
export const SHELVES = [
  { id: "apparel", label: "Apparel", types: ["tshirt", "jacket"] },
  { id: "lanyards", label: "Lanyards", types: ["lanyard"] },
  { id: "bags", label: "Bags", types: ["tote"] },
  { id: "pins", label: "Pins", types: ["pin"] },
  { id: "stickers", label: "Stickers", types: ["sticker"] },
] as const;

export const MORE_SHELF = { id: "more", label: "More" } as const;

export function shelfOf(productType: string): { id: string; label: string } {
  const shelf = SHELVES.find((s) => (s.types as readonly string[]).includes(productType));
  return shelf ? { id: shelf.id, label: shelf.label } : MORE_SHELF;
}

// Stickers and pins are cut-out art, so they sit inside their frame; garments and the rest fill it.
export const isCutout = (productType: string) => productType === "sticker" || productType === "pin";
