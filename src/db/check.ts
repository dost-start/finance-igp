import { createDb } from "./client";

// Read-only report: tables, row counts, RLS flags and the Order ID sequence.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { sql } = createDb(url);

  const tables = await sql<{ tablename: string; rowsecurity: boolean }[]>`
    select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename`;
  for (const t of tables) {
    const [{ count }] = await sql.unsafe(`select count(*)::int as count from "${t.tablename}"`);
    console.log(`${t.rowsecurity ? "RLS on " : "RLS OFF"}  ${t.tablename.padEnd(18)} ${count} rows`);
  }
  const [seq] = await sql<{ last_value: string; is_called: boolean }[]>`select last_value, is_called from order_number_seq`;
  console.log(`order_number_seq: last_value=${seq.last_value}, is_called=${seq.is_called}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
