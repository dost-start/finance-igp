import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { OrderStatus } from "@/db/schema";

// The same normalising as normalizeReference in src/lib/ocr/parse.ts (letters and digits only,
// look-alike characters equal), written in SQL so the database can compare references.
const normalized = (column: string) => sql.raw(`translate(upper(regexp_replace(${column}, '[^A-Za-z0-9]', '', 'g')), 'OQDIL', '00011')`);

export type DuplicateOrder = { id: string; orderId: string; status: OrderStatus };

// Other orders whose receipt used the same reference number: the same payment may be claimed twice.
export async function findDuplicateReferences(orderUuid: string): Promise<DuplicateOrder[]> {
  const rows = await getDb().execute<{ id: string; order_id: string; status: OrderStatus }>(sql`
    select o.id, o.order_id, o.status
    from payment_proofs me
    join payment_proofs other on other.order_uuid <> me.order_uuid and ${normalized("other.reference_number")} = ${normalized("me.reference_number")}
    join orders o on o.id = other.order_uuid
    where me.order_uuid = ${orderUuid}
      and length(${normalized("me.reference_number")}) >= 4
    order by o.created_at
    limit 10
  `);
  return rows.map((r) => ({ id: r.id, orderId: r.order_id, status: r.status }));
}
