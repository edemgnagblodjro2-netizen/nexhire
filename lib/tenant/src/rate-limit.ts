import type { Request, Response, NextFunction } from "express";

interface BucketEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, BucketEntry>();

function cleanExpired() {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt < now) buckets.delete(key);
  }
}

setInterval(cleanExpired, 60_000);

export interface TenantRateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}

export function tenantRateLimit(options: TenantRateLimitOptions) {
  const { windowMs, max, message = "Too many requests, please try again later.", keyPrefix = "rl" } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenant?.id ?? "global";
    const ip = (req.ip ?? "unknown").replace(/[:.]/g, "-");
    const key = `${keyPrefix}:${tenantId}:${ip}`;
    const now = Date.now();

    let entry = buckets.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }

    entry.count++;

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}
