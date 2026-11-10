import { getAdmin } from "@/lib/admin";
import { productPhotoUrl } from "@/lib/product-photo";
import { IMAGE_EXTENSION, detectImageType } from "@/lib/receipt";
import { getFileStore } from "@/lib/storage";

// Photo upload for the product form. Only the Technology team. The browser shrinks big photos first, but the
// size and the real file type (from the first bytes) are checked again here. The cap stays under Vercel's
// 4.5 MB request body limit.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const reply = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return reply(401, { ok: false, message: "Sign in again to upload photos." });
  if (admin.role !== "tech") return reply(403, { ok: false, message: "Only the Technology team can change product photos." });
  const secret = process.env.AUTH_SECRET;
  if (!secret) return reply(500, { ok: false, message: "Photo upload is not set up yet." });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, message: "That upload could not be read. Try again." });
  }
  const file = form.get("photo");
  if (!(file instanceof File)) return reply(422, { ok: false, message: "Choose a photo to upload." });
  if (file.size > MAX_PHOTO_BYTES) return reply(413, { ok: false, message: "That photo is too large (over 4 MB). Try a smaller one." });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageType(bytes);
  if (!mime) return reply(415, { ok: false, message: "Upload a JPG, PNG or WebP photo." });

  try {
    const id = await getFileStore().put({ name: `product-photo-${crypto.randomUUID()}.${IMAGE_EXTENSION[mime]}`, mime, bytes });
    return reply(200, { ok: true, url: productPhotoUrl(id, secret) });
  } catch {
    console.error("product photo upload failed");
    return reply(502, { ok: false, message: "We could not store that photo. Please try again." });
  }
}
