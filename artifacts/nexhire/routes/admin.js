const router = require('express').Router();
const db = require('../models/db');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin'));

router.get('/stats', async (req, res) => {
  const [u, j, c, a] = await Promise.all([
    db.get('SELECT COUNT(*) as n FROM nh_users'),
    db.get("SELECT COUNT(*) as n FROM nh_jobs WHERE status = 'active'"),
    db.get('SELECT COUNT(*) as n FROM nh_companies'),
    db.get('SELECT COUNT(*) as n FROM nh_applications'),
  ]);
  res.json({ success: true, stats: { totalUsers: parseInt(u?.n||0), totalJobs: parseInt(j?.n||0), totalCompanies: parseInt(c?.n||0), totalApplications: parseInt(a?.n||0) } });
});

router.get('/jobs/pending', async (req, res) => {
  const jobs = await db.all("SELECT j.*, c.name as company_name FROM nh_jobs j JOIN nh_companies c ON j.company_id = c.id WHERE j.status = 'pending' ORDER BY j.created_at DESC");
  res.json({ success: true, jobs });
});

router.put('/jobs/:id/approve', async (req, res) => {
  await db.run("UPDATE nh_jobs SET status = 'active', published_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

router.put('/jobs/:id/reject', async (req, res) => {
  await db.run("UPDATE nh_jobs SET status = 'closed' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
