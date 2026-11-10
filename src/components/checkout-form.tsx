"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { createOrder, type CheckoutState } from "@/app/checkout/actions";
import { useCart } from "@/lib/cart-store";
import { formatPeso } from "@/lib/money";
import { REGIONS } from "@/lib/regions";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-sky-700 focus-visible:ring-2 focus-visible:ring-sky-700/40 aria-[invalid=true]:border-red-600 dark:border-zinc-700";

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-sky-800 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Saving your order…" : "Continue to payment"}
    </button>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { ready, items, count, total, clear } = useCart();
  const [state, formAction] = useActionState<CheckoutState | null, FormData>(createOrder, null);
  const keyRef = useRef<string | null>(null);

  useEffect(() => {
    if (state?.ok) {
      clear();
      router.push(`/pay/${state.orderUuid}`);
    }
    // clear and router are stable for this purpose; we only react to a new result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!ready && !state?.ok) {
    return (
      <div role="status" aria-busy="true" className="mt-8 h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900">
        <span className="sr-only">Loading checkout</span>
      </div>
    );
  }

  if (items.length === 0 && !state?.ok) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
        <p className="font-medium">Your cart is empty.</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Add something from the shop before checking out.</p>
        <Link href="/" className="mt-5 inline-block rounded-md bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-900">
          Browse the shop
        </Link>
      </div>
    );
  }

  const failed = state && !state.ok ? state : null;
  const errors: Record<string, string | undefined> = failed?.errors ?? {};
  const err = (k: string) => errors[k];
  const val = (k: string) => failed?.values?.[k] ?? "";
  const aria = (k: string) => ({
    "aria-invalid": err(k) ? true : undefined,
    "aria-describedby": err(k) ? `${k}-error` : undefined,
  });

  // One checkout page load keeps one key, so a double tap can never create two orders.
  const submit = (fd: FormData) => {
    fd.set("idempotencyKey", (keyRef.current ??= crypto.randomUUID()));
    fd.set("items", JSON.stringify(items.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity }))));
    return formAction(fd);
  };

  return (
    <form action={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]" noValidate>
      <div key={failed ? JSON.stringify([failed.values, failed.errors, failed.message]) : "initial"} className="space-y-8">
        {failed?.message && (
          <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {failed.message}
          </p>
        )}

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">About you</legend>
          <Field id="name" label="Full name" error={err("name")}>
            <input id="name" name="name" autoComplete="name" defaultValue={val("name")} className={inputClass} {...aria("name")} />
          </Field>
          <Field id="university" label="University" error={err("university")}>
            <input id="university" name="university" defaultValue={val("university")} className={inputClass} {...aria("university")} />
          </Field>
          <Field id="universityAddress" label="University address" error={err("universityAddress")}>
            <input id="universityAddress" name="universityAddress" defaultValue={val("universityAddress")} className={inputClass} {...aria("universityAddress")} />
          </Field>
          <Field id="regionCode" label="Region of your university" hint="This sets the first part of your Order ID." error={err("regionCode")}>
            <select id="regionCode" name="regionCode" defaultValue={val("regionCode")} className={inputClass} {...aria("regionCode")}>
              <option value="" disabled>
                Choose a region
              </option>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">Delivery details</legend>
          <Field id="homeAddressLink" label="Home address (Google Maps link)" hint="Open Google Maps, find your home, tap Share and paste the link here." error={err("homeAddressLink")}>
            <input id="homeAddressLink" name="homeAddressLink" inputMode="url" autoComplete="off" defaultValue={val("homeAddressLink")} className={inputClass} {...aria("homeAddressLink")} />
          </Field>
          <Field id="homeLandmark" label="Landmark near your home" error={err("homeLandmark")}>
            <input id="homeLandmark" name="homeLandmark" defaultValue={val("homeLandmark")} className={inputClass} {...aria("homeLandmark")} />
          </Field>
          <Field id="contactNumber" label="Contact number" hint="We use the last 4 digits so you can track your order." error={err("contactNumber")}>
            <input id="contactNumber" name="contactNumber" type="tel" autoComplete="tel" defaultValue={val("contactNumber")} className={inputClass} {...aria("contactNumber")} />
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">Email</legend>
          <Field id="email" label="Email address" hint="Your Order ID and updates are sent here, so double-check it." error={err("email")}>
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={val("email")} className={inputClass} {...aria("email")} />
          </Field>
          <Field id="emailConfirm" label="Confirm email address" error={err("emailConfirm")}>
            <input id="emailConfirm" name="emailConfirm" type="email" autoComplete="off" defaultValue={val("emailConfirm")} className={inputClass} {...aria("emailConfirm")} />
          </Field>
        </fieldset>

        {/* Honeypot: hidden from people, tempting to bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" defaultChecked={val("consent") === "on"} className="mt-0.5 size-4" aria-invalid={err("consent") ? true : undefined} aria-describedby={err("consent") ? "consent-error" : undefined} />
            <span>
              I have read the{" "}
              <Link href="/privacy" target="_blank" className="underline underline-offset-4">
                Privacy Notice
              </Link>{" "}
              and agree that START-DOST may use my details to process and deliver my order.
            </span>
          </label>
          {err("consent") && (
            <p id="consent-error" role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">
              {err("consent")}
            </p>
          )}
        </div>
      </div>

      <aside className="h-fit rounded-lg border border-zinc-200 p-5 lg:sticky lg:top-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <ul className="mt-4 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          {items.map((i) => (
            <li key={`${i.productId}:${i.size}`} className="flex gap-3 py-3">
              <Image src={i.image ?? "/products/jacket.svg"} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.name}</p>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Size {i.size} · {i.quantity} × {formatPeso(i.unitPriceCentavos)}
                </p>
              </div>
              <p className="shrink-0 tabular-nums">{formatPeso(i.unitPriceCentavos * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-zinc-200 pt-4 text-lg font-semibold dark:border-zinc-800">
          <span>
            Total <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">({count} {count === 1 ? "item" : "items"})</span>
          </span>
          <span className="tabular-nums">{formatPeso(total)}</span>
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">You pay this full amount by QR on the next screen. We confirm the final total when you continue.</p>
        <div className="mt-5">
          <SubmitButton />
        </div>
        <p className="mt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/cart" className="underline underline-offset-4">
            Back to cart
          </Link>
        </p>
      </aside>
    </form>
  );
}
