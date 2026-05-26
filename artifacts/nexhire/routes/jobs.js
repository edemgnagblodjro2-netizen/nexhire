const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const { moderateJob } = require('../services/ai');

function getStripe() {
  const key = process.env.NEXHIRE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe not configured — add NEXHIRE_STRIPE_SECRET_KEY');
  return require('stripe')(key);
}

// Province → known cities mapping for robust location filtering
const CA_CITIES_BY_PROV = {
  AB: ['Calgary','Edmonton','Red Deer','Lethbridge','St. Albert','Medicine Hat','Grande Prairie','Airdrie','Spruce Grove','Leduc'],
  BC: ['Vancouver','Surrey','Burnaby','Richmond','Kelowna','Abbotsford','Coquitlam','Langley','Victoria','Nanaimo','Kamloops','Prince George','Chilliwack','Delta','North Vancouver'],
  MB: ['Winnipeg','Brandon','Steinbach','Thompson','Portage la Prairie','Winkler','Morden','Selkirk'],
  NB: ['Moncton','Saint John','Fredericton','Dieppe','Riverview','Bathurst','Miramichi','Edmundston'],
  NL: ["St. John's",'Mount Pearl','Corner Brook','Conception Bay South','Grand Falls-Windsor','Paradise'],
  NS: ['Halifax','Cape Breton / Sydney','Truro','New Glasgow','Dartmouth','Bedford','Lunenburg'],
  NT: ['Yellowknife','Hay River','Inuvik','Fort Smith'],
  NU: ['Iqaluit','Rankin Inlet','Arviat','Baker Lake'],
  ON: ['Toronto','Ottawa','Mississauga','Brampton','Hamilton','London','Markham','Vaughan','Kitchener','Windsor','Richmond Hill','Oakville','Burlington','Oshawa','Barrie','St. Catharines','Cambridge','Kingston','Guelph','Whitby','Sudbury','Peterborough','Thunder Bay','Waterloo'],
  PE: ['Charlottetown','Summerside','Stratford'],
  QC: ['Montréal','Québec City','Laval','Gatineau','Longueuil','Sherbrooke','Saguenay','Lévis','Trois-Rivières','Terrebonne','Saint-Jean-sur-Richelieu','Repentigny','Brossard','Drummondville','Saint-Jérôme','Rimouski','Joliette','Rouyn-Noranda',"Val-d'Or"],
  SK: ['Saskatoon','Regina','Prince Albert','Moose Jaw','Swift Current','Yorkton','North Battleford'],
  YT: ['Whitehorse','Dawson City','Watson Lake'],
};

