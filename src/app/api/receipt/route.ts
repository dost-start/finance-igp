import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { renderEmail1, ticketFormUrl } from "@/lib/email/templates";
import { sendOrderEmail } from "@/lib/email/send";
import { judgeOcr, readingFromFields } from "@/lib/ocr/judge";
import { amountField } from "@/lib/ocr/parse";
import { CHANNEL_KEY, IMAGE_EXTENSION, MAX_RECEIPT_BYTES, checkReceipt, ocrFieldsSchema, referenceSchema } from "@/lib/receipt";
import { getFileStore } from "@/lib/storage";
import { isStoreLocked } from "@/lib/store";
import { STORE_CLOSED_MESSAGE } from "@/lib/store-lock";

const reply = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Browser same-origin check: a page on another site cannot post here with a visitor's order.
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

// The order is saved before this runs (checkout), so a storage problem here never loses it:
// the buyer just retries the upload on the same page.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply(403, { error: "forbidden" });
  // Store lock: no payment is accepted while the store is closed (423 = locked).
  if (await isStoreLocked()) return reply(423, { error: "store_closed", message: STORE_CLOSED_MESSAGE });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { error: "bad_request" });
  }

  const orderUuid = String(form.get("orderUuid") ?? "");
  const channelKey = String(form.get("channel") ?? "");
  const reference = referenceSchema.safeParse(String(form.get("reference") ?? ""));
  const file = form.get("receipt");
  const ocr = ocrFieldsSchema.safeParse({
    status: form.get("ocrStatus") ?? undefined,
    amount: form.get("ocrAmount") ?? undefined,
    reference: form.get("ocrReference") ?? undefined,
  });

  if (!z.uuid().safeParse(orderUuid).success || !CHANNEL_KEY.test(channelKey)) return reply(400, { error: "bad_request" });
  if (!reference.success) return reply(422, { error: "reference", message: reference.error.issues[0].message });
  if (!(file instanceof File)) return reply(422, { error: "no_file", message: "Choose your receipt image." });
  if (file.size > MAX_RECEIPT_BYTES) return reply(413, { error: "too_large", message: "That image is too large. Try a screenshot." });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkReceipt(bytes);
  if (!check.ok) {
    return reply(415, { error: check.reason, message: "Upload a JPG, PNG or WebP image of your receipt." });
  }

  const db = getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderUuid)).limit(1);
  if (!order) return reply(404, { error: "not_found" });
  if (order.status === "pending_payment") return reply(200, { ok: true, already: true });
  if (order.status !== "order_received") return reply(409, { error: "closed" });

  const [channel] = await db
    .select({ key: schema.paymentChannels.key })
    .from(schema.paymentChannels)
    .where(and(eq(schema.paymentChannels.key, channelKey), eq(schema.paymentChannels.active, true)))
    .limit(1);
  if (!channel) return reply(400, { error: "bad_channel", message: "Choose a payment channel." });

  let fileId: string;
  try {
    // The Drive file name is the Order ID so finance can find it; the folder is private.
    fileId = await getFileStore().put({ name: `${order.orderId}.${IMAGE_EXTENSION[check.mime]}`, mime: check.mime, bytes });
  } catch {
    console.error("receipt upload failed");
    return reply(502, { error: "storage_unavailable", message: "We could not store your receipt. Your order is saved, so please try again." });
  }

  try {
    // The reading comes from the buyer's phone, so it is only a hint for finance. Bad or missing
    // values simply mean "not checked"; they never block the submit. The verdict is worked out here
    // from the order's real total and the typed reference, never taken from the browser.
    const reading = ocr.success ? readingFromFields(ocr.data.status ?? null, ocr.data.amount ?? null, ocr.data.reference ?? null) : null;
    const ocrResult = reading ? judgeOcr(reading, { totalCentavos: order.totalCentavos, typedReference: reference.data }) : "not_checked";
    await db.transaction(async (tx) => {
      await tx.insert(schema.paymentProofs).values({
        orderUuid: order.id,
        channel: channel.key,
        referenceNumber: reference.data,
        driveFileId: fileId,
        ocrAmount: reading?.amountCentavos != null ? amountField(reading.amountCentavos) : null,
        ocrReference: reading?.reference ?? null,
        ocrResult,
      });
      const moved = await tx
        .update(schema.orders)
        .set({ status: "pending_payment" })
        .where(and(eq(schema.orders.id, order.id), eq(schema.orders.status, "order_received")))
        .returning({ id: schema.orders.id });
      if (moved.length === 0) throw new Error("already moved");
      await tx.insert(schema.statusEvents).values({ orderUuid: order.id, status: "pending_payment" });
    });
  } catch (e) {
    // A second tap racing the first: the proof already exists, so treat it as submitted.
    if (typeof e === "object" && e && "code" in e && (e as { code?: string }).code === "23505") return reply(200, { ok: true, already: true });
    console.error("saving payment proof failed");
    return reply(500, { error: "server", message: "Something went wrong. Please try again." });
  }

  // Email 1 goes out after the response, so a slow mail server never holds up the buyer.
  after(async () => {
    const items = await db
      .select({ name: schema.products.name, size: schema.orderItems.size, quantity: schema.orderItems.quantity })
      .from(schema.orderItems)
      .innerJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
      .where(eq(schema.orderItems.orderUuid, order.id));
    const content = renderEmail1(
      {
        buyerName: order.buyerName,
        items,
        totalCentavos: order.totalCentavos,
        universityAddress: order.universityAddress,
        homeAddressLink: order.homeAddressLink,
        homeLandmark: order.homeLandmark,
      },
      ticketFormUrl(),
    );
    await sendOrderEmail({ orderUuid: order.id, template: "1-order-received", to: order.email, content });
  });

  return reply(200, { ok: true });
}
