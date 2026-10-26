import { StatusBadge } from "@/components/admin/status-badge";
import { STATUS_LABEL } from "@/lib/status";
import type { TrackedOrder } from "@/lib/tracking-view";

export function TrackingResult({ order }: { order: TrackedOrder }) {
  return (
    <section aria-live="polite" className="max-w-xl rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Order ID</p>
      <p className="font-mono text-2xl font-semibold tracking-tight">{order.orderId}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={order.status} />
      </div>
      {order.text && <p className="mt-3 leading-7">{order.text}</p>}

      <h2 className="mt-6 text-sm font-semibold">Progress</h2>
      <ol className="mt-2 space-y-2 text-sm">
        {order.timeline.map((e, n) => (
          <li key={n} className="flex flex-wrap gap-x-3">
            <span className="w-44 text-zinc-500 dark:text-zinc-400">{e.at}</span>
            <span className="font-medium">{STATUS_LABEL[e.status]}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">Questions? Use the merch ticket form linked in your emails. This page is read-only.</p>
    </section>
  );
}
