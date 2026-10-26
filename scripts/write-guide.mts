// Writes docs/finance-guide.md from src/lib/guide.ts. Run: npm run guide
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderGuideMarkdown } from "../src/lib/guide";

writeFileSync(join(process.cwd(), "docs", "finance-guide.md"), renderGuideMarkdown());
console.log("docs/finance-guide.md written");
