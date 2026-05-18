import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const sharedPool = new Pool({ connectionString: process.env.DATABASE_URL });

const tenantPoolCache = new Map<string, InstanceType<typeof Pool>>();

function getPool(dbHost?: string | null, dbName?: string | null): InstanceType<typeof Pool> {
  if (!dbHost || !dbName) return sharedPool;

  const key = `${dbHost}/${dbName}`;
  if (!tenantPoolCache.has(key)) {
    tenantPoolCache.set(
      key,
      new Pool({ host: dbHost, database: dbName })
    );
  }
  return tenantPoolCache.get(key)!;
}

type AnyDb = NodePgDatabase<Record<string, never>>;

export async function withTenantDb<T>(
  schemaName: string,
  fn: (db: AnyDb) => Promise<T>,
  dbHost?: string | null,
  dbName?: string | null
): Promise<T> {
  const pool = getPool(dbHost, dbName);
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schemaName}", public`);
    const tenantDb = drizzle(client) as AnyDb;
    return await fn(tenantDb);
  } finally {
    client.release();
  }
}

export async function withPublicDb<T>(
  fn: (db: AnyDb) => Promise<T>
): Promise<T> {
  const client = await sharedPool.connect();
  try {
    await client.query(`SET search_path TO public`);
    const publicDb = drizzle(client) as AnyDb;
    return await fn(publicDb);
  } finally {
    client.release();
  }
}
