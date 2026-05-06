import { Router, type Request } from "express";
import { createHash } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, servicesTable, serviceRatingsTable } from "@workspace/db";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — "Cette fiche vous a-t-elle été utile ?" community signal.
// Two-button vote (useful / not_useful) shown on every service detail page.
// Aggregates published only when total >= MIN_VOTES_TO_PUBLISH (5) so a
// single vote never determines a fiche's reputation.
//
// Anti-spam: ONE vote per (serviceId, ipHash) for life, enforced by the
// UQ_service_ratings_service_ip unique index + ON CONFLICT DO NOTHING in the
// insert. This is concurrency-safe — two simultaneous POSTs can never produce
// two rows for the same caller, even under load.
// ─────────────────────────────────────────────────────────────────────────────

const MIN_VOTES_TO_PUBLISH = 5;

const VoteBody = z.object({
  value: z.enum(["useful", "not_useful"]),
});

function hashIp(ip: string): string {
  const salt = process.env.WAIT_REPORT_SALT ?? "attentezero-default-salt";
  return createHash("sha256").update(`${ip}|rating|${salt}`).digest("hex");
}

function getClientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

async function fetchStats(serviceId: string) {
  const rows = await db
    .select({ value: serviceRatingsTable.value })
    .from(serviceRatingsTable)
    .where(eq(serviceRatingsTable.serviceId, serviceId));
  const useful = rows.filter((r) => r.value === "useful").length;
  const notUseful = rows.filter((r) => r.value === "not_useful").length;
  const total = useful + notUseful;
  return {
    total,
    useful,
    notUseful,
    percentUseful: total >= MIN_VOTES_TO_PUBLISH ? Math.round((useful / total) * 100) : null,
    minToPublish: MIN_VOTES_TO_PUBLISH,
  };
}

const router = Router();

router.get("/services/:id/rating-stats", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Service ID requis." });
    return;
  }
  const stats = await fetchStats(id);
  res.json({ serviceId: id, ...stats });
});

router.post("/services/:id/rate", async (req, res) => {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: "Service ID requis." });
    return;
  }
  const parsed = VoteBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Vote invalide." });
    return;
  }

  const [svc] = await db
    .select({ id: servicesTable.id })
    .from(servicesTable)
    .where(eq(servicesTable.id, id))
    .limit(1);
  if (!svc) {
    res.status(404).json({ error: "Service introuvable." });
    return;
  }

  const ipHash = hashIp(getClientIp(req));
  const userId = req.user?.id ?? null;

  // Atomic insert: the UNIQUE(service_id, ip_hash) index combined with
  // ON CONFLICT DO NOTHING means two parallel requests from the same caller
  // can never insert twice. The first wins, the second is a no-op.
  try {
    await db
      .insert(serviceRatingsTable)
      .values({ serviceId: id, value: parsed.data.value, userId, ipHash })
      .onConflictDoNothing({
        target: [serviceRatingsTable.serviceId, serviceRatingsTable.ipHash],
      });
  } catch (err) {
    req.log.error({ err }, "Service rating insert error");
    res.status(500).json({ error: "Erreur serveur." });
    return;
  }

  const stats = await fetchStats(id);
  res.json({ success: true, ...stats });
});

export default router;
