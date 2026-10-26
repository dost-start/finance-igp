import type { OrderStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/status";

// Colour and wording both carry the state, so it reads at a glance and without colour.
const TONE: Record<OrderStatus, string> = {
  order_received: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  pending_payment: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  payment_confirmation: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  in_production: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  out_for_shipping: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  received_successfully: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  canceled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  refund_in_process: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  refund_successful: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  payment_rejected: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}
