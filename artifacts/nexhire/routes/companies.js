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

router.get('/:slug', async (req, res) => {
  const company = await db.get('SELECT * FROM nh_companies WHERE slug = $1', [req.params.slug]);
  if (!company) return res.status(404).json({ success: false, error: 'Company not found' });
  const jobs = await db.all("SELECT id, title_fr, title_en, slug, work_mode, city, salary_min, salary_max, published_at FROM nh_jobs WHERE company_id = $1 AND status = 'active' ORDER BY published_at DESC", [company.id]);
  res.json({ success: true, company, jobs });
});

module.exports = router;