router.get('/', async (req, res) => {
  const { q, city, province, country, work_mode, job_type, salary_min, featured, days_ago, lang_filter, sort, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const where = ["j.status = 'active'"];
  let i = 1;

  if (q) {
    where.push(`(j.title_fr ILIKE $${i} OR j.title_en ILIKE $${i} OR c.name ILIKE $${i} OR j.city ILIKE $${i} OR j.province ILIKE $${i} OR j.description_fr ILIKE $${i} OR j.description_en ILIKE $${i} OR j.requirements_fr ILIKE $${i} OR j.requirements_en ILIKE $${i} OR j.skills_required::text ILIKE $${i})`);
    params.push(`%${q}%`); i++;
  }
  if (province) {
    // Match by province code OR by known cities in that province (fallback for jobs missing province)
    const knownCities = CA_CITIES_BY_PROV[province] || [];
    if (knownCities.length) {
      const cityPh = knownCities.map((_, idx) => `$${i + 1 + idx}`).join(',');
      where.push(`(j.province = $${i} OR (j.province IS NULL AND j.city IN (${cityPh})))`);
      params.push(province, ...knownCities);
      i += 1 + knownCities.length;
    } else {
      where.push(`j.province = $${i}`);
      params.push(province); i++;
    }
  }
  if (country) { where.push(`j.country ILIKE $${i}`); params.push(`%${country}%`); i++; }
  if (city) { where.push(`j.city ILIKE $${i}`); params.push(`%${city}%`); i++; }
  if (work_mode) { where.push(`j.work_mode = $${i}`); params.push(work_mode); i++; }
  if (job_type) { where.push(`j.job_type = $${i}`); params.push(job_type); i++; }
  if (salary_min) { where.push(`(j.salary_max >= $${i} OR j.salary_min >= $${i})`); params.push(parseInt(salary_min)); i++; }
  if (featured === 'true') { where.push(`j.featured = TRUE`); }
  if (days_ago && !isNaN(parseInt(days_ago))) {
    where.push(`j.published_at >= NOW() - INTERVAL '${parseInt(days_ago)} days'`);
  }
  if (lang_filter) {
    where.push(`j.languages_required::text ILIKE $${i}`);
    params.push(`%${lang_filter}%`); i++;
  }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const orderBy = sort === 'salary_desc' ? 'j.salary_max DESC NULLS LAST, j.featured DESC'
    : sort === 'salary_asc'  ? 'j.salary_min ASC NULLS LAST, j.featured DESC'
    : sort === 'date_asc'    ? 'j.published_at ASC'
    : /* default recent */     'j.featured DESC, j.published_at DESC';

  const jobs = await db.all(`
    SELECT j.id, j.title_fr, j.title_en, j.slug, j.work_mode, j.job_type,
           j.city, j.province, j.country, j.salary_min, j.salary_max, j.salary_currency,
           j.salary_period, j.skills_required, j.featured, j.views, j.applications_count, j.published_at,
           c.id as company_id, c.name as company_name, c.slug as company_slug,
           c.logo_url as company_logo, c.industry
    FROM nh_jobs j JOIN nh_companies c ON j.company_id = c.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${i} OFFSET $${i+1}
  `, [...params, parseInt(limit), offset]);

  const totalRes = await db.get(`SELECT COUNT(*) as n FROM nh_jobs j JOIN nh_companies c ON j.company_id = c.id ${whereClause}`, params);
  const total = parseInt(totalRes?.n || 0);
  res.json({ success: true, jobs, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

router.get('/stats', async (req, res) => {
  const [j, co, ca] = await Promise.all([
    db.get("SELECT COUNT(*) as n FROM nh_jobs WHERE status = 'active'"),
    db.get("SELECT COUNT(*) as n FROM nh_companies"),
    db.get("SELECT COUNT(*) as n FROM nh_users WHERE role = 'candidate'"),
  ]);
  res.json({ success: true, stats: { totalJobs: parseInt(j?.n || 0), totalCompanies: parseInt(co?.n || 0), totalCandidates: parseInt(ca?.n || 0) } });
});

router.get('/company/mine', requireAuth, requireCompanyAccess, async (req, res) => {
  const jobs = await db.all(`
    SELECT j.*, (SELECT COUNT(*) FROM nh_applications WHERE job_id = j.id) as apps
    FROM nh_jobs j WHERE j.company_id = $1 ORDER BY j.created_at DESC
  `, [req.session.user.company_id]);
  res.json({ success: true, jobs });
});

router.get('/:slug', async (req, res) => {
  const job = await db.get(`
    SELECT j.*, c.name as company_name, c.slug as company_slug,
           c.logo_url as company_logo, c.description_fr as company_desc_fr,
           c.description_en as company_desc_en, c.website as company_website,
           c.industry, c.size as company_size, c.city as company_city
    FROM nh_jobs j JOIN nh_companies c ON j.company_id = c.id
    WHERE j.slug = $1 AND j.status = 'active'
  `, [req.params.slug]);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
  await db.run('UPDATE nh_jobs SET views = views + 1 WHERE id = $1', [job.id]);
  res.json({ success: true, job });
});

// Also support lookup by id for openJobDetail()
router.get('/by-id/:id', async (req, res) => {
  const job = await db.get(`
    SELECT j.*, c.name as company_name, c.slug as company_slug,
           c.logo_url as company_logo, c.description_fr as company_desc_fr,
           c.description_en as company_desc_en, c.website as company_website,
           c.industry, c.size as company_size, c.city as company_city
    FROM nh_jobs j JOIN nh_companies c ON j.company_id = c.id
    WHERE j.id = $1 AND j.status = 'active'
  `, [req.params.id]);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
  await db.run('UPDATE nh_jobs SET views = views + 1 WHERE id = $1', [job.id]);
  res.json({ success: true, job });
});

router.post('/', requireAuth, requireCompanyAccess, async (req, res) => {
  const company_id = req.session.user.company_id;
  const company = await db.get('SELECT * FROM nh_companies WHERE id = $1', [company_id]);
  if (!company) return res.status(403).json({ success: false, error: 'Company not found' });

  const activeRes = await db.get("SELECT COUNT(*) as n FROM nh_jobs WHERE company_id = $1 AND status IN ('active','pending')", [company_id]);
  const activeCount = parseInt(activeRes?.n || 0);
  if (activeCount >= company.active_job_slots) {
    return res.status(403).json({ success: false, error: `Job slot limit reached (${company.active_job_slots}). Upgrade to post more.` });
  }

  const { title_fr, title_en, description_fr, description_en, requirements_fr, requirements_en, benefits_fr, benefits_en, job_type, work_mode, city, address, province, country, salary_min, salary_max, salary_currency, salary_period, experience_years, languages_required, skills_required } = req.body;
  if (!title_fr || !description_fr) return res.status(400).json({ success: false, error: 'title_fr and description_fr required' });

  const id = uuidv4().replace(/-/g, '');
  const baseSlug = (title_fr || title_en || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = `${baseSlug}-${id.slice(0, 6)}`;
  const skills = Array.isArray(skills_required) ? JSON.stringify(skills_required) : (skills_required || '[]');
  const langs = Array.isArray(languages_required) ? JSON.stringify(languages_required) : (languages_required || '[]');

  // ── AI Moderation ──────────────────────────────────────
  const modResult = await moderateJob({
    title_fr, title_en, description_fr, description_en,
    requirements_fr, requirements_en, salary_min, salary_max,
    company_name: company.name,
  });

  const jobStatus = modResult.verdict === 'auto_approved'  ? 'active'
                  : modResult.verdict === 'auto_rejected'  ? 'rejected'
                  : 'pending'; // pending_review → uses existing 'pending' value

  await db.run(`INSERT INTO nh_jobs (id, company_id, posted_by, title_fr, title_en, slug, description_fr, description_en, requirements_fr, requirements_en, benefits_fr, benefits_en, job_type, work_mode, city, address, province, country, salary_min, salary_max, salary_currency, salary_period, experience_years, languages_required, skills_required, status, ai_moderation_score, ai_moderation_flags, ai_moderation_verdict, moderation_reason)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)`,
    [id, company_id, req.session.user.id, title_fr, title_en || null, slug, description_fr, description_en || null,
     requirements_fr || null, requirements_en || null, benefits_fr || null, benefits_en || null,
     job_type || null, work_mode || null, city || null, address || null, province || null, country || 'Canada',
     salary_min ? parseInt(salary_min) : null, salary_max ? parseInt(salary_max) : null,
     salary_currency || 'CAD', salary_period || 'year', experience_years || null, langs, skills,
     jobStatus, modResult.score, JSON.stringify(modResult.flags), modResult.verdict, modResult.reason]);

  const job = await db.get('SELECT * FROM nh_jobs WHERE id = $1', [id]);

  if (modResult.verdict === 'auto_rejected') {
    return res.status(422).json({
      success: false,
      moderated: true,
      verdict: 'rejected',
      score: modResult.score,
      flags: modResult.flags,
      reason: modResult.reason || 'Votre offre ne respecte pas les critères de publication.',
    });
  }

  res.status(201).json({
    success: true,
    job,
    moderation: {
      verdict: modResult.verdict,
      score:   modResult.score,
      message: modResult.verdict === 'auto_approved'
        ? 'Votre offre est publiée immédiatement.'
        : 'Votre offre est en cours de vérification (24–48 h).',
    },
  });
});

router.put('/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  const job = await db.get('SELECT * FROM nh_jobs WHERE id = $1 AND company_id = $2', [req.params.id, req.session.user.company_id]);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const allowed = ['title_fr','title_en','description_fr','description_en','requirements_fr','requirements_en','benefits_fr','benefits_en','job_type','work_mode','city','address','province','country','salary_min','salary_max','salary_currency','salary_period','experience_years','status'];
  const sets = []; const vals = []; let p = 1;
  allowed.forEach(f => { if (req.body[f] !== undefined) { sets.push(`${f} = $${p}`); vals.push(req.body[f]); p++; } });
  if (!sets.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  await db.run(`UPDATE nh_jobs SET ${sets.join(', ')} WHERE id = $${p}`, vals);
  res.json({ success: true, job: await db.get('SELECT * FROM nh_jobs WHERE id = $1', [req.params.id]) });
});

// POST /api/jobs/:id/sponsor  — create Stripe checkout to boost a job listing
router.post('/:id/sponsor', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { days = 14 } = req.body;
    const job = await db.get('SELECT * FROM nh_jobs WHERE id = $1 AND company_id = $2', [req.params.id, req.session.user.company_id]);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const options = { 7: 4900, 14: 8900, 30: 17900 };
    const amount = options[parseInt(days)];
    if (!amount) return res.status(400).json({ success: false, error: 'Invalid duration — choose 7, 14 or 30 days' });

    const stripe = getStripe();
    const title  = job.title_fr || job.title_en || 'Job listing';

    const DEPLOY_URL = (process.env.REPLIT_DOMAINS || '').split(',')[0];
    const BASE_URL   = DEPLOY_URL ? `https://${DEPLOY_URL}` : 'https://nexhire.ca';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'cad',
          product_data: {
            name: `Nexhire Boost — "${title}" (${days} jours)`,
            description: 'Votre offre apparaît en tête des résultats pendant la durée choisie.',
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE_URL}/nexhire/?tab=jobs&boost_ok=1&job=${req.params.id}`,
      cancel_url:  `${BASE_URL}/nexhire/?tab=jobs`,
      metadata: { job_id: req.params.id, days: String(days), company_id: req.session.user.company_id, product: 'nexhire_boost' },
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  const job = await db.get('SELECT id, status FROM nh_jobs WHERE id = $1 AND company_id = $2', [req.params.id, req.session.user.company_id]);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
  if (job.status === 'rejected') {
    await db.run('DELETE FROM nh_jobs WHERE id = $1', [req.params.id]);
  } else {
    await db.run("UPDATE nh_jobs SET status = 'closed' WHERE id = $1", [req.params.id]);
  }
  res.json({ success: true });
});

// ── Q&A on job listings ───────────────────────────────────────
router.get('/:id/questions', async (req, res) => {
  try {
    const questions = await db.all(`
      SELECT q.*, u.first_name, u.last_name,
             ua.first_name AS ans_first, ua.last_name AS ans_last
      FROM nh_job_questions q
      LEFT JOIN nh_users u  ON u.id = q.author_id
      LEFT JOIN nh_users ua ON ua.id = q.answered_by
      WHERE q.job_id = $1 AND q.is_public = true
      ORDER BY q.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, questions });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/:id/questions', requireAuth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) return res.status(400).json({ success: false, error: 'question required' });
    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await db.run(`
      INSERT INTO nh_job_questions (id, job_id, author_id, question)
      VALUES ($1,$2,$3,$4)
    `, [id, req.params.id, req.session.user.id, question.trim()]);
    const q = await db.get(`
      SELECT q.*, u.first_name, u.last_name FROM nh_job_questions q
      LEFT JOIN nh_users u ON u.id = q.author_id WHERE q.id = $1
    `, [id]);
    res.json({ success: true, question: q });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/:id/questions/:qid/answer', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'employer')
      return res.status(403).json({ success: false, error: 'Employers only' });
    const { answer } = req.body;
    if (!answer?.trim()) return res.status(400).json({ success: false, error: 'answer required' });
    const job = await db.get(
      'SELECT id FROM nh_jobs WHERE id = $1 AND company_id = $2',
      [req.params.id, req.session.user.company_id]
    );
    if (!job) return res.status(403).json({ success: false, error: 'Forbidden' });
    await db.run(`
      UPDATE nh_job_questions SET answer = $1, answered_by = $2, answered_at = NOW()
      WHERE id = $3 AND job_id = $4
    `, [answer.trim(), req.session.user.id, req.params.qid, req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
