import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type Admin = typeof schema.adminAccounts.$inferSelect;

// The allowlist: an admin must exist in admin_accounts and be active. Emails are stored lower-case.
export async function findActiveAdmin(email: string | null | undefined): Promise<Admin | null> {
  if (!email) return null;
  const [admin] = await getDb()
    .select()
    .from(schema.adminAccounts)
    .where(and(eq(schema.adminAccounts.email, email.trim().toLowerCase()), eq(schema.adminAccounts.active, true)))
    .limit(1);
  return admin ?? null;
}
