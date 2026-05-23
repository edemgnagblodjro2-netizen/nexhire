const router = require('express').Router();
const db = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');

router.get('/employer', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.session.user.company_id;

    const [jobStats, appTrend, sourceDist, stageFunnel, avgTime] = await Promise.all([
      db.all(`
        SELECT j.id, j.title_en, j.title_fr, j.slug, j.work_mode, j.city, j.province,
               j.created_at, j.status, j.featured,
               COUNT(DISTINCT a.id) as applications,
               COUNT(DISTINCT a.id) FILTER (WHERE a.status='shortlisted') as shortlisted,
               COUNT(DISTINCT a.id) FILTER (WHERE a.status='interview') as interviews,
               COUNT(DISTINCT a.id) FILTER (WHERE a.status='offer') as offers
        FROM nh_jobs j
        LEFT JOIN nh_applications a ON a.job_id = j.id
        WHERE j.company_id = $1
        GROUP BY j.id ORDER BY j.created_at DESC LIMIT 20
      `, [companyId]),

      db.all(`
        SELECT DATE_TRUNC('day', a.created_at)::date as day, COUNT(*) as n
        FROM nh_applications a
        JOIN nh_jobs j ON j.id = a.job_id
        WHERE j.company_id = $1 AND a.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day
      `, [companyId]),

      db.all(`
        SELECT COALESCE(a.source, 'direct') as source, COUNT(*) as n
        FROM nh_applications a
        JOIN nh_jobs j ON j.id = a.job_id
        WHERE j.company_id = $1
        GROUP BY source ORDER BY n DESC
      `, [companyId]),

      db.all(`
        SELECT a.status, COUNT(*) as n
        FROM nh_applications a
        JOIN nh_jobs j ON j.id = a.job_id
        WHERE j.company_id = $1
        GROUP BY a.status
      `, [companyId]),

      db.get(`
        SELECT
          ROUND(AVG(EXTRACT(EPOCH FROM (
            CASE WHEN a.status IN ('shortlisted','interview','offer','rejected')
            THEN a.updated_at ELSE NOW() END
          ) - a.created_at) / 86400)::numeric, 1) as avg_days_to_decision
        FROM nh_applications a
        JOIN nh_jobs j ON j.id = a.job_id
        WHERE j.company_id = $1
      `, [companyId]),
    ]);

    const totals = {
      total_jobs: jobStats.length,
      total_apps: jobStats.reduce((s, j) => s + parseInt(j.applications || 0), 0),
      total_shortlisted: jobStats.reduce((s, j) => s + parseInt(j.shortlisted || 0), 0),
      total_offers: jobStats.reduce((s, j) => s + parseInt(j.offers || 0), 0),
      avg_days: avgTime?.avg_days_to_decision || null,
    };

    res.json({ success: true, totals, jobStats, appTrend, sourceDist, stageFunnel });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
