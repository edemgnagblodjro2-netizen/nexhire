import app from "./app";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";
import { eq, sql, inArray, notInArray } from "drizzle-orm";
import { db, servicesTable, usersTable } from "@workspace/db";
import { getUncachableStripeClient } from "./stripeClient";
import SERVICES_DATA from "../../service-qc/data/services-data.json" with { type: "json" };

function validateAuthKeysOrExit() {
  const adminKey = process.env.ADMIN_API_KEY;
  const b2gKey = process.env.B2G_API_KEY;
  if (!adminKey) {
    logger.warn(
      "ADMIN_API_KEY is not set — admin and B2G surfaces will reject every request.",
    );
  }
  if (!b2gKey) {
    logger.warn(
      "B2G_API_KEY is not set — B2G partners cannot be onboarded with a scoped credential.",
    );
  }
  if (b2gKey && !process.env.B2G_TENANT_CITY?.trim()) {
    logger.warn(
      "B2G_TENANT_CITY is not set — the B2G API key is not scoped to any region. " +
        "Any holder of B2G_API_KEY can query analytics for every city. " +
        "Set B2G_TENANT_CITY to the municipality or CIUSSS city this credential represents.",
    );
  }
  if (adminKey && b2gKey && adminKey === b2gKey) {
    logger.error(
      "Refusing to start: ADMIN_API_KEY and B2G_API_KEY must be distinct. " +
        "Sharing the same value reintroduces the privilege-escalation path " +
        "where B2G partners gain super-admin access.",
    );
    process.exit(1);
  }
}

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
    // Anonymous search analytics (no PII).
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS search_events (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        province VARCHAR(8) NOT NULL DEFAULT 'ALL',
        category VARCHAR(32) NOT NULL DEFAULT 'all',
        query_len INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_search_events_created" ON search_events (created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_search_events_province" ON search_events (province)`);
    // Ambassador referral codes.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        code VARCHAR(16) NOT NULL,
        claimed_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_codes_code" ON referral_codes (code)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_codes_user" ON referral_codes (user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_referral_codes_created" ON referral_codes (created_at)`);
    // Claim ledger to prevent spam (one claim per claimant per code).
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS referral_claims (
        code VARCHAR(16) NOT NULL,
        claimant_user_id VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (claimant_user_id)
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_referral_claims_code" ON referral_claims (code)`);
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

// Compte démo pour la révision Google Play / App Store.
// Identifiants : demo@attentezero.ca / Demo2026!
// Idempotent : recrée le mot de passe si l'utilisateur existe déjà.
async function ensureDemoAccount() {
  try {
    const email = "demo@attentezero.ca";
    const password = "Demo2026!";
    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(usersTable).values({
        email,
        firstName: "Démo",
        lastName: "Réviseur",
        passwordHash,
        role: "user",
      });
      logger.info({ email }, "Demo account created");
    } else {
      // Always reset to known password so reviewers never get stuck.
      await db
        .update(usersTable)
        .set({ passwordHash })
        .where(eq(usersTable.email, email));
      logger.info({ email }, "Demo account password refreshed");
    }
  } catch (err) {
    logger.error({ err }, "Demo account seed failed (non-fatal)");
  }
}

async function autoSeedServicesIfEmpty() {
  try {
    // Auto-seed is OPT-IN since 2026-05-01 — strategy changed to "10 vetted
    // services per day added manually via the admin panel". The static bundle
    // (~1700 records) is no longer the source of truth; the database is.
    // To re-enable a one-shot seed (e.g. for fresh deploys), set
    // AUTO_SEED_SERVICES=1 (safe mode) or RESEED_SERVICES=1 (destructive).
    const seedEnabled =
      process.env.AUTO_SEED_SERVICES === "1" ||
      process.env.RESEED_SERVICES === "1";
    if (!seedEnabled) {
      logger.info(
        "Auto-seed services disabled (set AUTO_SEED_SERVICES=1 to enable). DB is the source of truth.",
      );
      return;
    }

    const count = await db.$count(servicesTable);
    const SERVICES: any[] = (SERVICES_DATA as any[]) ?? [];
    if (SERVICES.length === 0) {
      logger.warn("No static services to seed");
      return;
    }

    const reseedMode = process.env.RESEED_SERVICES === "1";

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

    if (reseedMode) {
      logger.warn(
        { dbCount: count, bundleCount: rows.length },
        "RESEED_SERVICES=1 — performing FULL destructive sync (delete stale + upsert all fields)",
      );
      const bundleIds = rows.map((r) => r.id);
      // Delete services in DB that aren't in the bundle
      const deleted = await db
        .delete(servicesTable)
        .where(notInArray(servicesTable.id, bundleIds))
        .returning({ id: servicesTable.id });
      logger.info({ deleted: deleted.length }, "Deleted stale services");

      // Upsert all fields from bundle
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        await db
          .insert(servicesTable)
          .values(rows.slice(i, i + batchSize))
          .onConflictDoUpdate({
            target: servicesTable.id,
            set: {
              name: sql`excluded.name`,
              category: sql`excluded.category`,
              subcategory: sql`excluded.subcategory`,
              city: sql`excluded.city`,
              province: sql`excluded.province`,
              phone: sql`excluded.phone`,
              website: sql`excluded.website`,
              description: sql`excluded.description`,
              address: sql`excluded.address`,
              hours: sql`excluded.hours`,
              isUrgent: sql`excluded.is_urgent`,
              isProvinceWide: sql`excluded.is_province_wide`,
              lat: sql`excluded.lat`,
              lng: sql`excluded.lng`,
              active: sql`excluded.active`,
              updatedAt: sql`now()`,
            },
          });
      }
      const finalCount = await db.$count(servicesTable);
      logger.warn(
        { finalCount },
        "Full reseed complete. UNSET RESEED_SERVICES env var on next deploy to restore safe behavior.",
      );
      return;
    }

    // Default safe behavior: insert new, only refresh `province` on existing rows.
    logger.info(
      { dbCount: count, staticCount: rows.length },
      "Auto-seeding services (safe mode: insert new + update province only)…",
    );
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
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

validateAuthKeysOrExit();

runStartupMigrations().then(async () => {
  // Await the seed before serving traffic so users never see partial data
  // (especially during destructive RESEED_SERVICES=1 sync).
  await autoSeedServicesIfEmpty();
  ensureDemoAccount();
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
