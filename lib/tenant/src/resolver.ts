import type { Request } from "express";
import { db } from "@workspace/db";
import { tenants } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import type { TenantInfo } from "./types.js";

export async function resolveTenant(req: Request): Promise<TenantInfo | null> {
  const tenantId = req.headers["x-tenant-id"] as string | undefined;
  const host = (req.headers["x-forwarded-host"] as string) || req.hostname;

  const subdomain = extractSubdomain(host);

  const conditions = [];

  if (tenantId) {
    conditions.push(eq(tenants.id, tenantId));
  }
  if (subdomain) {
    conditions.push(eq(tenants.subdomain, subdomain));
  }
  if (host && !host.includes("localhost") && !host.includes("replit")) {
    conditions.push(eq(tenants.customDomain, host));
  }

  if (conditions.length === 0) return null;

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(or(...conditions))
    .limit(1);

  if (!tenant || tenant.status === "suspended") return null;

  return tenant as TenantInfo;
}

function extractSubdomain(host: string): string | null {
  const parts = host.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}
