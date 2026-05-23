const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { q, city, province, work_mode, job_type, salary_min, featured, days_ago, lang_filter, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const where = ["j.status = 'active'"];
  let i = 1;

  if (q) {
    where.push(`(j.title_fr ILIKE $${i} OR j.title_en ILIKE $${i} OR c.name ILIKE $${i} OR j.city ILIKE $${i} OR j.province ILIKE $${i})`);
    params.push(`%${q}%`); i++;
  }
  if (province) { where.push(`j.province = $${i}`); params.push(province); i++; }
  if (city) { where.push(`j.city ILIKE $${i}`); params.push(`%${city}%`); i++; }
  if (work_mode) { where.push(`j.work_mode = $${i}`); params.push(work_mode); i++; }
  if (job_type) { where.push(`j.job_type = $${i}`); params.push(job_type); i++; }
  if (salary_min) { where.push(`(j.salary_max >= $${i} OR j.salary_min >= $${i})`); params.push(parseInt(salary_min)); i++; }
  if (featured === 'true') { where.push(`j.featured = TRUE`); }
  if (days_ago && !isNaN(parseInt(days_ago))) {
    where.push(`j.published_at >= NOW() - INTERVAL '${parseInt(days_ago)} days'`);
  }
  if (lang_filter) {
    where.push(`j.languages_required ILIKE $${i}`);
    params.push(`%${lang_filter}%`); i++;
  }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const jobs = await db.all(`
    SELECT j.id, j.title_fr, j.title_en, j.slug, j.work_mode, j.job_type,
           j.city, j.province, j.country, j.salary_min, j.salary_max, j.salary_currency,
           j.skills_required, j.featured, j.views, j.applications_count, j.published_at,
           c.id as company_id, c.name as company_name, c.slug as company_slug,
           c.logo_url as company_logo, c.industry
    FROM nh_jobs j JOIN nh_companies c ON j.company_id = c.id
    ${whereClause}
    ORDER BY j.featured DESC, j.published_at DESC
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

  const { title_fr, title_en, description_fr, description_en, requirements_fr, requirements_en, benefits_fr, benefits_en, job_type, work_mode, city, province, country, salary_min, salary_max, salary_currency, experience_years, languages_required, skills_required } = req.body;
  if (!title_fr || !description_fr) return res.status(400).json({ success: false, error: 'title_fr and description_fr required' });

  const id = uuidv4().replace(/-/g, '');
  const baseSlug = (title_fr || title_en || 'job').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = `${baseSlug}-${id.slice(0, 6)}`;
  const skills = Array.isArray(skills_required) ? JSON.stringify(skills_required) : (skills_required || '[]');
  const langs = Array.isArray(languages_required) ? JSON.stringify(languages_required) : (languages_required || '[]');

  await db.run(`INSERT INTO nh_jobs (id, company_id, posted_by, title_fr, title_en, slug, description_fr, description_en, requirements_fr, requirements_en, benefits_fr, benefits_en, job_type, work_mode, city, province, country, salary_min, salary_max, salary_currency, experience_years, languages_required, skills_required)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    [id, company_id, req.session.user.id, title_fr, title_en || null, slug, description_fr, description_en || null,
     requirements_fr || null, requirements_en || null, benefits_fr || null, benefits_en || null,
     job_type || null, work_mode || null, city || null, province || null, country || 'Canada',
     salary_min ? parseInt(salary_min) : null, salary_max ? parseInt(salary_max) : null,
     salary_currency || 'CAD', experience_years || null, langs, skills]);

  const job = await db.get('SELECT * FROM nh_jobs WHERE id = $1', [id]);
  res.status(201).json({ success: true, job });
});

router.put('/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  const job = await db.get('SELECT * FROM nh_jobs WHERE id = $1 AND company_id = $2', [req.params.id, req.session.user.company_id]);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

  const allowed = ['title_fr','title_en','description_fr','description_en','requirements_fr','requirements_en','job_type','work_mode','city','province','country','salary_min','salary_max','status'];
  const sets = []; const vals = []; let p = 1;
  allowed.forEach(f => { if (req.body[f] !== undefined) { sets.push(`${f} = $${p}`); vals.push(req.body[f]); p++; } });
  if (!sets.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.params.id);
  await db.run(`UPDATE nh_jobs SET ${sets.join(', ')} WHERE id = $${p}`, vals);
  res.json({ success: true, job: await db.get('SELECT * FROM nh_jobs WHERE id = $1', [req.params.id]) });
});

router.delete('/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  const job = await db.get('SELECT id FROM nh_jobs WHERE id = $1 AND company_id = $2', [req.params.id, req.session.user.company_id]);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
  await db.run("UPDATE nh_jobs SET status = 'closed' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
