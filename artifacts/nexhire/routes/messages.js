const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');

async function notifyUser(userId, type, title, linkUrl) {
  try {
    await db.run(
      `INSERT INTO nh_notifications (id, user_id, type, title, link) VALUES ($1,$2,$3,$4,$5)`,
      [crypto.randomUUID(), userId, type, title, linkUrl || null]
    );
  } catch {}
}

router.get('/threads', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const threads = await db.all(`
      SELECT DISTINCT ON (a.id)
        a.id as application_id,
        j.title_en, j.title_fr,
        c.name as company_name, c.logo_url,
        u_cand.first_name as cand_first, u_cand.last_name as cand_last,
        (SELECT body FROM nh_messages WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM nh_messages WHERE application_id = a.id ORDER BY created_at DESC LIMIT 1) as last_at,
        (SELECT COUNT(*) FROM nh_messages WHERE application_id = a.id AND sender_id != $1 AND read_at IS NULL) as unread
      FROM nh_applications a
      JOIN nh_jobs j ON j.id = a.job_id
      JOIN nh_companies c ON c.id = j.company_id
      JOIN nh_users u_cand ON u_cand.id = a.candidate_id
      WHERE a.candidate_id = $1 OR c.owner_id = $1
      ORDER BY a.id, last_at DESC NULLS LAST
    `, [userId]);
    res.json({ success: true, threads });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/:applicationId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const appId = req.params.applicationId;

    const app = await db.get(`
      SELECT a.*, c.owner_id as employer_id
      FROM nh_applications a
      JOIN nh_jobs j ON j.id = a.job_id
      JOIN nh_companies c ON c.id = j.company_id
      WHERE a.id = $1
    `, [appId]);
    if (!app) return res.status(404).json({ success: false, error: 'Not found' });
    if (app.candidate_id !== userId && app.employer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const messages = await db.all(
      `SELECT m.*, u.first_name, u.last_name, u.role
       FROM nh_messages m JOIN nh_users u ON u.id = m.sender_id
       WHERE m.application_id = $1 ORDER BY m.created_at ASC`,
      [appId]
    );

    await db.run(
      `UPDATE nh_messages SET read_at = NOW()
       WHERE application_id = $1 AND sender_id != $2 AND read_at IS NULL`,
      [appId, userId]
    );

    res.json({ success: true, messages });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/:applicationId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const appId = req.params.applicationId;
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ success: false, error: 'Message required' });

    const app = await db.get(`
      SELECT a.*, c.owner_id as employer_id,
             j.title_en, j.title_fr,
             u_cand.first_name as cand_first
      FROM nh_applications a
      JOIN nh_jobs j ON j.id = a.job_id
      JOIN nh_companies c ON c.id = j.company_id
      JOIN nh_users u_cand ON u_cand.id = a.candidate_id
      WHERE a.id = $1
    `, [appId]);
    if (!app) return res.status(404).json({ success: false, error: 'Not found' });
    if (app.candidate_id !== userId && app.employer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const id = crypto.randomUUID();
    await db.run(
      `INSERT INTO nh_messages (id, application_id, sender_id, body) VALUES ($1,$2,$3,$4)`,
      [id, appId, userId, body.trim()]
    );

    const msg = await db.get(
      `SELECT m.*, u.first_name, u.last_name, u.role
       FROM nh_messages m JOIN nh_users u ON u.id = m.sender_id WHERE m.id = $1`, [id]
    );

    const recipientId = userId === app.candidate_id ? app.employer_id : app.candidate_id;
    const senderName = `${msg.first_name} ${msg.last_name}`;
    const jobTitle = app.title_en || app.title_fr;
    await notifyUser(recipientId, 'message',
      `New message from ${senderName} regarding "${jobTitle}"`,
      `/nexhire/#messages-${appId}`
    );

    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
