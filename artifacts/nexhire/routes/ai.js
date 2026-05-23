const router = require('express').Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const db = require('../models/db');
const aiService = require('../services/ai');

router.post('/chat', requireAuth, async (req, res) => {
  const { message, context = 'general' } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'Message required' });

  const systems = {
    candidate: `You are Nexhire's AI career coach. Help job seekers with their search, resume, interviews, and career. Answer in the same language as the user's message. Be concise and actionable.`,
    employer: `You are Nexhire's AI recruitment assistant. Help employers write job descriptions, evaluate candidates, and build teams. Answer in the same language as the user's message.`,
    general: `You are Nexhire's helpful AI assistant for a global employment platform. Answer in the same language as the user's message.`
  };

  try {
    const reply = await aiService.callClaude([{ role: 'user', content: message }], systems[context] || systems.general, 800);
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, error: 'AI service unavailable. Please try again later.' });
  }
});

router.get('/match/:applicationId', requireAuth, requireCompanyAccess, async (req, res) => {
  const app = await db.get('SELECT a.*, j.company_id FROM nh_applications a JOIN nh_jobs j ON a.job_id = j.id WHERE a.id = $1', [req.params.applicationId]);
  if (!app || app.company_id !== req.session.user.company_id) return res.status(403).json({ success: false, error: 'Access denied' });

  const [profile, job] = await Promise.all([
    db.get('SELECT * FROM nh_candidate_profiles WHERE id = $1', [app.candidate_id]),
    db.get('SELECT * FROM nh_jobs WHERE id = $1', [app.job_id]),
  ]);

  try {
    const result = await aiService.matchCandidateToJob(req.params.applicationId, profile, job);
    res.json({ success: true, match: result });
  } catch (err) {
    res.status(500).json({ success: false, error: 'AI matching failed' });
  }
});

module.exports = router;
