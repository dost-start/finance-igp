import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import type { DuplicateOrder } from "@/lib/duplicates";
import { fieldChecks, type FieldCheck, type OcrResult } from "@/lib/ocr/judge";
import { parseCentavos } from "@/lib/ocr/parse";
import { formatPeso } from "@/lib/money";

type Props = {
  totalCentavos: number;
  typedReference: string;
  channel: string;
  ocrAmount: string | null;
  ocrReference: string | null;
  ocrResult: OcrResult;
  duplicates: DuplicateOrder[];
};

const VERDICT: Record<OcrResult, { label: string; tone: string }> = {
  match: { label: "Reading matches", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  mismatch: { label: "Reading does not match: check first", tone: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" },
  unreadable: { label: "Could not be read: check by eye", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  not_checked: { label: "Not checked", tone: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

// Each mark has a symbol and words, so it reads without colour.
function Mark({ check }: { check: FieldCheck }) {
  if (check === "match") return <span className="font-medium text-emerald-700 dark:text-emerald-400">✓ Match</span>;
  if (check === "mismatch") return <span className="font-medium text-red-700 dark:text-red-400">✗ Different</span>;
  return <span className="text-zinc-500 dark:text-zinc-400">– Not read</span>;
}

function Compare({ label, check, left, right, mono }: { label: string; check: FieldCheck; left: { caption: string; value: string }; right: { caption: string; value: string }; mono?: boolean }) {
  const value = `mt-0.5 break-all text-sm font-medium ${mono ? "font-mono" : "tabular-nums"}`;
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm font-semibold">{label}</dt>
        <dd className="text-sm">
          <Mark check={check} />
        </dd>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{left.caption}</p>
          <p className={value}>{left.value}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{right.caption}</p>
          <p className={value}>{right.value}</p>
        </div>
      </div>
    </div>
  );
}

// Everything finance compares, in one box beside the receipt: what the buyer owes and typed, what the buyer's
// phone read from the receipt, and whether they agree. The reading is a hint; the decision stays with finance.
export function OcrPanel({ totalCentavos, typedReference, channel, ocrAmount, ocrReference, ocrResult, duplicates }: Props) {
  const amountCentavos = ocrAmount ? parseCentavos(ocrAmount) : null;
  const checks = fieldChecks({ amountCentavos, reference: ocrReference }, { totalCentavos, typedReference });
  const verdict = VERDICT[ocrResult];

  return (
    <section aria-labelledby="check-heading" className="lift-card rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="check-heading" className="text-base font-semibold">
          Check against the receipt
        </h2>
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${verdict.tone}`}>{verdict.label}</span>
      </div>

      {duplicates.length > 0 && (
        <div role="alert" className="mt-4 rounded-2xl border border-amber-400 bg-amber-50 p-4 text-sm font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-semibold">This reference number was already used on another order.</p>
          <p className="mt-1">Make sure the same payment is not claimed twice:</p>
          <ul className="mt-2 space-y-1">
            {duplicates.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/orders/${d.id}`} className="font-mono underline underline-offset-4">
                  {d.orderId}
                </Link>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">
        <Compare label="Amount" check={checks.amount} left={{ caption: "Total the buyer owes", value: formatPeso(totalCentavos) }} right={{ caption: "Receipt reads", value: amountCentavos === null ? "-" : formatPeso(amountCentavos) }} />
        <Compare label="Reference" mono check={checks.reference} left={{ caption: "Typed by the buyer", value: typedReference }} right={{ caption: "Receipt reads", value: ocrReference ?? "-" }} />
        <div className="flex items-baseline justify-between gap-3 py-3">
          <dt className="text-sm font-semibold">Paid via</dt>
          <dd className="text-sm">{channel}</dd>
        </div>
      </dl>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">The buyer&apos;s phone read this receipt. Treat it as a hint and compare it yourself before confirming.</p>
    </section>
  );
}
