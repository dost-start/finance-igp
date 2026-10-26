import type { OcrResult } from "@/lib/ocr/judge";

const BADGE: Record<OcrResult, { label: string; tone: string }> = {
  match: { label: "Matches", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  mismatch: { label: "Not matching", tone: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200" },
  unreadable: { label: "Unreadable", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  not_checked: { label: "Not checked", tone: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

// The receipt reading at a glance. The words carry the meaning, the colour only helps.
export function OcrBadge({ result }: { result: OcrResult | null }) {
  if (!result) return <span className="text-zinc-400">-</span>;
  const b = BADGE[result];
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${b.tone}`}>{b.label}</span>;
}
