// Who is asking, as far as the server can tell: the first address in x-forwarded-for (set by Vercel,
// not by the visitor), else x-real-ip, else "unknown". Used only for rate limits, always hashed first.
export function visitorAddress(h: Pick<Headers, "get">): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
