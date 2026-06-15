const router = require('express').Router();
const db = require('../models/db');
const { requireRole } = require('../middleware/auth');

router.use(requireRole('admin'));

router.get('/stats', async (req, res) => {
  const [u, j, c, a] = await Promise.all([
    db.get('SELECT COUNT(*) as n FROM nh_users'),
    db.get("SELECT COUNT(*) as n FROM nh_jobs WHERE status = 'active'"),
    db.get('SELECT COUNT(*) as n FROM nh_companies'),
    db.get('SELECT COUNT(*) as n FROM nh_applications'),
  ]);
  res.json({ success: true, stats: { totalUsers: parseInt(u?.n||0), totalJobs: parseInt(j?.n||0), totalCompanies: parseInt(c?.n||0), totalApplications: parseInt(a?.n||0) } });
});

router.get('/jobs/pending', async (req, res) => {
  const jobs = await db.all("SELECT j.*, c.name as company_name FROM nh_jobs j JOIN nh_companies c ON j.company_id = c.id WHERE j.status = 'pending' ORDER BY j.created_at DESC");
  res.json({ success: true, jobs });
});

router.put('/jobs/:id/approve', async (req, res) => {
  await db.run("UPDATE nh_jobs SET status = 'active', published_at = NOW() WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

router.put('/jobs/:id/reject', async (req, res) => {
  await db.run("UPDATE nh_jobs SET status = 'closed' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// ── Skill Tests admin CRUD ────────────────────────────────────
router.get('/skill-tests', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.id, t.slug, t.title_fr, t.title_en, t.category, t.difficulty, t.pass_score,
              jsonb_array_length(t.questions) as question_count,
              COUNT(r.id) as attempts
       FROM nh_skill_tests t
       LEFT JOIN nh_skill_results r ON r.test_id = t.id
       GROUP BY t.id ORDER BY t.category, t.difficulty`
    );
    res.json({ success: true, tests: rows });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/skill-tests/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM nh_skill_tests WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, test: rows[0] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/skill-tests', async (req, res) => {
  try {
    const crypto = require('crypto');
    const { slug, title_fr, title_en, category, difficulty, pass_score, questions } = req.body;
    if (!slug || !title_en || !category || !difficulty || !Array.isArray(questions) || questions.length < 5) {
      return res.status(400).json({ success: false, error: 'Missing fields or fewer than 5 questions' });
    }
    const id = crypto.randomUUID();
    await db.run(
      `INSERT INTO nh_skill_tests (id,slug,title_fr,title_en,category,difficulty,questions,pass_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, slug, title_fr || title_en, title_en, category, difficulty, JSON.stringify(questions), pass_score || 70]
    );
    res.json({ success: true, id });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, error: 'Slug already exists' });
    res.status(500).json({ success: false, error: e.message });
  }
});

router.put('/skill-tests/:id', async (req, res) => {
  try {
    const { title_fr, title_en, category, difficulty, pass_score, questions } = req.body;
    if (Array.isArray(questions) && questions.length < 5) {
      return res.status(400).json({ success: false, error: 'Minimum 5 questions required' });
    }
    await db.run(
      `UPDATE nh_skill_tests SET title_fr=$1, title_en=$2, category=$3, difficulty=$4, pass_score=$5, questions=COALESCE($6::jsonb, questions) WHERE id=$7`,
      [title_fr, title_en, category, difficulty, pass_score || 70, Array.isArray(questions) ? JSON.stringify(questions) : null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/skill-tests/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM nh_skill_tests WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── TENANTS (employeurs + entreprises) ────────────────────────
router.get('/tenants', async (req, res) => {
  try {
    const companies = await db.all(`
      SELECT c.*,
             COUNT(DISTINCT j.id) as job_count,
             COUNT(DISTINCT u.id) as member_count,
             c.created_at as joined
      FROM nh_companies c
      LEFT JOIN nh_jobs j ON j.company_id = c.id
      LEFT JOIN nh_users u ON u.company_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, tenants: companies });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/tenants/:id/verify', async (req, res) => {
  try {
    await db.run('UPDATE nh_companies SET verified = NOT COALESCE(verified, false) WHERE id = $1', [req.params.id]);
    const c = await db.get('SELECT verified FROM nh_companies WHERE id = $1', [req.params.id]);
    res.json({ success: true, verified: c?.verified });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete('/tenants/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM nh_companies WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── USERS list ────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await db.all(`
      SELECT id, first_name, last_name, email, role, created_at, company_id
      FROM nh_users
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, users });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── User detail (profil complet) ──────────────────────────
router.get('/users/:id/detail', async (req, res) => {
  try {
    const user = await db.get('SELECT id, first_name, last_name, email, phone, role, created_at, avatar_url FROM nh_users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    let profile = null, skills = [];
    if (user.role === 'candidate') {
      profile = await db.get('SELECT * FROM nh_candidate_profiles WHERE user_id = $1', [req.params.id]);
      skills = await db.all('SELECT name, type, level FROM nh_profile_skills WHERE user_id = $1', [req.params.id]);
    }
    res.json({ success: true, user, profile, skills });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Extended stats ────────────────────────────────────────────
router.get('/stats/extended', async (req, res) => {
  try {
    const [candidates, employers, sponsored, posts, signups7d] = await Promise.all([
      db.get("SELECT COUNT(*) as n FROM nh_users WHERE role = 'candidate'"),
      db.get("SELECT COUNT(*) as n FROM nh_users WHERE role = 'employer'"),
      db.get("SELECT COUNT(*) as n FROM nh_jobs WHERE is_sponsored = true AND sponsored_until > NOW()"),
      db.get("SELECT COUNT(*) as n FROM nh_posts WHERE is_active = true"),
      db.get("SELECT COUNT(*) as n FROM nh_users WHERE created_at > NOW() - INTERVAL '7 days'"),
    ]);
    res.json({ success: true, ext: {
      candidates: parseInt(candidates?.n||0),
      employers: parseInt(employers?.n||0),
      sponsored: parseInt(sponsored?.n||0),
      posts: parseInt(posts?.n||0),
      signups7d: parseInt(signups7d?.n||0),
    }});
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── Jobs status breakdown (for pie chart) ─────────────────────
router.get('/jobs/breakdown', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT status, COUNT(*) as n
      FROM nh_jobs
      GROUP BY status
    `);
    const breakdown = {};
    rows.forEach(r => { breakdown[r.status] = parseInt(r.n); });
    res.json({ success: true, breakdown });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── Processed jobs history (approved + rejected) ──────────────
router.get('/jobs/processed', async (req, res) => {
  try {
    const jobs = await db.all(`
      SELECT j.id, j.title_en, j.title_fr, j.status, j.created_at, j.published_at,
             c.name as company_name
      FROM nh_jobs j
      LEFT JOIN nh_companies c ON c.id = j.company_id
      WHERE j.status IN ('active','closed')
      ORDER BY COALESCE(j.published_at, j.created_at) DESC
      LIMIT 100
    `);
    res.json({ success: true, jobs });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ── Ingestion manuelle ────────────────────────────────────────
router.post('/ingest', async (req, res) => {
  try {
    const { ingestAll } = require('../services/ingest');
    const summary = await ingestAll();
    res.json({ success: true, summary });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
