import { Router, type IRouter, type Request, type Response } from "express";
import { db, organisationsTable, subscriptionsTable, serviceViewsTable, servicesTable } from "@workspace/db";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Non authentifié." });
    return false;
  }
  return true;
}

async function getOrgForUser(userId: string) {
  const [org] = await db
    .select()
    .from(organisationsTable)
    .where(eq(organisationsTable.userId, userId))
    .limit(1);
  return org ?? null;
}

async function getSubscription(orgId: string) {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.organisationId, orgId))
    .limit(1);
  return sub ?? null;
}

// GET /api/organisations/me — current organism profile + subscription
router.get("/organisations/me", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const org = await getOrgForUser(userId);
  if (!org) {
    res.status(404).json({ error: "Aucun organisme associé à ce compte." });
    return;
  }
  const sub = await getSubscription(org.id);
  res.json({ organisation: org, subscription: sub });
});

// GET /api/organisations/me/stats?days=30
router.get("/organisations/me/stats", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const org = await getOrgForUser(userId);
  if (!org) {
    res.status(404).json({ error: "Aucun organisme associé à ce compte." });
    return;
  }
  if (!org.serviceId) {
    res.json({
      totals: { views: 0, calls: 0, clicks: 0 },
      daily: [],
      message: "Aucun service lié à votre organisme. Contactez l'administrateur.",
    });
    return;
  }

  const days = Math.min(Math.max(parseInt(String(req.query.days ?? "30"), 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      action: serviceViewsTable.action,
      count: sql<number>`count(*)::int`,
    })
    .from(serviceViewsTable)
    .where(and(
      eq(serviceViewsTable.serviceId, org.serviceId),
      gte(serviceViewsTable.createdAt, since),
    ))
    .groupBy(serviceViewsTable.action);

  const totals = { views: 0, calls: 0, clicks: 0 };
  for (const r of rows) {
    if (r.action === "view") totals.views = r.count;
    if (r.action === "call") totals.calls = r.count;
    if (r.action === "click") totals.clicks = r.count;
  }

  const daily = await db
    .select({
      date: sql<string>`date_trunc('day', ${serviceViewsTable.createdAt})::date::text`,
      action: serviceViewsTable.action,
      count: sql<number>`count(*)::int`,
    })
    .from(serviceViewsTable)
    .where(and(
      eq(serviceViewsTable.serviceId, org.serviceId),
      gte(serviceViewsTable.createdAt, since),
    ))
    .groupBy(sql`date_trunc('day', ${serviceViewsTable.createdAt})`, serviceViewsTable.action)
    .orderBy(sql`date_trunc('day', ${serviceViewsTable.createdAt})`);

  res.json({ totals, daily, days });
});

// PATCH /api/organisations/me — limited fields update (contact info only — service info is read-only)
const UpdateOrgBody = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

router.patch("/organisations/me", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const org = await getOrgForUser(userId);
  if (!org) {
    res.status(404).json({ error: "Aucun organisme associé à ce compte." });
    return;
  }
  const parsed = UpdateOrgBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }
  const [updated] = await db
    .update(organisationsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(organisationsTable.id, org.id))
    .returning();
  res.json({ organisation: updated });
});

// POST /api/services/:id/track — log a view/call/click event (auth required)
//
// Anti-abuse controls (applied in order, cheapest first):
//  1. Authentication — anonymous callers are rejected (401).
//  2. Service existence — only active services can receive events (404).
//  3. Per-user global rate limit — a single authenticated user may record at
//     most TRACK_HOURLY_USER_CAP events across all services within any rolling
//     1-hour window. Prevents bulk flooding from a single account.
//  4. Per-user per-service deduplication — a (user, service, action) triple is
//     accepted at most once per TRACK_DEDUP_MINUTES window. Prevents the same
//     account from repeatedly boosting one service's counter.
const TrackBody = z.object({
  action: z.enum(["view", "call", "click"]).default("view"),
});

const TRACK_HOURLY_USER_CAP = 30;
const TRACK_DEDUP_MINUTES = 30;

router.post("/services/:id/track", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const serviceId = req.params.id;
  if (!serviceId) {
    res.status(400).json({ error: "Service ID requis." });
    return;
  }
  const parsed = TrackBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Action invalide." });
    return;
  }
  const userId = req.user!.id;
  try {
    const [service] = await db
      .select({ id: servicesTable.id })
      .from(servicesTable)
      .where(and(eq(servicesTable.id, serviceId), eq(servicesTable.active, true)))
      .limit(1);
    if (!service) {
      res.status(404).json({ error: "Service introuvable." });
      return;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dedupWindowAgo = new Date(Date.now() - TRACK_DEDUP_MINUTES * 60 * 1000);

    const [[hourlyRow], [dedupRow]] = await Promise.all([
      db
        .select({ total: count() })
        .from(serviceViewsTable)
        .where(and(eq(serviceViewsTable.userId, userId), gte(serviceViewsTable.createdAt, oneHourAgo))),
      db
        .select({ total: count() })
        .from(serviceViewsTable)
        .where(
          and(
            eq(serviceViewsTable.userId, userId),
            eq(serviceViewsTable.serviceId, serviceId),
            eq(serviceViewsTable.action, parsed.data.action),
            gte(serviceViewsTable.createdAt, dedupWindowAgo),
          ),
        ),
    ]);

    if ((hourlyRow?.total ?? 0) >= TRACK_HOURLY_USER_CAP) {
      res.status(429).json({ error: "Limite d'événements atteinte. Veuillez réessayer plus tard." });
      return;
    }
    if ((dedupRow?.total ?? 0) > 0) {
      res.json({ success: true, deduplicated: true });
      return;
    }

    await db.insert(serviceViewsTable).values({
      serviceId,
      action: parsed.data.action,
      userId,
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Track event error");
    res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;
