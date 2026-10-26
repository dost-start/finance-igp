"use client";

import { useFormStatus } from "react-dom";
import { setOrderStatus } from "@/app/admin/actions";
import type { OrderStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/status";

function Go({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800">
      {pending ? "Saving…" : `Move to ${label}`}
    </button>
  );
}

// One step forward at a time. Each button is its own form so a click saves exactly that status.
export function StatusControl({ orderUuid, options }: { orderUuid: string; options: readonly OrderStatus[] }) {
  if (options.length === 0) return <p className="text-sm text-zinc-500">No further steps for this order.</p>;
  return (
    <div className="space-y-2">
      {options.map((s) => (
        <form key={s} action={setOrderStatus.bind(null, orderUuid, s)}>
          <Go label={STATUS_LABEL[s]} />
        </form>
      ))}
      <p className="text-xs text-zinc-500">Status emails for these steps are added in Sprint 2. The buyer is not emailed yet.</p>
    </div>
  );
}
