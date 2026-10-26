import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getAdmin } from "@/lib/admin";
import { detectImageType } from "@/lib/receipt";
import { getFileStore } from "@/lib/storage";

// Receipts are private. Only a signed-in, active admin can load one, and the file is streamed
// from storage through here: no Drive address or share link ever reaches the browser.
const deny = (status: number) => new Response(status === 401 ? "Sign in required" : "Not found", { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, ctx: RouteContext<"/api/admin/receipts/[id]">) {
  if (!(await getAdmin())) return deny(401);
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return deny(404);

  const [proof] = await getDb()
    .select({ fileId: schema.paymentProofs.driveFileId })
    .from(schema.paymentProofs)
    .where(eq(schema.paymentProofs.orderUuid, id))
    .limit(1);
  if (!proof?.fileId) return deny(404);

  const file = await getFileStore().get(proof.fileId).catch(() => null);
  const mime = file ? detectImageType(file.bytes) : null;
  if (!file || !mime) return deny(404);

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
