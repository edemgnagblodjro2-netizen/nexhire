const express = require('express');
const router = express.Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');

// Compute profile completeness score + AI suggestions
function computeScore(profile, badges, applications) {
  const checks = [];
  const suggestions = { fr: [], en: [] };

  const add = (label, points, hasFr, hasEn) => {
    checks.push({ label, points, done: true });
  };
  const miss = (fr, en, points) => {
    suggestions.fr.push({ text: fr, points });
    suggestions.en.push({ text: en, points });
    checks.push({ label: en, points, done: false });
  };

  // Avatar
  if (profile?.avatar_url) { add('Photo', 10); } else { miss('Ajoutez une photo de profil', 'Add a profile photo', 10); }
  // Headline
  if (profile?.headline) { add('Headline', 10); } else { miss('Ajoutez un titre professionnel (ex: "Développeur React 5 ans")', 'Add a professional headline', 10); }
  // Bio
  if (profile?.bio && profile.bio.length > 50) { add('Bio', 10); } else { miss('Rédigez une bio de 3+ phrases', 'Write a bio of 3+ sentences', 10); }
  // Skills
  const skills = profile?.skills ? JSON.parse(profile.skills).filter(Boolean) : [];
  if (skills.length >= 5) { add('Skills 5+', 15); } else if (skills.length >= 3) { add('Skills 3+', 10); miss('Ajoutez encore des compétences (5+ recommandé)', 'Add more skills (5+ recommended)', 5); } else { miss('Ajoutez au moins 5 compétences à votre profil', 'Add at least 5 skills to your profile', 15); }
  // CV
  if (profile?.cv_url) { add('CV', 15); } else { miss('Téléversez votre CV (PDF) pour augmenter vos chances', 'Upload your CV (PDF) to increase your chances', 15); }
  // Experience
  if (profile?.experience_years >= 1) { add('Experience', 5); } else { miss('Indiquez vos années d\'expérience', 'Set your years of experience', 5); }
  // Location
  if (profile?.city && profile?.province) { add('Location', 5); } else { miss('Ajoutez votre ville et province', 'Add your city and province', 5); }
  // Desired salary
  if (profile?.desired_salary_min) { add('Salary', 5); } else { miss('Indiquez vos attentes salariales', 'Set your salary expectations', 5); }
  // Applications
  if (applications >= 3) { add('Active applicant', 10); } else { miss('Postulez à 3+ offres pour montrer votre activité', 'Apply to 3+ jobs to show activity', 10); }
  // Skill badges
  if (badges >= 2) { add('Skill badges 2+', 15); } else if (badges >= 1) { add('Skill badge', 10); miss('Obtenez 2 badges de compétences vérifiées', 'Earn 2 verified skill badges', 5); } else { miss('Complétez un test de compétence pour obtenir un badge', 'Complete a skill test to earn a badge', 15); }

  const total = checks.filter(c => c.done).reduce((s, c) => s + c.points, 0);
  const max = checks.reduce((s, c) => s + c.points, 0);
  const score = Math.round((total / max) * 100);

  return { score, checks, suggestions };
}

// GET /api/profile-score — compute and cache profile score
router.get('/', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.id;

    const [profileRes, badgesRes, appsRes] = await Promise.all([
      db.query('SELECT * FROM nh_candidate_profiles WHERE user_id=$1', [uid]),
      db.query('SELECT COUNT(*) as n FROM nh_skill_results WHERE user_id=$1 AND passed=true', [uid]),
      db.query('SELECT COUNT(*) as n FROM nh_applications WHERE user_id=$1', [uid]),
    ]);

    const profile = profileRes.rows[0] || null;
    const badges = parseInt(badgesRes.rows[0]?.n || 0);
    const applications = parseInt(appsRes.rows[0]?.n || 0);

    const { score, checks, suggestions } = computeScore(profile, badges, applications);

    // Cache score
    await db.run(
      `UPDATE nh_candidate_profiles SET profile_score=$1, profile_score_updated=NOW() WHERE user_id=$2`,
      [score, uid]
    ).catch(() => {});

    // Peer comparison: avg score of all candidates
    const { rows: peerRows } = await db.query('SELECT AVG(profile_score) as avg FROM nh_candidate_profiles WHERE profile_score > 0');
    const peerAvg = Math.round(parseFloat(peerRows[0]?.avg || 50));

    res.json({ success: true, score, checks, suggestions, peer_avg: peerAvg, badges, applications });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
