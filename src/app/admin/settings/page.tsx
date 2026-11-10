import type { Metadata } from "next";
import { Suspense } from "react";
import { LaunchCard } from "@/components/admin/launch-card";
import { StoreSwitch } from "@/components/admin/store-switch";
import { requireAdmin } from "@/lib/admin";
import { getLaunchAt, isStoreLocked } from "@/lib/store";

export const metadata: Metadata = { title: "Store settings" };

const GOOD = "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
const WARN = "rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";

// The two controls that used to sit above the order list: opening or closing the store, and the launch
// date. They are rarely used, so they live here instead of in front of the orders finance works on all day.
async function Settings({ searchParams }: { searchParams: PageProps<"/admin/settings">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const store = one(sp.store);
  const launch = one(sp.launch);
  const [locked, launchAt] = await Promise.all([isStoreLocked(), getLaunchAt()]);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Store settings</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Changes here apply to buyers straight away.</p>

      {store && (
        <p role="status" className={`mt-6 ${GOOD}`}>
          {store === "closed" ? "The store is closed. Buyers cannot place orders or send payments until you reopen it." : "The store is open again."}
        </p>
      )}
      {launch && (
        <p role={launch === "invalid" ? "alert" : "status"} className={`mt-6 ${launch === "invalid" ? WARN : GOOD}`}>
          {launch === "invalid" ? "That is not a valid launch date and time. Nothing was changed." : "Launch date saved. The landing page follows it within moments."}
        </p>
      )}

      <div className="mt-6 space-y-6">
        <StoreSwitch locked={locked} />
        <LaunchCard launchAt={launchAt} />
      </div>
    </>
  );
}

export default function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  return (
    <main>
      <Suspense fallback={<p className="text-sm text-zinc-500 dark:text-zinc-400">Loading settings…</p>}>
        <Settings searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
