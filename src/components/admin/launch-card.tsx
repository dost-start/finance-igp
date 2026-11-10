import { setLaunchDate } from "@/app/admin/extras-actions";
import { formatLaunch, hasLaunched, isoToManilaInput } from "@/lib/launch";

// The launch date. The landing page counts down to it and switches to the launch view when it arrives.
export function LaunchCard({ launchAt }: { launchAt: string }) {
  const live = hasLaunched(launchAt);
  return (
    <section aria-label="Launch date" className="lift-card rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Launch date: {formatLaunch(launchAt)}</h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            {live ? "The landing page is showing the launch view." : "The landing page is counting down to it."} Pick a past date to preview launch day, then set the real date again.
          </p>
        </div>
        <form action={setLaunchDate} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="launchAt" className="text-sm font-medium">
              New date and time (Manila)
            </label>
            <input id="launchAt" name="launchAt" type="datetime-local" required defaultValue={isoToManilaInput(launchAt)} className="mt-1 block rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950" />
          </div>
          <button type="submit" className="rounded-full bg-sky-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
            Save launch date
          </button>
        </form>
      </div>
    </section>
  );
}
