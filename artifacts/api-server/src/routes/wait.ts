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
//  - Authentication is required to submit a report (POST handler enforces
//    req.user). This ensures each report carries an account-bound identity
//    that is stronger than an IP address, which can be trivially rotated
//    through proxies/VPNs to mount a sybil attack.
//  - Low-volume fields (sampleCount, lastReportedAt, recentReports) are
//    suppressed entirely until isPublishable() is true, so an outsider cannot
//    monitor near-real-time activity at sensitive services (shelters, food
//    banks, crisis lines) by polling the endpoint.
//
// Rate limiting (submissions):
//  - The same ipHash can submit at most ONE report per service per 15 minutes.
//    This blocks abusive flooding while still allowing genuine updates.
//  - A global per-service cap (MAX_REPORTS_PER_SERVICE_WINDOW) prevents a
//    coordinated sybil attack from quickly filling the rolling window with
//    forged reports across many IP addresses.
//
// Publication gate (read):
//  A median is only published when ALL THREE conditions are met:
//  1. sampleCount >= MIN_REPORTS_FOR_MEDIAN (5) — prevents single-user outliers.
//  2. distinctIpCount >= MIN_REPORTS_FOR_MEDIAN — ensures reports come from
//     genuinely distinct sources; a single attacker behind multiple proxies
//     is subject to the per-IP rate limit, but this gate enforces it in the
//     aggregation step too.
//  3. temporalSpread >= MIN_TEMPORAL_SPREAD_MINUTES (30) — the time between
//     the oldest and newest qualifying report must be at least 30 minutes.
//     This defeats burst sybil attacks: even if an attacker quickly submits
//     from 5 rotating IPs, the manipulated median won't be published until
//     at least 30 minutes after the first forged report entered the window.
//     Genuine organic reports naturally accumulate over time and pass this
//     gate trivially. This is the primary anti-automation control.
// ─────────────────────────────────────────────────────────────────────────────

const ROLLING_WINDOW_MINUTES = 120;
const MIN_REPORTS_FOR_MEDIAN = 5;
const MIN_TEMPORAL_SPREAD_MINUTES = 30; // burst sybil gate (see above)
const RATE_LIMIT_WINDOW_MINUTES = 15;
// Maximum total reports accepted for a single service within the rate-limit
// window, across ALL callers.
const MAX_REPORTS_PER_SERVICE_WINDOW = 20;
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

type WindowRow = { minutes: number; createdAt: Date; ipHash: string | null };

/**
 * Determines whether the rolling-window data meets all three publication
 * criteria (count, distinct-source, and temporal-spread).
 *
 * Keeping the gate logic in one place ensures GET and POST recomputation
 * apply identical rules.
 */
function isPublishable(rows: WindowRow[]): boolean {
  if (rows.length < MIN_REPORTS_FOR_MEDIAN) return false;

  const distinctIps = new Set(rows.map((r) => r.ipHash ?? "").filter(Boolean));
  if (distinctIps.size < MIN_REPORTS_FOR_MEDIAN) return false;

  const times = rows.map((r) => r.createdAt.getTime());
  const spreadMs = Math.max(...times) - Math.min(...times);
  const spreadMinutes = spreadMs / 60_000;
  if (spreadMinutes < MIN_TEMPORAL_SPREAD_MINUTES) return false;

  return true;
}

const router = Router();

