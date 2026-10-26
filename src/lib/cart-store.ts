"use client";

import { useSyncExternalStore } from "react";
import { addItem, cartCount, cartTotal, parseCart, removeItem, setQuantity, type Cart, type CartItem } from "./cart";

// Tiny browser store backed by localStorage. useSyncExternalStore gives the server an empty
// cart and swaps in the saved one after hydration, so there is no mismatch flash.
const KEY = "start-shop-cart-v1";
const EMPTY: Cart = [];
let state: Cart = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = parseCart(window.localStorage.getItem(KEY));
  } catch {
    state = EMPTY;
  }
}

function commit(next: Cart) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or blocked storage: the cart still works for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = parseCart(e.newValue);
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => EMPTY;
// false on the server and during hydration, true once the saved cart has been read
const getReadySnapshot = () => {
  load();
  return loaded;
};
const getServerReady = () => false;

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(subscribe, getReadySnapshot, getServerReady);
  return {
    ready,
    items,
    count: cartCount(items),
    total: cartTotal(items),
    add: (item: CartItem) => commit(addItem(state, item)),
    setQty: (key: { productId: string; size: string }, qty: number) => commit(setQuantity(state, key, qty)),
    remove: (key: { productId: string; size: string }) => commit(removeItem(state, key)),
    clear: () => commit(EMPTY),
  };
}
