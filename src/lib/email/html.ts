import manifest from "./email-images.json";

// The emails are written as plain text (docs/email-templates.md, unchanged). This builds the HTML copy
// sent alongside it in the START-DOST look: a header, a white card with the message, a signature block
// and a small footer. Email-safe on purpose: tables, inline styles, 600 px wide, system fonts, explicit
// colours (so Gmail's dark mode keeps it readable), and every image has alt text.
//
// Images come from public/email on our own site (logo.png, banner-top.jpg, banner-bottom.jpg,
// mark.png). Only the ones that exist are used; without them the header is a plain coloured bar with
// the shop's name and the banners are skipped, so nothing shows a broken-image icon.
const BLUE = "#1a56c6";
const INK = "#374151";
const MUTED = "#6b7280";
const PAGE = "#f3f4f6";
const FONT = `-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

export const IMAGE_FILES = { logo: "logo.png", bannerTop: "banner-top.jpg", bannerBottom: "banner-bottom.jpg", mark: "mark.png" } as const;
export type EmailImages = Partial<Record<keyof typeof IMAGE_FILES, string>>;
export type BrandOptions = { images?: EmailImages };

// Full web address for each image file that exists, for example https://shop.example/email/logo.png.
export function imageUrls(files: readonly string[], siteUrl: string): EmailImages {
  const base = siteUrl.replace(/\/$/, "");
  const out: EmailImages = {};
  for (const [key, file] of Object.entries(IMAGE_FILES) as [keyof typeof IMAGE_FILES, string][]) {
    if (files.includes(file)) out[key] = `${base}/email/${file}`;
  }
  return out;
}

function defaultBrand(): BrandOptions {
  return { images: imageUrls(manifest.files, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") };
}

const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const URL_SPLIT = /(https?:\/\/[^\s<>"]+)/g;
const LINK_STYLE = `color:${BLUE};text-decoration:underline`;
const KEY = (inner: string) => `<strong style="color:${BLUE}">${inner}</strong>`;

// Facts a buyer looks for: Order IDs, peso amounts, dates, and the status names.
const STATUS_NAMES = ["Payment Confirmation", "In Production", "Out for Shipping", "Received Successfully", "Refund in Process", "Refund Successful", "Payment Rejected", "Order Received", "Pending Payment"];
const KEY_FACTS = new RegExp(
  [
    "R\\d{8}", // Order ID
    "₱\\s?[\\d,]+(?:\\.\\d{1,2})?", // amounts
    "[A-Z][a-z]+ \\d{1,2}, \\d{4}(?: at \\d{1,2}:\\d{2} [AP]M)?", // dates the system prints
    ...STATUS_NAMES,
  ].join("|"),
  "g",
);
const emphasize = (escaped: string): string => escaped.replace(KEY_FACTS, (m) => KEY(m));

// Lines of the form "Label: value" whose value is a key fact to read at a glance.
const FACT_LABELS = ["Order ID", "Order Status", "Total Amount Due", "Total Verified", "Refund Amount", "Amount Sent", "Date Sent", "Date Completed", "Submission Deadline", "Refund Timeframe", "Reason for Rejection", "Reason for Cancellation"];
const FACT_LINE = new RegExp(`^(${FACT_LABELS.join("|")}): (.+)$`);

const HEADINGS = new Set(["Order Summary", "Order Confirmation Details", "Production Notice", "Shipping Notice", "Cancellation Notice", "Next Steps", "Refund Schedule and Details", "Refund Process from Finance", "Refund Details from Finance", "Instructions for Submission", "Items Ordered:"]);

// One line of text as HTML: buyer text escaped, key facts bold blue, web addresses clickable.
function inline(raw: string): string {
  return escapeHtml(raw)
    .split(URL_SPLIT)
    .map((part, i) => {
      if (i % 2 === 0) return emphasize(part);
      // A sentence-ending dot or bracket right after an address is not part of it.
      const trailing = /[.,;:!?)\]]+$/.exec(part)?.[0] ?? "";
      const url = trailing ? part.slice(0, -trailing.length) : part;
      return `<a href="${url}" style="${LINK_STYLE}">${url}</a>${trailing}`;
    })
    .join("");
}

function line(raw: string): string {
  const fact = FACT_LINE.exec(raw);
  if (fact) return `${escapeHtml(fact[1])}: ${KEY(inline(fact[2]).replace(/<\/?strong[^>]*>/g, ""))}`;
  return inline(raw);
}

function greeting(raw: string): string | null {
  const m = /^Hello (.+),$/.exec(raw);
  return m ? `<span style="color:${BLUE}">Hello ${`<strong>${escapeHtml(m[1])}</strong>`},</span>` : null;
}

const P = (inner: string, justify: boolean) => `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:${INK};text-align:${justify ? "justify" : "left"}">${inner}</p>`;

