import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  createSession,
  deleteSession,
  getSessionId,
  SESSION_COOKIE,
  SESSION_TTL,
} from "../lib/auth";
import { sendEmailTo } from "../lib/notify";
import crypto from "crypto";

const router = Router();

function setSessionCookie(res: any, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL,
  });
}

// POST /api/mobile-auth/register
router.post("/mobile-auth/register", async (req, res) => {
  const { email, password, firstName, lastName, honeypot } = req.body ?? {};

  // Honeypot: silently reject bots
  if (honeypot) return res.status(400).json({ error: "invalid" });

  if (!email || !password || !firstName) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Adresse courriel invalide." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Mot de passe trop court (min. 6 caractères)." });
  }

  try {
    // Check existing user
    const [existing] = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "Ce courriel est déjà utilisé." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [created] = await db.insert(usersTable).values({
      email: email.toLowerCase().trim(),
      firstName: firstName.trim(),
      lastName: lastName?.trim() || null,
      passwordHash,
      role: "user",
    }).returning({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName });

    const user = { id: created.id, email: created.email!, firstName: created.firstName!, lastName: created.lastName ?? null, profileImageUrl: null };
    const sid = await createSession({ user, access_token: "mobile-auth" });
    setSessionCookie(res, sid);

    return res.json({ user, token: sid });
  } catch (err) {
    logger.error({ err }, "mobile-auth/register error");
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// POST /api/mobile-auth/email-login
router.post("/mobile-auth/email-login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Courriel et mot de passe requis." });
  }

  try {
    const [row] = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      passwordHash: usersTable.passwordHash,
    })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!row || !row.passwordHash) {
      // Constant-time fake compare to prevent timing attacks
      await bcrypt.compare(password, "$2a$12$invalidhashinvalidhashinvalidhashinvalidhashinvalidhash");
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const valid = await bcrypt.compare(password, row.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const user = { id: row.id, email: row.email!, firstName: row.firstName!, lastName: row.lastName ?? null, profileImageUrl: null };
    const sid = await createSession({ user, access_token: "mobile-auth" });
    setSessionCookie(res, sid);

    return res.json({ user, token: sid });
  } catch (err) {
    logger.error({ err }, "mobile-auth/email-login error");
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

// GET /api/mobile-auth/me
router.get("/mobile-auth/me", (req, res) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { id, email, firstName, lastName } = req.user as any;
  return res.json({ user: { id, email, firstName, lastName: lastName ?? null } });
});

// POST /api/mobile-auth/logout
router.post("/mobile-auth/logout", async (req, res) => {
  const sid = getSessionId(req);
  if (sid) {
    try { await deleteSession(sid); } catch {}
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  return res.json({ ok: true });
});

// POST /api/mobile-auth/forgot-password
router.post("/mobile-auth/forgot-password", async (req, res) => {
  const { email } = req.body ?? {};
  // Always return ok to prevent email enumeration
  if (!email) return res.json({ ok: true });

  try {
    const [user] = await db.select({ id: usersTable.id, firstName: usersTable.firstName })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (user) {
      const code = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await db.insert(passwordResetTokensTable).values({ email: email.toLowerCase().trim(), code, expiresAt });

      const resetUrl = `${process.env.PUBLIC_URL ?? "https://attentezero.ca"}/q/fr?reset=${code}`;
      const html = `<p>Bonjour${user.firstName ? ` ${user.firstName}` : ""},</p>`
        + `<p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe FairRent. Ce lien expire dans 1 heure.</p>`
        + `<p><a href="${resetUrl}">${resetUrl}</a></p>`
        + `<p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>`;
      await sendEmailTo(email, {
        subject: "Réinitialisation de votre mot de passe — FairRent",
        text: `Réinitialiser votre mot de passe : ${resetUrl}`,
        html,
      }).catch((err: any) => logger.warn({ err }, "mobile-auth/forgot-password email failed"));
    }
  } catch (err) {
    logger.error({ err }, "mobile-auth/forgot-password error");
  }

  return res.json({ ok: true });
});

// PATCH /api/mobile-auth/update-profile
router.patch("/mobile-auth/update-profile", async (req, res) => {
  if (!req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const userId = (req.user as any).id as string;
  const { firstName, lastName, address } = req.body ?? {};

  if (!firstName?.trim()) {
    return res.status(400).json({ error: "Le prénom est requis." });
  }

  try {
    const [updated] = await db.update(usersTable)
      .set({ firstName: firstName.trim(), lastName: lastName?.trim() || null, address: address?.trim() || null })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, email: usersTable.email, firstName: usersTable.firstName, lastName: usersTable.lastName, address: usersTable.address });

    if (!updated) return res.status(404).json({ error: "not_found" });

    return res.json({ user: { id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName, address: updated.address } });
  } catch (err) {
    logger.error({ err }, "mobile-auth/update-profile error");
    return res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;
