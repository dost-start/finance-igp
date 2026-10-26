import { isStoreLocked } from "@/lib/store";

// Whether the store is closed, for the banner and the checkout page. Shop pages stay fully static;
// they ask this once the page is open. The CDN may serve an answer up to 10 seconds old (30 while it
// refreshes), so a change reaches visitors within moments. Placing an order and sending a payment
// check the real value on the server, so a stale answer here can never let an order through.
export async function GET() {
  let locked = false;
  try {
    locked = await isStoreLocked();
  } catch {
    // If the database cannot be reached, show the shop as open: the server checks decide.
  }
  return Response.json({ locked }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}
