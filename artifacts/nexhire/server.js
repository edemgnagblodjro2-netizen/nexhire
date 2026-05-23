require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
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
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS address TEXT`);
    await pool.query(`ALTER TABLE nh_candidate_profiles ADD COLUMN IF NOT EXISTS province TEXT`);
    await pool.query(`ALTER TABLE nh_job_alerts ADD COLUMN IF NOT EXISTS province TEXT`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_province ON nh_jobs(province)`);
    // Team notes per application
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_application_notes (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES nh_applications(id) ON DELETE CASCADE,
        author_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_appnotes_app ON nh_application_notes(application_id, created_at)`);
    // Messaging
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_messages (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES nh_applications(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_messages_app ON nh_messages(application_id, created_at)`);
    // Add missing columns safe migrations
    await pool.query(`ALTER TABLE nh_company_reviews ADD COLUMN IF NOT EXISTS body TEXT`);
    await pool.query(`ALTER TABLE nh_company_reviews ADD COLUMN IF NOT EXISTS position TEXT`);
    await pool.query(`ALTER TABLE nh_company_reviews ADD COLUMN IF NOT EXISTS employment_type TEXT`);
    await pool.query(`ALTER TABLE nh_notifications ADD COLUMN IF NOT EXISTS link_url TEXT`);
    await pool.query(`ALTER TABLE nh_applications ADD COLUMN IF NOT EXISTS source TEXT`);
    await pool.query(`ALTER TABLE nh_candidate_profiles ADD COLUMN IF NOT EXISTS cv_text TEXT`);
    // Work Team
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_team_members (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES nh_companies(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES nh_users(id) ON DELETE SET NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'recruiter',
        status TEXT NOT NULL DEFAULT 'pending',
        token TEXT,
        invited_by TEXT REFERENCES nh_users(id) ON DELETE SET NULL,
        invited_at TIMESTAMPTZ DEFAULT NOW(),
        accepted_at TIMESTAMPTZ,
        UNIQUE(company_id, email)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_team_company ON nh_team_members(company_id)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_sessions (
        sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON nh_sessions (expire)`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS province TEXT`);
    await pool.query(`ALTER TABLE nh_candidate_profiles ADD COLUMN IF NOT EXISTS province TEXT`);
    console.log('[Nexhire] ✅ DB ready');
  } catch (err) {
    console.error('[Nexhire] Migration error:', err.message);
  }
}

