import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  db,
  organisationsTable,
  organisationMembersTable,
  subscriptionsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";
// `sql` import already covers raw fragments used below.

const router: IRouter = Router();

/**
 * Plan-based seat limits.
 * - terrain (solo intervenant)  : 1 seat (no invites possible)
 * - organisme (small NGO)        : 3 seats
 * - institution (CIUSSS / CLSC)  : 15 seats
 * Other plans: 1 (owner only).
 */
// Aligned with artifacts/service-qc/lib/planLimits.ts (single source of truth on
// the client). 9999 represents "unlimited" so the bar UI still renders.
const SEAT_LIMITS: Record<string, number> = {
  standard: 1,
  free: 1,
  travailleur: 1,
  terrain: 1,
  organisme: 10,
  plus: 25,
  institution: 9999,
};
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

function gate(req: Request, res: Response): string | null {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Non authentifié." });
    return null;
  }
  return req.user!.id;
}

/** Returns the org where the user is currently a member, plus their role and the active sub. */
async function getMyOrgContext(userId: string) {
  // Prefer owner role first, then most recent active membership
  const rows = await db
    .select({
      memberId: organisationMembersTable.id,
      memberRole: organisationMembersTable.role,
      orgId: organisationsTable.id,
      orgName: organisationsTable.name,
      orgKind: organisationsTable.kind,
    })
    .from(organisationMembersTable)
    .leftJoin(organisationsTable, eq(organisationsTable.id, organisationMembersTable.organisationId))
    .where(
      and(
        eq(organisationMembersTable.userId, userId),
        eq(organisationMembersTable.status, "active"),
      ),
    );
  if (rows.length === 0) return null;
  // Owner first
  rows.sort((a, b) => (a.memberRole === "owner" ? -1 : b.memberRole === "owner" ? 1 : 0));
  const me = rows[0];
  if (!me.orgId) return null;
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.organisationId, me.orgId))
    .limit(1);
  return { ...me, subscription: sub ?? null };
}

// ── GET /api/organisations/me/members ────────────────────────────
router.get("/organisations/me/members", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const ctx = await getMyOrgContext(userId);
  if (!ctx) {
    res.status(403).json({ error: "Aucune organisation associée." });
    return;
  }
  const members = await db
    .select({
      id: organisationMembersTable.id,
      userId: organisationMembersTable.userId,
      invitedEmail: organisationMembersTable.invitedEmail,
      role: organisationMembersTable.role,
      status: organisationMembersTable.status,
      invitedAt: organisationMembersTable.invitedAt,
      joinedAt: organisationMembersTable.joinedAt,
      respondedAt: organisationMembersTable.respondedAt,
      responseNote: organisationMembersTable.responseNote,
      responseSeenByInviter: organisationMembersTable.responseSeenByInviter,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      email: usersTable.email,
    })
    .from(organisationMembersTable)
    .leftJoin(usersTable, eq(usersTable.id, organisationMembersTable.userId))
    .where(eq(organisationMembersTable.organisationId, ctx.orgId));

  const plan = ctx.subscription?.plan ?? null;
  const limit = plan ? SEAT_LIMITS[plan] ?? 1 : 1;
  const usedActive = members.filter((m) => m.status === "active").length;
  const usedInvited = members.filter((m) => m.status === "invited").length;

  res.json({
    organisation: { id: ctx.orgId, name: ctx.orgName, kind: ctx.orgKind },
    plan,
    planStatus: ctx.subscription?.status ?? null,
    myRole: ctx.memberRole,
    seatLimit: limit,
    seatsActive: usedActive,
    seatsInvited: usedInvited,
    canInvite: (ctx.memberRole === "owner" || ctx.memberRole === "admin")
      && (plan === "organisme" || plan === "plus" || plan === "institution")
      && ACTIVE_STATUSES.has(ctx.subscription?.status ?? ""),
    members,
  });
});

// ── POST /api/organisations/me/members ───────────────────────────
const InviteBody = z.object({
  email: z.string().email().max(200),
  role: z.enum(["admin", "member"]).optional().default("member"),
});

