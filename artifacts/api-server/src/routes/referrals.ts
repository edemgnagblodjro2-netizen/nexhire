import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, referralCodesTable } from "@workspace/db";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Programme ambassadeur.
//
// GET    /api/referrals/me           → récupère/crée le code de l'utilisateur.
// POST   /api/referrals/claim        → un nouvel inscrit utilise un code.
// GET    /api/admin/referrals        → admin : top ambassadeurs.
//
// L'utilisateur est identifié via la session serveur (Authorization: Bearer)
// établie par authMiddleware — le header X-User-Id n'est plus utilisé.
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

// 8 chars, no ambiguous (no 0/O/1/I/L).
function makeCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const router = Router();

router.get("/referrals/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "authentication required" });
    return;
  }
  const userId = req.user.id;

  try {
    const existing = await db
      .select()
      .from(referralCodesTable)
      .where(eq(referralCodesTable.userId, userId))
      .limit(1);

    if (existing[0]) {
      res.json({
        code: existing[0].code,
        claimedCount: existing[0].claimedCount,
        createdAt: existing[0].createdAt,
      });
      return;
    }

    // Create with retry on collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      try {
        const inserted = await db
          .insert(referralCodesTable)
          .values({ userId, code })
          .returning();
        res.status(201).json({
          code: inserted[0].code,
          claimedCount: 0,
          createdAt: inserted[0].createdAt,
        });
        return;
      } catch {
        // collision, retry
      }
    }
    res.status(500).json({ error: "could not allocate code" });
  } catch (err) {
    res.status(500).json({ error: "lookup failed" });
  }
});

const ClaimBody = z.object({
  code: z.string().trim().min(4).max(16).toUpperCase(),
});

router.post("/referrals/claim", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "authentication required" });
    return;
  }
  const claimantId = req.user.id;
  const parsed = ClaimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid code" });
    return;
  }
  try {
    const found = await db
      .select()
      .from(referralCodesTable)
      .where(eq(referralCodesTable.code, parsed.data.code))
      .limit(1);
    if (!found[0]) {
      res.status(404).json({ error: "code not found" });
      return;
    }
    // Anti-self-claim.
    if (found[0].userId === claimantId) {
      res.status(400).json({ error: "self claim forbidden" });
      return;
    }
    // Idempotent: one claim per claimant ever (PK on claimant_user_id).
    try {
      await db.execute(sql`
        INSERT INTO referral_claims (code, claimant_user_id)
        VALUES (${parsed.data.code}, ${claimantId})
      `);
    } catch {
      res.status(409).json({ error: "already claimed" });
      return;
    }
    await db
      .update(referralCodesTable)
      .set({ claimedCount: sql`${referralCodesTable.claimedCount} + 1` })
      .where(eq(referralCodesTable.code, parsed.data.code));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "claim failed" });
  }
});

router.get("/admin/referrals", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(referralCodesTable)
      .orderBy(sql`${referralCodesTable.claimedCount} DESC, ${referralCodesTable.createdAt} DESC`)
      .limit(200);
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: "list failed" });
  }
});

export default router;
