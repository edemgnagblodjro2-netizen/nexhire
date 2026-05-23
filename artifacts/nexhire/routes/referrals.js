const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');

const REFERRAL_REWARD_DAYS = 30; // days of free Pro
const REFERRAL_REWARD_CREDITS = 20; // or AI credits

// GET /api/referrals/my — get my referral code + stats
router.get('/my', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    let { rows } = await db.query('SELECT referral_code FROM nh_users WHERE id=$1', [uid]);
    let code = rows[0]?.referral_code;
    if (!code) {
      code = uid.slice(0, 8).toUpperCase();
      await db.run('UPDATE nh_users SET referral_code=$1 WHERE id=$2', [code, uid]);
    }
    const { rows: refs } = await db.query(
      `SELECT r.id, r.reward_granted, r.created_at, u.first_name, u.last_name, u.email
       FROM nh_referrals r JOIN nh_users u ON u.id=r.referee_id
       WHERE r.referrer_id=$1 ORDER BY r.created_at DESC LIMIT 50`,
      [uid]
    );
    const BASE = (process.env.BASE_PATH || '/nexhire').replace(/\/$/, '');
    res.json({
      success: true,
      code,
      referral_url: `https://nexhire.ca${BASE}/?ref=${code}`,
      referrals: refs,
      total: refs.length,
      rewarded: refs.filter(r => r.reward_granted).length,
      reward_description_en: `Earn ${REFERRAL_REWARD_CREDITS} AI credits for each employer you refer who signs up.`,
      reward_description_fr: `Gagnez ${REFERRAL_REWARD_CREDITS} crédits IA pour chaque employeur que vous référez et qui s'inscrit.`,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/referrals/register — called on user registration if ?ref= present
router.post('/register', async (req, res) => {
  try {
    const { referee_id, ref_code } = req.body;
    if (!referee_id || !ref_code) return res.json({ success: false });

    const { rows } = await db.query('SELECT id FROM nh_users WHERE referral_code=$1', [ref_code.toUpperCase()]);
    if (!rows.length) return res.json({ success: false, error: 'Invalid referral code' });
    const referrer_id = rows[0].id;
    if (referrer_id === referee_id) return res.json({ success: false });

    await db.run('UPDATE nh_users SET referred_by=$1 WHERE id=$2', [referrer_id, referee_id]);
    await db.run(
      `INSERT INTO nh_referrals (id, referrer_id, referee_id, reward_granted) VALUES ($1,$2,$3,false) ON CONFLICT (referee_id) DO NOTHING`,
      [crypto.randomUUID(), referrer_id, referee_id]
    );

    // Grant referrer reward immediately
    await db.run('UPDATE nh_users SET ai_credits = COALESCE(ai_credits,0) + $1 WHERE id=$2', [REFERRAL_REWARD_CREDITS, referrer_id]);
    await db.run(
      `INSERT INTO nh_credit_transactions (id,user_id,amount,type,description) VALUES ($1,$2,$3,$4,$5)`,
      [crypto.randomUUID(), referrer_id, REFERRAL_REWARD_CREDITS, 'referral', `Referral reward — new signup`]
    );
    await db.run(
      `UPDATE nh_referrals SET reward_granted=true WHERE referrer_id=$1 AND referee_id=$2`,
      [referrer_id, referee_id]
    );

    // Notify referrer
    try {
      await db.run(
        `INSERT INTO nh_notifications (id, user_id, type, title, link) VALUES ($1,$2,$3,$4,$5)`,
        [crypto.randomUUID(), referrer_id, 'referral', `You earned ${REFERRAL_REWARD_CREDITS} AI credits from a referral!`, null]
      );
    } catch {}

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/referrals/leaderboard — top referrers
router.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.first_name, u.last_name, COUNT(r.id) as total
      FROM nh_referrals r JOIN nh_users u ON u.id=r.referrer_id
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total DESC LIMIT 10
    `);
    res.json({ success: true, leaderboard: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
