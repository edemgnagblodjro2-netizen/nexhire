const router = require('express').Router();
const db = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');

router.get('/me/profile', requireAuth, requireCompanyAccess, async (req, res) => {
  const company = await db.get('SELECT * FROM nh_companies WHERE id = $1', [req.session.user.company_id]);
  if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
  res.json({ success: true, company });
});

router.put('/me/profile', requireAuth, requireCompanyAccess, async (req, res) => {
  const allowed = ['name','description_fr','description_en','website','industry','size','logo_url','city','country'];
  const sets = []; const vals = []; let p = 1;
  allowed.forEach(f => { if (req.body[f] !== undefined) { sets.push(`${f} = $${p}`); vals.push(req.body[f]); p++; } });
  if (!sets.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.session.user.company_id);
  await db.run(`UPDATE nh_companies SET ${sets.join(', ')} WHERE id = $${p}`, vals);
  res.json({ success: true, company: await db.get('SELECT * FROM nh_companies WHERE id = $1', [req.session.user.company_id]) });
});

router.get('/', async (req, res) => {
  try {
    const companies = await db.all(`
      SELECT c.id, c.name, c.slug, c.description_en, c.description_fr, c.logo_url,
             c.industry, c.size, c.city, c.country, c.website, c.verified,
             COUNT(DISTINCT j.id) FILTER (WHERE j.status='active') as active_jobs,
             ROUND(AVG(r.rating)::numeric, 1) as avg_rating,
             COUNT(DISTINCT r.id) as review_count
      FROM nh_companies c
      LEFT JOIN nh_jobs j ON j.company_id = c.id
      LEFT JOIN nh_company_reviews r ON r.company_id = c.id
      GROUP BY c.id
      ORDER BY c.verified DESC, COUNT(DISTINCT j.id) FILTER (WHERE j.status='active') DESC
      LIMIT 50
    `);
    res.json({ success: true, companies });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const c = await db.get(`
      SELECT c.*,
             ROUND(AVG(r.rating)::numeric, 1) as avg_rating,
             COUNT(DISTINCT r.id) as review_count
      FROM nh_companies c
      LEFT JOIN nh_company_reviews r ON r.company_id = c.id
      WHERE c.slug = $1
      GROUP BY c.id
    `, [req.params.slug]);
    if (!c) return res.status(404).json({ success: false, error: 'Company not found' });

    const jobs = await db.all(`
      SELECT id, title_en, title_fr, work_mode, city, province, salary_min, salary_max,
             salary_currency, job_type, created_at, slug, featured
      FROM nh_jobs WHERE company_id = $1 AND status = 'active'
      ORDER BY featured DESC, created_at DESC LIMIT 20
    `, [c.id]);

    const reviews = await db.all(`
      SELECT rating, title, body, pros, cons, recommend,
             position, employment_type, created_at
      FROM nh_company_reviews
      WHERE company_id = $1
      ORDER BY created_at DESC LIMIT 20
    `, [c.id]);

    const ratingDist = await db.all(`
      SELECT rating, COUNT(*) as n FROM nh_company_reviews
      WHERE company_id = $1 GROUP BY rating ORDER BY rating DESC
    `, [c.id]);

    res.json({ success: true, company: c, jobs, reviews, ratingDist });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/:slug/reviews', async (req, res) => {
  try {
    const c = await db.get('SELECT id FROM nh_companies WHERE slug = $1', [req.params.slug]);
    if (!c) return res.status(404).json({ success: false, error: 'Company not found' });

    const { rating, title, body, pros, cons, recommend, position, employment_type } = req.body;
    if (!rating || parseInt(rating) < 1 || parseInt(rating) > 5) {
      return res.status(400).json({ success: false, error: 'Rating 1–5 required' });
    }
    const userId = req.session?.user?.id || null;
    const id = require('crypto').randomUUID();
    await db.run(`
      INSERT INTO nh_company_reviews (id, company_id, user_id, rating, title, body, pros, cons, recommend, position, employment_type)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [id, c.id, userId, parseInt(rating), title || null, body || null,
        pros || null, cons || null, recommend === true || recommend === 'true',
        position || null, employment_type || null]);
    res.json({ success: true });
  } catch (e) {
    if (e.message?.includes('unique') || e.code === '23505') {
      return res.status(409).json({ success: false, error: 'Already reviewed' });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