router.post("/organisations/me/members", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const ctx = await getMyOrgContext(userId);
  if (!ctx) {
    res.status(403).json({ error: "Aucune organisation associée." });
    return;
  }
  if (ctx.memberRole !== "owner" && ctx.memberRole !== "admin") {
    res.status(403).json({ error: "Réservé aux propriétaires et administrateurs." });
    return;
  }
  const plan = ctx.subscription?.plan;
  if (plan !== "organisme" && plan !== "plus" && plan !== "institution") {
    res.status(403).json({ error: "L'invitation d'équipe nécessite un forfait Organisme, Plus ou Institution." });
    return;
  }
  if (!ACTIVE_STATUSES.has(ctx.subscription?.status ?? "")) {
    res.status(403).json({ error: "Abonnement inactif." });
    return;
  }
  const parsed = InviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email invalide." });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const role = parsed.data.role;

  const limit = SEAT_LIMITS[plan] ?? 1;

  // Seat-count enforcement and insert wrapped in a transaction with row-level
  // lock on the org row, eliminating the read-then-insert race condition.
  // We pre-check duplicates inside the transaction (after locking) to return a
  // clean 409 instead of relying on the unique-constraint exception, which
  // node-postgres + drizzle wraps in a generic Error that loses the pg error
  // code when surfaced from a transaction.
  try {
    const result = await db.transaction(async (tx) => {
      // Lock the organisation row so two concurrent invites can't both pass the
      // seat-count check or both reserve the same email.
      await tx.execute(
        sql`SELECT id FROM organisations WHERE id = ${ctx.orgId} FOR UPDATE`,
      );

      // Look up an existing row for this (org, email) — UNIQUE INDEX guarantees ≤1.
      const [existing] = await tx
        .select()
        .from(organisationMembersTable)
        .where(
          and(
            eq(organisationMembersTable.organisationId, ctx.orgId),
            eq(organisationMembersTable.invitedEmail, email),
          ),
        )
        .limit(1);

      // Block only if the row is currently invited or active. revoked/declined
      // rows are recyclable: the admin can re-invite the same email.
      if (existing && (existing.status === "invited" || existing.status === "active")) {
        return { kind: "dup" as const };
      }

      const used = await tx
        .select({ c: sql<number>`count(*)::int` })
        .from(organisationMembersTable)
        .where(
          and(
            eq(organisationMembersTable.organisationId, ctx.orgId),
            sql`${organisationMembersTable.status} IN ('active','invited')`,
          ),
        );
      const usedCount = used[0]?.c ?? 0;
      if (usedCount >= limit) {
        return { kind: "limit" as const, usedCount };
      }

      // Existing-user lookup: case-insensitive (we store invitedEmail lowercase
      // but legacy rows in usersTable may use mixed case). We link the userId
      // up-front so the invitee can find the row immediately, but we do NOT
      // auto-activate — they must explicitly accept via the invitations screen.
      const [existingUser] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(sql`LOWER(${usersTable.email}) = ${email}`)
        .limit(1);

      let row;
      if (existing) {
        // Recycle the revoked/declined row — reset response fields, set role,
        // mark as invited again. UNIQUE INDEX (org, email) prevents duplicates.
        [row] = await tx
          .update(organisationMembersTable)
          .set({
            userId: existingUser?.id ?? null,
            role,
            status: "invited",
            invitedByUserId: userId,
            invitedAt: new Date(),
            joinedAt: null,
            respondedAt: null,
            responseNote: null,
            responseSeenByInviter: "no",
          })
          .where(eq(organisationMembersTable.id, existing.id))
          .returning();
      } else {
        [row] = await tx
          .insert(organisationMembersTable)
          .values({
            organisationId: ctx.orgId,
            userId: existingUser?.id ?? null,
            invitedEmail: email,
            role,
            status: "invited",
            invitedByUserId: userId,
            joinedAt: null,
          })
          .returning();
      }
      return { kind: "ok" as const, row };
    });

    if (result.kind === "dup") {
      res.status(409).json({ error: "Cette adresse a déjà été invitée." });
      return;
    }
    if (result.kind === "limit") {
      res.status(409).json({ error: `Limite de ${limit} sièges atteinte pour le forfait ${plan}.` });
      return;
    }
    res.json({ member: result.row });
  } catch (e: any) {
    // Last-resort: still return a clean 409 if the unique constraint surfaces.
    if (e?.code === "23505" || /duplicate key|UQ_org_members_email/i.test(String(e?.message ?? ""))) {
      res.status(409).json({ error: "Cette adresse a déjà été invitée." });
      return;
    }
    throw e;
  }
});

