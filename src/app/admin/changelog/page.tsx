import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { CURRENT_VERSION, RELEASES, formatReleaseDate, groupChanges } from "@/lib/changelog";

export const metadata: Metadata = { title: "Release notes" };

async function Notes() {
  await requireAdmin(); // every finance and tech member can read it
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Release notes</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        What changed in each version of the shop, newest first. You are on <strong>version {CURRENT_VERSION}</strong>. A new sprint raises the middle number; a fix or polish raises the last.
      </p>
      <div className="mt-6 space-y-5">
        {RELEASES.map((r) => (
          <section key={r.version} aria-labelledby={`v${r.version}`} className="lift-card max-w-3xl rounded-2xl border border-zinc-200/70 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id={`v${r.version}`} className="text-xl font-extrabold tracking-tight">
              {r.version}: {r.title}
              {r.version === CURRENT_VERSION && <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 align-middle text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">Running now</span>}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatReleaseDate(r.date)}</p>
            {groupChanges(r).map((g) => (
              <div key={g.kind} className="mt-3">
                <h3 className="text-sm font-semibold">{g.label}</h3>
                <ul className="mt-1 list-disc space-y-1 pl-6 text-sm leading-6">
                  {g.items.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

export default function ChangelogPage() {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading release notes…</p>}>
        <Notes />
      </Suspense>
    </main>
  );
}
