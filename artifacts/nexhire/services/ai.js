const Anthropic = require('@anthropic-ai/sdk');

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY || process.env.NEXHIRE_ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey: key });
}

async function callClaude(messages, system, maxTokens = 800) {
  const client = getClient();
  const msg = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: maxTokens,
    system,
    messages,
  });
  return msg.content[0].text;
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

module.exports = { callClaude, matchCandidateToJob, generateCoverLetter, detectAiContent };