// ── PATCH /api/organisations/me/members/:id (change role) ────────
const PatchBody = z.object({
  role: z.enum(["admin", "member"]).optional(),
  status: z.enum(["revoked"]).optional(), // soft-revoke alias
});

router.patch("/organisations/me/members/:id", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const ctx = await getMyOrgContext(userId);
  if (!ctx) {
    res.status(403).json({ error: "Aucune organisation associée." });
    return;
  }
  if (ctx.memberRole !== "owner") {
    res.status(403).json({ error: "Seul le propriétaire peut modifier les rôles." });
    return;
  }
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success || (parsed.data.role === undefined && parsed.data.status === undefined)) {
    res.status(400).json({ error: "Aucune modification valide." });
    return;
  }
  // Forbid touching the owner
  const [target] = await db
    .select()
    .from(organisationMembersTable)
    .where(
      and(
        eq(organisationMembersTable.id, req.params.id),
        eq(organisationMembersTable.organisationId, ctx.orgId),
      ),
    )
    .limit(1);
  if (!target) {
    res.status(404).json({ error: "Membre introuvable." });
    return;
  }
  if (target.role === "owner") {
    res.status(403).json({ error: "Le propriétaire ne peut être modifié." });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.status === "revoked") updates.status = "revoked";

  const [row] = await db
    .update(organisationMembersTable)
    .set(updates)
    .where(eq(organisationMembersTable.id, req.params.id))
    .returning();
  res.json({ member: row });
});

// ── DELETE /api/organisations/me/members/:id (revoke seat) ───────
router.delete("/organisations/me/members/:id", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const ctx = await getMyOrgContext(userId);
  if (!ctx) {
    res.status(403).json({ error: "Aucune organisation associée." });
    return;
  }
  if (ctx.memberRole !== "owner" && ctx.memberRole !== "admin") {
    res.status(403).json({ error: "Réservé aux propriétaires et administrateurs." });
    return;
  }
  const [target] = await db
    .select()
    .from(organisationMembersTable)
    .where(
      and(
        eq(organisationMembersTable.id, req.params.id),
        eq(organisationMembersTable.organisationId, ctx.orgId),
      ),
    )
    .limit(1);
  if (!target) {
    res.status(404).json({ error: "Membre introuvable." });
    return;
  }
  if (target.role === "owner") {
    res.status(403).json({ error: "Le propriétaire ne peut être révoqué." });
    return;
  }
  await db
    .delete(organisationMembersTable)
    .where(eq(organisationMembersTable.id, req.params.id));
  res.json({ ok: true });
});

// ── GET /api/invitations/pending — invites awaiting this user's response ─
router.get("/invitations/pending", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const me = (req.user as any) ?? {};
  const lower = (me.email ?? "").toLowerCase().trim();

  const rows = await db
    .select({
      id: organisationMembersTable.id,
      role: organisationMembersTable.role,
      invitedAt: organisationMembersTable.invitedAt,
      invitedEmail: organisationMembersTable.invitedEmail,
      orgId: organisationsTable.id,
      orgName: organisationsTable.name,
      orgKind: organisationsTable.kind,
      inviterFirstName: usersTable.firstName,
      inviterLastName: usersTable.lastName,
      inviterEmail: usersTable.email,
    })
    .from(organisationMembersTable)
    .leftJoin(
      organisationsTable,
      eq(organisationsTable.id, organisationMembersTable.organisationId),
    )
    .leftJoin(
      usersTable,
      eq(usersTable.id, organisationMembersTable.invitedByUserId),
    )
    .where(
      and(
        eq(organisationMembersTable.status, "invited"),
        // Match either by linked userId OR by email (covers freshly-registered users)
        sql`(${organisationMembersTable.userId} = ${userId} OR LOWER(${organisationMembersTable.invitedEmail}) = ${lower})`,
      ),
    );

  res.json({ invitations: rows });
});

// ── POST /api/invitations/:id/respond — accept or decline ────────
const RespondBody = z.object({
  action: z.enum(["accept", "decline"]),
  note: z.string().max(500).optional(),
});

