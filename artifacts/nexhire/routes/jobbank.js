const express = require('express');
const router  = express.Router();
const https   = require('https');

const JB_BASE = 'https://www.jobbank.gc.ca';
const JB_UA   = 'Mozilla/5.0 (compatible; Nexhire/1.0)';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': JB_UA, 'Accept': 'text/html,*/*' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function strip(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ')
    .replace(/\s+/g, ' ').trim();
}

function parseJobBank(html) {
  const jobs = [];
  // Each job is an <a href="/jobsearch/jobposting/{id}..." class="resultJobItem">...</a>
  const blockRe = /<a\s[^>]*href="\/jobsearch\/jobposting\/(\d+)[^"]*"[^>]*class="resultJobItem"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const jobId = m[1];
    const block = m[2];

    const titleM  = block.match(/class="noctitle"[^>]*>([\s\S]*?)<\/span>/);
    const title   = strip(titleM?.[1] || '');
    if (!title) continue;

    const bizM    = block.match(/class="business">([\s\S]*?)<\/li>/);
    const company = strip(bizM?.[1] || '');

    const locM    = block.match(/class="location">([\s\S]*?)<\/li>/);
    const location = strip(locM?.[1] || '').replace(/^Location\s*/i, '');

    const salM    = block.match(/class="salary">([\s\S]*?)<\/li>/);
    const salary  = strip(salM?.[1] || '')
      .replace(/^Salary\s*/i, '')
      .replace(/\s*\(.*?\)\s*/g, '') // remove parenthetical notes
      .trim();

    const dateM   = block.match(/class="date">([\s\S]*?)<\/li>/);
    const date    = strip(dateM?.[1] || '');

    jobs.push({
      id:       `jb_${jobId}`,
      jobId,
      title,
      company,
      location,
      salary,
      date,
      url:      `${JB_BASE}/jobsearch/jobposting/${jobId}`,
      external: true,
    });
  }
  return jobs;
}

// GET /api/jobbank/search?q=developer&prov=QC&lang=en
router.get('/search', async (req, res) => {
  try {
    const { q = '', prov = '', lang = 'en' } = req.query;

    const params = new URLSearchParams({ sort: 'D' });
    if (q.trim())                              params.set('searchstring', q.trim());
    if (prov && prov !== 'REMOTE')            params.set('prov', prov);

    const url  = `${JB_BASE}/jobsearch/jobsearch?${params.toString()}`;
    const html = await httpsGet(url);
    const jobs = parseJobBank(html);

    // Total from meta description
    const totalM = html.match(/View (\d[\d,]*) job posting/i) || html.match(/(\d[\d,]*) offre/i);
    const total  = totalM ? parseInt(totalM[1].replace(/,/g,'')) : jobs.length;

    res.json({ success: true, jobs, total });
  } catch (e) {
    res.json({ success: false, jobs: [], error: e.message });
  }
});

module.exports = router;
