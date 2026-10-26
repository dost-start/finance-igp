import type { Metadata } from "next";
import { desc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { emailBudget } from "@/lib/email/budget";
import { isNearLimit } from "@/lib/email/limit";
import { isProblem, resultLabel, templateLabel } from "@/lib/email/log";
import { formatManila } from "@/lib/email/templates";

export const metadata: Metadata = { title: "Email log" };

const SHOWN = 200;

async function Log({ searchParams }: { searchParams: PageProps<"/admin/emails">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const only = (Array.isArray(sp.show) ? sp.show[0] : sp.show) === "problems";
  const db = getDb();

  const [rows, budget] = await Promise.all([
    db
      .select({
        id: schema.emailLogs.id,
        template: schema.emailLogs.template,
        recipient: schema.emailLogs.recipient,
        result: schema.emailLogs.result,
        sentAt: schema.emailLogs.sentAt,
        orderUuid: schema.emailLogs.orderUuid,
        orderId: schema.orders.orderId,
      })
      .from(schema.emailLogs)
      .leftJoin(schema.orders, eq(schema.orders.id, schema.emailLogs.orderUuid))
      .where(only ? ne(schema.emailLogs.result, "sent") : undefined)
      .orderBy(desc(schema.emailLogs.sentAt))
      .limit(SHOWN),
    emailBudget(),
  ]);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Email log</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Every email the system tried to send, including the ones that did not go out. {budget.used} of {budget.limit} sent in the last 24 hours.
      </p>
      {isNearLimit(budget) && (
        <p role="alert" className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          The daily email limit is nearly used up ({budget.remaining} left). Status changes that need an email are refused until it frees up.
        </p>
      )}
      <p className="mt-4 text-sm">
        <Link href="/admin/emails" className={only ? "underline underline-offset-4" : "font-semibold"}>
          All emails
        </Link>
        {" · "}
        <Link href="/admin/emails?show=problems" className={only ? "font-semibold" : "underline underline-offset-4"}>
          Not delivered only
        </Link>
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{only ? "Every email was sent." : "No emails yet."}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:text-zinc-400 uppercase dark:bg-zinc-900">
              <tr>
                {["When", "Email", "Order", "To", "Result"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((r) => {
                const problem = isProblem(r.result);
                return (
                  <tr key={r.id} className={problem ? "bg-amber-50/70 dark:bg-amber-950/30" : undefined}>
                    <td className="px-3 py-2 whitespace-nowrap">{formatManila(r.sentAt)}</td>
                    <td className="px-3 py-2">{templateLabel(r.template)}</td>
                    <td className="px-3 py-2 font-mono">
                      {r.orderUuid && r.orderId ? (
                        <Link href={`/admin/orders/${r.orderUuid}`} className="underline underline-offset-4">
                          {r.orderId}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2 break-all">{r.recipient}</td>
                    <td className={`px-3 py-2 ${problem ? "font-semibold text-red-800 dark:text-red-300" : ""}`}>
                      {problem && <span aria-hidden="true">⚠ </span>}
                      {resultLabel(r.result)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length >= SHOWN && <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Showing the latest {SHOWN}.</p>}
    </>
  );
}

export default function EmailLogPage({ searchParams }: PageProps<"/admin/emails">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading the email log…</p>}>
        <Log searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
