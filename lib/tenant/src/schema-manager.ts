import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function tenantSchemaExists(schemaName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
    [schemaName]
  );
  return result.rows.length > 0;
}

export async function createTenantSchema(schemaName: string): Promise<void> {
  const exists = await tenantSchemaExists(schemaName);
  if (exists) throw new Error(`Schema "${schemaName}" already exists`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
    await client.query(TENANT_SCHEMA_SQL(schemaName));
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function dropTenantSchema(schemaName: string): Promise<void> {
  await pool.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
}

function TENANT_SCHEMA_SQL(schema: string): string {
  return `
    -- ── Roles & permissions ──────────────────────────────────────────
    CREATE TABLE "${schema}".roles (
      id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT        NOT NULL UNIQUE,
      description TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "${schema}".permissions (
      id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      resource    TEXT        NOT NULL,
      action      TEXT        NOT NULL,
      description TEXT,
      UNIQUE (resource, action)
    );

    CREATE TABLE "${schema}".role_permissions (
      role_id       VARCHAR(36) NOT NULL REFERENCES "${schema}".roles(id) ON DELETE CASCADE,
      permission_id VARCHAR(36) NOT NULL REFERENCES "${schema}".permissions(id) ON DELETE CASCADE,
      PRIMARY KEY (role_id, permission_id)
    );

    -- ── Users (tenant-local profiles, linked to global auth) ─────────
    CREATE TABLE "${schema}".users (
      id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      auth_user_id TEXT        UNIQUE,
      email        TEXT        NOT NULL UNIQUE,
      full_name    TEXT,
      avatar_url   TEXT,
      role_id      VARCHAR(36) REFERENCES "${schema}".roles(id),
      status       TEXT        NOT NULL DEFAULT 'active',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Projects ─────────────────────────────────────────────────────
    CREATE TABLE "${schema}".projects (
      id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT        NOT NULL,
      description TEXT,
      status      TEXT        NOT NULL DEFAULT 'active',
      owner_id    VARCHAR(36) REFERENCES "${schema}".users(id),
      start_date  DATE,
      end_date    DATE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Tasks ────────────────────────────────────────────────────────
    CREATE TABLE "${schema}".tasks (
      id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      project_id   VARCHAR(36) REFERENCES "${schema}".projects(id) ON DELETE CASCADE,
      title        TEXT        NOT NULL,
      description  TEXT,
      status       TEXT        NOT NULL DEFAULT 'todo',
      priority     TEXT        NOT NULL DEFAULT 'medium',
      assignee_id  VARCHAR(36) REFERENCES "${schema}".users(id),
      due_date     DATE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Tickets (support / helpdesk) ─────────────────────────────────
    CREATE TABLE "${schema}".tickets (
      id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title        TEXT        NOT NULL,
      description  TEXT,
      status       TEXT        NOT NULL DEFAULT 'open',
      priority     TEXT        NOT NULL DEFAULT 'medium',
      category     TEXT,
      reporter_id  VARCHAR(36) REFERENCES "${schema}".users(id),
      assignee_id  VARCHAR(36) REFERENCES "${schema}".users(id),
      resolved_at  TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Queues ───────────────────────────────────────────────────────
    CREATE TABLE "${schema}".queues (
      id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT        NOT NULL,
      description TEXT,
      status      TEXT        NOT NULL DEFAULT 'active',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE "${schema}".queue_entries (
      id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      queue_id    VARCHAR(36) NOT NULL REFERENCES "${schema}".queues(id) ON DELETE CASCADE,
      user_id     VARCHAR(36) REFERENCES "${schema}".users(id),
      position    INTEGER     NOT NULL,
      status      TEXT        NOT NULL DEFAULT 'waiting',
      notes       TEXT,
      joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      served_at   TIMESTAMPTZ
    );

    -- ── Appointments ─────────────────────────────────────────────────
    CREATE TABLE "${schema}".appointments (
      id           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title        TEXT        NOT NULL,
      user_id      VARCHAR(36) REFERENCES "${schema}".users(id),
      assignee_id  VARCHAR(36) REFERENCES "${schema}".users(id),
      project_id   VARCHAR(36) REFERENCES "${schema}".projects(id),
      starts_at    TIMESTAMPTZ NOT NULL,
      ends_at      TIMESTAMPTZ NOT NULL,
      status       TEXT        NOT NULL DEFAULT 'scheduled',
      notes        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Invoices ─────────────────────────────────────────────────────
    CREATE TABLE "${schema}".invoices (
      id             VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      invoice_number TEXT        NOT NULL UNIQUE,
      client_name    TEXT        NOT NULL,
      client_email   TEXT,
      amount_cents   INTEGER     NOT NULL DEFAULT 0,
      currency       TEXT        NOT NULL DEFAULT 'CAD',
      status         TEXT        NOT NULL DEFAULT 'draft',
      due_date       DATE,
      paid_at        TIMESTAMPTZ,
      notes          TEXT,
      created_by     VARCHAR(36) REFERENCES "${schema}".users(id),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Notifications ────────────────────────────────────────────────
    CREATE TABLE "${schema}".notifications (
      id         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    VARCHAR(36) NOT NULL REFERENCES "${schema}".users(id) ON DELETE CASCADE,
      type       TEXT        NOT NULL,
      title      TEXT        NOT NULL,
      body       TEXT,
      read       BOOLEAN     NOT NULL DEFAULT false,
      metadata   JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Settings ─────────────────────────────────────────────────────
    CREATE TABLE "${schema}".settings (
      key        TEXT PRIMARY KEY,
      value      JSONB        NOT NULL,
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
    );

    -- ── Feature flags ────────────────────────────────────────────────
    CREATE TABLE "${schema}".feature_flags (
      key        TEXT    PRIMARY KEY,
      enabled    BOOLEAN NOT NULL DEFAULT false,
      rollout    INTEGER NOT NULL DEFAULT 100,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Audit logs ───────────────────────────────────────────────────
    CREATE TABLE "${schema}".audit_logs (
      id         BIGSERIAL   PRIMARY KEY,
      user_id    VARCHAR(36) REFERENCES "${schema}".users(id),
      action     TEXT        NOT NULL,
      resource   TEXT        NOT NULL,
      resource_id TEXT,
      changes    JSONB,
      ip_hash    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- ── Default data ─────────────────────────────────────────────────
    INSERT INTO "${schema}".roles (id, name, description) VALUES
      (gen_random_uuid()::text, 'admin',  'Full access to all features'),
      (gen_random_uuid()::text, 'member', 'Standard user access'),
      (gen_random_uuid()::text, 'viewer', 'Read-only access');

    INSERT INTO "${schema}".settings (key, value) VALUES
      ('onboarding_complete', 'false'),
      ('language',            '"fr"'),
      ('timezone',            '"America/Toronto"');
  `;
}
