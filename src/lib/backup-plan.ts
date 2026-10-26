// The rules of the nightly backup, kept apart from the database and Drive so they can be tested alone.
export const BACKUP_PREFIX = "backup-";
export const KEEP_BACKUPS = 14; // two weeks of nightly copies
export const LAST_BACKUP_KEY = "last_backup";

// backup-2026-11-13-0200.json.gz, using Manila time so the name matches the finance team's clock.
export function backupFileName(at: Date): string {
  const m = new Date(at.getTime() + 8 * 3_600_000).toISOString(); // UTC+8, no daylight saving
  return `${BACKUP_PREFIX}${m.slice(0, 10)}-${m.slice(11, 13)}${m.slice(14, 16)}.json.gz`;
}

// Which backups to delete once a new one is saved: everything beyond the newest KEEP_BACKUPS. Only files
// that really look like our backups are ever touched.
export function backupsToDelete<T extends { name: string; createdAt: string }>(files: T[], keep: number = KEEP_BACKUPS): T[] {
  const ours = files.filter((f) => /^backup-\d{4}-\d{2}-\d{2}-\d{4}\.json\.gz$/.test(f.name));
  return [...ours].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(keep);
}

export type LastBackup = { at: string; file: string; bytes: number; counts: Record<string, number> };

export function parseLastBackup(value: string | null | undefined): LastBackup | null {
  if (!value) return null;
  try {
    const j = JSON.parse(value) as Partial<LastBackup>;
    if (typeof j.at !== "string" || typeof j.file !== "string" || typeof j.bytes !== "number" || typeof j.counts !== "object" || j.counts === null) return null;
    return { at: j.at, file: j.file, bytes: j.bytes, counts: j.counts as Record<string, number> };
  } catch {
    return null;
  }
}

// "Never", "just now", "3 hours ago": how fresh the last backup is, for the System page.
export function agoText(iso: string, nowMs: number): string {
  const minutes = Math.floor((nowMs - Date.parse(iso)) / 60_000);
  if (Number.isNaN(minutes) || minutes < 0) return "just now";
  if (minutes < 2) return "just now";
  if (minutes < 120) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

// A nightly backup older than this means the schedule has stopped working.
export const STALE_AFTER_HOURS = 30;
export const isStale = (iso: string, nowMs: number): boolean => nowMs - Date.parse(iso) > STALE_AFTER_HOURS * 3_600_000;

// The same two checks against the clock, for screens that should not read the clock themselves.
export const agoFromNow = (iso: string): string => agoText(iso, Date.now());
export const isStaleNow = (iso: string): boolean => isStale(iso, Date.now());
