import * as oidc from "openid-client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable, passwordResetTokensTable, organisationsTable, subscriptionsTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      | string
      | null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        ...userData,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ user: null });
    return;
  }
  const sid = getSessionId(req);
  const session = sid ? await getSession(sid) : null;
  const role = session?.user?.role ?? "user";

  // Fetch fresh isPremium from DB (in case it was upgraded since last login)
  let isPremium = false;
  try {
    const sessionUser = (req.user as any) || {};
    const userId = sessionUser.id;
    if (userId) {
      const [dbUser] = await db
        .select({ isPremium: usersTable.isPremium })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      isPremium = !!dbUser?.isPremium;
    }
  } catch {}

  res.json({ user: { ...req.user, role, isPremium } });
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      address: dbUser.address ?? null,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    const { code, code_verifier, redirect_uri } = parsed.data;

    try {
      const config = await getOidcConfig();
      const tokenEndpoint = config.serverMetadata().token_endpoint;

      if (!tokenEndpoint) {
        req.log.error("Token endpoint not found in OIDC discovery");
        res.status(500).json({ error: "Token exchange failed" });
        return;
      }

      req.log.info(
        { tokenEndpoint, redirect_uri, client_id: process.env.REPL_ID },
        "Attempting mobile token exchange",
      );

      const tokenRes = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
          client_id: process.env.REPL_ID!,
          code_verifier,
        }).toString(),
      });

      const tokenData = (await tokenRes.json()) as Record<string, unknown>;

      if (!tokenRes.ok || tokenData.error) {
        req.log.error({ tokenData, status: tokenRes.status }, "Token exchange failed from provider");
        res.status(500).json({ error: "Token exchange failed" });
        return;
      }

      const idToken = tokenData.id_token as string | undefined;
      if (!idToken) {
        req.log.error({ tokenData }, "No ID token in provider response");
        res.status(401).json({ error: "No ID token in response" });
        return;
      }

      const parts = idToken.split(".");
      if (parts.length !== 3) {
        res.status(401).json({ error: "Invalid ID token format" });
        return;
      }

      const claims = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      ) as Record<string, unknown>;

      const dbUser = await upsertUser(claims);

      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          address: dbUser.address ?? null,
        },
        access_token: tokenData.access_token as string,
        refresh_token: tokenData.refresh_token as string | undefined,
        expires_at: typeof claims.exp === "number" ? claims.exp : undefined,
      };

      const sid = await createSession(sessionData);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      req.log.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address: z.string().optional(),
  role: z.enum(["user", "organisme"]).optional().default("user"),
  organisationName: z.string().optional(),
  organisationCity: z.string().optional(),
  organisationPhone: z.string().optional(),
  organisationWebsite: z.string().optional(),
  plan: z.enum(["standard", "plus"]).optional().default("standard"),
});

router.post("/mobile-auth/register", async (req: Request, res: Response) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides. Vérifiez tous les champs." });
    return;
  }

  const { email, password, firstName, lastName, address, role, organisationName, organisationCity, organisationPhone, organisationWebsite, plan } = parsed.data;

  if (role === "organisme" && !organisationName) {
    res.status(400).json({ error: "Le nom de l'organisme est requis." });
    return;
  }

  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Un compte existe déjà avec cet email." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [newUser] = await db
      .insert(usersTable)
      .values({ email, firstName, lastName, passwordHash, address: address ?? null, role })
      .returning();

    let organisationId: string | null = null;

    if (role === "organisme") {
      const [newOrg] = await db
        .insert(organisationsTable)
        .values({
          userId: newUser.id,
          name: organisationName!,
          contactName: `${firstName} ${lastName}`,
          email,
          phone: organisationPhone ?? null,
          website: organisationWebsite ?? null,
          city: organisationCity ?? null,
          address: address ?? null,
          badgeVerified: false,
        })
        .returning();
      organisationId = newOrg.id;

      // Start 14-day trial subscription (no card required yet)
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await db.insert(subscriptionsTable).values({
        organisationId: newOrg.id,
        plan,
        interval: "month",
        status: "trialing",
        trialEnd,
      });
    }

    const sessionData: SessionData = {
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImageUrl: newUser.profileImageUrl,
        address: newUser.address ?? null,
        role,
      },
      access_token: "",
    };

    const sid = await createSession(sessionData);
    res.json({ token: sid, user: { ...sessionData.user, isPremium: !!newUser.isPremium }, organisationId });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Erreur serveur. Veuillez réessayer." });
  }
});

const EmailLoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/mobile-auth/email-login", async (req: Request, res: Response) => {
  const parsed = EmailLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email ou mot de passe invalide." });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Email ou mot de passe incorrect." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Email ou mot de passe incorrect." });
      return;
    }

    const sessionData: SessionData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        address: user.address ?? null,
        role: (user.role as "user" | "organisme") ?? "user",
      },
      access_token: "",
    };

    const sid = await createSession(sessionData);
    res.json({ token: sid, user: { ...sessionData.user, isPremium: !!user.isPremium } });
  } catch (err) {
    req.log.error({ err }, "Email login error");
    res.status(500).json({ error: "Erreur serveur. Veuillez réessayer." });
  }
});

const UpdateProfileBody = z.object({
  address: z.string().nullable().optional(),
});

router.patch("/mobile-auth/update-profile", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (!sid) {
    res.status(401).json({ error: "Non authentifié." });
    return;
  }

  const session = await getSession(sid);
  if (!session?.user?.id) {
    res.status(401).json({ error: "Session invalide." });
    return;
  }

  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }

  const { address } = parsed.data;

  try {
    await db
      .update(usersTable)
      .set({ address: address ?? null })
      .where(eq(usersTable.id, session.user.id));

    session.user.address = address ?? null;
    await updateSession(sid, session);

    res.json({ success: true, user: session.user });
  } catch (err) {
    req.log.error({ err }, "Update profile error");
    res.status(500).json({ error: "Erreur serveur. Veuillez réessayer." });
  }
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

const ForgotPasswordBody = z.object({
  email: z.string().email(),
});

router.post("/mobile-auth/forgot-password", async (req: Request, res: Response) => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Adresse courriel invalide." });
    return;
  }

  const { email } = parsed.data;

  try {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.json({ message: "Si un compte existe, un code vous sera envoyé." });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({
      email: email.toLowerCase(),
      code,
      expiresAt,
    });

    req.log.info({ email, code }, "Password reset code generated");

    res.json({ code, message: "Code de réinitialisation généré." });
  } catch (err) {
    req.log.error({ err }, "Forgot password error");
    res.status(500).json({ error: "Erreur serveur. Veuillez réessayer." });
  }
});

const ResetPasswordBody = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6),
});

router.post("/mobile-auth/reset-password", async (req: Request, res: Response) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }

  const { email, code, newPassword } = parsed.data;

  try {
    const [token] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.email, email.toLowerCase()),
          eq(passwordResetTokensTable.code, code),
          gt(passwordResetTokensTable.expiresAt, new Date()),
          isNull(passwordResetTokensTable.usedAt)
        )
      )
      .limit(1);

    if (!token) {
      res.status(400).json({ error: "Code invalide ou expiré." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.email, email.toLowerCase()));

    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, token.id));

    res.json({ success: true, message: "Mot de passe mis à jour avec succès." });
  } catch (err) {
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ error: "Erreur serveur. Veuillez réessayer." });
  }
});

export default router;
