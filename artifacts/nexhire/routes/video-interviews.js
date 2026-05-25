const router      = require('express').Router();
const path        = require('path');
const fs          = require('fs');
const crypto      = require('crypto');
const multer      = require('multer');
const db          = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const { callClaude } = require('../services/ai');

// ── Storage ────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'interviews');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const vidStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `vi-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const vidUpload = multer({
  storage: vidStorage,
  limits:  { fileSize: 150 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['audio/webm','audio/ogg','audio/mp4','audio/mpeg','video/webm','video/mp4','application/octet-stream'];
    if (ok.includes(file.mimetype) || file.originalname.match(/\.(webm|mp4|ogg|m4a|wav)$/i)) cb(null, true);
    else cb(new Error('Unsupported format'));
  },
});

// ── Premium guard ──────────────────────────────────────────
async function requirePro(req, res, next) {
  const company = await db.get('SELECT plan FROM nh_companies WHERE id=$1', [req.session.user.company_id]);
  if (!company || company.plan !== 'pro') {
    return res.status(403).json({ success: false, error: 'Video interviews require a Pro plan', upgrade: true });
  }
  next();
}

// ── Transcribe via OpenAI Whisper ──────────────────────────
async function transcribeAudio(filePath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: key });
    const transcription = await client.audio.transcriptions.create({
      file:  fs.createReadStream(filePath),
      model: 'whisper-1',
    });
    return transcription.text || null;
  } catch (e) {
    console.error('[VideoInterview] Whisper error:', e.message);
    return null;
  }
}

// ── Score via Claude ───────────────────────────────────────
async function scoreResponse(question, transcript) {
  if (!transcript || transcript.length < 10) {
    return { score: 0, summary: 'No transcript available', strengths: [], improvements: ['Could not transcribe audio'], keywords: [] };
  }
  try {
    const raw = await callClaude([{
      role: 'user',
      content: `Interview Question: "${question}"\n\nCandidate's Answer (transcript):\n"${transcript.slice(0, 2000)}"`
    }],
    `You are an expert HR interviewer and talent evaluator. Score this interview response objectively.
Return ONLY valid JSON with no markdown:
{"score":<0-100>,"summary":"<2-3 sentence evaluation>","strengths":["<strength1>","<strength2>"],"improvements":["<area1>","<area2>"],"keywords":["<relevant keyword or skill mentioned>"],"communication_score":<0-10>,"relevance_score":<0-10>}`,
    600);
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error('[VideoInterview] Scoring error:', e.message);
    return { score: 50, summary: 'Scoring unavailable', strengths: [], improvements: [], keywords: [] };
  }
}

// ══════════════════════════════════════════════════════════
// CANDIDATE PUBLIC ROUTES — declared FIRST so Express doesn't
// match them as /:id
// ══════════════════════════════════════════════════════════

