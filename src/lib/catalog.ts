import { cacheLife, cacheTag } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

// Catalog reads are cached for a few minutes so a launch-day crowd does not hit the database
// on every page view. Edits by tech admin show up within the cache lifetime.
export async function getActiveProducts() {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog"); // the product editor expires this tag so a saved edit shows at once
  return getDb()
    .select({
      id: schema.products.id,
      slug: schema.products.slug,
      name: schema.products.name,
      productType: schema.products.productType,
      priceCentavos: schema.products.priceCentavos,
      images: schema.products.images,
      sizes: schema.products.sizes,
    })
    .from(schema.products)
    .where(eq(schema.products.active, true))
    .orderBy(asc(schema.products.sortOrder));
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const [product] = await getDb()
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.slug, slug), eq(schema.products.active, true)))
    .limit(1);
  return product ?? null;
}
