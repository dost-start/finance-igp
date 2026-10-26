import "server-only";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatManila } from "./email/templates";
import type { LimitStore } from "./rate-limit";
import { hashToken } from "./tracking";
import { buyerTimeline } from "./status";
import { BUYER_STATUS_TEXT, last4Matches, type TrackedOrder } from "./tracking-view";

type OrderRow = { id: string; orderId: string; status: TrackedOrder["status"] };

async function toTracked(order: OrderRow): Promise<TrackedOrder> {
  const events = await getDb()
    .select({ status: schema.statusEvents.status, at: schema.statusEvents.createdAt })
    .from(schema.statusEvents)
    .where(eq(schema.statusEvents.orderUuid, order.id))
    .orderBy(asc(schema.statusEvents.createdAt));
  return {
    orderId: order.orderId,
    status: order.status,
    text: BUYER_STATUS_TEXT[order.status] ?? "",
    timeline: buyerTimeline(events, order.status).map((e) => ({ status: e.status, at: formatManila(e.at) })),
  };
}

// Only orders finance has confirmed carry a tracking token hash, so an Order ID that is still
// waiting for verification (or was rejected) behaves exactly like one that does not exist.
const DUMMY_LAST4 = "0000";

export async function trackByDetails(orderId: string, last4: string): Promise<TrackedOrder | null> {
  const [order] = await getDb()
    .select({ id: schema.orders.id, orderId: schema.orders.orderId, status: schema.orders.status, last4: schema.orders.contactLast4 })
    .from(schema.orders)
    .where(and(eq(schema.orders.orderId, orderId), isNotNull(schema.orders.trackingTokenHash)))
    .limit(1);
  const matches = last4Matches(order?.last4 ?? DUMMY_LAST4, last4);
  if (!order || !matches) return null;
  return toTracked(order);
}

export async function trackByToken(token: string): Promise<TrackedOrder | null> {
  const [order] = await getDb()
    .select({ id: schema.orders.id, orderId: schema.orders.orderId, status: schema.orders.status })
    .from(schema.orders)
    .where(eq(schema.orders.trackingTokenHash, hashToken(token)))
    .limit(1);
  return order ? toTracked(order) : null;
}

export function dbLimitStore(): LimitStore {
  const db = getDb();
  return {
    async failures(key, windowSeconds) {
      const rows = await db
        .select({ failures: schema.rateLimits.failures })
        .from(schema.rateLimits)
        .where(and(eq(schema.rateLimits.key, key), sql`${schema.rateLimits.windowStart} > now() - make_interval(secs => ${windowSeconds})`))
        .limit(1);
      return rows[0]?.failures ?? 0;
    },
    async addFailure(key, windowSeconds) {
      // One statement: start a fresh window if the old one ran out, otherwise count one more failure.
      await db.execute(sql`
        insert into rate_limits (key, failures, window_start) values (${key}, 1, now())
        on conflict (key) do update set
          failures = case when rate_limits.window_start > now() - make_interval(secs => ${windowSeconds}) then rate_limits.failures + 1 else 1 end,
          window_start = case when rate_limits.window_start > now() - make_interval(secs => ${windowSeconds}) then rate_limits.window_start else now() end
      `);
    },
  };
}
