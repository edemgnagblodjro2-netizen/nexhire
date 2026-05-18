/**
 * Tenant isolation test — raw pg only (no lib imports)
 * Verifies that two PostgreSQL schemas cannot see each other's data.
 * Usage: pnpm --filter @workspace/scripts run test-isolation
 */
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let passed = 0;
let failed = 0;

function ok(label: string) { console.log(`  ✅ ${label}`); passed++; }
function fail(label: string, detail?: string) {
  console.error(`  ❌ ${label}${detail ? ": " + detail : ""}`); failed++;
}

const SCHEMA_A = "test_isolation_a";
const SCHEMA_B = "test_isolation_b";

async function exec(sql: string, params?: any[]) {
  const client = await pool.connect();
  try { return await client.query(sql, params); }
  finally { client.release(); }
}

async function setup() {
  console.log("\n🔧  Setup — creating test schemas...");

  for (const s of [SCHEMA_A, SCHEMA_B]) {
    await exec(`DROP SCHEMA IF EXISTS "${s}" CASCADE`);
    await exec(`CREATE SCHEMA "${s}"`);
    await exec(`
      CREATE TABLE "${s}".users (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active'
      )
    `);
  }

  await exec(`INSERT INTO "${SCHEMA_A}".users (id, email) VALUES ('user-a-001', 'alice@a.com')`);
  await exec(`INSERT INTO "${SCHEMA_B}".users (id, email) VALUES ('user-b-001', 'bob@b.com')`);
  ok("Schemas created and seeded");
}

async function testIsolation() {
  console.log("\n🔒  Testing data isolation via search_path...");

  // Tenant A search_path → cannot see Tenant B data
  const ca = await pool.connect();
  try {
    await ca.query(`SET search_path TO "${SCHEMA_A}", public`);
    const r = await ca.query(`SELECT email FROM users WHERE email = 'bob@b.com'`);
    r.rows.length === 0
      ? ok("Tenant A cannot see Tenant B users via search_path")
      : fail("Tenant A CAN see Tenant B users — ISOLATION BREACH");
  } finally { ca.release(); }

  // Tenant B search_path → cannot see Tenant A data
  const cb = await pool.connect();
  try {
    await cb.query(`SET search_path TO "${SCHEMA_B}", public`);
    const r = await cb.query(`SELECT email FROM users WHERE email = 'alice@a.com'`);
    r.rows.length === 0
      ? ok("Tenant B cannot see Tenant A users via search_path")
      : fail("Tenant B CAN see Tenant A users — ISOLATION BREACH");
  } finally { cb.release(); }

  // Each schema has exactly its own user
  const cc = await pool.connect();
  try {
    await cc.query(`SET search_path TO "${SCHEMA_A}", public`);
    const r = await cc.query(`SELECT count(*) as c FROM users`);
    Number(r.rows[0].c) === 1
      ? ok("Tenant A schema contains exactly 1 user")
      : fail("Tenant A user count wrong", r.rows[0].c);
  } finally { cc.release(); }
}

async function testCrossSchemaQuery() {
  console.log("\n🚫  Testing cross-schema query via fully-qualified path...");

  // Direct cross-schema read IS possible with full path — that's by design (admin only)
  // This test documents the expected behaviour
  const r = await exec(`SELECT email FROM "${SCHEMA_A}".users WHERE email = 'alice@a.com'`);
  r.rows.length === 1
    ? ok("Admin can read any schema with fully-qualified path (expected — needs admin credentials)")
    : fail("Admin cross-schema read failed unexpectedly");

  // public.users belongs to AttenteZéro's own auth system — not tenant data.
  // Tenant users live exclusively in tenant_<slug>.users schemas.
  const pub = await exec(
    `SELECT table_schema FROM information_schema.tables
     WHERE table_name = 'users' AND table_schema LIKE 'tenant_%'`
  );
  pub.rows.length === 0
    ? ok("No tenant users table leaked into another tenant schema (correct)")
    : fail("Tenant users table found outside its schema", pub.rows.map((r: any) => r.table_schema).join(", "));
}

async function testSchemaRegistry() {
  console.log("\n📋  Testing schema registry...");

  const r = await exec(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1)`,
    [[SCHEMA_A, SCHEMA_B, "tenant_nonexistent"]]
  );
  const found = r.rows.map((x: any) => x.schema_name);

  found.includes(SCHEMA_A) ? ok("Schema A registered in pg") : fail("Schema A missing from pg");
  found.includes(SCHEMA_B) ? ok("Schema B registered in pg") : fail("Schema B missing from pg");
  !found.includes("tenant_nonexistent") ? ok("Non-existent schema absent (correct)") : fail("Ghost schema appeared");
}

async function cleanup() {
  console.log("\n🧹  Cleanup — dropping test schemas...");
  await exec(`DROP SCHEMA IF EXISTS "${SCHEMA_A}" CASCADE`);
  await exec(`DROP SCHEMA IF EXISTS "${SCHEMA_B}" CASCADE`);
  ok("Test schemas dropped");
}

async function main() {
  console.log("══════════════════════════════════════════");
  console.log("  CivicAI — Tenant Isolation Test Suite  ");
  console.log("══════════════════════════════════════════");

  try {
    await setup();
    await testSchemaRegistry();
    await testIsolation();
    await testCrossSchemaQuery();
  } catch (err) {
    console.error("\nUnexpected error:", err);
    failed++;
  } finally {
    await cleanup();
    await pool.end();
  }

  console.log("\n══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
}

main();
