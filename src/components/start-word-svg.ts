import { INTRO_SVG } from "@/components/start-intro-svg";

// The vector START wordmark on its own (letters, pyramid and ring, no tagline), for the header's reveal after the
// intro. It is cut out of the intro lockup in start-intro-svg.ts, so the two always match: everything from the
// first letter up to the tagline, with the animation classes and clips stripped, in the traced source coordinates.
function wordmark(): string {
  const start = INTRO_SVG.indexOf('<g class="si-ltr" style="--i:0">');
  const end = INTRO_SVG.indexOf('<g class="si-tag"');
  if (start < 0 || end < start) throw new Error("start-word-svg: wordmark not found in INTRO_SVG");
  const body = INTRO_SVG.slice(start, end)
    .replace(/ (class|style|clip-path)="[^"]*"/g, "")
    .replaceAll("var(--ink)", "var(--si-ink)")
    .replaceAll("var(--yellow)", "var(--si-yellow)");
  return `<svg class="si-word" viewBox="141 313 1742 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}

export const WORD_SVG = wordmark();
