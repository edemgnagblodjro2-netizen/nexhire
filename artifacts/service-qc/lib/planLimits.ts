/**
 * AttenteZéro — Matrice Plan × Fonctionnalité
 * Source unique de vérité pour les limites par abonnement.
 */

export type PlanId = "free" | "travailleur" | "organisme" | "plus" | "institution";

export interface PlanLimits {
  id: PlanId;
  label: string;
  priceMonthly: number;
  trialDays: number;
  features: {
    maxFavorites: number;
    chatPerDay: number;
    maxClients: number;
    maxAppointmentsPerMonth: number;
    maxTeamMembers: number;
    teamPermissions: "none" | "basic" | "advanced" | "granular";
    multiSite: boolean;
    csvExport: boolean;
    customBranding: boolean;
    calendarSync: boolean;
    publicApi: boolean;
    ads: boolean;
    buyingGuide: boolean;
  };
}

const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    id: "free",
    label: "Personne",
    priceMonthly: 0,
    trialDays: 0,
    features: {
      maxFavorites: 10,
      chatPerDay: 5,
      maxClients: 0,
      maxAppointmentsPerMonth: 0,
      maxTeamMembers: 0,
      teamPermissions: "none",
      multiSite: false,
      csvExport: false,
      customBranding: false,
      calendarSync: false,
      publicApi: false,
      ads: true,
      buyingGuide: false,
    },
  },
  travailleur: {
    id: "travailleur",
    label: "Travailleur",
    priceMonthly: 19,
    trialDays: 14,
    features: {
      maxFavorites: UNLIMITED,
      chatPerDay: 50,
      maxClients: 10,
      maxAppointmentsPerMonth: 30,
      maxTeamMembers: 0,
      teamPermissions: "none",
      multiSite: false,
      csvExport: false,
      customBranding: false,
      calendarSync: false,
      publicApi: false,
      ads: false,
      buyingGuide: true,
    },
  },
  organisme: {
    id: "organisme",
    label: "Organisme",
    priceMonthly: 39,
    trialDays: 14,
    features: {
      maxFavorites: UNLIMITED,
      chatPerDay: 100,
      maxClients: 25,
      maxAppointmentsPerMonth: 100,
      maxTeamMembers: 10,
      teamPermissions: "basic",
      multiSite: false,
      csvExport: true,
      customBranding: false,
      calendarSync: false,
      publicApi: false,
      ads: false,
      buyingGuide: true,
    },
  },
  plus: {
    id: "plus",
    label: "Plus",
    priceMonthly: 89,
    trialDays: 14,
    features: {
      maxFavorites: UNLIMITED,
      chatPerDay: UNLIMITED,
      maxClients: UNLIMITED,
      maxAppointmentsPerMonth: UNLIMITED,
      maxTeamMembers: 25,
      teamPermissions: "advanced",
      multiSite: false,
      csvExport: true,
      customBranding: true,
      calendarSync: true,
      publicApi: false,
      ads: false,
      buyingGuide: true,
    },
  },
  institution: {
    id: "institution",
    label: "Institution",
    priceMonthly: 199,
    trialDays: 14,
    features: {
      maxFavorites: UNLIMITED,
      chatPerDay: UNLIMITED,
      maxClients: UNLIMITED,
      maxAppointmentsPerMonth: UNLIMITED,
      maxTeamMembers: UNLIMITED,
      teamPermissions: "granular",
      multiSite: true,
      csvExport: true,
      customBranding: true,
      calendarSync: true,
      publicApi: true,
      ads: false,
      buyingGuide: true,
    },
  },
};

/** Map les valeurs DB legacy vers les PlanId courants. */
export function normalizePlan(
  raw: string | null | undefined,
  isPremium?: boolean,
): PlanId {
  if (!raw) return isPremium ? "travailleur" : "free";
  const v = raw.toLowerCase();
  if (v === "standard" || v === "free") return isPremium ? "travailleur" : "free";
  if (v === "travailleur" || v === "terrain") return "travailleur";
  if (v === "organisme") return "organisme";
  if (v === "plus") return "plus";
  if (v === "institution") return "institution";
  return isPremium ? "travailleur" : "free";
}

export function getPlan(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
}

export function isUnlimited(value: number): boolean {
  return value === UNLIMITED;
}

export function formatLimit(value: number): string {
  return isUnlimited(value) ? "illimité" : String(value);
}

/** Plan supérieur recommandé quand on dépasse une limite. */
export function nextPlan(current: PlanId): PlanId | null {
  const order: PlanId[] = ["free", "travailleur", "organisme", "plus", "institution"];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}
