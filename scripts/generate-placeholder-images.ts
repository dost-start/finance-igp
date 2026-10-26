// Writes a simple flat placeholder SVG per seeded product into public/products.
// Run: npx tsx scripts/generate-placeholder-images.ts. Replace with real photos later.
import { mkdirSync, writeFileSync } from "node:fs";
import { PRODUCTS } from "../src/db/seed-data";

const TINT: Record<string, string> = { tshirt: "#cfe3ee", jacket: "#d9d4ee", lanyard: "#d6ead7", tote: "#f1e3c6", sticker: "#f0d2d8" };
mkdirSync("public/products", { recursive: true });

for (const p of PRODUCTS) {
  const bg = TINT[p.productType] ?? "#e3e6ea";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${p.name} (placeholder image)">
<rect width="600" height="600" fill="${bg}"/>
<text x="300" y="285" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1f2a3a">${p.name}</text>
<text x="300" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#52627a">placeholder image</text>
</svg>
`;
  writeFileSync(`public/products/${p.slug}.svg`, svg);
}
console.log(`Wrote ${PRODUCTS.length} placeholder images to public/products`);
