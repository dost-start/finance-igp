import { Landing, type LineupItem } from "@/components/landing";
import { getActiveProducts } from "@/lib/catalog";

// The landing page (PRD FR07.01 to 07.06). The page itself stays static and fast; the countdown, the
// launch view and the closed-store banner come from /api/store once it is open in the browser.
export default async function Home() {
  const products = await getActiveProducts();
  const lineup: LineupItem[] = products.slice(0, 8).map((p) => ({
    slug: p.slug,
    name: p.name,
    image: p.images[0]?.url ?? "/products/jacket.svg",
    priceCentavos: p.priceCentavos,
    soldOut: p.sizes.every((s) => !s.available),
  }));
  return <Landing lineup={lineup} />;
}
