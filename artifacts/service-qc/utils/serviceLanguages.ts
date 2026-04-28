import type { Service } from "@/data/services";

export type LangCode = "fr" | "en" | "es" | "ar" | "ht" | "zh";

export const LANG_LABELS: Record<LangCode, { fr: string; en: string; flag: string }> = {
  fr: { fr: "Français", en: "French", flag: "🇫🇷" },
  en: { fr: "Anglais", en: "English", flag: "🇨🇦" },
  es: { fr: "Espagnol", en: "Spanish", flag: "🇪🇸" },
  ar: { fr: "Arabe", en: "Arabic", flag: "🇸🇦" },
  ht: { fr: "Créole haïtien", en: "Haitian Creole", flag: "🇭🇹" },
  zh: { fr: "Mandarin", en: "Mandarin", flag: "🇨🇳" },
};

const ENGLISH_CITIES = [
  "westmount", "hampstead", "côte saint-luc", "cote saint-luc", "dollard",
  "pointe-claire", "kirkland", "beaconsfield", "baie-d'urfé", "baie d'urfe",
  "dorval", "lachine", "ndg", "notre-dame-de-grâce", "verdun", "saint-laurent",
  "west island", "ouest-de-l'île",
];

const ENGLISH_KEYWORDS = [
  "english", "anglais", "anglophone", "international", "multicultural",
  "yMCA", "ywca", "salvation army", "armée du salut", "centre catholic",
  "Jewish", "juif", "Filipino", "Chinese", "Vietnamese",
];

const SPANISH_KEYWORDS = [
  "hispan", "latino", "latin", "espagnol", "espanol", "español",
  "amerique latine", "amérique latine", "latin american",
];

const ARABIC_KEYWORDS = [
  "arab", "arabe", "maghreb", "maghr", "musulman", "muslim",
  "moyen-orient", "moyen orient", "syrien", "marocain", "algérien",
  "tunisien", "libanais", "afrique du nord",
];

const HAITIAN_KEYWORDS = [
  "haït", "hait", "creole", "créole", "kreyol", "haitian",
  "bureau communauté chrétienne", "maison d'haïti",
];

const CHINESE_KEYWORDS = [
  "chinois", "chinese", "mandarin", "asiatique", "asian",
  "vietnamien", "vietnamese", "communauté chinoise",
];

/**
 * Heuristic — derives spoken languages for a service from its name, city, category.
 * Always includes "fr" (Quebec is francophone). Other languages added when keywords match.
 *
 * If the Service later carries a real DB-backed `languages` array, this function is bypassed.
 */
export function inferLanguages(service: Service): LangCode[] {
  // If the service explicitly lists languages, trust them
  const explicit = (service as any).languages as LangCode[] | undefined;
  if (Array.isArray(explicit) && explicit.length > 0) return explicit;

  const langs = new Set<LangCode>(["fr"]);
  const text = `${service.name} ${service.subcategory ?? ""} ${service.description ?? ""}`.toLowerCase();
  const city = (service.city ?? "").toLowerCase();

  // English
  if (
    ENGLISH_CITIES.some((c) => city.includes(c)) ||
    ENGLISH_KEYWORDS.some((k) => text.includes(k.toLowerCase()))
  ) {
    langs.add("en");
  }

  // Immigration / multicultural orgs almost always serve multilingual
  if (service.category === "immigration") {
    langs.add("en");
    langs.add("es");
    langs.add("ar");
  }

  if (SPANISH_KEYWORDS.some((k) => text.includes(k))) langs.add("es");
  if (ARABIC_KEYWORDS.some((k) => text.includes(k))) langs.add("ar");
  if (HAITIAN_KEYWORDS.some((k) => text.includes(k))) langs.add("ht");
  if (CHINESE_KEYWORDS.some((k) => text.includes(k))) langs.add("zh");

  // Major Montreal services tend to be bilingual at minimum
  if (city.includes("montréal") || city.includes("montreal")) {
    langs.add("en");
  }

  return Array.from(langs);
}

export function speaksLanguage(service: Service, lang: LangCode): boolean {
  return inferLanguages(service).includes(lang);
}
