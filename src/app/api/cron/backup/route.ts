import { timingSafeEqual } from "node:crypto";
import { runBackup } from "@/lib/backup";

// Called every night by Vercel's scheduler (see vercel.json). Vercel sends the CRON_SECRET setting as a
// bearer token; without the right one nothing happens. Besides saving the backup, the nightly call keeps
// the free database project from being paused for inactivity.
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return Response.json({ ok: false, error: "not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!authorised(request)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const record = await runBackup();
    return Response.json({ ok: true, file: record.file, bytes: record.bytes, counts: record.counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("nightly backup failed", e instanceof Error ? e.name : "error");
    throw e; // recorded by the error log; the scheduler shows a failed run
  }
}
