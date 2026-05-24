const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

function makeId() {
  return `ps_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM nh_profile_skills WHERE user_id = $1 ORDER BY type, created_at ASC',
      [req.session.user.id]
    );
    res.json({ success: true, skills: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not load skills' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, level = 75, type = 'hard' } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
  const safeType = ['hard', 'soft'].includes(type) ? type : 'hard';
  const safeLevel = Math.max(0, Math.min(100, parseInt(level) || 75));
  try {
    const id = makeId();
    await db.run(
      'INSERT INTO nh_profile_skills (id, user_id, name, level, type) VALUES ($1,$2,$3,$4,$5)',
      [id, req.session.user.id, name.trim().slice(0, 80), safeLevel, safeType]
    );
    const row = await db.get('SELECT * FROM nh_profile_skills WHERE id = $1', [id]);
    res.json({ success: true, skill: row });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not save skill' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.get('SELECT user_id FROM nh_profile_skills WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    if (row.user_id !== req.session.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });
    const { level } = req.body;
    const safeLevel = Math.max(0, Math.min(100, parseInt(level) || 75));
    await db.run('UPDATE nh_profile_skills SET level = $1 WHERE id = $2', [safeLevel, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not update skill' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.get('SELECT user_id FROM nh_profile_skills WHERE id = $1', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });
    if (row.user_id !== req.session.user.id) return res.status(403).json({ success: false, error: 'Forbidden' });
    await db.run('DELETE FROM nh_profile_skills WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not delete skill' });
  }
});

module.exports = router;
