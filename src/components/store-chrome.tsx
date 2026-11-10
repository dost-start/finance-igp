import Image from "next/image";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CartLink } from "@/components/cart-link";
import { MobileCartBar } from "@/components/mobile-cart-bar";
import { ScrollFlag } from "@/components/scroll-flag";
import { MARK_SVG } from "@/components/start-intro-svg";
import { StoreBanner } from "@/components/store-banner";
import { ThemeSwitch } from "@/components/theme-switch";

// The buyer-facing frame: store banner, header with the cart, footer, and the phone cart bar. The admin
// area has its own frame (src/app/admin/layout.tsx), so finance never sees the cart or the shop links.
export function StoreChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-20 sm:pb-0">
      <StoreBanner />
      {/* At the top of the page the header is a plain bar with just the START mark (the page itself carries the
          name). Once the page scrolls it becomes a floating frosted pill and "START: COLLECTIONS" slides out beside
          the mark; ScrollFlag sets <html data-scrolled> and src/app/start-intro.css does the rest. */}
      <ScrollFlag />
      <header className="sticky top-0 z-40">
        <div className="si-header-bar mx-auto flex w-full max-w-6xl items-center justify-between gap-1.5 px-4 py-3 min-[400px]:gap-3">
          <Link
            href="/"
            aria-label="START: COLLECTIONS home"
            className="flex shrink-0 items-center whitespace-nowrap text-sm font-extrabold tracking-tight sm:text-lg"
          >
            <span className="si-hdr-mark relative z-10 block h-7 sm:h-9" dangerouslySetInnerHTML={{ __html: MARK_SVG }} />
            {/* Phones never show the name (it would push the cart off screen); see .si-hdr-name. */}
            <span className="si-hdr-name" aria-hidden="true">
              <span className="si-hdr-clip">
                <span className="si-hdr-word">START: COLLECTIONS</span>
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-2.5 text-sm font-medium min-[380px]:gap-3 sm:gap-5">
            <Link href="/shop" className="whitespace-nowrap decoration-brand-yellow decoration-2 underline-offset-[6px] hover:underline">
              Shop
            </Link>
            <Link href="/track" className="whitespace-nowrap decoration-brand-yellow decoration-2 underline-offset-[6px] hover:underline">
              Track order
            </Link>
            <CartLink />
          </nav>
        </div>
      </header>
      <div id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </div>
      {/* The brand close: the wordmark on the brand's dark ground in both schemes, as on START-DOST pubmat footers. */}
      <footer className="bg-zinc-900 text-zinc-100">
        <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-12">
          <Image src="/brand/wordmark-white.webp" alt="START: Scholars Transforming Advancement and Research for Technology" width={422} height={140} unoptimized className="h-auto w-56 sm:w-72" />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 text-sm text-zinc-300">
            <p>The official merchandise of START-DOST. Wear what you stand for.</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2" data-theme="dark">
              <ThemeSwitch />
              <Link href="/privacy" className="underline underline-offset-4 hover:text-white">
                Privacy Notice
              </Link>
            </div>
          </div>
        </div>
      </footer>
      <Suspense fallback={null}>
        <MobileCartBar />
      </Suspense>
    </div>
  );
}
