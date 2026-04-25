import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, searchEventsTable } from "@workspace/db";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Statistiques de recherche anonymes.
//
// POST /api/search-events     → enregistre une recherche (anonyme).
// GET  /api/admin/search-stats → admin : agrégats par province pour 7/30 jours.
//
// Aucune donnée personnelle n'est stockée : ni IP, ni texte de recherche.
// ─────────────────────────────────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response): boolean {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    res.status(503).json({ error: "admin disabled" });
    return false;
  }
  const provided =
    (req.headers["x-admin-key"] as string | undefined) ??
    (req.headers["authorization"]?.toString().replace(/^Bearer\s+/i, "") ?? "");
  if (!provided || provided !== expected) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

const TrackBody = z.object({
  province: z.string().trim().max(8).optional(),
  category: z.string().trim().max(32).optional(),
  queryLen: z.number().int().min(0).max(500).optional(),
});

const router = Router();

router.post("/search-events", async (req, res) => {
  const parsed = TrackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid payload" });
    return;
  }
  try {
    await db.insert(searchEventsTable).values({
      province: (parsed.data.province ?? "ALL").toUpperCase().slice(0, 8),
      category: (parsed.data.category ?? "all").toLowerCase().slice(0, 32),
      queryLen: parsed.data.queryLen ?? 0,
    });
    res.status(204).end();
  } catch (err) {
    // Best-effort: never block the user if analytics fail.
    res.status(204).end();
  }
});

router.get("/admin/search-stats", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const daysParam = parseInt(String(req.query.days ?? "7"), 10);
  const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 365 ? daysParam : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const byProvince = await db
      .select({
        province: searchEventsTable.province,
        count: sql<number>`count(*)::int`,
      })
      .from(searchEventsTable)
      .where(gte(searchEventsTable.createdAt, since))
      .groupBy(searchEventsTable.province)
      .orderBy(desc(sql`count(*)`));

    const byCategory = await db
      .select({
        category: searchEventsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(searchEventsTable)
      .where(gte(searchEventsTable.createdAt, since))
      .groupBy(searchEventsTable.category)
      .orderBy(desc(sql`count(*)`));

    const totalRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(searchEventsTable)
      .where(gte(searchEventsTable.createdAt, since));

    res.json({
      days,
      total: totalRow[0]?.count ?? 0,
      byProvince,
      byCategory,
    });
  } catch (err) {
    res.status(500).json({ error: "stats failed" });
  }
});

export default router;
