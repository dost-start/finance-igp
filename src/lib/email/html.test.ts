import { describe, expect, it } from "vitest";
import { toHtml, imageUrls } from "./html";
import { renderEmail1, renderEmail2, renderEmail9, renderStatusEmail, STATUS_EMAIL_STATUSES } from "./templates";

const form = "https://forms.gle/zBbN6uNYwXVEafYT8";
const none = { images: {} };
const all = imageUrls(["logo.png", "banner-top.jpg", "banner-bottom.jpg", "mark.png"], "https://shop.example/");

// The visible text of the HTML, for checking nothing is lost: line breaks kept, tags dropped, entities decoded.
const visible = (html: string): string =>
  html
    .replace(/<head>[\s\S]*?<\/head>/, "")
    .replace(/<br>/g, "\n")
    .replace(/<\/(p|div|tr)>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

describe("links and escaping", () => {
  it("turns web addresses into clickable links", () => {
    const html = toHtml("Form: https://forms.gle/abc123", none);
    expect(html).toContain('<a href="https://forms.gle/abc123"');
    expect(html).toContain(">https://forms.gle/abc123</a>");
  });
  it("keeps a sentence-ending dot outside the link", () => {
    const html = toHtml("Open https://example.com/track/abc.", none);
    expect(html).toContain('href="https://example.com/track/abc"');
    expect(html).toContain(">https://example.com/track/abc</a>.");
  });
  it("escapes markup typed by a buyer, in the greeting and everywhere else", () => {
    const html = toHtml('Hello <script>alert("x")</script>,\n\nNote: <img src=x onerror=alert(1)> & friends', none);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; friends");
  });
  it("links the ticket form and the tracking link in the real emails", () => {
    const token = "a".repeat(64);
    const e2 = toHtml(renderEmail2({ buyerName: "Ana", orderId: "R13000001", trackingUrl: `https://start-shop-six.vercel.app/track/${token}`, items: [], totalCentavos: 100 }, form).text, none);
    expect(e2).toContain(`href="https://start-shop-six.vercel.app/track/${token}"`);
    expect(e2).toContain(`href="${form}"`);
    const e9 = toHtml(renderEmail9({ buyerName: "Ana", reason: "Unreadable receipt", deadline: new Date() }, form).text, none);
    expect(e9).toContain(`href="${form}"`);
  });
});

describe("branded layout", () => {
  const html = toHtml(renderEmail2({ buyerName: "Juan Dela Cruz", orderId: "R13000001", trackingUrl: "https://shop.example/track/x", items: [{ name: "Tee", size: "M", quantity: 1 }], totalCentavos: 45000 }, form).text, none);
  it("is a complete, table-based page no wider than 600 px with system fonts", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<table role="presentation"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain("-apple-system");
    expect(html).not.toMatch(/<link|@font-face|<script/i);
  });
  it("has a text header when there are no images, so nothing is broken", () => {
    expect(html).toContain("START: COLLECTIONS");
    expect(html).not.toContain("<img");
  });
  it("greets in blue with the name in bold", () => {
    expect(html).toContain('<span style="color:#1a56c6">Hello <strong>Juan Dela Cruz</strong>,</span>');
  });
  it("shows the signature block with the tagline and the team", () => {
    expect(html).toContain("United, we innovate,");
    expect(html).toContain("START: COLLECTIONS Team");
    expect(html).toContain("border-left:2px solid"); // the thin divider
  });
  it("ends with the no-reply notice and the confidentiality disclaimer", () => {
    expect(html).toContain("no-reply address");
    expect(html).toContain("This communication is intended solely for the use of the addressee.");
    expect(html).toContain("delete this email.");
  });
  it("bolds the key facts and leaves everything else alone", () => {
    expect(html).toContain('<strong style="color:#1a56c6">R13000001</strong>');
    expect(html).toContain('<strong style="color:#1a56c6">₱450</strong>');
    const status = toHtml("Order Status: In Production\nWe will email you when it ships.\nSubmission Deadline: October 28, 2026 at 9:15 PM", none);
    expect(status).toContain('<strong style="color:#1a56c6">In Production</strong>');
    expect(status).toContain('<strong style="color:#1a56c6">October 28, 2026 at 9:15 PM</strong>');
  });
  it("does not bold inside a web address", () => {
    const h = toHtml("Track: https://shop.example/track/R13000001", none);
    expect(h).toContain('href="https://shop.example/track/R13000001"');
    expect(h).not.toContain("<strong style=\"color:#1a56c6\">R13000001</strong>");
  });
});

