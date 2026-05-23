const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const notifs = await db.all('SELECT * FROM nh_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [req.session.user.id]);
  const unreadRes = await db.get('SELECT COUNT(*) as n FROM nh_notifications WHERE user_id = $1 AND read_at IS NULL', [req.session.user.id]);
  res.json({ success: true, notifications: notifs, unread: parseInt(unreadRes?.n || 0) });
});

router.post('/mark-read', requireAuth, async (req, res) => {
  const { ids } = req.body;
  if (ids?.length) {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    await db.run(`UPDATE nh_notifications SET read_at = NOW() WHERE id IN (${placeholders}) AND user_id = $${ids.length + 1}`, [...ids, req.session.user.id]);
  } else {
    await db.run('UPDATE nh_notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [req.session.user.id]);
  }
  res.json({ success: true });
});

module.exports = router;
