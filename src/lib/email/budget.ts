import "server-only";
import { count, and, eq, gt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { budgetOf, emailDailyLimit, type Budget } from "./limit";

// Emails actually sent in the last 24 hours against the daily limit.
export async function emailBudget(): Promise<Budget> {
  const [row] = await getDb()
    .select({ used: count() })
    .from(schema.emailLogs)
    .where(and(eq(schema.emailLogs.result, "sent"), gt(schema.emailLogs.sentAt, sql`now() - interval '24 hours'`)));
  return budgetOf(emailDailyLimit(), row?.used ?? 0);
}
