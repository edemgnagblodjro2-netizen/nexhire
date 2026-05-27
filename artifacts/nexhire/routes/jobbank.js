const express = require('express');
const https = require('https');
const router = express.Router();

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

const PROV_TO_WHERE = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba',
  NB: 'New Brunswick', NL: 'Newfoundland', NS: 'Nova Scotia',
  ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut',
};

const EXTRA_PROVINCES = ['ON', 'BC', 'AB', 'MB', 'SK'];

async function fetchAdzuna(appId, appKey, q, where, perPage, page) {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(perPage),
    'content-type': 'application/json',
  });
  if (q && q.trim()) params.set('what', q.trim());
  if (where) params.set('where', where);
  const url = 'https://api.adzuna.com/v1/api/jobs/ca/search/' + page + '?' + params.toString();
  const raw = await httpsGet(url);
  return JSON.parse(raw);
}

function mapJobs(results) {
  return (results || []).map(j => ({
    id: 'az_' + j.id,
    title: j.title || '',
    company: j.company && j.company.display_name ? j.company.display_name : '',
    location: j.location && j.location.display_name ? j.location.display_name : '',
    salary: j.salary_min && j.salary_max
      ? '$' + Math.round(j.salary_min).toLocaleString() + ' - $' + Math.round(j.salary_max).toLocaleString()
      : j.salary_min
        ? 'From $' + Math.round(j.salary_min).toLocaleString()
        : '',
    date: j.created ? new Date(j.created).toLocaleDateString('en-CA') : '',
    url: j.redirect_url || '',
    description: j.description || '',
    external: true,
    source: 'adzuna',
  }));
}

// GET /api/jobbank/search?q=developer&prov=QC&lang=en&page=1
router.get('/search', async (req, res) => {
  try {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_API_KEY;
    if (!appId || !appKey) {
      return res.json({ success: false, jobs: [], error: 'Adzuna keys not configured' });
    }

    const q = req.query.q || '';
    const prov = req.query.prov || '';
    const page = req.query.page || 1;
    const where = prov && prov !== 'REMOTE' ? (PROV_TO_WHERE[prov] || '') : '';

    // Fetch principal — 20 jobs province choisie ou Canada
    const main = await fetchAdzuna(appId, appKey, q, where, 20, page);
    let jobs = mapJobs(main.results);
    const seenIds = new Set(jobs.map(j => j.id));

    // Si pas de province spécifique — ajouter 5 jobs par province extra
    if (!prov || prov === '') {
      const extras = await Promise.allSettled(
        EXTRA_PROVINCES.map(p => fetchAdzuna(appId, appKey, q, PROV_TO_WHERE[p], 5, 1))
      );
      for (const r of extras) {
        if (r.status === 'fulfilled' && r.value.results) {
          for (const j of mapJobs(r.value.results)) {
            if (!seenIds.has(j.id)) {
              seenIds.add(j.id);
              jobs.push(j);
            }
          }
        }
      }
    }

    res.json({ success: true, jobs: jobs, total: main.count || jobs.length });
  } catch (e) {
    res.json({ success: false, jobs: [], error: e.message });
  }
});

module.exports = router;