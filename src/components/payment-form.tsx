"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { downscaleImage } from "@/lib/image-resize";
import { formatPeso } from "@/lib/money";
import { startReading, type ReceiptReader } from "@/lib/ocr/client";
import { buildReading } from "@/lib/ocr/reading";

type Channel = { key: string; label: string; hasQr: boolean };
type Props = { orderUuid: string; totalCentavos: number; channels: Channel[]; alreadySubmitted: boolean };
type Phase = "idle" | "working" | "done" | "error";

export const SUBMITTED_MESSAGE = "Your Order & Tracking ID will be sent once your payment has been finalized by the Finance Team.";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base outline-none transition hover:border-zinc-400 focus-visible:border-brand-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-600/15 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-500";

const backBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";
const nextBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-sky-800 px-7 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";

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

const STEP_TITLES = ["Scan and pay", "Send your receipt"] as const;

// Two segments showing how far along the buyer is; the finished one goes back when tapped.
function Progress({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <nav aria-label="Payment progress">
      <ol className="grid grid-cols-2 gap-2">
        {STEP_TITLES.map((t, i) => {
          const n = i + 1;
          const done = n < step;
          return (
            <li key={t} aria-current={n === step ? "step" : undefined}>
              <button type="button" disabled={!done} onClick={() => onGo(n)} className="group block w-full text-left disabled:cursor-default">
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

// A numbered card, like the checkout's. Both cards stay mounted (only hidden) so the receipt chosen is never lost.
function Card({ n, title, note, shown, leaving, footer, children }: { n: number; title: string; note: string; shown: boolean; leaving: boolean; footer: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`pay-section-${n}`} hidden={!shown} data-leaving={shown && leaving ? "" : undefined} className="step-card lift-card rounded-3xl border border-zinc-200/70 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-start gap-3.5">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-yellow text-base font-extrabold text-zinc-950">
          {n}
        </span>
        <div>
          <h2 id={`pay-section-${n}`} className="text-xl font-extrabold tracking-tight">
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

function Check({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

// What happens after the receipt is in: shown once, and again if the buyer comes back to this page.
function Received() {
  const next = [
    ["Finance checks your payment", "By hand, within 24-48 hours."],
    ["You get your Order ID", "It is emailed to you once the payment is confirmed."],
    ["Track your order", "Use the Order ID and the last 4 digits of your contact number."],
  ] as const;
  return (
    <div role="status" className="mx-auto mt-8 max-w-2xl">
      <div className="page-enter lift-panel relative isolate overflow-hidden rounded-3xl bg-brand-blue px-6 py-8 text-zinc-950 sm:px-9 sm:py-10">
        <div aria-hidden="true" className="absolute -right-10 -top-10 -z-10 size-40 rounded-bl-full bg-brand-yellow sm:size-52" />
        <div aria-hidden="true" className="shop-dots absolute inset-0 -z-10" />
        <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-zinc-950 py-1.5 pl-2 pr-3.5 text-xs font-bold uppercase tracking-wider text-white">
              <span className="grid size-5 place-items-center rounded-full bg-brand-yellow text-zinc-950">
                <Check className="size-3.5" />
              </span>
              Receipt sent
            </span>
            <h2 className="mt-4 text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Payment details received</h2>
            <p className="mt-4 max-w-md rounded-2xl bg-white/90 px-4 py-3 text-[0.95rem] font-medium leading-6 text-zinc-800 shadow-[0_10px_24px_-14px_rgb(0_40_90/0.6)]">
              Your <strong className="font-bold text-zinc-950">Order &amp; Tracking ID</strong> will be sent once your payment has been finalized by the Finance Team.
            </p>
          </div>
          <Image src="/brand/nova-yellow.webp" alt="" width={900} height={876} unoptimized className="shop-float mx-auto h-auto w-28 drop-shadow-xl sm:w-40" />
        </div>
      </div>

      <div style={{ "--enter-delay": "140ms" } as CSSProperties} className="page-enter lift-card mt-5 rounded-3xl border border-zinc-200/70 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-extrabold tracking-tight">What happens next</h3>
        <ol className="mt-4 space-y-4">
          {next.map(([title, text], i) => (
            <li key={title} className="flex items-start gap-3.5">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm font-extrabold text-zinc-950">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">We also emailed you a copy of your order. You can close this page.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/shop" className={nextBtn}>
            Back to the shop {arrowRight}
          </Link>
          <Link href="/track" className={backBtn}>
            Track an order
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PaymentForm({ orderUuid, totalCentavos, channels, alreadySubmitted }: Props) {
  const [step, setStep] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const [channel, setChannel] = useState(channels[0]?.key ?? "");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>(alreadySubmitted ? "done" : "idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ reference?: string; receipt?: string }>({});
  const [copied, setCopied] = useState(false);
  const [reading, setReading] = useState<"idle" | "reading" | "done" | "failed">("idle");
  const [workStep, setWorkStep] = useState<"checking" | "uploading">("uploading");
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  // The receipt is shrunk and read on the phone as soon as it is chosen, so both are usually done by submit time.
  const prepared = useRef<Promise<Blob> | null>(null);
  const reader = useRef<ReceiptReader | null>(null);
  const previewRef = useRef<string | null>(null);

  // Give the preview's memory back when the page goes away.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  function onFileChange(chosen: File | null) {
    reader.current?.cancel();
    reader.current = null;
    prepared.current = null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = chosen ? URL.createObjectURL(chosen) : null;
    setPreviewUrl(previewRef.current);
    setFile(chosen);
    setFieldErrors((p) => ({ ...p, receipt: undefined }));
    setReading("idle");
    if (!chosen) return;
    const shrunk = downscaleImage(chosen);
    shrunk.catch(() => {}); // a failure is reported at submit time
    prepared.current = shrunk;
    setReading("reading");
    shrunk.then(
      (blob) => {
        const r = startReading(blob);
        reader.current = r;
        void r.result.then((raw) => {
          if (reader.current === r) setReading(raw.status === "read" ? "done" : "failed");
        });
      },
      () => setReading("failed"),
    );
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("image/")) onFileChange(dropped);
  }

  const selected = channels.find((c) => c.key === channel);
  const amount = formatPeso(totalCentavos);
  const busy = phase === "working";

  // The card on screen eases out, then the next one eases in (skipped for people who ask for less motion).
  function goTo(n: number) {
    if (leaving) return;
    const swap = () => {
      setStep(n);
      setError("");
      setLeaving(false);
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return swap();
    setLeaving(true);
    setTimeout(swap, 170);
  }

  async function copyAmount() {
    try {
      await navigator.clipboard.writeText((totalCentavos / 100).toFixed(2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Copying is a convenience; the amount is on screen either way.
    }
  }

  if (phase === "done") return <Received />;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1) return goTo(2); // Enter on the first card moves on instead of submitting
    if (submitting.current) return; // one upload at a time, so a double tap cannot send twice
    setError("");
    const errs: { reference?: string; receipt?: string } = {};
    if (!reference.trim()) errs.reference = "Enter the reference number from your receipt.";
    if (!file) errs.receipt = "Choose your receipt image.";
    setFieldErrors(errs);
    if (!channel) return setError("Choose where you paid.");
    if (errs.reference || errs.receipt || !file) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(errs.reference ? "#reference" : "#receipt")?.focus());
      return;
    }

    submitting.current = true;
    setPhase("working");
    setWorkStep("checking");
    try {
      let blob: Blob;
      try {
        blob = await (prepared.current ?? downscaleImage(file));
      } catch {
        throw new Error("We could not read that image. Try a screenshot of your receipt instead.");
      }
      // Wait for the automatic reading, but never longer than its own 15 second limit, and never fail on it.
      const raw = await (reader.current ?? startReading(blob)).result;
      const read = buildReading(raw, reference.trim());
      setWorkStep("uploading");

      const fd = new FormData();
      fd.set("orderUuid", orderUuid);
      fd.set("channel", channel);
      fd.set("reference", reference);
      fd.set("ocrStatus", read.status);
      if (read.amount) fd.set("ocrAmount", read.amount);
      if (read.reference) fd.set("ocrReference", read.reference);
      fd.set("receipt", new File([blob], "receipt.jpg", { type: "image/jpeg" }));

      const res = await fetch("/api/receipt", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Something went wrong. Please try again.");
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhase("error");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-8 grid scroll-mt-4 items-start gap-6 lg:grid-cols-[1fr_22rem] lg:gap-8" noValidate>
      <div className="space-y-5">
        <div className="page-enter" style={{ "--enter-delay": "60ms" } as CSSProperties}>
          <Progress step={step} onGo={goTo} />
        </div>

        <Card
          n={1}
          title="Scan and pay"
          note="Pick the channel with the lowest transfer fee for you. Any bank or e-wallet app can scan these QR codes."
          shown={step === 1}
          leaving={leaving}
          footer={
            <>
              <Link href="/checkout" className={backBtn}>
                {arrowLeft} Back
              </Link>
              <button type="button" onClick={() => goTo(2)} disabled={!selected?.hasQr} className={nextBtn}>
                I have paid {arrowRight}
              </button>
            </>
          }
        >
          <div role="radiogroup" aria-label="Payment channel" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {channels.map((c) => (
              <label
                key={c.key}
                className={[
                  "cursor-pointer rounded-xl border-2 px-3 py-3 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-700",
                  channel === c.key
                    ? "border-sky-800 bg-sky-800 text-white"
                    : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500",
                ].join(" ")}
              >
                <input type="radio" name="channel" value={c.key} checked={channel === c.key} onChange={() => setChannel(c.key)} className="sr-only" />
                {c.label}
              </label>
            ))}
          </div>

          <div className="relative isolate overflow-hidden rounded-2xl bg-zinc-100 p-4 sm:p-6 dark:bg-zinc-950">
            <div aria-hidden="true" className="absolute -right-6 -top-6 -z-10 size-20 rounded-bl-full bg-brand-yellow" />
            <div className="flex flex-col items-center">
              {selected?.hasQr ? (
                <Image
                  key={selected.key}
                  src={`/api/qr/${selected.key}?order=${orderUuid}`}
                  alt={`${selected.label} QR code for payment`}
                  width={360}
                  height={460}
                  unoptimized
                  className="h-auto w-full max-w-[17rem] rounded-2xl bg-white p-2 shadow-[0_12px_28px_-14px_rgb(18_18_18/0.35)]"
                />
              ) : (
                <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">The {selected?.label} QR code is not available yet. Please choose another channel.</p>
              )}
              <p className="mt-5 text-center text-sm text-zinc-600 dark:text-zinc-400">Scan, then enter exactly</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-3xl font-extrabold tabular-nums">{amount}</p>
                <button
                  type="button"
                  onClick={copyAmount}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {copied ? "Copied" : "Copy amount"}
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card
          n={2}
          title="Send your receipt"
          note="Finance matches it to your order. A screenshot of the receipt screen works best."
          shown={step === 2}
          leaving={leaving}
          footer={
            <>
              <button type="button" onClick={() => goTo(1)} className={backBtn} disabled={busy}>
                {arrowLeft} Back
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-full bg-brand-yellow px-7 py-3.5 text-base font-bold text-zinc-950 transition hover:-translate-y-0.5 hover:bg-brand-yellow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 sm:w-72"
              >
                {busy ? (workStep === "checking" ? "Checking receipt…" : "Uploading…") : phase === "error" ? "Try again" : "Submit payment details"}
                {!busy && arrowRight}
              </button>
            </>
          }
        >
          {error && (
            <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="reference" className="text-sm font-semibold">
              Reference number
            </label>
            <input
              id="reference"
              name="reference"
              autoComplete="off"
              placeholder="e.g. 1234 567 890123"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setFieldErrors((p) => ({ ...p, reference: undefined }));
              }}
              className={inputClass}
              aria-invalid={fieldErrors.reference ? true : undefined}
              aria-describedby={fieldErrors.reference ? "reference-error" : "reference-hint"}
            />
            {fieldErrors.reference ? (
              <p id="reference-error" role="alert" className="mt-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                {fieldErrors.reference}
              </p>
            ) : (
              <p id="reference-hint" className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Copy it from the receipt screen of your banking or e-wallet app.
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold">Receipt image</p>
            <label
              htmlFor="receipt"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={[
                "mt-1.5 block cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-700",
                fieldErrors.receipt ? "border-red-600" : dragging ? "border-brand-blue bg-brand-blue/10" : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500",
              ].join(" ")}
            >
              <input
                id="receipt"
                name="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                className="sr-only"
                aria-describedby="receipt-hint receipt-reading"
              />
              {file && previewUrl ? (
                <span className="flex items-center gap-4 text-left">
                  <Image src={previewUrl} alt="Your chosen receipt" width={96} height={96} unoptimized className="size-20 shrink-0 rounded-xl bg-zinc-100 object-cover sm:size-24 dark:bg-zinc-800" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{file.name}</span>
                    <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">Tap to choose a different image</span>
                  </span>
                </span>
              ) : (
                <span className="block py-3">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-yellow text-zinc-950">
                    <svg viewBox="0 0 20 20" className="size-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5M4 13v2.5h12V13" />
                    </svg>
                  </span>
                  <span className="mt-3 block font-semibold">Choose your receipt image</span>
                  <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">or drop it here</span>
                </span>
              )}
            </label>
            {fieldErrors.receipt && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                {fieldErrors.receipt}
              </p>
            )}
            <p id="receipt-hint" className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Paid in several transactions? Combine the screenshots into one image first.            </p>
            <p id="receipt-reading" role="status" className="mt-1 min-h-4 text-xs text-zinc-500 dark:text-zinc-400">
              {reading === "reading" && "Reading your receipt on your phone to help finance check it…"}
              {reading === "done" && "Receipt read on your phone. Finance still checks every payment by hand."}
              {reading === "failed" && "We could not read this receipt automatically. That is fine: you can still submit and finance will check it by hand."}
            </p>
          </div>
        </Card>
      </div>

      <aside style={{ "--enter-delay": "140ms" } as CSSProperties} className="page-enter lift-card relative isolate overflow-hidden rounded-3xl border border-zinc-200/70 bg-white p-6 text-zinc-900 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-100">
        <div aria-hidden="true" className="absolute -right-8 -top-8 -z-10 size-24 rounded-bl-full bg-brand-blue" />
        <h2 className="text-lg font-bold">Amount due</h2>
        <p className="mt-3 text-4xl font-extrabold tabular-nums">{amount}</p>
        <ul className="mt-5 space-y-2.5 border-t border-zinc-200 pt-5 text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-300">
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Finance checks every payment by hand.
          </li>
          <li className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Your Order ID is emailed to you after that.
          </li>
        </ul>
      </aside>
    </form>
  );
}
