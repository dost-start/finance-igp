"use client";

import { useSyncExternalStore } from "react";

// Folds the admin sidebar to an icon rail and back. The state is a data attribute on <html> (so CSS can follow it
// before React loads) and a localStorage flag (so it is remembered).
const KEY = "admin-sidebar";

function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-admin-sidebar"] });
  return () => mo.disconnect();
}
const read = () => document.documentElement.dataset.adminSidebar === "collapsed";

export function SidebarToggle() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);

  const toggle = () => {
    const root = document.documentElement;
    if (read()) delete root.dataset.adminSidebar;
    else root.dataset.adminSidebar = "collapsed";
    try {
      if (read()) localStorage.setItem(KEY, "collapsed");
      else localStorage.removeItem(KEY);
    } catch {
      /* private mode: it lasts until the page closes */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={collapsed}
      title={collapsed ? "Keep the sidebar open" : "Collapse the sidebar"}
      className="hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 lg:flex dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className={`size-[1.15rem] shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.5 5 6.5 10l5 5M16 5l-5 5 5 5" />
      </svg>
      <span className="admin-label">{collapsed ? "Keep open" : "Collapse sidebar"}</span>
    </button>
  );
}