router.post("/invitations/:id/respond", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const me = (req.user as any) ?? {};
  const lower = (me.email ?? "").toLowerCase().trim();

  const parsed = RespondBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }

  // Atomic update — guards against double-respond races by including
  // status='invited' AND ownership in the WHERE clause. If 0 rows are
  // returned, either the invite doesn't exist, was already handled, or
  // doesn't belong to this user.
  const now = new Date();
  const newStatus = parsed.data.action === "accept" ? "active" : "declined";
  const updated = await db
    .update(organisationMembersTable)
    .set({
      userId, // ensure linked (might still be null on accept-by-email path)
      status: newStatus,
      respondedAt: now,
      responseNote: parsed.data.note?.trim() ?? null,
      responseSeenByInviter: "no",
      joinedAt: newStatus === "active" ? now : null,
    })
    .where(
      and(
        eq(organisationMembersTable.id, req.params.id),
        eq(organisationMembersTable.status, "invited"),
        sql`(${organisationMembersTable.userId} = ${userId} OR LOWER(${organisationMembersTable.invitedEmail}) = ${lower})`,
      ),
    )
    .returning();

  if (updated.length === 0) {
    // Disambiguate the failure for a clearer error message.
    const [target] = await db
      .select({
        id: organisationMembersTable.id,
        status: organisationMembersTable.status,
        invitedEmail: organisationMembersTable.invitedEmail,
        userId: organisationMembersTable.userId,
      })
      .from(organisationMembersTable)
      .where(eq(organisationMembersTable.id, req.params.id))
      .limit(1);
    if (!target) {
      res.status(404).json({ error: "Invitation introuvable." });
      return;
    }
    if (target.status !== "invited") {
      res.status(409).json({ error: "Invitation déjà traitée." });
      return;
    }
    res.status(403).json({ error: "Cette invitation ne vous est pas destinée." });
    return;
  }

  res.json({ member: updated[0] });
});

// ── POST /api/team/responses/seen — admin marks decline notifications as seen ─
router.post("/team/responses/seen", async (req, res) => {
  const userId = gate(req, res);
  if (!userId) return;
  const ctx = await getMyOrgContext(userId);
  if (!ctx) {
    res.status(403).json({ error: "Aucune organisation associée." });
    return;
  }
  if (ctx.memberRole !== "owner" && ctx.memberRole !== "admin") {
    res.status(403).json({ error: "Réservé aux propriétaires et administrateurs." });
    return;
  }
  await db
    .update(organisationMembersTable)
    .set({ responseSeenByInviter: "yes" })
    .where(
      and(
        eq(organisationMembersTable.organisationId, ctx.orgId),
        eq(organisationMembersTable.responseSeenByInviter, "no"),
        eq(organisationMembersTable.status, "declined"),
      ),
    );
  res.json({ ok: true });
});

export default router;

/**
 * Helper exported for use in clients & appointments routes:
 * returns the *active* organisation a user belongs to, regardless of whether
 * they own it or were invited as a member.
 */
export async function getMembershipOrg(userId: string) {
  const rows = await db
    .select({
      orgId: organisationsTable.id,
      orgKind: organisationsTable.kind,
      role: organisationMembersTable.role,
    })
    .from(organisationMembersTable)
    .leftJoin(organisationsTable, eq(organisationsTable.id, organisationMembersTable.organisationId))
    .where(
      and(
        eq(organisationMembersTable.userId, userId),
        eq(organisationMembersTable.status, "active"),
      ),
    );
  if (rows.length === 0) return null;
  rows.sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));
  return rows[0];
}

/**
 * Claim any pending invitations for this email — call at register & login.
 * Idempotent and case-insensitive: invitedEmail is already lowercased at write
 * time, but we lower() the user's email to be safe against legacy data.
 */
/**
 * Link any pending `invited` rows for this email to the user (so they can later
 * accept or decline them from the app), but DO NOT auto-activate. Acceptance
 * requires an explicit POST to /api/invitations/:id/respond from the invitee.
 */
export async function claimPendingInvites(userId: string, email: string | null | undefined) {
  if (!email) return 0;
  const lower = email.toLowerCase().trim();
  const result = await db
    .update(organisationMembersTable)
    .set({ userId })
    .where(
      and(
        sql`LOWER(${organisationMembersTable.invitedEmail}) = ${lower}`,
        eq(organisationMembersTable.status, "invited"),
        isNull(organisationMembersTable.userId),
      ),
    )
    .returning({ id: organisationMembersTable.id });
  return result.length;
}
