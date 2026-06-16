'use strict';
const https  = require('https');
const crypto = require('crypto');
const db     = require('../models/db');
const { isGig } = require('./gigFilter');
const { getCategory, getRegion } = require('./classifier');

// ── HTTP helper — même implémentation que routes/jobbank.js ─────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-CA,en;q=0.9,fr-CA;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.jobbank.gc.ca/',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── Province détectée depuis la chaîne de localisation Adzuna ──
const CITY_TO_PROVINCE = {
  'montréal': 'QC', 'montreal': 'QC', 'québec': 'QC', 'quebec city': 'QC',
  'laval': 'QC', 'gatineau': 'QC', 'longueuil': 'QC', 'sherbrooke': 'QC',
  'lévis': 'QC', 'levis': 'QC', 'trois-rivières': 'QC', 'saguenay': 'QC',
  'toronto': 'ON', 'ottawa': 'ON', 'mississauga': 'ON', 'brampton': 'ON',
  'hamilton': 'ON', 'london': 'ON', 'markham': 'ON', 'vaughan': 'ON',
  'kitchener': 'ON', 'windsor': 'ON', 'kingston': 'ON', 'guelph': 'ON',
  'waterloo': 'ON', 'barrie': 'ON', 'sudbury': 'ON', 'thunder bay': 'ON',
  'vancouver': 'BC', 'surrey': 'BC', 'burnaby': 'BC', 'richmond': 'BC',
  'kelowna': 'BC', 'abbotsford': 'BC', 'victoria': 'BC', 'nanaimo': 'BC',
  'calgary': 'AB', 'edmonton': 'AB', 'red deer': 'AB', 'lethbridge': 'AB',
  'winnipeg': 'MB', 'brandon': 'MB',
  'saskatoon': 'SK', 'regina': 'SK',
  'halifax': 'NS',
  'moncton': 'NB', 'fredericton': 'NB', 'saint john': 'NB',
  "st. john's": 'NL',
};

function detectProvince(locationStr) {
  if (!locationStr) return null;
  const lower = locationStr.toLowerCase();
  for (const [city, prov] of Object.entries(CITY_TO_PROVINCE)) {
    if (lower.includes(city)) return prov;
  }
  return null;
}

// ── UPSERT dans nh_jobs_external ────────────────────────────────
// Retourne true si INSERT, false si UPDATE (via trick xmax PostgreSQL)
async function upsertJob(job) {
  const { rows } = await db.query(`
    INSERT INTO nh_jobs_external
      (external_id, source, title, company, description,
       city, province, country, work_mode, job_type,
       salary_min, salary_max, salary_currency, salary_period,
       skills, category, region, redirect_url, posted_at, raw, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
    ON CONFLICT (external_id) DO UPDATE SET
      title        = EXCLUDED.title,
      company      = EXCLUDED.company,
      description  = EXCLUDED.description,
      redirect_url = EXCLUDED.redirect_url,
      salary_min   = EXCLUDED.salary_min,
      salary_max   = EXCLUDED.salary_max,
      posted_at    = EXCLUDED.posted_at,
      raw          = EXCLUDED.raw,
      updated_at   = NOW()
    RETURNING (xmax = 0) AS inserted
  `, [
    job.external_id, job.source, job.title, job.company, job.description,
    job.city, job.province, job.country, job.work_mode, job.job_type,
    job.salary_min, job.salary_max, job.salary_currency, job.salary_period,
    job.skills ? JSON.stringify(job.skills) : null,
    job.category, job.region, job.redirect_url,
    job.posted_at ? new Date(job.posted_at) : null,
    JSON.stringify(job.raw),
  ]);
  return rows[0].inserted === true;
}

// ── Adzuna ──────────────────────────────────────────────────────
// Nombre de pages par province — QC prioritaire, ajuster ici sans toucher à la boucle
const ADZUNA_STRATEGY = {
  QC: { where: 'Quebec',           pages: 10 },
  ON: { where: 'Ontario',          pages: 3  },
  BC: { where: 'British Columbia', pages: 2  },
  AB: { where: 'Alberta',          pages: 2  },
  MB: { where: 'Manitoba',         pages: 1  },
};

async function fetchAdzunaPage(appId, appKey, where, page) {
  const params = new URLSearchParams({
    app_id:           appId,
    app_key:          appKey,
    results_per_page: '50',
    'content-type':   'application/json',
  });
  if (where) params.set('where', where);
  const url = `https://api.adzuna.com/v1/api/jobs/ca/search/${page}?${params.toString()}`;
  const raw = await httpsGet(url);
  return JSON.parse(raw);
}

async function ingestAdzuna(appId, appKey) {
  const result = { inserted: 0, updated: 0, skipped: 0, excluded: 0, errors: [] };

  for (const [provCode, { where: provName, pages }] of Object.entries(ADZUNA_STRATEGY)) {
    for (let page = 1; page <= pages; page++) {
      try {
        const data = await fetchAdzunaPage(appId, appKey, provName, page);
        if (!data.results?.length) continue;

        for (const j of data.results) {
          if (!j.redirect_url) { result.skipped++; continue; }
          if (isGig(j.title, j.company?.display_name)) { result.excluded++; continue; }

          const locationStr = j.location?.display_name || '';
          const city        = locationStr.split(',')[0]?.trim() || null;
          const province    = detectProvince(locationStr) || provCode;

          const wasInserted = await upsertJob({
            external_id:     `az_${j.id}`,
            source:          'adzuna',
            title:           j.title || null,
            company:         j.company?.display_name || null,
            description:     j.description || null,
            city,
            province,
            country:         'Canada',
            work_mode:       null,
            job_type:        j.contract_time || j.contract_type || null,
            salary_min:      j.salary_min != null ? Math.round(j.salary_min) : null,
            salary_max:      j.salary_max != null ? Math.round(j.salary_max) : null,
            salary_currency: 'CAD',
            salary_period:   'year',
            skills:          null,
            category:        getCategory(j.title || null, j.description || null),
            region:          getRegion(province, city),
            redirect_url:    j.redirect_url,
            posted_at:       j.created || null,
            raw:             j,
          });

          if (wasInserted) result.inserted++;
          else result.updated++;
        }
      } catch (e) {
        result.errors.push(`${provCode} page ${page}: ${e.message}`);
      }
    }
  }

  return result;
}

// ── Point d'entrée principal ─────────────────────────────────────
async function ingestAll() {
  const start = Date.now();
  const summary = { sources: {} };

  // Adzuna — try/catch isolé
  const appId  = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_API_KEY;
  if (!appId || !appKey) {
    summary.sources.adzuna = { ok: false, error: 'ADZUNA_APP_ID / ADZUNA_API_KEY not configured' };
  } else {
    try {
      const r = await ingestAdzuna(appId, appKey);
      summary.sources.adzuna = { ok: true, inserted: r.inserted, updated: r.updated, skipped: r.skipped, excluded: r.excluded, errors: r.errors };
      console.log(`[ingest] Adzuna: ${r.inserted} inserted, ${r.updated} updated, ${r.skipped} skipped, ${r.excluded} excluded`);
    } catch (e) {
      summary.sources.adzuna = { ok: false, error: e.message };
      console.error('[ingest] Adzuna fatal:', e.message);
    }
  }

  summary.duration_ms = Date.now() - start;
  console.log(`[ingest] Done in ${summary.duration_ms}ms`);
  return summary;
}

module.exports = { ingestAll };
