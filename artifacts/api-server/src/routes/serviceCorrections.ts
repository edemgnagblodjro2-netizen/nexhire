import { Router, type Request } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, servicesTable, serviceCorrectionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro v1.1.9 — Corrections géolocalisation proposées par les usagers.
//
// Routes :
//   POST  /api/services/:id/corrections           public, rate-limited
//   GET   /api/admin/service-corrections          admin (file d'attente)
//   POST  /api/admin/service-corrections/:id/approve  admin (applique au service)
//   POST  /api/admin/service-corrections/:id/reject   admin (refuse)
//
// Auto-approbation : quand 3 corrections concordantes (même proposed_address
// OU coords <50m d'écart) sont reçues pour un service, on les applique
// automatiquement → la précision augmente avec l'usage.
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MIN = 30;
const MAX_PER_WINDOW_PER_IP = 10;
const AUTO_APPROVE_THRESHOLD = 3;
const AUTO_APPROVE_RADIUS_M = 50;

const SubmitBody = z.object({
  proposedAddress: z.string().trim().max(300).optional(),
  proposedCity: z.string().trim().max(120).optional(),
  proposedLat: z.number().min(-90).max(90).optional(),
  proposedLng: z.number().min(-180).max(180).optional(),
  note: z.string().trim().max(500).optional(),
  appVersion: z.string().trim().max(40).optional(),
}).refine(
  (d) => !!(d.proposedAddress || d.proposedCity || (d.proposedLat != null && d.proposedLng != null) || d.note),
  { message: "Au moins une correction (adresse, ville, coords ou note) est requise." },
);

function hashIp(ip: string): string {
  const salt = process.env.WAIT_REPORT_SALT ?? "attentezero-default-salt";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex");
}

