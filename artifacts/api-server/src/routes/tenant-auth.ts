import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@workspace/db";
import { tenants } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signTenantJWT, tenantRateLimit, getTenantMetrics, getAllMetrics } from "@workspace/tenant";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();

const authLimiter = tenantRateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "tenant-auth" });

const RegisterSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const LoginSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

async function resolveTenantBySlug(slug: string): Promise<{ id: string; schemaName: string; companyName: string; plan: string } | null> {
  const [t] = await db.select().from(tenants).where(eq(tenants.subdomain, slug)).limit(1);
  return t ?? null;
}

router.post("/register", authLimiter, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { tenantSlug, email, password, firstName, lastName } = parsed.data;
  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) { res.status(400).json({ error: "Tenant not found" }); return; }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await pool.query(
    `SELECT id FROM "${tenant.schemaName}".users WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (existing.rows.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${tenant.schemaName}".user_passwords (
      user_id VARCHAR(36) PRIMARY KEY,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const memberRole = await pool.query(
    `SELECT id, name FROM "${tenant.schemaName}".roles WHERE name = 'member' LIMIT 1`
  );
  const roleId = memberRole.rows[0]?.id ?? null;
  const roleName: string = memberRole.rows[0]?.name ?? "member";

  const newUser = await pool.query(
    `INSERT INTO "${tenant.schemaName}".users (email, full_name, role_id, status)
     VALUES ($1, $2, $3, 'active') RETURNING id`,
    [email, `${firstName} ${lastName}`, roleId]
  );
  const userId: string = newUser.rows[0].id;

  await pool.query(
    `INSERT INTO "${tenant.schemaName}".user_passwords (user_id, password_hash) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET password_hash = $2, updated_at = now()`,
    [userId, passwordHash]
  );

  try {
    await pool.query(
      `INSERT INTO "${tenant.schemaName}".audit_logs (user_id, action, resource, resource_id)
       VALUES ($1, 'register', 'user', $1)`,
      [userId]
    );
  } catch { /* audit log is best-effort */ }

  const token = await signTenantJWT({
    tenantId: tenant.id,
    schemaName: tenant.schemaName,
    userId,
    email,
    roleName,
  });

  res.status(201).json({
    token,
    user: { id: userId, tenantSlug, email, firstName, lastName, role: roleName },
  });
});

router.post("/login", authLimiter, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { tenantSlug, email, password } = parsed.data;
  const tenant = await resolveTenantBySlug(tenantSlug);
  if (!tenant) { res.status(401).json({ error: "Invalid credentials" }); return; }

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

  try {
    await pool.query(
      `INSERT INTO "${tenant.schemaName}".audit_logs (user_id, action, resource)
       VALUES ($1, 'login', 'session')`,
      [user.id]
    );
  } catch { /* audit log is best-effort */ }

  const roleName: string = user.role_name ?? "member";
  const nameParts: string[] = (user.full_name ?? "").split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const token = await signTenantJWT({
    tenantId: tenant.id,
    schemaName: tenant.schemaName,
    userId: user.id,
    email: user.email,
    roleName,
  });

  res.json({
    token,
    user: { id: user.id, tenantSlug, email: user.email, firstName, lastName, role: roleName },
  });
});

router.get("/me", async (req, res) => {
  if (!req.tenantUser) { res.status(401).json({ error: "Not authenticated" }); return; }
  if (!req.tenant) { res.status(400).json({ error: "Tenant context missing" }); return; }

  const [tenantRow] = await db.select().from(tenants).where(eq(tenants.id, req.tenant.id)).limit(1);

  const userResult = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.status, r.name as role_name
     FROM "${req.tenant.schemaName}".users u
     LEFT JOIN "${req.tenant.schemaName}".roles r ON r.id = u.role_id
     WHERE u.id = $1 LIMIT 1`,
    [req.tenantUser.userId]
  );

  if (!userResult.rows[0]) { res.status(404).json({ error: "User not found" }); return; }
  const u = userResult.rows[0];
  const nameParts: string[] = (u.full_name ?? "").split(" ");

  res.json({
    id: u.id,
    tenantSlug: tenantRow?.subdomain ?? req.tenant.schemaName,
    companyName: tenantRow?.companyName ?? "",
    email: u.email,
    firstName: nameParts[0] ?? "",
    lastName: nameParts.slice(1).join(" ") || "",
    role: u.role_name ?? "member",
    enabledProducts: (tenantRow?.enabledProducts as string[]) ?? [],
    enabledServices: (tenantRow?.enabledServices as string[]) ?? [],
  });
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
