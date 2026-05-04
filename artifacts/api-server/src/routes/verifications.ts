import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import {
  db,
  organisationsTable,
  subscriptionsTable,
  verificationRequestsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, or, inArray } from "drizzle-orm";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_KEY = process.env.ADMIN_API_KEY;
const ADMIN_KEY_BUF = ADMIN_KEY ? Buffer.from(ADMIN_KEY) : null;
const PAID_PLANS = ["standard", "plus", "terrain", "institution"];
// Only "active" — trialing is NOT paid yet, so badge stays out of reach.
const ACTIVE_STATUSES = ["active"];
const BADGE_VALIDITY_MONTHS = 12;

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Non authentifié." });
    return false;
  }
  return true;
}

function checkAdminKey(req: Request, res: Response): boolean {
  // Header only — query-string keys leak via logs/referrers.
  // Constant-time comparison to avoid leaking byte-by-byte timing info.
  const provided = req.headers["x-admin-key"];
  if (!ADMIN_KEY_BUF || typeof provided !== "string") {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const providedBuf = Buffer.from(provided);
  if (providedBuf.length !== ADMIN_KEY_BUF.length) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  if (!crypto.timingSafeEqual(providedBuf, ADMIN_KEY_BUF)) {
    res.status(401).json({ error: "Unauthorized" });
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

async function getActivePaidSubscription(orgId: string) {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.organisationId, orgId))
    .limit(1);
  if (!sub) return null;
  if (!PAID_PLANS.includes(sub.plan)) return null;
  if (!ACTIVE_STATUSES.includes(sub.status)) return null;
  return sub;
}

// ── NEQ format check (Quebec REQ — 10 digits) ────────────────────────────
function isValidNeq(neq: string): boolean {
  return /^\d{10}$/.test(neq.trim());
}

// ── ARC charity number format (e.g. "123456789RR0001") ───────────────────
function isValidArcCharity(arc: string | null | undefined): boolean {
  if (!arc) return true; // optional
  return /^\d{9}[A-Z]{2}\d{4}$/.test(arc.trim().toUpperCase());
}

type AutoCheck = {
  passed: boolean;
  reason: string;
  details: Record<string, unknown>;
};

// Auto-validation: format checks + 12-month age check.
// (Live API calls to REQ / ARC can be added here later.)
function runAutoCheck(input: {
  neq: string;
  arcCharityNumber?: string | null;
  foundedYear: string;
}): AutoCheck {
  const details: Record<string, unknown> = {};

  if (!isValidNeq(input.neq)) {
    return {
      passed: false,
      reason: "NEQ invalide (doit être 10 chiffres).",
      details: { neqFormatOk: false },
    };
  }
  details.neqFormatOk = true;

  if (input.arcCharityNumber && !isValidArcCharity(input.arcCharityNumber)) {
    return {
      passed: false,
      reason:
        "Numéro ARC invalide (format attendu : 9 chiffres + 2 lettres + 4 chiffres, ex. 123456789RR0001).",
      details: { arcFormatOk: false },
    };
  }
  details.arcFormatOk = true;

  const year = parseInt(input.foundedYear, 10);
  const currentYear = new Date().getFullYear();
  if (!Number.isFinite(year) || year < 1900 || year > currentYear) {
    return {
      passed: false,
      reason: "Année de fondation invalide.",
      details: { yearOk: false },
    };
  }
  const ageYears = currentYear - year;
  details.ageYears = ageYears;
  if (ageYears < 1) {
    return {
      passed: false,
      reason:
        "L'organisme doit exister depuis au moins 12 mois pour obtenir le badge automatiquement.",
      details,
    };
  }

  return {
    passed: true,
    reason:
      "Vérifications automatiques réussies (format NEQ, format ARC, ancienneté ≥ 12 mois).",
    details,
  };
}

// ── POST /api/org/verification/request — submit verification request ─────
router.post("/org/verification/request", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const org = await getOrgForUser(userId);
  if (!org) {
    res.status(404).json({ error: "Aucun organisme associé." });
    return;
  }

  const sub = await getActivePaidSubscription(org.id);
  if (!sub) {
    res.status(403).json({
      error:
        "Le badge Vérifié est réservé aux forfaits payants actifs. Veuillez d'abord souscrire un abonnement.",
    });
    return;
  }

  const schema = z.object({
    neq: z.string().trim().min(10).max(10),
    arcCharityNumber: z.string().trim().optional().nullable(),
    legalName: z.string().trim().min(2).max(200),
    foundedYear: z.string().trim().regex(/^\d{4}$/),
    contactPhone: z.string().trim().min(7).max(40),
    website: z.union([
      z.literal(""),
      z.string().trim().url().refine(
        (v) => v.startsWith("http://") || v.startsWith("https://"),
        { message: "Le site web doit utiliser http ou https." }
      ),
    ]).optional().nullable(),
    mission: z.string().trim().min(10).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides.", issues: parsed.error.issues });
    return;
  }

  // Block if already verified or pending
  if (org.badgeVerified) {
    res.status(409).json({ error: "Cet organisme est déjà vérifié." });
    return;
  }
  const [existingPending] = await db
    .select()
    .from(verificationRequestsTable)
    .where(
      and(
        eq(verificationRequestsTable.organisationId, org.id),
        eq(verificationRequestsTable.status, "pending"),
      ),
    )
    .limit(1);
  if (existingPending) {
    res
      .status(409)
      .json({ error: "Une demande est déjà en cours de traitement.", request: existingPending });
    return;
  }

  const auto = runAutoCheck({
    neq: parsed.data.neq,
    arcCharityNumber: parsed.data.arcCharityNumber,
    foundedYear: parsed.data.foundedYear,
  });

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + BADGE_VALIDITY_MONTHS);

  // All verification requests are queued for manual admin review.
  // Format checks are informational only — no badge is ever issued automatically.
  const autoApprove = false;

  const [created] = await db
    .insert(verificationRequestsTable)
    .values({
      organisationId: org.id,
      neq: parsed.data.neq,
      arcCharityNumber: parsed.data.arcCharityNumber || null,
      legalName: parsed.data.legalName,
      foundedYear: parsed.data.foundedYear,
      contactPhone: parsed.data.contactPhone,
      website: parsed.data.website || null,
      mission: parsed.data.mission,
      status: autoApprove ? "auto_approved" : "pending",
      autoCheckResult: JSON.stringify(auto),
      reviewedAt: autoApprove ? new Date() : null,
      expiresAt: autoApprove ? expiresAt : null,
    })
    .returning();

  if (autoApprove) {
    await db
      .update(organisationsTable)
      .set({ badgeVerified: true })
      .where(eq(organisationsTable.id, org.id));
    logger.info({ orgId: org.id, requestId: created.id }, "Verification auto-approved");
  } else {
    logger.info(
      { orgId: org.id, requestId: created.id, reason: auto.reason },
      "Verification request queued for manual review",
    );
  }

  res.status(201).json({
    request: created,
    autoApproved: autoApprove,
    autoCheck: auto,
    message: autoApprove
      ? "Badge Vérifié accordé automatiquement ! 🎉"
      : "Demande reçue. Un administrateur la traitera sous 48 h.",
  });
});

