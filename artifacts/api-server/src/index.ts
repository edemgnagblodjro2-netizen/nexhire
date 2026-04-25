import app from "./app";
import { logger } from "./lib/logger";
import { sql } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import { getUncachableStripeClient } from "./stripeClient";

async function initStripe() {
  try {
    // Verify Stripe connection is working on startup
    const stripe = await getUncachableStripeClient();
    await stripe.products.list({ limit: 1 });
    logger.info("Stripe connection verified");
  } catch (err) {
    logger.warn({ err }, "Stripe connection check skipped");
  }
}

async function runStartupMigrations() {
  try {
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash varchar`
    );
    await db.execute(
      sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS address varchar`
    );
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email VARCHAR NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Team invitation response columns (accept / decline + disponibility note).
    await db.execute(
      sql`ALTER TABLE organisation_members ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ`,
    );
    await db.execute(
      sql`ALTER TABLE organisation_members ADD COLUMN IF NOT EXISTS response_note TEXT`,
    );
    await db.execute(
      sql`ALTER TABLE organisation_members ADD COLUMN IF NOT EXISTS response_seen_by_inviter VARCHAR(4) NOT NULL DEFAULT 'no'`,
    );
    // Client workflow status + activity feed (shared across org members).
    await db.execute(
      sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'en_cours'`,
    );
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_activities (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id VARCHAR NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        client_id VARCHAR NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        actor_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        kind VARCHAR(24) NOT NULL,
        detail TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "IDX_client_activities_org_time" ON client_activities (organisation_id, created_at)`,
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "IDX_client_activities_client" ON client_activities (client_id, created_at)`,
    );
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_activity_reads (
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organisation_id VARCHAR NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, organisation_id)
      )
    `);
    logger.info("Startup migrations completed");
  } catch (err) {
    logger.error({ err }, "Startup migration failed");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function autoSeedServicesIfEmpty() {
  try {
    const count = await db.$count(servicesTable);
    const mod: any = await import("../../service-qc/data/services.js").catch(
      () => import("../../service-qc/data/services" as any),
    );
    const SERVICES: any[] = mod.SERVICES ?? [];
    if (SERVICES.length === 0) {
      logger.warn("No static services to seed");
      return;
    }
    logger.info({ dbCount: count, staticCount: SERVICES.length }, "Auto-seeding services from static data (insert-or-update province)…");
    const rows = SERVICES.map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      subcategory: s.subcategory ?? "",
      city: s.city ?? "",
      province: s.province ?? "QC",
      phone: s.phone ?? "",
      website: s.website ?? "",
      description: s.description ?? "",
      address: s.address ?? null,
      hours: s.hours ?? null,
      isUrgent: s.isUrgent ?? false,
      isProvinceWide: s.isProvinceWide ?? false,
      lat: s.coordinates?.lat ?? null,
      lng: s.coordinates?.lng ?? null,
      active: true,
    }));
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
      // Insert new rows; for existing rows, only refresh `province` so we don't clobber admin edits.
      await db
        .insert(servicesTable)
        .values(rows.slice(i, i + batchSize))
        .onConflictDoUpdate({
          target: servicesTable.id,
          set: { province: sql`excluded.province` },
        });
    }
    const finalCount = await db.$count(servicesTable);
    logger.info({ finalCount }, "Auto-seed complete");
  } catch (err) {
    logger.error({ err }, "Auto-seed failed (non-fatal)");
  }
}

runStartupMigrations().then(async () => {
  autoSeedServicesIfEmpty();
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });

  // Initialize Stripe in the background (non-blocking)
  initStripe();
});
