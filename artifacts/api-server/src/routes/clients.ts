import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  db,
  clientsTable,
  caseNotesTable,
  organisationsTable,
  subscriptionsTable,
  organisationMembersTable,
} from "@workspace/db";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Non authentifié." });
    return false;
  }
  return true;
}

const ALLOWED_PLANS = new Set(["terrain", "institution"]);
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Returns the organisation the `userId` belongs to (as owner, admin, or member)
 * if and only if that org has an active subscription on a plan eligible for
 * the field-worker / institution client-management module. Returns null otherwise.
 *
 * Multi-seat aware: invited team members get the same access as the owner.
 */
async function getEligibleOrgForUser(userId: string) {
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
  // Prefer owner role first, then any other active membership
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

function gateOrg(req: Request, res: Response) {
  if (!requireAuth(req, res)) return null;
  return req.user!.id;
}

// ── Schemas ──────────────────────────────────────────────────────
const ClientBody = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().email().max(200).optional().nullable().or(z.literal("")),
  dateOfBirth: z.string().max(20).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  summary: z.string().max(4000).optional().nullable(),
  riskLevel: z.enum(["none", "low", "medium", "high"]).optional(),
});

const NoteBody = z.object({
  content: z.string().min(1).max(8000),
  kind: z.enum(["note", "contact", "rdv", "refer", "alerte"]).optional(),
});

// ── GET /api/clients?q=… ─────────────────────────────────────────
router.get("/clients", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement Terrain ou Institution requis." });
    return;
  }
  const q = (req.query.q as string | undefined)?.trim();
  const where = q
    ? and(
        eq(clientsTable.organisationId, org.id),
        eq(clientsTable.archived, false),
        or(
          ilike(clientsTable.firstName, `%${q}%`),
          ilike(clientsTable.lastName, `%${q}%`),
          ilike(clientsTable.phone, `%${q}%`),
        ),
      )
    : and(
        eq(clientsTable.organisationId, org.id),
        eq(clientsTable.archived, false),
      );
  const rows = await db
    .select()
    .from(clientsTable)
    .where(where)
    .orderBy(desc(clientsTable.updatedAt))
    .limit(200);
  res.json({ clients: rows });
});

// ── POST /api/clients ────────────────────────────────────────────
router.post("/clients", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement Terrain ou Institution requis." });
    return;
  }
  const parsed = ClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }
  const data = parsed.data;
  const [row] = await db
    .insert(clientsTable)
    .values({
      organisationId: org.id,
      createdByUserId: userId,
      firstName: data.firstName,
      lastName: data.lastName ?? null,
      phone: data.phone ?? null,
      email: data.email && data.email !== "" ? data.email : null,
      dateOfBirth: data.dateOfBirth ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      summary: data.summary ?? null,
      riskLevel: data.riskLevel ?? "none",
    })
    .returning();
  res.json({ client: row });
});

// ── GET /api/clients/:id ─────────────────────────────────────────
router.get("/clients/:id", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement requis." });
    return;
  }
  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.organisationId, org.id)))
    .limit(1);
  if (!client) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  const notes = await db
    .select()
    .from(caseNotesTable)
    .where(eq(caseNotesTable.clientId, client.id))
    .orderBy(desc(caseNotesTable.createdAt))
    .limit(200);
  res.json({ client, notes });
});

// ── PATCH /api/clients/:id ───────────────────────────────────────
router.patch("/clients/:id", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement requis." });
    return;
  }
  const parsed = ClientBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    if (k === "email" && v === "") {
      updates[k] = null;
    } else {
      updates[k] = v;
    }
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Aucune modification." });
    return;
  }
  const [row] = await db
    .update(clientsTable)
    .set(updates)
    .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.organisationId, org.id)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  res.json({ client: row });
});

// ── DELETE /api/clients/:id (soft archive) ───────────────────────
router.delete("/clients/:id", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement requis." });
    return;
  }
  const [row] = await db
    .update(clientsTable)
    .set({ archived: true })
    .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.organisationId, org.id)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  res.json({ ok: true });
});

// ── POST /api/clients/:id/notes ──────────────────────────────────
router.post("/clients/:id/notes", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement requis." });
    return;
  }
  // Confirm client belongs to org
  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.organisationId, org.id)))
    .limit(1);
  if (!client) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  const parsed = NoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Note invalide." });
    return;
  }
  const [row] = await db
    .insert(caseNotesTable)
    .values({
      clientId: client.id,
      organisationId: org.id,
      authorUserId: userId,
      content: parsed.data.content,
      kind: parsed.data.kind ?? "note",
    })
    .returning();
  // Touch client.updatedAt so it appears at top of list
  await db
    .update(clientsTable)
    .set({ updatedAt: new Date() })
    .where(eq(clientsTable.id, client.id));
  res.json({ note: row });
});

// ── DELETE /api/clients/:cid/notes/:nid ──────────────────────────
router.delete("/clients/:cid/notes/:nid", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const org = await getEligibleOrgForUser(userId);
  if (!org) {
    res.status(403).json({ error: "Abonnement requis." });
    return;
  }
  const [row] = await db
    .delete(caseNotesTable)
    .where(
      and(
        eq(caseNotesTable.id, req.params.nid),
        eq(caseNotesTable.clientId, req.params.cid),
        eq(caseNotesTable.organisationId, org.id),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Note introuvable." });
    return;
  }
  res.json({ ok: true });
});

// ── GET /api/clients/_meta/access — expose eligibility to mobile ─
router.get("/clients/_meta/access", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.json({ eligible: false, reason: "unauthenticated" });
    return;
  }
  const org = await getEligibleOrgForUser(req.user!.id);
  res.json({
    eligible: !!org,
    organisationId: org?.id ?? null,
    organisationKind: org?.kind ?? null,
  });
});

export default router;
