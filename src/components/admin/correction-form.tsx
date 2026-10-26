"use client";

import { useFormStatus } from "react-dom";
import { correctOrderStatus } from "@/app/admin/actions";
import type { OrderStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/status";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full rounded-md border border-zinc-400 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-zinc-800">
      {pending ? "Saving…" : "Save correction"}
    </button>
  );
}

// For a status set by mistake. It needs a reason, is recorded with your name, and does not email the buyer.
export function CorrectionForm({ orderUuid, targets }: { orderUuid: string; targets: readonly OrderStatus[] }) {
  if (targets.length === 0) return null;
  return (
    <details className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <summary className="cursor-pointer text-sm font-medium">Set a wrong status right</summary>
      <form action={correctOrderStatus.bind(null, orderUuid)} className="mt-3 space-y-3">
        <div>
          <label htmlFor="correct-to" className="text-sm font-medium">
            Correct status
          </label>
          <select id="correct-to" name="to" required defaultValue="" className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">
            <option value="" disabled>
              Choose the right status
            </option>
            {targets.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="correct-reason" className="text-sm font-medium">
            What went wrong
          </label>
          <textarea id="correct-reason" name="reason" required rows={2} maxLength={300} className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
        </div>
        <Save />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Recorded in the history and audit log with your name. The buyer is not emailed.</p>
      </form>
    </details>
  );
}