// ── GET /api/org/verification/status — current verification status ───────
router.get("/org/verification/status", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const userId = req.user!.id;
  const org = await getOrgForUser(userId);
  if (!org) {
    res.status(404).json({ error: "Aucun organisme associé." });
    return;
  }
  const sub = await getActivePaidSubscription(org.id);

  const [latest] = await db
    .select()
    .from(verificationRequestsTable)
    .where(eq(verificationRequestsTable.organisationId, org.id))
    .orderBy(desc(verificationRequestsTable.createdAt))
    .limit(1);

  // Compute effective verification: badge column AND not expired.
  const expired =
    !!latest?.expiresAt && new Date(latest.expiresAt).getTime() < Date.now();
  const effectiveVerified = !!org.badgeVerified && !expired;

  // Auto-revoke badge if expired (one-shot self-heal).
  if (org.badgeVerified && expired) {
    await db
      .update(organisationsTable)
      .set({ badgeVerified: false })
      .where(eq(organisationsTable.id, org.id));
  }

  res.json({
    isVerified: effectiveVerified,
    eligibleForRequest: !!sub,
    paidPlan: sub?.plan || null,
    latestRequest: latest ?? null,
  });
});

// ── GET /api/admin/verification/requests?status=pending ──────────────────
router.get("/admin/verification/requests", async (req, res) => {
  if (!checkAdminKey(req, res)) return;
  const status = (req.query.status as string) || "pending";
  const rows = await db
    .select({
      request: verificationRequestsTable,
      org: organisationsTable,
    })
    .from(verificationRequestsTable)
    .leftJoin(
      organisationsTable,
      eq(verificationRequestsTable.organisationId, organisationsTable.id),
    )
    .where(eq(verificationRequestsTable.status, status))
    .orderBy(desc(verificationRequestsTable.createdAt))
    .limit(100);
  res.json({ requests: rows });
});

