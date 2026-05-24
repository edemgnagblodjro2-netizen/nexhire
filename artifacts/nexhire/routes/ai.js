const router = require('express').Router();
const { requireAuth, requireCompanyAccess } = require('../middleware/auth');
const db = require('../models/db');
const aiService = require('../services/ai');

/* ── Jobbot rate limiter (30 msgs/IP/hour, public endpoint) ── */
const _jbrl = new Map();
function _jbCheck(ip) {
  const now = Date.now();
  let e = _jbrl.get(ip) || { n: 0, r: now + 3_600_000 };
  if (now > e.r) { e.n = 0; e.r = now + 3_600_000; }
  if (e.n >= 30) return false;
  e.n++; _jbrl.set(ip, e); return true;
}

router.post('/jobbot', async (req, res) => {
  if (!_jbCheck(req.ip || 'x')) return res.status(429).json({ success: false, error: 'Rate limit' });
  const { messages = [], lang = 'fr' } = req.body;
  if (!Array.isArray(messages) || messages.length > 20) return res.status(400).json({ success: false });

  const valid = messages.slice(-10).filter(m =>
    m && ['user','assistant'].includes(m.role) &&
    typeof m.content === 'string' && m.content.length < 800
  );

  const isFr = lang === 'fr';
  const system = isFr
    ? `Tu es Nex, l'assistant emploi IA de Nexhire. Tu aides les candidats à trouver leur prochain poste.

DÉROULEMENT:
1. Accueille chaleureusement. Demande quel type de poste ils recherchent.
2. Pose 1 question de suivi (préférence télétravail/présentiel, province/région, salaire attendu).
3. Après 2+ échanges, génère les paramètres de recherche.

RÈGLE ABSOLUE: Réponds UNIQUEMENT en JSON valide, rien d'autre:
{"reply":"ton message","search_params":null,"show_profile_cta":false}

Quand tu as assez d'info, "search_params":{"q":"titre poste","work_mode":"remote|hybrid|onsite|","province":"QC|ON|BC|AB|MB|SK|NS|NB|NL|PE|","salary_min":null}
"show_profile_cta":true quand l'utilisateur veut postuler.
Sois chaleureux, 1-3 phrases. Extrais le titre et mots-clés principaux pour "q".`
    : `You are Nex, Nexhire's AI career assistant. You help candidates find their next job.

FLOW:
1. Greet warmly. Ask what type of role they're looking for.
2. Ask 1 follow-up question (remote/on-site preference, province/region, expected salary).
3. After 2+ exchanges, generate search parameters.

ABSOLUTE RULE: Reply ONLY in valid JSON, nothing else:
{"reply":"your message","search_params":null,"show_profile_cta":false}

When you have enough info, "search_params":{"q":"job title","work_mode":"remote|hybrid|onsite|","province":"QC|ON|BC|AB|MB|SK|NS|NB|NL|PE|","salary_min":null}
"show_profile_cta":true when user wants to apply.
Be warm, 1-3 sentences. Extract main title + keywords for "q".`;

  try {
    const raw = await aiService.callClaude(valid, system, 400);
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g,'').trim()); }
    catch { parsed = { reply: raw, search_params: null, show_profile_cta: false }; }
    res.json({ success: true, reply: parsed.reply || '', search_params: parsed.search_params || null, show_profile_cta: !!parsed.show_profile_cta });
  } catch (err) {
    res.status(500).json({ success: false, error: isFr ? 'Assistant temporairement indisponible.' : 'Assistant temporarily unavailable.' });
  }
});

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
