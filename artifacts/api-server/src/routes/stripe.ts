import { Router } from "express";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";
import { db, subscriptionsTable, usersTable, organisationsTable, organisationMembersTable } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";
import { getSession, getSessionId } from "../lib/auth.js";

const stripeRouter = Router();

// Pricing — AttenteZéro
// Standard:    39$/mo,   390$/yr (-18%) — Organismes (B2B public)
// Plus:        89$/mo,   890$/yr (-18%) — Organismes Plus
// Terrain:     19$/mo,   190$/yr (-18%) — Travailleurs sociaux terrain (B2B individuel)
// Institution: 199$/mo, 1990$/yr (-18%) — CIUSSS / CLSC / refuges (équipe complète)
const PRICING = {
  standard:    { monthly:  3900, annual:  39000, productName: "AttenteZéro Standard" },
  plus:        { monthly:  8900, annual:  89000, productName: "AttenteZéro Plus" },
  terrain:     { monthly:  1900, annual:  19000, productName: "AttenteZéro Terrain (Intervenant)" },
  institution: { monthly: 19900, annual: 199000, productName: "AttenteZéro Institution (Équipe)" },
} as const;
type PlanKey = keyof typeof PRICING;
type IntervalKey = "monthly" | "annual";

// ─────────────────────────────────────────────
// POST /api/stripe/webhook  (raw body — registered BEFORE express.json())
// ─────────────────────────────────────────────
export async function handleStripeWebhook(req: any, res: any) {
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).json({ error: "Missing signature" });

  let event: any;
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      logger.error("STRIPE_WEBHOOK_SECRET is not configured — rejecting webhook request");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }
    const stripe = await getUncachableStripeClient();
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (err: any) {
    logger.error({ err: err.message }, "Stripe webhook signature verification failed");
    return res.status(400).json({ error: err.message });
  }

  // Acknowledge immediately, then process
  res.status(200).json({ received: true });

  try {
    const obj = event.data?.object as any;
    if (!obj) return;

    switch (event.type) {
      // ── User Premium 10$ one-time payment ──
      case "checkout.session.completed": {
        if (obj.payment_status !== "paid") break;
        const plan = obj.metadata?.plan;
        if (plan !== "user-premium") break; // Only handle user premium here

        const userId = obj.metadata?.userId || null;
        const email = obj.customer_details?.email || obj.customer_email || null;
        const sessionId = obj.id;

        // Match by userId first (most reliable), fall back to email
        const updates = {
          isPremium: true,
          premiumPurchasedAt: new Date(),
          premiumStripeSessionId: sessionId,
        };

        let updated: { id: string; email: string | null }[] = [];
        if (userId) {
          updated = await db
            .update(usersTable)
            .set(updates)
            .where(eq(usersTable.id, userId))
            .returning({ id: usersTable.id, email: usersTable.email });
        }
        if ((!updated || updated.length === 0) && email) {
          updated = await db
            .update(usersTable)
            .set(updates)
            .where(eq(usersTable.email, email))
            .returning({ id: usersTable.id, email: usersTable.email });
        }

        logger.info(
          { userId, email, sessionId, matched: updated?.length || 0 },
          "User Premium 10$ payment processed",
        );
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.trial_will_end": {
        const orgId = obj.metadata?.organisationId;
        if (!orgId) break;
        const item = obj.items?.data?.[0];
        const priceId = item?.price?.id;
        const interval = item?.price?.recurring?.interval || "month";
        const plan = (obj.metadata?.plan as PlanKey) || "standard";

        await db
          .update(subscriptionsTable)
          .set({
            stripeCustomerId: obj.customer,
            stripeSubscriptionId: obj.id,
            plan,
            interval: interval === "year" ? "year" : "month",
            status: obj.status,
            trialEnd: obj.trial_end ? new Date(obj.trial_end * 1000) : null,
            currentPeriodEnd: obj.current_period_end ? new Date(obj.current_period_end * 1000) : null,
            cancelAtPeriodEnd: !!obj.cancel_at_period_end,
          })
          .where(eq(subscriptionsTable.organisationId, orgId));
        logger.info({ orgId, plan, status: obj.status }, "Subscription updated from webhook");
        break;
      }
      case "customer.subscription.deleted": {
        if (!obj.id) break;
        await db
          .update(subscriptionsTable)
          .set({ status: "canceled", cancelAtPeriodEnd: true })
          .where(eq(subscriptionsTable.stripeSubscriptionId, obj.id));
        break;
      }
    }
  } catch (err: any) {
    logger.error({ err }, "Stripe webhook processing error");
  }
}

