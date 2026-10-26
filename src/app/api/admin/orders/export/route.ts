import { getDb, schema } from "@/db";
import { getAdmin } from "@/lib/admin";
import { formatManila } from "@/lib/email/templates";
import { filtersToQuery, parseFilters, toCsv } from "@/lib/order-filters";
import { EXPORT_LIMIT, exportOrders } from "@/lib/order-list";
import { STATUS_LABEL } from "@/lib/status";

// CSV of the orders matching the list's filters, for finance's spreadsheets. It holds buyers'
// personal details, so only a signed-in active admin gets it, and each export is written to the audit log.
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Sign in required", { status: 401, headers: { "Cache-Control": "no-store" } });

  const filters = parseFilters(Object.fromEntries(new URL(request.url).searchParams));
  const rows = await exportOrders(filters);

  const header = ["Order ID", "Status", "Buyer", "Email", "Contact number", "University", "University address", "Home address (map link)", "Landmark", "Items", "Total (PHP)", "Paid via", "Reference typed", "Receipt reading", "Amount read", "Verified by", "Ordered at", "Link"];
  const body = rows.map((r) => [
    r.orderId,
    STATUS_LABEL[r.status],
    r.buyer,
    r.email,
    r.contactNumber,
    r.university,
    r.universityAddress,
    r.homeAddressLink,
    r.homeLandmark,
    r.items ?? "",
    (r.total / 100).toFixed(2),
    r.channel ?? "",
    r.reference ?? "",
    r.ocrResult ?? "",
    r.ocrAmount ?? "",
    r.verifiedBy ?? "",
    formatManila(r.createdAt),
    `${siteUrl()}/admin/orders/${r.id}`,
  ]);

  await getDb().insert(schema.auditLogs).values({
    adminId: admin.id,
    action: "orders.export",
    after: { filters: filtersToQuery(filters, { page: 1 }) || "(none)", rows: rows.length, truncated: rows.length >= EXPORT_LIMIT },
  });

  const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  return new Response(toCsv([header, ...body]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="start-orders-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
