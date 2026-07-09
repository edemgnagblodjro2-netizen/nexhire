import https from "node:https";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";

// ── LesPAC (lespac.com) scraper ───────────────────────────────────────────────
//
// API JSON : https://www.lespac.com/{region}/immobilier-location-logements_{cat}{geo}k{page}R{sort}.jsa
//   cat  = b457  (logements à louer)
//   geo  = code régional (g15398 = Québec province ; trouver les autres via DevTools)
//   page = k1, k2, k3 …
//   sort = R2 (plus récents en premier)
//
// L'endpoint retourne JSON quand le header X-Requested-With: XMLHttpRequest est présent.
// Le cookie `experienceMode=beta` active le format beta (JSON enrichi).

const BASE            = "https://www.lespac.com";
const ENGINE_VERSION  = "lespac-v1";
const DEFAULT_DELAY_MS = 1500;
const CAT             = "b457"; // Immobilier — Location / Logements
const SORT            = "R2";   // Plus récents

// ── Config par ville ──────────────────────────────────────────────────────────
//
// geo codes : naviguer sur lespac.com par ville et inspecter les requêtes XHR
// pour trouver le gXXXXX correspondant à chaque municipalité.

export interface CityConfig {
  geoCode:    string; // ex. "g15398"
  regionSlug: string; // ex. "quebec"
  city:       string; // nom FairRent
  province:   string;
}

export const LP_CITIES: CityConfig[] = [
  // g15398 = Québec (province entière) — confirmé depuis session navigateur utilisateur
  // Décomposer par ville une fois les geo codes identifiés via DevTools LesPAC :
  { geoCode: "g15398", regionSlug: "quebec", city: "Montréal", province: "QC" },
  // { geoCode: "gXXXXX", regionSlug: "quebec", city: "Québec",    province: "QC" },
  // { geoCode: "gXXXXX", regionSlug: "quebec", city: "Laval",     province: "QC" },
  // { geoCode: "gXXXXX", regionSlug: "quebec", city: "Longueuil", province: "QC" },
  // { geoCode: "gXXXXX", regionSlug: "quebec", city: "Gatineau",  province: "QC" },
];