function bodyHtml(lines: string[]): string {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const l of lines) {
    if (l.trim() === "") {
      if (current.length) paragraphs.push(current);
      current = [];
    } else current.push(l);
  }
  if (current.length) paragraphs.push(current);

  return paragraphs
    .map((para, pIndex) => {
      if (pIndex === 0) {
        const g = greeting(para[0]);
        if (g) return P([g, ...para.slice(1).map(line)].join("<br>"), para.length === 1);
      }
      const rendered = para.map((l, i) => {
        const isHeading = HEADINGS.has(l) && (para.length > 1 || i === 0);
        return isHeading ? `<strong style="color:${INK}">${escapeHtml(l)}</strong>` : line(l);
      });
      return P(rendered.join("<br>"), para.length === 1);
    })
    .join("\n");
}

function header(images: EmailImages): string {
  if (images.logo) {
    return `<tr><td align="center" bgcolor="#ffffff" style="padding:24px 24px 12px 24px"><img src="${images.logo}" alt="START: COLLECTIONS" width="180" style="display:block;border:0;max-width:180px;height:auto"></td></tr>`;
  }
  return `<tr><td align="center" bgcolor="${BLUE}" style="padding:20px 24px;border-radius:14px 14px 0 0"><span style="font-family:${FONT};font-size:20px;font-weight:bold;letter-spacing:0.6px;color:#ffffff">START: COLLECTIONS</span></td></tr>`;
}

const banner = (src: string | undefined, alt: string): string =>
  src ? `<tr><td bgcolor="#ffffff" style="padding:0 24px 16px 24px"><img src="${src}" alt="${escapeHtml(alt)}" width="552" style="display:block;border:0;width:100%;max-width:552px;height:auto;border-radius:12px"></td></tr>` : "";

function signature(lines: string[], images: EmailImages): string {
  const team = lines.find((l, i) => i > 0 && l.trim() !== "") ?? "START: COLLECTIONS Team";
  const mark = images.mark
    ? `<img src="${images.mark}" alt="START" width="44" height="44" style="display:block;border:0">`
    : `<div style="width:44px;height:44px;border-radius:10px;background:${BLUE};color:#ffffff;font-family:${FONT};font-size:24px;font-weight:bold;line-height:44px;text-align:center">S</div>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px"><tr>
<td valign="middle" style="padding-right:16px">${mark}</td>
<td valign="middle" style="padding-left:16px;border-left:2px solid #c7d2e8;font-family:${FONT}">
<div style="font-size:15px;font-style:italic;font-weight:bold;color:${BLUE}">United, we innovate,</div>
<div style="font-size:15px;font-weight:bold;color:${BLUE};margin-top:2px">${escapeHtml(team)}</div>
</td></tr></table>`;
}

const DISCLAIMER = "This communication is intended solely for the use of the addressee. It may contain confidential or legally privileged information. If you are not the intended recipient, any disclosure, copying, distribution or the likes about this communication is strictly prohibited. If received in error, notify the sender and delete this email.";

export function toHtml(text: string, options: BrandOptions = defaultBrand()): string {
  const images = options.images ?? {};
  const all = text.replace(/\r\n/g, "\n").split("\n");

  // "--" splits the message from the automated-message notice; "Best regards," starts the sign-off.
  const dash = all.findIndex((l) => l.trim() === "--");
  const main = dash === -1 ? all : all.slice(0, dash);
  const footerLines = dash === -1 ? [] : all.slice(dash + 1).filter((l) => l.trim() !== "");
  const sign = main.findIndex((l) => l.trim() === "Best regards,");
  const bodyLines = sign === -1 ? main : main.slice(0, sign);
  const signLines = sign === -1 ? [] : main.slice(sign).filter((l, i) => i === 0 || l.trim() !== "");

  const footer = footerLines.length ? `<p style="margin:0 0 12px 0;font-size:12px;line-height:1.6;color:${MUTED};text-align:center">${footerLines.map(inline).join("<br>")}</p>` : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>START: COLLECTIONS</title></head>
<body style="margin:0;padding:0;background:${PAGE}" bgcolor="${PAGE}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;font-family:${FONT}">
${header(images)}
${banner(images.bannerTop, "START-DOST: United, we innovate")}
<tr><td bgcolor="#ffffff" style="padding:${images.bannerTop || images.logo ? "8px" : "28px"} 32px 24px 32px;font-family:${FONT}">
${bodyHtml(bodyLines)}
${signLines.length ? signature(signLines, images) : ""}
</td></tr>
${banner(images.bannerBottom, "START: COLLECTIONS, merchandise of the DOST technoscholar community")}
<tr><td bgcolor="#ffffff" style="height:12px;line-height:12px;font-size:0;border-radius:0 0 14px 14px">&nbsp;</td></tr>
<tr><td style="padding:20px 16px 0 16px;font-family:${FONT}">
${footer}
<p style="margin:0;font-size:11px;line-height:1.6;color:#9ca3af;font-style:italic;text-align:center">${DISCLAIMER}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
