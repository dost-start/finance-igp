// Brings an already-seeded database in line with the START merch designs in src/db/seed-data.ts.
// `npm run db:seed` never overwrites rows (so finance's edits survive), which means products that are
// already live need this one-off step: new designs are added, existing products get their new name,
// photos, design label and shop order, and the old placeholders without a design are switched off.
// Prices, sizes and the on/off switch of existing products are left exactly as finance set them.
//
// Dry run (default, writes nothing):  npx tsx --env-file=.env.local scripts/sync-merch.mts
// Apply:                               npx tsx --env-file=.env.local scripts/sync-merch.mts --yes
// Run it once, then wait a few minutes for the shop's cached catalog to refresh (or save any product in the admin).
import { eq, inArray } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { products } from "../src/db/schema";
import { PRODUCTS, RETIRED_SLUGS } from "../src/db/seed-data";

const apply = process.argv.includes("--yes");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { sql, db } = createDb(url);

  const existing = await db.select({ id: products.id, slug: products.slug, active: products.active }).from(products);
  const bySlug = new Map(existing.map((p) => [p.slug, p]));
  const toAdd = PRODUCTS.filter((p) => !bySlug.has(p.slug));
  const toUpdate = PRODUCTS.filter((p) => bySlug.has(p.slug));
  const toRetire = RETIRED_SLUGS.filter((s) => bySlug.get(s)?.active);

  console.log(`${apply ? "Applying" : "Dry run"}: add ${toAdd.length} (${toAdd.map((p) => p.slug).join(", ") || "none"})`);
  console.log(`  update name, photos, design label and order on ${toUpdate.length} existing products`);
  console.log(`  switch off ${toRetire.length} (${toRetire.join(", ") || "none"})`);
  if (!apply) {
    console.log("Nothing written. Add --yes to apply.");
    await sql.end();
    return;
  }

  await db.transaction(async (tx) => {
    for (const [i, p] of PRODUCTS.entries()) {
      if (bySlug.has(p.slug)) {
        await tx
          .update(products)
          .set({ name: p.name, productType: p.productType, designVariant: p.designVariant, images: p.images, sortOrder: i })
          .where(eq(products.slug, p.slug));
      } else {
        await tx.insert(products).values({ ...p, sortOrder: i });
      }
    }
    if (toRetire.length) await tx.update(products).set({ active: false }).where(inArray(products.slug, toRetire));
  });
  console.log("Done.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
