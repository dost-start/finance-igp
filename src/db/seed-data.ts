// PLACEHOLDER catalog from PRD Appendix G. Names, prices and sizes are stand-ins until
// finance confirms the real ones (they load as data, no code change). Prices are centavos.
import type { ProductSize } from "./schema";

const sizes = (list: string[]): ProductSize[] => list.map((size) => ({ size, available: true }));
const APPAREL = sizes(["S", "M", "L", "XL", "2XL"]);
const ONE_SIZE = sizes(["One size"]);

type Seed = {
  slug: string;
  name: string;
  productType: string;
  designVariant: string | null;
  priceCentavos: number;
  sizes: ProductSize[];
};

export const PRODUCTS: Seed[] = [
  { slug: "tshirt-design-a", name: "START T-Shirt, Design A", productType: "tshirt", designVariant: "A", priceCentavos: 45000, sizes: APPAREL },
  { slug: "tshirt-design-b", name: "START T-Shirt, Design B", productType: "tshirt", designVariant: "B", priceCentavos: 45000, sizes: APPAREL },
  { slug: "jacket", name: "START Jacket", productType: "jacket", designVariant: null, priceCentavos: 120000, sizes: APPAREL },
  { slug: "lanyard-dark", name: "START Lanyard, Dark", productType: "lanyard", designVariant: "Dark", priceCentavos: 12000, sizes: ONE_SIZE },
  { slug: "lanyard-light", name: "START Lanyard, Light", productType: "lanyard", designVariant: "Light", priceCentavos: 12000, sizes: ONE_SIZE },
  { slug: "tote-dark", name: "START Tote Bag, Dark", productType: "tote", designVariant: "Dark", priceCentavos: 25000, sizes: ONE_SIZE },
  { slug: "tote-light", name: "START Tote Bag, Light", productType: "tote", designVariant: "Light", priceCentavos: 25000, sizes: ONE_SIZE },
  ...Array.from({ length: 10 }, (_, i): Seed => {
    const n = String(i + 1).padStart(2, "0");
    return { slug: `sticker-${n}`, name: `START Sticker ${n}`, productType: "sticker", designVariant: n, priceCentavos: 3000, sizes: ONE_SIZE };
  }),
];

// Four payment channels the buyer can choose from, to avoid transfer fees. QR images are
// uploaded to Drive in sub-sprint 1D, never committed to git.
export const PAYMENT_CHANNELS = [
  { key: "gcash", label: "GCash", sortOrder: 1 },
  { key: "landbank", label: "Landbank", sortOrder: 2 },
  { key: "gotyme", label: "GoTyme", sortOrder: 3 },
  { key: "maribank", label: "MariBank", sortOrder: 4 },
];
