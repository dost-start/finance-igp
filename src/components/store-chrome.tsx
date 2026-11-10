import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CartLink } from "@/components/cart-link";
import { MobileCartBar } from "@/components/mobile-cart-bar";
import { StoreBanner } from "@/components/store-banner";
import { ThemeSwitch } from "@/components/theme-switch";

// The buyer-facing frame: store banner, header with the cart, footer, and the phone cart bar. The admin
// area has its own frame (src/app/admin/layout.tsx), so finance never sees the cart or the shop links.
export function StoreChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-20 sm:pb-0">
      <StoreBanner />
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-1.5 px-4 py-4 min-[400px]:gap-3">
          <Link href="/" className="whitespace-nowrap text-[13px] font-semibold tracking-tight min-[400px]:text-sm sm:text-lg">
            START: COLLECTIONS
          </Link>
          <nav className="flex items-center gap-2.5 text-sm min-[380px]:gap-3 sm:gap-5">
            <Link href="/shop" className="whitespace-nowrap underline-offset-4 hover:underline">
              Shop
            </Link>
            <Link href="/track" className="whitespace-nowrap underline-offset-4 hover:underline">
              Track order
            </Link>
            <CartLink />
          </nav>
        </div>
      </header>
      <div id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </div>
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
          <p>START-DOST merchandise</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <ThemeSwitch />
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Notice
            </Link>
          </div>
        </div>
      </footer>
      <Suspense fallback={null}>
        <MobileCartBar />
      </Suspense>
    </div>
  );
}
