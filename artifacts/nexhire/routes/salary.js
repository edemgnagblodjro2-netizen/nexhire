const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Normalize job title for salary grouping
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/senior|sr\.?|junior|jr\.?|lead|principal|staff|mid[- ]?level/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// GET /api/salary/stats — public salary market data
// Query: ?title=react&province=QC&city=Montreal
router.get('/stats', async (req, res) => {
  try {
    const { title, province, city } = req.query;
    const where = [];
    const params = [];
    let i = 1;

    if (title) { where.push(`(j.title_en ILIKE $${i} OR j.title_fr ILIKE $${i})`); params.push(`%${title}%`); i++; }
    if (province) { where.push(`j.province=$${i}`); params.push(province); i++; }
    if (city) { where.push(`j.city ILIKE $${i}`); params.push(`%${city}%`); i++; }
    where.push('j.status=$' + i); params.push('active'); i++;
    where.push(`j.salary_min IS NOT NULL`);
    where.push(`j.salary_max IS NOT NULL`);

    const { rows } = await db.query(`
      SELECT j.title_en, j.province, j.city,
             j.salary_min, j.salary_max,
             (j.salary_min + j.salary_max) / 2 as salary_avg,
             j.salary_currency, j.salary_period, j.work_mode,
             c.name as company_name
      FROM nh_jobs j
      LEFT JOIN nh_companies c ON c.id=j.company_id
      WHERE ${where.join(' AND ')}
      ORDER BY j.published_at DESC
      LIMIT 100
    `, params);

    if (!rows.length) {
      return res.json({ success: true, stats: null, jobs: [], message: 'No data for these filters' });
    }

    const salaries = rows.map(r => (r.salary_min + r.salary_max) / 2);
    const sorted = [...salaries].sort((a, b) => a - b);
    const avg = Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length);
    const median = sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];

    // Province breakdown
    const byProvince = {};
    rows.forEach(r => {
      if (!r.province) return;
      if (!byProvince[r.province]) byProvince[r.province] = [];
      byProvince[r.province].push((r.salary_min + r.salary_max) / 2);
    });
    const provinceStats = Object.entries(byProvince).map(([prov, vals]) => ({
      province: prov,
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      count: vals.length,
    })).sort((a, b) => b.avg - a.avg);

    res.json({
      success: true,
      stats: {
        count: rows.length,
        avg,
        median,
        p25: Math.round(p25),
        p75: Math.round(p75),
        min: Math.round(sorted[0]),
        max: Math.round(sorted[sorted.length - 1]),
        currency: rows[0].salary_currency || 'CAD',
        period: rows[0].salary_period || 'year',
      },
      by_province: provinceStats,
      jobs: rows.slice(0, 10).map(r => ({
        title: r.title_en,
        company: r.company_name,
        province: r.province,
        city: r.city,
        salary_min: r.salary_min,
        salary_max: r.salary_max,
        work_mode: r.work_mode,
      })),
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/salary/trending — top paying roles across Canada
router.get('/trending', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        title_en,
        COUNT(*) as count,
        ROUND(AVG((salary_min + salary_max) / 2)) as avg_salary,
        ROUND(MIN(salary_min)) as min_salary,
        ROUND(MAX(salary_max)) as max_salary,
        salary_currency
      FROM nh_jobs
      WHERE status='active' AND salary_min IS NOT NULL AND salary_max IS NOT NULL
      GROUP BY title_en, salary_currency
      HAVING COUNT(*) >= 1
      ORDER BY avg_salary DESC
      LIMIT 20
    `);
    res.json({ success: true, roles: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/salary/provinces — avg salary by province
router.get('/provinces', async (req, res) => {
  try {
    const { title } = req.query;
    const where = ["status='active'", 'salary_min IS NOT NULL', 'salary_max IS NOT NULL', 'province IS NOT NULL'];
    const params = [];
    if (title) { where.push(`(title_en ILIKE $1 OR title_fr ILIKE $1)`); params.push(`%${title}%`); }
    const { rows } = await db.query(`
      SELECT province,
             COUNT(*) as job_count,
             ROUND(AVG((salary_min + salary_max) / 2)) as avg_salary
      FROM nh_jobs
      WHERE ${where.join(' AND ')}
      GROUP BY province ORDER BY avg_salary DESC
    `, params);
    res.json({ success: true, provinces: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
