import type { Request, Response, NextFunction } from "express";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function roleHasPermission(
  schemaName: string,
  roleName: string,
  resource: string,
  action: string
): Promise<boolean> {
  if (roleName === "admin") return true;

  const result = await pool.query(
    `
    SELECT 1
    FROM "${schemaName}".role_permissions rp
    JOIN "${schemaName}".roles r      ON r.id = rp.role_id
    JOIN "${schemaName}".permissions p ON p.id = rp.permission_id
    WHERE r.name = $1
      AND p.resource = $2
      AND p.action = $3
    LIMIT 1
    `,
    [roleName, resource, action]
  );
  return result.rows.length > 0;
}

export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.tenantUser;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!req.tenant) {
      res.status(400).json({ error: "Tenant context missing" });
      return;
    }

    if (!user.roleName) {
      res.status(403).json({ error: "No role assigned" });
      return;
    }

    try {
      const allowed = await roleHasPermission(req.tenant.schemaName, user.roleName, resource, action);
      if (!allowed) {
        res.status(403).json({ error: `Permission denied: ${resource}:${action}` });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.tenantUser;
    if (!user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!user.roleName || !roles.includes(user.roleName)) {
      res.status(403).json({ error: `Role required: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
}

export async function grantPermission(
  schemaName: string,
  roleName: string,
  resource: string,
  action: string,
  description?: string
): Promise<void> {
  await pool.query(
    `
    WITH role_row AS (
      SELECT id FROM "${schemaName}".roles WHERE name = $1
    ),
    perm_row AS (
      INSERT INTO "${schemaName}".permissions (resource, action, description)
      VALUES ($2, $3, $4)
      ON CONFLICT (resource, action) DO UPDATE SET description = EXCLUDED.description
      RETURNING id
    )
    INSERT INTO "${schemaName}".role_permissions (role_id, permission_id)
    SELECT role_row.id, perm_row.id FROM role_row, perm_row
    ON CONFLICT DO NOTHING
    `,
    [roleName, resource, action, description ?? `${action} on ${resource}`]
  );
}
