import type { Request, Response, NextFunction } from "express";
import { resolveTenant } from "./resolver.js";
import { verifyTenantJWT, extractBearerToken } from "./jwt.js";
import { tenantMonitoring } from "./monitoring.js";

export { tenantMonitoring };

export function tenantMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = await resolveTenant(req);
      if (tenant) {
        req.tenant = tenant;
      }

      const token = extractBearerToken(req.headers.authorization);
      if (token) {
        try {
          const payload = await verifyTenantJWT(token);
          req.tenantUser = {
            userId: payload.userId,
            email: payload.email,
            fullName: null,
            roleId: null,
            roleName: payload.roleName,
          };
          if (!req.tenant && payload.tenantId) {
            const { db } = await import("@workspace/db");
            const { tenants } = await import("@workspace/db/schema");
            const { eq } = await import("drizzle-orm");
            const [t] = await db
              .select()
              .from(tenants)
              .where(eq(tenants.id, payload.tenantId))
              .limit(1);
            if (t) req.tenant = t as any;
          }
        } catch {
          // Invalid JWT — proceed without tenantUser
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireTenant() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      res.status(400).json({ error: "Tenant not found or not specified" });
      return;
    }
    if (req.tenant.status !== "active") {
      res.status(403).json({ error: "Tenant account is suspended" });
      return;
    }
    next();
  };
}

export function requireTenantAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantUser) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
  };
}
