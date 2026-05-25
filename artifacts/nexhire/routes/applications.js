const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const aiService = require('../services/ai');
const { sendApplicationNotification, sendStatusUpdateEmail } = require('../services/email');

router.post('/', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  const { job_id, cover_letter, cv_url, ai_cv_consent } = req.body;
  if (!job_id) return res.status(400).json({ success: false, error: 'job_id required' });

  const job = await db.get("SELECT id FROM nh_jobs WHERE id = $1 AND status = 'active'", [job_id]);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found or closed' });

  const profile = await db.get('SELECT id FROM nh_candidate_profiles WHERE user_id = $1', [req.session.user.id]);
  if (!profile) return res.status(400).json({ success: false, error: 'Please complete your profile first' });

  const existing = await db.get('SELECT id FROM nh_applications WHERE job_id = $1 AND candidate_id = $2', [job_id, profile.id]);
  if (existing) return res.status(409).json({ success: false, error: 'Already applied to this job' });

  // Run AI detection if candidate consented and there's text to analyze
  let aiCvScore = null;
  const consentBool = ai_cv_consent === true || ai_cv_consent === 'true';
  if (consentBool && cover_letter && cover_letter.trim().length > 50) {
    try {
      const detection = await aiService.detectAiContent(cover_letter);
      aiCvScore = detection.score;
    } catch (_) { /* non-blocking */ }
  }

  const id = uuidv4().replace(/-/g, '');
  await db.run(
    'INSERT INTO nh_applications (id, job_id, candidate_id, user_id, cover_letter, cv_url, ai_cv_consent, ai_cv_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, job_id, profile.id, req.session.user.id, cover_letter || null, cv_url || null, consentBool, aiCvScore]
  );
  await db.run('UPDATE nh_jobs SET applications_count = applications_count + 1 WHERE id = $1', [job_id]);

  const app = await db.get('SELECT * FROM nh_applications WHERE id = $1', [id]);

  // Notify employer by email (non-blocking)
  try {
    const jobInfo = await db.get(`
      SELECT j.title_fr, j.title_en, u.email as employer_email, u.first_name as employer_name
      FROM nh_jobs j
      JOIN nh_companies c ON j.company_id = c.id
      JOIN nh_users u ON c.owner_id = u.id
      WHERE j.id = $1
    `, [job_id]);
    if (jobInfo?.employer_email) {
      const candidateName = `${req.session.user.first_name || ''} ${req.session.user.last_name || ''}`.trim() || 'Un candidat';
      const jobTitle = jobInfo.title_fr || jobInfo.title_en || 'votre offre';
      sendApplicationNotification(jobInfo.employer_email, candidateName, jobTitle, id).catch(() => {});
    }
  } catch (_) { /* non-blocking */ }

  res.status(201).json({ success: true, application: app });
});

router.get('/mine', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'candidate') return res.status(403).json({ success: false, error: 'Candidates only' });
  const apps = await db.all(`
    SELECT a.*, j.title_fr, j.title_en, j.work_mode, j.city, c.name as company_name, c.logo_url as company_logo
    FROM nh_applications a
    JOIN nh_jobs j ON a.job_id = j.id
    JOIN nh_companies c ON j.company_id = c.id
    WHERE a.user_id = $1 ORDER BY a.created_at DESC
  `, [req.session.user.id]);
  res.json({ success: true, applications: apps });
});

router.get('/job/:jobId', requireAuth, requireCompanyAccess, async (req, res) => {
  const job = await db.get('SELECT company_id FROM nh_jobs WHERE id = $1', [req.params.jobId]);
  if (!job || job.company_id !== req.session.user.company_id) return res.status(403).json({ success: false, error: 'Access denied' });

  const apps = await db.all(`
    SELECT a.*, u.first_name, u.last_name, u.email, u.avatar_url,
           cp.headline_fr, cp.headline_en, cp.skills, cp.experience_years,
           cp.cv_url as profile_cv, cp.open_to_work
    FROM nh_applications a
    JOIN nh_users u ON a.user_id = u.id
    JOIN nh_candidate_profiles cp ON a.candidate_id = cp.id
    WHERE a.job_id = $1 ORDER BY a.ai_score DESC NULLS LAST, a.created_at DESC
  `, [req.params.jobId]);
  res.json({ success: true, applications: apps });
});

router.put('/:id/status', requireAuth, requireCompanyAccess, async (req, res) => {
  const { status, rejection_reason } = req.body;
  const validStatuses = ['reviewed','shortlisted','interview','offer','rejected'];
  if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });

  const app = await db.get(`
    SELECT a.*, j.company_id, j.title_fr, j.title_en,
           u.email as candidate_email, u.first_name as candidate_first, u.last_name as candidate_last,
           c.name as company_name
    FROM nh_applications a
    JOIN nh_jobs j ON a.job_id = j.id
    JOIN nh_companies c ON j.company_id = c.id
    JOIN nh_users u ON a.user_id = u.id
    WHERE a.id = $1
  `, [req.params.id]);
  if (!app || app.company_id !== req.session.user.company_id) return res.status(403).json({ success: false, error: 'Access denied' });

  const reason = status === 'rejected' && rejection_reason?.trim() ? rejection_reason.trim() : null;
  await db.run(
    'UPDATE nh_applications SET status = $1, rejection_reason = $2, updated_at = NOW() WHERE id = $3',
    [status, reason, req.params.id]
  );

  const labels = {
    reviewed:    "en cours d'examen",
    shortlisted: 'présélectionnée',
    interview:   'sélectionnée pour un entretien',
    offer:       'offre en cours',
    rejected:    'non retenue'
  };

  // In-app notification for candidate
  const notifId = uuidv4().replace(/-/g, '');
  await db.run('INSERT INTO nh_notifications (id, user_id, type, title, link) VALUES ($1,$2,$3,$4,$5)',
    [notifId, app.user_id, 'status_update', `Candidature ${labels[status] || status}`, `/nexhire/#applications`]);

  // Email notification to candidate (non-blocking)
  if (app.candidate_email) {
    const jobTitle = app.title_fr || app.title_en || 'votre offre';
    const candidateName = `${app.candidate_first || ''}`.trim() || 'Bonjour';
    const companyName = app.company_name || 'L\'employeur';
    sendStatusUpdateEmail(app.candidate_email, candidateName, jobTitle, companyName, status, labels[status], reason).catch(() => {});
  }

  res.json({ success: true });
});

router.delete('/:id', requireAuth, requireCompanyAccess, async (req, res) => {
  const app = await db.get(`
    SELECT a.id, j.company_id FROM nh_applications a
    JOIN nh_jobs j ON a.job_id = j.id
    WHERE a.id = $1 AND a.status = 'rejected'
  `, [req.params.id]);
  if (!app || app.company_id !== req.session.user.company_id) return res.status(403).json({ success: false, error: 'Access denied or application not rejected' });
  await db.run('DELETE FROM nh_applications WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

router.post('/:id/withdraw', requireAuth, async (req, res) => {
  const app = await db.get('SELECT * FROM nh_applications WHERE id = $1 AND user_id = $2', [req.params.id, req.session.user.id]);
  if (!app) return res.status(403).json({ success: false, error: 'Access denied' });
  await db.run("UPDATE nh_applications SET status = 'withdrawn' WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
