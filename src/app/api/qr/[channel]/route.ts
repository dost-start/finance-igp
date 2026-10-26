import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { CHANNEL_KEY, detectImageType } from "@/lib/receipt";
import { getFileStore } from "@/lib/storage";

// QR images are never in the public folder or in git. They are served only to someone holding a
// real, still-open order link, and are streamed from storage so no Drive address ever reaches
// the browser.
const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, ctx: RouteContext<"/api/qr/[channel]">) {
  const { channel: key } = await ctx.params;
  const orderUuid = new URL(request.url).searchParams.get("order") ?? "";
  if (!CHANNEL_KEY.test(key) || !z.uuid().safeParse(orderUuid).success) return notFound();

  const db = getDb();
  const [order] = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderUuid), inArray(schema.orders.status, ["order_received", "pending_payment"])))
    .limit(1);
  if (!order) return notFound();

  const [channel] = await db
    .select({ fileId: schema.paymentChannels.qrDriveFileId })
    .from(schema.paymentChannels)
    .where(and(eq(schema.paymentChannels.key, key), eq(schema.paymentChannels.active, true)))
    .limit(1);
  if (!channel?.fileId) return notFound();

  const file = await getFileStore().get(channel.fileId).catch(() => null);
  const mime = file ? detectImageType(file.bytes) : null;
  if (!file || !mime) return notFound();

  return new Response(Buffer.from(file.bytes), {
    headers: { "Content-Type": mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
