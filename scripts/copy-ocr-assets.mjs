// Copies the receipt-reading engine (tesseract.js worker, its WebAssembly core and the English
// language data) from node_modules into public/ocr, so it is served from our own site. The copies
// are not committed (about 10 MB of third-party binaries); this runs before every dev start and build.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "ocr");
mkdirSync(out, { recursive: true });

const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm.js"],
  ["node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "eng.traineddata.gz"],
];

for (const [from, to] of files) {
  const src = join(root, from);
  if (!existsSync(src)) {
    console.error(`copy-ocr-assets: missing ${from}. Run npm install first.`);
    process.exit(1);
  }
  copyFileSync(src, join(out, to));
}
console.log(`copy-ocr-assets: ${files.length} files in public/ocr`);
