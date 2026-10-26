"use client";

import { useActionState } from "react";
import { lookupOrder, type TrackState } from "@/app/track/actions";
import { TrackingResult } from "@/components/tracking-result";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-sky-700 focus-visible:ring-2 focus-visible:ring-sky-700/40 dark:border-zinc-700";

export function TrackForm() {
  const [state, action, pending] = useActionState<TrackState | null, FormData>(lookupOrder, null);
  const failed = state && !state.ok ? state : null;

  return (
    <div className="space-y-8">
      {/* Keyed by the failed result so React 19's form reset keeps what the buyer typed. */}
      <form key={failed?.message ?? "form"} action={action} className="max-w-md space-y-4" noValidate>
        <div>
          <label htmlFor="orderId" className="text-sm font-medium">
            Order ID
          </label>
          <input
            id="orderId"
            name="orderId"
            defaultValue={failed?.values.orderId ?? ""}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="R13000001"
            className={`${inputClass} font-mono`}
            aria-describedby="orderId-hint"
          />
          <p id="orderId-hint" className="mt-1 text-xs text-zinc-500">
            It starts with R and is in the email we sent after finance confirmed your payment.
          </p>
        </div>
        <div>
          <label htmlFor="last4" className="text-sm font-medium">
            Last 4 digits of your contact number
          </label>
          <input
            id="last4"
            name="last4"
            defaultValue={failed?.values.last4 ?? ""}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="1234"
            className={`${inputClass} font-mono`}
          />
        </div>
        {failed && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {failed.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-sky-800 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {pending ? "Checking…" : "Track my order"}
        </button>
      </form>

      {state?.ok && <TrackingResult order={state.order} />}
    </div>
  );
}
