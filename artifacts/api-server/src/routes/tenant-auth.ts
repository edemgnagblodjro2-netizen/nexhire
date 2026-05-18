import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@workspace/db";
import { tenants } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { withTenantDb, signTenantJWT, tenantRateLimit, getTenantMetrics, getAllMetrics } from "@workspace/tenant";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

const authLimiter = tenantRateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "tenant-auth" });

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2).optional(),
  tenantId: z.string().uuid().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().uuid().optional(),
});

async function resolveTenantFromRequest(req: any): Promise<{ id: string; schemaName: string } | null> {
  const tenantId = req.body.tenantId || req.tenant?.id;
  if (!tenantId) return null;
  const [t] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return t ?? null;
}

router.post("/register", authLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const tenant = await resolveTenantFromRequest(req);
  if (!tenant) { res.status(400).json({ error: "Tenant not found" }); return; }

  const { email, password, fullName } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await pool.query(
    `SELECT id FROM "${tenant.schemaName}".users WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (existing.rows.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }

  const memberRole = await pool.query(
    `SELECT id, name FROM "${tenant.schemaName}".roles WHERE name = 'member' LIMIT 1`
  );
  const roleId = memberRole.rows[0]?.id ?? null;
  const roleName = memberRole.rows[0]?.name ?? null;

  const newUser = await pool.query(
    `INSERT INTO "${tenant.schemaName}".users (email, full_name, role_id, status)
     VALUES ($1, $2, $3, 'active') RETURNING id`,
    [email, fullName ?? null, roleId]
  );
  const userId = newUser.rows[0].id;

  await pool.query(
    `INSERT INTO "${tenant.schemaName}".audit_logs (user_id, action, resource, resource_id)
     VALUES ($1, 'register', 'user', $1)`,
    [userId]
  );

  await pool.query(
    `INSERT INTO "${tenant.schemaName}".users (id, email, full_name, role_id, status)
     VALUES ($1, $2, $3, $4, 'active')
     ON CONFLICT (id) DO UPDATE SET full_name = $3`,
    [userId, email, fullName ?? null, roleId]
  );

  // Store password hash in a separate auth table
  await pool.query(
    `CREATE TABLE IF NOT EXISTS "${tenant.schemaName}".user_passwords (
       user_id VARCHAR(36) PRIMARY KEY REFERENCES "${tenant.schemaName}".users(id) ON DELETE CASCADE,
       password_hash TEXT NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
  );
  await pool.query(
    `INSERT INTO "${tenant.schemaName}".user_passwords (user_id, password_hash) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET password_hash = $2, updated_at = now()`,
    [userId, passwordHash]
  );

  const token = await signTenantJWT({
    tenantId: tenant.id,
    schemaName: tenant.schemaName,
    userId,
    email,
    roleName,
  });

  res.status(201).json({ token, userId, email, roleName });
});

router.post("/login", authLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const tenant = await resolveTenantFromRequest(req);
  if (!tenant) { res.status(400).json({ error: "Tenant not found" }); return; }

  const { email, password } = parsed.data;

  const userResult = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role_id, u.status,
            r.name as role_name, up.password_hash
     FROM "${tenant.schemaName}".users u
     LEFT JOIN "${tenant.schemaName}".roles r ON r.id = u.role_id
     LEFT JOIN "${tenant.schemaName}".user_passwords up ON up.user_id = u.id
     WHERE u.email = $1 LIMIT 1`,
    [email]
  );

  const user = userResult.rows[0];
  if (!user || !user.password_hash) { res.status(401).json({ error: "Invalid credentials" }); return; }
  if (user.status === "suspended") { res.status(403).json({ error: "Account suspended" }); return; }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

  await pool.query(
    `INSERT INTO "${tenant.schemaName}".audit_logs (user_id, action, resource)
     VALUES ($1, 'login', 'session')`,
    [user.id]
  );

  const token = await signTenantJWT({
    tenantId: tenant.id,
    schemaName: tenant.schemaName,
    userId: user.id,
    email: user.email,
    roleName: user.role_name ?? null,
  });

  res.json({ token, userId: user.id, email: user.email, roleName: user.role_name });
});

router.get("/me", async (req, res) => {
  if (!req.tenantUser) { res.status(401).json({ error: "Not authenticated" }); return; }
  if (!req.tenant) { res.status(400).json({ error: "Tenant context missing" }); return; }

  const userResult = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.status, r.name as role_name, u.created_at
     FROM "${req.tenant.schemaName}".users u
     LEFT JOIN "${req.tenant.schemaName}".roles r ON r.id = u.role_id
     WHERE u.id = $1 LIMIT 1`,
    [req.tenantUser.userId]
  );

  if (!userResult.rows[0]) { res.status(404).json({ error: "User not found" }); return; }
  res.json(userResult.rows[0]);
});

// Admin: get tenant metrics
router.get("/metrics/:tenantId", async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  const { tenantId } = req.params;
  if (tenantId === "all") {
    res.json(getAllMetrics()); return;
  }
  const m = getTenantMetrics(tenantId);
  if (!m) { res.status(404).json({ error: "No metrics for this tenant" }); return; }
  res.json(m);
});

export default router;