// GET /api/video-interviews/respond/:token
router.get('/respond/:token', async (req, res) => {
  try {
    const interview = await db.get(
      `SELECT vi.id, vi.title, vi.questions, vi.candidate_name, vi.status, vi.token_expires_at,
              c.name as company_name, c.logo_url as company_logo, j.title_en as job_title
       FROM nh_video_interviews vi
       JOIN nh_companies c ON c.id = vi.company_id
       LEFT JOIN nh_jobs j ON j.id = vi.job_id
       WHERE vi.token=$1`,
      [req.params.token]
    );
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' });
    if (new Date(interview.token_expires_at) < new Date()) {
      return res.status(410).json({ success: false, error: 'Interview link has expired' });
    }
    if (interview.status === 'completed') {
      return res.json({ success: true, interview, already_completed: true });
    }
    const { rows: responses } = await db.query(
      'SELECT question_index FROM nh_video_responses WHERE interview_id=$1',
      [interview.id]
    );
    res.json({ success: true, interview, answered: responses.map(r => r.question_index) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/video-interviews/respond/:token/upload
router.post('/respond/:token/upload', vidUpload.single('video'), async (req, res) => {
  try {
    const interview = await db.get('SELECT * FROM nh_video_interviews WHERE token=$1', [req.params.token]);
    if (!interview) return res.status(404).json({ success: false, error: 'Not found' });
    if (new Date(interview.token_expires_at) < new Date()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(410).json({ success: false, error: 'Link expired' });
    }

    const qIdx = parseInt(req.body.question_index, 10);
    const questions = typeof interview.questions === 'string' ? JSON.parse(interview.questions) : interview.questions;
    if (isNaN(qIdx) || qIdx < 0 || qIdx >= questions.length) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Invalid question index' });
    }

    await db.run(
      "UPDATE nh_video_interviews SET status='in_progress' WHERE id=$1 AND status='pending'",
      [interview.id]
    );

    const responseId = crypto.randomUUID();
    const filePath   = req.file?.path || null;

    await db.run(
      `INSERT INTO nh_video_responses (id, interview_id, question_index, video_path, duration_seconds)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (interview_id, question_index)
       DO UPDATE SET video_path=$4, transcript=NULL, ai_score=NULL, ai_feedback=NULL, recorded_at=NOW()`,
      [responseId, interview.id, qIdx, filePath, parseInt(req.body.duration_seconds, 10) || null]
    );

    res.json({ success: true, response_id: responseId, processing: true });

    // Async post-processing — don't block the HTTP response
    setImmediate(async () => {
      try {
        const transcript = filePath ? await transcribeAudio(filePath) : null;
        const aiResult   = await scoreResponse(questions[qIdx], transcript || '');

        await db.run(
          `UPDATE nh_video_responses SET transcript=$1, ai_score=$2, ai_feedback=$3, ai_keywords=$4 WHERE id=$5`,
          [transcript, aiResult.score, JSON.stringify(aiResult), JSON.stringify(aiResult.keywords || []), responseId]
        );

        const { rows: done } = await db.query(
          'SELECT COUNT(*) as n FROM nh_video_responses WHERE interview_id=$1',
          [interview.id]
        );
        if (parseInt(done[0].n) >= questions.length) {
          await db.run("UPDATE nh_video_interviews SET status='completed' WHERE id=$1", [interview.id]);
        }
      } catch (e2) {
        console.error('[VideoInterview] Async processing error:', e2.message);
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/video-interviews/respond/:token/status
router.get('/respond/:token/status', async (req, res) => {
  try {
    const interview = await db.get('SELECT id FROM nh_video_interviews WHERE token=$1', [req.params.token]);
    if (!interview) return res.status(404).json({ success: false, error: 'Not found' });
    const { rows } = await db.query(
      'SELECT question_index, ai_score IS NOT NULL as processed FROM nh_video_responses WHERE interview_id=$1',
      [interview.id]
    );
    res.json({ success: true, responses: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
// EMPLOYER ROUTES (authenticated)
// ══════════════════════════════════════════════════════════

// POST /api/video-interviews
router.post('/', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { title, questions, candidate_name, candidate_email, job_id } = req.body;
    if (!title || !Array.isArray(questions) || questions.length < 1 || questions.length > 5) {
      return res.status(400).json({ success: false, error: '1–5 questions required' });
    }
    if (candidate_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate_email)) {
      return res.status(400).json({ success: false, error: 'Invalid candidate email' });
    }
    const id      = crypto.randomUUID();
    const token   = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(8).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.run(
      `INSERT INTO nh_video_interviews (id, company_id, created_by, job_id, candidate_name, candidate_email, title, questions, token, token_expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, req.session.user.company_id, req.session.user.id, job_id || null,
       candidate_name || null, candidate_email || null, title, JSON.stringify(questions), token, expires]
    );
    res.json({ success: true, id, token });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/video-interviews
router.get('/', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT vi.id, vi.title, vi.candidate_name, vi.candidate_email, vi.status,
              vi.token_expires_at, vi.created_at, vi.job_id, j.title_en as job_title,
              COUNT(vr.id)::int as responses_count,
              jsonb_array_length(vi.questions) as question_count,
              ROUND(AVG(vr.ai_score))::int as avg_score
       FROM nh_video_interviews vi
       LEFT JOIN nh_jobs j ON j.id = vi.job_id
       LEFT JOIN nh_video_responses vr ON vr.interview_id = vi.id
       WHERE vi.company_id = $1
       GROUP BY vi.id, j.title_en
       ORDER BY vi.created_at DESC`,
      [req.session.user.company_id]
    );
    res.json({ success: true, interviews: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/video-interviews/:id
router.get('/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const interview = await db.get(
      'SELECT * FROM nh_video_interviews WHERE id=$1 AND company_id=$2',
      [req.params.id, req.session.user.company_id]
    );
    if (!interview) return res.status(404).json({ success: false, error: 'Not found' });
    const { rows: responses } = await db.query(
      'SELECT * FROM nh_video_responses WHERE interview_id=$1 ORDER BY question_index',
      [req.params.id]
    );
    res.json({ success: true, interview, responses });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/video-interviews/:id
router.delete('/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  try {
    const interview = await db.get(
      'SELECT id FROM nh_video_interviews WHERE id=$1 AND company_id=$2',
      [req.params.id, req.session.user.company_id]
    );
    if (!interview) return res.status(404).json({ success: false, error: 'Not found' });
    const { rows: resps } = await db.query('SELECT video_path FROM nh_video_responses WHERE interview_id=$1', [req.params.id]);
    for (const r of resps) {
      if (r.video_path && fs.existsSync(r.video_path)) fs.unlinkSync(r.video_path);
    }
    await db.run('DELETE FROM nh_video_interviews WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
