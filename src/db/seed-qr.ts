import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { detectImageType } from "../lib/receipt";
import { getFileStore } from "../lib/storage";
import { createDb } from "./client";
import { paymentChannels } from "./schema";

// Uploads the payment QR images to the private Drive folder and records each file id on its
// payment channel. The images stay out of git: the repo is public and they show account names.
// Run: npm run db:seed-qr            (skips channels that already have a QR)
//      npm run db:seed-qr -- --force  (replaces them, e.g. after finance sends a new image)
const DIR = process.env.QR_DIR ?? "/Users/ethan/Downloads/QR Codes";
const FILES: Record<string, string> = { gcash: "GCASH.jpg", landbank: "LANDBANK.jpg", gotyme: "GOTYME.jpg", maribank: "MARIBANK.jpg" };

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const force = process.argv.includes("--force");
  const { sql, db } = createDb(url);
  const store = getFileStore();

  for (const [key, file] of Object.entries(FILES)) {
    const [row] = await db.select().from(paymentChannels).where(eq(paymentChannels.key, key)).limit(1);
    if (!row) {
      console.log(`${key}: no such channel in the database, skipped`);
      continue;
    }
    if (row.qrDriveFileId && !force) {
      console.log(`${key}: already has a QR, skipped (use --force to replace)`);
      continue;
    }
    const bytes = new Uint8Array(await readFile(path.join(DIR, file)));
    const mime = detectImageType(bytes);
    if (!mime) throw new Error(`${file} is not a JPEG, PNG or WebP image`);

    const id = await store.put({ name: `qr-${key}${path.extname(file).toLowerCase()}`, mime, bytes });
    const back = await store.get(id);
    if (!back || back.bytes.length !== bytes.length) throw new Error(`${key}: the uploaded copy does not match`);
    await db.update(paymentChannels).set({ qrDriveFileId: id }).where(eq(paymentChannels.key, key));
    console.log(`${key}: uploaded and verified (${bytes.length} bytes)`);
  }
  await sql.end();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
