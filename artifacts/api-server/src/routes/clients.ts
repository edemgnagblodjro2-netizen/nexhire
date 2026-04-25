import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  db,
  clientsTable,
  caseNotesTable,
  organisationsTable,
  subscriptionsTable,
  organisationMembersTable,
  clientActivitiesTable,
  clientActivityReadsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, ilike, or, sql, gt, ne, inArray } from "drizzle-orm";

// Best-effort activity logger — never throws into the request flow.
async function logActivity(args: {
  organisationId: string;
  clientId: string;
  actorUserId: string;
  kind: string;
  detail?: string | null;
}) {
  try {
    await db.insert(clientActivitiesTable).values({
      organisationId: args.organisationId,
      clientId: args.clientId,
      actorUserId: args.actorUserId,
      kind: args.kind,
      detail: args.detail ?? null,
    });
  } catch {
    /* swallow — activity log must not break the action */
  }
}

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
  const orgs = await getAllEligibleOrgsForUser(userId);
  return orgs[0] ?? null;
}

/**
 * Returns ALL organisations the user belongs to (active membership) that are
 * on an eligible plan + active status. Owner-role orgs come first so that
 * single-org callers (client CRUD) keep targeting the user's primary org,
 * but the activity-feed endpoints can read across every org the user shares
 * with collaborators.
 */
async function getAllEligibleOrgsForUser(userId: string) {
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
  if (memberships.length === 0) return [];
  memberships.sort((a, b) => (a.memberRole === "owner" ? -1 : b.memberRole === "owner" ? 1 : 0));
  const eligible: typeof organisationsTable.$inferSelect[] = [];
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
    eligible.push(m.org);
  }
  return eligible;
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
  status: z.enum(["en_attente", "en_cours", "en_pause", "termine"]).optional(),
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
      status: data.status ?? "en_cours",
    })
    .returning();
  await logActivity({
    organisationId: org.id,
    clientId: row.id,
    actorUserId: userId,
    kind: "created",
    detail: null,
  });
  res.json({ client: row });
});

// ── GET /api/clients/activities ──────────────────────────────────
// Must be registered BEFORE /clients/:id so it's not captured by the :id pattern.
// Returns the org-wide activity feed (latest first), enriched with the
// actor's display name and the client's first/last name.
router.get("/clients/activities", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const orgs = await getAllEligibleOrgsForUser(userId);
  if (orgs.length === 0) {
    res.status(403).json({ error: "Abonnement requis." });
    return;
  }
  const orgIds = orgs.map((o) => o.id);
  const limit = Math.min(Number(req.query.limit) || 80, 200);
  const rows = await db
    .select({
      id: clientActivitiesTable.id,
      organisationId: clientActivitiesTable.organisationId,
      clientId: clientActivitiesTable.clientId,
      kind: clientActivitiesTable.kind,
      detail: clientActivitiesTable.detail,
      createdAt: clientActivitiesTable.createdAt,
      actorUserId: clientActivitiesTable.actorUserId,
      actorFirstName: usersTable.firstName,
      actorLastName: usersTable.lastName,
      actorEmail: usersTable.email,
      clientFirstName: clientsTable.firstName,
      clientLastName: clientsTable.lastName,
    })
    .from(clientActivitiesTable)
    .leftJoin(usersTable, eq(usersTable.id, clientActivitiesTable.actorUserId))
    .leftJoin(clientsTable, eq(clientsTable.id, clientActivitiesTable.clientId))
    .where(inArray(clientActivitiesTable.organisationId, orgIds))
    .orderBy(desc(clientActivitiesTable.createdAt))
    .limit(limit);
  res.json({ activities: rows });
});

// ── GET /api/clients/activities/unseen-count ─────────────────────
router.get("/clients/activities/unseen-count", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const orgs = await getAllEligibleOrgsForUser(userId);
  if (orgs.length === 0) {
    res.json({ count: 0 });
    return;
  }
  const reads = await db
    .select({
      organisationId: clientActivityReadsTable.organisationId,
      lastSeenAt: clientActivityReadsTable.lastSeenAt,
    })
    .from(clientActivityReadsTable)
    .where(
      and(
        eq(clientActivityReadsTable.userId, userId),
        inArray(clientActivityReadsTable.organisationId, orgs.map((o) => o.id)),
      ),
    );
  const readByOrg = new Map(reads.map((r) => [r.organisationId, r.lastSeenAt]));
  const fallback = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let total = 0;
  for (const o of orgs) {
    const cutoff = readByOrg.get(o.id) ?? fallback;
    const [{ count } = { count: 0 }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(clientActivitiesTable)
      .where(
        and(
          eq(clientActivitiesTable.organisationId, o.id),
          ne(clientActivitiesTable.actorUserId, userId),
          gt(clientActivitiesTable.createdAt, cutoff),
        ),
      );
    total += Number(count) || 0;
  }
  res.json({ count: total });
});

// ── POST /api/clients/activities/seen — reset unread badge ───────
// Marks every eligible org as seen-now so cross-org members see a clean badge.
router.post("/clients/activities/seen", async (req, res) => {
  const userId = gateOrg(req, res);
  if (!userId) return;
  const orgs = await getAllEligibleOrgsForUser(userId);
  if (orgs.length === 0) {
    res.json({ ok: true });
    return;
  }
  const now = new Date();
  for (const o of orgs) {
    await db
      .insert(clientActivityReadsTable)
      .values({ userId, organisationId: o.id, lastSeenAt: now })
      .onConflictDoUpdate({
        target: [clientActivityReadsTable.userId, clientActivityReadsTable.organisationId],
        set: { lastSeenAt: now },
      });
  }
  res.json({ ok: true });
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
  // Capture previous values for activity diffing
  const [prev] = await db
    .select({ status: clientsTable.status, riskLevel: clientsTable.riskLevel })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.organisationId, org.id)))
    .limit(1);
  const [row] = await db
    .update(clientsTable)
    .set(updates)
    .where(and(eq(clientsTable.id, req.params.id), eq(clientsTable.organisationId, org.id)))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  if (prev) {
    if (typeof updates.status === "string" && updates.status !== prev.status) {
      await logActivity({
        organisationId: org.id,
        clientId: row.id,
        actorUserId: userId,
        kind: "status_changed",
        detail: `${prev.status}→${updates.status}`,
      });
    }
    if (typeof updates.riskLevel === "string" && updates.riskLevel !== prev.riskLevel) {
      await logActivity({
        organisationId: org.id,
        clientId: row.id,
        actorUserId: userId,
        kind: "risk_changed",
        detail: `${prev.riskLevel}→${updates.riskLevel}`,
      });
    }
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
  await logActivity({
    organisationId: org.id,
    clientId: row.id,
    actorUserId: userId,
    kind: "archived",
    detail: null,
  });
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
  // Activity feed entry — short excerpt of the note + kind
  const excerpt = parsed.data.content.length > 80
    ? parsed.data.content.slice(0, 80) + "…"
    : parsed.data.content;
  await logActivity({
    organisationId: org.id,
    clientId: client.id,
    actorUserId: userId,
    kind: "note_added",
    detail: `${parsed.data.kind ?? "note"}: ${excerpt}`,
  });
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
