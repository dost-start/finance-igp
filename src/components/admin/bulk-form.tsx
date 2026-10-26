"use client";

import { useActionState, useEffect, useRef, useState, startTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { bulkSetStatus, type BulkState } from "@/app/admin/actions";
import { STATUS_EMAIL_STATUSES } from "@/lib/email/templates";
import { STATUS_LABEL } from "@/lib/status";

function Apply({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || count === 0}
      className="rounded-md bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Updating…" : `Update ${count} selected`}
    </button>
  );
}

// Wraps the order table. Tick orders, choose the next status, add an optional note, and every
// selected order moves and its buyer is emailed. The table itself is rendered on the server.
export function BulkForm({ children }: { children: ReactNode }) {
  const [state, dispatch] = useActionState<BulkState, FormData>(bulkSetStatus, null);
  const [count, setCount] = useState(0);
  const form = useRef<HTMLFormElement>(null);

  // After a successful update the ticks are cleared. A refused one (no status chosen, no reason to
  // cancel) keeps the selection, so a long selection is never lost to a typo.
  useEffect(() => {
    const f = form.current;
    if (state?.ok && f) {
      // Real clicks, so the selected count updates through the form's own change handler.
      for (const box of f.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked')) box.click();
      f.reset();
    }
  }, [state]);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => dispatch(data));
      }}
      onChange={(e) => setCount(new FormData(e.currentTarget).getAll("ids").length)}
    >
      {children}

      <div className="sticky bottom-0 mt-4 rounded-lg border border-zinc-300 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        <fieldset className="grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
          <legend className="mb-2 text-sm font-semibold">Update the selected orders together</legend>
          <div>
            <label htmlFor="bulk-to" className="text-sm font-medium">
              Move to
            </label>
            <select id="bulk-to" name="to" defaultValue="" className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700">
              <option value="" disabled>
                Choose a status
              </option>
              {STATUS_EMAIL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bulk-note" className="text-sm font-medium">
              Note for the buyers <span className="font-normal text-zinc-500">(optional, shown in the email; required to cancel)</span>
            </label>
            <input id="bulk-note" name="note" maxLength={300} autoComplete="off" className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700" />
          </div>
          <Apply count={count} />
        </fieldset>
        <div role="status" className="mt-3 text-sm">
          {state && (
            <>
              <p className={state.ok ? "font-medium text-emerald-800 dark:text-emerald-300" : "font-medium text-red-800 dark:text-red-300"}>{state.message}</p>
              {state.skipped && state.skipped.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
                  {state.skipped.slice(0, 10).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                  {state.skipped.length > 10 && <li>and {state.skipped.length - 10} more</li>}
                </ul>
              )}
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Confirming or rejecting a payment is always done one order at a time, on its own screen. Orders that cannot make the chosen move are skipped and listed here.</p>
      </div>
    </form>
  );
}
