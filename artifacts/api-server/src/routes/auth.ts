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
import { db, usersTable, passwordResetTokensTable, organisationsTable, subscriptionsTable, organisationMembersTable } from "@workspace/db";
import { claimPendingInvites } from "./team";
import { verifyCaptcha } from "./captcha";
import { eq, and, gt, isNull, inArray } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  deleteAllSessionsByEmail,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";
import { sendEmailTo } from "../lib/notify";

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

  // Fetch fresh isPremium + plan from DB (in case it was upgraded since last login)
  let isPremium = false;
  let plan: string | null = null;
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

      // Collect every org the user belongs to (owner or active member), then pick
      // the plan from whichever has an active subscription. Falls back to the
      // first owned org's plan if nothing is active.
      const orgIds = new Set<string>();
      const ownedOrgs = await db
        .select({ id: organisationsTable.id })
        .from(organisationsTable)
        .where(eq(organisationsTable.userId, userId));
      for (const o of ownedOrgs) if (o.id) orgIds.add(o.id);
      const memberOrgs = await db
        .select({ id: organisationMembersTable.organisationId })
        .from(organisationMembersTable)
        .where(
          and(
            eq(organisationMembersTable.userId, userId),
            eq(organisationMembersTable.status, "active"),
          ),
        );
      for (const m of memberOrgs) if (m.id) orgIds.add(m.id);

      if (orgIds.size > 0) {
        const subs = await db
          .select({
            plan: subscriptionsTable.plan,
            status: subscriptionsTable.status,
          })
          .from(subscriptionsTable)
          .where(
            inArray(subscriptionsTable.organisationId, Array.from(orgIds)),
          );
        const active = subs.find((s) =>
          s.status === "active" ||
          s.status === "trialing" ||
          s.status === "past_due",
        );
        plan = active?.plan ?? subs[0]?.plan ?? null;
      }
    }
  } catch {}

  res.json({ user: { ...req.user, role, isPremium, plan } });
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
  role: z.enum(["user", "organisme", "intervenant", "partenaire"]).optional().default("user"),
  organisationName: z.string().optional(),
  organisationCity: z.string().optional(),
  organisationPhone: z.string().optional(),
  organisationWebsite: z.string().optional(),
  professionalTitle: z.string().optional(),
  affiliation: z.string().optional(),
  plan: z.enum(["standard", "plus", "terrain", "organisme", "partenaire", "institution"]).optional().default("standard"),
  // Anti-bot fields — required for organisme/partenaire signups (high-stakes).
  // Citizens get the silent honeypot only.
  captchaToken: z.string().optional(),
  captchaAnswer: z.union([z.string(), z.number()]).optional(),
  honeypot: z.string().optional(),
});

