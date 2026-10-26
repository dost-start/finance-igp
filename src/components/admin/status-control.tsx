"use client";

import { useFormStatus } from "react-dom";
import { setOrderStatus } from "@/app/admin/actions";
import type { OrderStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/status";

// One step forward at a time. The optional note is saved in the order's history and printed in the
// buyer's email. Each button saves exactly the status named on it, with the note typed above.
// refundBlocked: the reason Refund in Process is not possible yet (a value finance has not given), or null.
export function StatusControl({ orderUuid, options, refundBlocked }: { orderUuid: string; options: readonly OrderStatus[]; refundBlocked?: string | null }) {
  if (options.length === 0) return <p className="text-sm text-zinc-500">No further steps for this order.</p>;
  return (
    <form className="space-y-3">
      <div>
        <label htmlFor="note" className="text-sm font-medium">
          Note for the buyer <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={300}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          aria-describedby="note-hint"
        />
        <p id="note-hint" className="mt-1 text-xs text-zinc-500">
          Printed in the email the buyer receives. When canceling, this is the reason they read, so it is required.
        </p>
      </div>
      {options.map((s) => (
        <StatusButton key={s} orderUuid={orderUuid} to={s} blocked={s === "refund_in_process" && !!refundBlocked} />
      ))}
      {refundBlocked && options.includes("refund_in_process") && (
        <p role="alert" className="text-sm font-medium text-amber-900 dark:text-amber-200">
          {refundBlocked} Refund in Process stays off until it is set, so no buyer gets a blank refund promise.
        </p>
      )}
      <p className="text-xs text-zinc-500">The buyer is emailed about the new status.</p>
    </form>
  );
}

function StatusButton({ orderUuid, to, blocked }: { orderUuid: string; to: OrderStatus; blocked?: boolean }) {
  const { pending } = useFormStatus();
  const danger = to === "canceled";
  return (
    <button
      type="submit"
      formAction={setOrderStatus.bind(null, orderUuid, to)}
      disabled={pending || blocked}
      className={`w-full rounded-md border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
        danger ? "border-red-700 text-red-800 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950" : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      }`}
    >
      {pending ? "Saving…" : `Move to ${STATUS_LABEL[to]}`}
    </button>
  );
}
