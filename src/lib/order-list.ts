import "server-only";
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { PAGE_SIZE, likePattern, statusesForPay, type OrderFilters } from "./order-filters";

// The same normalising as src/lib/duplicates.ts and normalizeReference: letters and digits only,
// look-alike characters equal. One reference number used on two orders is flagged on both.
const normalizedOther = sql.raw(`translate(upper(regexp_replace(other.reference_number, '[^A-Za-z0-9]', '', 'g')), 'OQDIL', '00011')`);
const normalizedMine = sql`translate(upper(regexp_replace(${schema.paymentProofs.referenceNumber}, '[^A-Za-z0-9]', '', 'g')), 'OQDIL', '00011')`;

const isDuplicate = sql<boolean>`(
  length(${normalizedMine}) >= 4 and exists (
    select 1 from payment_proofs other
    where other.order_uuid <> ${schema.paymentProofs.orderUuid} and ${normalizedOther} = ${normalizedMine}
  )
)`;

function conditions(f: OrderFilters): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  if (f.status) parts.push(eq(schema.orders.status, f.status));
  if (f.pay) parts.push(inArray(schema.orders.status, [...statusesForPay(f.pay)]));
  if (f.product) parts.push(sql`exists (select 1 from order_items oi where oi.order_uuid = ${schema.orders.id} and oi.product_id = ${f.product})`);
  if (f.ocr === "attention") parts.push(inArray(schema.paymentProofs.ocrResult, ["mismatch", "unreadable"]));
  else if (f.ocr) parts.push(eq(schema.paymentProofs.ocrResult, f.ocr));
  if (f.duplicate) parts.push(isDuplicate);
  if (f.q) {
    const p = likePattern(f.q);
    parts.push(or(ilike(schema.orders.orderId, p), ilike(schema.orders.buyerName, p), ilike(schema.orders.email, p)));
  }
  return and(...parts);
}

// Orders that need a person come first: reused reference, not matching, unreadable, then the rest
// of the waiting orders (oldest receipt first), then everything already handled (newest first).
const attentionOrder = sql`case when ${schema.orders.status} = 'pending_payment' then (
  case when ${isDuplicate} then 0 when ${schema.paymentProofs.ocrResult} = 'mismatch' then 1 when ${schema.paymentProofs.ocrResult} = 'unreadable' then 2 else 3 end
) else 4 end`;
const waitingSince = sql`case when ${schema.orders.status} = 'pending_payment' then ${schema.paymentProofs.createdAt} end`;

const columns = {
  id: schema.orders.id,
  orderId: schema.orders.orderId,
  buyer: schema.orders.buyerName,
  email: schema.orders.email,
  total: schema.orders.totalCentavos,
  status: schema.orders.status,
  channel: schema.paymentProofs.channel,
  reference: schema.paymentProofs.referenceNumber,
  ocrResult: schema.paymentProofs.ocrResult,
  ocrAmount: schema.paymentProofs.ocrAmount,
  duplicate: isDuplicate,
  // mapWith: a computed column comes back as text unless it is told how to turn it into a date.
  when: sql`coalesce(${schema.paymentProofs.createdAt}, ${schema.orders.createdAt})`.mapWith(schema.orders.createdAt),
};

export type OrderRow = {
  id: string;
  orderId: string;
  buyer: string;
  email: string;
  total: number;
  status: (typeof schema.orders.$inferSelect)["status"];
  channel: string | null;
  reference: string | null;
  ocrResult: (typeof schema.paymentProofs.$inferSelect)["ocrResult"] | null;
  ocrAmount: string | null;
  duplicate: boolean;
  when: Date;
};

export async function listOrders(f: OrderFilters): Promise<{ rows: OrderRow[]; total: number }> {
  const db = getDb();
  const where = conditions(f);
  // One query returns the rows and, on each row, the total number of matches (count over the whole
  // result), so the page needs no second query to count.
  const rows = await db
    .select({ ...columns, matches: sql<number>`count(*) over ()::int` })
    .from(schema.orders)
    .leftJoin(schema.paymentProofs, eq(schema.paymentProofs.orderUuid, schema.orders.id))
    .where(where)
    .orderBy(attentionOrder, waitingSince, desc(schema.orders.createdAt))
    .limit(PAGE_SIZE)
    .offset((f.page - 1) * PAGE_SIZE);
  if (rows.length > 0) return { rows: rows as OrderRow[], total: rows[0].matches };
  if (f.page === 1) return { rows: [], total: 0 };
  // A page past the end (an old link): count what exists so the pager can say so.
  const [{ n }] = await db.select({ n: count() }).from(schema.orders).leftJoin(schema.paymentProofs, eq(schema.paymentProofs.orderUuid, schema.orders.id)).where(where);
  return { rows: [], total: n };
}

export const EXPORT_LIMIT = 5000;

export type ExportRow = OrderRow & {
  contactNumber: string;
  university: string;
  universityAddress: string;
  homeAddressLink: string;
  homeLandmark: string;
  items: string | null;
  createdAt: Date;
  verifiedBy: string | null;
};

// Every column finance needs in a spreadsheet, for the same filters as the list (no paging).
export async function exportOrders(f: OrderFilters): Promise<ExportRow[]> {
  const rows = await getDb()
    .select({
      ...columns,
      contactNumber: schema.orders.contactNumber,
      university: schema.orders.university,
      universityAddress: schema.orders.universityAddress,
      homeAddressLink: schema.orders.homeAddressLink,
      homeLandmark: schema.orders.homeLandmark,
      createdAt: schema.orders.createdAt,
      verifiedBy: sql<string | null>`(select a.email from admin_accounts a where a.id = ${schema.paymentProofs.verifiedBy})`,
      items: sql<string | null>`(
        select string_agg(p.name || ' (' || oi.size || ') x' || oi.quantity, '; ' order by p.name)
        from order_items oi join products p on p.id = oi.product_id where oi.order_uuid = ${schema.orders.id}
      )`,
    })
    .from(schema.orders)
    .leftJoin(schema.paymentProofs, eq(schema.paymentProofs.orderUuid, schema.orders.id))
    .where(conditions(f))
    .orderBy(desc(schema.orders.createdAt))
    .limit(EXPORT_LIMIT);
  return rows as ExportRow[];
}

export async function productOptions(): Promise<{ id: string; name: string }[]> {
  return getDb().select({ id: schema.products.id, name: schema.products.name }).from(schema.products).orderBy(schema.products.sortOrder);
}

// The two numbers finance looks at first on launch day.
export async function waitingSummary(): Promise<{ waiting: number; attention: number }> {
  const [row] = await getDb()
    .select({
      waiting: sql<number>`count(*) filter (where ${schema.orders.status} = 'pending_payment')::int`,
      attention: sql<number>`count(*) filter (where ${schema.orders.status} = 'pending_payment' and (${schema.paymentProofs.ocrResult} in ('mismatch', 'unreadable') or ${isDuplicate}))::int`,
    })
    .from(schema.orders)
    .leftJoin(schema.paymentProofs, eq(schema.paymentProofs.orderUuid, schema.orders.id));
  return { waiting: row?.waiting ?? 0, attention: row?.attention ?? 0 };
}
