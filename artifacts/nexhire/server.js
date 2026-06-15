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

// ── CSP — must be FIRST middleware so nothing can override it ──────────
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "script-src-elem 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "script-src-attr 'unsafe-inline' 'unsafe-hashes'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.openai.com https://api.stripe.com https://js.stripe.com https://api.adzuna.com https://nexhire.ca https://nominatim.openstreetmap.org https://cdn.jsdelivr.net",
    "frame-src 'self' https://js.stripe.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; '));
  next();
});

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
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS ai_moderation_score  INTEGER`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS ai_moderation_flags  JSONB`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS ai_moderation_verdict TEXT`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS moderation_reason    TEXT`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS moderation_note      TEXT`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS moderated_at         TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS moderated_by         TEXT`);
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
    await pool.query(`ALTER TABLE nh_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);
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

    // ── Phase 3 migrations ─────────────────────────────────────
    // AI Credits
    await pool.query(`ALTER TABLE nh_users ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE nh_users ADD COLUMN IF NOT EXISTS ai_credits_paid INTEGER DEFAULT 0`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_credit_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        stripe_payment_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Referrals
    await pool.query(`ALTER TABLE nh_users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE`);
    await pool.query(`ALTER TABLE nh_users ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES nh_users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE nh_users ADD COLUMN IF NOT EXISTS referral_reward_given BOOLEAN DEFAULT FALSE`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        referee_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        reward_granted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(referee_id)
      )
    `);
    // Skill Tests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_skill_tests (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title_fr TEXT NOT NULL,
        title_en TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT DEFAULT 'intermediate',
        questions JSONB NOT NULL,
        pass_score INTEGER DEFAULT 70,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_skill_results (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        test_id TEXT NOT NULL REFERENCES nh_skill_tests(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        passed BOOLEAN NOT NULL,
        answers JSONB,
        completed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, test_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_skill_results_user ON nh_skill_results(user_id)`);
    // Profile score cache
    await pool.query(`ALTER TABLE nh_candidate_profiles ADD COLUMN IF NOT EXISTS profile_score INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE nh_candidate_profiles ADD COLUMN IF NOT EXISTS profile_score_updated TIMESTAMPTZ`);
    // Salary market data table (aggregated from jobs)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_salary_data (
        id TEXT PRIMARY KEY,
        title_normalized TEXT NOT NULL,
        province TEXT,
        city TEXT,
        salary_min INTEGER,
        salary_max INTEGER,
        salary_avg INTEGER,
        sample_count INTEGER DEFAULT 1,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(title_normalized, province)
      )
    `);
    await pool.query(`ALTER TABLE nh_salary_data ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'benchmark'`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_salary_submissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        title_normalized TEXT NOT NULL,
        province TEXT NOT NULL,
        city TEXT,
        salary INTEGER NOT NULL,
        work_mode TEXT,
        years_exp INTEGER,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_salary_sub_title ON nh_salary_submissions(title_normalized)`);
    // Instant job alerts — add min_salary filter
    await pool.query(`ALTER TABLE nh_job_alerts ADD COLUMN IF NOT EXISTS salary_min INTEGER`);
    await pool.query(`ALTER TABLE nh_job_alerts ADD COLUMN IF NOT EXISTS skills TEXT`);
    await pool.query(`ALTER TABLE nh_job_alerts ADD COLUMN IF NOT EXISTS instant_notify BOOLEAN DEFAULT TRUE`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_highlights (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        type        TEXT NOT NULL DEFAULT 'project',
        title       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        url         TEXT NOT NULL DEFAULT '',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_highlights_user ON nh_highlights(user_id)`);
    await pool.query(`ALTER TABLE nh_highlights ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '⭐'`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_profile_skills (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        level       INTEGER NOT NULL DEFAULT 75,
        type        TEXT NOT NULL DEFAULT 'hard',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_pskills_user ON nh_profile_skills(user_id)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_recommendations (
        id                  TEXT PRIMARY KEY,
        candidate_id        TEXT NOT NULL REFERENCES nh_users(id) ON DELETE CASCADE,
        recommender_name    TEXT NOT NULL,
        recommender_title   TEXT NOT NULL DEFAULT '',
        recommender_company TEXT NOT NULL DEFAULT '',
        recommender_photo   TEXT NOT NULL DEFAULT '',
        body                TEXT NOT NULL,
        rating              INTEGER NOT NULL DEFAULT 5,
        source              TEXT NOT NULL DEFAULT 'external',
        token               TEXT UNIQUE,
        status              TEXT NOT NULL DEFAULT 'approved',
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_rec_candidate ON nh_recommendations(candidate_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_rec_token     ON nh_recommendations(token)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_video_interviews (
        id                TEXT PRIMARY KEY,
        company_id        TEXT NOT NULL REFERENCES nh_companies(id) ON DELETE CASCADE,
        created_by        TEXT NOT NULL REFERENCES nh_users(id),
        job_id            TEXT REFERENCES nh_jobs(id) ON DELETE SET NULL,
        candidate_name    TEXT,
        candidate_email   TEXT,
        title             TEXT NOT NULL,
        questions         JSONB NOT NULL DEFAULT '[]',
        token             TEXT UNIQUE NOT NULL,
        token_expires_at  TIMESTAMPTZ NOT NULL,
        status            TEXT NOT NULL DEFAULT 'pending',
        created_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_video_responses (
        id               TEXT PRIMARY KEY,
        interview_id     TEXT NOT NULL REFERENCES nh_video_interviews(id) ON DELETE CASCADE,
        question_index   INTEGER NOT NULL,
        video_path       TEXT,
        transcript       TEXT,
        ai_score         INTEGER,
        ai_feedback      JSONB,
        ai_keywords      JSONB,
        duration_seconds INTEGER,
        recorded_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(interview_id, question_index)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_vi_company ON nh_video_interviews(company_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_vr_interview ON nh_video_responses(interview_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_posts_feed ON nh_posts(is_active, created_at DESC, id DESC)`);
    // Seed skill tests if empty
    await seedSkillTests(pool);
    // ── Feature migrations ─────────────────────────────────────
    await pool.query(`ALTER TABLE nh_candidate_profiles ADD COLUMN IF NOT EXISTS open_to_work BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE nh_candidate_profiles ADD COLUMN IF NOT EXISTS cv_summary TEXT`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE nh_jobs ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMPTZ`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_interview_slots (
        id             TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES nh_applications(id) ON DELETE CASCADE,
        company_id     TEXT NOT NULL REFERENCES nh_companies(id)    ON DELETE CASCADE,
        job_id         TEXT,
        slot1          TIMESTAMPTZ NOT NULL,
        slot2          TIMESTAMPTZ,
        slot3          TIMESTAMPTZ,
        selected_slot  TIMESTAMPTZ,
        location       TEXT DEFAULT '',
        notes          TEXT DEFAULT '',
        status         TEXT NOT NULL DEFAULT 'pending',
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_islots_app ON nh_interview_slots(application_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_islots_company ON nh_interview_slots(company_id)`);
    // ── Feed tables ────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_posts (
        id                 TEXT PRIMARY KEY,
        author_id          TEXT REFERENCES nh_users(id) ON DELETE CASCADE,
        type               VARCHAR(20) NOT NULL DEFAULT 'text',
        content            TEXT,
        image_url          TEXT,
        article_title      TEXT,
        article_body       TEXT,
        job_id             TEXT REFERENCES nh_jobs(id) ON DELETE SET NULL,
        likes_count        INTEGER DEFAULT 0,
        comments_count     INTEGER DEFAULT 0,
        shared_to_linkedin BOOLEAN DEFAULT FALSE,
        is_active          BOOLEAN DEFAULT TRUE,
        created_at         TIMESTAMPTZ DEFAULT NOW(),
        updated_at         TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_post_likes (
        id         TEXT PRIMARY KEY,
        post_id    TEXT REFERENCES nh_posts(id) ON DELETE CASCADE,
        user_id    TEXT REFERENCES nh_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_post_comments (
        id          TEXT PRIMARY KEY,
        post_id     TEXT REFERENCES nh_posts(id) ON DELETE CASCADE,
        author_id   TEXT REFERENCES nh_users(id) ON DELETE CASCADE,
        content     TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        parent_id   TEXT REFERENCES nh_post_comments(id),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_job_questions (
        id          TEXT PRIMARY KEY,
        job_id      TEXT REFERENCES nh_jobs(id) ON DELETE CASCADE,
        author_id   TEXT REFERENCES nh_users(id) ON DELETE CASCADE,
        question    TEXT NOT NULL,
        answer      TEXT,
        answered_by TEXT REFERENCES nh_users(id),
        answered_at TIMESTAMPTZ,
        is_public   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_posts_author ON nh_posts(author_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_posts_type   ON nh_posts(type, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_pcomments    ON nh_post_comments(post_id, created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_plikes       ON nh_post_likes(post_id, user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jquestions   ON nh_job_questions(job_id, is_public)`);
    // ── Seed demo posts ────────────────────────────────────────
    const postsCountRes = await pool.query('SELECT COUNT(*) FROM nh_posts');
    if (parseInt(postsCountRes.rows[0].count) === 0) {
      const usersRes = await pool.query('SELECT id FROM nh_users LIMIT 3');
      if (usersRes.rows.length > 0) {
        const { v4: uuidv4 } = require('uuid');
        const uid = usersRes.rows[0].id;
        const uid2 = (usersRes.rows[1] || usersRes.rows[0]).id;
        const uid3 = (usersRes.rows[2] || usersRes.rows[0]).id;
        const demoPosts = [
          { id: uuidv4(), author_id: uid,  type: 'hired',   content: '🎉 Ravi d\'annoncer que j\'ai rejoint TechCo en tant que Développeur React Senior ! Merci à toute l\'équipe Nexhire pour le match parfait. #NouvelleOpportunité #React #Montréal', likes_count: 24, comments_count: 3 },
          { id: uuidv4(), author_id: uid2, type: 'text',    content: 'Conseil du jour : personnalisez chaque lettre de motivation. Les recruteurs identifient immédiatement les candidatures génériques. Ça fait toute la différence ! 💡 #CareerTips #Nexhire', likes_count: 45, comments_count: 7 },
          { id: uuidv4(), author_id: uid3, type: 'text',    content: 'Le marché de l\'emploi tech au Québec en 2026 : +23% de postes remote vs 2025. Les développeurs full-stack sont les plus demandés. Vos thoughts ? 💭 #TechQC #RemoteWork', likes_count: 67, comments_count: 12 },
          { id: uuidv4(), author_id: uid2, type: 'article', article_title: 'Comment négocier son salaire en entretien', article_body: 'La négociation salariale est un moment clé que beaucoup de candidats redoutent. Pourtant, avec la bonne préparation, vous pouvez augmenter votre offre de 10 à 25%.\n\n1. Faites vos recherches avant l\'entretien — connaissez la fourchette du marché pour votre poste et région.\n\n2. Laissez l\'employeur parler en premier — évitez d\'annoncer un chiffre avant qu\'il ne soit nécessaire.\n\n3. Ancrez haut — proposez un chiffre légèrement supérieur à votre cible pour avoir de la marge.\n\n4. Négociez l\'ensemble du package — vacances, télétravail, formation. Tout est négociable.\n\n5. Soyez prêt à justifier — basez votre demande sur vos compétences et la valeur que vous apportez, pas sur vos besoins personnels.', content: 'La négociation salariale est un moment clé. Voici mes 5 règles d\'or.', likes_count: 89, comments_count: 15 },
        ];
        for (const p of demoPosts) {
          await pool.query(`
            INSERT INTO nh_posts (id, author_id, type, content, article_title, article_body, likes_count, comments_count)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (id) DO NOTHING
          `, [p.id, p.author_id, p.type, p.content || null, p.article_title || null, p.article_body || null, p.likes_count, p.comments_count]);
        }
      }
    }
    // ── Aggregation tables ─────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_jobs_external (
        id              SERIAL PRIMARY KEY,
        external_id     TEXT UNIQUE NOT NULL,
        source          TEXT NOT NULL,
        title           TEXT,
        company         TEXT,
        description     TEXT,
        city            TEXT,
        province        TEXT,
        country         TEXT,
        work_mode       TEXT,
        job_type        TEXT,
        salary_min      NUMERIC,
        salary_max      NUMERIC,
        salary_currency TEXT,
        salary_period   TEXT,
        skills          JSONB,
        category        TEXT,
        region          TEXT,
        redirect_url    TEXT NOT NULL,
        posted_at       TIMESTAMPTZ,
        raw             JSONB,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_ext_extid   ON nh_jobs_external(external_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_ext_cat_reg ON nh_jobs_external(category, region)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_ext_source  ON nh_jobs_external(source)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS nh_application_intents (
        id              SERIAL PRIMARY KEY,
        user_id         TEXT REFERENCES nh_users(id) ON DELETE SET NULL,
        job_external_id TEXT,
        job_id          TEXT,
        source          TEXT,
        category        TEXT,
        region          TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_nh_intents_cat_reg ON nh_application_intents(category, region, created_at)`);

    console.log('[Nexhire] ✅ DB ready');
  } catch (err) {
    console.error('[Nexhire] Migration error:', err.message);
  }
}

// ── Skill tests seed ──────────────────────────────────────────
async function seedSkillTests(pool) {
  const crypto = require('crypto');
  const tests = [
    // ── Developer ──────────────────────────────────────────────────────────
    { slug:'javascript-fundamentals', title_fr:'JavaScript — Fondamentaux', title_en:'JavaScript — Fundamentals', category:'Developer', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'What does `typeof null` return?', opts:['null','object','undefined','boolean'], answer:1},
        {q:'Which method adds an element to the end of an array?', opts:['push','pop','shift','splice'], answer:0},
        {q:'What is the output of `0 == false`?', opts:['true','false','TypeError','undefined'], answer:0},
        {q:'Which keyword declares a block-scoped variable?', opts:['var','let','function','global'], answer:1},
        {q:'What does `Array.isArray([])` return?', opts:['false','true','undefined','TypeError'], answer:1},
        {q:'Which method removes and returns the last element of an array?', opts:['shift','pop','splice','slice'], answer:1},
        {q:'What does `===` check in JavaScript?', opts:['Value only','Type only','Value and type','Reference equality'], answer:2},
        {q:'What is a closure?', opts:['A loop construct','A function with access to its outer scope','A class method','An async pattern'], answer:1},
        {q:'Which built-in method converts JSON string to object?', opts:['JSON.encode','JSON.parse','JSON.stringify','JSON.convert'], answer:1},
        {q:'What does `Promise.all([])` return when array is empty?', opts:['null','undefined','Rejected promise','Resolved promise with []'], answer:3},
        {q:'What is the output of `!!0`?', opts:['0','1','true','false'], answer:3},
        {q:'Which event fires when the DOM is fully loaded?', opts:['onload','DOMContentLoaded','DOMReady','pageload'], answer:1},
        {q:'What does `Array.prototype.map` return?', opts:['The original array','undefined','A new array','A boolean'], answer:2},
        {q:'Which keyword is used to handle a rejected promise?', opts:['then','catch','finally','reject'], answer:1},
        {q:'What is `NaN === NaN`?', opts:['true','false','TypeError','undefined'], answer:1},
      ]},
    { slug:'typescript-fundamentals', title_fr:'TypeScript — Fondamentaux', title_en:'TypeScript — Fundamentals', category:'Developer', difficulty:'intermediate', pass_score:70,
      questions:[
        {q:'What is TypeScript?', opts:['A CSS preprocessor','A JavaScript superset with static typing','A Node.js framework','A build tool'], answer:1},
        {q:'Which keyword defines a TypeScript interface?', opts:['type','class','interface','struct'], answer:2},
        {q:'What does the `?` after a property name mean in an interface?', opts:['Required property','Optional property','Readonly property','Nullable type'], answer:1},
        {q:'What is the `unknown` type?', opts:['Same as any','A type-safe alternative to any','A runtime error type','An undefined alias'], answer:1},
        {q:'What does `readonly` do to a property?', opts:['Makes it private','Prevents reassignment after initialization','Makes it optional','Adds runtime check'], answer:1},
        {q:'What is a Union type in TypeScript?', opts:['A type that must match all listed types','A type that can be one of several types','A generic constraint','An imported type'], answer:1},
        {q:'What does `as const` do?', opts:['Casts to a constant','Makes all properties readonly and narrows literal types','Disables type checking','Freezes the object at runtime'], answer:1},
        {q:'What is a Generic in TypeScript?', opts:['A base class','A reusable type parameter','A default export','A mixin'], answer:1},
        {q:'What does `keyof T` produce?', opts:['The values of T','A union of keys of T','An array of T','A mapped type'], answer:1},
        {q:'What is the purpose of `tsconfig.json`?', opts:['Configure npm scripts','Configure TypeScript compiler options','Define package dependencies','Set up linting rules'], answer:1},
        {q:'What does `Partial<T>` do?', opts:['Makes all properties required','Makes all properties optional','Removes all properties','Picks some properties'], answer:1},
        {q:'Which TypeScript utility makes all properties required?', opts:['Partial','Required','Readonly','Record'], answer:1},
        {q:'What is a type assertion?', opts:['Runtime type check','Telling TypeScript to treat a value as a specific type','Converting a type at runtime','Adding a type guard'], answer:1},
        {q:'What does `never` represent?', opts:['A null value','A type that never occurs (exhaustive checks, throw)','An empty object','An unresolved generic'], answer:1},
        {q:'What is the difference between `type` and `interface`?', opts:['No difference','Interfaces can be merged/extended, types are more flexible for unions','Types are faster','Interfaces support generics, types do not'], answer:1},
      ]},
    { slug:'react-intermediate', title_fr:'React — Niveau intermédiaire', title_en:'React — Intermediate', category:'Developer', difficulty:'intermediate', pass_score:70,
      questions:[
        {q:'What hook replaces `componentDidMount` in functional components?', opts:['useState','useEffect','useRef','useMemo'], answer:1},
        {q:'What does the `key` prop help React do?', opts:['Style elements','Identify list items','Pass data to children','Trigger re-renders'], answer:1},
        {q:'When does `useEffect` with an empty dependency array run?', opts:['Every render','Never','Once after mount','On unmount only'], answer:2},
        {q:'What is `useState` used for?', opts:['Routing','Local component state','Global state','API calls'], answer:1},
        {q:'What is the virtual DOM?', opts:['A browser API','A lightweight copy of the real DOM','A CSS framework','A JavaScript engine'], answer:1},
        {q:'What does `useCallback` do?', opts:['Memoizes a value','Memoizes a function reference','Creates a ref','Runs a side effect'], answer:1},
        {q:'What is React Context used for?', opts:['Local state','HTTP requests','Sharing state without prop drilling','CSS-in-JS'], answer:2},
        {q:'What does `useMemo` optimize?', opts:['Network calls','Expensive computed values','DOM mutations','Event listeners'], answer:1},
        {q:'What is the purpose of `React.StrictMode`?', opts:['Enforces TypeScript','Highlights potential problems in development','Enables server-side rendering','Disables concurrent mode'], answer:1},
        {q:'What does lifting state up mean?', opts:['Using global state','Moving state to a common ancestor','Using Redux','Storing state in localStorage'], answer:1},
        {q:'What is a controlled component?', opts:['A component controlled by a parent','A form element whose value is controlled by React state','A class component','A memoized component'], answer:1},
        {q:'When should you use `useRef`?', opts:['For API calls','To access DOM nodes or persist values without re-render','For routing','For context'], answer:1},
        {q:'What does `React.memo` do?', opts:['Memoizes async operations','Prevents re-render if props haven\'t changed','Creates a new context','Wraps a hook'], answer:1},
        {q:'What is reconciliation in React?', opts:['Managing API state','The process of updating the DOM to match the virtual DOM','Routing between pages','Handling forms'], answer:1},
        {q:'What hook lets you run cleanup on component unmount?', opts:['useState','useCallback','useEffect (return a cleanup function)','useRef'], answer:2},
      ]},
    { slug:'nodejs-fundamentals', title_fr:'Node.js — Fondamentaux', title_en:'Node.js — Fundamentals', category:'Developer', difficulty:'intermediate', pass_score:70,
      questions:[
        {q:'What is Node.js?', opts:['A browser runtime','A JavaScript runtime built on V8','A CSS framework','A database'], answer:1},
        {q:'What does `require()` do in Node.js?', opts:['Imports an HTTP module only','Loads a module synchronously','Loads a module asynchronously','Defines a module'], answer:1},
        {q:'What is the event loop in Node.js?', opts:['A for loop for events','The mechanism that handles async operations non-blockingly','A worker thread pool','A queue for HTTP requests'], answer:1},
        {q:'Which module is used to create an HTTP server?', opts:['fs','path','http','net'], answer:2},
        {q:'What does `process.env` give access to?', opts:['Command line args','Environment variables','Installed packages','File system'], answer:1},
        {q:'What is `package.json` used for?', opts:['Storing database configs','Defining project metadata and dependencies','Running SQL migrations','Configuring TypeScript'], answer:1},
        {q:'What is middleware in Express.js?', opts:['A database layer','A function that processes requests before they reach route handlers','A caching layer','A template engine'], answer:1},
        {q:'What does `async/await` simplify?', opts:['Synchronous code','Working with Promises','Module imports','Event emitters'], answer:1},
        {q:'What does `fs.readFile` do?', opts:['Reads a file synchronously','Reads a file asynchronously','Writes a file','Watches a file for changes'], answer:1},
        {q:'What is npm?', opts:['A JavaScript runtime','Node Package Manager','A build tool','A testing framework'], answer:1},
        {q:'What does `res.json()` do in Express?', opts:['Sends an HTML response','Sends a JSON response with Content-Type header','Redirects the request','Parses incoming JSON'], answer:1},
        {q:'What is a Buffer in Node.js?', opts:['A caching mechanism','A fixed-size raw binary data container','An event queue','A stream transformer'], answer:1},
        {q:'What does `app.use()` do in Express?', opts:['Defines a GET route','Mounts middleware or sub-routers','Sets a port','Reads request body'], answer:1},
        {q:'Which flag runs Node.js with ES modules?', opts:['--esm','--module','--type=module (in package.json)','--ecma'], answer:2},
        {q:'What is the purpose of `cors` middleware?', opts:['Compression','Cross-origin request handling','Cookie parsing','Session management'], answer:1},
      ]},
    { slug:'python-basics', title_fr:'Python — Bases', title_en:'Python — Basics', category:'Developer', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'What is the output of `len("hello")`?', opts:['4','5','6','Error'], answer:1},
        {q:'Which is used to define a function in Python?', opts:['function','def','fun','func'], answer:1},
        {q:'What does `//` do in Python?', opts:['Comment','Float division','Integer division','Power'], answer:2},
        {q:'What type is `[1, 2, 3]` in Python?', opts:['tuple','dict','list','set'], answer:2},
        {q:'How do you start a comment in Python?', opts:['//','/*','#','--'], answer:2},
        {q:'What is the output of `type(3.14)`?', opts:['int','float','double','number'], answer:1},
        {q:'Which keyword is used for loops in Python?', opts:['loop','repeat','for','iterate'], answer:2},
        {q:'What does `range(5)` produce?', opts:['[1,2,3,4,5]','[0,1,2,3,4]','[0,1,2,3,4,5]','(0,5)'], answer:1},
        {q:'How do you access the last element of a list `lst`?', opts:['lst[last]','lst[-1]','lst[end]','lst[len]'], answer:1},
        {q:'What is a dictionary in Python?', opts:['An ordered list','A key-value pair data structure','A set of unique values','A tuple'], answer:1},
        {q:'What does `str.split(",")` return?', opts:['A string','A list split by commas','A tuple','A generator'], answer:1},
        {q:'Which operator is used for exponentiation in Python?', opts:['^','**','^^','exp()'], answer:1},
        {q:'What is a virtual environment used for?', opts:['Running GUI apps','Isolating project dependencies','Speeding up Python','Managing files'], answer:1},
        {q:'What does `append()` do to a list?', opts:['Removes last element','Adds element to the end','Sorts the list','Inserts at index 0'], answer:1},
        {q:'What is PEP 8?', opts:['A Python version','Python\'s style guide for code formatting','A package manager','A testing library'], answer:1},
      ]},
    { slug:'git-version-control', title_fr:'Git — Contrôle de version', title_en:'Git — Version Control', category:'Developer', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'What does `git init` do?', opts:['Clones a repo','Initializes a new Git repository','Commits changes','Pushes to remote'], answer:1},
        {q:'What does `git clone` do?', opts:['Creates a branch','Copies a remote repository locally','Merges branches','Tags a commit'], answer:1},
        {q:'What is a commit in Git?', opts:['A branch name','A snapshot of staged changes','A merge request','A remote branch'], answer:1},
        {q:'What does `git status` show?', opts:['Commit history','Current branch and file changes','Remote branches','Stashed changes'], answer:1},
        {q:'What does `git pull` do?', opts:['Pushes to remote','Fetches and merges changes from remote','Creates a new branch','Stashes changes'], answer:1},
        {q:'What is the staging area?', opts:['A backup copy','Where files are prepared before committing','A remote branch','A merge conflict area'], answer:1},
        {q:'What does `git branch -d` do?', opts:['Creates a branch','Lists branches','Deletes a branch','Renames a branch'], answer:2},
        {q:'What is a merge conflict?', opts:['A failed push','Conflicting changes in the same file from different branches','A missing commit','A corrupted repo'], answer:1},
        {q:'What does `git stash` do?', opts:['Deletes uncommitted changes','Temporarily saves uncommitted changes','Commits to a temp branch','Resets HEAD'], answer:1},
        {q:'What is `origin` in Git?', opts:['The first commit','The default name for the remote repository','The main branch','A tag'], answer:1},
        {q:'What does `git rebase` do?', opts:['Merges two branches with a merge commit','Re-applies commits on top of another branch','Reverts a commit','Deletes a branch'], answer:1},
        {q:'What is a Pull Request (PR)?', opts:['A git command','A request to merge changes into another branch for review','An automatic merge','A remote branch push'], answer:1},
        {q:'What does `git log` show?', opts:['File differences','Commit history','Remote branches','Current status'], answer:1},
        {q:'What does `.gitignore` do?', opts:['Ignores all git commands','Lists files Git should not track','Hides the .git folder','Deletes ignored files'], answer:1},
        {q:'What does `git reset --hard HEAD` do?', opts:['Creates a new branch at HEAD','Discards all uncommitted changes and resets to last commit','Merges HEAD','Tags the HEAD commit'], answer:1},
      ]},
    { slug:'docker-devops', title_fr:'Docker & DevOps — Bases', title_en:'Docker & DevOps — Basics', category:'DevOps', difficulty:'intermediate', pass_score:70,
      questions:[
        {q:'What is Docker?', opts:['A programming language','A platform for containerizing applications','A cloud provider','A CI/CD tool'], answer:1},
        {q:'What is a Docker image?', opts:['A running container','A template for creating containers','A Dockerfile command','A registry'], answer:1},
        {q:'What is a Docker container?', opts:['A static image snapshot','A running instance of a Docker image','A volume','A network'], answer:1},
        {q:'What does `docker build` do?', opts:['Runs a container','Creates an image from a Dockerfile','Pulls an image from registry','Lists containers'], answer:1},
        {q:'What does `docker-compose up` do?', opts:['Builds images only','Starts services defined in docker-compose.yml','Stops all containers','Pushes to registry'], answer:1},
        {q:'What is a Dockerfile?', opts:['A YAML configuration file','A script with instructions to build a Docker image','A container runtime config','A registry manifest'], answer:1},
        {q:'What does `EXPOSE` in a Dockerfile do?', opts:['Opens a port on the host','Documents the port the container listens on','Binds a volume','Sets an env var'], answer:1},
        {q:'What is CI/CD?', opts:['Container Infrastructure / Container Deployment','Continuous Integration / Continuous Delivery','Code Inspection / Code Deployment','Cloud Integration / Cloud Delivery'], answer:1},
        {q:'What is Kubernetes used for?', opts:['Building Docker images','Orchestrating and managing containers at scale','Writing Dockerfiles','Storing Docker images'], answer:1},
        {q:'What does `ENV` in a Dockerfile do?', opts:['Runs a command','Sets an environment variable inside the image','Copies files','Exposes a port'], answer:1},
        {q:'What is the purpose of a `.dockerignore` file?', opts:['Ignores Docker commands','Excludes files from the build context','Hides the Dockerfile','Disables caching'], answer:1},
        {q:'What does `docker ps` show?', opts:['All images','Running containers','Stopped containers only','Disk usage'], answer:1},
        {q:'What is a Docker volume?', opts:['A RAM disk','Persistent storage that survives container restarts','A container network','A cached layer'], answer:1},
        {q:'What does `RUN` do in a Dockerfile?', opts:['Runs the container','Executes a command during image build','Starts a service','Sets the entry point'], answer:1},
        {q:'What is a container registry?', opts:['A runtime for containers','A service for storing and distributing Docker images','A container orchestrator','A CI/CD pipeline'], answer:1},
      ]},
    // ── Data ────────────────────────────────────────────────────────────────
    { slug:'sql-fundamentals', title_fr:'SQL — Fondamentaux', title_en:'SQL — Fundamentals', category:'Data', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'Which SQL statement retrieves data?', opts:['INSERT','UPDATE','SELECT','DELETE'], answer:2},
        {q:'What does `WHERE` do?', opts:['Sorts results','Filters rows','Groups data','Joins tables'], answer:1},
        {q:'Which clause is used with aggregate functions to filter groups?', opts:['WHERE','HAVING','ORDER BY','GROUP BY'], answer:1},
        {q:'What does `JOIN` do?', opts:['Deletes duplicate rows','Combines rows from multiple tables','Filters null values','Sorts data'], answer:1},
        {q:'What does `COUNT(*)` return?', opts:['Sum of values','Number of rows','Max value','Average'], answer:1},
        {q:'What does `DISTINCT` do in a SELECT?', opts:['Sorts results','Removes duplicate values','Filters nulls','Groups rows'], answer:1},
        {q:'What is a PRIMARY KEY?', opts:['A foreign reference','A unique identifier for each row','An index on all columns','A constraint preventing joins'], answer:1},
        {q:'What is a FOREIGN KEY?', opts:['A key from another database','A column referencing the primary key of another table','A unique index','A composite key'], answer:1},
        {q:'What does `ORDER BY ... DESC` do?', opts:['Sorts ascending','Sorts descending','Groups results','Limits results'], answer:1},
        {q:'What does `LIMIT 10` do?', opts:['Skips 10 rows','Returns at most 10 rows','Groups 10 rows','Sums 10 rows'], answer:1},
        {q:'What does `NULL` represent in SQL?', opts:['Zero','Empty string','Unknown or missing value','False'], answer:2},
        {q:'What does `GROUP BY` do?', opts:['Sorts results','Aggregates rows with the same values in specified columns','Joins tables','Filters rows'], answer:1},
        {q:'What is the difference between `INNER JOIN` and `LEFT JOIN`?', opts:['No difference','INNER returns only matching rows; LEFT returns all left rows + matches','LEFT is faster','INNER includes NULLs'], answer:1},
        {q:'What does `SUM()` do?', opts:['Counts rows','Calculates the sum of a numeric column','Returns the max value','Returns the average'], answer:1},
        {q:'What does `LIKE \'%word%\'` do?', opts:['Exact match','Matches rows containing "word" anywhere in the value','Matches rows starting with "word"','Case-sensitive match only'], answer:1},
      ]},
    // ── Finance ─────────────────────────────────────────────────────────────
    { slug:'excel-advanced', title_fr:'Excel — Avancé', title_en:'Excel — Advanced', category:'Finance', difficulty:'intermediate', pass_score:70,
      questions:[
        {q:'What function looks up a value in the first column of a range?', opts:['HLOOKUP','INDEX','VLOOKUP','MATCH'], answer:2},
        {q:'What does `$A$1` mean in a formula?', opts:['Relative reference','Absolute reference','Named range','Error value'], answer:1},
        {q:'Which function counts cells that meet a condition?', opts:['COUNT','COUNTA','COUNTIF','SUMIF'], answer:2},
        {q:'What is a Pivot Table used for?', opts:['Formatting data','Summarizing large datasets','Creating charts only','Writing macros'], answer:1},
        {q:'What keyboard shortcut inserts the current date?', opts:['Ctrl+D','Ctrl+;','Ctrl+T','Alt+D'], answer:1},
        {q:'What does `IFERROR(value, value_if_error)` do?', opts:['Ignores all errors','Returns a fallback value if an error occurs','Converts errors to 0','Checks if a cell is empty'], answer:1},
        {q:'What is the purpose of `INDEX/MATCH` vs `VLOOKUP`?', opts:['No difference','INDEX/MATCH can look up in any column direction','VLOOKUP is faster','INDEX/MATCH only works with numbers'], answer:1},
        {q:'What does `SUMIFS` do differently from `SUMIF`?', opts:['Nothing different','SUMIFS supports multiple criteria','SUMIF is deprecated','SUMIFS only works with dates'], answer:1},
        {q:'What does `CONCATENATE` (or `&`) do?', opts:['Multiplies text','Joins text strings together','Splits text','Converts text to number'], answer:1},
        {q:'What is a named range in Excel?', opts:['A formatted range','A cell range given a descriptive name for use in formulas','A range with conditional formatting','A dynamic chart range'], answer:1},
        {q:'What does `XLOOKUP` improve over `VLOOKUP`?', opts:['Speed','Can search any column, return arrays, and handle errors natively','Works with macros only','Has no improvement'], answer:1},
        {q:'What is the purpose of data validation in Excel?', opts:['Formatting cells','Restricting what data users can enter in a cell','Auto-calculating totals','Sorting data automatically'], answer:1},
        {q:'What does `TEXT(value, format)` do?', opts:['Converts text to number','Formats a number as text with a specified format','Removes spaces from text','Counts characters'], answer:1},
        {q:'What is conditional formatting?', opts:['A formula type','Applying formatting based on cell values or rules','A chart type','A keyboard shortcut'], answer:1},
        {q:'What does `LEN()` return?', opts:['The left characters of a string','The number of characters in a string','The first word','The length of a range'], answer:1},
      ]},
    { slug:'accounting-basics', title_fr:'Comptabilité — Bases', title_en:'Accounting — Basics', category:'Finance', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'What is the accounting equation?', opts:['Revenue = Expenses + Profit','Assets = Liabilities + Equity','Profit = Revenue - Costs','Assets = Revenue - Liabilities'], answer:1},
        {q:'What is a balance sheet?', opts:['A list of revenues','A snapshot of assets, liabilities, and equity at a point in time','A cash flow statement','A profit and loss report'], answer:1},
        {q:'What does "debit" mean in double-entry accounting?', opts:['Always increases an account','Always decreases an account','Increases assets or expenses; decreases liabilities or equity','A bank withdrawal'], answer:2},
        {q:'What is EBITDA?', opts:['Total revenue','Earnings Before Interest, Taxes, Depreciation, and Amortization','Net profit','Cash from operations'], answer:1},
        {q:'What is an income statement?', opts:['A list of assets','A report showing revenues, expenses, and net profit over a period','A budget plan','A balance sheet alternative'], answer:1},
        {q:'What is depreciation?', opts:['A tax benefit','The gradual reduction in value of a tangible asset over time','An increase in asset value','A revenue category'], answer:1},
        {q:'What is accounts receivable?', opts:['Money owed by the company','Money owed to the company by customers','Bank loans','Inventory value'], answer:1},
        {q:'What is cash flow?', opts:['Net income','The movement of money into and out of a business','Total assets','Profit after tax'], answer:1},
        {q:'What is gross profit?', opts:['Revenue minus all expenses','Revenue minus cost of goods sold','Net income after tax','Operating income'], answer:1},
        {q:'What is a liability?', opts:['Company owned asset','An obligation or debt the company owes','Shareholder equity','Net profit'], answer:1},
        {q:'What is working capital?', opts:['Total assets','Current assets minus current liabilities','Long-term debt','Net income'], answer:1},
        {q:'What does ROI stand for?', opts:['Rate of Income','Return on Investment','Revenue Over Investments','Return of Interest'], answer:1},
        {q:'What is an audit?', opts:['A tax payment','An independent examination of financial records','A budget review','A financial forecast'], answer:1},
        {q:'What is the difference between revenue and profit?', opts:['They are the same','Revenue is total income; profit is income after expenses','Profit includes taxes; revenue does not','Revenue is monthly; profit is annual'], answer:1},
        {q:'What is a journal entry?', opts:['A company diary','A record of a financial transaction in double-entry accounting','A monthly report','A bank statement'], answer:1},
      ]},
    // ── Marketing ────────────────────────────────────────────────────────────
    { slug:'marketing-digital', title_fr:'Marketing digital — Fondamentaux', title_en:'Digital Marketing — Fundamentals', category:'Marketing', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'What does SEO stand for?', opts:['Social Engagement Optimization','Search Engine Optimization','Site Evaluation Output','Structured Email Outreach'], answer:1},
        {q:'What is a conversion rate?', opts:['Bounce rate','% of visitors who complete a goal','Email open rate','CPM'], answer:1},
        {q:'What is A/B testing?', opts:['Comparing two versions to see which performs better','Testing on two browsers','A/B stands for Audit/Budget','Running ads on two platforms'], answer:0},
        {q:'What does CTR stand for?', opts:['Click-Through Rate','Content Transfer Rate','Cost To Reach','Customer Tracking Record'], answer:0},
        {q:'Which metric measures ad cost per 1000 impressions?', opts:['CPC','CPM','CTR','ROAS'], answer:1},
        {q:'What is a landing page?', opts:['The homepage of a website','A dedicated page designed to convert visitors for a specific goal','A product catalog page','A contact page'], answer:1},
        {q:'What does CPC mean?', opts:['Cost Per Customer','Cost Per Click','Click Per Campaign','Customer Payment Conversion'], answer:1},
        {q:'What is email marketing?', opts:['Spam emails','Sending targeted commercial messages to a subscriber list','Cold calling via email','Email account management'], answer:1},
        {q:'What is a buyer persona?', opts:['A real customer profile','A fictional ideal customer profile based on research','A paid ad audience','A social media follower'], answer:1},
        {q:'What does ROAS stand for?', opts:['Rate of Ad Spending','Return On Ad Spend','Reach Of Ad Set','Real-time Online Ad Stats'], answer:1},
        {q:'What is content marketing?', opts:['Paying for ads','Creating valuable content to attract and engage an audience','Managing social media accounts','Email automation'], answer:1},
        {q:'What is a sales funnel?', opts:['A customer support tool','The journey from awareness to purchase','A CRM system','An email workflow'], answer:1},
        {q:'What does SEM stand for?', opts:['Social Email Marketing','Search Engine Marketing','Site Engagement Metrics','Structured Email Messages'], answer:1},
        {q:'What is retargeting?', opts:['Re-sending emails','Showing ads to users who previously visited your site','Updating ad creative','Changing target audience'], answer:1},
        {q:'What is the main goal of SEO?', opts:['Increase paid traffic','Improve organic search rankings','Boost email open rates','Run social media ads'], answer:1},
      ]},
    // ── Management ───────────────────────────────────────────────────────────
    { slug:'project-management', title_fr:'Gestion de projet — Fondamentaux', title_en:'Project Management — Fundamentals', category:'Management', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'What is the triple constraint in project management?', opts:['Cost, Time, Resources','Scope, Time, Cost','People, Process, Technology','Risk, Quality, Budget'], answer:1},
        {q:'What is a Gantt chart?', opts:['A risk matrix','A bar chart visualizing project schedule and tasks over time','A budget breakdown','A team org chart'], answer:1},
        {q:'What does Agile methodology emphasize?', opts:['Strict upfront planning','Iterative development and flexible response to change','Long release cycles','Waterfall phases'], answer:1},
        {q:'What is a sprint in Scrum?', opts:['A project phase','A fixed-length iteration (typically 2 weeks) for delivering work','A team meeting','A backlog review'], answer:1},
        {q:'What is a stakeholder?', opts:['A shareholder','Anyone with an interest in or impacted by the project','A project manager only','A budget holder'], answer:1},
        {q:'What is a project charter?', opts:['A legal contract','A document that formally authorizes a project and defines its scope','A budget spreadsheet','A team agreement'], answer:1},
        {q:'What is risk management?', opts:['Avoiding all risks','Identifying, assessing, and mitigating potential project threats','Insuring the project','Reporting risks to clients'], answer:1},
        {q:'What is the critical path?', opts:['The shortest task sequence','The longest sequence of dependent tasks determining project duration','The most expensive tasks','Tasks done by the PM'], answer:1},
        {q:'What is a KPI?', opts:['Key Project Initiative','Key Performance Indicator','Knowledge Process Integration','Key Planning Input'], answer:1},
        {q:'What is scope creep?', opts:['Reducing project scope','Uncontrolled expansion of project scope without proper change management','Completing scope early','Redefining project goals'], answer:1},
        {q:'What does a Product Owner do in Scrum?', opts:['Manages the dev team daily','Defines and prioritizes the product backlog','Runs sprint retrospectives','Writes code'], answer:1},
        {q:'What is a retrospective in Agile?', opts:['A planning session','A meeting at the end of a sprint to reflect and improve processes','A code review','A stakeholder demo'], answer:1},
        {q:'What is a WBS (Work Breakdown Structure)?', opts:['A team hierarchy','A hierarchical decomposition of all project deliverables and tasks','A risk log','A project budget'], answer:1},
        {q:'What is the purpose of a project milestone?', opts:['A billing checkpoint','A significant event marking a major achievement in the project','A team celebration','A budget review point'], answer:1},
        {q:'What is the difference between Agile and Waterfall?', opts:['No difference','Waterfall is linear/sequential; Agile is iterative and adaptive','Agile is only for software','Waterfall is faster'], answer:1},
      ]},
    // ── Design ────────────────────────────────────────────────────────────────
    { slug:'ux-design', title_fr:'Design UX — Fondamentaux', title_en:'UX Design — Fundamentals', category:'Design', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'What does UX stand for?', opts:['User eXperience','Universal eXchange','UI eXtension','Unified eXecution'], answer:0},
        {q:'What is a wireframe?', opts:['A finished design mockup','A low-fidelity layout sketch of a screen or page','A brand style guide','A prototype with interactions'], answer:1},
        {q:'What is user research?', opts:['Analyzing competitor products','Gathering insights about users\' needs, behaviors, and motivations','Writing user stories','Defining visual design'], answer:1},
        {q:'What is a persona in UX?', opts:['A real user account','A fictional representation of a target user based on research','A brand mascot','A test account'], answer:1},
        {q:'What is usability?', opts:['Visual aesthetics','How easily users can learn and use a product effectively','Accessibility compliance','Performance speed'], answer:1},
        {q:'What is the purpose of a usability test?', opts:['Testing code bugs','Observing real users interacting with a product to find usability issues','Checking visual design quality','Testing performance'], answer:1},
        {q:'What is information architecture?', opts:['Database design','Organizing and structuring content so users can find it easily','Visual hierarchy in UI','Server architecture'], answer:1},
        {q:'What is a prototype?', opts:['A finished product','An interactive simulation of a design for testing before development','A user story','A design spec'], answer:1},
        {q:'What does "affordance" mean in UX?', opts:['Visual color choice','A design quality that suggests how something should be used','Animation style','Page loading speed'], answer:1},
        {q:'What is the difference between UX and UI?', opts:['They are the same','UX focuses on the overall experience and flow; UI focuses on visual design and interactions','UX is for mobile; UI is for web','UI comes before UX'], answer:1},
        {q:'What is a user flow?', opts:['A user support ticket','A diagram showing the steps a user takes to complete a task','A page layout','A navigation menu'], answer:1},
        {q:'What is accessibility (a11y) in design?', opts:['Fast loading times','Designing so people with disabilities can use the product','Color contrast only','Mobile responsiveness'], answer:1},
        {q:'What is card sorting used for?', opts:['Organizing design files','Understanding how users categorize and organize information','Ranking design options','Sorting user feedback'], answer:1},
        {q:'What is a design system?', opts:['A project management tool','A collection of reusable components and guidelines for consistent design','A prototyping tool','A color palette only'], answer:1},
        {q:'What is the "5-second test"?', opts:['A performance test','Testing whether users understand a design\'s purpose within 5 seconds of viewing it','A load time benchmark','A usability scoring method'], answer:1},
      ]},
    // ── Soft Skills ───────────────────────────────────────────────────────────
    { slug:'communication-skills', title_fr:'Communication professionnelle', title_en:'Professional Communication', category:'Soft Skills', difficulty:'beginner', pass_score:70,
      questions:[
        {q:'What is active listening?', opts:['Waiting for your turn to speak','Fully concentrating and responding thoughtfully to what is being said','Nodding without paying attention','Taking notes only'], answer:1},
        {q:'What is non-verbal communication?', opts:['Written messages','Body language, facial expressions, tone, and gestures','Email communication','Silent reading'], answer:1},
        {q:'What is the STAR method?', opts:['A presentation format','A structured way to answer behavioral interview questions (Situation, Task, Action, Result)','A decision-making model','A conflict resolution method'], answer:1},
        {q:'What does assertive communication mean?', opts:['Being aggressive to get your way','Expressing your needs and opinions clearly and respectfully','Being passive to avoid conflict','Avoiding difficult topics'], answer:1},
        {q:'What is emotional intelligence (EQ)?', opts:['Your IQ score','The ability to recognize, understand, and manage your own and others\' emotions','Being friendly at work','Avoiding emotional reactions'], answer:1},
        {q:'What is the best practice for giving constructive feedback?', opts:['Focus only on negatives','Be specific, focus on behavior not the person, and offer suggestions for improvement','Wait until the annual review','Give feedback only in writing'], answer:1},
        {q:'What is empathy in the workplace?', opts:['Agreeing with everyone','Understanding and sharing the feelings of a colleague\'s perspective','Avoiding personal conversations','Being overly friendly'], answer:1},
        {q:'What is a key characteristic of effective written communication?', opts:['Using jargon and acronyms','Being clear, concise, and adapted to the audience','Writing long detailed paragraphs','Using formal language only'], answer:1},
        {q:'What is the purpose of an agenda in a meeting?', opts:['Attendance tracking','Providing structure and topics to keep the meeting focused and efficient','A legal requirement','A social formality'], answer:1},
        {q:'What does "conflict of interest" mean?', opts:['A disagreement between coworkers','A situation where personal interests could improperly influence professional decisions','A legal dispute','A budget disagreement'], answer:1},
        {q:'What is professional networking?', opts:['Using social media for personal use','Building and maintaining relationships that can provide mutual career support','Attending company parties','Collecting business cards'], answer:1},
        {q:'What is the most important factor in a professional email?', opts:['Length','Clear subject line, polite tone, and direct purpose','Number of recipients','Use of formal titles'], answer:1},
        {q:'What does "deadline management" involve?', opts:['Working overtime always','Prioritizing tasks and planning to complete work on time','Delegating all work','Reporting delays after they happen'], answer:1},
        {q:'What is a growth mindset?', opts:['Believing talent is fixed','Believing abilities can be developed through effort and learning','Focusing only on strengths','Avoiding challenges'], answer:1},
        {q:'What is the best approach when you disagree with a colleague?', opts:['Ignore the issue','Raise your concern professionally and seek a constructive resolution','Escalate immediately to management','Complain to other colleagues'], answer:1},
      ]},
  ];
  const { rows } = await pool.query('SELECT slug FROM nh_skill_tests');
  const existingSlugs = new Set(rows.map(r => r.slug));
  let added = 0;
  for (const t of tests) {
    if (existingSlugs.has(t.slug)) {
      // Update questions pool if test already exists (to expand pools)
      await pool.query(
        `UPDATE nh_skill_tests SET questions=$1, title_fr=$2, title_en=$3, category=$4, difficulty=$5, pass_score=$6 WHERE slug=$7`,
        [JSON.stringify(t.questions), t.title_fr, t.title_en, t.category, t.difficulty, t.pass_score, t.slug]
      );
    } else {
      await pool.query(
        `INSERT INTO nh_skill_tests (id,slug,title_fr,title_en,category,difficulty,questions,pass_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [crypto.randomUUID(), t.slug, t.title_fr, t.title_en, t.category, t.difficulty, JSON.stringify(t.questions), t.pass_score]
      );
      added++;
    }
  }
  console.log(`[Nexhire] ✅ Skill tests seeded (${added} new, ${tests.length - added} updated)`);
}

// ── Demo seed (force-upsert — runs on every restart, safe) ──
async function seedDemoData() {
  const { pool } = require('./models/db');
  const crypto = require('crypto');

  // ── 3 system users (one per company) ─────────────────────
  const USERS = [
    { id: '00000000-0000-0000-0000-000000000001', email: 'demo@nexhire.ca',      first: 'Nexhire',   last: 'Demo' },
    { id: '00000000-0000-0000-0000-000000000011', email: 'demo@nordiqtech.ca',   first: 'NordiqTech',  last: 'Recrutement' },
    { id: '00000000-0000-0000-0000-000000000021', email: 'demo@novacoop.ca',     first: 'NovaCoop',    last: 'Talents' },
  ];
  for (const u of USERS) {
    await pool.query(`
      INSERT INTO nh_users (id, email, password_hash, role, first_name, last_name, email_verified)
      VALUES ($1,$2,'','employer',$3,$4,true)
      ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email
    `, [u.id, u.email, u.first, u.last]);
  }

  // ── 3 companies ───────────────────────────────────────────
  const COMPANIES = [
    { id:'00000000-0000-0000-0000-000000000002', owner:'00000000-0000-0000-0000-000000000001',
      name:'Nexhire Tech', slug:'nexhire-tech', industry:'Technology', city:'Montréal',
      en:'AI-powered global hiring platform connecting top talent with leading companies.',
      fr:'Plateforme mondiale de recrutement IA connectant les talents avec les meilleures entreprises.' },
    { id:'00000000-0000-0000-0000-000000000012', owner:'00000000-0000-0000-0000-000000000011',
      name:'NordiqTech Inc.', slug:'nordiqtech', industry:'E-commerce / Technology', city:'Ottawa',
      en:'Canadian SaaS platform helping businesses grow through technology and AI.',
      fr:'Plateforme SaaS canadienne aidant les entreprises à croître grâce à la technologie et l\'IA.' },
    { id:'00000000-0000-0000-0000-000000000022', owner:'00000000-0000-0000-0000-000000000021',
      name:'NovaCoop Finance', slug:'novacoop-finance', industry:'Finance / Coopérative', city:'Lévis',
      en:'A cooperative financial group serving thousands of members across Québec.',
      fr:'Un groupe financier coopératif au service de milliers de membres à travers le Québec.' },
  ];
  for (const c of COMPANIES) {
    await pool.query(`
      INSERT INTO nh_companies (id, owner_id, name, slug, description_en, description_fr, industry, city, country, verified)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Canada',true)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, verified=true
    `, [c.id, c.owner, c.name, c.slug, c.en, c.fr, c.industry, c.city]);
    await pool.query(`UPDATE nh_users SET company_id=$1 WHERE id=$2`, [c.id, c.owner]);
  }

  // ── 15 jobs across 3 companies ────────────────────────────
  const JOBS = [
    // Nexhire Tech
    { co:'00000000-0000-0000-0000-000000000002', by:'00000000-0000-0000-0000-000000000001',
      en:'Senior Full-Stack Developer', fr:'Développeur Full-Stack Senior',
      desc_en:'Build next-gen AI hiring tools with React, Node.js and PostgreSQL. Work directly with the founding team.',
      desc_fr:'Construisez des outils de recrutement IA de nouvelle génération avec React, Node.js et PostgreSQL.',
      mode:'hybrid', prov:'QC', city:'Montréal', min:95000, max:130000, featured:true, type:'full-time',
      skills:'["React","Node.js","TypeScript","PostgreSQL"]', slug:'senior-full-stack-nexhire' },
    { co:'00000000-0000-0000-0000-000000000002', by:'00000000-0000-0000-0000-000000000001',
      en:'AI / ML Engineer', fr:'Ingénieur IA / ML',
      desc_en:'Design and deploy ML models for candidate-job matching at scale using Claude and GPT-4o.',
      desc_fr:'Concevez et déployez des modèles ML pour le matching candidat-emploi à grande échelle.',
      mode:'remote', prov:'ON', city:'Toronto', min:115000, max:155000, featured:true, type:'full-time',
      skills:'["Python","Machine Learning","LLMs","PyTorch"]', slug:'ai-ml-engineer-nexhire' },
    { co:'00000000-0000-0000-0000-000000000002', by:'00000000-0000-0000-0000-000000000001',
      en:'Senior UX / UI Designer', fr:'Designer UX / UI Senior',
      desc_en:'Shape the future of recruiting UX on web and mobile. Own the design system end-to-end.',
      desc_fr:'Façonnez l\'expérience utilisateur du recrutement web et mobile. Possédez le design system.',
      mode:'hybrid', prov:'QC', city:'Montréal', min:80000, max:110000, featured:true, type:'full-time',
      skills:'["Figma","UX Research","Design Systems","Prototyping"]', slug:'ux-ui-designer-nexhire' },
    { co:'00000000-0000-0000-0000-000000000002', by:'00000000-0000-0000-0000-000000000001',
      en:'Product Manager — AI Features', fr:'Chef de produit — Fonctionnalités IA',
      desc_en:'Drive the AI roadmap: matching, scoring, cover letters. Work with engineers and data scientists.',
      desc_fr:'Pilotez la feuille de route IA : matching, scoring, lettres de motivation.',
      mode:'onsite', prov:'ON', city:'Toronto', min:105000, max:140000, featured:false, type:'full-time',
      skills:'["Product Management","Agile","AI/ML","Roadmapping"]', slug:'product-manager-nexhire' },
    { co:'00000000-0000-0000-0000-000000000002', by:'00000000-0000-0000-0000-000000000001',
      en:'DevOps / Cloud Engineer', fr:'Ingénieur DevOps / Cloud',
      desc_en:'Scale AWS infrastructure with Kubernetes and Terraform. Own CI/CD and observability.',
      desc_fr:'Scalez l\'infrastructure AWS avec Kubernetes et Terraform. CI/CD et observabilité.',
      mode:'remote', prov:'BC', city:'Vancouver', min:108000, max:148000, featured:false, type:'full-time',
      skills:'["AWS","Kubernetes","Terraform","Docker"]', slug:'devops-cloud-nexhire' },
    // NordiqTech Inc.
    { co:'00000000-0000-0000-0000-000000000012', by:'00000000-0000-0000-0000-000000000011',
      en:'Backend Engineer — Payments', fr:'Ingénieur backend — Paiements',
      desc_en:'Build and scale NordiqTech\'s payments infrastructure for thousands of merchants across Canada.',
      desc_fr:'Construisez et scalez l\'infrastructure de paiements de NordiqTech pour des milliers de marchands.',
      mode:'hybrid', prov:'ON', city:'Ottawa', min:130000, max:180000, featured:true, type:'full-time',
      skills:'["Ruby on Rails","Go","Distributed Systems","Payments"]', slug:'backend-engineer-payments-nordiqtech' },
    { co:'00000000-0000-0000-0000-000000000012', by:'00000000-0000-0000-0000-000000000011',
      en:'Data Engineer — Analytics', fr:'Ingénieur données — Analytique',
      desc_en:'Design data pipelines powering merchant analytics across NordiqTech\'s SaaS platform.',
      desc_fr:'Concevez des pipelines de données alimentant l\'analytique marchande sur la plateforme NordiqTech.',
      mode:'remote', prov:'ON', city:'Toronto', min:120000, max:165000, featured:false, type:'full-time',
      skills:'["Spark","dbt","BigQuery","Python"]', slug:'data-engineer-nordiqtech' },
    { co:'00000000-0000-0000-0000-000000000012', by:'00000000-0000-0000-0000-000000000011',
      en:'iOS Engineer — Commerce', fr:'Ingénieur iOS — Commerce',
      desc_en:'Build world-class iOS experiences for NordiqTech\'s mobile commerce platform.',
      desc_fr:'Construisez des expériences iOS de classe mondiale pour la plateforme mobile NordiqTech.',
      mode:'hybrid', prov:'BC', city:'Vancouver', min:125000, max:170000, featured:false, type:'full-time',
      skills:'["Swift","SwiftUI","iOS","Xcode"]', slug:'ios-engineer-nordiqtech' },
    { co:'00000000-0000-0000-0000-000000000012', by:'00000000-0000-0000-0000-000000000011',
      en:'Senior Product Designer', fr:'Designer produit senior',
      desc_en:'Define the future of NordiqTech\'s product design — from merchant dashboards to checkout flows.',
      desc_fr:'Définissez l\'avenir du design produit chez NordiqTech — des tableaux de bord marchands au paiement.',
      mode:'hybrid', prov:'ON', city:'Ottawa', min:115000, max:155000, featured:false, type:'full-time',
      skills:'["Figma","Design Systems","User Research","Prototyping"]', slug:'senior-product-designer-nordiqtech' },
    { co:'00000000-0000-0000-0000-000000000012', by:'00000000-0000-0000-0000-000000000011',
      en:'Security Engineer', fr:'Ingénieur sécurité',
      desc_en:'Protect NordiqTech\'s platform and customer data. Own application security and incident response.',
      desc_fr:'Protégez la plateforme et les données clients NordiqTech. Sécurité applicative et réponse aux incidents.',
      mode:'remote', prov:'ON', city:'Toronto', min:135000, max:185000, featured:false, type:'full-time',
      skills:'["Security","Pen Testing","SIEM","Incident Response"]', slug:'security-engineer-nordiqtech' },
    // NovaCoop Finance
    { co:'00000000-0000-0000-0000-000000000022', by:'00000000-0000-0000-0000-000000000021',
      en:'Analyste développeur — FinTech', fr:'Analyste développeur — FinTech',
      desc_en:'Develop financial products for NovaCoop members. Java / Spring Boot microservices environment.',
      desc_fr:'Développez des produits financiers pour les membres NovaCoop. Environnement Java / Spring Boot.',
      mode:'hybrid', prov:'QC', city:'Lévis', min:85000, max:120000, featured:true, type:'full-time',
      skills:'["Java","Spring Boot","Microservices","SQL"]', slug:'analyste-dev-novacoop' },
    { co:'00000000-0000-0000-0000-000000000022', by:'00000000-0000-0000-0000-000000000021',
      en:'Architecte de solutions — Cloud', fr:'Architecte de solutions — Cloud',
      desc_en:'Lead cloud migration initiatives across NovaCoop\'s digital banking platforms. Azure + GCP.',
      desc_fr:'Pilotez les migrations cloud sur les plateformes bancaires numériques de NovaCoop.',
      mode:'hybrid', prov:'QC', city:'Montréal', min:115000, max:155000, featured:false, type:'full-time',
      skills:'["Azure","GCP","Solution Architecture","Enterprise IT"]', slug:'architecte-cloud-novacoop' },
    { co:'00000000-0000-0000-0000-000000000022', by:'00000000-0000-0000-0000-000000000021',
      en:'Conseiller en cybersécurité', fr:'Conseiller en cybersécurité',
      desc_en:'Ensure the cybersecurity posture of NovaCoop\'s cooperative financial platforms. Bilingual (FR/EN).',
      desc_fr:'Assurez la posture de cybersécurité des plateformes financières coopératives de NovaCoop.',
      mode:'onsite', prov:'QC', city:'Lévis', min:95000, max:130000, featured:false, type:'full-time',
      skills:'["Cybersecurity","SIEM","Risk Management","French"]', slug:'conseiller-cybersecurite-novacoop' },
    { co:'00000000-0000-0000-0000-000000000022', by:'00000000-0000-0000-0000-000000000021',
      en:'Analyste en intelligence artificielle', fr:'Analyste en intelligence artificielle',
      desc_en:'Apply AI and ML to credit scoring, fraud detection, and personalized member experiences at NovaCoop.',
      desc_fr:'Appliquez l\'IA et le ML au scoring de crédit et à la détection de fraude chez NovaCoop.',
      mode:'hybrid', prov:'QC', city:'Montréal', min:90000, max:125000, featured:false, type:'full-time',
      skills:'["Python","ML","Data Science","French"]', slug:'analyste-ia-novacoop' },
    { co:'00000000-0000-0000-0000-000000000022', by:'00000000-0000-0000-0000-000000000021',
      en:'Customer Success Manager — Enterprise', fr:'Gestionnaire succès client — Entreprise',
      desc_en:'Support NovaCoop\'s enterprise clients across Québec. Bilingual, relationship-driven role.',
      desc_fr:'Accompagnez les clients entreprise de NovaCoop au Québec. Rôle bilingue et axé sur les relations.',
      mode:'hybrid', prov:'QC', city:'Québec', min:72000, max:98000, featured:false, type:'full-time',
      skills:'["Account Management","CRM","Bilingual","Finance"]', slug:'customer-success-novacoop' },
  ];

  for (const j of JOBS) {
    const id = crypto.randomUUID();
    await pool.query(`
      INSERT INTO nh_jobs (id, company_id, posted_by, title_en, title_fr, slug, description_en, description_fr,
        work_mode, province, city, country, salary_min, salary_max, salary_currency, salary_period,
        job_type, status, featured, skills_required, published_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Canada',$12,$13,'CAD','year',$14,'active',$15,$16::jsonb,NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title_en=EXCLUDED.title_en, title_fr=EXCLUDED.title_fr,
        description_en=EXCLUDED.description_en, description_fr=EXCLUDED.description_fr,
        featured=EXCLUDED.featured, status='active', published_at=COALESCE(nh_jobs.published_at,NOW())
    `, [id, j.co, j.by, j.en, j.fr, j.slug, j.desc_en, j.desc_fr,
        j.mode, j.prov, j.city, j.min, j.max, j.type, j.featured, j.skills]);
  }
  console.log('[Nexhire] ✅ Demo data seeded (3 companies, 15 jobs)');
}

// ── Mockup pages — allow iframe embedding (canvas previews, dev only) ──
app.get(BASE_PATH + '/mockup-:name.html', (req, res) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.sendFile(path.join(__dirname, 'public', `mockup-${req.params.name}.html`));
});

// ── Security (helmet — CSP disabled, set at top of file) ──────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use(cors({ origin: true, credentials: true }));

// Stripe webhook must receive raw body — register BEFORE express.json()
app.post(BASE_PATH + '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  require('./routes/payments').webhook
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Sessions (PostgreSQL-backed — survives server restarts) ──
const isProd = process.env.NODE_ENV === 'production';
app.use(session({
  store: new pgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'nh_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.NEXHIRE_SESSION_SECRET || process.env.SESSION_SECRET || 'nexhire-dev-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,       // true in production (HTTPS proxy), false in dev
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? 'none' : 'lax', // 'none' required for cross-site Replit proxy
  }
}));

// ── API Routes ─────────────────────────────────────────────
const apiBase = BASE_PATH + '/api';
app.use(apiBase + '/auth',             require('./routes/auth'));
app.use(apiBase + '/jobs/external',    require('./routes/jobsExternal'));
app.use(apiBase + '/jobs',             require('./routes/jobs'));
app.use(apiBase + '/companies',        require('./routes/companies'));
app.use(apiBase + '/applications',     require('./routes/applications'));
app.use(apiBase,                       require('./routes/endorsements'));
app.use(apiBase,                       require('./routes/notes'));
app.use(apiBase + '/candidates',       require('./routes/candidates'));
app.use(apiBase + '/ai',               require('./routes/ai'));
app.use(apiBase + '/payments',         require('./routes/payments'));
app.use(apiBase + '/notifications',    require('./routes/notifications'));
app.use(apiBase + '/messages',         require('./routes/messages'));
app.use(apiBase + '/analytics',        require('./routes/analytics'));
app.use(apiBase + '/admin',            require('./routes/admin'));
app.use(apiBase + '/saved-jobs',       require('./routes/saved-jobs'));
app.use(apiBase + '/reviews',          require('./routes/reviews'));
app.use(apiBase + '/team',             require('./routes/team'));
app.use(apiBase + '/credits',          require('./routes/credits'));
app.use(apiBase + '/referrals',        require('./routes/referrals'));
app.use(apiBase + '/skills',           require('./routes/skills'));
app.use(apiBase + '/profile-score',    require('./routes/profile-score'));
app.use(apiBase + '/salary',           require('./routes/salary'));
app.use(apiBase + '/highlights',       require('./routes/highlights'));
console.log('[DEBUG] apiBase:', apiBase);
app.use(apiBase + '/jobbank',          require('./routes/jobbank'));
app.use(apiBase + '/profile-skills',   require('./routes/profile-skills'));
app.use(apiBase + '/recommendations',  require('./routes/recommendations'));
app.use(apiBase + '/video-interviews', require('./routes/video-interviews'));
app.use(apiBase + '/moderation',       require('./routes/moderation'));
app.use(apiBase + '/interview-slots',  require('./routes/interview-slots'));
app.use(apiBase + '/feed',             require('./routes/feed'));
app.use(apiBase + '/newsletter',       require('./routes/newsletter'));
app.use(apiBase + '/cron',             require('./routes/cron'));

// ── Static files ───────────────────────────────────────────
app.use(BASE_PATH + '/uploads/interviews', express.static(path.join(__dirname, 'uploads', 'interviews')));
app.use(BASE_PATH + '/uploads',            express.static(uploadDir));
app.use(BASE_PATH + '/', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  express.static(path.join(__dirname, 'public'))(req, res, next);
});

// Serve uploaded interview videos
app.use(BASE_PATH + '/uploads/interviews', express.static(path.join(__dirname, 'uploads', 'interviews')));
// Candidate public recording page
app.get(BASE_PATH + '/interview/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'interview.html')));
// Public recommendation form
app.get(BASE_PATH + '/recommend/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'recommend.html')));

// ── Shareable external job page ─────────────────────────────
app.get(BASE_PATH + '/offre/:external_id', async (req, res) => {
  const { pool } = require('./models/db');
  const BASE_URL = process.env.BASE_URL || 'https://nexhire.ca';
  const { external_id } = req.params;

  function esc(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pageShell(status, title, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} | Nexhire</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--dark:#023448;--indigo:#6366f1;--surface:#fff;--bg:#f8fafc;--border:#e2e8f0;--text:#0f172a;--muted:#64748b}
    body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    .top-bar{background:var(--dark);color:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
    .logo{font-weight:800;font-size:18px;letter-spacing:-.5px;color:#fff;text-decoration:none}
    .logo span{color:#6ee7f7}
    .nav-links{display:flex;align-items:center;gap:12px}
    .nav-link{color:rgba(255,255,255,.8);font-size:14px;font-weight:500;text-decoration:none}
    .nav-link:hover{color:#fff}
    .btn-nav{background:var(--indigo);color:#fff;font-size:13px;font-weight:600;padding:7px 14px;border-radius:8px;text-decoration:none}
    .btn-nav:hover{background:#4f46e5}
    .container{max-width:780px;margin:0 auto;padding:32px 20px 80px}
    .breadcrumb{font-size:13px;color:var(--muted);margin-bottom:24px}
    .breadcrumb a{color:var(--indigo);text-decoration:none}
    .breadcrumb a:hover{text-decoration:underline}
    .job-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:32px;margin-bottom:20px}
    .source-badge{display:inline-flex;align-items:center;gap:5px;background:#f1f5f9;color:var(--muted);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;padding:4px 10px;border-radius:99px;margin-bottom:16px}
    h1{font-size:26px;font-weight:800;line-height:1.25;margin-bottom:10px}
    .job-meta{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:0}
    .meta-item{display:flex;align-items:center;gap:5px;font-size:14px;color:var(--muted)}
    .salary-badge{background:#dcfce7;color:#15803d;font-size:13px;font-weight:600;padding:4px 10px;border-radius:8px}
    .description{font-size:15px;line-height:1.7;color:#334155;border-top:1px solid var(--border);padding-top:20px;margin-top:20px;white-space:pre-wrap;word-break:break-word}
    .cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
    .btn-apply{display:inline-flex;align-items:center;gap:8px;background:var(--indigo);color:#fff;font-size:15px;font-weight:700;padding:13px 28px;border-radius:12px;text-decoration:none;transition:background .15s}
    .btn-apply:hover{background:#4f46e5}
    .btn-back{display:inline-flex;align-items:center;gap:6px;background:transparent;color:var(--muted);font-size:14px;font-weight:500;padding:13px 20px;border-radius:12px;text-decoration:none;border:1px solid var(--border);transition:all .15s}
    .btn-back:hover{background:var(--bg);color:var(--text)}
    .cta-register{background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:#fff;border-radius:18px;padding:24px 28px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
    .cta-register p{font-size:15px;line-height:1.5;opacity:.95}
    .btn-register{background:#fff;color:var(--indigo);font-size:13px;font-weight:700;padding:10px 20px;border-radius:10px;text-decoration:none;white-space:nowrap;flex-shrink:0}
    .btn-register:hover{background:#f1f5f9}
    .attribution{font-size:12px;color:var(--muted);text-align:center;padding-top:8px}
    @media(max-width:600px){h1{font-size:21px}.job-card{padding:20px}.cta-register{flex-direction:column;text-align:center}}
  </style>
</head>
<body>
<nav class="top-bar">
  <a href="${BASE_PATH}/" class="logo">Nex<span>hire</span></a>
  <div class="nav-links">
    <a href="${BASE_PATH}/#login" class="nav-link">Connexion</a>
    <a href="${BASE_PATH}/#register" class="btn-nav">Créer un compte</a>
  </div>
</nav>
<div class="container">
${bodyHtml}
</div>
</body>
</html>`;
  }

  try {
    const { rows } = await pool.query(
      `SELECT external_id, source, title, company, description,
              city, province, salary_min, salary_max, salary_currency, salary_period,
              redirect_url, category, region
       FROM nh_jobs_external WHERE external_id = $1`,
      [external_id]
    );

    if (!rows.length) {
      const body404 = `
  <p class="breadcrumb"><a href="${BASE_PATH}/#jobs">← Retour aux offres</a></p>
  <div class="job-card" style="text-align:center;padding:48px 32px">
    <div style="font-size:48px;margin-bottom:16px">🔍</div>
    <h1 style="font-size:22px;margin-bottom:8px">Offre introuvable</h1>
    <p style="color:var(--muted);margin-bottom:24px">Cette offre a peut-être expiré ou été retirée.</p>
    <a href="${BASE_PATH}/#jobs" class="btn-apply">Voir les offres disponibles</a>
  </div>`;
      return res.status(404).send(pageShell(404, 'Offre introuvable', body404));
    }

    const job = rows[0];
    const title   = job.title   || 'Offre d\'emploi';
    const company = job.company || '';
    const location = [job.city, job.province].filter(Boolean).join(', ');
    const sourceLabel = job.source === 'adzuna' ? 'Adzuna' : job.source === 'jooble' ? 'Jooble' : esc(job.source);

    let salary = '';
    if (job.salary_min && job.salary_max) {
      const cur = job.salary_currency || 'CAD';
      const per = job.salary_period   || 'an';
      salary = `${Math.round(job.salary_min).toLocaleString('fr-CA')} – ${Math.round(job.salary_max).toLocaleString('fr-CA')} ${cur}/${per}`;
    } else if (job.salary_min) {
      salary = `À partir de ${Math.round(job.salary_min).toLocaleString('fr-CA')} ${job.salary_currency || 'CAD'}/${job.salary_period || 'an'}`;
    }

    const rawDesc   = job.description || '';
    const plainDesc = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const excerpt   = plainDesc.length > 150 ? plainDesc.slice(0, 147).replace(/\s+\S*$/, '') + '…' : plainDesc;
    const ogDesc    = [company, location, excerpt].filter(Boolean).join(' · ');
    const canonicalUrl = `${BASE_URL}${BASE_PATH}/offre/${encodeURIComponent(external_id)}`;

    const safeRedirect = /^https?:\/\//.test(job.redirect_url) ? job.redirect_url : '#';

    const bodyHtml = `
  <p class="breadcrumb"><a href="${BASE_PATH}/#jobs">← Toutes les offres</a></p>
  <div class="job-card">
    <span class="source-badge"><i class="ti ti-world"></i> Via ${esc(sourceLabel)}</span>
    <h1>${esc(title)}</h1>
    <div class="job-meta">
      ${company  ? `<span class="meta-item"><i class="ti ti-building"></i> ${esc(company)}</span>`  : ''}
      ${location ? `<span class="meta-item"><i class="ti ti-map-pin"></i> ${esc(location)}</span>` : ''}
      ${salary   ? `<span class="salary-badge">${esc(salary)}</span>` : ''}
    </div>
    ${plainDesc ? `<div class="description">${esc(plainDesc)}</div>` : ''}
    <div class="cta-row">
      <a href="${esc(safeRedirect)}" target="_blank" rel="noopener noreferrer" class="btn-apply">
        <i class="ti ti-external-link"></i> Postuler${company ? ` chez ${esc(company)}` : ''}
      </a>
      <a href="${BASE_PATH}/#jobs" class="btn-back">
        <i class="ti ti-arrow-left"></i> Autres offres
      </a>
    </div>
  </div>
  <div class="cta-register">
    <p>Crée ton profil gratuit pour suivre tes candidatures et découvrir des offres similaires</p>
    <a href="${BASE_PATH}/#register" class="btn-register">Créer mon profil →</a>
  </div>
  <p class="attribution">Offre fournie via ${esc(sourceLabel)} · Nexhire n'est pas l'employeur de cette offre</p>`;

    const html = pageShell(200, `${title} — ${company}`, bodyHtml)
      .replace('<title>', `<meta name="description" content="${esc(ogDesc)}">
  <link rel="canonical" href="${esc(canonicalUrl)}">
  <meta property="og:type"        content="article">
  <meta property="og:title"       content="${esc(title)} — ${esc(company)}">
  <meta property="og:description" content="${esc(ogDesc)}">
  <meta property="og:url"         content="${esc(canonicalUrl)}">
  <meta property="og:image"       content="${BASE_URL}/img/og-image.png">
  <meta property="og:site_name"   content="Nexhire">
  <meta name="twitter:card"       content="summary_large_image">
  <meta name="twitter:title"      content="${esc(title)} — ${esc(company)}">
  <meta name="twitter:description" content="${esc(ogDesc)}">
  <meta name="twitter:image"      content="${BASE_URL}/img/og-image.png">
  <title>`);

    res.send(html);
  } catch (e) {
    console.error('[offre/:external_id] error:', e.message);
    res.status(500).send('Erreur serveur.');
  }
});

// ── Health check ───────────────────────────────────────────
app.get(BASE_PATH + '/healthz', (req, res) => res.json({ status: 'ok', service: 'nexhire' }));

// ── SPA fallback ─────────────────────────────────────────
app.get(BASE_PATH + '/*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//app.get('/', (req, res) => res.redirect(BASE_PATH + '/'));

// ── Job Alerts — toutes les 6h ─────────────────────────────
async function runJobAlerts() {
  try {
    const { pool } = require('./models/db');
    const emailService = require('./services/email');

    const alerts = await pool.query(`
      SELECT a.*, u.email, u.first_name, u.preferred_lang
      FROM nh_job_alerts a
      JOIN nh_users u ON u.id = a.user_id
    `);

    for (const alert of alerts.rows) {
      const where = [];
      const params = [];
      let i = 1;

      if (alert.keywords) {
        where.push(`(j.title_en ILIKE $${i} OR j.title_fr ILIKE $${i} OR j.skills_required::text ILIKE $${i})`);
        params.push(`%${alert.keywords}%`); i++;
      }
      if (alert.province) {
        where.push(`j.province = $${i}`);
        params.push(alert.province); i++;
      }
      if (alert.work_mode) {
        where.push(`j.work_mode = $${i}`);
        params.push(alert.work_mode); i++;
      }

      where.push(`j.published_at > NOW() - INTERVAL '24 hours'`);
      where.push(`j.status = 'active'`);

      const sql = `
        SELECT j.*, c.name AS company_name
        FROM nh_jobs j
        JOIN nh_companies c ON c.id = j.company_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        LIMIT 10
      `;

      const jobs = await pool.query(sql, params);
      if (!jobs.rows.length) continue;

      await emailService.sendJobAlertEmail(
        alert.email,
        alert.first_name,
        jobs.rows,
        alert.preferred_lang || 'fr'
      );
      console.log(`[JobAlerts] Sent to ${alert.email} — ${jobs.rows.length} jobs`);
    }
  } catch (e) {
    console.error('[JobAlerts] Error:', e.message);
  }
}

// ── Start ──────────────────────────────────────────────────
runMigrations().then(() => require('./routes/salary').seedBenchmarks()).then(() => Promise.resolve()).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Nexhire] Server on port ${PORT} | base: ${BASE_PATH}`);
    // Run job alerts every 6 hours
    setInterval(runJobAlerts, 6 * 60 * 60 * 1000);
    // Run once after 1 min on startup
    setTimeout(runJobAlerts, 60 * 1000);
  });
}).catch(err => {
  console.error('[Nexhire] Fatal startup error:', err);
  process.exit(1);
});