router.post("/mobile-auth/register", async (req: Request, res: Response) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides. Vérifiez tous les champs." });
    return;
  }

  // v1.1.8 — Public self-signup re-enabled for organisme + partenaire.
  // Citizen accounts remain default. Organisme = community org / OBNL with
  // its own public listing. Partenaire = institutional supporter / donor,
  // also tracked in organisationsTable but with kind="partenaire" so the
  // public directory can filter / badge them differently. Privileges are
  // applied later by reading user.role + org.kind on the client.
  const {
    email,
    password,
    firstName,
    lastName,
    address,
    role: requestedRole,
    organisationName,
    organisationCity,
    organisationPhone,
    organisationWebsite,
    professionalTitle,
    affiliation,
  } = parsed.data;

  // We map "partenaire" to role="organisme" in the users.role column (which
  // historically only stores user/organisme/intervenant) but tag the org row
  // with kind="partenaire" so we can distinguish the two downstream.
  const role: "user" | "organisme" | "intervenant" =
    requestedRole === "partenaire" ? "organisme" : requestedRole;
  const orgKind: "organisme" | "intervenant" | "partenaire" =
    requestedRole === "partenaire" ? "partenaire" : (role === "intervenant" ? "intervenant" : "organisme");
  const plan: "standard" | "partenaire" =
    requestedRole === "partenaire" ? "partenaire" : "standard";

  // Organisme / Partenaire need a name for their public listing.
  if ((requestedRole === "organisme" || requestedRole === "partenaire") && !organisationName?.trim()) {
    res.status(400).json({ error: "Le nom de l'organisme est requis." });
    return;
  }

  // ── Anti-bot defense ─────────────────────────────────────────────────
  // Honeypot is checked for every signup (citizen included). The signed
  // math captcha + min-age check is only enforced for organisme/partenaire
  // — those leads are higher-value and worth the extra friction.
  const honeypot = parsed.data.honeypot;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    req.log.warn({ ip: req.ip }, "Honeypot tripped on register");
    res.status(400).json({ error: "Vérification anti-bot échouée." });
    return;
  }
  if (requestedRole === "organisme" || requestedRole === "partenaire") {
    const captchaErr = verifyCaptcha({
      captchaToken: parsed.data.captchaToken,
      captchaAnswer: parsed.data.captchaAnswer,
      honeypot,
      requireHoneypot: true, // bot omitting the hidden field = rejected
    });
    if (captchaErr) {
      req.log.info({ ip: req.ip, role: requestedRole }, "Captcha failed");
      res.status(400).json({ error: captchaErr });
      return;
    }
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
          kind: orgKind,
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

      // Owner row for multi-seat support
      await db.insert(organisationMembersTable).values({
        organisationId: newOrg.id,
        userId: newUser.id,
        invitedEmail: email.toLowerCase(),
        role: "owner",
        status: "active",
        joinedAt: new Date(),
      });
    } else if (role === "intervenant") {
      // Self-org for the intervenant — not displayed publicly
      const [newOrg] = await db
        .insert(organisationsTable)
        .values({
          userId: newUser.id,
          name: `${firstName} ${lastName}`,
          contactName: `${firstName} ${lastName}`,
          email,
          phone: organisationPhone ?? null,
          city: organisationCity ?? null,
          address: address ?? null,
          badgeVerified: false,
          kind: "intervenant",
          professionalTitle: professionalTitle ?? null,
          affiliation: affiliation ?? null,
        })
        .returning();
      organisationId = newOrg.id;

      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await db.insert(subscriptionsTable).values({
        organisationId: newOrg.id,
        plan: "terrain",
        interval: "month",
        status: "trialing",
        trialEnd,
      });

      await db.insert(organisationMembersTable).values({
        organisationId: newOrg.id,
        userId: newUser.id,
        invitedEmail: email.toLowerCase(),
        role: "owner",
        status: "active",
        joinedAt: new Date(),
      });
    }

    // ── Confirmation email for organisme / partenaire / intervenant ──────────
    if (organisationId && (requestedRole === "organisme" || requestedRole === "partenaire" || requestedRole === "intervenant")) {
      const orgDisplayName = organisationName?.trim() || `${firstName} ${lastName}`;
      const isIntervenant = requestedRole === "intervenant";
      const confirmSubject = "AttenteZéro — Votre inscription a bien été reçue";
      const confirmText =
`Bonjour ${firstName},

Votre inscription sur AttenteZéro a bien été enregistrée.

Organisme : ${orgDisplayName}
Contact : ${firstName} ${lastName}
Courriel : ${email}

${isIntervenant
  ? "Votre profil d'intervenant est maintenant actif. Un essai de 14 jours vous a été accordé."
  : "Votre demande est en attente de vérification par notre équipe. Vous recevrez une notification dès que votre fiche sera approuvée et visible dans l'annuaire."
}

En attendant, vous pouvez vous connecter à tout moment pour compléter votre profil et explorer les fonctionnalités disponibles.

Pour toute question : info@civicai.ca

— L'équipe AttenteZéro / CivicAI`;

      const safeOrgName = orgDisplayName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeFirstName = firstName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeEmail = email.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeContact = `${firstName} ${lastName}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const confirmHtml = `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#1e3a5f;padding:24px 32px;border-radius:12px 12px 0 0">
    <h2 style="color:#ffffff;margin:0;font-size:18px">Inscription reçue — bienvenue !</h2>
    <p style="color:#93c5fd;margin:8px 0 0;font-size:14px">AttenteZéro par CivicAI</p>
  </div>
  <div style="background:#f8fafc;padding:24px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
      Bonjour <strong>${safeFirstName}</strong>,
    </p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155">
      Votre inscription sur <strong>AttenteZéro</strong> a bien été enregistrée.
      ${isIntervenant
        ? "Votre profil d&apos;intervenant est maintenant actif avec un essai de <strong>14 jours</strong>."
        : "Votre fiche est <strong>en attente de vérification</strong> par notre équipe. Vous serez notifié(e) par courriel dès qu&apos;elle sera approuvée et visible dans l&apos;annuaire."
      }
    </p>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin-bottom:20px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:5px 0;color:#64748b;font-size:13px;width:140px">Organisme</td>
          <td style="padding:5px 0;font-size:13px;font-weight:600">${safeOrgName}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748b;font-size:13px">Contact</td>
          <td style="padding:5px 0;font-size:13px">${safeContact}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#64748b;font-size:13px">Courriel</td>
          <td style="padding:5px 0;font-size:13px">${safeEmail}</td>
        </tr>
      </table>
    </div>
    ${isIntervenant ? "" : `
    <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px">
      <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.5">
        <strong>Prochaine étape :</strong> Notre équipe examine votre demande et vous contactera sous peu pour finaliser la vérification de votre organisme.
      </p>
    </div>`}
    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6">
      Des questions ? Écrivez-nous à
      <a href="mailto:info@civicai.ca" style="color:#0e7e6e;text-decoration:none;font-weight:600">info@civicai.ca</a>.
    </p>
  </div>
  <p style="color:#94a3b8;font-size:11px;margin-top:12px;text-align:center">
    CivicAI — NEQ 2280791601 — Québec, Canada
  </p>
</div>`;

      sendEmailTo(email, { subject: confirmSubject, text: confirmText, html: confirmHtml })
        .then((r) => {
          if (!r.sent) req.log.warn({ reason: r.reason }, "Org confirmation email not sent");
        })
        .catch((err) => req.log.warn({ err }, "Org confirmation email exception"));
    }

    // Claim any pending team invitations addressed to this email
    const claimed = await claimPendingInvites(newUser.id, newUser.email);

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
    res.json({ token: sid, user: { ...sessionData.user, isPremium: !!newUser.isPremium }, organisationId, joinedTeams: claimed });
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

    // Claim any pending team invitations addressed to this email (idempotent)
    await claimPendingInvites(user.id, user.email);

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

// Per-account cooldown: one reset request per email every 2 minutes.
const RESET_COOLDOWN_MS = 2 * 60 * 1000;
// Token lifetime: 15 minutes (reduced from 30 to limit brute-force window).
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

router.post("/mobile-auth/forgot-password", async (req: Request, res: Response) => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Adresse courriel invalide." });
    return;
  }

  const { email } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Always return the same neutral message to avoid email enumeration.
  const neutralResponse = { message: "Si un compte existe, un code vous sera envoyé." };

  try {
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail))
      .limit(1);

    if (!user) {
      res.json(neutralResponse);
      return;
    }

    // Enforce per-account cooldown: reject if a token was already issued recently.
    const cooldownCutoff = new Date(Date.now() - RESET_COOLDOWN_MS);
    const [recentToken] = await db
      .select({ createdAt: passwordResetTokensTable.createdAt })
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.email, normalizedEmail),
          isNull(passwordResetTokensTable.usedAt),
          gt(passwordResetTokensTable.createdAt, cooldownCutoff)
        )
      )
      .limit(1);

    if (recentToken) {
      // Return the same neutral message so the account existence is not revealed
      // and so the cooldown cannot be detected by response differences.
      res.json(neutralResponse);
      return;
    }

    // Invalidate all previous unused tokens for this email before creating a new one.
    // This ensures only one valid token can exist per account at any time.
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokensTable.email, normalizedEmail),
          isNull(passwordResetTokensTable.usedAt)
        )
      );

    // Generate a cryptographically secure 32-byte (256-bit) token (used in
    // the magic link) AND a 6-digit short code (used for manual entry).
    const { randomBytes, randomInt } = await import("node:crypto");
    const code = randomBytes(32).toString("hex");
    const shortCode = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await db.insert(passwordResetTokensTable).values({
      email: normalizedEmail,
      code,
      shortCode,
      expiresAt,
    });

    // Never log the codes themselves, and never return them to the client.
    req.log.info({ userId: user.id }, "Password reset token generated");

    // Send the email (best-effort — never block the response on email).
    const origin = process.env.APP_PUBLIC_URL ?? "https://attentezero.ca";
    const link = `${origin}/reset-password?email=${encodeURIComponent(normalizedEmail)}&code=${code}`;
    const subject = "AttenteZéro — Réinitialisation de votre mot de passe";
    const text =
`Bonjour,

Vous avez demandé à réinitialiser votre mot de passe AttenteZéro.

VOTRE CODE DE VÉRIFICATION : ${shortCode}
(Tapez ces 6 chiffres dans l'écran de l'app)

OU cliquez sur ce lien :
${link}

Ce code et ce lien sont valides pendant 15 minutes.

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message — votre mot de passe ne sera pas modifié.

— L'équipe AttenteZéro`;
    const html =
`<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
  <h2 style="color:#0e7e6e;margin:0 0 16px">Réinitialisation de votre mot de passe</h2>
  <p style="font-size:15px;line-height:1.5">Bonjour,<br>Vous avez demandé à réinitialiser votre mot de passe AttenteZéro.</p>
  <div style="background:#f1f5f9;border:2px dashed #0e7e6e;border-radius:12px;padding:18px;text-align:center;margin:20px 0">
    <div style="font-size:13px;color:#475569;margin-bottom:6px">Votre code de vérification</div>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0e7e6e;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${shortCode}</div>
  </div>
  <p style="font-size:14px;text-align:center;margin:20px 0">— OU —</p>
  <p style="text-align:center;margin:16px 0">
    <a href="${link}" style="display:inline-block;background:#0e7e6e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Réinitialiser maintenant</a>
  </p>
  <p style="font-size:13px;color:#64748b;line-height:1.5;margin-top:24px">Ce code et ce lien sont valides pendant <b>15 minutes</b>.<br>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
  <p style="font-size:12px;color:#94a3b8;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px">— L'équipe AttenteZéro</p>
</div>`;

    sendEmailTo(normalizedEmail, { subject, text, html })
      .then((r) => {
        if (!r.sent) req.log.warn({ reason: r.reason }, "Reset email not sent");
      })
      .catch((err) => req.log.warn({ err }, "Reset email exception"));

    res.json(neutralResponse);
  } catch (err) {
    req.log.error({ err }, "Forgot password error");
    res.status(500).json({ error: "Erreur serveur. Veuillez réessayer." });
  }
});

