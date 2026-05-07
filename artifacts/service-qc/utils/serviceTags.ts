import type { Service } from "@/data/services";

export interface ServiceTag {
  label: string;
  tone: "neutral" | "positive" | "info" | "warn";
}

const FREE_HINTS = [
  /\bgratuit/i,
  /\bsans frais/i,
  /\bno cost/i,
  /\bfree of charge/i,
  /\bfree\b/i,
];

const ANONYMOUS_HINTS = [
  /\banonyme/i,
  /\bconfidentiel/i,
  /\banonymous/i,
  /\bconfidential/i,
];

const NO_APPT_HINTS = [
  /sans rendez[\s-]?vous/i,
  /sans rdv/i,
  /walk[\s-]?in/i,
  /no appointment/i,
];

const APPT_HINTS = [
  /sur rendez[\s-]?vous/i,
  /sur rdv/i,
  /by appointment/i,
];

const HELPLINE_HINTS = [
  /ligne d['’]écoute/i,
  /helpline/i,
  /\b211\b/,
  /\b811\b/,
  /\b911\b/,
  /\b1[\s-]?800/,
];

/**
 * Best-effort, **non-promissive** visual tags derived ONLY from existing
 * data fields (description + hours + phone). Returns at most 4 tags.
 *
 * These tags are *hints* to the user, not contractual promises — they
 * reflect what the description claims. We never invent information.
 */
export function deriveServiceTags(service: Service, lang: "fr" | "en" = "fr"): ServiceTag[] {
  const tags: ServiceTag[] = [];
  const text = `${service.description ?? ""} ${service.subcategory ?? ""}`;

  const is247 =
    !!service.hours && (/24\s*[h\/]?\s*24/i.test(service.hours) || /24\s*\/\s*7/i.test(service.hours));
  if (is247) {
    tags.push({ label: "24/7", tone: "positive" });
  }

  if (FREE_HINTS.some((re) => re.test(text))) {
    tags.push({ label: lang === "fr" ? "Gratuit" : "Free", tone: "positive" });
  }

  if (ANONYMOUS_HINTS.some((re) => re.test(text))) {
    tags.push({ label: lang === "fr" ? "Anonyme" : "Anonymous", tone: "info" });
  }

  // Walk-in is more informative than "by appointment" for distressed users
  if (NO_APPT_HINTS.some((re) => re.test(text))) {
    tags.push({ label: lang === "fr" ? "Sans rendez-vous" : "Walk-in", tone: "positive" });
  } else if (APPT_HINTS.some((re) => re.test(text))) {
    tags.push({ label: lang === "fr" ? "Sur rendez-vous" : "By appointment", tone: "neutral" });
  }

  if (
    service.serviceType === "phone" ||
    HELPLINE_HINTS.some((re) => re.test(`${service.name} ${service.phone ?? ""}`))
  ) {
    tags.push({ label: lang === "fr" ? "Téléphone" : "Phone", tone: "info" });
  }

  if (service.serviceType === "regional" || service.isProvinceWide) {
    tags.push({ label: lang === "fr" ? "Province entière" : "Province-wide", tone: "info" });
  }

  // Cap at 4 to avoid card clutter
  return tags.slice(0, 4);
}

/**
 * Returns a soft, generic eligibility hint based on service category and
 * description keywords. Never invents specific income thresholds — the
 * user is told to call to confirm. Returns null when we have nothing
 * trustworthy to say.
 */
export function deriveEligibilityHint(
  service: Service,
  lang: "fr" | "en" = "fr",
): string | null {
  const text = (service.description ?? "").toLowerCase();

  const FR = {
    callToConfirm: " Appelez pour confirmer votre admissibilité.",
    free: "Service gratuit, ouvert à toute personne dans le besoin.",
    anonymous: "Service confidentiel et anonyme — aucun document requis pour appeler.",
    youth: "Destiné principalement aux jeunes (vérifiez la tranche d'âge ciblée).",
    seniors: "Destiné principalement aux personnes aînées (65 ans et +).",
    immigrants: "Conçu pour les personnes immigrantes et les nouveaux arrivants.",
    families: "Destiné aux familles avec enfants.",
    homeless: "Destiné aux personnes en situation d'itinérance.",
    lowIncome: "Destiné aux personnes à faible revenu (les critères varient).",
    emergency24: "Service d'urgence ouvert 24h/24, 7j/7. Aucune question préalable.",
  } as const;
  const EN = {
    callToConfirm: " Call to confirm eligibility.",
    free: "Free service, open to anyone in need.",
    anonymous: "Confidential and anonymous service — no documents required to call.",
    youth: "Mainly intended for youth (check the targeted age range).",
    seniors: "Mainly intended for seniors (65+).",
    immigrants: "Designed for immigrants and newcomers.",
    families: "Intended for families with children.",
    homeless: "Intended for people experiencing homelessness.",
    lowIncome: "Intended for low-income individuals (criteria vary).",
    emergency24: "24/7 emergency service. No screening questions.",
  } as const;
  const M = lang === "fr" ? FR : EN;

  const parts: string[] = [];

  if (service.isUrgent && service.hours && /24/.test(service.hours)) {
    parts.push(M.emergency24);
  }
  if (ANONYMOUS_HINTS.some((re) => re.test(text))) parts.push(M.anonymous);
  else if (FREE_HINTS.some((re) => re.test(text))) parts.push(M.free);

  if (/\bjeunes?\b|\byouth\b|\b16[\s-]?(?:à|to)[\s-]?35\b/.test(text)) parts.push(M.youth);
  if (/\baîné|\bsenior|\b65\s*\+|\b65\s*ans/.test(text)) parts.push(M.seniors);
  if (/immigrant|nouv(?:eaux|el)\s*arrivants?|newcomer/i.test(text)) parts.push(M.immigrants);
  if (/famille|family|familles|families|enfants?/i.test(text)) parts.push(M.families);
  if (/itinéran|sans[-\s]abri|homeless|sans[-\s]domicile/i.test(text)) parts.push(M.homeless);
  if (/faible\s*revenu|low[-\s]income|à\s*faible\s*revenu/i.test(text)) parts.push(M.lowIncome);

  if (parts.length === 0) return null;
  return parts.join(" ") + M.callToConfirm;
}
