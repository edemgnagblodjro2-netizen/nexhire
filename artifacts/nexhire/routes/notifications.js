const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

// SSE client registry: userId → Set of res objects
const sseClients = new Map();

function pushToUser(userId, payload) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try { res.write(data); } catch {}
  }
}
module.exports.pushToUser = pushToUser;

// SSE stream endpoint
router.get('/stream', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(': connected\n\n');

  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch {}
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.get(userId)?.delete(res);
    if (sseClients.get(userId)?.size === 0) sseClients.delete(userId);
  });
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const notifs = await db.all(
      'SELECT * FROM nh_notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
      [req.session.user.id]
    );
    const unreadRes = await db.get(
      'SELECT COUNT(*) as n FROM nh_notifications WHERE user_id = $1 AND read_at IS NULL',
      [req.session.user.id]
    );
    res.json({ success: true, notifications: notifs, unread: parseInt(unreadRes?.n || 0) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/mark-read', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (ids?.length) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      await db.run(
        `UPDATE nh_notifications SET read_at = NOW() WHERE id IN (${placeholders}) AND user_id = $${ids.length + 1}`,
        [...ids, req.session.user.id]
      );
    } else {
      await db.run(
        'UPDATE nh_notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
        [req.session.user.id]
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
module.exports.pushToUser = pushToUser;
