const OpenAI = require('openai');

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  return new OpenAI({ apiKey: key });
}

async function callClaude(messages, system, maxTokens = 800, opts = {}) {
  const client = getClient();
  const params = {
    model: 'gpt-4o-mini',
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
  };
  if (opts.json) params.response_format = { type: 'json_object' };
  const completion = await client.chat.completions.create(params);
  return completion.choices[0].message.content;
}

async function matchCandidateToJob(applicationId, profile, job) {
  const system = `You are Nexhire's AI matching engine. Analyze candidate vs job.
Return ONLY valid JSON: {"score": <0-100>, "strengths": ["..."], "gaps": ["..."], "recommendation": "..."}`;

  const skills = safeArr(profile.skills);
  const raw = await callClaude([{
    role: 'user',
    content: `Candidate: ${profile.headline_en || profile.headline_fr || 'Professional'}, ${profile.experience_years || 0} years, skills: ${skills.slice(0, 10).join(', ')}\n\nJob: ${job.title_en || job.title_fr}, requirements: ${(job.requirements_en || job.requirements_fr || '').slice(0, 400)}`
  }], system, 600);

  const result = JSON.parse(raw.replace(/```json|```/g, '').trim());

  const db = require('../models/db');
  await db.run('UPDATE nh_applications SET ai_score = $1, ai_feedback = $2 WHERE id = $3',
    [result.score, JSON.stringify(result), applicationId]);

  return result;
}

async function generateCoverLetter(candidateProfile, job, lang = 'fr') {
  const isFr = lang === 'fr';
  const system = isFr
    ? `Vous êtes un expert en lettres de motivation. Rédigez une lettre professionnelle en français. Retournez UNIQUEMENT le texte de la lettre.`
    : `You are a cover letter expert. Write a professional letter in English. Return ONLY the letter text.`;

  const skills = safeArr(candidateProfile.skills);
  const userMsg = isFr
    ? `Candidat: ${candidateProfile.headline_fr || 'Professionnel'}, ${candidateProfile.experience_years || 0} ans, compétences: ${skills.slice(0, 8).join(', ')}\n\nPoste: ${job.title_fr || job.title_en} chez ${job.company_name}\nDescription: ${(job.description_fr || job.description_en || '').slice(0, 400)}`
    : `Candidate: ${candidateProfile.headline_en || 'Professional'}, ${candidateProfile.experience_years || 0} years, skills: ${skills.slice(0, 8).join(', ')}\n\nPosition: ${job.title_en || job.title_fr} at ${job.company_name}\nDescription: ${(job.description_en || job.description_fr || '').slice(0, 400)}`;

  return await callClaude([{ role: 'user', content: userMsg }], system, 1000);
}

async function detectAiContent(text) {
  const system = `You are an AI content detection expert. Analyze the provided text and determine how likely it is to be AI-generated (vs human-written).
Return ONLY valid JSON: {"score": <0-100>, "label": "<Likely Human|Uncertain|Likely AI>", "signals": ["<signal1>", "<signal2>"]}
Score guide: 0-35 = Likely Human, 36-65 = Uncertain, 66-100 = Likely AI.`;

  const raw = await callClaude([{
    role: 'user',
    content: `Analyze this text for AI generation probability:\n\n${text.slice(0, 1500)}`
  }], system, 400);

  const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
  return result;
}

function safeArr(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { return JSON.parse(v); } catch { return []; }
}

async function moderateJob({ title_fr, title_en, description_fr, description_en, requirements_fr, requirements_en, salary_min, salary_max, company_name }) {
  const title = title_fr || title_en || '';
  const desc  = description_fr || description_en || '';
  const req   = requirements_fr || requirements_en || '';

  if (title.trim().length < 4)  return { score: 5,  verdict: 'auto_rejected', flags: ['title_too_short'],       reason: 'Le titre est trop court.' };
  if (desc.trim().length < 60)  return { score: 10, verdict: 'auto_rejected', flags: ['description_too_short'], reason: 'La description est trop courte (minimum 60 caractères).' };

  try {
    const raw = await callClaude([{ role: 'user', content:
      `Job title: "${title}"\nDescription: "${desc.slice(0, 800)}"\nRequirements: "${req.slice(0, 400)}"\nSalary: ${salary_min || '?'}–${salary_max || '?'}\nCompany: "${company_name || 'Unknown'}"`
    }],
    `You are a job board content moderator for Nexhire (Canada). Evaluate this job posting strictly.
Score 0-100: legitimacy, completeness, no spam/scam/illegal content, professional tone.

Flags (return any that apply): spam, scam, illegal, adult_content, gibberish, salary_unrealistic, too_short, contact_info_in_description.

Scam indicators: MLM, "earn from home easy money", send fees, pyramid, unrealistic pay ("$5000/day from home").

Return ONLY valid JSON (no markdown):
{"score":<0-100>,"verdict":"auto_approved|pending_review|auto_rejected","flags":["flag1"],"reason":"<short reason in French shown to employer if rejected>"}

Thresholds enforced server-side: >=75 auto_approved, 40-74 pending_review, <40 auto_rejected.`,
    350);
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    const score  = Math.max(0, Math.min(100, parseInt(result.score) || 50));
    const verdict = score >= 75 ? 'auto_approved' : score >= 40 ? 'pending_review' : 'auto_rejected';
    return { score, verdict, flags: Array.isArray(result.flags) ? result.flags : [], reason: result.reason || '' };
  } catch (e) {
    return { score: 60, verdict: 'pending_review', flags: ['moderation_error'], reason: '' };
  }
}

module.exports = { callClaude, matchCandidateToJob, generateCoverLetter, detectAiContent, moderateJob };
