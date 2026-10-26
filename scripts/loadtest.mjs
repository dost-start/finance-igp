// Read-path load test. Many visitors browse the public pages at once and we report speed and errors.
// Usage: node scripts/loadtest.mjs <base url> <connections> <seconds> [api connections]
// It only reads public pages (never places orders). Pointed at production, Vercel's own flood
// protection will start challenging a single address after a few hundred requests a second, which is
// the platform doing its job; test production gently, or test a local build (npm run build && npm start).
import autocannon from "autocannon";

const [base = "http://localhost:3000", connections = "100", seconds = "20", apiConnections = "50"] = process.argv.slice(2);
const pages = ["/", "/shop", "/products/tshirt-design-a", "/products/jacket", "/cart", "/checkout", "/track", "/privacy"];

function run(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => (err ? reject(err) : resolve(result)));
    autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
  });
}
const failedOf = (r) => r.requests.total - r["2xx"] + r.errors + r.timeouts;
const line = (label, r) =>
  console.log(
    `${label.padEnd(36)} ${String(r.connections).padStart(4)} conns | ${String(Math.round(r.requests.average)).padStart(5)} req/s | p50 ${String(r.latency.p50).padStart(5)} ms, p97.5 ${String(r.latency.p97_5).padStart(5)} ms, p99 ${String(r.latency.p99).padStart(5)} ms | ${r.requests.total} requests, ${r["2xx"]} OK, ${failedOf(r)} failed`,
  );

console.log(`Load test of ${base}\n`);
const results = [];
const mixed = await run({ url: base, connections: Number(connections), duration: Number(seconds), requests: pages.map((path) => ({ method: "GET", path })), timeout: 20 });
line(`Browsing ${pages.length} public pages`, mixed);
results.push(mixed);
for (const [label, path] of [["Store status (/api/store)", "/api/store"], ["Database health (/api/health)", "/api/health"]]) {
  const r = await run({ url: `${base}${path}`, connections: Number(apiConnections), duration: 10, timeout: 20 });
  line(label, r);
  results.push(r);
}
const failed = results.reduce((t, r) => t + failedOf(r), 0);
console.log(`\n${failed === 0 ? "No failed requests." : `${failed} failed requests.`}`);
process.exit(failed === 0 ? 0 : 1);
