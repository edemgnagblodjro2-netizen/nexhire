import { Router } from "express";
import { db, servicesTable, organisationsTable, subscriptionsTable, verificationRequestsTable } from "@workspace/db";
import { and, asc, count, desc, eq, ilike, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const servicesRouter = Router();

// ── Admin auth middleware ───────────────────────────────────────────────────
function requireAdminKey(req: any, res: any, next: any) {
  const adminKey = process.env.ADMIN_API_KEY;
  // Header only — never accept admin key in query string (would leak to logs/proxies/Referer).
  const provided = req.headers["x-admin-key"];
  if (!adminKey || provided !== adminKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── GET /api/services  (public — for mobile app) ───────────────────────────
// Joins organisation + active subscription to expose `badgeVerified`, `featured`
// (Plus plan with active/trialing status) and `organisationId`.
// Sorts featured services first, then alphabetical.
servicesRouter.get("/services", async (_req, res) => {
  try {
    const featured = sql<boolean>`(${subscriptionsTable.plan} = 'plus' AND ${subscriptionsTable.status} IN ('active','trialing'))`;
    const badgeValid = sql<boolean>`(
      ${organisationsTable.badgeVerified} = true
      AND EXISTS (
        SELECT 1 FROM ${verificationRequestsTable}
        WHERE ${verificationRequestsTable.organisationId} = ${organisationsTable.id}
          AND ${verificationRequestsTable.status} IN ('approved', 'auto_approved')
          AND ${verificationRequestsTable.expiresAt} > now()
      )
    )`;
    const rows = await db
      .select({
        service: servicesTable,
        organisationId: organisationsTable.id,
        badgeVerified: badgeValid,
        featured,
      })
      .from(servicesTable)
      .leftJoin(organisationsTable, eq(organisationsTable.serviceId, servicesTable.id))
      .leftJoin(subscriptionsTable, and(
        eq(subscriptionsTable.organisationId, organisationsTable.id),
        inArray(subscriptionsTable.status, ["active", "trialing"]),
      ))
      .where(eq(servicesTable.active, true))
      .orderBy(desc(featured), asc(servicesTable.name));

    const services = rows.map((r) => ({
      ...r.service,
      organisationId: r.organisationId,
      badgeVerified: r.badgeVerified ?? false,
      featured: !!r.featured,
    }));
    res.json(services);
  } catch (err) {
    logger.error({ err }, "GET /api/services error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── GET /api/admin/services  (paginated, filtered) ─────────────────────────
servicesRouter.get("/admin/services", requireAdminKey, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const city = req.query.city as string | undefined;
    const category = req.query.category as string | undefined;
    const activeFilter = req.query.active as string | undefined;
    const quality = req.query.quality as string | undefined;

    const conditions: any[] = [];

    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(servicesTable.name, q),
          ilike(servicesTable.description, q),
          ilike(servicesTable.subcategory, q),
        )
      );
    }
    if (city) conditions.push(eq(servicesTable.city, city));
    if (category) conditions.push(eq(servicesTable.category, category));
    if (activeFilter === "true") conditions.push(eq(servicesTable.active, true));
    if (activeFilter === "false") conditions.push(eq(servicesTable.active, false));

    // Data quality filters
    if (quality === "missing-address") {
      conditions.push(or(isNull(servicesTable.address), eq(servicesTable.address, "")));
    } else if (quality === "missing-gps") {
      conditions.push(or(isNull(servicesTable.lat), isNull(servicesTable.lng)));
    } else if (quality === "missing-phone") {
      conditions.push(eq(servicesTable.phone, ""));
    } else if (quality === "suspect-phone") {
      conditions.push(
        or(
          ilike(servicesTable.phone, "%-5555%"),
          ilike(servicesTable.phone, "%-5558%"),
          ilike(servicesTable.phone, "%-0555%"),
          ilike(servicesTable.phone, "%555-555%"),
        ),
      );
    } else if (quality === "unverified") {
      conditions.push(isNull(servicesTable.verifiedAt));
    } else if (quality === "verified") {
      conditions.push(isNotNull(servicesTable.verifiedAt));
    } else if (quality === "stale") {
      // Verified more than 6 months ago
      conditions.push(
        and(
          isNotNull(servicesTable.verifiedAt),
          sql`${servicesTable.verifiedAt} < now() - interval '6 months'`,
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(servicesTable)
        .where(where)
        .orderBy(asc(servicesTable.city), asc(servicesTable.name))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(servicesTable)
        .where(where),
    ]);

    res.json({
      data: rows,
      page,
      limit,
      total: Number(total),
      pages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/services error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── GET /api/admin/services/meta  (cities + categories list) ───────────────
servicesRouter.get("/admin/services/meta", requireAdminKey, async (req, res) => {
  try {
    const [cities, categories, stats] = await Promise.all([
      db
        .selectDistinct({ city: servicesTable.city })
        .from(servicesTable)
        .orderBy(asc(servicesTable.city)),
      db
        .selectDistinct({ category: servicesTable.category })
        .from(servicesTable)
        .orderBy(asc(servicesTable.category)),
      db
        .select({
          total: count(),
          active: sql<number>`sum(case when ${servicesTable.active} then 1 else 0 end)`,
          urgent: sql<number>`sum(case when ${servicesTable.isUrgent} then 1 else 0 end)`,
          provinceWide: sql<number>`sum(case when ${servicesTable.isProvinceWide} then 1 else 0 end)`,
          missingAddress: sql<number>`sum(case when (${servicesTable.address} is null or ${servicesTable.address} = '') and ${servicesTable.active} then 1 else 0 end)`,
          missingGps: sql<number>`sum(case when (${servicesTable.lat} is null or ${servicesTable.lng} is null) and ${servicesTable.active} then 1 else 0 end)`,
          missingPhone: sql<number>`sum(case when ${servicesTable.phone} = '' and ${servicesTable.active} then 1 else 0 end)`,
          suspectPhone: sql<number>`sum(case when (${servicesTable.phone} ilike '%-5555%' or ${servicesTable.phone} ilike '%-5558%' or ${servicesTable.phone} ilike '%-0555%' or ${servicesTable.phone} ilike '%555-555%') and ${servicesTable.active} then 1 else 0 end)`,
          verified: sql<number>`sum(case when ${servicesTable.verifiedAt} is not null and ${servicesTable.active} then 1 else 0 end)`,
          unverified: sql<number>`sum(case when ${servicesTable.verifiedAt} is null and ${servicesTable.active} then 1 else 0 end)`,
          stale: sql<number>`sum(case when ${servicesTable.verifiedAt} is not null and ${servicesTable.verifiedAt} < now() - interval '6 months' and ${servicesTable.active} then 1 else 0 end)`,
        })
        .from(servicesTable),
    ]);

    res.json({
      cities: cities.map((r) => r.city).filter(Boolean),
      categories: categories.map((r) => r.category).filter(Boolean),
      stats: stats[0],
    });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/services/meta error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── POST /api/admin/services  (create) ─────────────────────────────────────
servicesRouter.post("/admin/services", requireAdminKey, async (req, res) => {
  try {
    const body = req.body;
    if (!body.id || !body.name || !body.category) {
      return res.status(400).json({ error: "id, name, category are required" });
    }

    const [created] = await db
      .insert(servicesTable)
      .values({
        id: body.id,
        name: body.name,
        category: body.category,
        subcategory: body.subcategory ?? "",
        city: body.city ?? "",
        phone: body.phone ?? "",
        website: body.website ?? "",
        description: body.description ?? "",
        address: body.address ?? null,
        hours: body.hours ?? null,
        isUrgent: body.isUrgent ?? false,
        isProvinceWide: body.isProvinceWide ?? false,
        lat: body.lat != null ? Number(body.lat) : null,
        lng: body.lng != null ? Number(body.lng) : null,
        active: body.active ?? true,
      })
      .returning();

    return res.status(201).json(created);
  } catch (err: any) {
    logger.error({ err }, "POST /api/admin/services error");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Service ID already exists" });
    }
    return res.status(500).json({ error: "Internal error" });
  }
});

// ── PUT /api/admin/services/:id  (update) ──────────────────────────────────
servicesRouter.put("/admin/services/:id", requireAdminKey, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const update: Partial<typeof servicesTable.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.category !== undefined) update.category = body.category;
    if (body.subcategory !== undefined) update.subcategory = body.subcategory;
    if (body.city !== undefined) update.city = body.city;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.website !== undefined) update.website = body.website;
    if (body.description !== undefined) update.description = body.description;
    if (body.address !== undefined) update.address = body.address;
    if (body.hours !== undefined) update.hours = body.hours;
    if (body.isUrgent !== undefined) update.isUrgent = body.isUrgent;
    if (body.isProvinceWide !== undefined) update.isProvinceWide = body.isProvinceWide;
    if (body.lat !== undefined) update.lat = body.lat != null ? Number(body.lat) : null;
    if (body.lng !== undefined) update.lng = body.lng != null ? Number(body.lng) : null;
    if (body.active !== undefined) update.active = body.active;

    const [updated] = await db
      .update(servicesTable)
      .set(update)
      .where(eq(servicesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Service not found" });
    return res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /api/admin/services/:id error");
    return res.status(500).json({ error: "Internal error" });
  }
});

// ── POST /api/admin/services/:id/verify  (mark as verified / un-verify) ───
servicesRouter.post("/admin/services/:id/verify", requireAdminKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, verifiedBy, note } = req.body ?? {};

    const update: Partial<typeof servicesTable.$inferInsert> = verified === false
      ? { verifiedAt: null, verifiedBy: null, verificationNote: null }
      : {
          verifiedAt: new Date(),
          verifiedBy: verifiedBy || "admin",
          verificationNote: note || null,
        };

    const [updated] = await db
      .update(servicesTable)
      .set(update)
      .where(eq(servicesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Service not found" });
    return res.json(updated);
  } catch (err) {
    logger.error({ err }, "POST /api/admin/services/:id/verify error");
    return res.status(500).json({ error: "Internal error" });
  }
});

// ── DELETE /api/admin/services/:id  (soft delete) ──────────────────────────
servicesRouter.delete("/admin/services/:id", requireAdminKey, async (req, res) => {
  try {
    const { id } = req.params;
    const hard = req.query.hard === "true";

    if (hard) {
      await db.delete(servicesTable).where(eq(servicesTable.id, id));
    } else {
      await db
        .update(servicesTable)
        .set({ active: false })
        .where(eq(servicesTable.id, id));
    }

    res.json({ success: true, id });
  } catch (err) {
    logger.error({ err }, "DELETE /api/admin/services/:id error");
    res.status(500).json({ error: "Internal error" });
  }
});

export default servicesRouter;
