"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeMenu } from "@/components/theme-switch";

// The admin sidebar's links: the places finance uses every day, then a "Manage" group for the rest.
const icon = (d: string) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="size-[1.15rem] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  orders: icon("M4 5.5h12M4 10h12M4 14.5h7"),
  products: icon("M3.5 7.5 10 4l6.5 3.5v5L10 16l-6.5-3.5v-5ZM3.5 7.5 10 11l6.5-3.5M10 11v5"),
  help: icon("M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM7.9 7.8a2.2 2.2 0 1 1 3.2 2c-.7.4-1.1.8-1.1 1.6M10 13.8v.01"),
  settings: icon("M4 6h8m3 0h1M4 14h1m3 0h8M12 4v4M7 12v4"),
  email: icon("M3.5 5.5h13v9h-13v-9ZM3.8 6l6.2 5 6.2-5"),
  audit: icon("M6 3.5h6l3 3v10H6v-13ZM12 3.5v3h3M8.5 10h4M8.5 13h4"),
  system: icon("M3.5 5h13v7.5h-13V5ZM7.5 16h5M10 12.5V16"),
  notes: icon("M5 4h10v12H5V4ZM8 8h4M8 11h4"),
  theme: icon("M10 3.5v13a6.5 6.5 0 0 0 0-13ZM10 3.5a6.5 6.5 0 1 0 0 13"),
} as const;

function NavLink({ href, active, label, children, trailing }: { href: string; active: boolean; label: string; children: ReactNode; trailing?: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
        active ? "bg-brand-yellow text-zinc-950" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      }`}
    >
      {children}
      <span className="admin-label">{label}</span>
      {trailing && <span className="admin-label ml-auto">{trailing}</span>}
    </Link>
  );
}

export function AdminNav({ showProducts, version, storeLocked }: { showProducts: boolean; version: string; storeLocked: boolean }) {
  const pathname = usePathname();
  const on = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  const ordersActive = pathname === "/admin" || pathname.startsWith("/admin/orders");

  return (
    <nav aria-label="Admin sections" className="space-y-6">
      <ul className="space-y-1">
        <li>
          <NavLink href="/admin" active={ordersActive} label="Orders">
            {ICONS.orders}
          </NavLink>
        </li>
        {showProducts && (
          <li>
            <NavLink href="/admin/products" active={on("/admin/products")} label="Products">
              {ICONS.products}
            </NavLink>
          </li>
        )}
        <li>
          <NavLink href="/admin/help" active={on("/admin/help")} label="Help">
            {ICONS.help}
          </NavLink>
        </li>
      </ul>

      <div>
        <p className="admin-head px-3 text-[0.7rem] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Manage</p>
        <ul className="mt-2 space-y-1">
          <li>
            <NavLink
              href="/admin/settings"
              active={on("/admin/settings")}
              label="Store"
              trailing={
                <span
                  className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${
                    storeLocked ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                  }`}
                >
                  <span aria-hidden="true" className={`size-1.5 rounded-full ${storeLocked ? "bg-amber-600" : "bg-emerald-600"}`} />
                  {storeLocked ? "Closed" : "Open"}
                </span>
              }
            >
              {ICONS.settings}
            </NavLink>
          </li>
          <li>
            <NavLink href="/admin/emails" active={on("/admin/emails")} label="Email log">
              {ICONS.email}
            </NavLink>
          </li>
          <li>
            <NavLink href="/admin/audit" active={on("/admin/audit")} label="Audit log">
              {ICONS.audit}
            </NavLink>
          </li>
          <li>
            <NavLink href="/admin/system" active={on("/admin/system")} label="System">
              {ICONS.system}
            </NavLink>
          </li>
          <li>
            <NavLink
              href="/admin/changelog"
              active={on("/admin/changelog")}
              label="Release notes"
              trailing={<span className={`ml-auto text-xs font-medium ${on("/admin/changelog") ? "text-zinc-950/70" : "text-zinc-400 dark:text-zinc-500"}`}>v{version}</span>}
            >
              {ICONS.notes}
            </NavLink>
          </li>
          <li>
            <ThemeMenu icon={ICONS.theme} />
          </li>
        </ul>
      </div>
    </nav>
  );
}
