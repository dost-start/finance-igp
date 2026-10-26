// Checks a downloaded backup file and prints what is in it. Run: npx tsx scripts/verify-backup.mts backup-2026-11-13-0200.json.gz
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx scripts/verify-backup.mts <backup file>");
  process.exit(1);
}
const data = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as { app: string; version: string; takenAt: string; counts: Record<string, number>; tables: Record<string, unknown[]> };
if (data.app !== "start-collections") throw new Error("This is not a START: COLLECTIONS backup");
let bad = 0;
for (const [name, rows] of Object.entries(data.tables)) {
  const ok = Array.isArray(rows) && rows.length === data.counts[name];
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${name.padEnd(18)} ${String(rows.length).padStart(6)} rows`);
}
console.log(`\nTaken ${data.takenAt}, app version ${data.version}. ${bad === 0 ? "Every table matches its count." : `${bad} table(s) do not match.`}`);
process.exit(bad === 0 ? 0 : 1);
