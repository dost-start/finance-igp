"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { downscaleImage } from "@/lib/image-resize";
import { formatPeso } from "@/lib/money";

type Channel = { key: string; label: string; hasQr: boolean };
type Props = { orderUuid: string; totalCentavos: number; channels: Channel[]; alreadySubmitted: boolean };
type Phase = "idle" | "working" | "done" | "error";

export const SUBMITTED_MESSAGE = "Your Order & Tracking ID will be sent once your payment has been finalized by the Finance Team.";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-sky-700 focus-visible:ring-2 focus-visible:ring-sky-700/40 aria-[invalid=true]:border-red-600 dark:border-zinc-700";

export function PaymentForm({ orderUuid, totalCentavos, channels, alreadySubmitted }: Props) {
  const [channel, setChannel] = useState(channels[0]?.key ?? "");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>(alreadySubmitted ? "done" : "idle");
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const selected = channels.find((c) => c.key === channel);
  const amount = formatPeso(totalCentavos);

  if (phase === "done") {
    return (
      <div role="status" className="mt-6 max-w-xl rounded-lg border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950">
        <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Payment details received</p>
        <p className="mt-2 leading-7 text-emerald-900 dark:text-emerald-100">&ldquo;{SUBMITTED_MESSAGE}&rdquo;</p>
        <p className="mt-3 text-sm text-emerald-900/80 dark:text-emerald-100/80">
          We also emailed you a copy of your order. You can close this page.
        </p>
        <Link href="/" className="mt-5 inline-block text-sm underline underline-offset-4">
          Back to the shop
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return; // one upload at a time, so a double tap cannot send twice
    setError("");
    if (!channel) return setError("Choose where you paid.");
    if (!reference.trim()) return setError("Enter the reference number from your receipt.");
    if (!file) return setError("Choose your receipt image.");

    submitting.current = true;
    setPhase("working");
    try {
      let blob: Blob;
      try {
        blob = await downscaleImage(file);
      } catch {
        throw new Error("We could not read that image. Try a screenshot of your receipt instead.");
      }
      const fd = new FormData();
      fd.set("orderUuid", orderUuid);
      fd.set("channel", channel);
      fd.set("reference", reference);
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

  const busy = phase === "working";

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem]" noValidate>
      <div className="space-y-8">
        <fieldset>
          <legend className="text-lg font-semibold">1. Choose where to pay</legend>
          <p className="mt-1 text-sm text-zinc-500">Pick the one with the lowest transfer fee for you. Any bank or e-wallet app can scan these QR codes.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {channels.map((c) => (
              <label
                key={c.key}
                className={[
                  "cursor-pointer rounded-md border px-3 py-3 text-center text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sky-700",
                  channel === c.key ? "border-sky-800 bg-sky-800 text-white" : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700",
                ].join(" ")}
              >
                <input type="radio" name="channel" value={c.key} checked={channel === c.key} onChange={() => setChannel(c.key)} className="sr-only" />
                {c.label}
              </label>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            {selected?.hasQr ? (
              <Image
                key={selected.key}
                src={`/api/qr/${selected.key}?order=${orderUuid}`}
                alt={`${selected.label} QR code for payment`}
                width={360}
                height={460}
                unoptimized
                className="h-auto w-full max-w-xs rounded bg-white"
              />
            ) : (
              <p className="py-10 text-sm text-zinc-500">The {selected?.label} QR code is not available yet. Please choose another channel.</p>
            )}
            <p className="mt-4 text-center text-sm text-zinc-500">
              Scan, then enter exactly <strong className="text-base text-zinc-900 dark:text-zinc-100">{amount}</strong>
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">2. Upload your receipt</legend>
          <div>
            <label htmlFor="reference" className="text-sm font-medium">
              Reference number
            </label>
            <input
              id="reference"
              name="reference"
              autoComplete="off"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={inputClass}
              aria-describedby="reference-hint"
            />
            <p id="reference-hint" className="mt-1 text-xs text-zinc-500">
              Copy it from the receipt screen of your banking or e-wallet app.
            </p>
          </div>
          <div>
            <label htmlFor="receipt" className="text-sm font-medium">
              Receipt image
            </label>
            <input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-4 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-800"
              aria-describedby="receipt-hint"
            />
            <p id="receipt-hint" className="mt-1 text-xs text-zinc-500">
              A screenshot works best. Paid in several transactions? Combine the screenshots into one image first. Large images are shrunk on your phone before upload.
            </p>
          </div>
        </fieldset>
      </div>

      <aside className="h-fit rounded-lg border border-zinc-200 p-5 lg:sticky lg:top-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Amount due</h2>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{amount}</p>
        <p className="mt-2 text-xs text-zinc-500">Pay the full amount in one go if you can. There are no discounts or partial payments.</p>
        {error && (
          <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-sky-800 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "Uploading…" : phase === "error" ? "Try again" : "Submit payment details"}
        </button>
        <p className="mt-3 text-xs text-zinc-500">Finance checks every payment by hand. Your Order ID is emailed to you after that.</p>
      </aside>
    </form>
  );
}
