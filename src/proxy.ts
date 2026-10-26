import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { createDb } from "@/db/client";
import { orders, products } from "@/db/schema";
import { createSlugCache } from "@/lib/slug-cache";
import { TOKEN_SHAPE } from "@/lib/tracking-view";

// Under Cache Components the first request for a product URL that was never prerendered streams
// its page after sending 200, so notFound() alone gives a soft 404 on that first hit. This proxy
// checks the slug against a small in-memory list first and answers unknown ones with a real 404.
// It fails open: if the database is unreachable the request goes through to the page as before.
let db: ReturnType<typeof createDb>["db"] | undefined;

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return (db ??= createDb(url).db);
}

const slugs = createSlugCache({
  load: async () => {
    const rows = await getDb().select({ slug: products.slug }).from(products).where(eq(products.active, true));
    return rows.map((r) => r.slug);
  },
});

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_SHAPE = /^[a-z0-9-]{1,80}$/;
const FILE_EXTENSION = /\.[a-z0-9]{2,5}$/i;

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export async function proxy(request: NextRequest) {
  // Admin area, first gate: no session cookie at all means straight to sign-in with a real
  // redirect. This is only a quick check. Every admin page, action and file route still verifies
  // the session against the admin_accounts table.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (request.nextUrl.pathname === "/admin/signin" || SESSION_COOKIES.some((c) => request.cookies.has(c))) return NextResponse.next();
    return NextResponse.redirect(new URL("/admin/signin", request.url));
  }

  // Tracking links carry a 64-character hex token. Anything else is a real 404 without touching the database.
  if (request.nextUrl.pathname.startsWith("/track/")) {
    if (TOKEN_SHAPE.test(request.nextUrl.pathname.split("/")[2] ?? "")) return NextResponse.next();
    return NextResponse.rewrite(new URL("/not-found-404", request.url), { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  // Payment pages: an address that is not a real order is a real 404. The id is checked against the
  // database (one small lookup); if the database cannot be reached the page is let through, as before.
  if (request.nextUrl.pathname.startsWith("/pay/")) {
    const id = request.nextUrl.pathname.split("/")[2] ?? "";
    let exists = true;
    if (UUID_SHAPE.test(id)) {
      try {
        exists = (await getDb().select({ id: orders.id }).from(orders).where(eq(orders.id, id.toLowerCase())).limit(1)).length > 0;
      } catch {
        exists = true;
      }
    } else {
      exists = false;
    }
    if (exists) return NextResponse.next();
    return NextResponse.rewrite(new URL("/not-found-404", request.url), { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const slug = request.nextUrl.pathname.split("/")[2] ?? "";
  // /products/<name>.svg and friends are the product images in public/, not product pages.
  if (FILE_EXTENSION.test(slug)) return NextResponse.next();
  if (SLUG_SHAPE.test(slug) && (await slugs.has(slug))) return NextResponse.next();

  // Rewrite to a route that does not exist: Next renders its not-found page with status 404.
  return NextResponse.rewrite(new URL("/not-found-404", request.url), {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export const config = { matcher: ["/products/:slug", "/pay/:uuid", "/track/:token", "/admin/:path*"] };
