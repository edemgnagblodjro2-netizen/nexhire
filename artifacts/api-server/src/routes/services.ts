import { Router } from "express";
import { db, servicesTable } from "@workspace/db";
import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const servicesRouter = Router();

// ── Admin auth middleware ───────────────────────────────────────────────────
function requireAdminKey(req: any, res: any, next: any) {
  const adminKey = process.env.ADMIN_API_KEY;
  const provided =
    req.headers["x-admin-key"] || req.query.adminKey;
  if (!adminKey || provided !== adminKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── GET /api/services  (public — for mobile app) ───────────────────────────
servicesRouter.get("/services", async (req, res) => {
  try {
    const services = await db
      .select()
      .from(servicesTable)
      .where(eq(servicesTable.active, true))
      .orderBy(asc(servicesTable.name));
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

    res.status(201).json(created);
  } catch (err: any) {
    logger.error({ err }, "POST /api/admin/services error");
    if (err.code === "23505") {
      return res.status(409).json({ error: "Service ID already exists" });
    }
    res.status(500).json({ error: "Internal error" });
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
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /api/admin/services/:id error");
    res.status(500).json({ error: "Internal error" });
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
