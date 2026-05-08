import type { Category } from "@/data/services";

// ─────────────────────────────────────────────────────────────────────────────
// AttenteZéro — Pont entre les noms de catégories en BDD (français, hérités
// de l'import MSSS d'origine) et les noms de catégories utilisés partout dans
// le code mobile (anglais, type-safe Category).
//
// Pourquoi : la base de données stocke "logement", "santemental", etc.
// alors que tout le code TypeScript manipule "housing", "mentalHealth", etc.
// Sans ce mapping, les filtres par catégorie ne matchent rien et les badges
// de couleur/icônes affichent du vide.
// ─────────────────────────────────────────────────────────────────────────────

const API_TO_CODE: Record<string, Category> = {
  // ── catégories en français (BDD prod actuelle) ──
  logement: "housing",
  alimentation: "food",
  santemental: "mentalHealth",
  sante: "health",
  immigration: "immigration",
  emploi: "employment",
  famille: "family",
  soutienSocial: "social",
  achatImmobilier: "realestate",
  // Variantes possibles (au cas où d'anciens scripts de seed ont laissé du bruit)
  "santé": "health",
  "santé mentale": "mentalHealth",
  "soutien social": "social",
  "achat immobilier": "realestate",
  // ── catégories déjà en anglais (services ajoutés via le code) ──
  housing: "housing",
  food: "food",
  mentalHealth: "mentalHealth",
  health: "health",
  employment: "employment",
  family: "family",
  social: "social",
  childcare: "childcare",
  realestate: "realestate",
  administrative: "administrative",
  legal: "legal",
  banking: "banking",
  transport: "transport",
  tourism: "tourism",
  moving: "moving",
  hypermarche: "hypermarche",
  hypermarché: "hypermarche",
  hypermarches: "hypermarche",
  hypermarchés: "hypermarche",
  pharmacie: "pharmacie",
  pharmacies: "pharmacie",
  pharmacy: "pharmacie",
  seniors: "seniors",
  aines: "seniors",
  "aînés": "seniors",
  aines_qc: "seniors",
};

// Mapping inverse : code TS → nom BDD canonique. On garde les noms BDD
// existants pour ne pas casser les filtres SQL côté admin / B2G qui
// regroupent par `services.category`.
const CODE_TO_API: Record<Category, string> = {
  housing: "logement",
  food: "alimentation",
  mentalHealth: "santemental",
  health: "sante",
  immigration: "immigration",
  employment: "emploi",
  family: "famille",
  social: "soutienSocial",
  childcare: "famille", // pas de catégorie dédiée en BDD → rabattu sur famille
  realestate: "achatImmobilier",
  administrative: "soutienSocial", // pas de catégorie dédiée en BDD → soutien social
  legal: "soutienSocial", // pas de catégorie dédiée en BDD → soutien social
  banking: "banking",
  transport: "transport",
  tourism: "tourism",
  moving: "moving",
  hypermarche: "hypermarche",
  pharmacie: "pharmacie",
  seniors: "seniors",
};

/**
 * Convertit une catégorie venue de l'API/BDD vers le format utilisé par le
 * code mobile. Renvoie null si la valeur est inconnue (le service sera alors
 * filtré côté chargement plutôt que d'apparaître avec un badge vide).
 */
export function apiCategoryToCode(value: string | null | undefined): Category | null {
  if (!value) return null;
  const trimmed = value.trim();
  return API_TO_CODE[trimmed] ?? null;
}

/**
 * Convertit une catégorie du code mobile vers le format BDD canonique.
 * Utile pour les requêtes côté admin / pour pousser de nouveaux services.
 */
export function codeCategoryToApi(value: Category): string {
  return CODE_TO_API[value];
}
