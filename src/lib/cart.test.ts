import { describe, expect, it } from "vitest";
import { MAX_LINES, MAX_QTY, addItem, cartCount, cartTotal, parseCart, removeItem, setQuantity, type CartItem } from "./cart";

const shirtM: CartItem = { productId: "p1", slug: "tshirt-design-a", name: "T-Shirt", unitPriceCentavos: 45000, image: "/x.svg", size: "M", quantity: 1 };
const shirtL: CartItem = { ...shirtM, size: "L" };
const sticker: CartItem = { productId: "p2", slug: "sticker-01", name: "Sticker", unitPriceCentavos: 3000, image: "/y.svg", size: "One size", quantity: 2 };
const key = (i: CartItem) => ({ productId: i.productId, size: i.size });

describe("cart", () => {
  it("merges the same product and size, keeps different sizes apart", () => {
    let c = addItem([], shirtM);
    c = addItem(c, shirtM);
    c = addItem(c, shirtL);
    expect(c).toHaveLength(2);
    expect(c.find((i) => i.size === "M")?.quantity).toBe(2);
  });
  it("caps quantity and line count", () => {
    expect(addItem([{ ...shirtM, quantity: MAX_QTY }], shirtM)[0].quantity).toBe(MAX_QTY);
    expect(setQuantity([shirtM], key(shirtM), 999)[0].quantity).toBe(MAX_QTY);
    const full = Array.from({ length: MAX_LINES }, (_, n) => ({ ...shirtM, productId: `p${n}` }));
    expect(addItem(full, { ...shirtM, productId: "extra" })).toHaveLength(MAX_LINES);
  });
  it("removes a line when quantity drops below 1", () => {
    expect(setQuantity([shirtM], key(shirtM), 0)).toEqual([]);
    expect(removeItem([shirtM, sticker], key(sticker))).toEqual([shirtM]);
  });
  it("totals and counts in integer centavos", () => {
    const c = [{ ...shirtM, quantity: 2 }, sticker];
    expect(cartTotal(c)).toBe(2 * 45000 + 2 * 3000);
    expect(cartCount(c)).toBe(4);
  });
  it("treats bad stored data as an empty cart", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart(JSON.stringify([{ productId: "p1" }]))).toEqual([]);
    expect(parseCart(JSON.stringify([{ ...shirtM, quantity: 500 }]))).toEqual([]);
    expect(parseCart(JSON.stringify([shirtM]))).toEqual([shirtM]);
  });
});
