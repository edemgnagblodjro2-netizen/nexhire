const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');

// ── Title normalization ────────────────────────────────────
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/senior|sr\.?|junior|jr\.?|lead|principal|staff|mid[- ]?level|intermédiaire|débutant/gi, '')
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// ── Canadian market benchmarks (annual CAD) ────────────────
// [title_normalized, province, salary_min, salary_max]
const BENCHMARKS = [
  ['software developer',        'QC', 75000, 115000], ['software developer',        'ON', 85000, 130000], ['software developer',        'BC', 80000, 125000], ['software developer',        'AB', 80000, 120000],
  ['full-stack developer',      'QC', 80000, 120000], ['full-stack developer',      'ON', 90000, 135000], ['full-stack developer',      'BC', 85000, 130000], ['full-stack developer',      'AB', 85000, 125000],
  ['frontend developer',        'QC', 70000, 105000], ['frontend developer',        'ON', 80000, 115000], ['frontend developer',        'BC', 75000, 110000], ['frontend developer',        'AB', 74000, 108000],
  ['backend developer',         'QC', 78000, 115000], ['backend developer',         'ON', 88000, 130000], ['backend developer',         'BC', 83000, 125000], ['backend developer',         'AB', 80000, 120000],
  ['react developer',           'QC', 72000, 108000], ['react developer',           'ON', 82000, 120000], ['react developer',           'BC', 78000, 115000], ['react developer',           'AB', 76000, 112000],
  ['devops engineer',           'QC', 88000, 130000], ['devops engineer',           'ON', 98000, 145000], ['devops engineer',           'BC', 93000, 140000], ['devops engineer',           'AB', 90000, 135000],
  ['cloud engineer',            'QC', 90000, 132000], ['cloud engineer',            'ON',100000, 148000], ['cloud engineer',            'BC', 95000, 142000], ['cloud engineer',            'AB', 92000, 138000],
  ['data engineer',             'QC', 82000, 125000], ['data engineer',             'ON', 92000, 140000], ['data engineer',             'BC', 88000, 135000], ['data engineer',             'AB', 86000, 130000],
  ['data scientist',            'QC', 88000, 132000], ['data scientist',            'ON', 98000, 148000], ['data scientist',            'BC', 93000, 142000], ['data scientist',            'AB', 90000, 138000],
  ['machine learning engineer', 'QC', 95000, 145000], ['machine learning engineer', 'ON',108000, 162000], ['machine learning engineer', 'BC',102000, 155000], ['machine learning engineer', 'AB', 98000, 148000],
  ['product manager',           'QC', 90000, 130000], ['product manager',           'ON',100000, 148000], ['product manager',           'BC', 95000, 142000], ['product manager',           'AB', 92000, 138000],
  ['project manager',           'QC', 82000, 120000], ['project manager',           'ON', 92000, 135000], ['project manager',           'BC', 88000, 130000], ['project manager',           'AB', 85000, 125000],
  ['ux designer',               'QC', 65000,  98000], ['ux designer',               'ON', 75000, 112000], ['ux designer',               'BC', 70000, 106000], ['ux designer',               'AB', 68000, 102000],
  ['ui designer',               'QC', 62000,  92000], ['ui designer',               'ON', 70000, 105000], ['ui designer',               'BC', 66000, 100000], ['ui designer',               'AB', 64000,  96000],
  ['marketing manager',         'QC', 68000, 100000], ['marketing manager',         'ON', 78000, 115000], ['marketing manager',         'BC', 73000, 108000], ['marketing manager',         'AB', 70000, 104000],
  ['financial analyst',         'QC', 62000,  90000], ['financial analyst',         'ON', 72000, 105000], ['financial analyst',         'BC', 68000,  98000], ['financial analyst',         'AB', 66000,  95000],
  ['business analyst',          'QC', 68000, 100000], ['business analyst',          'ON', 78000, 115000], ['business analyst',          'BC', 73000, 108000], ['business analyst',          'AB', 70000, 104000],
  ['cybersecurity analyst',     'QC', 82000, 122000], ['cybersecurity analyst',     'ON', 92000, 138000], ['cybersecurity analyst',     'BC', 88000, 132000], ['cybersecurity analyst',     'AB', 85000, 128000],
  ['qa engineer',               'QC', 62000,  92000], ['qa engineer',               'ON', 70000, 105000], ['qa engineer',               'BC', 66000, 100000], ['qa engineer',               'AB', 64000,  96000],
  ['software architect',        'QC',108000, 155000], ['software architect',        'ON',122000, 172000], ['software architect',        'BC',116000, 165000], ['software architect',        'AB',112000, 158000],
  ['scrum master',              'QC', 78000, 112000], ['scrum master',              'ON', 88000, 128000], ['scrum master',              'BC', 84000, 122000], ['scrum master',              'AB', 81000, 118000],
  ['accountant',                'QC', 55000,  82000], ['accountant',                'ON', 62000,  92000], ['accountant',                'BC', 58000,  88000], ['accountant',                'AB', 56000,  85000],
  ['hr manager',                'QC', 70000, 102000], ['hr manager',                'ON', 80000, 118000], ['hr manager',                'BC', 75000, 110000], ['hr manager',                'AB', 72000, 106000],
  ['sales manager',             'QC', 72000, 110000], ['sales manager',             'ON', 82000, 125000], ['sales manager',             'BC', 78000, 118000], ['sales manager',             'AB', 74000, 112000],
];

