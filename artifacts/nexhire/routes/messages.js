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

// Check if userId has access to an application (as candidate or employer)
async function getAppWithAccess(appId, userId, companyId) {
  return db.get(`
    SELECT a.*, c.owner_id as employer_owner, j.posted_by, c.id as comp_id
    FROM nh_applications a
    JOIN nh_jobs j ON j.id = a.job_id
    JOIN nh_companies c ON c.id = j.company_id
    WHERE a.id = $1
  `, [appId]).then(app => {
    if (!app) return null;
    const isCandidate = app.candidate_id === userId;
    const isEmployer = app.employer_owner === userId
      || app.posted_by === userId
      || (companyId && app.comp_id === companyId);
    if (!isCandidate && !isEmployer) return null;
    return { ...app, isCandidate, isEmployer };
  });
}

router.get('/threads', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const companyId = req.session.user.company_id || null;

    const threads = await db.all(`
      WITH user_apps AS (
        SELECT DISTINCT a.id AS application_id,
          j.title_en, j.title_fr,
          c.name AS company_name, c.logo_url,
          u_cand.first_name AS cand_first, u_cand.last_name AS cand_last,
          u_cand.avatar_url AS cand_avatar
        FROM nh_applications a
        JOIN nh_jobs j ON j.id = a.job_id
        JOIN nh_companies c ON c.id = j.company_id
        LEFT JOIN nh_users u_cand ON u_cand.id = a.candidate_id
        WHERE a.candidate_id = $1
           OR c.owner_id = $1
           OR j.posted_by = $1
           OR ($2::text IS NOT NULL AND c.id = $2)
      )
      SELECT
        ua.*,
        (SELECT body FROM nh_messages
         WHERE application_id = ua.application_id
         ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT created_at FROM nh_messages
         WHERE application_id = ua.application_id
         ORDER BY created_at DESC LIMIT 1) AS last_at,
        COALESCE((SELECT COUNT(*) FROM nh_messages
         WHERE application_id = ua.application_id
           AND sender_id != $1
           AND read_at IS NULL), 0) AS unread
      FROM user_apps ua
      ORDER BY last_at DESC NULLS LAST
    `, [userId, companyId]);

    res.json({ success: true, threads });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/:applicationId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const companyId = req.session.user.company_id || null;
    const appId = req.params.applicationId;

    const app = await getAppWithAccess(appId, userId, companyId);
    if (!app) return res.status(403).json({ success: false, error: 'Not found or forbidden' });

    const messages = await db.all(
      `SELECT m.*, u.first_name, u.last_name, u.role, u.avatar_url
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
    const companyId = req.session.user.company_id || null;
    const appId = req.params.applicationId;
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ success: false, error: 'Message required' });

    const app = await getAppWithAccess(appId, userId, companyId);
    if (!app) return res.status(403).json({ success: false, error: 'Not found or forbidden' });

    // Get job title for notification
    const job = await db.get(`SELECT title_en, title_fr FROM nh_jobs WHERE id = $1`, [app.job_id]);

    const id = crypto.randomUUID();
    await db.run(
      `INSERT INTO nh_messages (id, application_id, sender_id, body) VALUES ($1,$2,$3,$4)`,
      [id, appId, userId, body.trim()]
    );

    const msg = await db.get(
      `SELECT m.*, u.first_name, u.last_name, u.role, u.avatar_url
       FROM nh_messages m JOIN nh_users u ON u.id = m.sender_id WHERE m.id = $1`, [id]
    );

    const recipientId = app.isCandidate ? app.employer_owner : app.candidate_id;
    const senderName = `${msg.first_name} ${msg.last_name}`;
    const jobTitle = (job && (job.title_en || job.title_fr)) || 'a job';
    await notifyUser(
      recipientId, 'message',
      `Nouveau message de ${senderName} — "${jobTitle}"`,
      `/nexhire/#messages-${appId}`
    );

    res.json({ success: true, message: msg });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