describe("images", () => {
  it("uses only the images that exist, as full addresses on our site", () => {
    expect(imageUrls(["logo.png", "mark.png"], "https://shop.example/")).toEqual({ logo: "https://shop.example/email/logo.png", mark: "https://shop.example/email/mark.png" });
    expect(imageUrls([], "https://shop.example")).toEqual({});
    expect(imageUrls(["evil.png", "../logo.png"], "https://shop.example")).toEqual({});
  });
  it("shows no image at all when none are available", () => {
    expect(toHtml("Hello Ana,\n\nHi.\n\nBest regards,\nTeam", none)).not.toContain("<img");
  });
  it("shows the logo, both banners and the mark when they exist, each with alt text", () => {
    const html = toHtml("Hello Ana,\n\nHi.\n\nBest regards,\nSTART: COLLECTIONS Team", { images: all });
    const imgs = html.match(/<img [^>]*>/g) ?? [];
    expect(imgs).toHaveLength(4);
    for (const img of imgs) {
      expect(img).toMatch(/src="https:\/\/shop\.example\/email\/[a-z-]+\.(png|jpg)"/);
      expect(img).toMatch(/alt="[^"]+"/);
    }
    expect(html).not.toContain('class="logo"');
  });
  it("keeps the colored text header off when the logo image is used, and the S mark off when mark.png exists", () => {
    const withLogo = toHtml("Hello Ana,\n\nHi.\n\nBest regards,\nTeam", { images: { logo: all.logo } });
    expect(withLogo).toContain('alt="START: COLLECTIONS"');
    expect(withLogo).not.toContain("letter-spacing:0.6px"); // the text wordmark bar
    expect(withLogo).toContain(">S</div>"); // no mark.png, so the text mark stands in
    expect(toHtml("Hello Ana,\n\nHi.\n\nBest regards,\nTeam", { images: { mark: all.mark } })).not.toContain(">S</div>");
  });
});

describe("nothing is lost from the wording", () => {
  const data = { buyerName: "Juan", orderId: "R13000001", totalCentavos: 99000, universityAddress: "Quezon City", homeAddressLink: "https://maps.app.goo.gl/x", homeLandmark: "Near the chapel", note: "Batch 1 of 3", at: new Date("2026-11-13T02:00:00Z") };
  const emails = [
    renderEmail1({ buyerName: "Juan", items: [{ name: "Tee", size: "M", quantity: 2 }], totalCentavos: 99000, universityAddress: "Quezon City", homeAddressLink: "https://maps.app.goo.gl/x", homeLandmark: "Near the chapel" }, form).text,
    renderEmail2({ buyerName: "Juan", orderId: "R13000001", trackingUrl: "https://shop.example/track/abc", items: [{ name: "Tee", size: "M", quantity: 2 }], totalCentavos: 99000 }, form).text,
    renderEmail9({ buyerName: "Juan", reason: "Incorrect amount", deadline: new Date("2026-11-15T02:00:00Z") }, form).text,
    ...STATUS_EMAIL_STATUSES.map((s) => renderStatusEmail(s, data, form, { siteUrl: "https://shop.example", refundTimeframe: "5 to 7 business days" }).content.text),
  ];
  it("keeps every line of every email in the HTML copy (the sign-off becomes the signature block)", () => {
    for (const text of emails) {
      const seen = visible(toHtml(text, { images: all }));
      for (const l of text.split("\n").map((x) => x.trim()).filter((x) => x && x !== "--" && x !== "Best regards,")) expect(seen, l).toContain(l);
    }
  });
  it("leaves the plain text untouched", () => {
    const text = "Hello Ana,\n\nOrder ID: R13000001\n\nBest regards,\nTeam\n\n--\nFooter.";
    const copy = String(text);
    toHtml(text, none);
    expect(text).toBe(copy);
  });
});
