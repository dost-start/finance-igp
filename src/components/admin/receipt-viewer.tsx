"use client";

import { useState } from "react";

const LEVELS = [
  { label: "Fit", width: "100%" },
  { label: "200%", width: "200%" },
  { label: "300%", width: "300%" },
] as const;

// Click the image or use the buttons to zoom. The receipt scrolls inside its own box.
export function ReceiptViewer({ src }: { src: string }) {
  const [level, setLevel] = useState(0);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm" role="group" aria-label="Receipt zoom">
        {LEVELS.map((l, i) => (
          <button
            key={l.label}
            type="button"
            onClick={() => setLevel(i)}
            aria-pressed={level === i}
            className={["rounded-md border px-3 py-1", level === i ? "border-sky-800 bg-sky-800 text-white" : "border-zinc-300 dark:border-zinc-700"].join(" ")}
          >
            {l.label}
          </button>
        ))}
        <a href={src} target="_blank" rel="noopener noreferrer" className="ml-auto underline underline-offset-4">
          Open full size
        </a>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Payment receipt uploaded by the buyer"
          style={{ width: LEVELS[level].width, maxWidth: "none" }}
          className="block cursor-zoom-in"
          onClick={() => setLevel((l) => (l + 1) % LEVELS.length)}
        />
      </div>
    </div>
  );
}
