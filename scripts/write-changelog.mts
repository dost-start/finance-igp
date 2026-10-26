// Writes CHANGELOG.md from src/lib/changelog.ts. Run: npm run changelog
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderChangelogMarkdown } from "../src/lib/changelog";

writeFileSync(join(process.cwd(), "CHANGELOG.md"), renderChangelogMarkdown());
console.log("CHANGELOG.md written");
