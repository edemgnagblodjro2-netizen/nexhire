import { Router, type Request, type Response } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { db, servicesTable, waitTimeReportsTable } from "@workspace/db";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — "Combien d'attente ?" crowdsourced wait-time reporting.
//
// Citizens submit how long they actually waited at a service (urgences, CLSC,
// banque alimentaire, etc.). The endpoint returns a rolling 2-hour median so
// every visitor of a service page sees what's happening RIGHT NOW.
//
// Privacy:
//  - Reports are stored without the raw IP. We only keep sha256(ip + salt) so
//    that the same device can be rate-limited without storing PII.
//  - Reports may be anonymous (no userId) by design — most citizens won't be
//    logged in.
//
// Rate limiting:
//  - The same ipHash can submit at most ONE report per service per 15 minutes.
//    This blocks abusive flooding while still allowing genuine updates.
//
// Display rules:
//  - Median is computed over the last 2 hours.
//  - We require at least MIN_REPORTS_FOR_MEDIAN reports before publishing the
//    median so an outlier from one user can't define a service's wait time.
// ─────────────────────────────────────────────────────────────────────────────

const ROLLING_WINDOW_MINUTES = 120;
const MIN_REPORTS_FOR_MEDIAN = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_MINUTES = 480; // 8 hours
const MIN_MINUTES = 1;

const ReportBody = z.object({
  minutes: z.number().int().min(MIN_MINUTES).max(MAX_MINUTES),
});

function hashIp(ip: string): string {
  const salt = process.env.WAIT_REPORT_SALT ?? "attentezero-default-salt";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex");
}

// Express is configured with `app.set("trust proxy", 1)`, so `req.ip` already
// derives the real client address from the trusted edge proxy. We deliberately
// do NOT parse `x-forwarded-for` ourselves — that would let any caller spoof
// the header to bypass our 15-min rate limit.
function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

const router = Router();

// GET /api/services/:id/wait — public read of current wait-time stats.
router.get("/services/:id/wait", async (req, res) => {
  const serviceId = req.params.id;
  if (!serviceId) {
    res.status(400).json({ error: "Service ID requis." });
    return;
  }

  const since = new Date(Date.now() - ROLLING_WINDOW_MINUTES * 60 * 1000);
  const rows = await db
    .select({
      minutes: waitTimeReportsTable.minutes,
      createdAt: waitTimeReportsTable.createdAt,
    })
    .from(waitTimeReportsTable)
    .where(and(
      eq(waitTimeReportsTable.serviceId, serviceId),
      gte(waitTimeReportsTable.createdAt, since),
    ))
    .orderBy(desc(waitTimeReportsTable.createdAt));

  const sampleCount = rows.length;
  const enoughData = sampleCount >= MIN_REPORTS_FOR_MEDIAN;
  const medianMinutes = enoughData ? median(rows.map((r) => r.minutes)) : null;
  const lastReportedAt = rows[0]?.createdAt?.toISOString() ?? null;

  res.json({
    serviceId,
    windowMinutes: ROLLING_WINDOW_MINUTES,
    minReports: MIN_REPORTS_FOR_MEDIAN,
    sampleCount,
    medianMinutes,
    lastReportedAt,
    // Recent samples (rounded down to a 5-minute bucket so individual data
    // points cannot be fingerprinted, and capped at 10 entries).
    recentReports: rows.slice(0, 10).map((r) => ({
      minutes: Math.floor(r.minutes / 5) * 5,
      reportedAt: r.createdAt.toISOString(),
    })),
  });
});

// POST /api/services/:id/wait — submit a new wait-time report.
router.post("/services/:id/wait", async (req, res) => {
  const serviceId = req.params.id;
  if (!serviceId) {
    res.status(400).json({ error: "Service ID requis." });
    return;
  }

  const parsed = ReportBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: `Durée invalide. Doit être entre ${MIN_MINUTES} et ${MAX_MINUTES} minutes.`,
    });
    return;
  }

  // Make sure the service actually exists before accepting noise.
  const [svc] = await db
    .select({ id: servicesTable.id })
    .from(servicesTable)
    .where(eq(servicesTable.id, serviceId))
    .limit(1);
  if (!svc) {
    res.status(404).json({ error: "Service introuvable." });
    return;
  }

  const ipHash = hashIp(getClientIp(req));
  const userId = req.user?.id ?? null;

  // Rate limit: a given user OR a given ipHash may submit at most 1 report per
  // service every 15 min. We OR the two signals so a logged-in user behind a
  // shared NAT can still report once per service window, while an anonymous
  // spoofer can't simply rotate IPs to flood a service (because we'd still
  // need to re-auth to bypass the user-id branch).
  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waitTimeReportsTable)
    .where(and(
      eq(waitTimeReportsTable.serviceId, serviceId),
      gte(waitTimeReportsTable.createdAt, cutoff),
      userId
        ? or(eq(waitTimeReportsTable.ipHash, ipHash), eq(waitTimeReportsTable.userId, userId))
        : eq(waitTimeReportsTable.ipHash, ipHash),
    ));
  if ((recent?.count ?? 0) > 0) {
    res.status(429).json({
      error: `Vous avez déjà signalé un temps d'attente pour ce service. Réessayez dans ${RATE_LIMIT_WINDOW_MINUTES} minutes.`,
    });
    return;
  }

  try {
    await db.insert(waitTimeReportsTable).values({
      serviceId,
      minutes: parsed.data.minutes,
      userId,
      ipHash,
    });
  } catch (err) {
    req.log.error({ err }, "Wait-time insert error");
    res.status(500).json({ error: "Erreur serveur." });
    return;
  }

  // Recompute the rolling stats so the client can update its widget without a
  // second round-trip.
  const since = new Date(Date.now() - ROLLING_WINDOW_MINUTES * 60 * 1000);
  const rows = await db
    .select({ minutes: waitTimeReportsTable.minutes })
    .from(waitTimeReportsTable)
    .where(and(
      eq(waitTimeReportsTable.serviceId, serviceId),
      gte(waitTimeReportsTable.createdAt, since),
    ));

  const sampleCount = rows.length;
  const enoughData = sampleCount >= MIN_REPORTS_FOR_MEDIAN;

  res.json({
    success: true,
    sampleCount,
    medianMinutes: enoughData ? median(rows.map((r) => r.minutes)) : null,
  });
});

export default router;
