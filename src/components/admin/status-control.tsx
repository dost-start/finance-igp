"use client";

import { useFormStatus } from "react-dom";
import { setOrderStatus } from "@/app/admin/actions";
import type { OrderStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/status";

// One step forward at a time. The optional note is saved in the order's history and printed in the
// buyer's email. Each button saves exactly the status named on it, with the note typed above.
export function StatusControl({ orderUuid, options }: { orderUuid: string; options: readonly OrderStatus[] }) {
  if (options.length === 0) return <p className="text-sm text-zinc-500 dark:text-zinc-400">No further steps for this order.</p>;
  return (
    <form className="space-y-3">
      <div>
        <label htmlFor="note" className="text-sm font-medium">
          Note for the buyer <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={300}
          className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950"
          aria-describedby="note-hint"
        />
        <p id="note-hint" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Shown in the buyer&apos;s email. Required when canceling.
        </p>
      </div>
      {options.map((s) => (
        <StatusButton key={s} orderUuid={orderUuid} to={s} />
      ))}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">The buyer is emailed about the new status.</p>
    </form>
  );
}

function StatusButton({ orderUuid, to }: { orderUuid: string; to: OrderStatus }) {
  const { pending } = useFormStatus();
  const danger = to === "canceled";
  return (
    <button
      type="submit"
      formAction={setOrderStatus.bind(null, orderUuid, to)}
      disabled={pending}
      className={`w-full rounded-xl border px-4 py-2.5 text-sm font-medium disabled:cursor-wait disabled:opacity-60 ${
        danger ? "border-red-700 text-red-800 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950" : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      }`}
    >
      {pending ? "Saving…" : `Move to ${STATUS_LABEL[to]}`}
    </button>
  );
}