// ── POST /api/admin/verification/:id/approve ─────────────────────────────
router.post("/admin/verification/:id/approve", async (req, res) => {
  if (!checkAdminKey(req, res)) return;
  const { id } = req.params;
  const [request] = await db
    .select()
    .from(verificationRequestsTable)
    .where(eq(verificationRequestsTable.id, id))
    .limit(1);
  if (!request) {
    res.status(404).json({ error: "Demande introuvable." });
    return;
  }
  if (request.status !== "pending") {
    res.status(409).json({ error: `Demande déjà traitée (${request.status}).` });
    return;
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + BADGE_VALIDITY_MONTHS);

  await db.transaction(async (tx) => {
    await tx
      .update(verificationRequestsTable)
      .set({ status: "approved", reviewedAt: new Date(), expiresAt })
      .where(eq(verificationRequestsTable.id, id));
    await tx
      .update(organisationsTable)
      .set({ badgeVerified: true })
      .where(eq(organisationsTable.id, request.organisationId));
  });

  logger.info({ requestId: id, orgId: request.organisationId }, "Verification approved by admin");
  res.json({ success: true });
});

// ── POST /api/admin/verification/:id/reject ──────────────────────────────
router.post("/admin/verification/:id/reject", async (req, res) => {
  if (!checkAdminKey(req, res)) return;
  const { id } = req.params;
  const reason = (req.body?.reason as string) || "Non approuvé.";
  const [request] = await db
    .select()
    .from(verificationRequestsTable)
    .where(eq(verificationRequestsTable.id, id))
    .limit(1);
  if (!request) {
    res.status(404).json({ error: "Demande introuvable." });
    return;
  }
  if (request.status !== "pending") {
    res.status(409).json({ error: `Demande déjà traitée (${request.status}).` });
    return;
  }
  await db
    .update(verificationRequestsTable)
    .set({
      status: "rejected",
      rejectionReason: reason,
      reviewedAt: new Date(),
    })
    .where(eq(verificationRequestsTable.id, id));
  logger.info({ requestId: id, reason }, "Verification rejected by admin");
  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────────────────
// Admin — Organismes & Partenaires (manual badge management).
// Used for manual workflow: after exchanging a few emails with the org/
// partner contact, the admin can flip the verified badge directly without
// requiring them to submit a formal verification request.
// ──────────────────────────────────────────────────────────────────────────

// GET /api/admin/organisations?kind=organisme|partenaire|all&q=search
router.get("/admin/organisations", async (req, res) => {
  if (!checkAdminKey(req, res)) return;
  const kindParam = String(req.query.kind ?? "all");
  const q = String(req.query.q ?? "").trim().toLowerCase();

  const kindFilter =
    kindParam === "organisme" || kindParam === "partenaire" || kindParam === "intervenant"
      ? eq(organisationsTable.kind, kindParam)
      : inArray(organisationsTable.kind, ["organisme", "partenaire"]);

  const rows = await db
    .select({
      org: organisationsTable,
      user: {
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        createdAt: usersTable.createdAt,
      },
    })
    .from(organisationsTable)
    .leftJoin(usersTable, eq(organisationsTable.userId, usersTable.id))
    .where(kindFilter)
    .orderBy(desc(organisationsTable.createdAt))
    .limit(500);

  const filtered = q
    ? rows.filter((r) => {
        const hay = `${r.org.name ?? ""} ${r.org.email ?? ""} ${r.user?.email ?? ""} ${r.org.city ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
    : rows;

  res.json({ organisations: filtered });
});

// POST /api/admin/organisations/:id/badge { verified: boolean }
const BadgeBody = z.object({ verified: z.boolean() });
router.post("/admin/organisations/:id/badge", async (req, res) => {
  if (!checkAdminKey(req, res)) return;
  const { id } = req.params;
  const parsed = BadgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Champ « verified » requis (boolean)." });
    return;
  }
  const [existing] = await db
    .select()
    .from(organisationsTable)
    .where(eq(organisationsTable.id, id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Organisme introuvable." });
    return;
  }
  // Defense-in-depth: even if the admin key leaks, the badge primitive can
  // only flip orgs of kind "organisme" or "partenaire" — never an
  // intervenant (private self-org) or other future kinds.
  if (existing.kind !== "organisme" && existing.kind !== "partenaire") {
    res.status(400).json({
      error: `Le badge ne peut être appliqué qu'aux organismes et partenaires (kind actuel: ${existing.kind}).`,
    });
    return;
  }
  const [updated] = await db
    .update(organisationsTable)
    .set({ badgeVerified: parsed.data.verified, updatedAt: new Date() })
    .where(eq(organisationsTable.id, id))
    .returning();
  logger.info(
    { orgId: id, verified: parsed.data.verified, kind: existing.kind },
    "Badge toggled by admin",
  );
  res.json({ organisation: updated });
});

export default router;
