import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  db,
  appointmentsTable,
  clientsTable,
  caseNotesTable,
  organisationsTable,
  subscriptionsTable,
  organisationMembersTable,
} from "@workspace/db";
import { and, desc, eq, gte, lte, asc } from "drizzle-orm";

const router: IRouter = Router();

// Aligned with artifacts/service-qc/lib/planLimits.ts: any paid plan can create
// appointments. Free/standard remain blocked.
const ALLOWED_PLANS = new Set([
  "travailleur",
  "terrain",
  "organisme",
  "plus",
  "institution",
]);
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

async function getEligibleOrgForUser(userId: string) {
  // Multi-seat aware: any active membership in an org with an eligible
  // subscription grants access. Prefer owner-role memberships first.
  const memberships = await db
    .select({
      org: organisationsTable,
      memberRole: organisationMembersTable.role,
    })
    .from(organisationMembersTable)
    .leftJoin(organisationsTable, eq(organisationsTable.id, organisationMembersTable.organisationId))
    .where(
      and(
        eq(organisationMembersTable.userId, userId),
        eq(organisationMembersTable.status, "active"),
      ),
    );
  if (memberships.length === 0) return null;
  memberships.sort((a, b) => (a.memberRole === "owner" ? -1 : b.memberRole === "owner" ? 1 : 0));
  for (const m of memberships) {
    if (!m.org) continue;
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.organisationId, m.org.id))
      .limit(1);
    if (!sub) continue;
    if (!ALLOWED_PLANS.has(sub.plan)) continue;
    if (!ACTIVE_STATUSES.has(sub.status)) continue;
    return m.org;
  }
  return null;
}

function gate(req: Request, res: Response): string | null {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Non authentifié." });
    return null;
  }
  return req.user!.id;
}

const STATUS_VALUES = ["scheduled", "confirmed", "done", "cancelled", "noshow"] as const;

// Strict RFC3339 / ISO 8601 with explicit timezone (Z or ±HH:MM).
// Rejects timezone-naive strings to prevent server-local interpretation drift.
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/;
const tzAwareIso = z
  .string()
  .regex(ISO_WITH_OFFSET, "scheduledAt doit inclure un fuseau (Z ou ±HH:MM)")
  .refine((s) => !isNaN(new Date(s).getTime()), "Date invalide");

const CreateBody = z.object({
  clientId: z.string().min(1),
  scheduledAt: tzAwareIso,
  durationMin: z.number().int().min(5).max(600).optional(),
  location: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const PatchBody = z.object({
  scheduledAt: tzAwareIso.optional(),
  durationMin: z.number().int().min(5).max(600).optional(),
  location: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(STATUS_VALUES).optional(),
});

// ── GET /api/appointments?from=ISO&to=ISO&clientId=… ──────────────
router.get("/appointments", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement Terrain ou Institution requis." });
    return;
  }
  const from = req.query.from ? new Date(String(req.query.from)) : null;
  const to = req.query.to ? new Date(String(req.query.to)) : null;
  const clientId = req.query.clientId ? String(req.query.clientId) : null;

  const conditions = [eq(appointmentsTable.organisationId, org.id)];
  if (from && !isNaN(from.getTime())) conditions.push(gte(appointmentsTable.scheduledAt, from));
  if (to && !isNaN(to.getTime())) conditions.push(lte(appointmentsTable.scheduledAt, to));
  if (clientId) conditions.push(eq(appointmentsTable.clientId, clientId));

  const rows = await db
    .select({
      id: appointmentsTable.id,
      clientId: appointmentsTable.clientId,
      scheduledAt: appointmentsTable.scheduledAt,
      durationMin: appointmentsTable.durationMin,
      location: appointmentsTable.location,
      notes: appointmentsTable.notes,
      status: appointmentsTable.status,
      createdAt: appointmentsTable.createdAt,
      clientFirstName: clientsTable.firstName,
      clientLastName: clientsTable.lastName,
      clientPhone: clientsTable.phone,
    })
    .from(appointmentsTable)
    .leftJoin(clientsTable, eq(clientsTable.id, appointmentsTable.clientId))
    .where(and(...conditions))
    .orderBy(asc(appointmentsTable.scheduledAt))
    .limit(500);

  res.json({ appointments: rows });
});

// ── POST /api/appointments ────────────────────────────────────────
router.post("/appointments", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement Terrain ou Institution requis." });
    return;
  }
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }
  const data = parsed.data;
  const when = new Date(data.scheduledAt);
  if (isNaN(when.getTime())) {
    res.status(400).json({ error: "Date invalide." });
    return;
  }
  // Confirm client belongs to org
  const [client] = await db
    .select({ id: clientsTable.id, firstName: clientsTable.firstName, lastName: clientsTable.lastName })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, data.clientId), eq(clientsTable.organisationId, org.id)))
    .limit(1);
  if (!client) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  const [row] = await db
    .insert(appointmentsTable)
    .values({
      clientId: data.clientId,
      organisationId: org.id,
      createdByUserId: userId,
      scheduledAt: when,
      durationMin: data.durationMin ?? 30,
      location: data.location ?? null,
      notes: data.notes ?? null,
    })
    .returning();

  // Auto-create a "rdv" case note so it appears in the client's timeline
  const dateStr = when.toLocaleString("fr-CA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const noteContent = `RDV planifié pour le ${dateStr}${data.location ? ` à ${data.location}` : ""}.${data.notes ? ` ${data.notes}` : ""}`;
  await db.insert(caseNotesTable).values({
    clientId: data.clientId,
    organisationId: org.id,
    authorUserId: userId,
    content: noteContent,
    kind: "rdv",
  });
  await db
    .update(clientsTable)
    .set({ updatedAt: new Date() })
    .where(eq(clientsTable.id, data.clientId));

  res.json({ appointment: row });
});

// ── PATCH /api/appointments/:id ───────────────────────────────────
router.patch("/appointments/:id", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement requis." });
    return;
  }
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    if (k === "scheduledAt" && typeof v === "string") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) updates[k] = d;
    } else {
      updates[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Aucune modification." });
    return;
  }
  const [row] = await db
    .update(appointmentsTable)
    .set(updates)
    .where(and(eq(appointmentsTable.id, req.params.id), eq(appointmentsTable.organisationId, org.id)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Rendez-vous introuvable." });
    return;
  }
  res.json({ appointment: row });
});

// ── DELETE /api/appointments/:id ──────────────────────────────────
router.delete("/appointments/:id", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement requis." });
    return;
  }
  const [row] = await db
    .delete(appointmentsTable)
    .where(and(eq(appointmentsTable.id, req.params.id), eq(appointmentsTable.organisationId, org.id)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Rendez-vous introuvable." });
    return;
  }
  res.json({ ok: true });
});

export default router;
