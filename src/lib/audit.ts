import { formatLaunch } from "./launch";
import { STATUS_LABEL } from "./status";
import type { OrderStatus } from "@/db/schema";

// The audit log screen (PRD FR06.06): who changed what, and when. Every admin write already leaves
// a row with a short action code; this turns the code and its before/after into plain words.
export const AUDIT_ACTIONS = ["payment.confirm", "payment.reject", "status.change", "status.correction", "orders.export", "product.update", "product.create", "store.lock", "store.unlock", "launch.update", "backup.run"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_LABEL: Record<AuditAction, string> = {
  "payment.confirm": "Confirmed a payment",
  "payment.reject": "Rejected a payment",
  "status.change": "Changed an order's status",
  "status.correction": "Corrected an order's status",
  "orders.export": "Exported orders to CSV",
  "product.update": "Edited a product",
  "product.create": "Added a product",
  "store.lock": "Closed the store",
  "store.unlock": "Reopened the store",
  "launch.update": "Changed the launch date",
  "backup.run": "Ran a backup by hand",
};

export const isAuditAction = (a: string): a is AuditAction => (AUDIT_ACTIONS as readonly string[]).includes(a);
export const auditLabel = (action: string): string => (isAuditAction(action) ? AUDIT_LABEL[action] : action);

type Json = Record<string, unknown> | null | undefined;
const statusOf = (v: Json): string | null => {
  const s = v && typeof v === "object" ? (v as Record<string, unknown>).status : null;
  return typeof s === "string" ? (STATUS_LABEL[s as OrderStatus] ?? s) : null;
};
const text = (v: Json, key: string): string | null => {
  const x = v && typeof v === "object" ? (v as Record<string, unknown>)[key] : null;
  return typeof x === "string" && x.trim() ? x.trim() : null;
};

// One short sentence of detail for the row, or an empty string.
export function describeAudit(action: string, before: Json, after: Json): string {
  switch (action) {
    case "status.change":
    case "status.correction": {
      const from = statusOf(before);
      const to = statusOf(after);
      const why = text(after, action === "status.correction" ? "reason" : "note");
      const move = from && to ? `${from} to ${to}` : (to ?? "");
      return [move, why ? `${action === "status.correction" ? "reason" : "note"}: ${why}` : ""].filter(Boolean).join(", ");
    }
    case "payment.confirm":
      return "Pending Payment to Payment Confirmation";
    case "payment.reject": {
      const why = text(after, "reason");
      return why ? `Reason: ${why}` : "";
    }
    case "orders.export": {
      const rows = after && typeof after === "object" ? (after as Record<string, unknown>).rows : null;
      const filters = text(after, "filters");
      return `${typeof rows === "number" ? `${rows} orders` : "orders"}${filters && filters !== "(none)" ? `, filters ${filters}` : ", no filters"}`;
    }
    case "product.update": {
      const name = text(after, "name") ?? text(before, "name");
      const changed = after && typeof after === "object" && Array.isArray((after as Record<string, unknown>).changed) ? ((after as Record<string, unknown>).changed as unknown[]).filter((c): c is string => typeof c === "string") : [];
      return [name, changed.length ? `changed ${changed.join(", ")}` : ""].filter(Boolean).join(": ");
    }
    case "product.create": {
      const name = text(after, "name");
      return name ? `${name} (not on sale until switched on)` : "";
    }
    case "launch.update": {
      const from = text(before, "launchAt");
      const to = text(after, "launchAt");
      return from && to ? `From ${formatLaunch(from)} to ${formatLaunch(to)}` : "";
    }
    case "backup.run": {
      const file = text(after, "file");
      return file ?? "";
    }
    case "store.lock":
      return "No new orders or payments until it is reopened";
    case "store.unlock":
      return "Orders and payments are open again";
    default:
      return "";
  }
}
