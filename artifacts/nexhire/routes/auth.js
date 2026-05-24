const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const db = require('../models/db');
const emailService = require('../services/email');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post('/register', async (req, res) => {
  const { first_name, last_name, email, password, role = 'candidate', company_name, lang = 'fr' } = req.body;
  if (!first_name || !last_name || !email || !password) return res.status(400).json({ success: false, error: 'All fields required' });
  if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  if (!['candidate', 'employer'].includes(role)) return res.status(400).json({ success: false, error: 'Invalid role' });

  const exists = await db.get('SELECT id FROM nh_users WHERE email = $1', [email.toLowerCase()]);
  if (exists) return res.status(409).json({ success: false, error: 'Email already registered' });

  const id = uuidv4().replace(/-/g, '');
  const password_hash = await bcrypt.hash(password, 12);
  const email_token = uuidv4().replace(/-/g, '');

  await db.run(`INSERT INTO nh_users (id, email, password_hash, role, first_name, last_name, email_token, preferred_lang)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, email.toLowerCase(), password_hash, role, first_name, last_name, email_token, lang]);

  let company_id = null;
  if (role === 'employer' && company_name) {
    company_id = uuidv4().replace(/-/g, '');
    const slug = company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + company_id.slice(0, 6);
    await db.run(`INSERT INTO nh_companies (id, owner_id, name, slug) VALUES ($1,$2,$3,$4)`, [company_id, id, company_name, slug]);
    await db.run('UPDATE nh_users SET company_id = $1 WHERE id = $2', [company_id, id]);
  } else if (role === 'candidate') {
    const profileId = uuidv4().replace(/-/g, '');
    await db.run('INSERT INTO nh_candidate_profiles (id, user_id) VALUES ($1,$2)', [profileId, id]);
    // 5 free starter credits for every new candidate
    const FREE_STARTER = 5;
    await db.run('UPDATE nh_users SET ai_credits = $1 WHERE id = $2', [FREE_STARTER, id]);
    await db.run(
      `INSERT INTO nh_credit_transactions (id, user_id, amount, type, description) VALUES ($1,$2,$3,$4,$5)`,
      [uuidv4().replace(/-/g,''), id, FREE_STARTER, 'bonus', lang === 'fr' ? 'Crédits de bienvenue offerts' : 'Welcome bonus credits']
    );
  }

  try { await emailService.sendVerificationEmail(email, email_token, first_name, lang); } catch (e) {}

  req.session.user = { id, email: email.toLowerCase(), role, first_name, last_name, preferred_lang: lang, email_verified: false, company_id };
  res.status(201).json({ success: true, user: req.session.user });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

  const user = await db.get('SELECT * FROM nh_users WHERE email = $1', [email.toLowerCase()]);
  if (!user || !user.password_hash) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(429).json({ success: false, error: 'Account temporarily locked' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = (user.login_attempts || 0) + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await db.run('UPDATE nh_users SET login_attempts = $1, locked_until = $2 WHERE id = $3', [attempts, lockedUntil, user.id]);
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  await db.run('UPDATE nh_users SET login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

  const company = user.role === 'employer' ? await db.get('SELECT id FROM nh_companies WHERE owner_id = $1', [user.id]) : null;
  req.session.user = { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name, preferred_lang: user.preferred_lang, email_verified: user.email_verified, company_id: user.company_id || company?.id || null };
  res.json({ success: true, user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.json({ success: true, user: null });
  res.json({ success: true, user: req.session.user });
});

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ success: false, error: 'Token required' });
  const user = await db.get('SELECT id FROM nh_users WHERE email_token = $1', [token]);
  if (!user) return res.status(400).json({ success: false, error: 'Invalid token' });
  await db.run('UPDATE nh_users SET email_verified = TRUE, email_token = NULL WHERE id = $1', [user.id]);
  res.redirect('/?verified=1');
});

router.post('/forgot-password', async (req, res) => {
  const { email, lang = 'fr' } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email required' });
  const user = await db.get('SELECT id, first_name, preferred_lang FROM nh_users WHERE email = $1', [email.toLowerCase()]);
  if (user) {
    const token = uuidv4().replace(/-/g, '');
    const expires = new Date(Date.now() + 3600000).toISOString();
    await db.run('UPDATE nh_users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [token, expires, user.id]);
    try { await emailService.sendPasswordResetEmail(email, token, user.first_name, user.preferred_lang || lang); } catch (e) {}
  }
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8) return res.status(400).json({ success: false, error: 'Valid token and password (8+ chars) required' });
  const user = await db.get('SELECT id FROM nh_users WHERE reset_token = $1 AND reset_token_expires > NOW()', [token]);
  if (!user) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
  const hash = await bcrypt.hash(password, 12);
  await db.run('UPDATE nh_users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [hash, user.id]);
  res.json({ success: true });
});

router.put('/update-profile', async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  const { email, current_password, new_password } = req.body;
  const userId = req.session.user.id;

  const user = await db.get('SELECT * FROM nh_users WHERE id = $1', [userId]);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  if (current_password) {
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, error: 'Current password is incorrect' });
  }

  if (email && email !== user.email) {
    if (!current_password) return res.status(400).json({ success: false, error: 'Current password required to change email' });
    const taken = await db.get('SELECT id FROM nh_users WHERE email = $1 AND id != $2', [email.toLowerCase(), userId]);
    if (taken) return res.status(409).json({ success: false, error: 'Email already in use' });
    await db.run('UPDATE nh_users SET email = $1 WHERE id = $2', [email.toLowerCase(), userId]);
    req.session.user.email = email.toLowerCase();
  }

  if (new_password) {
    if (!current_password) return res.status(400).json({ success: false, error: 'Current password required to change password' });
    if (new_password.length < 8) return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
    const hash = await bcrypt.hash(new_password, 12);
    await db.run('UPDATE nh_users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  }

  res.json({ success: true, user: req.session.user });
});

router.delete('/account', async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  const userId = req.session.user.id;
  try {
    await db.run('DELETE FROM nh_applications WHERE user_id = $1', [userId]);
    await db.run('DELETE FROM nh_saved_jobs WHERE user_id = $1', [userId]);
    await db.run('DELETE FROM nh_company_reviews WHERE user_id = $1', [userId]);
    await db.run('DELETE FROM nh_candidate_profiles WHERE user_id = $1', [userId]);
    await db.run('DELETE FROM nh_users WHERE id = $1', [userId]);
    req.session.destroy(() => res.json({ success: true }));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/set-lang', (req, res) => {
  const { lang } = req.body;
  if (!['fr', 'en'].includes(lang)) return res.status(400).json({ success: false, error: 'Invalid language' });
  req.session.lang = lang;
  if (req.session.user) req.session.user.preferred_lang = lang;
  res.json({ success: true });
});

module.exports = router;
