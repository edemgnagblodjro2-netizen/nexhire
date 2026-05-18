/**
 * Per-tenant backup script using pg_dump.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run backup-tenants
 *   pnpm --filter @workspace/scripts run backup-tenants -- --slug constructpro_clientA
 *   pnpm --filter @workspace/scripts run backup-tenants -- --dry-run
 *
 * What it does:
 *   1. Lists all tenant schema names from the public.tenants table.
 *   2. For each tenant (or the one specified by --slug), dumps the schema using
 *      pg_dump with --schema=<schemaName> to a timestamped SQL file.
 *   3. Saves dumps to ./backups/tenants/<date>/<slug>.sql
 *
 * Requirements:
 *   - DATABASE_URL env var must be set.
 *   - pg_dump must be available in PATH (install postgresql-client on the server).
 */

import { execSync } from "child_process";
import { mkdirSync, existsSync } from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set.");
  process.exit(1);
}

const args = process.argv.slice(2);
const slugFilter = args.includes("--slug") ? args[args.indexOf("--slug") + 1] : null;
const dryRun = args.includes("--dry-run");

const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const backupDir = path.resolve(process.cwd(), "../../backups/tenants", dateStr);

async function listTenants(): Promise<{ slug: string; schemaName: string; companyName: string }[]> {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT subdomain AS slug, schema_name AS "schemaName", company_name AS "companyName"
       FROM public.tenants
       WHERE status = 'active'
       ORDER BY subdomain`
    );
    return res.rows;
  } finally {
    await client.end();
  }
}

async function dumpTenantSchema(slug: string, schemaName: string): Promise<void> {
  const outFile = path.join(backupDir, `${slug}.sql`);
  const cmd = `pg_dump --schema=${schemaName} --no-owner --no-acl "${DATABASE_URL}" > "${outFile}"`;

  if (dryRun) {
    console.log(`[dry-run] Would run: ${cmd}`);
    return;
  }

  mkdirSync(backupDir, { recursive: true });
  console.log(`  → Dumping schema "${schemaName}" (${slug}) to ${outFile}`);
  try {
    execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] });
    console.log(`  ✅ ${slug} done`);
  } catch (err: any) {
    console.error(`  ❌ Failed to dump ${slug}: ${err.stderr?.toString() ?? err.message}`);
  }
}

async function dumpPublicSchema(): Promise<void> {
  const outFile = path.join(backupDir, "public.sql");
  const cmd = `pg_dump --schema=public --no-owner --no-acl "${DATABASE_URL}" > "${outFile}"`;

  if (dryRun) {
    console.log(`[dry-run] Would run: ${cmd}`);
    return;
  }

  mkdirSync(backupDir, { recursive: true });
  console.log(`  → Dumping public schema to ${outFile}`);
  try {
    execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] });
    console.log(`  ✅ public schema done`);
  } catch (err: any) {
    console.error(`  ❌ Failed to dump public schema: ${err.stderr?.toString() ?? err.message}`);
  }
}

async function main() {
  console.log(`\n🗄️  CivicAI Tenant Backup — ${dateStr}`);
  if (dryRun) console.log("  (dry-run mode — no files will be written)");
  if (slugFilter) console.log(`  Filter: --slug ${slugFilter}`);

  let tenants = await listTenants();
  console.log(`  Found ${tenants.length} active tenant(s)`);

  if (slugFilter) {
    tenants = tenants.filter((t) => t.slug === slugFilter || t.schemaName === slugFilter);
    if (tenants.length === 0) {
      console.error(`  ❌ No tenant found with slug/schema "${slugFilter}"`);
      process.exit(1);
    }
  }

  // Always include the public schema (contains tenants table, users table, etc.)
  if (!slugFilter) {
    console.log("\n📦 Public schema:");
    await dumpPublicSchema();
  }

  console.log("\n📦 Tenant schemas:");
  for (const t of tenants) {
    await dumpTenantSchema(t.slug ?? t.schemaName, t.schemaName);
  }

  if (!dryRun) {
    console.log(`\n✅ Backup complete → ${backupDir}`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
