import { setLaunchDate } from "@/app/admin/extras-actions";
import { formatLaunch, hasLaunched, isoToManilaInput } from "@/lib/launch";

// The launch date. The landing page counts down to it and switches to the launch view when it arrives.
export function LaunchCard({ launchAt }: { launchAt: string }) {
  const live = hasLaunched(launchAt);
  return (
    <section aria-label="Launch date" className="mt-5 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
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
            <input id="launchAt" name="launchAt" type="datetime-local" required defaultValue={isoToManilaInput(launchAt)} className="mt-1 block rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          </div>
          <button type="submit" className="rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700">
            Save launch date
          </button>
        </form>
      </div>
    </section>
  );
}
