const router = require('express').Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const db = require('../models/db');

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

router.post('/create-checkout', requireAuth, requireCompanyAccess, async (req, res) => {
  const { plan = 'pro', interval = 'month' } = req.body;
  const company = await db.get('SELECT * FROM nh_companies WHERE id = $1', [req.session.user.company_id]);

  try {
    const stripe = getStripe();
    let customer_id = company.stripe_customer_id;
    if (!customer_id) {
      const customer = await stripe.customers.create({ email: req.session.user.email, name: company.name, metadata: { company_id: company.id, product: 'nexhire' } });
      customer_id = customer.id;
      await db.run('UPDATE nh_companies SET stripe_customer_id = $1 WHERE id = $2', [customer_id, company.id]);
    }
    const priceId = interval === 'year' ? process.env.NEXHIRE_STRIPE_PRICE_PRO_YEARLY : process.env.NEXHIRE_STRIPE_PRICE_PRO_MONTHLY;
    if (!priceId) return res.status(400).json({ success: false, error: 'Pricing not configured yet. Contact sales.' });

    const BASE_URL = process.env.BASE_URL || 'https://nexhire.com';
    const session = await stripe.checkout.sessions.create({
      customer: customer_id, payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }], mode: 'subscription',
      success_url: `${BASE_URL}/nexhire/employer-dashboard?payment=success`,
      cancel_url: `${BASE_URL}/nexhire/pricing`,
      metadata: { company_id: company.id, plan },
      subscription_data: { trial_period_days: 14, metadata: { company_id: company.id, plan } }
    });
    res.json({ success: true, url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Payment setup failed' });
  }
});

router.get('/status', requireAuth, requireCompanyAccess, async (req, res) => {
  const company = await db.get('SELECT plan, plan_expires_at, active_job_slots, featured_job_slots FROM nh_companies WHERE id = $1', [req.session.user.company_id]);
  res.json({ success: true, ...company });
});

module.exports = router;
