import { Router } from "express";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const stripeRouter = Router();

// ─────────────────────────────────────────────
// POST /api/stripe/webhook  (raw body — registered BEFORE express.json())
// ─────────────────────────────────────────────
export async function handleStripeWebhook(req: any, res: any) {
  const signature = req.headers["stripe-signature"];
  if (!signature) return res.status(400).json({ error: "Missing signature" });

  try {
    // Acknowledge immediately — Stripe only needs a 200
    res.status(200).json({ received: true });
    logger.info("Stripe webhook received");
  } catch (err: any) {
    logger.error({ err }, "Stripe webhook error");
    res.status(400).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────
// POST /api/stripe/create-checkout-session
// Body: { email?: string, userId?: string, plan: "monthly" | "annual" }
// ─────────────────────────────────────────────
stripeRouter.post("/stripe/create-checkout-session", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { email, userId, plan = "monthly" } = req.body;

    const baseUrl =
      process.env.REPLIT_DEPLOYMENT === "1"
        ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`
        : `https://quebec-aid-finder.replit.app`;

    // Retrieve or create the price in Stripe
    const priceId = await getOrCreatePriceId(stripe, plan);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      currency: "cad",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      metadata: {
        userId: userId || "",
        plan,
        appName: "AttenteZéro",
      },
      subscription_data: {
        metadata: { userId: userId || "", plan },
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
// GET /api/stripe/subscription-status?userId=...&email=...
// ─────────────────────────────────────────────
stripeRouter.get("/stripe/subscription-status", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { email } = req.query as { email?: string };

    if (!email) return res.json({ active: false });

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
// Returns JSON receipt data for the app
// ─────────────────────────────────────────────
stripeRouter.get("/stripe/session-receipt", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { session_id } = req.query as { session_id: string };

    if (!session_id) return res.status(400).json({ error: "Missing session_id" });


    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["subscription", "customer"],
    });

    const customer = session.customer as any;
    const sub = session.subscription as any;

    return res.json({
      status: session.payment_status,
      customerEmail: customer?.email || session.customer_email,
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
// GET /api/stripe/payment-success?session_id=...
// HTML receipt page (opens in WebBrowser after payment)
// ─────────────────────────────────────────────
stripeRouter.get("/stripe/payment-success", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();
    const { session_id } = req.query as { session_id?: string };

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

    // Deep link back to the app
    const deepLink = `service-qc://payment-success?session_id=${session_id || ""}`;

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
        <span class="amount-value">${amount} $</span>
        <span class="amount-currency">${currency}</span>
      </div>
    </div>

    <div class="rows">
      <div class="row">
        <span class="row-label">Plan</span>
        <span class="plan-badge">⭐ Premium ${plan}</span>
      </div>
      <div class="row">
        <span class="row-label">Date</span>
        <span class="row-value">${dateStr}</span>
      </div>
      ${email ? `<div class="row"><span class="row-label">Courriel</span><span class="row-value">${email}</span></div>` : ""}
      <div class="row">
        <span class="row-label">Référence</span>
        <span class="row-value" style="font-size:11px;color:#94a3b8">${txId}</span>
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
    attentezero5@gmail.com · Ce reçu confirme votre abonnement<br>
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
// Helper: get or create the Stripe price for AttenteZéro Premium
// ─────────────────────────────────────────────
async function getOrCreatePriceId(stripe: any, plan: string): Promise<string> {
  const planKey = plan === "annual" ? "annual" : "monthly";
  const envKey = planKey === "annual"
    ? process.env.STRIPE_PRICE_ANNUAL_ID
    : process.env.STRIPE_PRICE_MONTHLY_ID;

  if (envKey) return envKey;

  // Search for existing product
  const products = await stripe.products.search({
    query: "name:'AttenteZéro Premium' AND active:'true'",
  });

  let productId: string;
  if (products.data.length > 0) {
    productId = products.data[0].id;
  } else {
    const product = await stripe.products.create({
      name: "AttenteZéro Premium",
      description:
        "Abonnement premium : suivi personnalisé, historique, alertes intelligentes, priorisation.",
      metadata: { app: "attentezero" },
    });
    productId = product.id;
  }

  // Search for existing price
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    recurring: { interval: planKey === "annual" ? "year" : "month" },
    currency: "cad",
  });

  if (prices.data.length > 0) return prices.data[0].id;

  // Create price
  const unitAmount = planKey === "annual" ? 4500 : 500; // $45/year or $5/month
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: "cad",
    recurring: {
      interval: planKey === "annual" ? "year" : "month",
    },
  });
  return price.id;
}

export default stripeRouter;
