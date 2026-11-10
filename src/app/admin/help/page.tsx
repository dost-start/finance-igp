import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { GUIDE } from "@/lib/guide";

export const metadata: Metadata = { title: "Help" };

async function Help() {
  await requireAdmin(); // every finance and tech member can read it
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Help for finance</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">Step-by-step guides for everything you do here. The first one, updating a status, takes under two minutes.</p>
      <nav aria-label="Guide sections" className="mt-4 max-w-3xl">
        <ul className="flex flex-wrap gap-2 text-sm">
          {GUIDE.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="inline-block rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 font-semibold text-zinc-700 transition-colors hover:border-brand-yellow hover:bg-brand-yellow hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8 max-w-3xl space-y-5">
        {GUIDE.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="lift-card scroll-mt-6 rounded-2xl border border-zinc-200/70 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 id={`${s.id}-title`} className="text-xl font-extrabold tracking-tight">
              {s.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.summary}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm leading-6 marker:font-bold marker:text-zinc-400">
              {s.steps.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            {s.tips?.map((t) => (
              <p key={t} className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
                {t}
              </p>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

export default function HelpPage() {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-600 dark:text-zinc-400">Loading the guide…</p>}>
        <Help />
      </Suspense>
    </main>
  );
}
