import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import type { DuplicateOrder } from "@/lib/duplicates";
import { fieldChecks, type FieldCheck, type OcrResult } from "@/lib/ocr/judge";
import { parseCentavos } from "@/lib/ocr/parse";
import { formatPeso } from "@/lib/money";

type Props = {
  totalCentavos: number;
  typedReference: string;
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
  return <span className="text-zinc-500">– Not read</span>;
}

export function OcrPanel({ totalCentavos, typedReference, ocrAmount, ocrReference, ocrResult, duplicates }: Props) {
  const amountCentavos = ocrAmount ? parseCentavos(ocrAmount) : null;
  const checks = fieldChecks({ amountCentavos, reference: ocrReference }, { totalCentavos, typedReference });
  const verdict = VERDICT[ocrResult];

  return (
    <div className="space-y-3">
      {duplicates.length > 0 && (
        <div role="alert" className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-semibold">This reference number was already used on another order.</p>
          <p className="mt-1">Check that the same payment is not being claimed twice:</p>
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

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${verdict.tone}`}>{verdict.label}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 font-medium">Check</th>
              <th className="px-3 py-2 font-medium">Expected</th>
              <th className="px-3 py-2 font-medium">Read from receipt</th>
              <th className="px-3 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <tr>
              <td className="px-3 py-2">Amount</td>
              <td className="px-3 py-2 tabular-nums">{formatPeso(totalCentavos)} (order total)</td>
              <td className="px-3 py-2 tabular-nums">{amountCentavos === null ? "-" : formatPeso(amountCentavos)}</td>
              <td className="px-3 py-2">
                <Mark check={checks.amount} />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2">Reference</td>
              <td className="px-3 py-2 font-mono break-all">{typedReference} (typed by buyer)</td>
              <td className="px-3 py-2 font-mono break-all">{ocrReference ?? "-"}</td>
              <td className="px-3 py-2">
                <Mark check={checks.reference} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        The buyer&apos;s phone read this receipt, so treat it as a hint. It never confirms a payment: compare the receipt yourself before you confirm.
      </p>
    </div>
  );
}
