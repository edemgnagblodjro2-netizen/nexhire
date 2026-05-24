const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

function requireAdmin(req, res, next) {
  if (!req.session?.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin only' });
  }
  next();
}

// GET /api/moderation/stats
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
        COUNT(*) FILTER (WHERE status = 'active'  AND ai_moderation_verdict = 'auto_approved')  AS auto_approved,
        COUNT(*) FILTER (WHERE status = 'active'  AND ai_moderation_verdict IS NULL)             AS legacy,
        COUNT(*) FILTER (WHERE status = 'rejected')                                              AS rejected,
        COUNT(*) FILTER (WHERE status = 'active')                                                AS total_active
      FROM nh_jobs
    `);
    res.json({ success: true, stats: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/moderation/jobs?status=pending&page=1
router.get('/jobs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(`
      SELECT j.id, j.title_fr, j.title_en, j.description_fr, j.description_en,
             j.status, j.ai_moderation_score, j.ai_moderation_flags, j.ai_moderation_verdict,
             j.moderation_reason, j.moderation_note, j.created_at, j.city, j.country,
             j.salary_min, j.salary_max, j.job_type, j.work_mode,
             c.name AS company_name, c.id AS company_id,
             u.first_name, u.last_name, u.email AS posted_by_email
      FROM nh_jobs j
      JOIN nh_companies c ON c.id = j.company_id
      JOIN nh_users u ON u.id = j.posted_by
      WHERE j.status = $1
      ORDER BY j.created_at DESC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);

    const countRes = await db.get('SELECT COUNT(*) AS n FROM nh_jobs WHERE status = $1', [status]);

    res.json({ success: true, jobs: rows, total: parseInt(countRes.n), page, limit });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/moderation/jobs/:id/approve
router.post('/jobs/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { note } = req.body;
    const job = await db.get('SELECT id FROM nh_jobs WHERE id = $1', [req.params.id]);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    await db.run(
      `UPDATE nh_jobs SET status='active', moderation_note=$1, moderated_at=NOW(), moderated_by=$2 WHERE id=$3`,
      [note || null, req.session.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/moderation/jobs/:id/reject
router.post('/jobs/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await db.get('SELECT id FROM nh_jobs WHERE id = $1', [req.params.id]);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    await db.run(
      `UPDATE nh_jobs SET status='rejected', moderation_reason=$1, moderation_note=$1, moderated_at=NOW(), moderated_by=$2 WHERE id=$3`,
      [reason || 'Offre refusée par l\'administrateur.', req.session.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
