const router   = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db        = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');

const feedUpDir = path.join(__dirname, '../uploads/feed');
if (!fs.existsSync(feedUpDir)) fs.mkdirSync(feedUpDir, { recursive: true });

const feedStorage = multer.diskStorage({
  destination: feedUpDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});
const feedMulter = multer({
  storage: feedStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, ['.jpg','.jpeg','.png','.gif','.webp'].includes(
      path.extname(file.originalname).toLowerCase()
    ));
  },
});

// ── GET /api/feed ─────────────────────────────────────────────
// Cursor-based (keyset) pagination — O(1) at any depth.
// cursor = base64(JSON{ts, id}) of the last post on previous page.
// Response includes nextCursor (null when no more posts).
router.get('/', async (req, res) => {
  try {
    const limit  = Math.min(30, parseInt(req.query.limit) || 15);
    const type   = req.query.type || 'all';
    const uid    = req.session?.user?.id || null;

    // Decode cursor
    let cursorTs = null;
    let cursorId = null;
    if (req.query.cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(req.query.cursor, 'base64').toString('utf8'));
        cursorTs = decoded.ts;
        cursorId = decoded.id;
      } catch { /* invalid cursor → treat as first page */ }
    }

    // Build WHERE clauses
    const vals = [];
    const where = ['p.is_active = true'];

    if (type !== 'all') {
      vals.push(type);
      where.push(`p.type = $${vals.length}`);
    }
    if (cursorTs && cursorId) {
      vals.push(cursorTs, cursorId);
      where.push(`(p.created_at, p.id) < ($${vals.length - 1}::timestamptz, $${vals.length})`);
    }

    vals.push(limit + 1); // fetch one extra to detect next page
    const rows = await db.all(`
      SELECT p.*, u.first_name, u.last_name, u.email,
             cp.headline_en, cp.headline_fr
      FROM nh_posts p
      LEFT JOIN nh_users u  ON u.id = p.author_id
      LEFT JOIN nh_candidate_profiles cp ON cp.user_id = p.author_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $${vals.length}
    `, vals);

    const hasMore = rows.length > limit;
    const posts   = hasMore ? rows.slice(0, limit) : rows;

    // Build nextCursor from last post in this page
    let nextCursor = null;
    if (hasMore && posts.length) {
      const last = posts[posts.length - 1];
      nextCursor = Buffer.from(JSON.stringify({ ts: last.created_at, id: last.id })).toString('base64');
    }

    // Batch-fetch likes for current user
    if (uid && posts.length) {
      const ids = posts.map(p => `'${String(p.id).replace(/'/g,'')}'`).join(',');
      const liked = await db.all(
        `SELECT post_id FROM nh_post_likes WHERE user_id = $1 AND post_id IN (${ids})`,
        [uid]
      );
      const likedSet = new Set(liked.map(r => r.post_id));
      posts.forEach(p => { p.is_liked_by_me = likedSet.has(p.id); });
    } else {
      posts.forEach(p => { p.is_liked_by_me = false; });
    }

    res.json({ success: true, posts, nextCursor });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/feed — create post ──────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { type = 'text', content, image_url, article_title, article_body, job_id } = req.body;

    if (type === 'text' && !content?.trim())
      return res.status(400).json({ success: false, error: 'content required for text posts' });
    if (type === 'article' && (!article_title?.trim() || !article_body?.trim()))
      return res.status(400).json({ success: false, error: 'article_title and article_body required' });

    const id = uuidv4();
    await db.run(`
      INSERT INTO nh_posts (id, author_id, type, content, image_url, article_title, article_body, job_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [id, uid, type,
        content?.trim()       || null,
        image_url             || null,
        article_title?.trim() || null,
        article_body?.trim()  || null,
        job_id                || null]);

    const post = await db.get(`
      SELECT p.*, u.first_name, u.last_name, cp.headline_en, cp.headline_fr
      FROM nh_posts p
      LEFT JOIN nh_users u ON u.id = p.author_id
      LEFT JOIN nh_candidate_profiles cp ON cp.user_id = p.author_id
      WHERE p.id = $1
    `, [id]);
    if (post) post.is_liked_by_me = false;

    res.json({ success: true, post });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── DELETE /api/feed/:id — soft delete ────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await db.get('SELECT author_id FROM nh_posts WHERE id = $1', [req.params.id]);
    if (!post) return res.status(404).json({ success: false, error: 'Post not found' });
    if (post.author_id !== req.session.user.id)
      return res.status(403).json({ success: false, error: 'Forbidden' });
    await db.run('UPDATE nh_posts SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/feed/:id/like — toggle like ─────────────────────
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const pid = req.params.id;
    const existing = await db.get(
      'SELECT id FROM nh_post_likes WHERE post_id = $1 AND user_id = $2', [pid, uid]
    );
    if (existing) {
      await db.run('DELETE FROM nh_post_likes WHERE post_id = $1 AND user_id = $2', [pid, uid]);
      await db.run('UPDATE nh_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [pid]);
    } else {
      await db.run('INSERT INTO nh_post_likes (id, post_id, user_id) VALUES ($1,$2,$3)', [uuidv4(), pid, uid]);
      await db.run('UPDATE nh_posts SET likes_count = likes_count + 1 WHERE id = $1', [pid]);
    }
    const updated = await db.get('SELECT likes_count FROM nh_posts WHERE id = $1', [pid]);
    res.json({ success: true, liked: !existing, count: updated?.likes_count || 0 });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/feed/:id/comments ────────────────────────────────
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await db.all(`
      SELECT c.*, u.first_name, u.last_name
      FROM nh_post_comments c
      LEFT JOIN nh_users u ON u.id = c.author_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.id]);
    res.json({ success: true, comments });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/feed/:id/comment ────────────────────────────────
router.post('/:id/comment', requireAuth, async (req, res) => {
  try {
    const { content, parent_id } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, error: 'content required' });
    const uid = req.session.user.id;
    const id = uuidv4();
    await db.run(`
      INSERT INTO nh_post_comments (id, post_id, author_id, content, parent_id)
      VALUES ($1,$2,$3,$4,$5)
    `, [id, req.params.id, uid, content.trim(), parent_id || null]);
    await db.run('UPDATE nh_posts SET comments_count = comments_count + 1 WHERE id = $1', [req.params.id]);
    const comment = await db.get(`
      SELECT c.*, u.first_name, u.last_name
      FROM nh_post_comments c
      LEFT JOIN nh_users u ON u.id = c.author_id
      WHERE c.id = $1
    `, [id]);
    res.json({ success: true, comment });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/feed/upload — image upload ──────────────────────
router.post('/upload', requireAuth, feedMulter.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded' });
  const baseUrl = process.env.BASE_URL || 'https://nexhire.ca';
  res.json({ success: true, url: `${baseUrl}/uploads/feed/${req.file.filename}` });
});

module.exports = router;
