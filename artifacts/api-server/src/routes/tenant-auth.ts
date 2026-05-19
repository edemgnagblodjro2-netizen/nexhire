import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@workspace/db";
import { tenants } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { signTenantJWT, tenantRateLimit, getTenantMetrics, getAllMetrics } from "@workspace/tenant";
import { sendOwnerEmail, sendEmailTo } from "../lib/notify.js";
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

// ── Self-service org creation (new tenant + admin user from scratch) ──────────
const CreateOrgSchema = z.object({
  companyName:     z.string().min(2),
  tenantSlug:      z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  plan:            z.enum(["free", "starter", "pro", "enterprise"]).default("free"),
  enabledProducts: z.array(z.string()).default([]),
  enabledServices: z.array(z.string()).default([]),
  firstName:       z.string().min(1),
  lastName:        z.string().min(1),
  email:           z.string().email(),
  password:        z.string().min(8),
  // Company details
  phone:        z.string().optional(),
  address:      z.string().optional(),
  city:         z.string().optional(),
  neq:          z.string().optional(),
  sector:       z.string().optional(),
  userCount:    z.string().optional(),
  contactTitle: z.string().optional(),
});

router.post("/create-org", authLimiter, async (req, res) => {
  const parsed = CreateOrgSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { companyName, tenantSlug, plan, enabledProducts, enabledServices, firstName, lastName, email, password,
          phone, address, city, neq, sector, userCount, contactTitle } = parsed.data;

  // Check slug uniqueness
  const existing = await db.select().from(tenants).where(eq(tenants.subdomain, tenantSlug)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Ce code organisation est déjà pris. Choisissez-en un autre." }); return; }

  const schemaName = `tenant_${tenantSlug.replace(/-/g, "_")}`;
  const tenantId = crypto.randomUUID();

  // Create tenant record
  await db.insert(tenants).values({
    id: tenantId,
    companyName,
    schemaName,
    subdomain: tenantSlug,
    appType: "portal",
    plan,
    status: "active",
    enabledProducts,
    enabledServices,
    metadata: { phone, address, city, neq, sector, userCount, contactTitle },
  });

  // Provision schema (tables + default roles)
  const { createTenantSchema } = await import("@workspace/tenant");
  await createTenantSchema(schemaName);

  // Ensure password table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${schemaName}".user_passwords (
      user_id VARCHAR(36) PRIMARY KEY,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const passwordHash = await bcrypt.hash(password, 12);
  const adminRole = await pool.query(`SELECT id FROM "${schemaName}".roles WHERE name = 'admin' LIMIT 1`);
  const roleId = adminRole.rows[0]?.id ?? null;

  const newUser = await pool.query(
    `INSERT INTO "${schemaName}".users (email, full_name, role_id, status)
     VALUES ($1, $2, $3, 'active') RETURNING id`,
    [email, `${firstName} ${lastName}`, roleId]
  );
  const userId: string = newUser.rows[0].id;

  await pool.query(
    `INSERT INTO "${schemaName}".user_passwords (user_id, password_hash) VALUES ($1, $2)`,
    [userId, passwordHash]
  );

  try {
    await pool.query(
      `INSERT INTO "${schemaName}".audit_logs (user_id, action, resource, resource_id)
       VALUES ($1, 'create_org', 'tenant', $2)`,
      [userId, tenantId]
    );
  } catch { /* best-effort */ }

  const token = await signTenantJWT({
    tenantId,
    schemaName,
    userId,
    email,
    roleName: "admin",
  });

  // ── Notifications email (best-effort, never blocks the response) ──────────
  const PRODUCT_LABELS: Record<string, string> = {
    constructpro: "ConstructPro ERP",
    attentezero: "AttenteZéro",
    "sites-web": "Sites web",
    "erp-gestion": "ERP & Gestion",
    "marketing-digital": "Marketing digital",
    "automatisation-crm": "Automatisation & CRM",
  };
  const SERVICE_LABELS: Record<string, string> = {
    "site-vitrine": "Site vitrine (dès 800$)",
    "site-ecommerce": "Site e-commerce (dès 1 500$)",
    "portail-mesure": "Portail sur mesure (dès 2 500$)",
    "maintenance-mensuelle-web": "Maintenance mensuelle web (100$/mois)",
    "erp-starter": "ERP Starter (99$/mois)",
    "erp-pro": "ERP Professionnel (249$/mois)",
    "erp-enterprise": "ERP Entreprise (499$/mois)",
    "erp-setup": "Setup & formation ERP (500–1 500$)",
    "marketing-strategie": "Stratégie & conseil marketing (dès 500$/mois)",
    "marketing-reseaux": "Réseaux sociaux (dès 400$/mois)",
    "marketing-ads": "Publicités Ads (dès 600$/mois)",
    "marketing-seo": "SEO & référencement (dès 450$/mois)",
    "auto-analyse": "Analyse & conception automatisation (sur devis)",
    "auto-dev": "Développement automatisation (sur devis)",
    "auto-crm": "CRM sur mesure (sur devis)",
    "auto-support": "Support mensuel automatisation (150$/mois)",
  };

  const productLines = enabledProducts.map(k => `  • ${PRODUCT_LABELS[k] ?? k}`).join("\n") || "  (aucun)";
  const serviceLines = enabledServices.map(k => `  • ${SERVICE_LABELS[k] ?? k}`).join("\n") || "  (aucun)";

  const notifyText = `
Nouvelle organisation inscrite sur le portail CivicAI

Entreprise   : ${companyName}
Code          : attentezero.ca/${tenantSlug}
Plan          : ${plan}
Contact       : ${firstName} ${lastName} <${email}>
ID tenant     : ${tenantId}
Date          : ${new Date().toLocaleString("fr-CA", { timeZone: "America/Toronto" })}

CATÉGORIES SÉLECTIONNÉES
${productLines}

SERVICES SÉLECTIONNÉS
${serviceLines}

───────────────────────────────────────
Accédez au panel admin pour activer les services :
${process.env.PORTAL_URL ?? "https://attentezero.ca"}/admin/tenants/${tenantId}
  `.trim();

  const welcomeText = `
Bonjour ${firstName},

Votre organisation « ${companyName} » a été créée avec succès sur le portail CivicAI.

Code d'accès : ${tenantSlug}

Voici ce que vous avez sélectionné :
${productLines}

Services :
${serviceLines}

Notre équipe vous contactera dans les 24–48 heures pour confirmer votre sélection et discuter des prochaines étapes.

En attendant, vous pouvez accéder à votre tableau de bord via :
${process.env.PORTAL_URL ?? "https://attentezero.ca"}

À bientôt,
L'équipe CivicAI
contact@attentezero.ca
  `.trim();

  // Fire-and-forget — don't await, don't block the response
  Promise.all([
    sendOwnerEmail({
      subject: `🆕 Nouvelle org inscrite : ${companyName} (${tenantSlug})`,
      text: notifyText,
      html: notifyText.replace(/\n/g, "<br>").replace(/─+/g, "<hr>"),
    }),
    sendEmailTo(email, {
      subject: `Bienvenue sur CivicAI Portal — ${companyName}`,
      text: welcomeText,
      html: welcomeText.replace(/\n/g, "<br>"),
    }),
  ]).catch(() => { /* best-effort */ });

  res.status(201).json({
    token,
    user: { id: userId, tenantSlug, email, firstName, lastName, role: "admin" },
  });
});

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

router.patch("/me", async (req, res) => {
  if (!req.tenantUser) { res.status(401).json({ error: "Not authenticated" }); return; }
  if (!req.tenant) { res.status(400).json({ error: "Tenant context missing" }); return; }

  const BodySchema = z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional(),
  });
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.data }); return; }
  const { firstName, lastName, currentPassword, newPassword } = parsed.data;

  if (newPassword) {
    if (!currentPassword) { res.status(400).json({ error: "currentPassword required" }); return; }
    const pwRow = await pool.query(
      `SELECT password_hash FROM "${req.tenant.schemaName}".user_passwords WHERE user_id=$1`,
      [req.tenantUser.userId]
    );
    if (!pwRow.rows[0]) { res.status(400).json({ error: "No password set" }); return; }
    const valid = await bcrypt.compare(currentPassword, pwRow.rows[0].password_hash);
    if (!valid) { res.status(400).json({ error: "Wrong current password" }); return; }
    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `INSERT INTO "${req.tenant.schemaName}".user_passwords (user_id, password_hash)
       VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET password_hash=$2, updated_at=now()`,
      [req.tenantUser.userId, hash]
    );
  }

  if (firstName !== undefined || lastName !== undefined) {
    const existing = await pool.query(
      `SELECT full_name FROM "${req.tenant.schemaName}".users WHERE id=$1`, [req.tenantUser.userId]
    );
    const parts = (existing.rows[0]?.full_name ?? "").split(" ");
    const newFirst = firstName ?? parts[0] ?? "";
    const newLast = lastName ?? parts.slice(1).join(" ") ?? "";
    await pool.query(
      `UPDATE "${req.tenant.schemaName}".users SET full_name=$1, updated_at=now() WHERE id=$2`,
      [`${newFirst} ${newLast}`.trim(), req.tenantUser.userId]
    );
  }

  res.json({ success: true });
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
