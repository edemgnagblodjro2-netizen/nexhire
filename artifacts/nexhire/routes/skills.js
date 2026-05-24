const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');

// Slug → skills to add to candidate profile when passed
const VERIFIED_SKILL_MAP = {
  'javascript-fundamentals': ['JavaScript'],
  'typescript-fundamentals': ['TypeScript'],
  'react-intermediate':      ['React'],
  'nodejs-fundamentals':     ['Node.js'],
  'python-basics':           ['Python'],
  'git-version-control':     ['Git'],
  'docker-devops':           ['Docker'],
  'sql-fundamentals':        ['SQL'],
  'excel-advanced':          ['Excel / Sheets'],
  'accounting-basics':       ['Accounting (GAAP)'],
  'marketing-digital':       ['SEO', 'Analytics (GA4)'],
  'project-management':      ['Project Management'],
  'ux-design':               ['UX Research', 'UI Design'],
  'communication-skills':    ['Communication'],
};

// GET /api/skills/tests — list all tests with user completion status
router.get('/tests', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { rows } = await db.query(`
      SELECT t.id, t.slug, t.title_fr, t.title_en, t.category, t.difficulty, t.pass_score,
             jsonb_array_length(t.questions) as question_count,
             r.score, r.passed, r.completed_at
      FROM nh_skill_tests t
      LEFT JOIN nh_skill_results r ON r.test_id=t.id AND r.user_id=$1
      ORDER BY t.category, t.difficulty
    `, [uid]);
    res.json({ success: true, tests: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/skills/verified — verified skill names for current user (for profile picker)
router.get('/verified', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.slug FROM nh_skill_results r
      JOIN nh_skill_tests t ON t.id = r.test_id
      WHERE r.user_id = $1 AND r.passed = true
    `, [req.session.user.id]);
    const skills = rows.flatMap(r => VERIFIED_SKILL_MAP[r.slug] || []);
    res.json({ success: true, skills: [...new Set(skills)] });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/skills/tests/:slug — get test questions (without answers)
router.get('/tests/:slug', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM nh_skill_tests WHERE slug=$1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Test not found' });
    const t = rows[0];
    const pool = t.questions.map((q, i) => ({ ...q, _poolIdx: i }));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selected = pool.slice(0, Math.min(10, pool.length));
    req.session.skillTestMap = req.session.skillTestMap || {};
    req.session.skillTestMap[t.slug] = selected.map(q => q._poolIdx);
    const questions = selected.map((q, i) => ({ id: i, q: q.q, opts: q.opts }));
    res.json({ success: true, test: { id: t.id, slug: t.slug, title_fr: t.title_fr, title_en: t.title_en, category: t.category, difficulty: t.difficulty, pass_score: t.pass_score, questions } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/skills/tests/:slug/submit
router.post('/tests/:slug/submit', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;
    const { answers } = req.body;
    const { rows } = await db.query('SELECT * FROM nh_skill_tests WHERE slug=$1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Test not found' });
    const t = rows[0];

    const poolMap = req.session.skillTestMap?.[req.params.slug];
    const selectedQuestions = poolMap
      ? poolMap.map(idx => t.questions[idx])
      : t.questions.slice(0, 10);

    if (!Array.isArray(answers) || answers.length !== selectedQuestions.length) {
      return res.status(400).json({ success: false, error: 'Invalid answers' });
    }

    let correct = 0;
    const feedback = selectedQuestions.map((q, i) => {
      const isCorrect = answers[i] === q.answer;
      if (isCorrect) correct++;
      return { q: q.q, your_answer: q.opts[answers[i]] ?? '—', correct_answer: q.opts[q.answer], correct: isCorrect };
    });

    // Score over selected questions count (not total pool)
    const score = Math.round((correct / selectedQuestions.length) * 100);
    const passed = score >= t.pass_score;

    await db.run(
      `INSERT INTO nh_skill_results (id, user_id, test_id, score, passed, answers, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (user_id, test_id) DO UPDATE SET score=$4, passed=$5, answers=$6, completed_at=NOW()`,
      [crypto.randomUUID(), uid, t.id, score, passed, JSON.stringify(answers)]
    );

    let addedSkills = [];
    if (passed) {
      // Add verified skills to candidate profile
      const mapped = VERIFIED_SKILL_MAP[t.slug] || [];
      if (mapped.length) {
        try {
          const profile = await db.get('SELECT skills FROM nh_candidate_profiles WHERE user_id=$1', [uid]);
          if (profile) {
            let current = [];
            try { current = JSON.parse(profile.skills || '[]'); } catch {}
            if (!Array.isArray(current)) current = [];
            const merged = [...new Set([...current, ...mapped])];
            await db.run(
              'UPDATE nh_candidate_profiles SET skills=$1 WHERE user_id=$2',
              [JSON.stringify(merged), uid]
            );
            addedSkills = mapped.filter(s => !current.includes(s));
          }
        } catch {}
      }

      try {
        await db.run(
          `INSERT INTO nh_notifications (id,user_id,type,title,link) VALUES ($1,$2,$3,$4,$5)`,
          [crypto.randomUUID(), uid, 'skill_badge', `🏅 Badge obtenu : ${t.title_en} (${score}%)`, null]
        );
      } catch {}
    }

    res.json({ success: true, score, passed, correct, total: selectedQuestions.length, feedback, added_skills: addedSkills });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/skills/badges/:userId — public badges for a user
router.get('/badges/:userId', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.title_fr, t.title_en, t.category, t.difficulty, r.score, r.completed_at
      FROM nh_skill_results r JOIN nh_skill_tests t ON t.id=r.test_id
      WHERE r.user_id=$1 AND r.passed=true
      ORDER BY r.completed_at DESC
    `, [req.params.userId]);
    res.json({ success: true, badges: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
