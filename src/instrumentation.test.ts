import { beforeEach, describe, expect, it, vi } from "vitest";

// The error hook writes to the database; here the database is replaced so we can see what would be saved.
const inserted: Record<string, unknown>[] = [];
vi.mock("@/db", () => ({
  getDb: () => ({ insert: () => ({ values: async (row: Record<string, unknown>) => void inserted.push(row) }) }),
  schema: { errorLogs: {} },
}));

const request = { path: "/pay/123e4567-e89b-12d3-a456-426614174000?x=1", method: "POST", headers: {} };
const context = { routerKind: "App Router", routePath: "/pay/[uuid]", routeType: "render", renderSource: "react-server-components", revalidateReason: undefined } as const;

describe("onRequestError", () => {
  beforeEach(() => {
    inserted.length = 0;
    vi.resetModules();
    process.env.NEXT_RUNTIME = "nodejs";
  });

  it("saves a real error with a cleaned message and route", async () => {
    const { onRequestError } = await import("./instrumentation");
    await onRequestError(new Error('Failed query: insert into "orders" values ($1) params: juan@example.com'), request, context);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].route).toBe("/pay/[uuid]");
    expect(inserted[0].method).toBe("POST");
    expect(String(inserted[0].message)).not.toContain("juan@example.com");
  });

  it("ignores redirects and not-found pages", async () => {
    const { onRequestError } = await import("./instrumentation");
    await onRequestError(Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/admin/signin;307;" }), request, context);
    await onRequestError(Object.assign(new Error("x"), { digest: "NEXT_NOT_FOUND" }), request, context);
    expect(inserted).toHaveLength(0);
  });

  it("saves only the first thirty in a minute, so an error storm adds no load", async () => {
    const { onRequestError } = await import("./instrumentation");
    for (let i = 0; i < 80; i++) await onRequestError(new Error(`boom ${i}`), request, context);
    expect(inserted).toHaveLength(30);
  });

  it("never throws, even when saving fails", async () => {
    vi.doMock("@/db", () => ({ getDb: () => ({ insert: () => ({ values: async () => Promise.reject(new Error("db down")) }) }), schema: { errorLogs: {} } }));
    const { onRequestError } = await import("./instrumentation");
    await expect(onRequestError(new Error("boom"), request, context)).resolves.toBeUndefined();
  });

  it("does nothing outside the Node runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const { onRequestError } = await import("./instrumentation");
    await onRequestError(new Error("boom"), request, context);
    expect(inserted).toHaveLength(0);
  });
});
