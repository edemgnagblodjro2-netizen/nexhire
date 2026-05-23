const router = require('express').Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const aiService = require('../services/ai');

router.get('/profile', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  const profile = await db.get(`SELECT cp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url FROM nh_candidate_profiles cp JOIN nh_users u ON cp.user_id = u.id WHERE cp.user_id = $1`, [req.session.user.id]);
  if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
  res.json({ success: true, profile });
});

router.put('/profile', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });

  const allowed = ['headline_fr','headline_en','bio_fr','bio_en','city','country','work_mode_pref','job_type_pref','experience_years','education_level','github_url','linkedin_url','portfolio_url','availability','desired_salary_min','desired_salary_max','open_to_relocation'];
  const sets = []; const vals = []; let p = 1;

  allowed.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${p}`);
      vals.push(req.body[f]);
      p++;
    }
  });
  if (req.body.skills !== undefined) {
    sets.push(`skills = $${p}`);
    vals.push(Array.isArray(req.body.skills) ? JSON.stringify(req.body.skills) : req.body.skills);
    p++;
  }
  if (req.body.languages !== undefined) {
    sets.push(`languages = $${p}`);
    vals.push(Array.isArray(req.body.languages) ? JSON.stringify(req.body.languages) : req.body.languages);
    p++;
  }

  if (req.body.first_name || req.body.last_name || req.body.phone) {
    const uSets = []; const uVals = []; let up = 1;
    if (req.body.first_name) { uSets.push(`first_name = $${up}`); uVals.push(req.body.first_name); up++; }
    if (req.body.last_name) { uSets.push(`last_name = $${up}`); uVals.push(req.body.last_name); up++; }
    if (req.body.phone) { uSets.push(`phone = $${up}`); uVals.push(req.body.phone); up++; }
    uVals.push(req.session.user.id);
    await db.run(`UPDATE nh_users SET ${uSets.join(', ')} WHERE id = $${up}`, uVals);
  }

  if (!sets.length) return res.status(400).json({ success: false, error: 'Nothing to update' });
  sets.push(`updated_at = NOW()`);
  vals.push(req.session.user.id);
  await db.run(`UPDATE nh_candidate_profiles SET ${sets.join(', ')} WHERE user_id = $${p}`, vals);
  const profile = await db.get('SELECT * FROM nh_candidate_profiles WHERE user_id = $1', [req.session.user.id]);
  res.json({ success: true, profile });
});

router.post('/ai/cover-letter', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  const { job_id, lang = 'fr' } = req.body;
  if (!job_id) return res.status(400).json({ success: false, error: 'job_id required' });

  const profile = await db.get('SELECT * FROM nh_candidate_profiles WHERE user_id = $1', [req.session.user.id]);
  const job = await db.get('SELECT j.*, c.name as company_name FROM nh_jobs j JOIN nh_companies c ON j.company_id = c.id WHERE j.id = $1', [job_id]);
  if (!profile || !job) return res.status(404).json({ success: false, error: 'Profile or job not found' });

  try {
    const letter = await aiService.generateCoverLetter(profile, job, lang);
    res.json({ success: true, cover_letter: letter });
  } catch (err) {
    res.status(500).json({ success: false, error: 'AI service unavailable' });
  }
});

module.exports = router;
