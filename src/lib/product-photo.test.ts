import { describe, expect, it } from "vitest";
import { parsePhotos, photosToText } from "./product-edit";
import { productPhotoUrl, verifyPhotoToken } from "./product-photo";

const secret = "test-secret";

describe("product photo addresses", () => {
  it("round-trips a signed address back to the file id", () => {
    const url = productPhotoUrl("1AbC_def-GHI234", secret);
    expect(url).toMatch(/^\/api\/product-photo\/1AbC_def-GHI234\.[0-9a-f]{32}$/);
    expect(verifyPhotoToken(url.replace("/api/product-photo/", ""), secret)).toBe("1AbC_def-GHI234");
  });
  it("rejects a wrong signature, another secret and an odd token", () => {
    const token = productPhotoUrl("1AbC_def-GHI234", secret).replace("/api/product-photo/", "");
    expect(verifyPhotoToken(token.slice(0, -1) + (token.endsWith("0") ? "1" : "0"), secret)).toBeNull();
    expect(verifyPhotoToken(token, "other-secret")).toBeNull();
    expect(verifyPhotoToken("../../etc/passwd", secret)).toBeNull();
    expect(verifyPhotoToken("abc", secret)).toBeNull();
  });
});

describe("parsePhotos with uploaded photos", () => {
  const up = `/api/product-photo/1AbC_def-GHI234.${"a".repeat(32)}`;
  it("accepts file names and uploaded addresses together, in order", () => {
    const r = parsePhotos(`${up}\ntee-front.jpg`);
    expect(r.ok && r.images.map((i) => i.url)).toEqual([up, "/products/tee-front.jpg"]);
  });
  it("still rejects anything else", () => {
    expect(parsePhotos("https://evil.example/x.jpg").ok).toBe(false);
    expect(parsePhotos("/api/product-photo/../../secret").ok).toBe(false);
  });
  it("writes uploaded addresses back whole and plain files as names", () => {
    expect(photosToText([{ url: up, kind: "flat" }, { url: "/products/tee-front.jpg", kind: "flat" }])).toBe(`${up}\ntee-front.jpg`);
  });
});
