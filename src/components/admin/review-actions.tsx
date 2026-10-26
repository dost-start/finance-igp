"use client";

import { useFormStatus } from "react-dom";
import { confirmPayment, rejectPayment } from "@/app/admin/actions";
import { REJECT_REASONS } from "@/lib/email/templates";

function Submit({ children, className, blocked }: { children: React.ReactNode; className: string; blocked?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || blocked} className={`${className} rounded-md px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60`}>
      {pending ? "Saving…" : children}
    </button>
  );
}

// Confirm and reject each run once per click; the button disables while the request is saving.
// rejectBlocked: the reason rejecting is not possible yet (a value finance has not given), or null.
export function ReviewActions({ orderUuid, rejectBlocked }: { orderUuid: string; rejectBlocked?: string | null }) {
  return (
    <div className="space-y-6">
      <form action={confirmPayment.bind(null, orderUuid)}>
        <Submit className="w-full bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700">Confirm payment</Submit>
        <p className="mt-2 text-xs text-zinc-500">Emails the buyer their Order ID and tracking link.</p>
      </form>

      <form action={rejectPayment.bind(null, orderUuid)} className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <label htmlFor="reason" className="text-sm font-medium">
          Reason for rejecting
        </label>
        <select id="reason" name="reason" required defaultValue="" className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">
          <option value="" disabled>
            Choose a reason
          </option>
          {REJECT_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="mt-3">
          <Submit blocked={!!rejectBlocked} className="w-full border border-red-700 text-red-800 hover:bg-red-50 focus-visible:outline-red-700 dark:text-red-300 dark:hover:bg-red-950">Reject payment</Submit>
        </div>
        {rejectBlocked ? (
          <p role="alert" className="mt-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            {rejectBlocked} Rejecting stays off until it is set, so no buyer is promised a deadline that does not exist.
          </p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">Emails the buyer the reason and the ticket form link to send a new receipt.</p>
        )}
      </form>
    </div>
  );
}
