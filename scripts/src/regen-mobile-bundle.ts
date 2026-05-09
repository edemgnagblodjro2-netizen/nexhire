import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const JSON_PATH = path.join(ROOT, "artifacts/service-qc/data/services-data.json");
const TS_PATH = path.join(ROOT, "artifacts/service-qc/data/services.ts");

const API_TO_CODE: Record<string, string> = {
  logement: "housing",
  alimentation: "food",
  santemental: "mentalHealth",
  sante: "health",
  immigration: "immigration",
  emploi: "employment",
  famille: "family",
  soutienSocial: "social",
  achatImmobilier: "realestate",
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
  pharmacie: "pharmacie",
  seniors: "seniors",
};

type Raw = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  city?: string;
  province?: string;
  phone?: string;
  description?: string;
  website?: string;
  address?: string;
  hours?: string;
  isUrgent?: boolean;
  isProvinceWide?: boolean;
  coordinates?: { lat?: number; lng?: number };
};

const data: Raw[] = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
console.log(`JSON records: ${data.length}`);

let dropped = 0;
const mapped = data
  .map((s) => {
    const cat = API_TO_CODE[s.category];
    if (!cat) {
      dropped++;
      return null;
    }
    const o: Record<string, unknown> = {
      id: s.id,
      name: s.name,
      category: cat,
      subcategory: s.subcategory ?? "",
      city: s.city ?? "",
      province: s.province ?? "QC",
      phone: s.phone ?? "",
      description: s.description ?? "",
    };
    if (s.website) o.website = s.website;
    if (s.address) o.address = s.address;
    if (s.hours) o.hours = s.hours;
    if (s.isUrgent) o.isUrgent = true;
    if (s.isProvinceWide) o.isProvinceWide = true;
    if (s.coordinates && s.coordinates.lat != null && s.coordinates.lng != null) {
      o.coordinates = { lat: s.coordinates.lat, lng: s.coordinates.lng };
    }
    return o;
  })
  .filter(Boolean);

console.log(`Mapped: ${mapped.length} | Dropped (unknown category): ${dropped}`);

const head = `import { SENIORS_STATIC_SERVICES } from "./services-seniors";

export type Category =
  | "housing"
  | "food"
  | "mentalHealth"
  | "health"
  | "immigration"
  | "employment"
  | "family"
  | "social"
  | "childcare"
  | "realestate"
  | "administrative"
  | "legal"
  | "banking"
  | "transport"
  | "tourism"
  | "moving"
  | "hypermarche"
  | "pharmacie"
  | "seniors";

export interface Coordinates {
  lat: number;
  lng: number;
}

export type ProvinceCode =
  | "QC"
  | "ON"
  | "BC"
  | "AB"
  | "MB"
  | "SK"
  | "NB"
  | "NS"
  | "PE"
  | "NL"
  | "YT"
  | "NT"
  | "NU";

export const PROVINCE_LABELS: Record<ProvinceCode, string> = {
  QC: "Québec",
  ON: "Ontario",
  BC: "Colombie-Britannique",
  AB: "Alberta",
  MB: "Manitoba",
  SK: "Saskatchewan",
  NB: "Nouveau-Brunswick",
  NS: "Nouvelle-Écosse",
  PE: "Île-du-Prince-Édouard",
  NL: "Terre-Neuve-et-Labrador",
  YT: "Yukon",
  NT: "Territoires du Nord-Ouest",
  NU: "Nunavut",
};

export type ServiceType = "physical" | "phone" | "regional";

export interface Service {
  id: string;
  name: string;
  category: Category;
  subcategory: string;
  city: string;
  province?: ProvinceCode;
  phone: string;
  email?: string;
  website?: string;
  description: string;
  isUrgent?: boolean;
  coordinates?: Coordinates;
  hours?: string;
  address?: string;
  isProvinceWide?: boolean;
  badgeVerified?: boolean;
  featured?: boolean;
  organisationId?: string;
  /** ISO 639-1 codes — fr, en, es, ar, ht, zh. If omitted, inferred from name/city. */
  languages?: string[];
  // v1.1.9 — Phase 1 fiabilité géolocalisation
  serviceType?: ServiceType;
  geocodePrecisionM?: number;
  geocodeSource?: string;
  verifiedAt?: string | null;
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
  childcare: "Services de garde",
  realestate: "Achat immobilier",
  administrative: "Démarches administratives",
  legal: "Aide juridique",
  banking: "Banques",
  transport: "Transport",
  tourism: "Tourisme",
  moving: "Déménagement",
  hypermarche: "Hypermarchés",
  pharmacie: "Pharmacies",
  seniors: "Aînés",
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED from services-data.json (source of truth = API DB seed).
// Do NOT hand-edit this list. Regenerate with:
//   pnpm --filter @workspace/scripts run regen-mobile-bundle
// Keeping IDs in sync with the API DB is critical: otherwise mobile clients
// render stale services that 404 on /rate, /track, /wait, etc.
// ─────────────────────────────────────────────────────────────────────────────
const __SERVICES_FROM_API: Service[] = ${JSON.stringify(mapped, null, 2)};

const __ALL_STATIC_SERVICES: Service[] = [...__SERVICES_FROM_API, ...SENIORS_STATIC_SERVICES];

export const SERVICES: Service[] = __ALL_STATIC_SERVICES.filter((s) => {
  const prov = (s.province ?? "QC") as string;
  if (prov === "QC") return true;
  // Pan-canadiens utiles (Kijiji, Centris, Realtor, lignes 1-800)
  // doivent être marqués isProvinceWide ET province ∈ {CA, QC}.
  if (s.isProvinceWide && prov === "CA") return true;
  return false;
});
export const URGENT_SERVICES = SERVICES.filter((s) => s.isUrgent);
export const PROVINCE_WIDE_SERVICES = SERVICES.filter((s) => s.isProvinceWide);
export const SERVICES_BY_PROVINCE = (code: ProvinceCode): Service[] =>
  SERVICES.filter((s) => (s.province ?? "QC") === code);
`;

fs.writeFileSync(TS_PATH, head);
console.log(`Written ${TS_PATH}`);
