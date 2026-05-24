const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

const VALID_TYPES = ['project', 'cert', 'achievement', 'available'];

/* GET — own highlights or public view by candidateId */
router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM nh_highlights WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json({ success: true, highlights: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load highlights' });
  }
});

router.get('/public/:userId', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT id, type, title, description, url, created_at FROM nh_highlights WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json({ success: true, highlights: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load highlights' });
  }
});

/* POST — add */
router.post('/', requireAuth, async (req, res) => {
  const { type, title, description = '', url = '' } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ success: false, error: 'Title is required' });
  const safeType = VALID_TYPES.includes(type) ? type : 'project';
  try {
    const { nanoid } = await import('nanoid').catch(() => ({ nanoid: () => Math.random().toString(36).slice(2, 10) }));
    const id = `hl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.run(
      'INSERT INTO nh_highlights (id, user_id, type, title, description, url) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, req.session.user.id, safeType, title.trim().slice(0, 200), description.trim().slice(0, 500), url.trim().slice(0, 500)]
    );
    const row = await db.get('SELECT * FROM nh_highlights WHERE id = $1', [id]);
    res.json({ success: true, highlight: row });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not save highlight' });
  }
});

/* DELETE */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.get('SELECT user_id FROM nh_highlights WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    if (row.user_id !== req.session.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });
    await db.run('DELETE FROM nh_highlights WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not delete highlight' });
  }
});

module.exports = router;
