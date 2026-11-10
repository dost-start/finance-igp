"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// On phones the admin menu is a checkbox-driven drawer (no script needed to open it). This closes it after a
// link is followed, since the layout, and so the checkbox, stays mounted between pages.
export function MenuCloser() {
  const pathname = usePathname();
  useEffect(() => {
    const box = document.getElementById("admin-menu") as HTMLInputElement | null;
    if (box) box.checked = false;
  }, [pathname]);
  return null;
}
