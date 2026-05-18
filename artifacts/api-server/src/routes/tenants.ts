import { Router } from "express";
import { db } from "@workspace/db";
import { tenants } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createTenantSchema, dropTenantSchema, tenantSchemaExists } from "@workspace/tenant";
import { z } from "zod";

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY;

function requireAdmin(req: any, res: any, next: any) {
  const key = req.headers["x-admin-key"] || req.query.adminKey;
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const CreateTenantSchema = z.object({
  companyName: z.string().min(2),
  subdomain: z.string().min(2).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  appType: z.enum(["attentezero", "constructpro", "civicai"]),
  plan: z.enum(["free", "pro", "enterprise"]).default("free"),
  customDomain: z.string().optional(),
});

router.get("/", requireAdmin, async (req, res) => {
  const all = await db.select().from(tenants).orderBy(tenants.createdAt);
  res.json(all);
});

router.post("/", requireAdmin, async (req, res) => {
  const parsed = CreateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { companyName, subdomain, appType, plan, customDomain } = parsed.data;
  const schemaName = `tenant_${subdomain.replace(/-/g, "_")}`;

  const exists = await tenantSchemaExists(schemaName);
  if (exists) {
    res.status(409).json({ error: `Schema "${schemaName}" already exists` });
    return;
  }

  await createTenantSchema(schemaName);

  const [tenant] = await db
    .insert(tenants)
    .values({
      companyName,
      schemaName,
      subdomain,
      appType,
      plan,
      status: "active",
      customDomain: customDomain ?? null,
    })
    .returning();

  req.log.info({ tenantId: tenant.id, schemaName }, "Tenant created");
  res.status(201).json(tenant);
});

router.get("/:id", requireAdmin, async (req, res) => {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, req.params.id))
    .limit(1);

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.json(tenant);
});

router.patch("/:id/status", requireAdmin, async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["active", "suspended", "trial"]) })
    .parse(req.body);

  const [updated] = await db
    .update(tenants)
    .set({ status, updatedAt: new Date() })
    .where(eq(tenants.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.json(updated);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, req.params.id))
    .limit(1);

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  await dropTenantSchema(tenant.schemaName);
  await db.delete(tenants).where(eq(tenants.id, req.params.id));

  req.log.info({ tenantId: tenant.id, schemaName: tenant.schemaName }, "Tenant deleted");
  res.json({ success: true });
});

export default router;
