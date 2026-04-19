import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import {
  db,
  organisationsTable,
  organisationMembersTable,
  subscriptionsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
// `sql` import already covers raw fragments used below.

const router: IRouter = Router();

/**
 * Plan-based seat limits.
 * - terrain (solo intervenant)  : 1 seat (no invites possible)
 * - organisme (small NGO)        : 3 seats
 * - institution (CIUSSS / CLSC)  : 15 seats
 * Other plans: 1 (owner only).
 */
const SEAT_LIMITS: Record<string, number> = {
  terrain: 1,
  organisme: 3,
  institution: 15,
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
      && (plan === "organisme" || plan === "institution")
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
  if (plan !== "organisme" && plan !== "institution") {
    res.status(403).json({ error: "L'invitation d'équipe nécessite un forfait Organisme ou Institution." });
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

      // Already invited / already member?
      const [dup] = await tx
        .select({ id: organisationMembersTable.id })
        .from(organisationMembersTable)
        .where(
          and(
            eq(organisationMembersTable.organisationId, ctx.orgId),
            eq(organisationMembersTable.invitedEmail, email),
          ),
        )
        .limit(1);
      if (dup) {
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
      // but legacy rows in usersTable may use mixed case).
      const [existingUser] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(sql`LOWER(${usersTable.email}) = ${email}`)
        .limit(1);

      const [row] = await tx
        .insert(organisationMembersTable)
        .values({
          organisationId: ctx.orgId,
          userId: existingUser?.id ?? null,
          invitedEmail: email,
          role,
          status: existingUser ? "active" : "invited",
          invitedByUserId: userId,
          joinedAt: existingUser ? new Date() : null,
        })
        .returning();
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
export async function claimPendingInvites(userId: string, email: string | null | undefined) {
  if (!email) return 0;
  const lower = email.toLowerCase().trim();
  const result = await db
    .update(organisationMembersTable)
    .set({ userId, status: "active", joinedAt: new Date() })
    .where(
      and(
        sql`LOWER(${organisationMembersTable.invitedEmail}) = ${lower}`,
        eq(organisationMembersTable.status, "invited"),
      ),
    )
    .returning({ id: organisationMembersTable.id });
  return result.length;
}
