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
    if (count > 0) {
      logger.info({ count }, "Services table already populated, skipping seed");
      return;
    }
    logger.info("Services table is empty — auto-seeding from static data…");
    const mod: any = await import("../../service-qc/data/services.js").catch(
      () => import("../../service-qc/data/services" as any),
    );
    const SERVICES: any[] = mod.SERVICES ?? [];
    if (SERVICES.length === 0) {
      logger.warn("No static services to seed");
      return;
    }
    const rows = SERVICES.map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      subcategory: s.subcategory ?? "",
      city: s.city ?? "",
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
      await db
        .insert(servicesTable)
        .values(rows.slice(i, i + batchSize))
        .onConflictDoNothing();
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