function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function requireAdminKey(req: any, res: any, next: any) {
  const expected = process.env.ADMIN_API_KEY;
  const got = req.header("x-admin-key");
  if (!expected || got !== expected) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Distance haversine en mètres (approx) — sert à détecter les corrections concordantes
function distMeters(la1: number, ln1: number, la2: number, ln2: number): number {
  const R = 6371000;
  const dLat = ((la2 - la1) * Math.PI) / 180;
  const dLng = ((ln2 - ln1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) *
      Math.cos((la2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const router = Router();

// ── POST /api/services/:id/corrections — submission publique ────────────────
router.post("/services/:id/corrections", async (req, res): Promise<void> => {
  const serviceId = req.params.id;
  if (!serviceId || serviceId.length > 100) {
    res.status(400).json({ error: "Identifiant de service invalide." });
    return;
  }

  const parsed = SubmitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Données invalides." });
    return;
  }

  // Le service doit exister et être actif
  const [svc] = await db
    .select({ id: servicesTable.id, type: servicesTable.serviceType })
    .from(servicesTable)
    .where(and(eq(servicesTable.id, serviceId), eq(servicesTable.active, true)))
    .limit(1);
  if (!svc) { res.status(404).json({ error: "Service introuvable." }); return; }
  if (svc.type === "phone") {
    res.status(400).json({ error: "Les lignes téléphoniques n'ont pas d'adresse à corriger." });
    return;
  }

  const ipHash = hashIp(getClientIp(req));
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000);

  const recentCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(serviceCorrectionsTable)
    .where(
      and(
        eq(serviceCorrectionsTable.ipHash, ipHash),
        gte(serviceCorrectionsTable.createdAt, since),
      ),
    );
  if ((recentCount[0]?.n ?? 0) >= MAX_PER_WINDOW_PER_IP) {
    res.status(429).json({
      error: `Trop de corrections envoyées récemment. Réessayez dans ${RATE_LIMIT_WINDOW_MIN} min.`,
    });
    return;
  }

  const { proposedAddress, proposedCity, proposedLat, proposedLng, note, appVersion } = parsed.data;

  const [created] = await db
    .insert(serviceCorrectionsTable)
    .values({
      serviceId,
      proposedAddress: proposedAddress ?? null,
      proposedCity: proposedCity ?? null,
      proposedLat: proposedLat ?? null,
      proposedLng: proposedLng ?? null,
      note: note ?? null,
      ipHash,
      appVersion: appVersion ?? null,
    })
    .returning({ id: serviceCorrectionsTable.id, createdAt: serviceCorrectionsTable.createdAt });

  // Auto-approbation : 3 corrections concordantes (mêmes coords <50 m, OU même adresse normalisée).
  // Sérialisé par service via SELECT ... FOR UPDATE (lock de la ligne service) pour éviter les
  // races quand plusieurs corrections arrivent en même temps.
  let autoApproved = false;
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM services WHERE id = ${serviceId} FOR UPDATE`);
      const pending = await tx
        .select()
        .from(serviceCorrectionsTable)
        .where(and(
          eq(serviceCorrectionsTable.serviceId, serviceId),
          eq(serviceCorrectionsTable.status, "pending"),
        ));

    // Regrouper par "signature" : coord-cluster ou texte d'adresse normalisé
    const buckets: Array<{ rows: typeof pending; lat?: number; lng?: number; addr?: string }> = [];
    function normAddr(s: string | null): string {
      return (s ?? "").toLowerCase().replace(/[\s,.-]+/g, " ").trim();
    }
    for (const c of pending) {
      let placed = false;
      for (const b of buckets) {
        if (
          c.proposedLat != null && c.proposedLng != null &&
          b.lat != null && b.lng != null &&
          distMeters(c.proposedLat, c.proposedLng, b.lat, b.lng) < AUTO_APPROVE_RADIUS_M
        ) {
          b.rows.push(c);
          placed = true;
          break;
        }
        if (c.proposedAddress && b.addr && normAddr(c.proposedAddress) === b.addr) {
          b.rows.push(c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        buckets.push({
          rows: [c],
          lat: c.proposedLat ?? undefined,
          lng: c.proposedLng ?? undefined,
          addr: c.proposedAddress ? normAddr(c.proposedAddress) : undefined,
        });
      }
    }

      const winner = buckets.find((b) => b.rows.length >= AUTO_APPROVE_THRESHOLD);
      if (winner) {
        const ref = winner.rows[0]!;
        const update: Record<string, unknown> = {
          verifiedAt: null,
          verifiedBy: null,
          verificationNote: `Auto-approuvé par ${winner.rows.length} corrections concordantes`,
          geocodeSource: "user-correction",
          geocodePrecisionM: 50,
        };
        if (ref.proposedLat != null && ref.proposedLng != null) {
          update.lat = ref.proposedLat;
          update.lng = ref.proposedLng;
        }
        if (ref.proposedAddress) update.address = ref.proposedAddress;
        if (ref.proposedCity) update.city = ref.proposedCity;
        await tx.update(servicesTable).set(update).where(eq(servicesTable.id, serviceId));
        const ids = winner.rows.map((r) => r.id);
        // Garde de statut : ne marque que les lignes encore 'pending' (idempotence concurrente)
        const marked = await tx
          .update(serviceCorrectionsTable)
          .set({ status: "auto_approved", reviewedAt: new Date(), reviewedBy: "system" })
          .where(and(
            inArray(serviceCorrectionsTable.id, ids),
            eq(serviceCorrectionsTable.status, "pending"),
          ))
          .returning({ id: serviceCorrectionsTable.id });
        autoApproved = marked.length > 0;
      }
    });
  } catch (err) {
    logger.warn({ err, serviceId }, "auto-approve correction failed (will require manual review)");
  }

  res.status(201).json({
    id: created?.id,
    createdAt: created?.createdAt,
    autoApproved,
    message: autoApproved
      ? "Merci ! D'autres usagers ont confirmé la même correction — elle est appliquée immédiatement."
      : "Merci ! Votre correction sera examinée prochainement.",
  });
});

// ── GET /api/admin/service-corrections — file d'attente ─────────────────────
router.get("/admin/service-corrections", requireAdminKey, async (req, res) => {
  const status = String(req.query.status ?? "pending");
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 100)));

  const rows = await db
    .select({
      correction: serviceCorrectionsTable,
      service: {
        id: servicesTable.id,
        name: servicesTable.name,
        city: servicesTable.city,
        address: servicesTable.address,
        lat: servicesTable.lat,
        lng: servicesTable.lng,
        geocodePrecisionM: servicesTable.geocodePrecisionM,
        verifiedAt: servicesTable.verifiedAt,
      },
    })
    .from(serviceCorrectionsTable)
    .leftJoin(servicesTable, eq(servicesTable.id, serviceCorrectionsTable.serviceId))
    .where(eq(serviceCorrectionsTable.status, status))
    .orderBy(desc(serviceCorrectionsTable.createdAt))
    .limit(limit);

  res.json({ corrections: rows });
});

// ── POST /api/admin/service-corrections/:id/approve — applique la correction ─
router.post("/admin/service-corrections/:id/approve", requireAdminKey, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }

  const [c] = await db
    .select()
    .from(serviceCorrectionsTable)
    .where(eq(serviceCorrectionsTable.id, id))
    .limit(1);
  if (!c) { res.status(404).json({ error: "Correction introuvable." }); return; }
  if (c.status !== "pending") { res.status(400).json({ error: "Correction déjà traitée." }); return; }

  const update: Record<string, unknown> = {
    geocodeSource: "user-correction",
    geocodePrecisionM: 50,
    verifiedAt: new Date(),
    verifiedBy: "admin (correction validée)",
    verificationNote: c.note ? `Correction usager : ${c.note}` : "Correction usager validée",
  };
  if (c.proposedLat != null && c.proposedLng != null) {
    update.lat = c.proposedLat;
    update.lng = c.proposedLng;
  }
  if (c.proposedAddress) update.address = c.proposedAddress;
  if (c.proposedCity) update.city = c.proposedCity;

  await db.update(servicesTable).set(update).where(eq(servicesTable.id, c.serviceId));
  await db
    .update(serviceCorrectionsTable)
    .set({ status: "approved", reviewedAt: new Date(), reviewedBy: "admin" })
    .where(eq(serviceCorrectionsTable.id, id));

  res.json({ success: true, id });
});

// ── POST /api/admin/service-corrections/:id/reject — refuse ─────────────────
router.post("/admin/service-corrections/:id/reject", requireAdminKey, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }

  const [updated] = await db
    .update(serviceCorrectionsTable)
    .set({ status: "rejected", reviewedAt: new Date(), reviewedBy: "admin" })
    .where(and(eq(serviceCorrectionsTable.id, id), eq(serviceCorrectionsTable.status, "pending")))
    .returning({ id: serviceCorrectionsTable.id });

  if (!updated) { res.status(404).json({ error: "Correction introuvable ou déjà traitée." }); return; }
  res.json({ success: true, id });
});

export default router;
