const express  = require('express');
const router   = express.Router();
const https    = require('https');
const { isGig } = require('../services/gigFilter');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-CA,en;q=0.9,fr-CA;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://www.jobbank.gc.ca/',
    } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const PROV_TO_WHERE = {
  QC: 'Quebec',
  ON: 'Ontario',
  BC: 'British Columbia',
  AB: 'Alberta',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  NS: 'Nova Scotia',
  NB: 'New Brunswick',
  NL: 'Newfoundland',
  PE: 'Prince Edward Island',
  YT: 'Yukon',
  NT: 'Northwest Territories',
  NU: 'Nunavut',
};

const EXTRA_PROVINCES = ['ON', 'BC', 'AB', 'MB', 'SK'];


function mapJobs(results) {
  return (results || []).map(j => ({
    id:       `az_${j.id}`,
    title:    j.title || '',
    company:  j.company?.display_name || '',
    location: j.location?.display_name || '',
    salary:   j.salary_min && j.salary_max
                ? `$${Math.round(j.salary_min).toLocaleString()} – $${Math.round(j.salary_max).toLocaleString()}`
                : j.salary_min
                  ? `From $${Math.round(j.salary_min).toLocaleString()}`
                  : '',
    date:     j.created ? new Date(j.created).toLocaleDateString('en-CA') : '',
    url:      j.redirect_url || '',
    description: j.description || '',
    external: true,
    source:   'adzuna',
  }));
}

async function fetchAdzuna(appId, appKey, q, where, perPage, page) {
  const params = new URLSearchParams({
    app_id:           appId,
    app_key:          appKey,
    results_per_page: String(perPage),
    'content-type':   'application/json',
  });
  if (q && q.trim()) params.set('what', q.trim());
  if (where)         params.set('where', where);
  const url = `https://api.adzuna.com/v1/api/jobs/ca/search/${page}?${params.toString()}`;
  const raw = await httpsGet(url);
  return JSON.parse(raw);
}

// GET /api/jobbank/search?q=developer&prov=QC&lang=en&page=1
router.get('/search', async (req, res) => {
  try {
    const appId  = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_API_KEY;
    if (!appId || !appKey) {
      return res.json({ success: false, jobs: [], error: 'Adzuna keys not configured' });
    }

    const q    = req.query.q || 'developer';
    const prov = req.query.prov || '';
    const page = req.query.page || 1;
    const where = prov && prov !== 'REMOTE' ? (PROV_TO_WHERE[prov] || '') : '';

    const main = await fetchAdzuna(appId, appKey, q, where, 20, page);
    if (!main.results) {
      return res.json({ success: false, jobs: [], error: main.exception || 'No results from Adzuna' });
    }

    let jobs = mapJobs(main.results).filter(j => !isGig(j.title, j.company));
    const seenIds = new Set(jobs.map(j => j.id));

    const extras = await Promise.allSettled(
      EXTRA_PROVINCES.map(p => fetchAdzuna(appId, appKey, q, PROV_TO_WHERE[p], 5, 1))
    );
    for (const r of extras) {
      if (r.status === 'fulfilled' && r.value.results) {
        for (const j of mapJobs(r.value.results).filter(j => !isGig(j.title, j.company))) {
          if (!seenIds.has(j.id)) { seenIds.add(j.id); jobs.push(j); }
        }
      }
    }

    res.json({ success: true, jobs, total: main.count || jobs.length });
  } catch (e) {
    res.json({ success: false, jobs: [], error: e.message });
  }
});

module.exports = router;