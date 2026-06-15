'use strict';

// ── Partie A — region ───────────────────────────────────────────

const PROVINCE_TO_REGION = {
  QC: 'Québec',
  ON: 'Ontario',
  BC: 'Colombie-Britannique',
  AB: 'Alberta',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  NS: 'Nouvelle-Écosse',
  NB: 'Nouveau-Brunswick',
  NL: 'Terre-Neuve-et-Labrador',
  PE: 'Île-du-Prince-Édouard',
  YT: 'Yukon',
  NT: 'Territoires du Nord-Ouest',
  NU: 'Nunavut',
};

const CITY_TO_REGION = [
  { cities: ['montréal', 'montreal', 'laval', 'gatineau', 'longueuil', 'sherbrooke', 'québec', 'quebec', 'lévis', 'levis', 'trois-rivières', 'saguenay'], region: 'Québec' },
  { cities: ['toronto', 'ottawa', 'mississauga', 'hamilton', 'london', 'brampton', 'kingston', 'markham', 'vaughan', 'kitchener', 'windsor', 'waterloo', 'barrie', 'sudbury'], region: 'Ontario' },
  { cities: ['vancouver', 'victoria', 'surrey', 'kelowna', 'burnaby', 'abbotsford', 'richmond', 'nanaimo'], region: 'Colombie-Britannique' },
  { cities: ['calgary', 'edmonton', 'red deer', 'lethbridge'], region: 'Alberta' },
  { cities: ['winnipeg', 'brandon'], region: 'Manitoba' },
  { cities: ['saskatoon', 'regina'], region: 'Saskatchewan' },
  { cities: ['halifax'], region: 'Nouvelle-Écosse' },
  { cities: ['moncton', 'fredericton', 'saint john'], region: 'Nouveau-Brunswick' },
  { cities: ["st. john's", 'corner brook'], region: 'Terre-Neuve-et-Labrador' },
];

function getRegion(province, city) {
  if (province) {
    const r = PROVINCE_TO_REGION[province.toUpperCase()];
    if (r) return r;
  }
  if (city) {
    const lower = city.toLowerCase();
    for (const { cities, region } of CITY_TO_REGION) {
      if (cities.some(c => lower.includes(c))) return region;
    }
  }
  return null;
}

// ── Partie B — category ─────────────────────────────────────────
// Ordre = priorité. getCategory s'arrête au premier match (1→15).
// Fallback : 'Autre'.

