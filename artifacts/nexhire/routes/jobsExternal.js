'use strict';
const express = require('express');
const router  = express.Router();
const db      = require('../models/db');

function fmtSalary(min, max) {
  if (!min && !max) return '';
  if (min && max) return `$${Math.round(min).toLocaleString('en-CA')} – $${Math.round(max).toLocaleString('en-CA')}`;
  return `From $${Math.round(min).toLocaleString('en-CA')}`;
}

function fmtLocation(city, province) {
  if (city && province) return `${city}, ${province}`;
  return city || province || '';
}

function buildQuery(source, q, prov, category) {
  const conds  = ['source = $1'];
  const values = [source];
  let   n      = 2;

  if (q) {
    conds.push(`(title ILIKE $${n} OR company ILIKE $${n})`);
    values.push(`%${q}%`);
    n++;
  }
  if (prov) {
    conds.push(`province = $${n++}`);
    values.push(prov.toUpperCase());
  }
  if (category) {
    conds.push(`category = $${n++}`);
    values.push(category);
  }

  return {
    sql: `SELECT external_id, source, title, company, city, province,
                 salary_min, salary_max, redirect_url, posted_at, description,
                 category, region
          FROM   nh_jobs_external
          WHERE  ${conds.join(' AND ')}
          ORDER  BY posted_at DESC NULLS LAST
          LIMIT  100`,
    values,
  };
}

function mapRow(r) {
  return {
    id:          r.external_id,
    title:       r.title    || '',
    company:     r.company  || '',
    location:    fmtLocation(r.city, r.province),
    salary:      fmtSalary(r.salary_min, r.salary_max),
    date:        r.posted_at ? new Date(r.posted_at).toLocaleDateString('en-CA') : '',
    url:         r.redirect_url,
    description: r.description || '',
    external:    true,
    source:      r.source,
    category:    r.category || null,
    region:      r.region   || null,
  };
}

// GET /api/jobs/external/adzuna?q=developer&prov=QC&category=Développement
router.get('/adzuna', async (req, res) => {
  try {
    const { q = '', prov = '', category = '' } = req.query;
    const { sql, values } = buildQuery('adzuna', q, prov, category);
    const { rows } = await db.query(sql, values);
    res.json({ success: true, jobs: rows.map(mapRow), total: rows.length });
  } catch (e) {
    console.error('[jobs/external/adzuna]', e.message);
    res.json({ success: false, jobs: [], error: e.message });
  }
});

// GET /api/jobs/external/jooble?q=developer&prov=QC&category=Développement
router.get('/jooble', async (req, res) => {
  try {
    const { q = '', prov = '', category = '' } = req.query;
    const { sql, values } = buildQuery('jooble', q, prov, category);
    const { rows } = await db.query(sql, values);
    res.json({ success: true, jobs: rows.map(mapRow), total: rows.length });
  } catch (e) {
    console.error('[jobs/external/jooble]', e.message);
    res.json({ success: false, jobs: [], error: e.message });
  }
});

// POST /api/jobs/external/intent
// Pas d'auth requise — user_id vient de req.session si connecté, NULL sinon
router.post('/intent', async (req, res) => {
  try {
    const { job_external_id, source, category, region } = req.body;
    if (!job_external_id) return res.status(400).json({ success: false, error: 'job_external_id required' });
    const user_id = req.session?.user?.id || null;
    await db.query(
      `INSERT INTO nh_application_intents (user_id, job_external_id, source, category, region)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, job_external_id, source || null, category || null, region || null]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[jobs/external/intent]', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
