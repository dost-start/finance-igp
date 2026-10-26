import Link from "next/link";
import { STORE_CLOSED_MESSAGE } from "@/lib/store-lock";

// Friendly message shown in place of the checkout or payment form while the store is locked.
export function StoreClosed() {
  return (
    <div role="status" className="mt-6 max-w-xl rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <p className="text-lg font-semibold">The store is closed for now</p>
      <p className="mt-2 leading-7">{STORE_CLOSED_MESSAGE}</p>
      <Link href="/" className="mt-4 inline-block text-sm underline underline-offset-4">
        Back to the shop
      </Link>
    </div>
  );
}
