"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeSwitch } from "@/components/theme-switch";

// The admin header's navigation: the three places finance uses every day, and a "More" menu for the rest
// (store settings, the logs, the system page, release notes and the theme). Keeping the
// daily links few is what stops the header from feeling like a control panel.
function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${active ? "bg-zinc-200/70 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-50"}`}
    >
      {children}
    </Link>
  );
}

const MORE_LINKS = [
  { href: "/admin/settings", label: "Store settings" },
  { href: "/admin/emails", label: "Email log" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/system", label: "System" },
] as const;

export function AdminNav({ showProducts, version }: { showProducts: boolean; version: string }) {
  const pathname = usePathname();
  // The menu is open for one page only: remembering which page opened it closes it on any navigation.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean | ((o: boolean) => boolean)) => setOpenOn((cur) => ((typeof value === "function" ? value(cur === pathname) : value) ? pathname : null));
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Close on a click elsewhere and on Escape (which also returns focus to the button).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpenOn(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenOn(null);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const moreActive = [...MORE_LINKS.map((l) => l.href), "/admin/changelog"].some((h) => pathname === h || pathname.startsWith(`${h}/`));
  const ordersActive = pathname === "/admin" || pathname.startsWith("/admin/orders");

  return (
    <nav aria-label="Admin sections" className="flex items-center gap-1">
      <NavLink href="/admin" active={ordersActive}>
        Orders
      </NavLink>
      {showProducts && (
        <NavLink href="/admin/products" active={pathname.startsWith("/admin/products")}>
          Products
        </NavLink>
      )}
      <NavLink href="/admin/help" active={pathname.startsWith("/admin/help")}>
        Help
      </NavLink>

      <div ref={wrap} className="relative">
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls="admin-more-menu"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${moreActive || open ? "bg-zinc-200/70 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-50"}`}
        >
          More
          <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>
        {open && (
          <div id="admin-more-menu" className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-950 sm:left-0 sm:right-auto">
            <ul>
              {MORE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block px-4 py-2 text-sm hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/admin/changelog" className="flex items-baseline justify-between gap-3 px-4 py-2 text-sm hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900">
                  Release notes
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">v{version}</span>
                </Link>
              </li>
            </ul>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-zinc-200 px-4 pb-1 pt-3 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Theme</span>
              <ThemeSwitch />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
