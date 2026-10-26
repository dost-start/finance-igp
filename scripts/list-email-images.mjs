// Lists which of the branded email images exist in public/email and saves the list where the server
// code can read it (src/lib/email/email-images.json). Emails use only the images that exist, so a
// missing file never shows a broken-image icon. Runs before every dev start and build.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "email");
const wanted = ["logo.png", "banner-top.jpg", "banner-bottom.jpg", "mark.png"];
const found = existsSync(dir) ? readdirSync(dir).filter((f) => wanted.includes(f)).sort() : [];

const out = join(root, "src", "lib", "email", "email-images.json");
const next = `${JSON.stringify({ files: found }, null, 2)}\n`;
if (!existsSync(out) || readFileSync(out, "utf8") !== next) writeFileSync(out, next);
console.log(`list-email-images: ${found.length ? found.join(", ") : "no images yet, emails use the text header"}`);
