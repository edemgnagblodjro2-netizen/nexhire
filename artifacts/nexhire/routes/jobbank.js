const express = require('express');
const router  = express.Router();
const https   = require('https');

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

const EXCLUDED = ['uber', 'lyft', 'doordash', 'instacart', 'delivery driver',
  'deliver with', 'conduisez', 'chauffeur', 'door dash'];

function filterGigs(jobs) {
  return jobs.filter(j => {
    const text = (j.title + ' ' + j.company).toLowerCase();
    return !EXCLUDED.some(k => text.includes(k));
  });
}

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

router.get('/jooble', async (req, res) => {
  try {
    const key  = process.env.JOOBLE_API_KEY;
    if (!key) return res.json({ success: false, jobs: [], error: 'No Jooble key' });

    const q    = req.query.q || 'developer';
    const prov = req.query.prov || '';
    const page = parseInt(req.query.page || '1');
    const location = prov && PROV_TO_WHERE[prov] ? PROV_TO_WHERE[prov] + ', Canada' : 'Canada';

    const body = JSON.stringify({ keywords: q, location, page, resultonpage: 100 });

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'jooble.org',
        path: `/api/${key}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      };
      const req2 = https.request(options, r => {
        let raw = '';
        r.on('data', c => raw += c);
        r.on('end', () => resolve(JSON.parse(raw)));
      });
      req2.on('error', reject);
      req2.setTimeout(10000, () => { req2.destroy(); reject(new Error('timeout')); });
      req2.write(body);
      req2.end();
    });

    const jobs = (data.jobs || []).map((j, i) => ({
      id:       `jb_${i}_${Date.now()}`,
      title:    j.title || '',
      company:  j.company || '',
      location: j.location || location,
      salary:   j.salary || '',
      date:     j.updated ? new Date(j.updated).toLocaleDateString('en-CA') : '',
      url:      j.link || '',
      external: true,
      source:   'jooble',
    }));

    res.json({ success: true, jobs, total: data.totalCount || jobs.length });
  } catch (e) {
    console.error('[Jooble]', e.message);
    res.json({ success: false, jobs: [], error: e.message });
  }
});

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

    let jobs = filterGigs(mapJobs(main.results));
    const seenIds = new Set(jobs.map(j => j.id));

    const extras = await Promise.allSettled(
      EXTRA_PROVINCES.map(p => fetchAdzuna(appId, appKey, q, PROV_TO_WHERE[p], 5, 1))
    );
    for (const r of extras) {
      if (r.status === 'fulfilled' && r.value.results) {
        for (const j of filterGigs(mapJobs(r.value.results))) {
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