const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const aiService = require('../services/ai');

async function extractTextFromCV(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('Fichier introuvable : ' + filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    return data.text || '';
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } else if (ext === '.doc') {
    return '';
  }
  throw new Error('Format non supporté. Utiliser PDF ou DOCX.');
}

const uploadDir = path.join(__dirname, '..', 'uploads');
const cvStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cv-${req.session.user.id}-${Date.now()}${ext}`);
  },
});
const cvUpload = multer({
  storage: cvStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.doc', '.docx'].includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX allowed'));
  },
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar-${req.session.user.id}-${Date.now()}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only (JPG, PNG, WebP)'));
  },
});

router.post('/profile/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const basePath = (process.env.BASE_PATH || '/nexhire/').replace(/\/$/, '');
    const avatarUrl = `${basePath}/uploads/${req.file.filename}`;
    await db.run('UPDATE nh_users SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.session.user.id]);
    req.session.user.avatar_url = avatarUrl;
    res.json({ success: true, avatar_url: avatarUrl });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/profile', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  const profile = await db.get(`SELECT cp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url FROM nh_candidate_profiles cp JOIN nh_users u ON cp.user_id = u.id WHERE cp.user_id = $1`, [req.session.user.id]);
  if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
  res.json({ success: true, profile });
});

router.put('/profile', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });

  const allowed = ['headline_fr','headline_en','bio_fr','bio_en','city','province','country','work_mode_pref','job_type_pref','experience_years','education_level','github_url','linkedin_url','portfolio_url','availability','desired_salary_min','desired_salary_max','open_to_relocation'];
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

router.post('/profile/cv/parse', requireAuth, cvUpload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    let text = '';
    try {
      text = await extractTextFromCV(req.file.path);
    } catch (parseErr) {
      return res.json({ success: true, cv_url: `/nexhire/uploads/${req.file.filename}`, parsed: null, message: parseErr.message });
    }
    if (!text.trim()) {
      return res.json({ success: true, cv_url: `/nexhire/uploads/${req.file.filename}`, parsed: null, message: 'File saved — text extraction not available for this format' });
    }
    if (!process.env.OPENAI_API_KEY) {
      await db.run(
        'UPDATE nh_candidate_profiles SET cv_url = $1, cv_text = $2 WHERE user_id = $3',
        [`/nexhire/uploads/${req.file.filename}`, text.slice(0, 10000), req.session.user.id]
      );
      return res.json({ success: true, cv_url: `/nexhire/uploads/${req.file.filename}`, parsed: null, message: 'CV saved — AI parsing unavailable (no API key)' });
    }
    const openai = new (require('openai'))({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: `Extract structured data from this CV/resume text. Return JSON with these fields (omit or set null for fields you cannot confidently extract):
{
  "headline_en": string,
  "headline_fr": string,
  "bio_en": string (2-3 sentences),
  "bio_fr": string (2-3 sentences),
  "experience_years": number,
  "city": string,
  "province": string (2-letter CA code if applicable),
  "hard_skills": string[] (technical/hard skills only, max 12, e.g. "JavaScript", "SQL", "Figma"),
  "soft_skills": string[] (interpersonal/soft skills only, max 8, e.g. "Leadership", "Communication"),
  "highlights": [{ "title": string, "description": string, "type": "cert"|"achievement"|"project" }] (certifications, awards, notable projects, max 6)
}`
      }, {
        role: 'user', content: text.slice(0, 6000)
      }],
      max_tokens: 1200,
    });
    let parsed = {};
    try { parsed = JSON.parse(completion.choices[0].message.content); } catch {}
    const cvUrl = `/nexhire/uploads/${req.file.filename}`;
    const userId = req.session.user.id;
    await db.run(
      'UPDATE nh_candidate_profiles SET cv_url = $1, cv_text = $2 WHERE user_id = $3',
      [cvUrl, text.slice(0, 10000), userId]
    );
    // Auto-insert hard skills
    if (Array.isArray(parsed.hard_skills)) {
      const existing = await db.all('SELECT name FROM nh_profile_skills WHERE user_id = $1 AND type = $2', [userId, 'hard']);
      const existingNames = new Set(existing.map(r => r.name.toLowerCase()));
      for (const skill of parsed.hard_skills.slice(0, 12)) {
        if (!skill || existingNames.has(skill.toLowerCase())) continue;
        const id = `ps_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        await db.run('INSERT INTO nh_profile_skills (id, user_id, name, level, type) VALUES ($1,$2,$3,$4,$5)',
          [id, userId, skill.trim().slice(0, 80), 75, 'hard']);
      }
    }
    // Auto-insert soft skills
    if (Array.isArray(parsed.soft_skills)) {
      const existing = await db.all('SELECT name FROM nh_profile_skills WHERE user_id = $1 AND type = $2', [userId, 'soft']);
      const existingNames = new Set(existing.map(r => r.name.toLowerCase()));
      for (const skill of parsed.soft_skills.slice(0, 8)) {
        if (!skill || existingNames.has(skill.toLowerCase())) continue;
        const id = `ps_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        await db.run('INSERT INTO nh_profile_skills (id, user_id, name, level, type) VALUES ($1,$2,$3,$4,$5)',
          [id, userId, skill.trim().slice(0, 80), 75, 'soft']);
      }
    }
    // Auto-insert highlights (certifications / achievements / projects)
    if (Array.isArray(parsed.highlights)) {
      const VALID_TYPES = ['cert', 'achievement', 'project'];
      const iconMap = { cert: '🏆', achievement: '⭐', project: '🚀' };
      for (const h of parsed.highlights.slice(0, 6)) {
        if (!h?.title) continue;
        const safeType = VALID_TYPES.includes(h.type) ? h.type : 'achievement';
        const id = `hl_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        await db.run(
          'INSERT INTO nh_highlights (id, user_id, type, icon, title, description, url) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [id, userId, safeType, iconMap[safeType], (h.title||'').trim().slice(0,200), (h.description||'').trim().slice(0,500), '']
        );
      }
    }
    res.json({ success: true, cv_url: cvUrl, parsed });
  } catch (e) {
    if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('quota')) {
      return res.status(200).json({ success: true, cv_url: req.file ? `/nexhire/uploads/${req.file.filename}` : null, parsed: null, message: 'CV sauvegardé — quota OpenAI dépassé, rechargez votre compte sur platform.openai.com/settings/billing' });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/profile/cv', requireAuth, cvUpload.single('cv'), async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const basePath = (process.env.BASE_PATH || '/nexhire/').replace(/\/$/, '');
  const cvUrl = `${basePath}/uploads/${req.file.filename}`;
  await db.run('UPDATE nh_candidate_profiles SET cv_url = $1, updated_at = NOW() WHERE user_id = $2', [cvUrl, req.session.user.id]);
  res.json({ success: true, cv_url: cvUrl });
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

// ── Job Alerts ─────────────────────────────────────────────
router.get('/alerts', requireAuth, async (req, res) => {
  try {
    const alerts = await db.all(
      'SELECT * FROM nh_job_alerts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json({ success: true, alerts });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post('/alerts', requireAuth, async (req, res) => {
  try {
    const { keywords, city, province, work_mode, job_type } = req.body;
    const existing = await db.all(
      'SELECT id FROM nh_job_alerts WHERE user_id = $1',
      [req.session.user.id]
    );
    if (existing.length >= 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 alerts allowed' });
    }
    const id = require('crypto').randomUUID();
    await db.run(
      `INSERT INTO nh_job_alerts (id, user_id, keywords, city, province, work_mode, job_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.session.user.id, keywords || null, city || null, province || null, work_mode || null, job_type || null]
    );
    const alert = await db.get('SELECT * FROM nh_job_alerts WHERE id = $1', [id]);
    res.json({ success: true, alert });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.delete('/alerts/:id', requireAuth, async (req, res) => {
  try {
    const alert = await db.get(
      'SELECT id FROM nh_job_alerts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.session.user.id]
    );
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    await db.run('DELETE FROM nh_job_alerts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
