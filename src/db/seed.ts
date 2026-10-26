import { createDb } from "./client";
import { adminAccounts, paymentChannels, products } from "./schema";
import { PAYMENT_CHANNELS, PRODUCTS } from "./seed-data";

// Safe to run more than once: existing rows are left alone, so later edits by finance survive.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { sql, db } = createDb(url);

  const productRows = PRODUCTS.map((p, i) => ({
    ...p,
    images: [{ url: `/products/${p.slug}.svg`, kind: "flat" as const }],
    sortOrder: i,
  }));
  const inserted = await db.insert(products).values(productRows).onConflictDoNothing({ target: products.slug }).returning({ slug: products.slug });

  const channels = await db.insert(paymentChannels).values(PAYMENT_CHANNELS).onConflictDoNothing({ target: paymentChannels.key }).returning({ key: paymentChannels.key });

  const emails = (process.env.SEED_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const admins = emails.length
    ? await db
        .insert(adminAccounts)
        .values(emails.map((email) => ({ email, name: email.split("@")[0], role: "tech" as const })))
        .onConflictDoNothing({ target: adminAccounts.email })
        .returning({ email: adminAccounts.email })
    : [];

  console.log(`Seeded: ${inserted.length} products, ${channels.length} payment channels, ${admins.length} admin accounts (new rows only).`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
