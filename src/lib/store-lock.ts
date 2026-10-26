// The store lock (PRD FR07.05): while locked, nobody can place an order or send a payment. Orders
// already placed stay visible to finance, who can keep working on them.
export const STORE_CLOSED_MESSAGE = "The store is closed for now, so we are not taking new orders or payments at the moment. Please check back soon.";
export const STORE_LOCK_KEY = "store_locked";
export const parseLocked = (value: string | null | undefined): boolean => value === "true";
