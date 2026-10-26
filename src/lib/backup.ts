import "server-only";
import { gzipSync } from "node:zlib";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { BACKUP_PREFIX, KEEP_BACKUPS, LAST_BACKUP_KEY, backupFileName, backupsToDelete, parseLastBackup, type LastBackup } from "./backup-plan";
import { CURRENT_VERSION } from "./changelog";
import { getFileStore } from "./storage";

// A full copy of the shop's data, saved as one compressed file in the private Drive folder every
// night (PRD NF07). Receipts and QR images already live in Drive; this covers everything in the
// database. The newest 14 copies are kept. See docs/backup-and-restore.md.
async function snapshot() {
  const db = getDb();
  // One table at a time: simple, and kind to the database.
  const tables = {
    orders: await db.select().from(schema.orders),
    order_items: await db.select().from(schema.orderItems),
    payment_proofs: await db.select().from(schema.paymentProofs),
    status_events: await db.select().from(schema.statusEvents),
    products: await db.select().from(schema.products),
    payment_channels: await db.select().from(schema.paymentChannels),
    admin_accounts: await db.select().from(schema.adminAccounts),
    audit_logs: await db.select().from(schema.auditLogs),
    email_logs: await db.select().from(schema.emailLogs),
    store_settings: await db.select().from(schema.storeSettings),
  };
  const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
  return { tables, counts };
}

export async function runBackup(now: Date = new Date()): Promise<LastBackup> {
  const { tables, counts } = await snapshot();
  const file = backupFileName(now);
  const bytes = gzipSync(Buffer.from(JSON.stringify({ app: "start-collections", version: CURRENT_VERSION, takenAt: now.toISOString(), counts, tables })));
  const store = getFileStore();
  await store.put({ name: file, mime: "application/gzip", bytes });

  // Tidy up: keep the newest copies only. A failure here must not hide that the backup itself worked.
  try {
    if (store.list && store.remove) {
      for (const old of backupsToDelete(await store.list(BACKUP_PREFIX), KEEP_BACKUPS)) await store.remove(old.id);
    }
  } catch {
    console.error("backup cleanup failed");
  }

  const record: LastBackup = { at: now.toISOString(), file, bytes: bytes.length, counts };
  await getDb()
    .insert(schema.storeSettings)
    .values({ key: LAST_BACKUP_KEY, value: JSON.stringify(record) })
    .onConflictDoUpdate({ target: schema.storeSettings.key, set: { value: JSON.stringify(record), updatedAt: new Date() } });
  return record;
}

export async function getLastBackup(): Promise<LastBackup | null> {
  const [row] = await getDb().select({ value: schema.storeSettings.value }).from(schema.storeSettings).where(eq(schema.storeSettings.key, LAST_BACKUP_KEY)).limit(1);
  return parseLastBackup(row?.value);
}
