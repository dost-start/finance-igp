import Link from "next/link";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import { CartLink } from "@/components/cart-link";
import { MobileCartBar } from "@/components/mobile-cart-bar";
import { ScrollFlag } from "@/components/scroll-flag";
import { MARK_SVG } from "@/components/start-intro-svg";
import { WORD_SVG } from "@/components/start-word-svg";
import { StoreBanner } from "@/components/store-banner";
import { ThemeSwitch } from "@/components/theme-switch";

// The buyer-facing frame: store banner, header with the cart, footer, and the phone cart bar. The admin
// area has its own frame (src/app/admin/layout.tsx), so finance never sees the cart or the shop links.
export function StoreChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <StoreBanner />
      {/* At the top of the page the header is a plain bar with just the START mark (the page itself carries the
          name); right after the logo intro the START wordmark peeks out beside it and tucks back. Once the page scrolls it becomes a floating frosted pill and "START: COLLECTIONS" slides out beside
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
            {/* Right after the logo intro (or on load), the START wordmark slides out beside the mark, holds, and
                tucks back behind it; see .si-hdr-tease. */}
            <span className="si-hdr-tease" aria-hidden="true">
              <span className="si-hdr-clip">
                <span className="si-hdr-tease-word block pl-2 sm:pl-2.5">
                  {/* A fixed aspect box: inside the sliding column the SVG needs a definite width to open into. */}
                  <span className="block aspect-[1742/400] h-[18px] sm:h-[22px]" dangerouslySetInnerHTML={{ __html: WORD_SVG }} />
                </span>
              </span>
            </span>
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
      {/* The brand close, on the brand's dark ground in both schemes: a closing line, the vector wordmark, link
          columns, and a bottom bar with the theme switch. The corner quarter circles are tiles of the START mark,
          as in the shop hero. */}
      <footer className="relative isolate overflow-hidden bg-zinc-950 text-zinc-100" style={{ "--si-ink": "#f1f3f4" } as CSSProperties}>
        <div aria-hidden="true" className="absolute -right-12 -top-12 -z-10 size-28 rounded-bl-full bg-brand-yellow sm:-right-16 sm:-top-16 sm:size-56" />
        <div aria-hidden="true" className="absolute -bottom-24 left-[42%] -z-10 hidden size-36 rounded-t-full bg-brand-blue sm:block" />
        <div aria-hidden="true" className="absolute -bottom-16 -left-16 -z-10 size-32 rounded-tr-full bg-white/[0.06]" />

        {/* pb-28 on phones keeps the bottom bar clear of the fixed phone cart bar. */}
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-10 sm:pb-6 sm:pt-12">
          <p className="max-w-2xl text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Science and Technology <span className="text-brand-yellow">for the people</span>
          </p>

          <div className="mt-8 grid gap-8 sm:mt-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <span className="block aspect-[1742/400] h-8 sm:h-9" role="img" aria-label="START" dangerouslySetInnerHTML={{ __html: WORD_SVG }} />
              <p className="mt-3 max-w-xs text-sm text-zinc-400">
                The official merchandise of START-DOST: Scholars Transforming Advancement and Research for Technology.
              </p>
            </div>
            <nav aria-label="Shop">
              <h2 className="text-sm font-semibold text-white">Shop</h2>
              <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                {[
                  { href: "/shop", label: "All merch" },
                  { href: "/shop#apparel", label: "Apparel" },
                  { href: "/shop#lanyards", label: "Lanyards" },
                  { href: "/shop#pins", label: "Pins" },
                  { href: "/shop#stickers", label: "Stickers" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="decoration-brand-yellow decoration-2 underline-offset-4 transition-colors hover:text-white hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Help">
              <h2 className="text-sm font-semibold text-white">Help</h2>
              <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                {[
                  { href: "/track", label: "Track your order" },
                  { href: "/cart", label: "Your cart" },
                  { href: "/privacy", label: "Privacy Notice" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="decoration-brand-yellow decoration-2 underline-offset-4 transition-colors hover:text-white hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-sm text-zinc-400" data-theme="dark">
            <p>© START-DOST. Made by technoscholars, for technoscholars.</p>
            <ThemeSwitch />
          </div>
        </div>
      </footer>
      <Suspense fallback={null}>
        <MobileCartBar />
      </Suspense>
    </div>
  );
}