const ResetPasswordBody = z.object({
  email: z.string().email(),
  // Accept either the 64-char hex magic-link token OR the 6-digit short code.
  code: z.string().refine(
    (v) => /^[0-9a-f]{64}$/.test(v) || /^[0-9]{6}$/.test(v),
    { message: "Code invalide." },
  ),
  newPassword: z.string().min(6),
});

router.post("/mobile-auth/reset-password", async (req: Request, res: Response) => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides." });
    return;
  }

  const { email, code, newPassword } = parsed.data;
  const isShortCode = /^[0-9]{6}$/.test(code);
  const MAX_SHORT_CODE_ATTEMPTS = 5;

  try {
    // Look up the most recent live token for this email (any non-expired,
    // unused token). We then check the supplied code against EITHER the
    // long magic-link token OR the 6-digit short code.
    const [token] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.email, email.toLowerCase()),
          gt(passwordResetTokensTable.expiresAt, new Date()),
          isNull(passwordResetTokensTable.usedAt)
        )
      )
      .orderBy(passwordResetTokensTable.createdAt)
      .limit(1);

    if (!token) {
      res.status(400).json({ error: "Code invalide ou expiré." });
      return;
    }

    // Enforce attempt cap on the 6-digit code (low entropy = brute-forceable
    // without a cap). The 64-char magic-link token is high-entropy and does
    // not need a cap.
    if (isShortCode && (token.attempts ?? 0) >= MAX_SHORT_CODE_ATTEMPTS) {
      // Burn the token so the attacker cannot keep guessing.
      await db
        .update(passwordResetTokensTable)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokensTable.id, token.id));
      res.status(400).json({ error: "Trop de tentatives. Demandez un nouveau code." });
      return;
    }

    const matches = isShortCode
      ? token.shortCode === code
      : token.code === code;

    if (!matches) {
      if (isShortCode) {
        await db
          .update(passwordResetTokensTable)
          .set({ attempts: (token.attempts ?? 0) + 1 })
          .where(eq(passwordResetTokensTable.id, token.id));
      }
      res.status(400).json({ error: "Code invalide ou expiré." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.email, email.toLowerCase()));

    // Invalidate ALL outstanding tokens for this email (not just the matched one)
    // so that any tokens that may have been issued concurrently are revoked.
    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokensTable.email, email.toLowerCase()),
          isNull(passwordResetTokensTable.usedAt)
        )
      );

    await deleteAllSessionsByEmail(email);

    res.json({ success: true, message: "Mot de passe mis à jour avec succès." });
  } catch (err) {
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ error: "Erreur serveur. Veuillez réessayer." });
  }
});

export default router;
