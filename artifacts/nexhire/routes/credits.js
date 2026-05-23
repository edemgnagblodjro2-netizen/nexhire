const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const CREDIT_PACKS = [
  { id: 'pack_10',  credits: 10,  price: 499,  label_en: '10 AI Credits',  label_fr: '10 crédits IA',  priceId: null },
  { id: 'pack_50',  credits: 50,  price: 1999, label_en: '50 AI Credits',  label_fr: '50 crédits IA',  priceId: null },
  { id: 'pack_200', credits: 200, price: 5999, label_en: '200 AI Credits', label_fr: '200 crédits IA', priceId: null },
];

// GET /api/credits/packs — list available packs
router.get('/packs', (req, res) => res.json({ success: true, packs: CREDIT_PACKS }));

// GET /api/credits/balance — current user credits
router.get('/balance', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT ai_credits, ai_credits_paid FROM nh_users WHERE id=$1',
      [req.session.user.id]
    );
    if (!rows.length) return res.json({ success: false, error: 'User not found' });
    const u = rows[0];
    res.json({ success: true, total: (u.ai_credits || 0) + (u.ai_credits_paid || 0), free: u.ai_credits || 0, paid: u.ai_credits_paid || 0 });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/credits/history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, amount, type, description, created_at FROM nh_credit_transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.session.user.id]
    );
    res.json({ success: true, transactions: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/credits/checkout — create Stripe checkout for credit pack
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { pack_id } = req.body;
    const pack = CREDIT_PACKS.find(p => p.id === pack_id);
    if (!pack) return res.status(400).json({ success: false, error: 'Invalid pack' });

    const { rows } = await db.query('SELECT email, first_name FROM nh_users WHERE id=$1', [req.session.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });

    const BASE = (process.env.BASE_PATH || '/nexhire').replace(/\/$/, '');
    const HOST = `${req.protocol}://${req.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: rows[0].email,
      line_items: [{
        price_data: {
          currency: 'cad',
          unit_amount: pack.price,
          product_data: { name: pack.label_en, description: `${pack.credits} AI credits for Nexhire` },
        },
        quantity: 1,
      }],
      metadata: { user_id: req.session.user.id, pack_id, credits: pack.credits },
      success_url: `${HOST}${BASE}/?credits_success=1&pack=${pack_id}`,
      cancel_url:  `${HOST}${BASE}/?credits_cancel=1`,
    });

    res.json({ success: true, url: session.url });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/credits/webhook — Stripe webhook to grant credits
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_CREDITS_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const { user_id, credits } = s.metadata || {};
    if (user_id && credits) {
      const n = parseInt(credits);
      await db.run('UPDATE nh_users SET ai_credits_paid = COALESCE(ai_credits_paid,0) + $1 WHERE id=$2', [n, user_id]);
      await db.run(
        `INSERT INTO nh_credit_transactions (id, user_id, amount, type, description, stripe_payment_id) VALUES ($1,$2,$3,$4,$5,$6)`,
        [crypto.randomUUID(), user_id, n, 'purchase', `Purchased ${n} AI credits`, s.payment_intent]
      );
    }
  }
  res.json({ received: true });
});

// POST /api/credits/spend — internal: spend 1 credit (called from AI route)
router.post('/spend', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { rows } = await db.query('SELECT ai_credits, ai_credits_paid FROM nh_users WHERE id=$1', [uid]);
    if (!rows.length) return res.status(404).json({ success: false });
    const u = rows[0];
    if ((u.ai_credits_paid || 0) > 0) {
      await db.run('UPDATE nh_users SET ai_credits_paid = ai_credits_paid - 1 WHERE id=$1', [uid]);
    } else if ((u.ai_credits || 0) > 0) {
      await db.run('UPDATE nh_users SET ai_credits = ai_credits - 1 WHERE id=$1', [uid]);
    } else {
      return res.json({ success: false, error: 'no_credits' });
    }
    await db.run(
      `INSERT INTO nh_credit_transactions (id,user_id,amount,type,description) VALUES ($1,$2,$3,$4,$5)`,
      [crypto.randomUUID(), uid, -1, 'spend', req.body.description || 'AI feature used']
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
