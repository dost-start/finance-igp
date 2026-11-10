import { verifyPhotoToken } from "@/lib/product-photo";
import { detectImageType } from "@/lib/receipt";
import { getFileStore } from "@/lib/storage";

// Public: every shopper sees product photos. What keeps this route from being a way into the private Drive folder
// is the signature in the address: only a photo uploaded through the admin has one (see src/lib/product-photo.ts).
// The file is read back through our own storage code, so no Drive address or share link ever reaches the browser.
const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, ctx: RouteContext<"/api/product-photo/[token]">) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return notFound();
  const { token } = await ctx.params;
  const fileId = verifyPhotoToken(token, secret);
  if (!fileId) return notFound();

  const file = await getFileStore().get(fileId).catch(() => null);
  const mime = file ? detectImageType(file.bytes) : null;
  if (!file || !mime) return notFound();

  // A photo's address never changes what it shows, so browsers and the CDN may keep it for a year.
  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
