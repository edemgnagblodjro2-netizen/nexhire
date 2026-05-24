const router = require('express').Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const db = require('../models/db');

function getStripe() {
  const key = process.env.NEXHIRE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe not configured — add NEXHIRE_STRIPE_SECRET_KEY in Replit Secrets.');
  if (key.startsWith('mk_')) throw new Error('Invalid Stripe key — NEXHIRE_STRIPE_SECRET_KEY must start with sk_live_ or sk_test_');
  return require('stripe')(key);
}

// POST /api/payments/create-checkout
router.post('/create-checkout', requireAuth, requireCompanyAccess, async (req, res) => {
  const { plan = 'pro', interval = 'month' } = req.body;
  const company = await db.get('SELECT * FROM nh_companies WHERE id = $1', [req.session.user.company_id]);
  if (!company) return res.status(404).json({ success: false, error: 'Company not found. Please complete your company profile first.' });

  try {
    const stripe = getStripe();
    let customer_id = company.stripe_customer_id;
    if (!customer_id) {
      const customer = await stripe.customers.create({
        email: req.session.user.email,
        name: company.name,
        metadata: { company_id: company.id, product: 'nexhire' }
      });
      customer_id = customer.id;
      await db.run('UPDATE nh_companies SET stripe_customer_id = $1 WHERE id = $2', [customer_id, company.id]);
    }

    const priceId = interval === 'year'
      ? process.env.NEXHIRE_STRIPE_PRICE_PRO_YEARLY
      : process.env.NEXHIRE_STRIPE_PRICE_PRO_MONTHLY;

    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Pricing not configured — add NEXHIRE_STRIPE_PRICE_PRO_MONTHLY / NEXHIRE_STRIPE_PRICE_PRO_YEARLY in Replit Secrets.' });
    }

    const DEPLOY_URL = (process.env.REPLIT_DOMAINS || '').split(',')[0];
    const BASE_URL = DEPLOY_URL ? `https://${DEPLOY_URL}` : (process.env.BASE_URL || 'https://nexhire.ca');

    const session = await stripe.checkout.sessions.create({
      customer: customer_id,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${BASE_URL}/nexhire/?tab=billing&payment=success`,
      cancel_url:  `${BASE_URL}/nexhire/?tab=billing`,
      metadata: { company_id: company.id, plan },
      subscription_data: {
        trial_period_days: 14,
        metadata: { company_id: company.id, plan }
      }
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Payment setup failed' });
  }
});

// GET /api/payments/status
router.get('/status', requireAuth, async (req, res) => {
  if (!req.session.user.company_id) {
    return res.json({ success: true, plan: 'starter', active_job_slots: 2, featured_job_slots: 0, plan_expires_at: null });
  }
  const company = await db.get(
    'SELECT plan, plan_expires_at, active_job_slots, featured_job_slots FROM nh_companies WHERE id = $1',
    [req.session.user.company_id]
  );
  if (!company) return res.json({ success: true, plan: 'starter', active_job_slots: 2, featured_job_slots: 0 });
  res.json({ success: true, ...company });
});


// Standalone webhook handler (registered before express.json in server.js)
async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.NEXHIRE_STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    const stripe = getStripe();
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      : JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'invoice.payment_succeeded') {
    const obj = event.data.object;
    const company_id = obj.metadata?.company_id || obj.subscription_details?.metadata?.company_id;
    if (company_id) {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      await db.run(
        `UPDATE nh_companies SET plan = 'pro', active_job_slots = 10, featured_job_slots = 3, plan_expires_at = $1 WHERE id = $2`,
        [expiresAt.toISOString(), company_id]
      );
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const company_id = event.data.object.metadata?.company_id;
    if (company_id) {
      await db.run(
        `UPDATE nh_companies SET plan = 'starter', active_job_slots = 2, featured_job_slots = 0, plan_expires_at = NULL WHERE id = $1`,
        [company_id]
      );
    }
  }

  res.json({ received: true });
}

module.exports = router;
module.exports.webhook = webhookHandler;
