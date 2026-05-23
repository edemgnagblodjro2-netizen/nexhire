require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 19235;
const BASE_PATH = (process.env.BASE_PATH || '/nexhire/').replace(/\/$/, '');

// Ensure upload dir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Run migrations on startup
async function runMigrations() {
  const { Pool } = require('pg');
  const { pool } = require('./models/db');
  try {
    // Inline migration — avoids separate process
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'candidate',
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        avatar_url TEXT,
        company_id TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        email_token TEXT,
        reset_token TEXT,
        reset_token_expires TIMESTAMPTZ,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ,
        preferred_lang TEXT DEFAULT 'fr',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_companies (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description_fr TEXT,
        description_en TEXT,
        website TEXT,
        industry TEXT,
        size TEXT,
        logo_url TEXT,
        city TEXT,
        country TEXT DEFAULT 'Canada',
        plan TEXT DEFAULT 'starter',
        plan_expires_at TIMESTAMPTZ,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        active_job_slots INTEGER DEFAULT 2,
        featured_job_slots INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_jobs (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES nh_companies(id) ON DELETE CASCADE,
        posted_by TEXT NOT NULL REFERENCES nh_users(id),
        title_fr TEXT NOT NULL,
        title_en TEXT,
        slug TEXT UNIQUE NOT NULL,
        description_fr TEXT NOT NULL,
        description_en TEXT,
        requirements_fr TEXT,
        requirements_en TEXT,
        benefits_fr TEXT,
        benefits_en TEXT,
        job_type TEXT,
        work_mode TEXT,
        city TEXT,
        country TEXT DEFAULT 'Canada',
        salary_min INTEGER,
        salary_max INTEGER,
        salary_currency TEXT DEFAULT 'CAD',
        salary_period TEXT DEFAULT 'year',
        experience_years TEXT,
        languages_required JSONB DEFAULT '[]',
        skills_required JSONB DEFAULT '[]',
        featured BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'active',
        views INTEGER DEFAULT 0,
        applications_count INTEGER DEFAULT 0,
        published_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_candidate_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        headline_fr TEXT,
        headline_en TEXT,
        bio_fr TEXT,
        bio_en TEXT,
        city TEXT,
        country TEXT,
        work_mode_pref TEXT,
        job_type_pref TEXT,
        languages JSONB DEFAULT '[]',
        skills JSONB DEFAULT '[]',
        experience_years INTEGER DEFAULT 0,
        education_level TEXT,
        cv_url TEXT,
        linkedin_url TEXT,
        github_url TEXT,
        portfolio_url TEXT,
        availability TEXT DEFAULT 'immediate',
        desired_salary_min INTEGER,
        desired_salary_max INTEGER,
        open_to_relocation BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_applications (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES nh_jobs(id) ON DELETE CASCADE,
        candidate_id TEXT NOT NULL REFERENCES nh_candidate_profiles(id),
        user_id TEXT NOT NULL REFERENCES nh_users(id),
        cover_letter TEXT,
        cv_url TEXT,
        status TEXT DEFAULT 'new',
        ai_score INTEGER,
        ai_feedback JSONB,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(job_id, candidate_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        link TEXT,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_saved_jobs (
        user_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        job_id TEXT NOT NULL REFERENCES nh_jobs(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, job_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_company_reviews (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES nh_companies(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        title TEXT,
        pros TEXT,
        cons TEXT,
        interview_difficulty TEXT,
        recommend BOOLEAN DEFAULT TRUE,
        anonymous BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, user_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_job_alerts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        keywords TEXT,
        city TEXT,
        work_mode TEXT,
        job_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_status ON nh_jobs(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_featured ON nh_jobs(featured, status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_published ON nh_jobs(published_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_notifs_user ON nh_notifications(user_id, read_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_saved_jobs_user ON nh_saved_jobs(user_id)`);
    // Add province column if missing (safe migration)
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS province TEXT`);
    await pool.query(`ALTER TABLE nh_candidate_profiles ADD COLUMN IF NOT EXISTS province TEXT`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_province ON nh_jobs(province)`);
    console.log('[Nexhire] ✅ DB ready');
  } catch (err) {
    console.error('[Nexhire] Migration error:', err.message);
  }
}

// ── Security ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com"],
    },
  },
}));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Sessions (memory store — safe for single-instance) ──
app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: process.env.NEXHIRE_SESSION_SECRET || process.env.SESSION_SECRET || 'nexhire-dev-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// ── Static files ───────────────────────────────────────────
app.use(BASE_PATH + '/', express.static(path.join(__dirname, 'public')));
app.use(BASE_PATH + '/uploads', express.static(uploadDir));

// ── API Routes ─────────────────────────────────────────────
const apiBase = BASE_PATH + '/api';
app.use(apiBase + '/auth',          require('./routes/auth'));
app.use(apiBase + '/jobs',          require('./routes/jobs'));
app.use(apiBase + '/companies',     require('./routes/companies'));
app.use(apiBase + '/applications',  require('./routes/applications'));
app.use(apiBase,                    require('./routes/endorsements'));
app.use(apiBase + '/candidates',    require('./routes/candidates'));
app.use(apiBase + '/ai',            require('./routes/ai'));
app.use(apiBase + '/payments',      require('./routes/payments'));
app.use(apiBase + '/notifications', require('./routes/notifications'));
app.use(apiBase + '/admin',         require('./routes/admin'));
app.use(apiBase + '/saved-jobs',    require('./routes/saved-jobs'));
app.use(apiBase + '/reviews',       require('./routes/reviews'));

// ── Health check ───────────────────────────────────────────
app.get(BASE_PATH + '/healthz', (req, res) => res.json({ status: 'ok', service: 'nexhire' }));

// ── SPA fallback ───────────────────────────────────────────
app.get(BASE_PATH + '/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => res.redirect(BASE_PATH + '/'));

// ── Start ──────────────────────────────────────────────────
runMigrations().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nexhire] Server on port ${PORT} | base: ${BASE_PATH}`);
  });
}).catch(err => {
  console.error('[Nexhire] Fatal startup error:', err);
  process.exit(1);
});
