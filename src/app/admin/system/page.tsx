import type { Metadata } from "next";
import { and, count, desc, gt, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { runBackupNow } from "@/app/admin/extras-actions";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { agoFromNow, isStaleNow } from "@/lib/backup-plan";
import { getLastBackup } from "@/lib/backup";
import { CURRENT_VERSION } from "@/lib/changelog";
import { emailBudget } from "@/lib/email/budget";
import { isNearLimit } from "@/lib/email/limit";
import { formatManila } from "@/lib/email/templates";
import { formatLaunch, hasLaunched } from "@/lib/launch";
import { getLaunchAt, isStoreLocked } from "@/lib/store";

export const metadata: Metadata = { title: "System" };

function Row({ label, children, ok }: { label: string; children: React.ReactNode; ok?: boolean | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-sm">
        {ok === true && <span aria-hidden="true">✓ </span>}
        {ok === false && <span aria-hidden="true">⚠ </span>}
        {children}
      </dd>
    </div>
  );
}

async function timedPing(): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    await getDb().execute(sql`select 1`);
    return { ok: true, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

async function System({ searchParams }: { searchParams: PageProps<"/admin/system">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const backupMsg = Array.isArray(sp.backup) ? sp.backup[0] : sp.backup;
  const db = getDb();

  const [ping, locked, launchAt, backup] = await Promise.all([timedPing(), isStoreLocked(), getLaunchAt(), getLastBackup()]);
  const [budget, errors, [{ errors24 }], [{ orders }]] = await Promise.all([
    emailBudget(),
    db.select().from(schema.errorLogs).orderBy(desc(schema.errorLogs.createdAt)).limit(20),
    db.select({ errors24: count() }).from(schema.errorLogs).where(gt(schema.errorLogs.createdAt, sql`now() - interval '24 hours'`)),
    db.select({ orders: count() }).from(schema.orders),
  ]);
  const problems = await db
    .select({ n: count() })
    .from(schema.emailLogs)
    .where(and(sql`${schema.emailLogs.result} <> 'sent'`, gt(schema.emailLogs.sentAt, sql`now() - interval '7 days'`)));
  const failedEmails = problems[0]?.n ?? 0;
  const stale = backup ? isStaleNow(backup.at) : true;
  const cronReady = Boolean(process.env.CRON_SECRET);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">System</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">A quick look at whether everything behind the shop is healthy. A ⚠ means something needs attention.</p>

      {backupMsg && (
        <p role={backupMsg === "failed" ? "alert" : "status"} className={`mt-4 rounded-md border p-3 text-sm ${backupMsg === "failed" ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100" : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"}`}>
          {backupMsg === "failed" ? "The backup did not work. Tell the Technology team." : "Backup saved."}
        </p>
      )}

      <dl className="mt-4 max-w-3xl divide-y divide-zinc-200 rounded-lg border border-zinc-200 px-4 dark:divide-zinc-800 dark:border-zinc-800">
        <Row label="Version">
          {CURRENT_VERSION}{" "}
          <Link href="/admin/changelog" className="underline underline-offset-4">
            what changed
          </Link>
        </Row>
        <Row label="Database" ok={ping.ok}>
          {ping.ok ? `Connected, answered in ${ping.ms} ms. ${orders} ${orders === 1 ? "order" : "orders"} stored.` : "Not answering. Tell the Technology team now."}
        </Row>
        <Row label="Store">
          {locked ? "Closed: no new orders or payments." : "Open."} The landing page is {hasLaunched(launchAt) ? "showing the launch view" : "counting down to"} {formatLaunch(launchAt)}.
        </Row>
        <Row label="Last backup" ok={backup ? !stale : false}>
          {backup ? (
            <>
              {agoFromNow(backup.at)} ({formatManila(new Date(backup.at))}): {backup.counts.orders ?? 0} orders, {Math.max(1, Math.round(backup.bytes / 1024))} KB, saved as <span className="font-mono text-xs break-all">{backup.file}</span> in the private Drive folder.
              {stale && " It is older than a day: the nightly backup may have stopped."}
            </>
          ) : (
            "No backup yet."
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <form action={runBackupNow}>
              <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                Back up now
              </button>
            </form>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Runs by itself every night at 2:00 AM Manila time; the newest 14 copies are kept.</span>
          </div>
          {!cronReady && <p className="mt-2 font-medium text-amber-900 dark:text-amber-200">⚠ The nightly schedule is not set up on this server (no CRON_SECRET).</p>}
        </Row>
        <Row label="Emails (24 hours)" ok={!isNearLimit(budget) && failedEmails === 0}>
          {budget.used} of {budget.limit} sent.{" "}
          {failedEmails > 0 ? (
            <>
              {failedEmails} not delivered in the last 7 days:{" "}
              <Link href="/admin/emails?show=problems" className="underline underline-offset-4">
                see which
              </Link>
              .
            </>
          ) : (
            "Every email in the last 7 days was delivered."
          )}
        </Row>
        <Row label="Errors (24 hours)" ok={errors24 === 0}>
          {errors24 === 0 ? "None." : `${errors24} server ${errors24 === 1 ? "error" : "errors"}. The newest are listed below.`}
        </Row>
        <Row label="Uptime check">
          Point a free uptime monitor at{" "}
          <Link href="/api/health" className="font-mono text-xs underline underline-offset-4">
            /api/health
          </Link>
          : it answers 200 when the site and database are fine and 503 when they are not.
        </Row>
      </dl>

      <h2 className="mt-8 text-lg font-semibold">Recent server errors</h2>
      {errors.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">No errors saved.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600 uppercase dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                {["When", "Where", "What"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {errors.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatManila(e.createdAt)}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {e.method} {e.route}
                  </td>
                  <td className="px-3 py-2 break-words">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function SystemPage({ searchParams }: PageProps<"/admin/system">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading system status…</p>}>
        <System searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
