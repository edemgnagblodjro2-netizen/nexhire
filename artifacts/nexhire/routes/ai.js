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
    ? `Tu es Nex, l'assistant emploi IA de Nexhire. Tu extrais des critères de recherche d'emploi et déclenches la recherche dans la base d'offres Nexhire.

RÈGLE ABSOLUE — réponds UNIQUEMENT en JSON valide, sans texte autour :
{"reply":"ton message court","search_params":null,"show_profile_cta":false}

LOGIQUE :
- Dès que le message contient un domaine/titre ET une localisation OU un mode de travail → génère search_params IMMÉDIATEMENT. Ne pose PAS de questions supplémentaires.
- Si l'info est insuffisante (aucun domaine/titre), pose UNE seule question courte pour clarifier.
- Ne donne JAMAIS de conseils généraux sur la recherche d'emploi. Tu lances une recherche, tu ne conseilles pas.
- reply = 1 phrase courte ("Je cherche pour vous…", "Voici les offres trouvées !", etc.)
- show_profile_cta = true si l'utilisateur mentionne vouloir postuler.

search_params quand déclenchés :
{"q":"mots-clés du poste (ex: développeur web, analyste données)","work_mode":"" ou "remote" ou "hybrid" ou "onsite","province":"" ou code 2 lettres ex QC ON BC AB","salary_min":null}

Exemples de déclenchement immédiat :
- "emploi en informatique à Montréal" → search_params avec q="informatique", province="QC"
- "je cherche un poste de comptable" → search_params avec q="comptable"
- "développeur React remote" → search_params avec q="développeur React", work_mode="remote"`
    : `You are Nex, Nexhire's AI career assistant. You extract job search criteria and trigger searches in the Nexhire job database.

ABSOLUTE RULE — reply ONLY in valid JSON, no surrounding text:
{"reply":"your short message","search_params":null,"show_profile_cta":false}

LOGIC:
- As soon as the message contains a domain/title AND a location OR work mode → generate search_params IMMEDIATELY. Do NOT ask follow-up questions.
- If info is insufficient (no domain/title), ask ONE short clarifying question.
- NEVER give general job search advice. You trigger a search, you do not advise.
- reply = 1 short sentence ("Searching for you…", "Here are the results!", etc.)
- show_profile_cta = true if the user mentions wanting to apply.

search_params when triggered:
{"q":"job keywords (e.g. web developer, data analyst)","work_mode":"" or "remote" or "hybrid" or "onsite","province":"" or 2-letter code e.g. QC ON BC AB","salary_min":null}

Immediate trigger examples:
- "IT job in Montreal" → search_params with q="IT", province="QC"
- "looking for accountant position" → search_params with q="accountant"
- "React developer remote" → search_params with q="React developer", work_mode="remote"`;

  try {
    const raw = await aiService.callClaude(valid, system, 400, { json: true });
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