// ─────────────────────────────────────────────
// POST /api/stripe/create-checkout-session
// Body: { email?, userId?, organisationId?, plan: "standard"|"plus", interval: "monthly"|"annual" }
// ─────────────────────────────────────────────
stripeRouter.post("/stripe/create-checkout-session", async (req, res) => {
  try {
    const sid = getSessionId(req);
    const authSession = sid ? await getSession(sid) : null;
    if (!authSession?.user) {
      res.status(401).json({ error: "Authentification requise." });
      return;
    }
    const sessionUserId = authSession.user.id;

    const stripe = await getUncachableStripeClient();
    const { email, userId, organisationId, plan = "standard", interval = "monthly" } = req.body || {};

    // If an organisationId is provided, verify the authenticated user is an owner or admin of that org
    if (organisationId) {
      const [org] = await db
        .select({ id: organisationsTable.id })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisationId))
        .limit(1);

      if (!org) {
        res.status(404).json({ error: "Organisation introuvable." });
        return;
      }

      const [membership] = await db
        .select({ id: organisationMembersTable.id, role: organisationMembersTable.role })
        .from(organisationMembersTable)
        .where(
          and(
            eq(organisationMembersTable.organisationId, organisationId),
            eq(organisationMembersTable.userId, sessionUserId),
            eq(organisationMembersTable.status, "active"),
          ),
        )
        .limit(1);

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        res.status(403).json({ error: "Accès refusé : rôle propriétaire ou administrateur requis." });
        return;
      }
    }

    const planKey: PlanKey =
      plan === "plus"
        ? "plus"
        : plan === "terrain"
        ? "terrain"
        : plan === "institution"
        ? "institution"
        : "standard";
    const intervalKey: IntervalKey = interval === "annual" ? "annual" : "monthly";

    const baseUrl =
      process.env.REPLIT_DEPLOYMENT === "1"
        ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
        : `https://quebec-aid-finder.replit.app`;

    const priceId = await getOrCreatePriceId(stripe, planKey, intervalKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      currency: "cad",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      metadata: {
        userId: userId || "",
        organisationId: organisationId || "",
        plan: planKey,
        interval: intervalKey,
        appName: "AttenteZéro",
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: userId || "",
          organisationId: organisationId || "",
          plan: planKey,
        },
      },
      success_url: `${baseUrl}/api/stripe/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/api/stripe/payment-cancel`,
      locale: "fr",
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    logger.error({ err }, "Failed to create Stripe checkout session");
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/stripe/create-user-premium-session
// Body: { email?, userId? } → 10$ CAD ONE-TIME payment for user premium upgrade
// ─────────────────────────────────────────────
stripeRouter.post("/stripe/create-user-premium-session", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { email, userId } = req.body || {};

    const baseUrl =
      process.env.REPLIT_DEPLOYMENT === "1"
        ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
        : `https://quebec-aid-finder.replit.app`;

    const priceId = await getOrCreateUserPremiumPriceId(stripe);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      currency: "cad",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      metadata: {
        userId: userId || "",
        plan: "user-premium",
        appName: "AttenteZéro",
      },
      success_url: `${baseUrl}/api/stripe/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/api/stripe/payment-cancel`,
      locale: "fr",
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    logger.error({ err }, "Failed to create user premium session");
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/stripe/billing-portal
// Body: { organisationId } → returns URL to manage subscription
// ─────────────────────────────────────────────
stripeRouter.post("/stripe/billing-portal", async (req, res) => {
  try {
    const sid = getSessionId(req);
    const authSession = sid ? await getSession(sid) : null;
    if (!authSession?.user) {
      res.status(401).json({ error: "Authentification requise." });
      return;
    }
    const sessionUserId = authSession.user.id;

    const stripe = await getUncachableStripeClient();
    const { organisationId } = req.body || {};
    if (!organisationId) {
      res.status(400).json({ error: "organisationId required" });
      return;
    }

    // Verify the authenticated user is an owner or admin of the requested organisation
    const [membership] = await db
      .select({ id: organisationMembersTable.id, role: organisationMembersTable.role })
      .from(organisationMembersTable)
      .where(
        and(
          eq(organisationMembersTable.organisationId, organisationId),
          eq(organisationMembersTable.userId, sessionUserId),
          eq(organisationMembersTable.status, "active"),
        ),
      )
      .limit(1);

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      res.status(403).json({ error: "Accès refusé : rôle propriétaire ou administrateur requis." });
      return;
    }

    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.organisationId, organisationId))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      res.status(404).json({ error: "Aucun abonnement payant trouvé." });
      return;
    }

    const baseUrl =
      process.env.REPLIT_DEPLOYMENT === "1"
        ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
        : `https://quebec-aid-finder.replit.app`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${baseUrl}/admin/organisme/dashboard`,
    });
    res.json({ url: portal.url });
  } catch (err: any) {
    logger.error({ err }, "Failed to create billing portal session");
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/stripe/user-portal
// Body: { email } → returns Stripe billing portal URL for an individual user
// (manages Premium one-time purchases AND any active subscriptions)
// ─────────────────────────────────────────────
stripeRouter.post("/stripe/user-portal", async (req, res) => {
  try {
    // ── AUTH: only the logged-in user can open their own billing portal.
    // We trust the email from the session, NOT from the request body, to
    // prevent an attacker from looking up another user's billing portal.
    const sid = getSessionId(req);
    const session = sid ? await getSession(sid) : null;
    const sessionEmail = session?.user?.email;
    if (!sessionEmail) {
      res.status(401).json({ error: "Authentification requise." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const customers = await stripe.customers.list({ email: sessionEmail, limit: 1 });
    if (!customers.data.length) {
      res.status(404).json({ error: "Aucun compte de facturation trouvé pour cet email." });
      return;
    }
    const customerId = customers.data[0].id;

    const baseUrl =
      process.env.REPLIT_DEPLOYMENT === "1"
        ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
        : `https://quebec-aid-finder.replit.app`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/`,
    });
    res.json({ url: portal.url });
  } catch (err: any) {
    logger.error({ err }, "Failed to create user billing portal session");
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/stripe/subscription-status
// Requires authentication — returns the subscription status for the current user only.
// ─────────────────────────────────────────────
stripeRouter.get("/stripe/subscription-status", async (req, res) => {
  try {
    const sid = getSessionId(req);
    const authSession = sid ? await getSession(sid) : null;
    if (!authSession?.user?.email) {
      return res.status(401).json({ error: "Authentification requise." });
    }
    const email = authSession.user.email;

    const stripe = await getUncachableStripeClient();

    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) return res.json({ active: false });

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (!subscriptions.data.length) return res.json({ active: false });

    const sub = subscriptions.data[0] as any;
    return res.json({
      active: true,
      plan: sub.metadata?.plan || "monthly",
      currentPeriodEnd: sub.current_period_end,
      subscriptionId: sub.id,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to get subscription status");
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/stripe/session-receipt?session_id=...
// Requires authentication — returns receipt data only for the authenticated user's own session.
// ─────────────────────────────────────────────
stripeRouter.get("/stripe/session-receipt", async (req, res) => {
  try {
    const sid = getSessionId(req);
    const authSession = sid ? await getSession(sid) : null;
    if (!authSession?.user) {
      return res.status(401).json({ error: "Authentification requise." });
    }
    const sessionUserEmail = authSession.user.email;
    const sessionUserId = authSession.user.id;

    const stripe = await getUncachableStripeClient();
    const { session_id } = req.query as { session_id: string };

    if (!session_id) return res.status(400).json({ error: "Missing session_id" });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "customer"],
    });

    // Verify this session belongs to the authenticated user (by email or userId in metadata)
    const customer = session.customer as any;
    const sessionEmail = customer?.email || session.customer_email;
    const metaUserId = session.metadata?.userId;
    const ownsSession =
      (sessionUserEmail && sessionEmail && sessionEmail.toLowerCase() === sessionUserEmail.toLowerCase()) ||
      (metaUserId && metaUserId === sessionUserId);

    if (!ownsSession) {
      return res.status(403).json({ error: "Accès refusé à ce reçu." });
    }

    const sub = session.subscription as any;

    return res.json({
      status: session.payment_status,
      customerEmail: sessionEmail,
      customerName: customer?.name || null,
      amount: session.amount_total ? session.amount_total / 100 : 5,
      currency: (session.currency || "cad").toUpperCase(),
      plan: session.metadata?.plan || "monthly",
      sessionId: session.id,
      subscriptionId: sub?.id || null,
      createdAt: session.created,
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to get session receipt");
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// Helper: HTML-escape a string to prevent XSS in server-rendered HTML
// ─────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────────
// GET /api/stripe/payment-success?session_id=...
// HTML receipt page (opens in WebBrowser after payment)
// ─────────────────────────────────────────────
stripeRouter.get("/stripe/payment-success", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    // Validate: session IDs are alphanumeric with underscores only
    const rawSessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";
    const session_id = /^[a-zA-Z0-9_]+$/.test(rawSessionId) ? rawSessionId : "";

    let amount = "5,00";
    let currency = "CAD";
    let plan = "Mensuel";
    let email = "";
    let dateStr = new Date().toLocaleDateString("fr-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    let txId = session_id || "—";

    if (session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(session_id, {
          expand: ["customer"],
        });
        const customer = session.customer as any;
        email = customer?.email || session.customer_email || "";
        amount = session.amount_total
          ? (session.amount_total / 100).toFixed(2).replace(".", ",")
          : "5,00";
        currency = (session.currency || "cad").toUpperCase();
        plan = session.metadata?.plan === "annual" ? "Annuel" : "Mensuel";
        dateStr = new Date(session.created * 1000).toLocaleDateString("fr-CA", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch (_) {}
    }

    // Deep link back to the app — URL-encode the session_id, then HTML-escape the href
    const deepLink = escapeHtml(`service-qc://payment-success?session_id=${encodeURIComponent(session_id)}`);

    // HTML-escape all values that go into the page
    const safeAmount = escapeHtml(amount);
    const safeCurrency = escapeHtml(currency);
    const safePlan = escapeHtml(plan);
    const safeDateStr = escapeHtml(dateStr);
    const safeEmail = escapeHtml(email);
    const safeTxId = escapeHtml(txId);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<title>Reçu — AttenteZéro Premium</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f8fafc;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .card {
    background: #fff;
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.10);
    max-width: 460px;
    width: 100%;
    overflow: hidden;
  }
  .header {
    background: linear-gradient(135deg, #1e40af 0%, #7c3aed 60%, #a21caf 100%);
    padding: 32px 28px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    top: -60px; right: -40px;
  }
  .logo-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .logo-icon {
    width: 44px; height: 44px;
    background: rgba(255,255,255,0.15);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
  }
  .logo-name {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.3px;
  }
  .check-circle {
    width: 64px; height: 64px;
    background: rgba(255,255,255,0.18);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 30px;
    margin: 0 auto 12px;
    border: 2px solid rgba(255,255,255,0.25);
  }
  .header h1 { color: #fff; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  .header p { color: rgba(255,255,255,0.78); font-size: 13px; }
  .body { padding: 28px; }
  .amount-box {
    background: linear-gradient(135deg, #f5f3ff, #ede9fe);
    border: 1px solid #ddd6fe;
    border-radius: 16px;
    padding: 20px;
    text-align: center;
    margin-bottom: 24px;
  }
  .amount-label { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .amount-value { font-size: 38px; font-weight: 700; color: #1e40af; }
  .amount-currency { font-size: 16px; color: #7c3aed; margin-left: 4px; }
  .rows { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
  .row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9; }
  .row:last-child { border-bottom: none; padding-bottom: 0; }
  .row-label { font-size: 13px; color: #64748b; }
  .row-value { font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; max-width: 200px; word-break: break-all; }
  .plan-badge {
    background: #7c3aed;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.3px;
  }
  .actions { display: flex; flex-direction: column; gap: 10px; }
  .btn-primary {
    display: block;
    background: linear-gradient(135deg, #1e40af, #7c3aed);
    color: #fff;
    text-align: center;
    padding: 14px 20px;
    border-radius: 12px;
    text-decoration: none;
    font-size: 15px;
    font-weight: 600;
    border: none;
    cursor: pointer;
  }
  .btn-secondary {
    display: block;
    background: #f8fafc;
    color: #475569;
    border: 1px solid #e2e8f0;
    text-align: center;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
  }
  .footer {
    padding: 20px 28px;
    border-top: 1px solid #f1f5f9;
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.6;
  }
  @media print {
    body { background: #fff; }
    .actions { display: none !important; }
    .card { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div class="logo-row">
      <div class="logo-icon">🕐</div>
      <span class="logo-name">AttenteZéro</span>
    </div>
    <div class="check-circle">✅</div>
    <h1>Paiement confirmé</h1>
    <p>Merci pour votre abonnement Premium !</p>
  </div>

  <div class="body">
    <div class="amount-box">
      <div class="amount-label">Montant payé</div>
      <div>
        <span class="amount-value">${safeAmount} $</span>
        <span class="amount-currency">${safeCurrency}</span>
      </div>
    </div>

    <div class="rows">
      <div class="row">
        <span class="row-label">Plan</span>
        <span class="plan-badge">⭐ Premium ${safePlan}</span>
      </div>
      <div class="row">
        <span class="row-label">Date</span>
        <span class="row-value">${safeDateStr}</span>
      </div>
      ${safeEmail ? `<div class="row"><span class="row-label">Courriel</span><span class="row-value">${safeEmail}</span></div>` : ""}
      <div class="row">
        <span class="row-label">Référence</span>
        <span class="row-value" style="font-size:11px;color:#94a3b8">${safeTxId}</span>
      </div>
      <div class="row">
        <span class="row-label">État</span>
        <span style="color:#10b981;font-weight:600;font-size:13px">✓ Payé</span>
      </div>
    </div>

    <div class="actions">
      <a href="${deepLink}" class="btn-primary">↩ Retourner à AttenteZéro</a>
      <button class="btn-secondary" onclick="window.print()">📄 Télécharger le reçu (PDF)</button>
    </div>
  </div>

  <div class="footer">
    AttenteZéro — Services communautaires du Québec<br>
    contact@attentezero.ca · Ce reçu confirme votre abonnement<br>
    Annulable à tout moment depuis les paramètres de l'app
  </div>
</div>
</body>
</html>`);
  } catch (err: any) {
    logger.error({ err }, "Failed to render payment success page");
    res.status(500).send("Erreur lors de la génération du reçu.");
  }
});

// ─────────────────────────────────────────────
// GET /api/stripe/payment-cancel
// ─────────────────────────────────────────────
stripeRouter.get("/stripe/payment-cancel", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Paiement annulé</title>
<style>
  body { font-family: -apple-system, sans-serif; display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc; }
  .card { background:#fff;border-radius:20px;padding:40px 28px;text-align:center;max-width:380px;box-shadow:0 4px 20px rgba(0,0,0,.08); }
  .icon { font-size:48px; margin-bottom:16px; }
  h2 { font-size:20px; color:#1e293b; margin-bottom:8px; }
  p { color:#64748b; font-size:14px; margin-bottom:24px; }
  a { display:inline-block;background:#0e7e6e;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600; }
</style>
</head>
<body>
<div class="card">
  <div class="icon">↩️</div>
  <h2>Paiement annulé</h2>
  <p>Votre paiement n'a pas été traité. Vous pouvez réessayer à tout moment.</p>
  <a href="service-qc://payment-cancel">Retourner à l'app</a>
</div>
</body>
</html>`);
});

// ─────────────────────────────────────────────
// Helper: get or create Stripe price for a (plan, interval) combo
// ─────────────────────────────────────────────
async function getOrCreateUserPremiumPriceId(stripe: any): Promise<string> {
  const productName = "AttenteZéro Premium (Utilisateur)";
  const unitAmount = 1999; // 19.99 CAD

  const products = await stripe.products.search({
    query: `name:'${productName}' AND active:'true'`,
  });

  let productId: string;
  if (products.data.length > 0) {
    productId = products.data[0].id;
  } else {
    const product = await stripe.products.create({
      name: productName,
      description: "Accès Premium à vie : chat IA illimité, favoris, alertes personnalisées.",
      metadata: { app: "attentezero", plan: "user-premium" },
    });
    productId = product.id;
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: "one_time",
    currency: "cad",
    limit: 10,
  });

  const matching = prices.data.find((p: any) => p.unit_amount === unitAmount);
  if (matching) return matching.id;

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: "cad",
  });
  return price.id;
}

async function getOrCreatePriceId(stripe: any, plan: PlanKey, interval: IntervalKey): Promise<string> {
  const productName = PRICING[plan].productName;
  const stripeInterval = interval === "annual" ? "year" : "month";
  const unitAmount = PRICING[plan][interval];

  const products = await stripe.products.search({
    query: `name:'${productName}' AND active:'true'`,
  });

  let productId: string;
  if (products.data.length > 0) {
    productId = products.data[0].id;
  } else {
    const product = await stripe.products.create({
      name: productName,
      description: plan === "plus"
        ? "Forfait Plus — Profil organisme, badge vérifié, statistiques détaillées, mise en avant prioritaire."
        : "Forfait Standard — Profil organisme, badge vérifié, statistiques basiques.",
      metadata: { app: "attentezero", plan },
    });
    productId = product.id;
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    recurring: { interval: stripeInterval },
    currency: "cad",
    limit: 10,
  });

  const matching = prices.data.find((p: any) => p.unit_amount === unitAmount);
  if (matching) return matching.id;

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: "cad",
    recurring: { interval: stripeInterval },
  });
  return price.id;
}

export default stripeRouter;
