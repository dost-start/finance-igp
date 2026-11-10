// Catalog built from the START merch designs. Names, prices and sizes are still stand-ins until finance
// confirms the real ones (they load as data, no code change). Prices are centavos. Photos are WebP files in
// public/products named after the slug (apparel has a -front and a -back).
import type { ProductImage, ProductSize } from "./schema";

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
  images: ProductImage[];
};

const photo = (file: string): ProductImage => ({ url: `/products/${file}.webp`, kind: "flat" });
const single = (slug: string) => [photo(slug)];
const frontBack = (slug: string) => [photo(`${slug}-front`), photo(`${slug}-back`)];

const STICKERS: [string, string][] = [
  ["START Stars Sticker", "Stars"],
  ["Just Start Sticker (A)", "Just Start A"],
  ["Just Start Sticker (B)", "Just Start B"],
  ["START-DOST Star Sticker (A)", "Star A"],
  ["START-DOST Star Sticker (B)", "Star B"],
  ["United, We Innovate Sticker (A)", "Innovate A"],
  ["United, We Innovate Sticker (B)", "Innovate B"],
  ["Techno Scholars Unite Sticker", "Techno Scholars"],
  ["Waving Star Sticker", "Waving Star"],
  ["Start Now Monitor Sticker", "Start Now"],
  ["90% Vibes 10% Code Sticker", "Vibes"],
  ["Live Laugh Love Claude Sticker", "Claude"],
  ["Startup Rocket Sticker", "Rocket"],
  ["In the Middle of a Rebrand Sticker", "Rebrand"],
  ["Folder Computer Sticker", "Folder"],
  ["tech_4_people Sticker", "tech_4_people"],
  ["div>a Sticker", "div>a"],
  ["Do You Accept Cookies Sticker", "Cookies"],
];

const PINS: [string, string][] = [
  ["START Star Pin", "Star"],
  ["Techno Scholar Unite Pin", "Unite"],
  ["START Logo Pin", "Logo"],
  ["Techno Scholar Para Sa Bayan Pin", "Para Sa Bayan"],
  ["I \u2665 My CEO Pin", "CEO"],
];

const num = (i: number) => String(i + 1).padStart(2, "0");

export const PRODUCTS: Seed[] = [
  { slug: "tshirt-design-a", name: "START T-Shirt, Design A", productType: "tshirt", designVariant: "A", priceCentavos: 45000, sizes: APPAREL, images: frontBack("tshirt-design-a") },
  { slug: "tshirt-design-b", name: "START T-Shirt, Design B", productType: "tshirt", designVariant: "B", priceCentavos: 45000, sizes: APPAREL, images: frontBack("tshirt-design-b") },
  { slug: "jacket", name: "START Jacket, Design 1", productType: "jacket", designVariant: "1", priceCentavos: 120000, sizes: APPAREL, images: frontBack("jacket") },
  { slug: "jacket-design-2", name: "START Jacket, Design 2", productType: "jacket", designVariant: "2", priceCentavos: 120000, sizes: APPAREL, images: frontBack("jacket-design-2") },
  { slug: "lanyard-light", name: "START Lanyard 01", productType: "lanyard", designVariant: "01", priceCentavos: 12000, sizes: ONE_SIZE, images: single("lanyard-light") },
  ...["02", "03", "04", "05"].map((n): Seed => ({ slug: `lanyard-${n}`, name: `START Lanyard ${n}`, productType: "lanyard", designVariant: n, priceCentavos: 12000, sizes: ONE_SIZE, images: single(`lanyard-${n}`) })),
  { slug: "tote-light", name: "START Tote Bag", productType: "tote", designVariant: null, priceCentavos: 25000, sizes: ONE_SIZE, images: single("tote-light") },
  ...PINS.map(([name, variant], i): Seed => ({ slug: `pin-${num(i)}`, name, productType: "pin", designVariant: variant, priceCentavos: 8000, sizes: ONE_SIZE, images: single(`pin-${num(i)}`) })),
  ...STICKERS.map(([name, variant], i): Seed => ({ slug: `sticker-${num(i)}`, name, productType: "sticker", designVariant: variant, priceCentavos: 3000, sizes: ONE_SIZE, images: single(`sticker-${num(i)}`) })),
];

// Old placeholder products that have no design. The sync script switches them off; their orders stay readable.
export const RETIRED_SLUGS = ["tote-dark", "lanyard-dark"];

// Four payment channels the buyer can choose from, to avoid transfer fees. QR images are
// uploaded to Drive in sub-sprint 1D, never committed to git.
export const PAYMENT_CHANNELS = [
  { key: "gcash", label: "GCash", sortOrder: 1 },
  { key: "landbank", label: "Landbank", sortOrder: 2 },
  { key: "gotyme", label: "GoTyme", sortOrder: 3 },
  { key: "maribank", label: "MariBank", sortOrder: 4 },
];
