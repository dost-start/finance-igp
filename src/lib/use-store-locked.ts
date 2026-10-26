"use client";

import { useEffect, useState } from "react";

// One request per page load, shared by everything that needs to know (banner, checkout page).
let pending: Promise<boolean> | null = null;
function fetchLocked(): Promise<boolean> {
  pending ??= fetch("/api/store")
    .then((r) => (r.ok ? (r.json() as Promise<{ locked?: boolean }>) : { locked: false }))
    .then((j) => j.locked === true)
    .catch(() => false);
  return pending;
}

// null while asking. Pages treat "not closed" and "not known yet" the same: show the normal page.
// The server refuses orders and payments while closed, so this only decides what visitors see.
export function useStoreLocked(): boolean | null {
  const [locked, setLocked] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    pending = null; // ask again on every page view
    void fetchLocked().then((v) => live && setLocked(v));
    return () => {
      live = false;
    };
  }, []);
  return locked;
}
