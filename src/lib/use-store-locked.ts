"use client";

import { useEffect, useState } from "react";

export type StoreInfo = { locked: boolean; launchAt: string | null };

// One request per page load, shared by everything that needs to know (banner, checkout page, landing page).
let pending: Promise<StoreInfo> | null = null;
function fetchInfo(): Promise<StoreInfo> {
  pending ??= (async (): Promise<StoreInfo> => {
    try {
      // no-cache: the browser must check with the server each time (the CDN still answers within 10 seconds), so a change never waits behind a copy stored in the browser
      const r = await fetch("/api/store", { cache: "no-cache" });
      const j = (r.ok ? await r.json() : {}) as { locked?: boolean; launchAt?: string };
      return { locked: j.locked === true, launchAt: typeof j.launchAt === "string" ? j.launchAt : null };
    } catch {
      return { locked: false, launchAt: null };
    }
  })();
  return pending;
}

// null while asking. Pages treat "not closed" and "not known yet" the same: show the normal page.
// The server refuses orders and payments while closed, so this only decides what visitors see.
export function useStoreInfo(): StoreInfo | null {
  const [info, setInfo] = useState<StoreInfo | null>(null);
  useEffect(() => {
    let live = true;
    pending = null; // ask again on every page view
    void fetchInfo().then((v) => live && setInfo(v));
    return () => {
      live = false;
    };
  }, []);
  return info;
}

export function useStoreLocked(): boolean | null {
  return useStoreInfo()?.locked ?? null;
}
