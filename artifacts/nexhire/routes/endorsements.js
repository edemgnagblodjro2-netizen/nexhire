const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

const VALID_QUALITIES = ['skills','serious','punctual','expertise','communication','leadership'];

router.get('/api/endorsements/:candidateId', async (req, res) => {
  const { candidateId } = req.params;
  if (!candidateId) return res.status(400).json({ error: 'candidateId required' });
  try {
    const rows = await db.all(
      `SELECT quality, count(*)::int as count FROM endorsements WHERE candidate_id = $1 GROUP BY quality`,
      [candidateId]
    );
    const byQuality = {};
    let total = 0;
    for (const r of rows) { byQuality[r.quality] = parseInt(r.count); total += parseInt(r.count); }

    const endorsersByQuality = {};
    for (const r of rows) {
      const endorsers = await db.all(`
        SELECT e.endorser_id as id,
               COALESCE(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')), 'Nexhire member') as name
        FROM endorsements e
        LEFT JOIN nh_users u ON u.id = e.endorser_id
        WHERE e.candidate_id = $1 AND e.quality = $2
        LIMIT 5
      `, [candidateId, r.quality]);
      endorsersByQuality[r.quality] = endorsers;
    }

    const myEndorsements = [];
    if (req.session?.user?.id) {
      const mine = await db.all(
        `SELECT quality FROM endorsements WHERE endorser_id = $1 AND candidate_id = $2`,
        [req.session.user.id, candidateId]
      );
      mine.forEach(r => myEndorsements.push(r.quality));
    }

    res.json({ total, byQuality, endorsersByQuality, myEndorsements });
  } catch (err) {
    console.error('GET endorsements error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/endorsements', requireAuth, async (req, res) => {
  const uid = req.session.user.id;
  const { candidateId, quality } = req.body || {};
  if (!candidateId || !VALID_QUALITIES.includes(quality)) return res.status(400).json({ error: 'Invalid request' });
  if (candidateId === uid) return res.status(400).json({ error: 'Cannot endorse yourself' });
  try {
    await db.run(
      `INSERT INTO endorsements (endorser_id, candidate_id, quality)
       VALUES ($1, $2, $3)
       ON CONFLICT (endorser_id, candidate_id, quality) DO NOTHING`,
      [uid, candidateId, quality]
    );
    const row = await db.get(`SELECT count(*)::int as count FROM endorsements WHERE candidate_id = $1`, [candidateId]);
    res.json({ success: true, total: parseInt(row.count) });
  } catch (err) {
    console.error('POST endorsements error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/api/endorsements/:candidateId/:quality', requireAuth, async (req, res) => {
  const uid = req.session.user.id;
  const { candidateId, quality } = req.params;
  if (!VALID_QUALITIES.includes(quality)) return res.status(400).json({ error: 'Invalid quality' });
  try {
    await db.run(
      `DELETE FROM endorsements WHERE endorser_id = $1 AND candidate_id = $2 AND quality = $3`,
      [uid, candidateId, quality]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
