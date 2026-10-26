import { z } from "zod";

// Pure cart logic, shared by the browser store and the unit tests. The cart lives in the
// browser only. Prices here are for display: the server recomputes every total from the
// database at checkout and never trusts these numbers.
export const MAX_QTY = 20;
export const MAX_LINES = 60;

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  size: z.string().min(1),
  quantity: z.number().int().min(1).max(MAX_QTY),
  unitPriceCentavos: z.number().int().min(0),
  image: z.string().optional(),
});
export const cartSchema = z.array(cartItemSchema).max(MAX_LINES);
export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = readonly CartItem[];

const same = (a: { productId: string; size: string }, b: { productId: string; size: string }) =>
  a.productId === b.productId && a.size === b.size;

export function addItem(cart: Cart, item: CartItem): Cart {
  const existing = cart.find((i) => same(i, item));
  if (existing) {
    return cart.map((i) => (i === existing ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + item.quantity) } : i));
  }
  if (cart.length >= MAX_LINES) return cart;
  return [...cart, { ...item, quantity: Math.min(MAX_QTY, Math.max(1, item.quantity)) }];
}

export function setQuantity(cart: Cart, key: { productId: string; size: string }, quantity: number): Cart {
  if (!Number.isFinite(quantity) || quantity < 1) return removeItem(cart, key);
  const q = Math.min(MAX_QTY, Math.floor(quantity));
  return cart.map((i) => (same(i, key) ? { ...i, quantity: q } : i));
}

export function removeItem(cart: Cart, key: { productId: string; size: string }): Cart {
  return cart.filter((i) => !same(i, key));
}

export const cartCount = (cart: Cart) => cart.reduce((n, i) => n + i.quantity, 0);
export const cartTotal = (cart: Cart) => cart.reduce((sum, i) => sum + i.unitPriceCentavos * i.quantity, 0);

// Anything unreadable or tampered with in localStorage becomes an empty cart.
export function parseCart(raw: string | null): Cart {
  if (!raw) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
