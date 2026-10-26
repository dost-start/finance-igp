import type { Metadata } from "next";
import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { AUDIT_ACTIONS, AUDIT_LABEL, auditLabel, describeAudit, isAuditAction } from "@/lib/audit";
import { formatManila } from "@/lib/email/templates";

export const metadata: Metadata = { title: "Audit log" };

const PER_PAGE = 100;

async function Audit({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  await requireAdmin(); // every finance and tech member can read it
  const sp = await searchParams;
  const rawAction = Array.isArray(sp.action) ? sp.action[0] : sp.action;
  const action = rawAction && isAuditAction(rawAction) ? rawAction : undefined;
  const page = Math.min(500, Math.max(1, Number.parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? "1", 10) || 1));

  const rows = await getDb()
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      before: schema.auditLogs.before,
      after: schema.auditLogs.after,
      at: schema.auditLogs.createdAt,
      who: schema.adminAccounts.name,
      email: schema.adminAccounts.email,
      orderUuid: schema.auditLogs.orderUuid,
      orderId: schema.orders.orderId,
      matches: sql<number>`count(*) over ()::int`,
    })
    .from(schema.auditLogs)
    .innerJoin(schema.adminAccounts, eq(schema.adminAccounts.id, schema.auditLogs.adminId))
    .leftJoin(schema.orders, eq(schema.orders.id, schema.auditLogs.orderUuid))
    .where(action ? eq(schema.auditLogs.action, action) : undefined)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(PER_PAGE)
    .offset((page - 1) * PER_PAGE);

  const total = rows[0]?.matches ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (p: number) => `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">Who changed what, and when. Every confirmation, rejection, status change, correction, export, product edit and store lock is recorded here. It cannot be edited.</p>

      <form method="get" action="/admin/audit" className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="audit-action" className="text-sm font-medium">
            Show
          </label>
          <select id="audit-action" name="action" defaultValue={action ?? ""} className="mt-1 block rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">
            <option value="">Everything</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {AUDIT_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900">
          Apply
        </button>
        {action && (
          <Link href="/admin/audit" className="text-sm underline underline-offset-4">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">{action ? "Nothing recorded for this yet." : "Nothing has been recorded yet."}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:text-zinc-400 uppercase dark:bg-zinc-900">
              <tr>
                {["When", "Who", "What", "Details", "Order"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatManila(r.at)}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.who}</span>
                    <span className="block text-xs break-all text-zinc-500 dark:text-zinc-400">{r.email}</span>
                  </td>
                  <td className="px-3 py-2">{auditLabel(r.action)}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{describeAudit(r.action, r.before as Record<string, unknown> | null, r.after as Record<string, unknown> | null)}</td>
                  <td className="px-3 py-2 font-mono">
                    {r.orderUuid && r.orderId ? (
                      <Link href={`/admin/orders/${r.orderUuid}`} className="underline underline-offset-4">
                        {r.orderId}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={link(page - 1)} className="underline underline-offset-4">
              Newer
            </Link>
          ) : (
            <span className="text-zinc-400">Newer</span>
          )}
          <span className="text-zinc-500 dark:text-zinc-400">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={link(page + 1)} className="underline underline-offset-4">
              Older
            </Link>
          ) : (
            <span className="text-zinc-400">Older</span>
          )}
        </nav>
      )}
    </>
  );
}

export default function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading the audit log…</p>}>
        <Audit searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
