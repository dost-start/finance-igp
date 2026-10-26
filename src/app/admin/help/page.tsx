import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin";
import { GUIDE } from "@/lib/guide";

export const metadata: Metadata = { title: "Help" };

async function Help() {
  await requireAdmin(); // every finance and tech member can read it
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Help for finance</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">Step-by-step guides for everything you do here. The first one, updating a status, takes under two minutes.</p>
      <nav aria-label="Guide sections" className="mt-4 max-w-3xl">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {GUIDE.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="underline underline-offset-4">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8 max-w-3xl space-y-10">
        {GUIDE.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`}>
            <h2 id={`${s.id}-title`} className="text-lg font-semibold">
              {s.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{s.summary}</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-6 text-sm leading-6">
              {s.steps.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            {s.tips?.map((t) => (
              <p key={t} className="mt-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
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
