export type Category =
  | "housing"
  | "food"
  | "mentalHealth"
  | "health"
  | "immigration"
  | "employment"
  | "family"
  | "social";

export interface Service {
  id: string;
  name: string;
  category: Category;
  subcategory: string;
  city: string;
  phone: string;
  website: string;
  description: string;
  isUrgent?: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  housing: "Logement",
  food: "Alimentation",
  mentalHealth: "Santé mentale",
  health: "Santé",
  immigration: "Immigration",
  employment: "Emploi",
  family: "Famille",
  social: "Soutien social",
};

export const SERVICES: Service[] = [
  // Housing
  {
    id: "h1",
    name: "Maison du Père",
    category: "housing",
    subcategory: "Hébergement d'urgence",
    city: "Montréal",
    phone: "514-845-0168",
    website: "https://maisondupere.org",
    description:
      "Centre d'hébergement pour hommes en situation d'itinérance. Accueil 24h/24, repas chauds et services d'accompagnement.",
    isUrgent: true,
  },
  {
    id: "h2",
    name: "Welcome Hall Mission",
    category: "housing",
    subcategory: "Hébergement d'urgence",
    city: "Montréal",
    phone: "514-935-6661",
    website: "https://welcomehallmission.com",
    description:
      "Refuge d'urgence pour hommes sans abri. Hébergement, repas et services de réintégration sociale.",
    isUrgent: true,
  },
  {
    id: "h3",
    name: "Old Brewery Mission",
    category: "housing",
    subcategory: "Hébergement d'urgence",
    city: "Montréal",
    phone: "514-866-3921",
    website: "https://missionoldbrewery.ca",
    description:
      "Hébergement et services pour personnes en situation d'itinérance à Montréal. Accueil d'urgence disponible.",
    isUrgent: true,
  },
  {
    id: "h4",
    name: "Réseau SOLIDARITÉ Itinérance du Québec",
    category: "housing",
    subcategory: "Ressources d'hébergement",
    city: "Province de Québec",
    phone: "514-933-9373",
    website: "https://rsiq.org",
    description:
      "Réseau provincial coordonnant les ressources d'hébergement pour personnes sans abri à travers le Québec.",
  },
  {
    id: "h5",
    name: "Office Municipal d'Habitation de Montréal",
    category: "housing",
    subcategory: "Logement subventionné",
    city: "Montréal",
    phone: "514-872-6442",
    website: "https://omhm.qc.ca",
    description:
      "Logements sociaux et à loyer modique pour personnes à faible revenu. Demandes de logement HLM.",
  },
  {
    id: "h6",
    name: "Chez Doris",
    category: "housing",
    subcategory: "Hébergement femmes",
    city: "Montréal",
    phone: "514-937-2341",
    website: "https://chezdoris.org",
    description:
      "Centre de jour et refuge pour femmes en situation de vulnérabilité. Services d'hébergement d'urgence pour femmes.",
    isUrgent: true,
  },
  {
    id: "h7",
    name: "L'Itinéraire",
    category: "housing",
    subcategory: "Réinsertion sociale",
    city: "Montréal",
    phone: "514-597-0238",
    website: "https://itineraire.ca",
    description:
      "Organisme d'aide aux personnes en situation d'itinérance, incluant programme de logement transitoire.",
  },

  // Food
  {
    id: "f1",
    name: "Moisson Montréal",
    category: "food",
    subcategory: "Banque alimentaire",
    city: "Montréal",
    phone: "514-344-4494",
    website: "https://moissonmontreal.org",
    description:
      "Plus grande banque alimentaire du Canada. Distribution de denrées à des centaines d'organismes communautaires.",
    isUrgent: true,
  },
  {
    id: "f2",
    name: "Tablée des Chefs",
    category: "food",
    subcategory: "Cuisine communautaire",
    city: "Province de Québec",
    phone: "514-600-6999",
    website: "https://tableedeschefs.org",
    description:
      "Récupération de surplus alimentaires et distribution aux personnes dans le besoin partout au Québec.",
  },
  {
    id: "f3",
    name: "La Corbeille",
    category: "food",
    subcategory: "Épicerie solidaire",
    city: "Québec",
    phone: "418-529-3700",
    website: "https://lacorbeille.ca",
    description:
      "Épicerie à prix réduit pour les personnes à faible revenu à Québec. Accès à des aliments frais et nutritifs.",
  },
  {
    id: "f4",
    name: "Partage Saint-François",
    category: "food",
    subcategory: "Dépannage alimentaire",
    city: "Sherbrooke",
    phone: "819-346-6933",
    website: "https://partagesaintfrancois.org",
    description:
      "Service de dépannage alimentaire d'urgence pour les familles et personnes seules à Sherbrooke.",
    isUrgent: true,
  },
  {
    id: "f5",
    name: "Cuisines Collectives du Québec",
    category: "food",
    subcategory: "Cuisine collective",
    city: "Province de Québec",
    phone: "514-529-3448",
    website: "https://cuisinescollectives.com",
    description:
      "Réseau de cuisines collectives pour cuisiner ensemble à faible coût et briser l'isolement.",
  },
  {
    id: "f6",
    name: "Resto Pop",
    category: "food",
    subcategory: "Café communautaire",
    city: "Montréal",
    phone: "514-527-1401",
    website: "https://restopop.org",
    description:
      "Cafétéria communautaire à prix modique dans le Plateau-Mont-Royal. Repas chauds accessibles tous les jours.",
  },

  // Mental Health
  {
    id: "m1",
    name: "Centre de Crise de Montréal",
    category: "mentalHealth",
    subcategory: "Crise psychologique",
    city: "Montréal",
    phone: "514-338-4090",
    website: "https://crisemontreal.ca",
    description:
      "Ligne de crise 24h/24, 7j/7. Intervention immédiate en cas de détresse psychologique ou pensées suicidaires.",
    isUrgent: true,
  },
  {
    id: "m2",
    name: "Tel-Aide Québec",
    category: "mentalHealth",
    subcategory: "Ligne d'écoute",
    city: "Province de Québec",
    phone: "514-935-1101",
    website: "https://telaide.org",
    description:
      "Service d'écoute téléphonique anonyme et confidentiel. Disponible tous les soirs de 18h à 23h.",
  },
  {
    id: "m3",
    name: "Suicide Action Montréal",
    category: "mentalHealth",
    subcategory: "Prévention suicide",
    city: "Montréal",
    phone: "1-866-APPELLE",
    website: "https://suicideactionmontreal.org",
    description:
      "Ligne de prévention du suicide 24h/24. Intervention pour personnes suicidaires et proches.",
    isUrgent: true,
  },
  {
    id: "m4",
    name: "CLSC – Services en santé mentale",
    category: "mentalHealth",
    subcategory: "Suivi thérapeutique",
    city: "Province de Québec",
    phone: "811",
    website: "https://santemontreal.qc.ca",
    description:
      "Services de santé mentale de première ligne via les CLSC. Consultez le 811 pour trouver le CLSC de votre secteur.",
  },
  {
    id: "m5",
    name: "Phare Espoir",
    category: "mentalHealth",
    subcategory: "Soutien communautaire",
    city: "Montréal",
    phone: "514-382-6363",
    website: "https://pharespoir.org",
    description:
      "Soutien aux personnes vivant avec un problème de santé mentale. Ateliers, groupes de soutien et accompagnement.",
  },
  {
    id: "m6",
    name: "Association Canadienne pour la Santé Mentale – QC",
    category: "mentalHealth",
    subcategory: "Information et soutien",
    city: "Province de Québec",
    phone: "514-521-4993",
    website: "https://cmha-montreal.qc.ca",
    description:
      "Ressources d'information, soutien et défense des droits pour personnes avec problèmes de santé mentale.",
  },

  // Health
  {
    id: "he1",
    name: "Info-Santé / Info-Social",
    category: "health",
    subcategory: "Consultation santé",
    city: "Province de Québec",
    phone: "811",
    website: "https://sante.gouv.qc.ca",
    description:
      "Ligne provinciale d'information santé. Infirmières disponibles 24h/24 pour conseils médicaux et orientation.",
    isUrgent: true,
  },
  {
    id: "he2",
    name: "Médecins du Monde Canada",
    category: "health",
    subcategory: "Soins sans papiers",
    city: "Montréal",
    phone: "514-281-7658",
    website: "https://medecinsdumonde.ca",
    description:
      "Soins médicaux gratuits pour personnes sans statut légal, sans-abri et personnes en situation précaire.",
  },
  {
    id: "he3",
    name: "Clinique des réfugiés – BINAM",
    category: "health",
    subcategory: "Soins réfugiés",
    city: "Montréal",
    phone: "514-738-2036",
    website: "https://binam.org",
    description:
      "Clinique médicale pour demandeurs d'asile et nouveaux arrivants. Services médicaux et accompagnement.",
  },
  {
    id: "he4",
    name: "Pharmacies – Accès Pharma",
    category: "health",
    subcategory: "Médicaments",
    city: "Province de Québec",
    phone: "1-877-333-6333",
    website: "https://rqap.gouv.qc.ca",
    description:
      "Aide financière pour médicaments. Programme d'assurance médicaments du Québec pour personnes à faible revenu.",
  },

  // Immigration
  {
    id: "im1",
    name: "CARI Saint-Laurent",
    category: "immigration",
    subcategory: "Intégration immigrants",
    city: "Montréal",
    phone: "514-748-2007",
    website: "https://cari.qc.ca",
    description:
      "Services d'accueil et d'intégration pour nouveaux arrivants. Francisation, aide à l'emploi, accompagnement.",
  },
  {
    id: "im2",
    name: "TCRI – Table de concertation des réfugiés",
    category: "immigration",
    subcategory: "Réfugiés et demandeurs d'asile",
    city: "Province de Québec",
    phone: "514-272-6060",
    website: "https://tcri.qc.ca",
    description:
      "Réseau de soutien pour réfugiés et demandeurs d'asile. Orientation vers des ressources d'aide juridique et sociale.",
    isUrgent: true,
  },
  {
    id: "im3",
    name: "Clique Mon Réseau",
    category: "immigration",
    subcategory: "Intégration sociale",
    city: "Montréal",
    phone: "514-932-2953",
    website: "https://cliquemonreseau.com",
    description:
      "Aide à l'intégration sociale et professionnelle des immigrants. Jumelage avec citoyens du Québec.",
  },
  {
    id: "im4",
    name: "Conseil Canadien pour les Réfugiés",
    category: "immigration",
    subcategory: "Aide juridique immigration",
    city: "Province de Québec",
    phone: "514-277-7223",
    website: "https://ccrweb.ca",
    description:
      "Défense des droits des réfugiés et immigrants. Ressources juridiques et orientation pour demandes d'asile.",
  },
  {
    id: "im5",
    name: "MIDI – Services aux immigrants",
    category: "immigration",
    subcategory: "Services gouvernementaux",
    city: "Province de Québec",
    phone: "514-864-9191",
    website: "https://immigration-quebec.gouv.qc.ca",
    description:
      "Services d'immigration du gouvernement du Québec. Information sur les programmes et démarches d'immigration.",
  },

  // Employment
  {
    id: "e1",
    name: "Emploi-Québec",
    category: "employment",
    subcategory: "Services d'emploi",
    city: "Province de Québec",
    phone: "1-888-643-4721",
    website: "https://emploiquebec.gouv.qc.ca",
    description:
      "Services publics d'emploi. Aide à la recherche d'emploi, formations professionnelles et prestations d'aide sociale.",
  },
  {
    id: "e2",
    name: "Carrefour jeunesse-emploi (CJE)",
    category: "employment",
    subcategory: "Emploi jeunes",
    city: "Province de Québec",
    phone: "514-523-4636",
    website: "https://rcjeq.org",
    description:
      "Services d'accompagnement vers l'emploi pour jeunes adultes de 16 à 35 ans. Orientation, CV, stages.",
  },
  {
    id: "e3",
    name: "Chic Resto Pop – Insertion professionnelle",
    category: "employment",
    subcategory: "Formation en emploi",
    city: "Montréal",
    phone: "514-527-1401",
    website: "https://chicrestopop.com",
    description:
      "Programme d'insertion à l'emploi pour personnes éloignées du marché du travail. Formation en cuisine et services.",
  },
  {
    id: "e4",
    name: "Comité d'Action des Non-Organisés (CANO)",
    category: "employment",
    subcategory: "Droits travailleurs",
    city: "Montréal",
    phone: "514-524-6680",
    website: "https://canomontreal.org",
    description:
      "Défense des droits des travailleurs sans emploi. Aide pour prestations d'assurance-emploi et aide sociale.",
  },

  // Family
  {
    id: "fa1",
    name: "SOS Violence Conjugale",
    category: "family",
    subcategory: "Violence conjugale",
    city: "Province de Québec",
    phone: "1-800-363-9010",
    website: "https://sosviolenceconjugale.ca",
    description:
      "Ligne d'aide 24h/24 pour victimes de violence conjugale. Hébergement d'urgence et accompagnement pour femmes.",
    isUrgent: true,
  },
  {
    id: "fa2",
    name: "DPJ – Direction de la protection de la jeunesse",
    category: "family",
    subcategory: "Protection enfance",
    city: "Province de Québec",
    phone: "1-800-463-9019",
    website: "https://dpj.qc.ca",
    description:
      "Service de protection pour enfants en danger. Signalements et intervention pour enfants maltraités ou négligés.",
    isUrgent: true,
  },
  {
    id: "fa3",
    name: "Carrefour Familial Hochelaga",
    category: "family",
    subcategory: "Soutien familial",
    city: "Montréal",
    phone: "514-523-4188",
    website: "https://carrefour-familial.qc.ca",
    description:
      "Soutien aux familles en difficulté. Services d'aide parentale, activités familiales et accompagnement.",
  },
  {
    id: "fa4",
    name: "Maison des femmes de Montréal",
    category: "family",
    subcategory: "Soutien femmes",
    city: "Montréal",
    phone: "514-872-1115",
    website: "https://maisonfemmesmontreal.com",
    description:
      "Soutien aux femmes en situation de vulnérabilité. Services de crise, hébergement et accompagnement social.",
    isUrgent: true,
  },
  {
    id: "fa5",
    name: "Regroupement des maisons pour femmes battues",
    category: "family",
    subcategory: "Maisons d'hébergement femmes",
    city: "Province de Québec",
    phone: "514-879-9010",
    website: "https://maisons-femmes.qc.ca",
    description:
      "Réseau de maisons d'hébergement pour femmes victimes de violence. Référence vers une maison dans votre région.",
    isUrgent: true,
  },

  // Social Support
  {
    id: "s1",
    name: "Centraide du Grand Montréal",
    category: "social",
    subcategory: "Services communautaires",
    city: "Montréal",
    phone: "514-288-1261",
    website: "https://centraide-mtl.org",
    description:
      "Financement et référence vers des centaines d'organismes communautaires à Montréal. Trouver de l'aide près de chez vous.",
  },
  {
    id: "s2",
    name: "211 Québec",
    category: "social",
    subcategory: "Référence communautaire",
    city: "Province de Québec",
    phone: "211",
    website: "https://211qc.ca",
    description:
      "Service de référence vers tous les organismes communautaires et services sociaux du Québec. Disponible 24h/24.",
    isUrgent: true,
  },
  {
    id: "s3",
    name: "Centre d'action bénévole de Montréal",
    category: "social",
    subcategory: "Bénévolat et entraide",
    city: "Montréal",
    phone: "514-842-3351",
    website: "https://cabm.net",
    description:
      "Mise en lien avec des bénévoles pour aide à domicile, transport, accompagnement et soutien aux aînés.",
  },
  {
    id: "s4",
    name: "RESO – Regroupement économique et social du Sud-Ouest",
    category: "social",
    subcategory: "Développement communautaire",
    city: "Montréal",
    phone: "514-932-4698",
    website: "https://resomtl.com",
    description:
      "Soutien au développement économique et social dans le Sud-Ouest de Montréal. Aide aux résidents en difficulté.",
  },
  {
    id: "s5",
    name: "Aîné en difficulté",
    category: "social",
    subcategory: "Soutien aux aînés",
    city: "Province de Québec",
    phone: "514-489-2287",
    website: "https://aines.ca",
    description:
      "Services d'aide et d'accompagnement pour personnes âgées en situation de vulnérabilité ou d'isolement.",
  },
];

export const URGENT_SERVICES = SERVICES.filter((s) => s.isUrgent);
