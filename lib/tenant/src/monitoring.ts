import type { Request, Response, NextFunction } from "express";

interface TenantMetrics {
  requests: number;
  errors: number;
  totalDurationMs: number;
  lastSeenAt: Date;
}

const metrics = new Map<string, TenantMetrics>();

function getOrCreate(tenantId: string): TenantMetrics {
  if (!metrics.has(tenantId)) {
    metrics.set(tenantId, { requests: 0, errors: 0, totalDurationMs: 0, lastSeenAt: new Date() });
  }
  return metrics.get(tenantId)!;
}

export function tenantMonitoring() {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) return next();

    const m = getOrCreate(tenantId);
    m.requests++;
    m.lastSeenAt = new Date();

    const startedAt = Date.now();

    res.on("finish", () => {
      m.totalDurationMs += Date.now() - startedAt;
      if (res.statusCode >= 400) m.errors++;
    });

    next();
  };
}

export function getTenantMetrics(tenantId: string): TenantMetrics | null {
  return metrics.get(tenantId) ?? null;
}

export function getAllMetrics(): Record<string, TenantMetrics> {
  return Object.fromEntries(metrics.entries());
}

export function resetMetrics(tenantId?: string): void {
  if (tenantId) {
    metrics.delete(tenantId);
  } else {
    metrics.clear();
  }
}
