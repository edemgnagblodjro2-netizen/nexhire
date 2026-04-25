import { Router, type Request, type Response, type NextFunction } from "express";
import { db, servicesTable, serviceViewsTable, usersTable, waitTimeReportsTable } from "@workspace/db";
import { and, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";

const LIVE_WAIT_WINDOW_MINUTES = 120;

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — B2G insights endpoint (v1.0.33 Phase 2)
//
// Returns anonymized, aggregated statistics on citizen demand for community
// services in a given Quebec region. Designed for municipalities and CIUSSS
// who need to understand local needs and coverage gaps. NO individual user
// data is ever exposed — every metric is a count over many citizens.
//
// Privacy floor: any aggregate with fewer than MIN_AGGREGATE events is
// suppressed (clamped to 0) to prevent re-identification of individual
// citizens. Applies to totals, daily series, top services, and top
// categories alike. The exact threshold is also returned as `privacyFloor`
// so dashboards can label suppressed buckets.
//
// Auth: gated by `B2G_API_KEY` (issued to municipality / CIUSSS partners)
// or `ADMIN_API_KEY` (super-admin override). The B2G key is intentionally
// distinct from `ADMIN_API_KEY` so a partner credential can NEVER reach
// the service or verification administration endpoints. Startup refuses
// to boot if the two keys are set to the same value (see index.ts ::
// validateAuthKeysOrExit). Once partner contracts are signed, swap for a
// per-tenant signed token tied to a specific allowed region.
// ─────────────────────────────────────────────────────────────────────────────

const MIN_AGGREGATE = 5;

function requireB2GKey(req: Request, res: Response, next: NextFunction) {
  const b2gKey = process.env.B2G_API_KEY;
  const adminKey = process.env.ADMIN_API_KEY;
  const provided = req.headers["x-admin-key"];
  const validB2G = b2gKey && provided === b2gKey;
  const validAdmin = adminKey && provided === adminKey;
  if (!validB2G && !validAdmin) {
    res.status(401).json({ error: "Accès refusé." });
    return;
  }
  next();
}

const router = Router();

// GET /api/b2g/regions — list of cities that have at least one referenced
// service. Used to populate the region selector in the dashboard.
router.get("/b2g/regions", requireB2GKey, async (_req, res) => {
  const rows = await db
    .select({
      city: servicesTable.city,
      services: sql<number>`count(*)::int`,
    })
    .from(servicesTable)
    .where(eq(servicesTable.active, true))
    .groupBy(servicesTable.city)
    .orderBy(desc(sql`count(*)`));

  const regions = rows
    .filter((r) => r.city && r.city.trim().length > 0)
    .map((r) => ({ city: r.city, services: r.services }));

  res.json({ regions });
});

// GET /api/b2g/insights?city=Montréal&days=30
router.get("/b2g/insights", requireB2GKey, async (req, res) => {
  const city = String(req.query.city ?? "").trim();
  const days = Math.min(Math.max(parseInt(String(req.query.days ?? "30"), 10) || 30, 1), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Resolve which services belong to this region. Province-wide services are
  // included only when no specific city is requested, since they apply
  // everywhere and would otherwise dominate every regional view.
  const serviceFilter = city
    ? eq(servicesTable.city, city)
    : eq(servicesTable.active, true);

  const regionServices = await db
    .select({
      id: servicesTable.id,
      name: servicesTable.name,
      category: servicesTable.category,
      isUrgent: servicesTable.isUrgent,
    })
    .from(servicesTable)
    .where(and(eq(servicesTable.active, true), serviceFilter));

  const serviceIds = regionServices.map((s) => s.id);
  const serviceMeta = new Map(regionServices.map((s) => [s.id, s]));

  // Categories present in the region (denominator for coverage gap analysis).
  const servicesByCategory = new Map<string, number>();
  const urgentServiceIds = new Set<string>();
  for (const s of regionServices) {
    servicesByCategory.set(s.category, (servicesByCategory.get(s.category) ?? 0) + 1);
    if (s.isUrgent) urgentServiceIds.add(s.id);
  }

  // ── If region has no referenced services, short-circuit with empty payload.
  if (serviceIds.length === 0) {
    res.json({
      region: city || "Tout le Québec",
      days,
      since: since.toISOString(),
      generatedAt: new Date().toISOString(),
      privacyFloor: MIN_AGGREGATE,
      totals: {
        interactions: 0,
        views: 0,
        calls: 0,
        websiteClicks: 0,
        urgentEngagements: 0,
        uniqueServicesEngaged: 0,
        distinctAuthenticatedUsers: 0,
        anonymousEvents: 0,
      },
      // Keep the response shape invariant across regions so the admin dashboard
      // never has to defend against missing fields. Empty regions just get
      // zero/empty placeholders for every section the populated payload emits.
      userStats: {
        total: 0,
        newInPeriod: 0,
        premium: 0,
        premiumConversionPct: 0,
        citizens: 0,
        organisations: 0,
      },
      dailySignups: [],
      waitStats: {
        reportsInPeriod: 0,
        servicesReportedInPeriod: 0,
        liveWindowMinutes: LIVE_WAIT_WINDOW_MINUTES,
        liveTopServices: [],
      },
      topCategories: [],
      topServices: [],
      dailyActivity: [],
      coverageGaps: [],
      categoriesInRegion: Array.from(servicesByCategory.entries()).map(([category, services]) => ({
        category,
        services,
      })),
    });
    return;
  }

  // ── Totals by action type.
  const totalsRows = await db
    .select({
      action: serviceViewsTable.action,
      count: sql<number>`count(*)::int`,
    })
    .from(serviceViewsTable)
    .where(and(
      gte(serviceViewsTable.createdAt, since),
      inArray(serviceViewsTable.serviceId, serviceIds),
    ))
    .groupBy(serviceViewsTable.action);

  // Helper: clamp any bucket below the privacy floor to 0 so we never leak
  // counts that could identify a small cohort of citizens.
  const floor = (n: number) => (n >= MIN_AGGREGATE ? n : 0);

  const totals = {
    interactions: 0,
    views: 0,
    calls: 0,
    websiteClicks: 0,
    urgentEngagements: 0,
    uniqueServicesEngaged: 0,
    distinctAuthenticatedUsers: 0,
    anonymousEvents: 0,
  };
  let rawInteractions = 0;
  let rawViews = 0;
  let rawCalls = 0;
  let rawClicks = 0;
  for (const r of totalsRows) {
    rawInteractions += r.count;
    if (r.action === "view") rawViews = r.count;
    else if (r.action === "call") rawCalls = r.count;
    else if (r.action === "click") rawClicks = r.count;
  }
  totals.interactions = floor(rawInteractions);
  totals.views = floor(rawViews);
  totals.calls = floor(rawCalls);
  totals.websiteClicks = floor(rawClicks);

  // ── Distinct engaged services + split visitor buckets:
  //  - distinctAuthenticatedUsers: count(distinct user_id) where user_id IS
  //    NOT NULL — that is, citizens we can tell apart because they were
  //    logged in. (Postgres COUNT DISTINCT excludes NULLs by default, so we
  //    add the explicit predicate for clarity.)
  //  - anonymousEvents: rows with user_id IS NULL. We deliberately do NOT
  //    estimate "distinct anonymous users" from these because we have no
  //    session identifier, and inflating them with COUNT(*) would mislead.
  const [serviceCountRow] = await db
    .select({ uniqueServices: sql<number>`count(distinct ${serviceViewsTable.serviceId})::int` })
    .from(serviceViewsTable)
    .where(and(
      gte(serviceViewsTable.createdAt, since),
      inArray(serviceViewsTable.serviceId, serviceIds),
    ));
  totals.uniqueServicesEngaged = floor(serviceCountRow?.uniqueServices ?? 0);

  const [authedUsersRow] = await db
    .select({ uniqueUsers: sql<number>`count(distinct ${serviceViewsTable.userId})::int` })
    .from(serviceViewsTable)
    .where(and(
      gte(serviceViewsTable.createdAt, since),
      inArray(serviceViewsTable.serviceId, serviceIds),
      isNotNull(serviceViewsTable.userId),
    ));
  totals.distinctAuthenticatedUsers = floor(authedUsersRow?.uniqueUsers ?? 0);

  const [anonRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceViewsTable)
    .where(and(
      gte(serviceViewsTable.createdAt, since),
      inArray(serviceViewsTable.serviceId, serviceIds),
      isNull(serviceViewsTable.userId),
    ));
  totals.anonymousEvents = floor(anonRow?.count ?? 0);

  // ── Urgent engagements (any action on a service flagged isUrgent).
  if (urgentServiceIds.size > 0) {
    const [urgentRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(serviceViewsTable)
      .where(and(
        gte(serviceViewsTable.createdAt, since),
        inArray(serviceViewsTable.serviceId, Array.from(urgentServiceIds)),
      ));
    totals.urgentEngagements = floor(urgentRow?.count ?? 0);
  }

  // ── Top services in the region (by total interactions).
  const topServiceRows = await db
    .select({
      serviceId: serviceViewsTable.serviceId,
      count: sql<number>`count(*)::int`,
    })
    .from(serviceViewsTable)
    .where(and(
      gte(serviceViewsTable.createdAt, since),
      inArray(serviceViewsTable.serviceId, serviceIds),
    ))
    .groupBy(serviceViewsTable.serviceId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const topServices = topServiceRows
    .filter((r) => r.count >= MIN_AGGREGATE)
    .map((r) => {
      const meta = serviceMeta.get(r.serviceId);
      return {
        id: r.serviceId,
        name: meta?.name ?? "—",
        category: meta?.category ?? "—",
        isUrgent: meta?.isUrgent ?? false,
        interactions: r.count,
      };
    });

  // ── Top categories (sum of interactions across all services in that
  // category for this region).
  const categoryAgg = new Map<string, number>();
  // We need a join — easier to do a second query.
  const catRows = await db
    .select({
      category: servicesTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(serviceViewsTable)
    .innerJoin(servicesTable, eq(servicesTable.id, serviceViewsTable.serviceId))
    .where(and(
      gte(serviceViewsTable.createdAt, since),
      inArray(serviceViewsTable.serviceId, serviceIds),
    ))
    .groupBy(servicesTable.category)
    .orderBy(desc(sql`count(*)`));

  for (const r of catRows) categoryAgg.set(r.category, r.count);

  const topCategories = Array.from(categoryAgg.entries())
    .filter(([, count]) => count >= MIN_AGGREGATE)
    .slice(0, 10)
    .map(([category, count]) => ({ category, interactions: count }));

  // ── Daily activity (sum of all interactions per day).
  const dailyRows = await db
    .select({
      date: sql<string>`date_trunc('day', ${serviceViewsTable.createdAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(serviceViewsTable)
    .where(and(
      gte(serviceViewsTable.createdAt, since),
      inArray(serviceViewsTable.serviceId, serviceIds),
    ))
    .groupBy(sql`date_trunc('day', ${serviceViewsTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${serviceViewsTable.createdAt})`);

  // Suppress days that fall under the privacy floor (clamp to 0). We keep
  // the date row so the line chart still shows a continuous timeline.
  const dailyActivity = dailyRows.map((r) => ({
    date: r.date,
    interactions: floor(r.count),
  }));

  // ── User adoption stats. Comptes are stored at the province level, not
  // tied to a city, so these numbers are GLOBAL — same value regardless of
  // the selected region. They tell municipalities how the platform itself
  // is growing in Quebec, complementing the regional engagement metrics.
  const [userAggRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      newInPeriod: sql<number>`count(*) filter (where ${usersTable.createdAt} >= ${since})::int`,
      premium: sql<number>`count(*) filter (where ${usersTable.isPremium} = true)::int`,
      citizens: sql<number>`count(*) filter (where ${usersTable.role} = 'user')::int`,
      organisations: sql<number>`count(*) filter (where ${usersTable.role} = 'organisme')::int`,
    })
    .from(usersTable);

  const userTotal = userAggRow?.total ?? 0;
  const userPremium = userAggRow?.premium ?? 0;

  const userStats = {
    total: userTotal,
    newInPeriod: floor(userAggRow?.newInPeriod ?? 0),
    premium: userPremium,
    premiumConversionPct: userTotal > 0
      ? Math.round((userPremium / userTotal) * 1000) / 10
      : 0,
    citizens: userAggRow?.citizens ?? 0,
    organisations: userAggRow?.organisations ?? 0,
  };

  // Daily new signups across the period — useful to spot acquisition spikes
  // (e.g. after a media mention or campaign).
  const signupRows = await db
    .select({
      date: sql<string>`date_trunc('day', ${usersTable.createdAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(usersTable)
    .where(gte(usersTable.createdAt, since))
    .groupBy(sql`date_trunc('day', ${usersTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${usersTable.createdAt})`);

  const dailySignups = signupRows.map((r) => ({
    date: r.date,
    signups: floor(r.count),
  }));

  // ── Wait-time signals from "Combien d'attente ?" reports.
  // Two layers:
  //   1. Adoption — total reports submitted in the selected period for any
  //      service in this region.
  //   2. Live pulse — for each service in the region, the median wait over
  //      the rolling 2h window. We surface the 5 services with the LONGEST
  //      live medians (i.e. the most pressured access points right now).
  const [periodWaitRow] = await db
    .select({
      reports: sql<number>`count(*)::int`,
      services: sql<number>`count(distinct ${waitTimeReportsTable.serviceId})::int`,
    })
    .from(waitTimeReportsTable)
    .where(and(
      gte(waitTimeReportsTable.createdAt, since),
      inArray(waitTimeReportsTable.serviceId, serviceIds),
    ));

  const liveSince = new Date(Date.now() - LIVE_WAIT_WINDOW_MINUTES * 60 * 1000);
  const liveRows = await db
    .select({
      serviceId: waitTimeReportsTable.serviceId,
      median: sql<number>`percentile_cont(0.5) within group (order by ${waitTimeReportsTable.minutes})::int`,
      sampleCount: sql<number>`count(*)::int`,
    })
    .from(waitTimeReportsTable)
    .where(and(
      gte(waitTimeReportsTable.createdAt, liveSince),
      inArray(waitTimeReportsTable.serviceId, serviceIds),
    ))
    .groupBy(waitTimeReportsTable.serviceId)
    .having(sql`count(*) >= ${MIN_AGGREGATE}`)
    .orderBy(desc(sql`percentile_cont(0.5) within group (order by ${waitTimeReportsTable.minutes})`))
    .limit(5);

  const waitStats = {
    reportsInPeriod: floor(periodWaitRow?.reports ?? 0),
    servicesReportedInPeriod: floor(periodWaitRow?.services ?? 0),
    liveWindowMinutes: LIVE_WAIT_WINDOW_MINUTES,
    liveTopServices: liveRows.map((r) => {
      const meta = serviceMeta.get(r.serviceId);
      return {
        id: r.serviceId,
        name: meta?.name ?? "—",
        category: meta?.category ?? "—",
        isUrgent: meta?.isUrgent ?? false,
        medianMinutes: r.median,
        sampleCount: r.sampleCount,
      };
    }),
  };

  // ── Coverage gap analysis: any category with substantial engagement but
  // few referenced services in the region. Threshold = ≥ 20 engagements with
  // ≤ 3 services available, OR engagement-to-service ratio ≥ 30:1.
  const coverageGaps = Array.from(categoryAgg.entries())
    .map(([category, engagements]) => {
      const servicesAvailable = servicesByCategory.get(category) ?? 0;
      const ratio = servicesAvailable > 0 ? engagements / servicesAvailable : engagements;
      return { category, engagements, servicesAvailable, ratio };
    })
    .filter((g) =>
      (g.engagements >= 20 && g.servicesAvailable <= 3) ||
      g.ratio >= 30
    )
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5);

  res.json({
    region: city || "Tout le Québec",
    days,
    since: since.toISOString(),
    generatedAt: new Date().toISOString(),
    privacyFloor: MIN_AGGREGATE,
    totals,
    userStats,
    dailySignups,
    waitStats,
    topCategories,
    topServices,
    dailyActivity,
    coverageGaps,
    categoriesInRegion: Array.from(servicesByCategory.entries()).map(([category, services]) => ({
      category,
      services,
    })),
  });
});

export default router;
