// The emails are written as plain text (docs/email-templates.md). This builds the HTML copy sent
// alongside it, where every web address is a real clickable link. Nothing else about the wording changes.
const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const URL_PATTERN = /https?:\/\/[^\s<>"]+/g;

function linkify(escaped: string): string {
  return escaped.replace(URL_PATTERN, (match) => {
    // A sentence-ending dot or bracket right after an address is not part of it.
    const trailing = /[.,;:!?)\]]+$/.exec(match)?.[0] ?? "";
    const url = trailing ? match.slice(0, -trailing.length) : match;
    return `<a href="${url}">${url}</a>${trailing}`;
  });
}

export function toHtml(text: string): string {
  const body = linkify(escapeHtml(text)).split("\n").join("<br>\n");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111">${body}</div>`;
}
