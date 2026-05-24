const express = require('express');
const router  = express.Router();
const https   = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
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

// GET /api/jobbank/search?q=developer&prov=QC&lang=en&page=1
router.get('/search', async (req, res) => {
  try {
    const appId  = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_API_KEY;

    if (!appId || !appKey) {
      return res.json({ success: false, jobs: [], error: 'Adzuna keys not configured' });
    }

    const { q = '', prov = '', page = 1 } = req.query;
    const where = prov && prov !== 'REMOTE' ? (PROV_TO_WHERE[prov] || '') : '';

    const params = new URLSearchParams({
      app_id:           appId,
      app_key:          appKey,
      results_per_page: '20',
      'content-type':   'application/json',
    });
    if (q.trim())  params.set('what', q.trim());
    if (where)     params.set('where', where);

    const url  = `https://api.adzuna.com/v1/api/jobs/ca/search/${page}?${params.toString()}`;
    const raw  = await httpsGet(url);
    const data = JSON.parse(raw);

    if (!data.results) {
      return res.json({ success: false, jobs: [], error: data.exception || 'No results from Adzuna' });
    }

    const jobs = data.results.map(j => ({
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

    res.json({ success: true, jobs, total: data.count || jobs.length });
  } catch (e) {
    res.json({ success: false, jobs: [], error: e.message });
  }
});

module.exports = router;
