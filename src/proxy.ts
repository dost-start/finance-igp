import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { createDb } from "@/db/client";
import { products } from "@/db/schema";
import { createSlugCache } from "@/lib/slug-cache";

// Under Cache Components the first request for a product URL that was never prerendered streams
// its page after sending 200, so notFound() alone gives a soft 404 on that first hit. This proxy
// checks the slug against a small in-memory list first and answers unknown ones with a real 404.
// It fails open: if the database is unreachable the request goes through to the page as before.
let db: ReturnType<typeof createDb>["db"] | undefined;

const slugs = createSlugCache({
  load: async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    db ??= createDb(url).db;
    const rows = await db.select({ slug: products.slug }).from(products).where(eq(products.active, true));
    return rows.map((r) => r.slug);
  },
});

const SLUG_SHAPE = /^[a-z0-9-]{1,80}$/;

export async function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  if (SLUG_SHAPE.test(slug) && (await slugs.has(slug))) return NextResponse.next();

  // Rewrite to a route that does not exist: Next renders its not-found page with status 404.
  return NextResponse.rewrite(new URL("/not-found-404", request.url), {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export const config = { matcher: "/products/:slug" };