// GET /api/services/:id/wait — public read of current wait-time stats.
//
// Privacy contract: when isPublishable() is false the response contains only
// structural metadata (serviceId, windowMinutes, minReports, medianMinutes:
// null). sampleCount, lastReportedAt, and recentReports are suppressed so
// the response carries no signal that can be used to monitor near-real-time
// activity at a sensitive service. The privacy and integrity control lives
// here at the server boundary, not in the client UI.
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
      ipHash: waitTimeReportsTable.ipHash,
    })
    .from(waitTimeReportsTable)
    .where(and(
      eq(waitTimeReportsTable.serviceId, serviceId),
      gte(waitTimeReportsTable.createdAt, since),
    ))
    .orderBy(desc(waitTimeReportsTable.createdAt));

  if (!isPublishable(rows)) {
    // Return only structural metadata — no count, no timestamps, no samples.
    // This prevents outsiders from detecting low-volume or burst-sybil visits
    // at sensitive services by polling the endpoint.
    res.json({
      serviceId,
      windowMinutes: ROLLING_WINDOW_MINUTES,
      minReports: MIN_REPORTS_FOR_MEDIAN,
      medianMinutes: null,
    });
    return;
  }

  // Data passes all publication gates. Timestamps in recentReports are
  // deliberately omitted — exposing when each individual report was submitted
  // would let callers fingerprint specific visits even when the minutes value
  // is bucketed.
  res.json({
    serviceId,
    windowMinutes: ROLLING_WINDOW_MINUTES,
    minReports: MIN_REPORTS_FOR_MEDIAN,
    sampleCount: rows.length,
    medianMinutes: median(rows.map((r) => r.minutes)),
    lastReportedAt: rows[0]?.createdAt?.toISOString() ?? null,
    // Recent samples rounded to a 5-minute bucket. reportedAt is omitted
    // intentionally — see privacy note above.
    recentReports: rows.slice(0, 10).map((r) => ({
      minutes: Math.floor(r.minutes / 5) * 5,
    })),
  });
});

// POST /api/services/:id/wait — submit a new wait-time report.
//
// Authentication required: an account-bound identity (userId) is needed so
// that the source of each report is at least as strong as a registered user,
// not merely an IP address that can be trivially rotated through proxies or
// VPNs. Without this gate, five low-cost proxy exits can satisfy all three
// publication criteria (count, distinct-IP, temporal-spread) and push forged
// wait times to both the public widget and the B2G partner dashboard.
router.post("/services/:id/wait", async (req, res) => {
  if (!req.user) {
    res.status(401).json({
      error: "Connexion requise pour signaler un temps d'attente.",
      code: "AUTH_REQUIRED",
    });
    return;
  }

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
  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  // Rate limit 1 — per caller: a given user OR ipHash may submit at most 1
  // report per service every 15 min. We OR the two signals so a logged-in user
  // behind a shared NAT can still report, while an anonymous spoofer can't
  // simply rotate IPs to bypass the user-id branch.
  const [callerRecent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waitTimeReportsTable)
    .where(and(
      eq(waitTimeReportsTable.serviceId, serviceId),
      gte(waitTimeReportsTable.createdAt, cutoff),
      userId
        ? or(eq(waitTimeReportsTable.ipHash, ipHash), eq(waitTimeReportsTable.userId, userId))
        : eq(waitTimeReportsTable.ipHash, ipHash),
    ));
  if ((callerRecent?.count ?? 0) > 0) {
    res.status(429).json({
      error: `Vous avez déjà signalé un temps d'attente pour ce service. Réessayez dans ${RATE_LIMIT_WINDOW_MINUTES} minutes.`,
    });
    return;
  }

  // Rate limit 2 — global per-service cap: reject if the service has already
  // received MAX_REPORTS_PER_SERVICE_WINDOW total reports from any source
  // within the rate-limit window. This bounds the sybil-attack surface —
  // rotating through many proxies can no longer instantly saturate the rolling
  // window with enough forged entries to affect the aggregation.
  const [serviceTotal] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waitTimeReportsTable)
    .where(and(
      eq(waitTimeReportsTable.serviceId, serviceId),
      gte(waitTimeReportsTable.createdAt, cutoff),
    ));
  if ((serviceTotal?.count ?? 0) >= MAX_REPORTS_PER_SERVICE_WINDOW) {
    res.status(429).json({
      error: "Trop de signalements reçus pour ce service. Réessayez plus tard.",
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
  // second round-trip. Apply the same isPublishable() gate as the GET endpoint
  // — only expose sampleCount / medianMinutes when all criteria are met.
  const since = new Date(Date.now() - ROLLING_WINDOW_MINUTES * 60 * 1000);
  const rows = await db
    .select({
      minutes: waitTimeReportsTable.minutes,
      createdAt: waitTimeReportsTable.createdAt,
      ipHash: waitTimeReportsTable.ipHash,
    })
    .from(waitTimeReportsTable)
    .where(and(
      eq(waitTimeReportsTable.serviceId, serviceId),
      gte(waitTimeReportsTable.createdAt, since),
    ));

  const publishable = isPublishable(rows);

  res.json({
    success: true,
    sampleCount: publishable ? rows.length : null,
    medianMinutes: publishable ? median(rows.map((r) => r.minutes)) : null,
  });
});

export default router;
