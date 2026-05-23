require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[Nexhire] Running migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS nh_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL CHECK(role IN ('candidate','employer','admin')),
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
        preferred_lang TEXT DEFAULT 'fr' CHECK(preferred_lang IN ('fr','en')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS nh_messages (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL REFERENCES nh_applications(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES nh_users(id),
        body TEXT NOT NULL,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS nh_payments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES nh_companies(id),
        stripe_payment_intent_id TEXT,
        stripe_invoice_id TEXT,
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'USD',
        plan TEXT,
        status TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_status ON nh_jobs(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_featured ON nh_jobs(featured, status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_published ON nh_jobs(published_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nh_jobs_company ON nh_jobs(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nh_apps_job ON nh_applications(job_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nh_apps_candidate ON nh_applications(candidate_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nh_notifs_user ON nh_notifications(user_id, read_at)`);

    console.log('[Nexhire] ✅ Migrations complete.');
  } catch (err) {
    console.error('[Nexhire] Migration error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
