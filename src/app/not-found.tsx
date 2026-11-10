import Link from "next/link";
import { StoreChrome } from "@/components/store-chrome";

// Unknown addresses (src/proxy.ts rewrites them here with a 404 status) keep the shop's header and footer.
export default function NotFound() {
  return (
    <StoreChrome>
      <main>
        <h1 className="text-2xl font-semibold tracking-tight">This page could not be found.</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          The address may be mistyped, or the product is no longer on sale.{" "}
          <Link href="/shop" className="underline underline-offset-4">
            Back to the shop
          </Link>
        </p>
      </main>
    </StoreChrome>
  );
}
