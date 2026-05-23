const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');

// GET all notes for an application
router.get('/api/notes/:appId', requireAuth, requireCompanyAccess, async (req, res) => {
  const { appId } = req.params;
  try {
    // Verify employer has access to this application
    const app = await db.get(
      `SELECT a.id FROM nh_applications a
       JOIN nh_jobs j ON a.job_id = j.id
       WHERE a.id = $1 AND j.company_id = $2`,
      [appId, req.session.user.company_id]
    );
    if (!app) return res.status(403).json({ error: 'Access denied' });

    const notes = await db.all(
      `SELECT n.id, n.content, n.created_at,
              TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) as author_name,
              n.author_id
       FROM nh_application_notes n
       LEFT JOIN nh_users u ON u.id = n.author_id
       WHERE n.application_id = $1
       ORDER BY n.created_at ASC`,
      [appId]
    );
    res.json({ notes });
  } catch (err) {
    console.error('GET notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new note
router.post('/api/notes', requireAuth, requireCompanyAccess, async (req, res) => {
  const { appId, content } = req.body || {};
  if (!appId || !content?.trim()) return res.status(400).json({ error: 'appId and content required' });
  try {
    const app = await db.get(
      `SELECT a.id FROM nh_applications a
       JOIN nh_jobs j ON a.job_id = j.id
       WHERE a.id = $1 AND j.company_id = $2`,
      [appId, req.session.user.company_id]
    );
    if (!app) return res.status(403).json({ error: 'Access denied' });

    const id = uuidv4().replace(/-/g, '');
    await db.run(
      `INSERT INTO nh_application_notes (id, application_id, author_id, content) VALUES ($1,$2,$3,$4)`,
      [id, appId, req.session.user.id, content.trim()]
    );
    const note = await db.get(
      `SELECT n.*, TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) as author_name
       FROM nh_application_notes n LEFT JOIN nh_users u ON u.id = n.author_id
       WHERE n.id = $1`,
      [id]
    );
    res.status(201).json({ note });
  } catch (err) {
    console.error('POST note error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a note (only own notes)
router.delete('/api/notes/:noteId', requireAuth, async (req, res) => {
  const { noteId } = req.params;
  try {
    const note = await db.get(
      `SELECT id FROM nh_application_notes WHERE id = $1 AND author_id = $2`,
      [noteId, req.session.user.id]
    );
    if (!note) return res.status(403).json({ error: 'Access denied' });
    await db.run(`DELETE FROM nh_application_notes WHERE id = $1`, [noteId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