// Seed benchmarks into nh_salary_data — called at startup
async function seedBenchmarks() {
  try {
    for (const [title, province, min, max] of BENCHMARKS) {
      await db.run(
        `INSERT INTO nh_salary_data (id, title_normalized, province, salary_min, salary_max, salary_avg, sample_count, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'benchmark')
         ON CONFLICT (title_normalized, province) DO UPDATE
           SET salary_min=$4, salary_max=$5, salary_avg=$6, source='benchmark', updated_at=NOW()`,
        [crypto.randomUUID(), title, province, min, max, Math.round((min + max) / 2), 1]
      );
    }
  } catch (e) {
    console.error('[salary] seedBenchmarks error:', e.message);
  }
}
// Seed on module load (after DB is ready — called from server.js)
module.exports.seedBenchmarks = seedBenchmarks;

// ── Stats helpers ──────────────────────────────────────────
function computeStats(salaries) {
  if (!salaries.length) return null;
  const sorted = [...salaries].sort((a, b) => a - b);
  const avg    = Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length);
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : sorted[Math.floor(sorted.length / 2)];
  return {
    count:  salaries.length,
    avg,
    median,
    p25:    Math.round(sorted[Math.floor(sorted.length * 0.25)] || sorted[0]),
    p75:    Math.round(sorted[Math.floor(sorted.length * 0.75)] || sorted[sorted.length - 1]),
    min:    Math.round(sorted[0]),
    max:    Math.round(sorted[sorted.length - 1]),
  };
}

