"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { createOrder, type CheckoutState } from "@/app/(store)/checkout/actions";
import { useCart } from "@/lib/cart-store";
import { formatPeso } from "@/lib/money";
import { REGIONS } from "@/lib/regions";
import { suggestSchoolNames } from "@/lib/school-abbreviations";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base outline-none transition hover:border-zinc-400 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-600/15 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500";

function Field({ id, label, hint, error, children }: { id: string; label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-5 text-red-700 dark:text-red-400">
          <svg viewBox="0 0 20 20" className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" fill="currentColor">
            <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.9 4.2h1.8v5h-1.8v-5Zm0 6.4h1.8v1.8H9.1v-1.8Z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// One numbered card of the form: a yellow step badge, a title and a line saying why we ask. Cards stay mounted
// when it is not their turn (just hidden), so everything typed is still sent when the order is placed.
function Section({ n, title, note, shown, leaving, footer, children }: { n: number; title: string; note: string; shown: boolean; leaving: boolean; footer: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`section-${n}`} hidden={!shown} data-leaving={shown && leaving ? "" : undefined} className="step-card lift-card rounded-3xl border border-zinc-200/70 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-start gap-3.5">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-yellow text-base font-extrabold text-zinc-950">
          {n}
        </span>
        <div>
          <h2 id={`section-${n}`} className="text-xl font-extrabold tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{note}</p>
        </div>
      </header>
      <div className="mt-6 grid gap-5">{children}</div>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">{footer}</div>
    </section>
  );
}

const STEP_TITLES = ["About you", "Delivery", "Email"] as const;

// What each of the first two cards needs before the next one opens; the server still checks everything.
const REQUIRED: Record<number, [string, string][]> = {
  1: [
    ["name", "Enter your full name"],
    ["university", "Enter the full name of your university or college"],
    ["universityAddress", "Enter your university or college address"],
    ["regionCode", "Choose the region of your university"],
  ],
  2: [
    ["homeAddressLink", "Paste your Google Maps link"],
    ["homeLandmark", "Enter a landmark near your home"],
    ["contactNumber", "Enter your contact number"],
  ],
};
const STEP_OF: Record<string, number> = {
  name: 1, university: 1, universityAddress: 1, regionCode: 1,
  homeAddressLink: 2, homeLandmark: 2, contactNumber: 2,
  email: 3, emailConfirm: 3, consent: 3,
};

const backBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";
const nextBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-sky-800 px-7 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700";

// Three segments showing how far along the buyer is; finished ones go back when tapped.
function Progress({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="grid grid-cols-3 gap-2">
        {STEP_TITLES.map((t, i) => {
          const n = i + 1;
          const done = n < step;
          return (
            <li key={t} aria-current={n === step ? "step" : undefined}>
              <button
                type="button"
                disabled={!done}
                onClick={() => onGo(n)}
                className="group block w-full text-left disabled:cursor-default"
              >
                <span className={"block h-1.5 rounded-full transition-colors " + (n <= step ? "bg-brand-yellow" : "bg-zinc-200 dark:bg-zinc-800")} />
                <span className={"mt-2 block text-xs font-semibold " + (n === step ? "text-zinc-900 dark:text-zinc-100" : done ? "text-zinc-600 group-hover:underline dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-500")}>
                  {n}. {t}
                  {done ? " ✓" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// The school name is typed freely, so when it looks like an abbreviation (UP, DLSU, FEU...) we offer the full
// name as a tap-to-accept suggestion. The input stays uncontrolled-looking but is controlled so we can fill it.
function UniversityInput({ initial, error }: { initial: string; error?: string }) {
  const [value, setValue] = useState(initial);
  const [generated, setGenerated] = useState<Record<string, string[]> | null>(null);
  // The big acronym list loads on first use, so it never weighs on the page itself.
  useEffect(() => {
    if (generated || value.trim().length < 2) return;
    let live = true;
    import("@/lib/school-acronyms.generated").then((m) => live && setGenerated(m.SCHOOL_ACRONYMS));
    return () => {
      live = false;
    };
  }, [value, generated]);
  const suggestions = suggestSchoolNames(value, generated);
  return (
    <Field
      id="university"
      label="Name of University/College"
      hint="Please type the full name, not the abbreviation (for example, “University of the Philippines Diliman”, not “UPD”)."
      error={error}
    >
      <input
        id="university"
        name="university"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="organization"
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "university-error" : "university-hint"}
      />
      {suggestions.length > 0 && (
        <p className="mt-1 text-sm" role="status">
          Do you mean{" "}
          {suggestions.map((name, i) => (
            <span key={name}>
              {i > 0 && (i === suggestions.length - 1 ? " or " : ", ")}
              <button
                type="button"
                onClick={() => setValue(name)}
                className="font-semibold text-sky-800 underline underline-offset-2 hover:text-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:text-sky-300"
              >
                {name}
              </button>
            </span>
          ))}
          ?
        </p>
      )}
    </Field>
  );
}

// Email is typed twice. Besides the server check on submit, tell the buyer live while the two differ
// (compared the way the server does: trimmed, lowercase).
function EmailFields({
  initialEmail,
  initialConfirm,
  emailError,
  confirmError,
}: {
  initialEmail: string;
  initialConfirm: string;
  emailError?: string;
  confirmError?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [confirm, setConfirm] = useState(initialConfirm);
  const norm = (v: string) => v.trim().toLowerCase();
  const mismatch = confirm !== "" && norm(email) !== norm(confirm);
  const matches = confirm !== "" && !mismatch;
  const shownConfirmError = confirmError ?? (mismatch ? "The two email addresses do not match" : undefined);
  return (
    <>
      <Field id="email" label="Email address" hint="Your Order ID and updates are sent here, so double-check it." error={emailError}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
        />
      </Field>
      <Field id="emailConfirm" label="Confirm email address" error={shownConfirmError}>
        <input
          id="emailConfirm"
          name="emailConfirm"
          type="email"
          autoComplete="off"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
          aria-invalid={shownConfirmError ? true : undefined}
          aria-describedby={shownConfirmError ? "emailConfirm-error" : undefined}
        />
        {matches && !confirmError && (
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400" role="status">
            Email addresses match.
          </p>
        )}
      </Field>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-yellow px-5 py-3.5 text-base font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-brand-yellow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Saving your order…" : "Continue to payment"}
      {!pending && (
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10h12m0 0-5-5m5 5-5 5" />
        </svg>
      )}
    </button>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { ready, items, count, total, clear } = useCart();
  const [state, formAction] = useActionState<CheckoutState | null, FormData>(createOrder, null);
  const keyRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  // Fields the buyer has edited since the server last complained: their old message goes away at once.
  const [edited, setEdited] = useState<Record<string, true>>({});
  const [seenState, setSeenState] = useState(state);
  // When the server sends the form back with problems, reopen the earliest card that has one.
  if (state !== seenState) {
    setSeenState(state);
    if (state && !state.ok) {
      const bad = Object.keys(state.errors ?? {}).map((k) => STEP_OF[k] ?? 3);
      setStep(bad.length ? Math.min(...bad) : 3);
      setStepErrors({});
      setEdited({});
    }
  }

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
      <div role="status" aria-busy="true" className="mt-8 h-64 animate-pulse rounded-3xl bg-zinc-100 dark:bg-zinc-900">
        <span className="sr-only">Loading checkout</span>
      </div>
    );
  }

  if (items.length === 0 && !state?.ok) {
    return (
      <section className="lift-panel relative isolate mt-8 overflow-hidden rounded-3xl bg-brand-blue px-6 py-10 text-zinc-950 sm:px-10">
        <div aria-hidden="true" className="absolute -right-10 -top-10 -z-10 size-40 rounded-bl-full bg-brand-yellow sm:size-56" />
        <div aria-hidden="true" className="shop-dots absolute inset-0 -z-10" />
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-2xl font-extrabold tracking-tight sm:text-3xl">Your cart is empty.</p>
            <p className="mt-2 max-w-sm font-medium text-zinc-950/80">Add something from the shop before checking out.</p>
            <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
              Browse the shop
            </Link>
          </div>
          <Image src="/brand/nova-blue.webp" alt="" width={900} height={876} unoptimized className="shop-float mx-auto h-auto w-32 drop-shadow-xl sm:w-44" />
        </div>
      </section>
    );
  }

  const failed = state && !state.ok ? state : null;
  const errors: Record<string, string | undefined> = failed?.errors ?? {};
  const err = (k: string) => (edited[k] ? undefined : (stepErrors[k] ?? errors[k]));
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

  // The card on screen eases out, then the next one eases in (skipped for people who ask for less motion).
  const goTo = (n: number) => {
    if (leaving) return;
    const swap = () => {
      setStep(n);
      setStepErrors({});
      setLeaving(false);
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return swap();
    setLeaving(true);
    setTimeout(swap, 170);
  };

  // Opens the next card once this one is filled in; otherwise says what is missing and stays put.
  const next = () => {
    const fd = new FormData(formRef.current!);
    const missing = (REQUIRED[step] ?? []).filter(([k]) => !String(fd.get(k) ?? "").trim());
    if (missing.length) {
      setStepErrors(Object.fromEntries(missing));
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`#${missing[0][0]}`)?.focus());
      return;
    }
    goTo(step + 1);
  };

  // Enter in a field moves on instead of placing the order before the last card.
  const onInput = (e: FormEvent<HTMLFormElement>) => {
    const name = (e.target as HTMLInputElement).name;
    if (!name) return;
    setEdited((p) => (p[name] ? p : { ...p, [name]: true }));
    setStepErrors((p) => {
      if (!(name in p)) return p;
      const rest = { ...p };
      delete rest[name];
      return rest;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && step < 3 && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      next();
    }
  };

  const arrowRight = (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12m0 0-5-5m5 5-5 5" />
    </svg>
  );
  const arrowLeft = (
    <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 10H4m0 0 5-5m-5 5 5 5" />
    </svg>
  );

  return (
    <form ref={formRef} action={submit} onKeyDown={onKeyDown} onInput={onInput} className="mt-8 grid scroll-mt-4 items-start gap-6 lg:grid-cols-[1fr_24rem] lg:gap-8" noValidate>
      <div key={failed ? JSON.stringify([failed.values, failed.errors, failed.message]) : "initial"} className="space-y-5">
        {failed?.message && (
          <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {failed.message}
          </p>
        )}

        <div className="page-enter" style={{ "--enter-delay": "60ms" } as CSSProperties}>
          <Progress step={step} onGo={goTo} />
        </div>

        <Section
          n={1}
          title="About you"
          note="Who the order is for, and the school we tie it to."
          shown={step === 1}
          leaving={leaving}
          footer={
            <>
              <Link href="/cart" className={backBtn}>
                {arrowLeft} Back to cart
              </Link>
              <button type="button" onClick={next} className={nextBtn}>
                Continue {arrowRight}
              </button>
            </>
          }
        >
          <Field id="name" label="Full name" error={err("name")}>
            <input id="name" name="name" autoComplete="name" placeholder="Juan Dela Cruz" defaultValue={val("name")} className={inputClass} {...aria("name")} />
          </Field>
          <UniversityInput initial={val("university")} error={err("university")} />
          <Field id="universityAddress" label="University/College Address" error={err("universityAddress")}>
            <input id="universityAddress" name="universityAddress" placeholder="Street, city, province" defaultValue={val("universityAddress")} className={inputClass} {...aria("universityAddress")} />
          </Field>
          <Field id="regionCode" label="Region of your university" hint="This sets the first part of your Order ID." error={err("regionCode")}>
            <div className="relative">
              <select id="regionCode" name="regionCode" defaultValue={val("regionCode")} className={`${inputClass} appearance-none pr-11`} {...aria("regionCode")}>
                <option value="" disabled>
                  Choose a region
                </option>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-4 top-1/2 mt-0.5 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 7.5 5 5 5-5" />
              </svg>
            </div>
          </Field>
        </Section>

        <Section
          n={2}
          title="Delivery details"
          note="Where the rider should find you, and how to reach you."
          shown={step === 2}
          leaving={leaving}
          footer={
            <>
              <button type="button" onClick={() => goTo(1)} className={backBtn}>
                {arrowLeft} Back
              </button>
              <button type="button" onClick={next} className={nextBtn}>
                Continue {arrowRight}
              </button>
            </>
          }
        >
          <Field
            id="homeAddressLink"
            label={
              <>
                Home address (
                <a
                  href="https://support.google.com/maps/answer/144361"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-800 underline underline-offset-2 hover:text-sky-900 dark:text-sky-300"
                >
                  Google Maps link
                </a>
                )
              </>
            }
            error={err("homeAddressLink")}
          >
            <input id="homeAddressLink" name="homeAddressLink" inputMode="url" autoComplete="off" placeholder="https://maps.app.goo.gl/…" defaultValue={val("homeAddressLink")} className={inputClass} {...aria("homeAddressLink")} />
          </Field>
          <Field id="homeLandmark" label="Landmark near your home" error={err("homeLandmark")}>
            <input id="homeLandmark" name="homeLandmark" placeholder="Beside the barangay hall" defaultValue={val("homeLandmark")} className={inputClass} {...aria("homeLandmark")} />
          </Field>
          <Field id="contactNumber" label="Contact number" hint="We use the last 4 digits so you can track your order." error={err("contactNumber")}>
            <input id="contactNumber" name="contactNumber" type="tel" autoComplete="tel" placeholder="09XX XXX XXXX" defaultValue={val("contactNumber")} className={inputClass} {...aria("contactNumber")} />
          </Field>
        </Section>

        <Section
          n={3}
          title="Email"
          note="Your Order ID and every status update are sent here."
          shown={step === 3}
          leaving={leaving}
          footer={
            <>
              <button type="button" onClick={() => goTo(2)} className={backBtn}>
                {arrowLeft} Back
              </button>
              <div className="sm:w-72">
                <SubmitButton />
              </div>
            </>
          }
        >
          <EmailFields initialEmail={val("email")} initialConfirm={val("emailConfirm")} emailError={err("email")} confirmError={err("emailConfirm")} />
          <div className="rounded-2xl bg-zinc-100 p-4 dark:bg-white/5">
            <label className="flex items-start gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
              <input type="checkbox" name="consent" defaultChecked={val("consent") === "on"} className="mt-1 size-4 shrink-0" aria-invalid={err("consent") ? true : undefined} aria-describedby={err("consent") ? "consent-error" : undefined} />
              <span>
                I have read the{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-sky-800 underline underline-offset-4 dark:text-brand-yellow">
                  Privacy Notice
                </Link>{" "}
                and agree that START-DOST may use my details to process and deliver my order.
              </span>
            </label>
            {err("consent") && (
              <p id="consent-error" role="alert" className="mt-2 text-xs font-medium text-red-700 dark:text-red-300">
                {err("consent")}
              </p>
            )}
          </div>
        </Section>

        {/* Honeypot: hidden from people, tempting to bots */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
      </div>

      {/* The summary: a light card in light mode, the brand's dark ground in dark mode. Not sticky, so the page scrolls as one. Consent and the order button sit on the last card. */}
      <aside style={{ "--enter-delay": "140ms" } as CSSProperties} className="page-enter lift-card relative isolate overflow-hidden rounded-3xl border border-zinc-200/70 bg-white p-6 text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100">
        <div aria-hidden="true" className="absolute -right-8 -top-8 -z-10 size-24 rounded-bl-full bg-brand-blue" />
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="mt-4 divide-y divide-zinc-200 dark:divide-white/10 text-sm">
          {items.map((i) => (
            <li key={`${i.productId}:${i.size}`} className="flex gap-3 py-3 first:pt-0">
              <Image src={i.image ?? "/products/jacket.svg"} alt="" width={56} height={56} unoptimized className="size-14 shrink-0 rounded-xl bg-product-backdrop object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.name}</p>
                <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                  Size {i.size} · {i.quantity} × {formatPeso(i.unitPriceCentavos)}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">{formatPeso(i.unitPriceCentavos * i.quantity)}</p>
            </li>
          ))}
        </ul>
        <p className="flex items-baseline justify-between border-t border-zinc-200 dark:border-white/10 pt-5">
          <span className="font-semibold">
            Total <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">({count} {count === 1 ? "item" : "items"})</span>
          </span>
          <span className="text-3xl font-extrabold tabular-nums">{formatPeso(total)}</span>
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">You pay this full amount by QR on the next screen. We confirm the final total when you continue.</p>

        <p className="mt-4 text-center text-sm">
          <Link href="/cart" className="text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
            Edit cart
          </Link>
        </p>
      </aside>
    </form>
  );
}
