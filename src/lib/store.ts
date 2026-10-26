import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { LAUNCH_KEY, parseLaunchAt } from "./launch";
import { STORE_LOCK_KEY, parseLocked } from "./store-lock";

// The real answer, read from the database every time. Order creation and receipt upload use this, so
// closing the store takes effect for them at once.
export async function isStoreLocked(): Promise<boolean> {
  const [row] = await getDb().select({ value: schema.storeSettings.value }).from(schema.storeSettings).where(eq(schema.storeSettings.key, STORE_LOCK_KEY)).limit(1);
  return parseLocked(row?.value);
}

export async function saveStoreLocked(locked: boolean, adminId: string): Promise<void> {
  await getDb()
    .insert(schema.storeSettings)
    .values({ key: STORE_LOCK_KEY, value: locked ? "true" : "false", updatedBy: adminId })
    .onConflictDoUpdate({ target: schema.storeSettings.key, set: { value: locked ? "true" : "false", updatedAt: new Date(), updatedBy: adminId } });
}

// The launch date shown on the landing page (see src/lib/launch.ts). Missing or invalid means the planned date.
export async function getLaunchAt(): Promise<string> {
  const [row] = await getDb().select({ value: schema.storeSettings.value }).from(schema.storeSettings).where(eq(schema.storeSettings.key, LAUNCH_KEY)).limit(1);
  return parseLaunchAt(row?.value);
}

export async function saveLaunchAt(iso: string, adminId: string): Promise<void> {
  await getDb()
    .insert(schema.storeSettings)
    .values({ key: LAUNCH_KEY, value: iso, updatedBy: adminId })
    .onConflictDoUpdate({ target: schema.storeSettings.key, set: { value: iso, updatedAt: new Date(), updatedBy: adminId } });
}
