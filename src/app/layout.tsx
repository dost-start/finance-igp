import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { CartLink } from "@/components/cart-link";
import { MobileCartBar } from "@/components/mobile-cart-bar";
import { StoreBanner } from "@/components/store-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "START: COLLECTIONS", template: "%s | START: COLLECTIONS" },
  description: "The official merchandise shop of START-DOST.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-20 sm:pb-0">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-30 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
          Skip to content
        </a>
        <StoreBanner />
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="text-base font-semibold tracking-tight sm:text-lg">
              START: COLLECTIONS
            </Link>
            <nav className="flex items-center gap-4 text-sm sm:gap-5">
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
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Notice
            </Link>
          </div>
        </footer>
        <Suspense fallback={null}>
          <MobileCartBar />
        </Suspense>
      </body>
    </html>
  );
}
