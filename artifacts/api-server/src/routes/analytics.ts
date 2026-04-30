import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import {
  db,
  analyticEventsTable,
  activeSessionsTable,
  pushTokensTable,
  serviceViewsTable,
  searchEventsTable,
  usersTable,
  servicesTable,
} from "@workspace/db";
import { sendExpoPushBatch } from "../lib/expoPush";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Routes analytics (tracking + admin).
//
// Côté mobile (anonyme ou authentifié) :
//   POST /api/analytics/event       → enregistre un événement (vue, appel, …)
//   POST /api/analytics/heartbeat   → ping de présence (toutes les 60 s)
//   POST /api/analytics/push-token  → enregistre / met à jour un jeton Expo
//   POST /api/analytics/session-end → marque la session comme terminée
//
// Côté admin (clé x-admin-key) :
//   GET  /api/admin/live            → utilisateurs actifs en ce moment
//   GET  /api/admin/analytics/overview        → KPIs globaux
//   GET  /api/admin/analytics/screens         → top écrans visités
//   GET  /api/admin/analytics/funnel          → taux de conversion vue→appel
//   POST /api/admin/notifications/send        → envoie une notif ciblée
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

const ACTIVE_WINDOW_SEC = 120; // 2 min : un user est "actif" si dernier ping < 2 min

function requireAdmin(req: Request, res: Response): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    res.status(503).json({ error: "admin disabled" });
    return false;
  }
  const provided =
    (req.headers["x-admin-key"] as string | undefined) ??
    (req.headers["authorization"]?.toString().replace(/^Bearer\s+/i, "") ??
      "");
  if (!provided || provided !== expected) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

