import { DEFAULT_LAUNCH_AT } from "@/lib/launch";
import { getLaunchAt, isStoreLocked } from "@/lib/store";

// Whether the store is closed and when it launches, for the banner, the checkout page and the landing
// page. Shop pages stay fully static; they ask this once the page is open. The CDN may serve an answer up
// to 10 seconds old (30 while it refreshes), so a change reaches visitors within moments. Placing an
// order and sending a payment check the real lock on the server, so a stale answer here can never let
// an order through.
export async function GET() {
  let locked = false;
  let launchAt = DEFAULT_LAUNCH_AT;
  try {
    [locked, launchAt] = await Promise.all([isStoreLocked(), getLaunchAt()]);
  } catch {
    // If the database cannot be reached, show the shop as open and the planned date: the server checks decide.
  }
  return Response.json({ locked, launchAt }, { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } });
}
