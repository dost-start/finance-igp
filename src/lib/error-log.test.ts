import { describe, expect, it } from "vitest";
import { MAX_MESSAGE, cleanMessage, cleanRoute, isExpectedError } from "./error-log";

describe("error log cleaning", () => {
  it("ignores redirects and not-found, which are normal control flow", () => {
    expect(isExpectedError(Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/admin/signin;307;" }))).toBe(true);
    expect(isExpectedError(Object.assign(new Error("x"), { digest: "NEXT_NOT_FOUND" }))).toBe(true);
    expect(isExpectedError(new Error("NEXT_NOT_FOUND"))).toBe(true);
    expect(isExpectedError(new Error("database exploded"))).toBe(false);
    expect(isExpectedError("plain text")).toBe(false);
  });
  it("keeps the kind of error and a short message", () => {
    expect(cleanMessage(new TypeError("Cannot read properties of undefined"))).toBe("TypeError: Cannot read properties of undefined");
    expect(cleanMessage("odd thing")).toBe("Error: odd thing");
  });
  it("cuts a database error before the values it carries", () => {
    const msg = cleanMessage(new Error('Failed query: insert into "orders" (email) values ($1) params: juan@example.com,09171234567'));
    expect(msg).not.toContain("juan@example.com");
    expect(msg).not.toContain("09171234567");
    expect(msg).toContain("Failed query");
  });
  it("hides emails and phone numbers that slip into a message", () => {
    const msg = cleanMessage(new Error("Could not send to juan@example.com or call +63 917 123 4567 today"));
    expect(msg).toContain("[email]");
    expect(msg).toContain("[number]");
    expect(msg).not.toMatch(/juan@|917/);
  });
  it("never saves more than the limit", () => {
    expect(cleanMessage(new Error("x".repeat(5000))).length).toBeLessThanOrEqual(MAX_MESSAGE);
  });
  it("drops query strings and turns ids and tokens into placeholders", () => {
    expect(cleanRoute("/pay/123e4567-e89b-12d3-a456-426614174000?x=1")).toBe("/pay/:id");
    expect(cleanRoute(`/track/${"a".repeat(64)}`)).toBe("/track/:token");
    expect(cleanRoute("/admin?q=juan@example.com#top")).toBe("/admin");
  });
});
