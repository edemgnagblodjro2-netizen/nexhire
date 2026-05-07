import type { Category } from "@/data/services";

export interface Fallback24h {
  /** Short, scannable name */
  name: string;
  /** Tel: link target — digits + dashes, no spaces */
  phone: string;
  /** Display phone (with spaces, easier to read) */
  phoneDisplay: string;
  /** One-line description of when to use it */
  hint: string;
  /** Optional: SOS button (911 etc.) for life-threatening cases */
  isEmergency?: boolean;
}

/**
 * 24/7 fallbacks shown when a service is CLOSED at the moment the user
 * opens its detail screen. The goal is to never let a distressed user
 * fall through the cracks: if the clinic they wanted is closed at 3am,
 * we hand them a real, working number RIGHT NOW.
 *
 * Sources:
 *   - 811 Info-Santé : ligne provinciale santé non-urgente, 24/7, gratuit
 *   - 911            : urgences vitales, 24/7
 *   - 988            : prévention suicide Canada, 24/7, gratuit
 *   - 211            : ressources communautaires, 24/7 dans plusieurs régions QC
 *   - SOS Violence Conjugale : 1-800-363-9010, 24/7
 *   - Drogue : Aide et Référence : 1-800-265-2626, 24/7
 *   - Ligne Parents : 1-800-361-5085, 24/7
 *   - Tel-jeunes : 1-800-263-2266, 24/7
 *   - Ligne Allaitement Québec : 1-877-948-5358 (jour seulement, pas inclus comme 24/7)
 */
const INFO_SANTE: Fallback24h = {
  name: "Info-Santé 811",
  phone: "811",
  phoneDisplay: "811",
  hint: "Conseil santé infirmier, 24h/24, gratuit, en français.",
};

const URGENCE_911: Fallback24h = {
  name: "911 — urgence vitale",
  phone: "911",
  phoneDisplay: "911",
  hint: "Si la vie est en danger immédiat (saignement, douleur thoracique, perte de conscience).",
  isEmergency: true,
};

const SUICIDE_988: Fallback24h = {
  name: "988 — Prévention du suicide",
  phone: "988",
  phoneDisplay: "988",
  hint: "Soutien immédiat en cas de pensées suicidaires, 24h/24, gratuit.",
};

const RESSOURCES_211: Fallback24h = {
  name: "211 — Services communautaires",
  phone: "211",
  phoneDisplay: "211",
  hint: "Référence vers les organismes de votre région, 24h/24 dans plusieurs régions du Québec.",
};

const VIOLENCE_CONJUGALE: Fallback24h = {
  name: "SOS Violence Conjugale",
  phone: "1-800-363-9010",
  phoneDisplay: "1 800 363-9010",
  hint: "Écoute, information et hébergement d'urgence, 24h/24, confidentiel.",
};

const DROGUE_AIDE: Fallback24h = {
  name: "Drogue : Aide et Référence",
  phone: "1-800-265-2626",
  phoneDisplay: "1 800 265-2626",
  hint: "Écoute, information et orientation pour problèmes de consommation, 24h/24.",
};

const LIGNE_PARENTS: Fallback24h = {
  name: "LigneParents",
  phone: "1-800-361-5085",
  phoneDisplay: "1 800 361-5085",
  hint: "Soutien et écoute pour parents en détresse, 24h/24, gratuit, confidentiel.",
};

const TEL_JEUNES: Fallback24h = {
  name: "Tel-jeunes",
  phone: "1-800-263-2266",
  phoneDisplay: "1 800 263-2266",
  hint: "Pour les jeunes — écoute, information, intervention, 24h/24, anonyme.",
};

/**
 * Returns the most relevant 24/7 alternatives when a service of the given
 * category is closed. 911 is reserved for categories with a real
 * life-threatening risk (santé, santé mentale, famille). For non-urgent
 * categories (logement, transport, loisirs, etc.) we surface 211 + 811
 * only — calling 911 for "ma carte d'assurance maladie" would be wrong.
 */
export function getFallbacks24h(category: Category): Fallback24h[] {
  switch (category) {
    case "mentalHealth":
      return [SUICIDE_988, INFO_SANTE, URGENCE_911];
    case "health":
    case "family":
      return [INFO_SANTE, LIGNE_PARENTS, URGENCE_911];
    case "social":
      return [VIOLENCE_CONJUGALE, RESSOURCES_211, INFO_SANTE];
    case "food":
    case "housing":
    case "employment":
    case "immigration":
      return [RESSOURCES_211, INFO_SANTE];
    case "childcare":
      return [LIGNE_PARENTS, TEL_JEUNES, INFO_SANTE];
    default:
      // No 911 here on purpose: this branch covers low-urgency categories
      // (transport, loisirs, démarches, etc.) where calling 911 would be
      // inappropriate. 211 + 811 are always safe defaults.
      return [INFO_SANTE, RESSOURCES_211];
  }
}
