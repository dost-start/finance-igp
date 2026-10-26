# Backup and restore

## What is backed up

Every night at 18:00 UTC (02:00 Manila) a Vercel cron job calls `/api/cron/backup`. It writes one compressed file, `backup-YYYY-MM-DD-HHMM.json.gz` (Manila time), to the private Drive folder. It holds the 10 shop tables: orders, order items, payment proofs, status events, products, payment channels, admin accounts, audit log, email log and store settings. Receipts and QR images already live in Drive and are not copied again. The newest 14 backups are kept.

The route needs `Authorization: Bearer <CRON_SECRET>`. Vercel adds it automatically when `CRON_SECRET` is set in the project. Without it the route answers 503; with a wrong value, 401.

`/admin/system` shows the last backup (time, size, row counts) and flags it as late after 30 hours. **Back up now** runs one on demand (audited).

## Check a backup is good

```bash
npm run verify-backup
```

Downloads the newest backup from Drive and compares its row counts with the live database.

## Restore

1. Download the backup file from the Drive folder and unzip it (`gunzip`). It is JSON: `{ app, version, takenAt, counts, tables: { orders: [...], ... } }`.
2. Create a fresh Supabase project (or empty the tables), run the migrations in `drizzle/` (`npm run db:migrate`).
3. Insert the rows table by table in this order: `admin_accounts`, `products`, `payment_channels`, `store_settings`, `orders`, `order_items`, `payment_proofs`, `status_events`, `audit_logs`, `email_logs`. Dates are ISO strings; ids keep their values.
4. Set the order number counter so new orders continue after the highest one: `select setval('order_number_seq', <highest number in the backup> + 1, false)`.
5. Point `DATABASE_URL` at the restored database, redeploy, and check `/api/health` and `/admin`.

Supabase also keeps its own daily backups on paid plans only; this nightly file is the safety net on the free plan.

## Uptime and error checks

- Uptime: add `https://start-shop-six.vercel.app/api/health` to a free monitor (UptimeRobot, 5-minute interval) with an email alert to the Technology lead. It answers 200 with the version when the database is reachable.
- Errors: server errors are saved (cleaned of personal data, capped at 30 per minute) and shown on `/admin/system`.