// ── Demo seed (runs once if no jobs exist) ──────────────────
async function seedDemoData() {
  const { pool } = require('./models/db');
  const { rows } = await pool.query('SELECT COUNT(*) as n FROM nh_jobs');
  if (parseInt(rows[0].n) > 0) return;

  const SYS_USER_ID = '00000000-0000-0000-0000-000000000001';
  const SYS_CO_ID   = '00000000-0000-0000-0000-000000000002';

  await pool.query(`
    INSERT INTO nh_users (id, email, password_hash, role, first_name, last_name, email_verified)
    VALUES ($1, 'demo@nexhire.ca', '', 'employer', 'Nexhire', 'Demo', true)
    ON CONFLICT (id) DO NOTHING
  `, [SYS_USER_ID]);

  await pool.query(`
    INSERT INTO nh_companies (id, owner_id, name, slug, description_en, description_fr, industry, city, country, verified)
    VALUES ($1, $2, 'Nexhire Tech', 'nexhire-tech',
      'AI-powered global hiring platform.',
      'Plateforme mondiale de recrutement propulsée par l''IA.',
      'Technology', 'Montreal', 'Canada', true)
    ON CONFLICT (id) DO NOTHING
  `, [SYS_CO_ID, SYS_USER_ID]);

  await pool.query(`UPDATE nh_users SET company_id = $1 WHERE id = $2`, [SYS_CO_ID, SYS_USER_ID]);

  const jobs = [
    { en:'Senior Full-Stack Developer', fr:'Développeur Full-Stack Senior', desc_en:'Build next-gen hiring tools with React, Node.js and AI.', desc_fr:'Construisez des outils de recrutement IA avec React et Node.js.', mode:'hybrid', prov:'QC', city:'Montréal', min:95000, max:130000, featured:true,  slug:'senior-full-stack-developer-nexhire' },
    { en:'AI / ML Engineer',            fr:'Ingénieur IA / ML',             desc_en:'Design ML models for candidate matching at scale.',        desc_fr:'Concevez des modèles ML pour le matching candidat à grande échelle.', mode:'remote', prov:'ON', city:'Toronto',  min:110000,max:150000,featured:true,  slug:'ai-ml-engineer-nexhire' },
    { en:'UX / UI Designer',            fr:'Designer UX / UI',              desc_en:'Shape the future of recruiting UX on web and mobile.',      desc_fr:'Façonnez l\'expérience utilisateur du recrutement web et mobile.', mode:'hybrid', prov:'QC', city:'Montréal', min:75000, max:105000,featured:true,  slug:'ux-ui-designer-nexhire' },
    { en:'Product Manager',             fr:'Chef de produit',               desc_en:'Drive the roadmap for our AI hiring platform.',             desc_fr:'Pilotez la feuille de route de notre plateforme de recrutement IA.', mode:'onsite', prov:'ON', city:'Toronto',  min:100000,max:140000,featured:true,  slug:'product-manager-nexhire' },
    { en:'DevOps / Cloud Engineer',     fr:'Ingénieur DevOps / Cloud',      desc_en:'Scale our AWS infrastructure with Kubernetes and Terraform.',desc_fr:'Scalez notre infrastructure AWS avec Kubernetes et Terraform.', mode:'remote', prov:'BC', city:'Vancouver', min:105000,max:145000,featured:false, slug:'devops-cloud-engineer-nexhire' },
    { en:'Customer Success Manager',    fr:'Gestionnaire succès client',    desc_en:'Onboard and retain enterprise customers across Canada.',    desc_fr:'Accompagnez et fidélisez nos clients entreprise au Canada.', mode:'hybrid', prov:'AB', city:'Calgary',   min:70000, max:95000, featured:false, slug:'customer-success-manager-nexhire' },
  ];

  for (const j of jobs) {
    const id = require('crypto').randomUUID();
    await pool.query(`
      INSERT INTO nh_jobs (id, company_id, posted_by, title_en, title_fr, slug, description_en, description_fr,
        work_mode, province, city, country, salary_min, salary_max, salary_currency, salary_period,
        job_type, status, featured)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Canada',$12,$13,'CAD','year','full-time','active',$14)
      ON CONFLICT (slug) DO NOTHING
    `, [id, SYS_CO_ID, SYS_USER_ID, j.en, j.fr, j.slug, j.desc_en, j.desc_fr,
        j.mode, j.prov, j.city, j.min, j.max, j.featured]);
  }
  console.log('[Nexhire] ✅ Demo jobs seeded');
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

// ── Sessions (PostgreSQL-backed — survives server restarts) ──
app.use(session({
  store: new pgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'nh_sessions',
    createTableIfMissing: false,
  }),
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
app.use(apiBase,                    require('./routes/notes'));
app.use(apiBase + '/candidates',    require('./routes/candidates'));
app.use(apiBase + '/ai',            require('./routes/ai'));
app.use(apiBase + '/payments',      require('./routes/payments'));
app.use(apiBase + '/notifications', require('./routes/notifications'));
app.use(apiBase + '/messages',      require('./routes/messages'));
app.use(apiBase + '/analytics',     require('./routes/analytics'));
app.use(apiBase + '/admin',         require('./routes/admin'));
app.use(apiBase + '/saved-jobs',    require('./routes/saved-jobs'));
app.use(apiBase + '/reviews',       require('./routes/reviews'));
app.use(apiBase + '/team',          require('./routes/team'));

// ── Health check ───────────────────────────────────────────
app.get(BASE_PATH + '/healthz', (req, res) => res.json({ status: 'ok', service: 'nexhire' }));

// ── SPA fallback ───────────────────────────────────────────
app.get(BASE_PATH + '/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => res.redirect(BASE_PATH + '/'));

// ── Start ──────────────────────────────────────────────────
runMigrations().then(() => seedDemoData()).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nexhire] Server on port ${PORT} | base: ${BASE_PATH}`);
  });
}).catch(err => {
  console.error('[Nexhire] Fatal startup error:', err);
  process.exit(1);
});