// Lit le user authentifié si présent (best-effort, jamais bloquant).
async function readAuthedUserId(req: Request): Promise<string | null> {
  try {
    const u = (req as Request & { user?: { id?: string } }).user;
    if (u?.id) return u.id;
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracking events
// ─────────────────────────────────────────────────────────────────────────────

const EventSchema = z.object({
  eventType: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z_]+$/),
  sessionId: z.string().min(8).max(64),
  serviceId: z.string().max(60).optional(),
  screen: z.string().max(120).optional(),
  province: z.string().max(8).optional(),
  city: z.string().max(120).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  appVersion: z.string().max(20).optional(),
  platform: z.string().max(16).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

router.post("/analytics/event", async (req, res) => {
  const parsed = EventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid payload" });
    return;
  }
  const userId = await readAuthedUserId(req);
  try {
    await db.insert(analyticEventsTable).values({
      eventType: parsed.data.eventType,
      sessionId: parsed.data.sessionId,
      userId: userId ?? null,
      serviceId: parsed.data.serviceId ?? null,
      screen: parsed.data.screen ?? null,
      province: parsed.data.province?.toUpperCase().slice(0, 8) ?? null,
      city: parsed.data.city ?? null,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      appVersion: parsed.data.appVersion ?? null,
      platform: parsed.data.platform ?? null,
      meta: parsed.data.meta ?? null,
    });
    res.status(204).end();
  } catch {
    // Best-effort : on ne bloque jamais l'utilisateur si le tracking échoue.
    res.status(204).end();
  }
});

const HeartbeatSchema = z.object({
  sessionId: z.string().min(8).max(64),
  currentScreen: z.string().max(120).optional(),
  province: z.string().max(8).optional(),
  city: z.string().max(120).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  appVersion: z.string().max(20).optional(),
  platform: z.string().max(16).optional(),
  deviceModel: z.string().max(80).optional(),
});

router.post("/analytics/heartbeat", async (req, res) => {
  const parsed = HeartbeatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid payload" });
    return;
  }
  const userId = await readAuthedUserId(req);
  const now = new Date();
  try {
    await db
      .insert(activeSessionsTable)
      .values({
        sessionId: parsed.data.sessionId,
        userId: userId ?? null,
        startedAt: now,
        lastSeenAt: now,
        currentScreen: parsed.data.currentScreen ?? null,
        province: parsed.data.province?.toUpperCase().slice(0, 8) ?? null,
        city: parsed.data.city ?? null,
        lat: parsed.data.lat ?? null,
        lng: parsed.data.lng ?? null,
        appVersion: parsed.data.appVersion ?? null,
        platform: parsed.data.platform ?? null,
        deviceModel: parsed.data.deviceModel ?? null,
      })
      .onConflictDoUpdate({
        target: activeSessionsTable.sessionId,
        set: {
          userId: userId ?? sql`${activeSessionsTable.userId}`,
          lastSeenAt: now,
          currentScreen: parsed.data.currentScreen ?? null,
          province: parsed.data.province?.toUpperCase().slice(0, 8) ?? null,
          city: parsed.data.city ?? null,
          lat: parsed.data.lat ?? null,
          lng: parsed.data.lng ?? null,
          appVersion: parsed.data.appVersion ?? null,
          platform: parsed.data.platform ?? null,
          deviceModel: parsed.data.deviceModel ?? null,
        },
      });
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
});

const PushTokenSchema = z.object({
  token: z.string().min(10).max(256),
  sessionId: z.string().min(8).max(64).optional(),
  platform: z.string().max(16).optional(),
  appVersion: z.string().max(20).optional(),
});

router.post("/analytics/push-token", async (req, res) => {
  const parsed = PushTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid payload" });
    return;
  }
  const userId = await readAuthedUserId(req);
  const now = new Date();
  try {
    await db
      .insert(pushTokensTable)
      .values({
        token: parsed.data.token,
        userId: userId ?? null,
        sessionId: parsed.data.sessionId ?? null,
        platform: parsed.data.platform ?? null,
        appVersion: parsed.data.appVersion ?? null,
        createdAt: now,
        lastUsedAt: now,
      })
      .onConflictDoUpdate({
        target: pushTokensTable.token,
        set: {
          userId: userId ?? sql`${pushTokensTable.userId}`,
          sessionId:
            parsed.data.sessionId ?? sql`${pushTokensTable.sessionId}`,
          platform:
            parsed.data.platform ?? sql`${pushTokensTable.platform}`,
          appVersion:
            parsed.data.appVersion ?? sql`${pushTokensTable.appVersion}`,
          lastUsedAt: now,
          revokedAt: null,
        },
      });
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
});

router.post("/analytics/session-end", async (req, res) => {
  const sid = (req.body?.sessionId as string | undefined) ?? "";
  if (!sid || sid.length < 8 || sid.length > 64) {
    res.status(204).end();
    return;
  }
  try {
    await db
      .delete(activeSessionsTable)
      .where(eq(activeSessionsTable.sessionId, sid));
  } catch {
    // ignore
  }
  res.status(204).end();
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Live (utilisateurs actifs maintenant)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/live", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const since = new Date(Date.now() - ACTIVE_WINDOW_SEC * 1000);
  try {
    const rows = await db
      .select({
        sessionId: activeSessionsTable.sessionId,
        userId: activeSessionsTable.userId,
        startedAt: activeSessionsTable.startedAt,
        lastSeenAt: activeSessionsTable.lastSeenAt,
        currentScreen: activeSessionsTable.currentScreen,
        province: activeSessionsTable.province,
        city: activeSessionsTable.city,
        lat: activeSessionsTable.lat,
        lng: activeSessionsTable.lng,
        appVersion: activeSessionsTable.appVersion,
        platform: activeSessionsTable.platform,
        deviceModel: activeSessionsTable.deviceModel,
        userEmail: usersTable.email,
        userFirstName: usersTable.firstName,
        userLastName: usersTable.lastName,
        userIsPremium: usersTable.isPremium,
      })
      .from(activeSessionsTable)
      .leftJoin(usersTable, eq(usersTable.id, activeSessionsTable.userId))
      .where(gte(activeSessionsTable.lastSeenAt, since))
      .orderBy(desc(activeSessionsTable.lastSeenAt))
      .limit(500);

    // Pour chaque session, pioche les 3 derniers événements (parcours récent).
    const sessionIds = rows.map((r) => r.sessionId);
    let recentByEvents: Record<
      string,
      Array<{ at: Date; type: string; screen: string | null }>
    > = {};
    if (sessionIds.length > 0) {
      const events = await db
        .select({
          sessionId: analyticEventsTable.sessionId,
          createdAt: analyticEventsTable.createdAt,
          eventType: analyticEventsTable.eventType,
          screen: analyticEventsTable.screen,
        })
        .from(analyticEventsTable)
        .where(
          and(
            gte(
              analyticEventsTable.createdAt,
              new Date(Date.now() - 30 * 60 * 1000),
            ),
            inArray(analyticEventsTable.sessionId, sessionIds),
          ),
        )
        .orderBy(desc(analyticEventsTable.createdAt))
        .limit(2000);
      recentByEvents = {};
      for (const ev of events) {
        const arr = recentByEvents[ev.sessionId] ?? [];
        if (arr.length < 5) {
          arr.push({
            at: ev.createdAt,
            type: ev.eventType,
            screen: ev.screen,
          });
        }
        recentByEvents[ev.sessionId] = arr;
      }
    }

    res.json({
      windowSeconds: ACTIVE_WINDOW_SEC,
      generatedAt: new Date().toISOString(),
      total: rows.length,
      sessions: rows.map((r) => ({
        sessionId: r.sessionId,
        userId: r.userId,
        userLabel: r.userEmail
          ? `${r.userFirstName ?? ""} ${r.userLastName ?? ""}`.trim() ||
            r.userEmail
          : null,
        userEmail: r.userEmail,
        userIsPremium: r.userIsPremium ?? false,
        startedAt: r.startedAt,
        lastSeenAt: r.lastSeenAt,
        secondsAgo: Math.max(
          0,
          Math.round((Date.now() - new Date(r.lastSeenAt).getTime()) / 1000),
        ),
        currentScreen: r.currentScreen,
        province: r.province,
        city: r.city,
        lat: r.lat,
        lng: r.lng,
        appVersion: r.appVersion,
        platform: r.platform,
        deviceModel: r.deviceModel,
        recentEvents: recentByEvents[r.sessionId] ?? [],
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "live failed", detail: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Vue d'ensemble (KPIs)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/analytics/overview", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const daysParam = parseInt(String(req.query.days ?? "30"), 10);
  const days =
    Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365
      ? daysParam
      : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const [
      eventsTotal,
      uniqueSessions,
      uniqueUsers,
      screenViews,
      searches,
      serviceViews,
      serviceCalls,
      serviceDirections,
      activeNow,
      pushTokensCount,
      newUsers,
      premiumUsers,
    ] = await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(gte(analyticEventsTable.createdAt, since)),
      db
        .select({ c: sql<number>`count(distinct session_id)::int` })
        .from(analyticEventsTable)
        .where(gte(analyticEventsTable.createdAt, since)),
      db
        .select({ c: sql<number>`count(distinct user_id)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            isNotNull(analyticEventsTable.userId),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "screen_view"),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "search"),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "service_view"),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "service_call"),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "service_directions"),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(activeSessionsTable)
        .where(
          gte(
            activeSessionsTable.lastSeenAt,
            new Date(Date.now() - ACTIVE_WINDOW_SEC * 1000),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(pushTokensTable)
        .where(sql`revoked_at IS NULL`),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gte(usersTable.createdAt, since)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(eq(usersTable.isPremium, true)),
    ]);

    res.json({
      days,
      activeNow: activeNow[0]?.c ?? 0,
      eventsTotal: eventsTotal[0]?.c ?? 0,
      uniqueSessions: uniqueSessions[0]?.c ?? 0,
      uniqueUsers: uniqueUsers[0]?.c ?? 0,
      screenViews: screenViews[0]?.c ?? 0,
      searches: searches[0]?.c ?? 0,
      serviceViews: serviceViews[0]?.c ?? 0,
      serviceCalls: serviceCalls[0]?.c ?? 0,
      serviceDirections: serviceDirections[0]?.c ?? 0,
      pushTokens: pushTokensCount[0]?.c ?? 0,
      newUsers: newUsers[0]?.c ?? 0,
      premiumUsers: premiumUsers[0]?.c ?? 0,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "overview failed", detail: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Top écrans
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/analytics/screens", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const daysParam = parseInt(String(req.query.days ?? "30"), 10);
  const days =
    Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365
      ? daysParam
      : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const rows = await db
      .select({
        screen: analyticEventsTable.screen,
        count: sql<number>`count(*)::int`,
        uniqueSessions: sql<number>`count(distinct session_id)::int`,
      })
      .from(analyticEventsTable)
      .where(
        and(
          gte(analyticEventsTable.createdAt, since),
          eq(analyticEventsTable.eventType, "screen_view"),
          isNotNull(analyticEventsTable.screen),
        ),
      )
      .groupBy(analyticEventsTable.screen)
      .orderBy(desc(sql`count(*)`))
      .limit(30);
    res.json({ days, screens: rows });
  } catch (err) {
    res
      .status(500)
      .json({ error: "screens failed", detail: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Funnel : vue → appel/itinéraire
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/analytics/funnel", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const daysParam = parseInt(String(req.query.days ?? "30"), 10);
  const days =
    Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365
      ? daysParam
      : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  try {
    const [views, calls, directions, websites] = await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "service_view"),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "service_call"),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "service_directions"),
          ),
        ),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(analyticEventsTable)
        .where(
          and(
            gte(analyticEventsTable.createdAt, since),
            eq(analyticEventsTable.eventType, "service_website"),
          ),
        ),
    ]);

    // Top services par appel
    const topCalled = await db
      .select({
        serviceId: analyticEventsTable.serviceId,
        name: servicesTable.name,
        city: servicesTable.city,
        province: servicesTable.province,
        calls: sql<number>`count(*)::int`,
      })
      .from(analyticEventsTable)
      .leftJoin(
        servicesTable,
        eq(servicesTable.id, analyticEventsTable.serviceId),
      )
      .where(
        and(
          gte(analyticEventsTable.createdAt, since),
          eq(analyticEventsTable.eventType, "service_call"),
          isNotNull(analyticEventsTable.serviceId),
        ),
      )
      .groupBy(
        analyticEventsTable.serviceId,
        servicesTable.name,
        servicesTable.city,
        servicesTable.province,
      )
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    const v = views[0]?.c ?? 0;
    const c = calls[0]?.c ?? 0;
    const d = directions[0]?.c ?? 0;
    const w = websites[0]?.c ?? 0;
    res.json({
      days,
      views: v,
      calls: c,
      directions: d,
      websites: w,
      callRate: v > 0 ? Math.round((c / v) * 1000) / 10 : 0,
      directionsRate: v > 0 ? Math.round((d / v) * 1000) / 10 : 0,
      websiteRate: v > 0 ? Math.round((w / v) * 1000) / 10 : 0,
      topCalled,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "funnel failed", detail: (err as Error).message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Envoi de notifications push (upsell premium, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const SendNotifSchema = z.object({
  audience: z.enum(["session", "user", "all_free", "all"]),
  sessionId: z.string().min(8).max(64).optional(),
  userId: z.string().max(64).optional(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  data: z.record(z.string(), z.unknown()).optional(),
  // Garde-fou : pour les audiences massives (all / all_free), l'admin doit
  // confirmer explicitement en envoyant la chaîne `ENVOYER` afin d'éviter
  // tout envoi accidentel à des dizaines de milliers d'appareils.
  confirm: z.string().optional(),
});

const MASS_AUDIENCES: ReadonlySet<string> = new Set(["all", "all_free"]);
const MASS_CONFIRM_TOKEN = "ENVOYER";

router.post("/admin/notifications/send", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = SendNotifSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid payload", detail: parsed.error.format() });
    return;
  }
  const { audience, sessionId, userId, title, body, data, confirm } =
    parsed.data;

  // Garde-fou serveur : audience massive sans confirmation explicite = refus.
  if (MASS_AUDIENCES.has(audience) && confirm !== MASS_CONFIRM_TOKEN) {
    res.status(400).json({
      error: "confirmation requise",
      detail: `Pour cibler "${audience}", incluez le champ confirm: "${MASS_CONFIRM_TOKEN}".`,
    });
    return;
  }

  try {
    let tokens: string[] = [];

    if (audience === "session") {
      if (!sessionId) {
        res.status(400).json({ error: "sessionId requis" });
        return;
      }
      const rows = await db
        .select({ token: pushTokensTable.token })
        .from(pushTokensTable)
        .where(
          and(
            eq(pushTokensTable.sessionId, sessionId),
            sql`${pushTokensTable.revokedAt} IS NULL`,
          ),
        );
      tokens = rows.map((r) => r.token);
    } else if (audience === "user") {
      if (!userId) {
        res.status(400).json({ error: "userId requis" });
        return;
      }
      const rows = await db
        .select({ token: pushTokensTable.token })
        .from(pushTokensTable)
        .where(
          and(
            eq(pushTokensTable.userId, userId),
            sql`${pushTokensTable.revokedAt} IS NULL`,
          ),
        );
      tokens = rows.map((r) => r.token);
    } else if (audience === "all_free") {
      const rows = await db
        .select({ token: pushTokensTable.token })
        .from(pushTokensTable)
        .leftJoin(usersTable, eq(usersTable.id, pushTokensTable.userId))
        .where(
          and(
            sql`${pushTokensTable.revokedAt} IS NULL`,
            sql`(${usersTable.isPremium} IS NOT TRUE)`,
          ),
        );
      tokens = rows.map((r) => r.token);
    } else {
      const rows = await db
        .select({ token: pushTokensTable.token })
        .from(pushTokensTable)
        .where(sql`${pushTokensTable.revokedAt} IS NULL`);
      tokens = rows.map((r) => r.token);
    }

    // Dédoublonner
    tokens = Array.from(new Set(tokens));

    if (tokens.length === 0) {
      res.json({ targeted: 0, sent: 0, errors: [] });
      return;
    }

    const messages = tokens.map((t) => ({
      to: t,
      title,
      body,
      sound: "default" as const,
      priority: "high" as const,
      data: { ...(data ?? {}), kind: "admin-broadcast" },
    }));

    const result = await sendExpoPushBatch(messages);

    // Log d'audit dans analytic_events
    try {
      await db.insert(analyticEventsTable).values({
        eventType: "admin_push_sent",
        sessionId: "admin",
        userId: null,
        meta: {
          audience,
          targetSessionId: sessionId,
          targetUserId: userId,
          title,
          targeted: tokens.length,
          sent: result.sent,
          errorCount: result.errors.length,
        },
      });
    } catch {
      // ignore
    }

    res.json({ targeted: tokens.length, sent: result.sent, errors: result.errors.slice(0, 5) });
  } catch (err) {
    res
      .status(500)
      .json({ error: "send failed", detail: (err as Error).message });
  }
});

// Liste des push tokens connus (pour debug admin)
router.get("/admin/notifications/tokens", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select({
        id: pushTokensTable.id,
        token: pushTokensTable.token,
        userId: pushTokensTable.userId,
        sessionId: pushTokensTable.sessionId,
        platform: pushTokensTable.platform,
        appVersion: pushTokensTable.appVersion,
        createdAt: pushTokensTable.createdAt,
        lastUsedAt: pushTokensTable.lastUsedAt,
        userEmail: usersTable.email,
        userIsPremium: usersTable.isPremium,
      })
      .from(pushTokensTable)
      .leftJoin(usersTable, eq(usersTable.id, pushTokensTable.userId))
      .where(sql`${pushTokensTable.revokedAt} IS NULL`)
      .orderBy(desc(pushTokensTable.lastUsedAt))
      .limit(500);
    res.json({ total: rows.length, tokens: rows });
  } catch (err) {
    res
      .status(500)
      .json({ error: "tokens failed", detail: (err as Error).message });
  }
});

// Référence service_views pour rester compatible avec l'ancien tracker.
// (Sert juste à garder l'import non orphelin si la table reste utilisée ailleurs.)
void serviceViewsTable;
void searchEventsTable;

export default router;
