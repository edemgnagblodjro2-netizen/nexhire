const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

router.get('/company/:companyId', async (req, res) => {
  const reviews = await db.all(`
    SELECT r.id, r.rating, r.title, r.pros, r.cons, r.interview_difficulty, r.recommend,
           r.anonymous, r.created_at,
           CASE WHEN r.anonymous THEN 'Anonymous' ELSE u.first_name END as reviewer_name
    FROM nh_company_reviews r
    JOIN nh_users u ON r.user_id = u.id
    WHERE r.company_id = $1 ORDER BY r.created_at DESC LIMIT 20
  `, [req.params.companyId]);
  const stats = await db.get(`
    SELECT AVG(rating)::numeric(3,1) as avg_rating, COUNT(*) as total,
           SUM(CASE WHEN recommend THEN 1 ELSE 0 END) as would_recommend
    FROM nh_company_reviews WHERE company_id = $1
  `, [req.params.companyId]);
  res.json({ success: true, reviews, stats });
});

router.post('/company/:companyId', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  const { rating, title, pros, cons, interview_difficulty, recommend, anonymous = true } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, error: 'Rating 1-5 required' });

  const applied = await db.get(`
    SELECT a.id FROM nh_applications a
    JOIN nh_jobs j ON a.job_id = j.id
    WHERE j.company_id = $1 AND a.user_id = $2 LIMIT 1
  `, [req.params.companyId, req.session.user.id]);
  if (!applied) return res.status(403).json({ success: false, error: 'You must have applied to this company to leave a review' });

  const id = uuidv4().replace(/-/g, '');
  try {
    await db.run(`
      INSERT INTO nh_company_reviews (id, company_id, user_id, rating, title, pros, cons, interview_difficulty, recommend, anonymous)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (company_id, user_id) DO UPDATE SET
        rating=$4, title=$5, pros=$6, cons=$7, interview_difficulty=$8, recommend=$9, anonymous=$10
    `, [id, req.params.companyId, req.session.user.id, parseInt(rating), title || null, pros || null, cons || null, interview_difficulty || null, recommend ?? true, anonymous]);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
