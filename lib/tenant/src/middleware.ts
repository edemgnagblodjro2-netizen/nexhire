import type { Request, Response, NextFunction } from "express";
import { resolveTenant } from "./resolver.js";

export function tenantMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant = await resolveTenant(req);
      if (tenant) {
        req.tenant = tenant;
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
