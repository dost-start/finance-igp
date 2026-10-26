import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb, schema } from "@/db";
import { findActiveAdmin, type Admin } from "./admin-accounts";

// For route handlers: the signed-in active admin, or null (the route answers 401).
export async function getAdmin(): Promise<Admin | null> {
  const session = await auth();
  return findActiveAdmin(session?.user?.email);
}

// For pages and server actions: the signed-in active admin, or a redirect to sign-in.
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/signin");
  return admin;
}

// Only the Technology team (product and price editing). Finance members are sent back to the order
// list with a plain message instead of an error page.
export async function requireTech(): Promise<Admin> {
  const admin = await requireAdmin();
  if (admin.role !== "tech") redirect("/admin?notice=tech_only");
  return admin;
}

type Tx = Pick<ReturnType<typeof getDb>, "insert">;

// Every admin write leaves an audit row: who, what, which order, before and after.
export async function writeAudit(
  tx: Tx,
  entry: { adminId: string; action: string; orderUuid?: string; before?: unknown; after?: unknown },
) {
  await tx.insert(schema.auditLogs).values({
    adminId: entry.adminId,
    action: entry.action,
    orderUuid: entry.orderUuid ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}