const CATEGORY_RULES = [
  {
    category: 'IA/Data',
    keywords: [
      'data scientist', 'data analyst', 'data engineer',
      'analyste de données', 'analyste données', 'ingénieur données',
      'scientifique des données', 'données',
      'machine learning', 'intelligence artificielle', 'apprentissage automatique',
      'nlp', 'llm', 'business intelligence', 'analytique', 'analytics', 'big data',
    ],
  },
  {
    category: 'Développement',
    keywords: [
      'developer', 'développeur', 'développeuse',
      'software engineer', 'génie logiciel',
      'fullstack', 'full-stack', 'full stack',
      'frontend', 'front-end', 'front end',
      'backend', 'back-end', 'back end',
      'devops', 'sre', 'platform engineer',
      'mobile developer', 'ios developer', 'android developer',
      'programmeur', 'programmeuse',
    ],
  },
  {
    category: 'Produit',
    keywords: [
      'product manager', 'product owner',
      'chef de produit', 'gestionnaire de produit', 'product lead',
    ],
  },
  {
    category: 'Restauration/Hôtellerie',
    keywords: [
      'cuisinier', 'cuisinière', 'cook',
      'chef de quart', 'sous-chef',
      'serveur', 'serveuse', 'waiter', 'waitress',
      'barista', 'busser', 'bartender', 'barman',
      'foh', 'boh',
      'restaurant',
      'hôtellerie', 'hospitality',
      'dishwasher', 'plongeur',
    ],
  },
  {
    category: 'Design',
    keywords: [
      'designer', 'ux designer', 'ui designer', 'ux/ui', 'ui/ux',
      'user experience', 'user interface',
      'graphiste', 'concepteur', 'conceptrice',
      'creative director', 'motion designer', 'illustrateur',
    ],
  },
  {
    category: 'Marketing',
    keywords: [
      'marketing', 'seo', 'sem',
      'rédacteur', 'rédactrice', 'copywriter',
      'social media', 'growth', 'brand manager',
      'campaign manager', 'communications', 'gestionnaire de contenu',
    ],
  },
  {
    category: 'Finance',
    keywords: [
      'accountant', 'comptable', 'controller', 'contrôleur financier',
      'financial analyst', 'analyste financier', 'cpa', 'bookkeeper',
      'audit', 'trésorerie', 'treasury', 'fiscalité', 'tax specialist',
    ],
  },
  {
    category: 'RH',
    keywords: [
      'human resources', 'ressources humaines',
      'recruteur', 'recruiter', 'talent acquisition',
      'payroll', 'paie', 'hrbp', 'formation', 'people operations',
    ],
  },
  {
    category: 'Ventes',
    keywords: [
      'sales', 'account executive', 'business development',
      'représentant', 'vendeur', 'vendeuse', 'account manager',
      'commercial', 'revenue',
    ],
  },
  {
    category: 'Santé',
    keywords: [
      'nurse', 'infirmier', 'infirmière',
      'médecin', 'physician', 'pharmacist', 'pharmacien',
      'therapist', 'thérapeute', 'clinical', 'clinique',
      'dentist', 'dentiste', 'healthcare',
    ],
  },
  {
    category: 'Éducation',
    keywords: [
      'teacher', 'enseignant', 'enseignante',
      'professeur', 'instructor', 'tutor', 'tuteur', 'éducateur',
      'education', 'académique', 'curriculum',
    ],
  },
  {
    category: 'Juridique',
    keywords: [
      'lawyer', 'avocat', 'avocate', 'juriste', 'paralegal',
      'legal counsel', 'compliance', 'conformité', 'contrat',
    ],
  },
  {
    category: 'Service client',
    keywords: [
      'customer service', 'customer support', 'service client',
      'help desk', 'agent de service', 'customer success',
    ],
  },
  {
    category: 'Construction',
    keywords: [
      'construction', 'carpenter', 'charpentier',
      'electrician', 'électricien',
      'plumber', 'plombier',
      'welder', 'soudeur', 'mason', 'maçon',
      'foreman', 'contremaître', 'trades',
    ],
  },
  {
    category: 'Ingénierie',
    keywords: [
      'engineer', 'ingénieur', 'ingénieure',
      'mechanical engineer', 'ingénieur mécanique',
      'electrical engineer', 'civil engineer',
      'structural engineer', 'chemical engineer',
      'industrial engineer', 'manufacturing engineer',
      'process engineer',
    ],
  },
  {
    category: 'Opérations',
    keywords: [
      'operations', 'logistique', 'logistics', 'supply chain',
      'procurement', 'warehouse', 'entrepôt',
      'coordinator', 'coordinateur',
      'administrator', 'administrateur', 'office manager',
      'general manager', 'operations manager',
      'production manager', 'maintenance manager', 'plant manager',
    ],
  },
  {
    category: 'Technicien',
    keywords: [
      'technician', 'technicien', 'technicienne',
    ],
  },
];

// Termes valides en titre mais trop ambigus en description (ex: « base de données »).
// Ajouter ici pour affiner sans toucher aux règles.
const TITLE_ONLY = new Set(['données']);

function getCategory(title, description) {
  // Passe 1 — titre uniquement
  const titleLower = (title || '').toLowerCase();
  for (const { category, keywords } of CATEGORY_RULES) {
    if (keywords.some(k => titleLower.includes(k))) return category;
  }
  // Passe 2 — description en secours, TITLE_ONLY exclus
  if (description) {
    const descLower = description.toLowerCase();
    for (const { category, keywords } of CATEGORY_RULES) {
      if (keywords.filter(k => !TITLE_ONLY.has(k)).some(k => descLower.includes(k))) return category;
    }
  }
  return 'Autre';
}

module.exports = { getCategory, getRegion };
