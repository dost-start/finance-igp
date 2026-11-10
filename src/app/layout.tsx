import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import "./start-intro.css";
import { INTRO_SEEN_KEY } from "@/lib/intro";

// Poppins is the brand book's body face; its ExtraBold stands in for Nexa Black on titles.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "START: COLLECTIONS", template: "%s | START: COLLECTIONS" },
  description: "The official merchandise shop of START-DOST.",
};

// Runs before the first paint so the page never flashes the wrong theme. "theme" is light, dark, or missing (System).
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`;

// Also before the first paint: the logo intro (src/components/start-intro.tsx) plays on the landing page once
// per browser session, and never for people who ask their device for reduced motion.
const INTRO_SCRIPT = `(function(){try{if(location.pathname==="/"&&!sessionStorage.getItem("${INTRO_SEEN_KEY}")&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.intro="playing"}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-30 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-black">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
