import { describe, expect, it } from "vitest";
import { toHtml } from "./html";
import { renderEmail2, renderEmail9 } from "./templates";

describe("toHtml", () => {
  it("turns web addresses into clickable links", () => {
    const html = toHtml("Form: https://forms.gle/abc123");
    expect(html).toContain('<a href="https://forms.gle/abc123">https://forms.gle/abc123</a>');
  });

  it("keeps a sentence-ending dot outside the link", () => {
    const html = toHtml("Open https://example.com/track/abc.");
    expect(html).toContain('<a href="https://example.com/track/abc">https://example.com/track/abc</a>.');
  });

  it("escapes markup in buyer-typed text so it cannot inject HTML", () => {
    const html = toHtml('Hello <script>alert("x")</script> & friends');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; friends");
  });

  it("keeps line breaks", () => {
    expect(toHtml("one\ntwo")).toContain("one<br>\ntwo");
  });

  it("links the ticket form and tracking link in the real emails", () => {
    const form = "https://forms.gle/zBbN6uNYwXVEafYT8";
    const e9 = toHtml(renderEmail9({ buyerName: "Ana", reason: "Unreadable receipt", deadline: new Date() }, form).text);
    expect(e9).toContain(`<a href="${form}">${form}</a>`);
    const token = "a".repeat(64);
    const e2 = toHtml(renderEmail2({ buyerName: "Ana", orderId: "R13000001", trackingUrl: `https://start-shop-six.vercel.app/track/${token}`, items: [], totalCentavos: 100 }, form).text);
    expect(e2).toContain(`<a href="https://start-shop-six.vercel.app/track/${token}">`);
  });
});
