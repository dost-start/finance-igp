// Runs in the buyer's browser only. Reads the text on a receipt image with tesseract.js, which
// works in a background thread so the page stays responsive. The image never leaves the phone for
// this step, and the engine files are served from this site (public/ocr, copied at build time by
// scripts/copy-ocr-assets.mjs) so no third-party host sees the visit.
// Everything here is best effort: any failure or a slow phone ends as "unreadable" or "timeout",
// never as an error, because the buyer must always be able to submit (PRD FR03.02).
import type { RawRead } from "./reading";

export const OCR_TIMEOUT_MS = 15_000;
const MIN_WIDTH = 1100; // small screenshots read better when enlarged a little
const DARK_BELOW = 110; // average brightness under this means light text on a dark background

// Draws the receipt for the reader: enlarged if small, and inverted if it is a dark-mode screenshot.
async function prepare(blob: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = bitmap.width < MIN_WIDTH ? Math.min(2, MIN_WIDTH / bitmap.width) : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // Sample the brightness on a coarse grid instead of every pixel.
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      n++;
    }
    if (n > 0 && sum / n < DARK_BELOW) {
      ctx.globalCompositeOperation = "difference";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
  } finally {
    bitmap.close();
  }
}

export type ReceiptReader = { result: Promise<RawRead>; cancel: () => void };

// Starts reading right away. `result` always resolves, within about timeoutMs.
export function startReading(blob: Blob, timeoutMs = OCR_TIMEOUT_MS): ReceiptReader {
  let cancelled = false;
  let terminate: (() => Promise<unknown>) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const work = (async (): Promise<RawRead> => {
    try {
      const [{ createWorker }, canvas] = await Promise.all([import("tesseract.js"), prepare(blob)]);
      if (cancelled) return { status: "unreadable" };
      const origin = window.location.origin;
      // OEM 1 = the neural reader only, which is all the copied engine files contain.
      const worker = await createWorker("eng", 1, {
        workerPath: `${origin}/ocr/worker.min.js`,
        corePath: `${origin}/ocr`,
        langPath: `${origin}/ocr`,
      });
      terminate = () => worker.terminate();
      if (cancelled) return { status: "unreadable" };
      const { data } = await worker.recognize(canvas);
      await worker.terminate();
      terminate = null;
      const text = data.text.trim();
      return text.length >= 8 ? { status: "read", text } : { status: "unreadable" };
    } catch {
      return { status: "unreadable" };
    }
  })();

  const deadline = new Promise<RawRead>((resolve) => {
    timer = setTimeout(() => resolve({ status: "timeout" }), timeoutMs);
  });

  const result = Promise.race([work, deadline]).then(async (r) => {
    clearTimeout(timer);
    if (r.status === "timeout" && terminate) await terminate().catch(() => {}); // stop burning the phone's battery
    return r;
  });

  return {
    result,
    cancel: () => {
      cancelled = true;
      clearTimeout(timer);
      if (terminate) void terminate().catch(() => {});
    },
  };
}
