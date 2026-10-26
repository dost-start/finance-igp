import { describe, expect, it } from "vitest";
import { hashToken, mintTrackingToken, trackingUrl } from "./tracking";

describe("tracking token", () => {
  it("is 32 random bytes as 64 hex characters, different every time", () => {
    const a = mintTrackingToken();
    const b = mintTrackingToken();
    expect(a.token).toMatch(/^[0-9a-f]{64}$/);
    expect(a.token).not.toBe(b.token);
  });
  it("stores only a sha-256 hash that matches the token but is not the token", () => {
    const { token, hash } = mintTrackingToken();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashToken(token)).toBe(hash);
    expect(hashToken("other")).not.toBe(hash);
  });
  it("builds the link on the site address without a double slash", () => {
    expect(trackingUrl("abc", "https://start-shop-six.vercel.app/")).toBe("https://start-shop-six.vercel.app/track/abc");
  });
});