export interface ScrapeResult {
  city:          string;
  pages_fetched: number;
  inserted:      number;
  updated:       number;
  skipped:       number;
  errors:        string[];
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent":       "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        "Accept":           "application/json, text/plain, */*",
        "Accept-Language":  "fr-CA,fr;q=0.9,en-CA;q=0.8",
        "Accept-Encoding":  "gzip, deflate, br",
        "X-Requested-With": "XMLHttpRequest",
        "Cache-Control":    "no-cache",
        "Pragma":           "no-cache",
        // Cookies minimaux : langue + mode beta pour déclencher l'API JSON
        // Pas de SID (session) — les annonces publiques sont accessibles sans auth
        "Cookie": "LpcWebCurrentLanguage=fr_CA; experienceMode=beta",
        "Connection":       "keep-alive",
      },
    }, (res) => {
      const status = res.statusCode ?? 200;
      if (status === 301 || status === 302) {
        res.resume();
        reject(new Error(`redirect:${res.headers.location}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`json_parse:status=${status}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function pageUrl(cfg: CityConfig, page: number): string {
  return `${BASE}/${cfg.regionSlug}/immobilier-location-logements_${CAT}${cfg.geoCode}k${page}${SORT}.jsa`;
}

// ── Parsers JSON ─────────────────────────────────────────────────────────────
//
// Format LesPAC (à vérifier sur la première réponse — ajuster selon réalité) :
//
//   { ads: [ { id, subject, price, formattedPrice,
//              category: { name }, location: { name, regionName },
//              attributes: [ { name, value } ],
//              url, isActive } ],
//     totalCount, currentPage, pageSize }
//
// OU format alternatif :
//   { result: { listings: [...], count } }
//
// La fonction extractAds gère les deux formes les plus courantes.

type RawAd = Record<string, unknown>;

function extractAds(raw: unknown): RawAd[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;

  // Forme 1 : { ads: [...] }
  if (Array.isArray(r["ads"])) return r["ads"] as RawAd[];

  // Forme 2 : { result: { ads: [...] } }
  const result = r["result"];
  if (result && typeof result === "object") {
    const inner = result as Record<string, unknown>;
    if (Array.isArray(inner["ads"])) return inner["ads"] as RawAd[];
    if (Array.isArray(inner["listings"])) return inner["listings"] as RawAd[];
  }

  // Forme 3 : { listings: [...] }
  if (Array.isArray(r["listings"])) return r["listings"] as RawAd[];

  return [];
}

function hasMorePages(raw: unknown, page: number): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;

  const total     = Number(r["totalCount"] ?? r["total"] ?? r["count"] ?? 0);
  const pageSize  = Number(r["pageSize"]   ?? r["size"]  ?? 20);
  const ads       = extractAds(raw);

  // Critère 1 : totalCount > page * pageSize
  if (total > 0 && pageSize > 0) return page * pageSize < total;

  // Critère 2 : on a reçu des annonces cette page
  return ads.length > 0;
}

// "1 450 $" ou "1450$" → 1450
function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw >= 400 && raw <= 15000 ? raw : null;
  const s = String(raw).replace(/[\s $,]/g, "");
  const n = parseInt(s, 10);
  return n >= 400 && n <= 15000 ? n : null;
}

// "4½" ou "4 pièces" → bedrooms (QC convention: pièces − 2)
function parseBedrooms(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/(\d+)/);
  if (!m) return null;
  const rooms = parseInt(m[1], 10);
  // Si la valeur ressemble déjà à des chambres (1–6) sans ½ → garder tel quel
  if (!String(raw).includes("½") && !String(raw).includes("pièce") && rooms <= 6) return rooms;
  return Math.max(0, rooms - 2); // convention QC : 4½ → 2 chambres
}

// Déduire le type d'annonce depuis le titre/catégorie
function parseListingType(ad: RawAd): string {
  const haystack = [
    String(ad["subject"] ?? ""),
    String(ad["title"]   ?? ""),
    String((ad["category"] as Record<string, unknown>)?.["name"] ?? ""),
  ].join(" ").toLowerCase();

  if (haystack.includes("maison"))           return "maison";
  if (haystack.includes("condo"))            return "condo";
  if (haystack.includes("studio"))           return "studio";
  if (haystack.includes("chambre") || haystack.includes("colocation")) return "chambre";
  if (haystack.includes("chalet") || haystack.includes("cottage"))    return "chalet";
  return "appartement";
}

function parseNeighborhood(ad: RawAd): string | null {
  const loc = ad["location"];
  if (!loc || typeof loc !== "object") return null;
  const l = loc as Record<string, unknown>;
  const name = String(l["name"] ?? l["city"] ?? l["municipality"] ?? "").trim();
  return name.length > 2 ? name.slice(0, 200) : null;
}

interface ListingStub {
  externalId:    string;
  url:           string;
  title:         string;
  listing_type:  string;
  bedrooms:      number | null;
  price:         number | null;
  neighborhood:  string | null;
}

function adToStub(ad: RawAd): ListingStub | null {
  const id = String(ad["id"] ?? ad["adId"] ?? "").trim();
  if (!id) return null;

  // Prix : champ direct ou objet { amount, currency }
  let rawPrice: string | number | null = null;
  if (ad["price"] != null) {
    const p = ad["price"];
    if (typeof p === "object" && p !== null) {
      rawPrice = (p as Record<string, unknown>)["amount"] as number ?? null;
    } else {
      rawPrice = p as string | number;
    }
  } else if (ad["formattedPrice"]) {
    rawPrice = ad["formattedPrice"] as string;
  }

  const price = parsePrice(rawPrice);
  if (!price) return null; // ignorer les annonces sans prix

  // URL : relative ou absolue
  let url = String(ad["url"] ?? ad["link"] ?? "").trim();
  if (!url) url = `${BASE}/annonce/${id}`;
  else if (url.startsWith("/")) url = `${BASE}${url}`;

  // Chambres : chercher dans attributes[] { name: "Nombre de pièces", value: "4½" }
  let bedroomsRaw: string | null = null;
  const attrs = ad["attributes"];
  if (Array.isArray(attrs)) {
    for (const a of attrs as RawAd[]) {
      const n = String(a["name"] ?? "").toLowerCase();
      if (n.includes("pièce") || n.includes("chambre") || n.includes("room")) {
        bedroomsRaw = String(a["value"] ?? "");
        break;
      }
    }
  }
  if (!bedroomsRaw && ad["rooms"])     bedroomsRaw = String(ad["rooms"]);
  if (!bedroomsRaw && ad["bedrooms"])  bedroomsRaw = String(ad["bedrooms"]);

  return {
    externalId:   id,
    url,
    title:        String(ad["subject"] ?? ad["title"] ?? "Logement à louer").slice(0, 500),
    listing_type: parseListingType(ad),
    bedrooms:     parseBedrooms(bedroomsRaw),
    price,
    neighborhood: parseNeighborhood(ad),
  };
}

// ── DB upsert ─────────────────────────────────────────────────────────────────

async function upsertListing(
  stub:   ListingStub,
  cfg:    CityConfig,
): Promise<"inserted" | "updated" | "skipped"> {
  try {
    const result = await db.execute(sql`
      INSERT INTO fr_listings (
        url, source, platform,
        city, province, neighborhood,
        price, bedrooms, listing_type, title,
        is_active, last_seen_at, engine_version, extraction_quality
      ) VALUES (
        ${stub.url},
        'lespac',
        'lespac',
        ${cfg.city},
        ${cfg.province},
        ${stub.neighborhood},
        ${stub.price},
        ${stub.bedrooms},
        ${stub.listing_type},
        ${stub.title},
        true,
        NOW(),
        ${ENGINE_VERSION},
        75
      )
      ON CONFLICT (url) WHERE url IS NOT NULL DO UPDATE SET
        price              = COALESCE(EXCLUDED.price,          fr_listings.price),
        city               = EXCLUDED.city,
        province           = EXCLUDED.province,
        neighborhood       = COALESCE(EXCLUDED.neighborhood,   fr_listings.neighborhood),
        bedrooms           = COALESCE(EXCLUDED.bedrooms,       fr_listings.bedrooms),
        listing_type       = COALESCE(EXCLUDED.listing_type,   fr_listings.listing_type),
        title              = EXCLUDED.title,
        is_active          = true,
        last_seen_at       = NOW(),
        engine_version     = EXCLUDED.engine_version,
        extraction_quality = GREATEST(EXCLUDED.extraction_quality, COALESCE(fr_listings.extraction_quality, 0))
      RETURNING (xmax = 0) AS inserted
    `);
    const row = (result as unknown as { rows?: { inserted: boolean }[] }).rows?.[0];
    return row?.inserted ? "inserted" : "updated";
  } catch {
    return "skipped";
  }
}

// ── Scrape une ville ──────────────────────────────────────────────────────────

export async function scrapeCity(
  cfg:  CityConfig,
  opts: { maxPages?: number; delayMs?: number },
): Promise<ScrapeResult> {
  const maxPages = opts.maxPages ?? 50;
  const delayMs  = opts.delayMs  ?? DEFAULT_DELAY_MS;

  const result: ScrapeResult = {
    city: cfg.city, pages_fetched: 0,
    inserted: 0, updated: 0, skipped: 0, errors: [],
  };

  for (let page = 1; page <= maxPages; page++) {
    const url = pageUrl(cfg, page);
    try {
      const raw = await fetchJson(url);
      const ads = extractAds(raw);

      if (ads.length === 0) break; // fin de pagination

      result.pages_fetched++;

      for (const ad of ads) {
        const stub = adToStub(ad);
        if (!stub) { result.skipped++; continue; }
        const outcome = await upsertListing(stub, cfg);
        result[outcome]++;
      }

      logger.debug(
        { city: cfg.city, page, found: ads.length, inserted: result.inserted },
        "lespac page scraped",
      );

      if (!hasMorePages(raw, page)) break;

      if (page < maxPages) {
        await delay(delayMs + Math.random() * 600);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`page ${page}: ${msg}`);
      logger.warn({ city: cfg.city, page, err: msg }, "lespac page error");
      if (result.errors.length >= 5) break;
    }
  }

  return result;
}

// ── Sonde : inspecter la structure JSON brute (utile pour debug) ──────────────

export async function probeLesPAC(page = 1): Promise<unknown> {
  const cfg = LP_CITIES[0];
  const url = pageUrl(cfg, page);
  logger.info({ url }, "lespac probe");
  return fetchJson(url);
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function runLesPACScraper(opts: {
  maxPages?: number;
  delayMs?:  number;
  cities?:   string[];
}): Promise<ScrapeResult[]> {
  const targets = opts.cities?.length
    ? LP_CITIES.filter(c => (opts.cities as string[]).includes(c.city))
    : LP_CITIES;

  const all: ScrapeResult[] = [];

  for (let i = 0; i < targets.length; i++) {
    const cfg = targets[i];
    logger.info({ city: cfg.city, geoCode: cfg.geoCode, maxPages: opts.maxPages ?? 50 }, "lespac scraper city start");
    const r = await scrapeCity(cfg, opts);
    all.push(r);
    logger.info(
      { city: cfg.city, inserted: r.inserted, updated: r.updated, pages: r.pages_fetched, errors: r.errors.length },
      "lespac scraper city done",
    );
    if (i < targets.length - 1) await delay(3000);
  }

  return all;
}
