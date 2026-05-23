require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../models/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const id = () => uuidv4().replace(/-/g, '');
const slug = (s, suffix) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + (suffix ? '-' + suffix : '');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding Nexhire demo data...');

    // Clean existing demo data
    await client.query(`DELETE FROM nh_applications WHERE 1=1`);
    await client.query(`DELETE FROM nh_jobs WHERE 1=1`);
    await client.query(`DELETE FROM nh_companies WHERE 1=1`);
    await client.query(`DELETE FROM nh_candidate_profiles WHERE 1=1`);
    await client.query(`DELETE FROM nh_users WHERE 1=1`);
    console.log('🧹 Cleared existing data');

    // ── Employer accounts ──────────────────────────────────────────
    const employers = [
      { fn: 'Marie', ln: 'Tremblay', email: 'marie@shopify-demo.ca', company: 'Shopify', industry: 'E-commerce / SaaS', size: '10000+', city: 'Ottawa', website: 'https://shopify.com' },
      { fn: 'Jean', ln: 'Gagnon', email: 'jean@ubisoft-demo.ca', company: 'Ubisoft Montréal', industry: 'Gaming / Entertainment', size: '1001-5000', city: 'Montréal', website: 'https://ubisoft.com' },
      { fn: 'Sophie', ln: 'Lavoie', email: 'sophie@bnc-demo.ca', company: 'Banque Nationale', industry: 'Finance / Banking', size: '10000+', city: 'Montréal', website: 'https://bnc.ca' },
      { fn: 'Alex', ln: 'Martin', email: 'alex@lightspeed-demo.ca', company: 'Lightspeed Commerce', industry: 'FinTech / SaaS', size: '1001-5000', city: 'Montréal', website: 'https://lightspeedhq.com' },
      { fn: 'Isabelle', ln: 'Roy', email: 'isabelle@coveo-demo.ca', company: 'Coveo', industry: 'AI / Search Technology', size: '501-1000', city: 'Québec City', website: 'https://coveo.com' },
      { fn: 'Marc', ln: 'Côté', email: 'marc@cae-demo.ca', company: 'CAE Inc.', industry: 'Aerospace / Simulation', size: '5001-10000', city: 'Montréal', website: 'https://cae.com' },
    ];

    const companyIds = {};
    const employerUserIds = {};

    for (const e of employers) {
      const userId = id();
      const companyId = id();
      const hash = await bcrypt.hash('Demo1234!', 10);
      const companySlug = slug(e.company, companyId.slice(0, 6));

      await client.query(`
        INSERT INTO nh_users (id, email, password_hash, role, first_name, last_name, email_verified, preferred_lang)
        VALUES ($1,$2,$3,'employer',$4,$5,TRUE,'fr')
      `, [userId, e.email, hash, e.fn, e.ln]);

      await client.query(`
        INSERT INTO nh_companies (id, owner_id, name, slug, description_en, description_fr, website, industry, size, city, country, verified, plan)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Canada',TRUE,'pro')
      `, [companyId, userId, e.company, companySlug,
          `${e.company} is a leading company in ${e.industry}.`,
          `${e.company} est un chef de file dans ${e.industry}.`,
          e.website, e.industry, e.size, e.city]);

      await client.query(`UPDATE nh_users SET company_id = $1 WHERE id = $2`, [companyId, userId]);

      companyIds[e.company] = companyId;
      employerUserIds[e.company] = userId;
    }
    console.log(`✅ Created ${employers.length} employer accounts + companies`);

    // ── Jobs ──────────────────────────────────────────────────────
    const jobs = [
      // Shopify
      {
        company: 'Shopify', title_fr: 'Développeur·se Full Stack Senior', title_en: 'Senior Full Stack Developer',
        desc_fr: 'Rejoignez notre équipe de développement pour construire l\'avenir du commerce mondial. Vous travaillerez sur des systèmes à grande échelle qui alimentent des millions de marchands.', desc_en: 'Join our engineering team to build the future of global commerce. You\'ll work on large-scale systems powering millions of merchants.',
        reqs_fr: '5+ ans d\'expérience, Ruby on Rails ou React, systèmes distribués', reqs_en: '5+ years experience, Ruby on Rails or React, distributed systems',
        benefits_fr: 'Télétravail complet, options d\'achat d\'actions, budget formation 2000$/an', benefits_en: 'Full remote, stock options, $2000/year learning budget',
        type: 'full-time', mode: 'remote', city: 'Ottawa', salary_min: 130000, salary_max: 180000, currency: 'CAD',
        skills: ['Ruby on Rails', 'React', 'TypeScript', 'PostgreSQL', 'Redis'], lang: ['fr', 'en'], exp: '5+', featured: true
      },
      {
        company: 'Shopify', title_fr: 'Designer UX/UI — Commerce', title_en: 'UX/UI Designer — Commerce',
        desc_fr: 'Vous concevrez des expériences marchands et clients pour notre plateforme e-commerce utilisée par 2 millions de boutiques dans le monde.',
        desc_en: 'You will design merchant and customer experiences for our e-commerce platform used by 2 million stores worldwide.',
        reqs_fr: '3+ ans en design produit, Figma, recherche utilisateur', reqs_en: '3+ years in product design, Figma, user research',
        benefits_fr: 'Remote complet, équipe internationale, Figma Pro payé', benefits_en: 'Full remote, international team, Figma Pro provided',
        type: 'full-time', mode: 'remote', city: 'Ottawa', salary_min: 95000, salary_max: 130000, currency: 'CAD',
        skills: ['Figma', 'UX Research', 'Prototyping', 'Design System'], lang: ['en'], exp: '3-5', featured: false
      },
      // Ubisoft
      {
        company: 'Ubisoft Montréal', title_fr: 'Programmeur·se Gameplay', title_en: 'Gameplay Programmer',
        desc_fr: 'Vous programmerez les mécaniques de jeu sur nos prochains AAA. Travaillez avec des équipes pluridisciplinaires pour créer des expériences de jeu inoubliables.',
        desc_en: 'You will program gameplay mechanics on our next AAA titles. Work with multidisciplinary teams to create unforgettable gaming experiences.',
        reqs_fr: '3+ ans en développement jeu, C++, moteurs de jeu', reqs_en: '3+ years in game dev, C++, game engines',
        benefits_fr: 'Bureaux à Montréal, jeux gratuits, télétravail partiel', benefits_en: 'Montréal offices, free games, partial remote',
        type: 'full-time', mode: 'hybrid', city: 'Montréal', salary_min: 80000, salary_max: 120000, currency: 'CAD',
        skills: ['C++', 'Unreal Engine', 'Game Physics', 'AI Behaviour'], lang: ['fr', 'en'], exp: '3-5', featured: true
      },
      {
        company: 'Ubisoft Montréal', title_fr: 'Artiste 3D — Environnements', title_en: '3D Artist — Environments',
        desc_fr: 'Créez des environnements 3D photoréalistes pour nos jeux AAA. Vous collaborerez avec l\'équipe artistique pour définir le style visuel.',
        desc_en: 'Create photorealistic 3D environments for our AAA games. You\'ll collaborate with the art team to define the visual style.',
        reqs_fr: '2+ ans en art 3D, Maya, Substance Painter', reqs_en: '2+ years in 3D art, Maya, Substance Painter',
        benefits_fr: 'Studios créatifs, inspiration internationale, avantages sociaux complets', benefits_en: 'Creative studios, international inspiration, full benefits',
        type: 'full-time', mode: 'on-site', city: 'Montréal', salary_min: 65000, salary_max: 90000, currency: 'CAD',
        skills: ['Maya', 'Substance Painter', 'ZBrush', 'PBR Texturing'], lang: ['fr', 'en'], exp: '2-3', featured: false
      },
      // Banque Nationale
      {
        company: 'Banque Nationale', title_fr: 'Analyste Données — IA Financière', title_en: 'Data Analyst — Financial AI',
        desc_fr: 'Vous développerez des modèles prédictifs pour détecter la fraude, personnaliser l\'expérience client et optimiser notre portefeuille de prêts.',
        desc_en: 'You will develop predictive models for fraud detection, customer experience personalization and loan portfolio optimization.',
        reqs_fr: 'Python, SQL, Machine Learning, 2+ ans en finance ou tech', reqs_en: 'Python, SQL, Machine Learning, 2+ years in finance or tech',
        benefits_fr: 'Régime de retraite, assurances collectives, boni annuel', benefits_en: 'Pension plan, group insurance, annual bonus',
        type: 'full-time', mode: 'hybrid', city: 'Montréal', salary_min: 85000, salary_max: 115000, currency: 'CAD',
        skills: ['Python', 'SQL', 'Machine Learning', 'TensorFlow', 'PowerBI'], lang: ['fr'], exp: '2-3', featured: false
      },
      {
        company: 'Banque Nationale', title_fr: 'Développeur·se Cloud — AWS', title_en: 'Cloud Developer — AWS',
        desc_fr: 'Participez à la migration cloud de nos systèmes bancaires critiques. Vous concevrez des architectures serverless scalables et sécurisées.',
        desc_en: 'Participate in the cloud migration of our critical banking systems. Design scalable and secure serverless architectures.',
        reqs_fr: 'AWS certifié, Terraform, Kubernetes, 4+ ans', reqs_en: 'AWS certified, Terraform, Kubernetes, 4+ years',
        benefits_fr: 'Formation AWS payée, horaires flexibles, programme wellness', benefits_en: 'Paid AWS training, flexible hours, wellness program',
        type: 'full-time', mode: 'hybrid', city: 'Montréal', salary_min: 100000, salary_max: 140000, currency: 'CAD',
        skills: ['AWS', 'Terraform', 'Kubernetes', 'Docker', 'Python'], lang: ['fr', 'en'], exp: '3-5', featured: false
      },
      // Lightspeed
      {
        company: 'Lightspeed Commerce', title_fr: 'Ingénieur·e Backend — Paiements', title_en: 'Backend Engineer — Payments',
        desc_fr: 'Construisez l\'infrastructure de paiement qui traite des milliards de transactions par an pour les restaurateurs et commerçants du monde entier.',
        desc_en: 'Build the payment infrastructure processing billions of transactions per year for restaurateurs and merchants worldwide.',
        reqs_fr: 'Go ou Kotlin, microservices, PCI-DSS, 3+ ans', reqs_en: 'Go or Kotlin, microservices, PCI-DSS, 3+ years',
        benefits_fr: 'Stock options, remote flexible, équipe globale 3000 personnes', benefits_en: 'Stock options, flexible remote, 3000-person global team',
        type: 'full-time', mode: 'hybrid', city: 'Montréal', salary_min: 110000, salary_max: 155000, currency: 'CAD',
        skills: ['Go', 'Kotlin', 'Microservices', 'Kafka', 'PostgreSQL'], lang: ['en'], exp: '3-5', featured: true
      },
      {
        company: 'Lightspeed Commerce', title_fr: 'Chef·fe de Produit — POS', title_en: 'Product Manager — POS',
        desc_fr: 'Définissez la roadmap de notre solution point de vente utilisée par 165 000 établissements. Vous travaillerez avec ingénierie, design et ventes.',
        desc_en: 'Define the roadmap of our point-of-sale solution used by 165,000 locations. Work with engineering, design and sales.',
        reqs_fr: '3+ ans en gestion de produit SaaS, expérience retail ou restauration', reqs_en: '3+ years in SaaS product management, retail or restaurant experience',
        benefits_fr: 'Options d\'achat, budget conférences, semaines flexibles', benefits_en: 'Stock options, conference budget, flexible weeks',
        type: 'full-time', mode: 'hybrid', city: 'Montréal', salary_min: 95000, salary_max: 130000, currency: 'CAD',
        skills: ['Product Strategy', 'Roadmapping', 'Agile', 'Analytics', 'SQL'], lang: ['fr', 'en'], exp: '3-5', featured: false
      },
      // Coveo
      {
        company: 'Coveo', title_fr: 'Ingénieur·e IA / ML — Recherche', title_en: 'AI/ML Engineer — Search',
        desc_fr: 'Développez les algorithmes de recherche intelligente et de recommandation qui propulsent nos clients Fortune 500 à travers les Etats-Unis et le Canada.',
        desc_en: 'Develop intelligent search and recommendation algorithms powering our Fortune 500 clients across the US and Canada.',
        reqs_fr: 'Doctorat ou 4+ ans ML, NLP, ranking, Python, Scala', reqs_en: 'PhD or 4+ years ML, NLP, ranking, Python, Scala',
        benefits_fr: 'Remote first, conférences académiques, publications encouragées', benefits_en: 'Remote first, academic conferences, publications encouraged',
        type: 'full-time', mode: 'remote', city: 'Québec City', salary_min: 120000, salary_max: 170000, currency: 'CAD',
        skills: ['Python', 'Scala', 'NLP', 'LLM', 'Elasticsearch', 'PyTorch'], lang: ['en'], exp: '5+', featured: true
      },
      {
        company: 'Coveo', title_fr: 'Responsable Marketing — Demande', title_en: 'Demand Generation Manager',
        desc_fr: 'Pilotez nos campagnes d\'acquisition B2B pour générer du pipeline qualifié en Amérique du Nord. Vous gérerez un budget de 500k$ et des campagnes multicanales.',
        desc_en: 'Drive our B2B acquisition campaigns to generate qualified pipeline in North America. Manage a $500k budget and multichannel campaigns.',
        reqs_fr: 'HubSpot, LinkedIn Ads, marketing B2B SaaS, 4+ ans', reqs_en: 'HubSpot, LinkedIn Ads, B2B SaaS marketing, 4+ years',
        benefits_fr: 'Budget pub géré, croissance rapide, bonus performance', benefits_en: 'Managed ad budget, fast growth, performance bonus',
        type: 'full-time', mode: 'hybrid', city: 'Québec City', salary_min: 80000, salary_max: 110000, currency: 'CAD',
        skills: ['HubSpot', 'LinkedIn Ads', 'Google Ads', 'Salesforce', 'ABM'], lang: ['en'], exp: '3-5', featured: false
      },
      // CAE
      {
        company: 'CAE Inc.', title_fr: 'Ingénieur·e Logiciel — Simulation', title_en: 'Software Engineer — Simulation',
        desc_fr: 'Développez des simulateurs de vol de pointe utilisés par les compagnies aériennes et l\'armée mondiale. Contribuez à la sécurité aérienne mondiale.',
        desc_en: 'Develop cutting-edge flight simulators used by airlines and militaries worldwide. Contribute to global aviation safety.',
        reqs_fr: 'C++, temps réel, systèmes embarqués, 3+ ans', reqs_en: 'C++, real-time systems, embedded, 3+ years',
        benefits_fr: 'REER collectif, assurances, projets internationaux', benefits_en: 'Group RRSP, insurance, international projects',
        type: 'full-time', mode: 'on-site', city: 'Montréal', salary_min: 90000, salary_max: 125000, currency: 'CAD',
        skills: ['C++', 'Real-time Systems', 'OpenGL', 'Linux', 'DO-178C'], lang: ['fr', 'en'], exp: '3-5', featured: false
      },
      {
        company: 'CAE Inc.', title_fr: 'Analyste Ventes — Défense', title_en: 'Sales Analyst — Defence',
        desc_fr: 'Supportez l\'équipe de ventes défense en produisant des analyses de marché, propositions et présentations pour des contrats gouvernementaux.',
        desc_en: 'Support the defence sales team by producing market analysis, proposals and presentations for government contracts.',
        reqs_fr: 'Excel avancé, analyse financière, communication, bilinguisme', reqs_en: 'Advanced Excel, financial analysis, communication, bilingualism',
        benefits_fr: 'Secteur stratégique, stabilité, avantages fédéraux', benefits_en: 'Strategic sector, stability, federal benefits',
        type: 'full-time', mode: 'hybrid', city: 'Montréal', salary_min: 60000, salary_max: 80000, currency: 'CAD',
        skills: ['Excel', 'PowerPoint', 'Financial Analysis', 'CRM', 'Bilingualism'], lang: ['fr', 'en'], exp: '1-2', featured: false
      },
    ];

    for (const j of jobs) {
      const jobId = id();
      const jobSlug = slug(j.title_en || j.title_fr, jobId.slice(0, 6));
      const companyId = companyIds[j.company];
      const postedBy = employerUserIds[j.company];

      await client.query(`
        INSERT INTO nh_jobs (
          id, company_id, posted_by, title_fr, title_en, slug,
          description_fr, description_en, requirements_fr, requirements_en,
          benefits_fr, benefits_en,
          job_type, work_mode, city, country,
          salary_min, salary_max, salary_currency, salary_period,
          experience_years, languages_required, skills_required,
          featured, status, views, applications_count,
          published_at, expires_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,'Canada',$16,$17,$18,'year',
          $19,$20,$21,$22,'active',$23,$24,
          NOW() - (RANDOM() * INTERVAL '30 days'),
          NOW() + INTERVAL '60 days'
        )
      `, [
        jobId, companyId, postedBy, j.title_fr, j.title_en, jobSlug,
        j.desc_fr, j.desc_en, j.reqs_fr, j.reqs_en,
        j.benefits_fr, j.benefits_en,
        j.type, j.mode, j.city,
        j.salary_min, j.salary_max, j.currency,
        j.exp,
        JSON.stringify(j.lang),
        JSON.stringify(j.skills),
        j.featured,
        Math.floor(Math.random() * 800) + 50,
        Math.floor(Math.random() * 40) + 2
      ]);
    }
    console.log(`✅ Created ${jobs.length} job listings`);

    // ── Demo candidate account ─────────────────────────────────────
    const candidateUserId = id();
    const candidateProfileId = id();
    const candidateHash = await bcrypt.hash('Demo1234!', 10);
    await client.query(`
      INSERT INTO nh_users (id, email, password_hash, role, first_name, last_name, email_verified, preferred_lang)
      VALUES ($1,'demo.candidate@nexhire.ca',$2,'candidate','Léa','Beaumont',TRUE,'fr')
    `, [candidateUserId, candidateHash]);
    await client.query(`
      INSERT INTO nh_candidate_profiles (
        id, user_id, headline_fr, headline_en, bio_fr, bio_en,
        city, country, work_mode_pref, job_type_pref,
        languages, skills, experience_years, education_level,
        linkedin_url, availability, desired_salary_min, desired_salary_max
      ) VALUES (
        $1,$2,
        'Développeuse Full Stack | React · Node.js · TypeScript',
        'Full Stack Developer | React · Node.js · TypeScript',
        'Passionnée par le développement web et l''intelligence artificielle, je cherche un poste stimulant dans une entreprise tech québécoise.',
        'Passionate about web development and AI, looking for a stimulating role at a Quebec tech company.',
        'Montréal','Canada','remote','full-time',
        $3,$4,4,'bachelor',
        'https://linkedin.com/in/lea-beaumont','immediate',90000,130000
      )
    `, [candidateProfileId, candidateUserId,
        JSON.stringify(['fr', 'en']),
        JSON.stringify(['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'GraphQL'])]);
    console.log('✅ Created demo candidate: demo.candidate@nexhire.ca / Demo1234!');

    // ── Summary ────────────────────────────────────────────────────
    const jobCount = await client.query('SELECT COUNT(*) FROM nh_jobs');
    const companyCount = await client.query('SELECT COUNT(*) FROM nh_companies');
    const userCount = await client.query('SELECT COUNT(*) FROM nh_users');
    console.log(`\n📊 Database summary:`);
    console.log(`   Users    : ${userCount.rows[0].count}`);
    console.log(`   Companies: ${companyCount.rows[0].count}`);
    console.log(`   Jobs     : ${jobCount.rows[0].count}`);
    console.log('\n🔑 Demo accounts:');
    console.log('   Candidate : demo.candidate@nexhire.ca  / Demo1234!');
    console.log('   Employer  : marie@shopify-demo.ca       / Demo1234!');
    console.log('\n✅ Seed complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error(e); process.exit(1); });