// ── GET /api/salary/stats ──────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const { title, province } = req.query;
    const norm = title ? normalizeTitle(title) : '';

    // 1. Active job postings (min 1 needed — we'll flag low count)
    const jobWhere = ["j.status='active'", 'j.salary_min IS NOT NULL', 'j.salary_max IS NOT NULL'];
    const jobParams = [];
    let pi = 1;
    if (title)    { jobWhere.push(`(j.title_en ILIKE $${pi} OR j.title_fr ILIKE $${pi})`); jobParams.push(`%${title}%`); pi++; }
    if (province) { jobWhere.push(`j.province=$${pi}`); jobParams.push(province); pi++; }

    const { rows: jobRows } = await db.query(`
      SELECT (j.salary_min + j.salary_max) / 2 as mid, j.province
      FROM nh_jobs j
      WHERE ${jobWhere.join(' AND ')}
      LIMIT 200
    `, jobParams);

    // 2. Crowdsourced submissions
    const subWhere = ['1=1'];
    const subParams = [];
    let si = 1;
    if (norm)     { subWhere.push(`title_normalized ILIKE $${si}`); subParams.push(`%${norm}%`); si++; }
    if (province) { subWhere.push(`province=$${si}`); subParams.push(province); si++; }

    const { rows: subRows } = await db.query(`
      SELECT salary as mid FROM nh_salary_submissions
      WHERE ${subWhere.join(' AND ')}
      LIMIT 200
    `, subParams);

    // 3. Static benchmarks matching query
    let benchRows = [];
    if (norm) {
      benchRows = BENCHMARKS.filter(([t, p]) =>
        t.includes(norm) &&
        (!province || p === province)
      ).map(([, , min, max]) => ({ mid: Math.round((min + max) / 2) }));
    } else if (province) {
      benchRows = BENCHMARKS.filter(([, p]) => p === province)
        .map(([, , min, max]) => ({ mid: Math.round((min + max) / 2) }));
    }

    const jobSalaries  = jobRows.map(r => r.mid);
    const subSalaries  = subRows.map(r => r.mid);
    const benchSalaries = benchRows.map(r => r.mid);
    const all = [...jobSalaries, ...subSalaries, ...benchSalaries];

    if (!all.length) {
      return res.json({ success: true, stats: null, sources: { jobs: 0, submissions: 0, benchmarks: 0 }, message: 'No data for these filters' });
    }

    const stats = computeStats(all);

    // Province breakdown from jobs
    const byProvince = {};
    jobRows.forEach(r => {
      if (!r.province) return;
      (byProvince[r.province] = byProvince[r.province] || []).push(r.mid);
    });
    const provinceStats = Object.entries(byProvince).map(([prov, vals]) => ({
      province: prov,
      avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      count: vals.length,
    })).sort((a, b) => b.avg - a.avg);

    res.json({
      success: true,
      stats: { ...stats, currency: 'CAD', period: 'year' },
      sources: { jobs: jobSalaries.length, submissions: subSalaries.length, benchmarks: benchSalaries.length },
      low_data: all.length < 5,
      by_province: provinceStats,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/salary/trending ───────────────────────────────
router.get('/trending', async (req, res) => {
  try {
    // From job postings — normalized titles, min 3 offers
    const { rows: jobRows } = await db.query(`
      SELECT
        TRIM(REGEXP_REPLACE(LOWER(title_en), '(senior|sr\\.?|junior|jr\\.?|lead|principal|staff)', '', 'gi')) as norm_title,
        COUNT(*) as count,
        ROUND(AVG((salary_min + salary_max) / 2)) as avg_salary
      FROM nh_jobs
      WHERE status='active' AND salary_min IS NOT NULL AND salary_max IS NOT NULL AND title_en IS NOT NULL
      GROUP BY norm_title
      HAVING COUNT(*) >= 3
      ORDER BY avg_salary DESC
      LIMIT 15
    `);

    // Pad with top benchmarks if not enough job data
    const topBench = BENCHMARKS
      .reduce((acc, [title, , min, max]) => {
        const existing = acc.find(e => e.norm_title === title);
        const avg = Math.round((min + max) / 2);
        if (existing) { existing.avg_salary = Math.round((existing.avg_salary + avg) / 2); existing.count++; }
        else acc.push({ norm_title: title, avg_salary: avg, count: 1, is_benchmark: true });
        return acc;
      }, [])
      .sort((a, b) => b.avg_salary - a.avg_salary)
      .slice(0, 20);

    // Merge: job rows first, then fill with benchmarks not already covered
    const seen = new Set(jobRows.map(r => r.norm_title));
    const benchFill = topBench.filter(b => !seen.has(b.norm_title)).slice(0, Math.max(0, 15 - jobRows.length));
    const roles = [...jobRows, ...benchFill].slice(0, 15);

    res.json({ success: true, roles });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/salary/provinces ──────────────────────────────
router.get('/provinces', async (req, res) => {
  try {
    const { title } = req.query;
    const norm = title ? normalizeTitle(title) : '';

    // Jobs
    const where = ["status='active'", 'salary_min IS NOT NULL', 'salary_max IS NOT NULL', 'province IS NOT NULL'];
    const params = [];
    if (title) { where.push(`(title_en ILIKE $1 OR title_fr ILIKE $1)`); params.push(`%${title}%`); }
    const { rows: jobRows } = await db.query(`
      SELECT province, COUNT(*) as job_count,
             ROUND(AVG((salary_min + salary_max) / 2)) as avg_salary
      FROM nh_jobs WHERE ${where.join(' AND ')}
      GROUP BY province ORDER BY avg_salary DESC
    `, params);

    // Benchmark fallback if no job data
    if (!jobRows.length) {
      const provMap = {};
      const filtered = norm
        ? BENCHMARKS.filter(([t]) => t.includes(norm))
        : BENCHMARKS;
      filtered.forEach(([, province, min, max]) => {
        if (!provMap[province]) provMap[province] = { vals: [], count: 0 };
        provMap[province].vals.push(Math.round((min + max) / 2));
        provMap[province].count++;
      });
      const provinces = Object.entries(provMap)
        .map(([province, { vals, count }]) => ({
          province,
          avg_salary: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
          job_count: count,
          is_benchmark: true,
        }))
        .sort((a, b) => b.avg_salary - a.avg_salary);
      return res.json({ success: true, provinces });
    }

    res.json({ success: true, provinces: jobRows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/salary/submit — candidate shares their salary ─
router.post('/submit', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'candidate') {
      return res.status(403).json({ success: false, error: 'Candidates only' });
    }
    const { title, province, salary, city, work_mode, years_exp } = req.body;
    if (!title || !province || !salary) {
      return res.status(400).json({ success: false, error: 'title, province, salary required' });
    }
    const sal = parseInt(salary);
    if (isNaN(sal) || sal < 20000 || sal > 1000000) {
      return res.status(400).json({ success: false, error: 'Invalid salary (20 000–1 000 000 CAD)' });
    }
    const norm = normalizeTitle(title);
    await db.run(
      `INSERT INTO nh_salary_submissions (id, user_id, title_normalized, province, city, salary, work_mode, years_exp, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET title_normalized=$3, province=$4, city=$5, salary=$6, work_mode=$7, years_exp=$8, submitted_at=NOW()`,
      [crypto.randomUUID(), req.session.user.id, norm, province, city || null, sal, work_mode || null, years_exp ? parseInt(years_exp) : null]
    );
    // Count total submissions for social proof
    const { rows } = await db.query('SELECT COUNT(*) as total FROM nh_salary_submissions');
    res.json({ success: true, total: parseInt(rows[0].total) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/salary/my-submission ─────────────────────────
router.get('/my-submission', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT title_normalized, province, salary, work_mode, years_exp, submitted_at FROM nh_salary_submissions WHERE user_id=$1',
      [req.session.user.id]
    );
    const { rows: countRows } = await db.query('SELECT COUNT(*) as total FROM nh_salary_submissions');
    res.json({ success: true, submission: rows[0] || null, total: parseInt(countRows[0].total) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
module.exports.seedBenchmarks = seedBenchmarks;
