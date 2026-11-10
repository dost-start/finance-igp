"use client";

import { useFormStatus } from "react-dom";
import { confirmPayment, rejectPayment } from "@/app/admin/actions";
import { REJECT_REASONS } from "@/lib/email/templates";

function Submit({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} rounded-xl px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60`}>
      {pending ? "Saving…" : children}
    </button>
  );
}

// Confirm and reject each run once per click; the button disables while the request is saving.
export function ReviewActions({ orderUuid }: { orderUuid: string }) {
  return (
    <div className="space-y-6">
      <form action={confirmPayment.bind(null, orderUuid)}>
        <Submit className="w-full bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700">Confirm payment</Submit>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Emails the buyer their Order ID and tracking link.</p>
      </form>

      <form action={rejectPayment.bind(null, orderUuid)} className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <label htmlFor="reason" className="text-sm font-medium">
          Reason for rejecting
        </label>
        <select id="reason" name="reason" required defaultValue="" className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus-visible:border-brand-blue focus-visible:ring-4 focus-visible:ring-brand-blue/25 dark:border-zinc-700 dark:bg-zinc-950">
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
          <Submit className="w-full border border-red-700 text-red-800 hover:bg-red-50 focus-visible:outline-red-700 dark:text-red-300 dark:hover:bg-red-950">Reject payment</Submit>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Emails the buyer the reason and the form to send a new receipt.</p>
      </form>
    </div>
  );
}
