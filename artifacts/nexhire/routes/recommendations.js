const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');

function makeId() {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
function makeToken() {
  return crypto.randomBytes(18).toString('hex');
}

/* GET — my approved recommendations */
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT * FROM nh_recommendations WHERE candidate_id=$1 AND status='approved' ORDER BY created_at DESC`,
      [req.session.user.id]
    );
    res.json({ success: true, recommendations: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load recommendations' });
  }
});

/* GET — public recs for a candidate */
router.get('/public/:candidateId', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT id,recommender_name,recommender_title,recommender_company,recommender_photo,body,rating,created_at
       FROM nh_recommendations WHERE candidate_id=$1 AND status='approved' ORDER BY created_at DESC`,
      [req.params.candidateId]
    );
    res.json({ success: true, recommendations: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load recommendations' });
  }
});

/* GET — pending (invited, not yet filled) */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT id,token,recommender_name,recommender_title,created_at
       FROM nh_recommendations WHERE candidate_id=$1 AND status='pending' ORDER BY created_at DESC`,
      [req.session.user.id]
    );
    res.json({ success: true, pending: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST — add external rec (copy-paste, approved immediately) */
router.post('/', requireAuth, async (req, res) => {
  const { recommender_name, recommender_title = '', recommender_company = '', recommender_photo = '', body, rating = 5 } = req.body;
  if (!recommender_name?.trim()) return res.status(400).json({ success: false, error: 'Recommender name required' });
  if (!body?.trim()) return res.status(400).json({ success: false, error: 'Recommendation text required' });
  const safeRating = Math.max(1, Math.min(5, parseInt(rating) || 5));
  try {
    const id = makeId();
    await db.run(
      `INSERT INTO nh_recommendations (id,candidate_id,recommender_name,recommender_title,recommender_company,recommender_photo,body,rating,source,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'external','approved')`,
      [id, req.session.user.id, recommender_name.trim().slice(0,100), recommender_title.trim().slice(0,100),
       recommender_company.trim().slice(0,100), recommender_photo.trim().slice(0,500), body.trim().slice(0,2000), safeRating]
    );
    const row = await db.get('SELECT * FROM nh_recommendations WHERE id=$1', [id]);
    res.json({ success: true, recommendation: row });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not save recommendation' });
  }
});

/* POST /invite — create invite link (pending until recommender fills it) */
router.post('/invite', requireAuth, async (req, res) => {
  const { recommender_name, recommender_title = '', recommender_company = '' } = req.body;
  if (!recommender_name?.trim()) return res.status(400).json({ success: false, error: 'Recommender name required' });
  try {
    const id = makeId();
    const token = makeToken();
    await db.run(
      `INSERT INTO nh_recommendations (id,candidate_id,recommender_name,recommender_title,recommender_company,recommender_photo,body,rating,source,token,status)
       VALUES ($1,$2,$3,$4,$5,'','',5,'internal',$6,'pending')`,
      [id, req.session.user.id, recommender_name.trim().slice(0,100), recommender_title.trim().slice(0,100),
       recommender_company.trim().slice(0,100), token]
    );
    res.json({ success: true, token, id });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not create invite' });
  }
});

/* GET /fill/:token — public: get candidate info for the form */
router.get('/fill/:token', async (req, res) => {
  try {
    const row = await db.get(
      `SELECT r.id, r.recommender_name, r.recommender_title, r.recommender_company, r.status,
              u.first_name, u.last_name, cp.headline_en, cp.headline_fr, u.avatar_url
       FROM nh_recommendations r
       JOIN nh_users u ON u.id = r.candidate_id
       LEFT JOIN nh_candidate_profiles cp ON cp.user_id = r.candidate_id
       WHERE r.token=$1`,
      [req.params.token]
    );
    if (!row) return res.status(404).json({ success: false, error: 'Link not found or expired' });
    if (row.status === 'approved') return res.json({ success: true, already_filled: true });
    res.json({ success: true, candidate: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* POST /fill/:token — public: submit the recommendation */
router.post('/fill/:token', async (req, res) => {
  const { body, rating = 5, recommender_name, recommender_title = '', recommender_company = '' } = req.body;
  if (!body?.trim()) return res.status(400).json({ success: false, error: 'Recommendation text required' });
  const safeRating = Math.max(1, Math.min(5, parseInt(rating) || 5));
  try {
    const row = await db.get('SELECT id, status FROM nh_recommendations WHERE token=$1', [req.params.token]);
    if (!row) return res.status(404).json({ success: false, error: 'Link not found' });
    if (row.status === 'approved') return res.status(409).json({ success: false, error: 'Already submitted' });
    await db.run(
      `UPDATE nh_recommendations SET body=$1, rating=$2, recommender_name=$3, recommender_title=$4, recommender_company=$5, status='approved' WHERE token=$6`,
      [body.trim().slice(0,2000), safeRating,
       (recommender_name||'').trim().slice(0,100), recommender_title.trim().slice(0,100),
       recommender_company.trim().slice(0,100), req.params.token]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* DELETE — remove own recommendation */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.get('SELECT candidate_id FROM nh_recommendations WHERE id=$1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    if (row.candidate_id !== req.session.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });
    await db.run('DELETE FROM nh_recommendations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
