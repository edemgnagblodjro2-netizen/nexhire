const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  const jobs = await db.all(`
    SELECT j.id, j.title_fr, j.title_en, j.slug, j.work_mode, j.job_type, j.city, j.country,
           j.salary_min, j.salary_max, j.salary_currency, j.featured, j.status,
           c.name as company_name, c.logo_url as company_logo, c.industry,
           sj.created_at as saved_at
    FROM nh_saved_jobs sj
    JOIN nh_jobs j ON sj.job_id = j.id
    JOIN nh_companies c ON j.company_id = c.id
    WHERE sj.user_id = $1
    ORDER BY sj.created_at DESC
  `, [req.session.user.id]);
  res.json({ success: true, jobs });
});

router.post('/:jobId', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  await db.run(`INSERT INTO nh_saved_jobs (user_id, job_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [req.session.user.id, req.params.jobId]);
  res.json({ success: true });
});

router.delete('/:jobId', requireAuth, async (req, res) => {
  await db.run('DELETE FROM nh_saved_jobs WHERE user_id = $1 AND job_id = $2', [req.session.user.id, req.params.jobId]);
  res.json({ success: true });
});

router.get('/ids', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.json({ success: true, ids: [] });
  const rows = await db.all('SELECT job_id FROM nh_saved_jobs WHERE user_id = $1', [req.session.user.id]);
  res.json({ success: true, ids: rows.map(r => r.job_id) });
});

module.exports = router;
