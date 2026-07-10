import https from "node:https";
import zlib from "node:zlib";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";

const BASE             = "https://www.lespac.com";
const ENGINE_VERSION   = "lespac-v1";
const DEFAULT_DELAY_MS = 1500;
const CAT              = "b457"; // Immobilier — Location / Logements
const SORT             = "R2";   // Plus récents

export interface CityConfig {
  geoCode:    string;
  regionSlug: string;
  city:       string; // used as DB fallback if cityLabel absent from JSON
  province:   string;
}

// Province QC entière : g15398 — retourne toutes les villes QC.
// Les annonces sont ensuite labellisées par leur propre cityLabel JSON.
// Pour ajouter une ville : naviguer lespac.com, filtrer par ville, copier le
// code gXXXXX dans l'URL (ex. https://www.lespac.com/montreal/..._b457g14981k1R2.jsa)
export const LP_CITIES: CityConfig[] = [
  { geoCode: "g17567", regionSlug: "montreal", city: "Montréal", province: "QC" },
  // Ajouter les codes des autres villes au fur et à mesure :
  // { geoCode: "gXXXXX", regionSlug: "quebec",   city: "Québec",    province: "QC" },
  // { geoCode: "gXXXXX", regionSlug: "laval",    city: "Laval",     province: "QC" },
  // { geoCode: "gXXXXX", regionSlug: "longueuil",city: "Longueuil", province: "QC" },
  // { geoCode: "gXXXXX", regionSlug: "gatineau", city: "Gatineau",  province: "QC" },
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

function getSessionCookies(): string {
  const raw = process.env.LESPAC_COOKIES ?? "";
  if (!raw) return "LpcWebCurrentLanguage=fr_CA; experienceMode=beta";

  const clean = raw.replace(/[^\x20-\x7E]/g, "").replace(/[\r\n]+/g, " ").trim();

  const KEEP = ["AWSALB", "AWSALBCORS", "routewaf", "SID",
                "LpcWebCurrentLanguage", "experienceMode"];
  const parts = clean.split(/;\s*/)
    .filter(p => KEEP.some(k => p.trimStart().startsWith(k + "=")));

  return parts.length > 0 ? parts.join("; ") : clean;
}

function fetchHtml(url: string): Promise<{ html: string; status: number }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-CA,fr;q=0.9,en-CA;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control":   "no-cache",
        "Cookie":          getSessionCookies(),
        "Connection":      "keep-alive",
      },
    }, (res) => {
      const status = res.statusCode ?? 200;
      const enc    = res.headers["content-encoding"] ?? "";

      if ((status === 301 || status === 302) && res.headers.location) {
        res.resume();
        fetchHtml(res.headers.location).then(resolve).catch(reject);
        return;
      }

      let stream: NodeJS.ReadableStream = res;
      if (enc === "gzip" || enc === "x-gzip") {
        stream = res.pipe(zlib.createGunzip());
      } else if (enc === "deflate") {
        stream = res.pipe(zlib.createInflate());
      } else if (enc === "br") {
        stream = res.pipe(zlib.createBrotliDecompress());
      }

      const chunks: Buffer[] = [];
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8"), status }));
      stream.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function pageUrl(cfg: CityConfig, page: number): string {
  return `${BASE}/${cfg.regionSlug}/immobilier-location-logements_${CAT}${cfg.geoCode}k${page}${SORT}.jsa`;
}

// ── Parser JSON ───────────────────────────────────────────────────────────────
//
// LesPAC embeds listing data as JSON blobs in the HTML.
// Each listing starts with "listingPublicId":"NNNN" and contains
// price, title, listingDisplayUrl, cityLabel in the ~4000 chars following.

interface ListingStub {
  url:          string;
  listing_type: string;
  bedrooms:     number | null;
  price:        number | null;
  city:         string | null; // part before " / " in cityLabel, e.g. "Montréal"
  neighborhood: string | null; // part after " / " in cityLabel, e.g. "Plateau Mont-Royal"
  title:        string;
}

function typeFromText(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("maison"))                           return "maison";
  if (t.includes("condo"))                            return "condo";
  if (t.includes("studio"))                           return "studio";
  if (t.includes("chambre") || t.includes("coloc"))  return "chambre";
  if (t.includes("chalet"))                           return "chalet";
  return "appartement";
}

function parseBedrooms(title: string): number | null {
  const halfM = title.match(/(\d+)\s*(?:½|1\/2|1-2)\s*pi[eè]/i);
  if (halfM) return Math.max(0, parseInt(halfM[1], 10) - 2);
  const roomsM = title.match(/(\d+)\s*pi[eè]/i);
  if (roomsM) return Math.max(0, parseInt(roomsM[1], 10) - 2);
  const chambreM = title.match(/(\d+)\s*(?:chambre|bedroom)/i);
  if (chambreM) return parseInt(chambreM[1], 10);
  return null;
}

function decodeJsonStr(s: string): string {
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s
      .replace(/\\n/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

function parsePage(html: string): ListingStub[] {
  const results: ListingStub[] = [];
  const seen = new Set<string>();

  const RE = /"listingPublicId":"(\d+)"/g;
  let m: RegExpExecArray | null;

  while ((m = RE.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);

    // 4000-char window — cityLabel is typically ~2000–3500 chars after the listingPublicId
    const ctx = html.slice(m.index, m.index + 4000);

    const priceM = ctx.match(/"price":(\d+(?:\.\d+)?)/);
    if (!priceM) continue;
    const price = Math.round(parseFloat(priceM[1]));
    if (price < 400 || price > 15000) continue;

    const titleM = ctx.match(/"title":"([^"]{3,300})"/);
    const title = titleM ? decodeJsonStr(titleM[1]) : "Logement à louer";

    const urlM = ctx.match(/"listingDisplayUrl":"(https:[^"?\\]+)/);
    const url = urlM ? urlM[1] : `${BASE}/annonce/${id}`;

    const cityM = ctx.match(/"cityLabel":"([^"]+)"/);
    // "Montréal / Plateau Mont-Royal" → city="Montréal", neighborhood="Plateau Mont-Royal"
    // "Longueuil" → city="Longueuil", neighborhood=null
    const [cityPart, nbhPart] = cityM
      ? cityM[1].split(" / ").map(s => s.trim())
      : [null, null];

    results.push({
      url,
      listing_type: typeFromText(title),
      bedrooms:     parseBedrooms(title),
      price,
      city:         cityPart ?? null,
      neighborhood: nbhPart  ?? null,
      title:        title.slice(0, 500),
    });
  }

  return results;
}

// ── DB upsert ─────────────────────────────────────────────────────────────────

async function upsertListing(
  stub: ListingStub,
  cfg:  CityConfig,
): Promise<"inserted" | "updated" | "skipped"> {
  const city = stub.city ?? cfg.city;
  try {
    const result = await db.execute(sql`
      INSERT INTO fr_listings (
        url, source, platform,
        city, province, neighborhood,
        price, bedrooms, listing_type, title,
        is_active, last_seen_at, engine_version, extraction_quality
      ) VALUES (
        ${stub.url}, 'lespac', 'lespac',
        ${city}, ${cfg.province}, ${stub.neighborhood},
        ${stub.price}, ${stub.bedrooms}, ${stub.listing_type}, ${stub.title},
        true, NOW(), ${ENGINE_VERSION}, 65
      )
      ON CONFLICT (url) WHERE url IS NOT NULL DO UPDATE SET
        price              = COALESCE(EXCLUDED.price,        fr_listings.price),
        city               = EXCLUDED.city,
        province           = EXCLUDED.province,
        neighborhood       = COALESCE(EXCLUDED.neighborhood, fr_listings.neighborhood),
        bedrooms           = COALESCE(EXCLUDED.bedrooms,     fr_listings.bedrooms),
        listing_type       = COALESCE(EXCLUDED.listing_type, fr_listings.listing_type),
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
      const { html, status } = await fetchHtml(url);

      if (status === 404 || status >= 500) break;
      if (html.length < 500) break;
      if (html.includes("Aucun résultat") || html.includes("aucune annonce")) break;

      const stubs = parsePage(html);
      if (stubs.length === 0) break;

      result.pages_fetched++;

      for (const stub of stubs) {
        const outcome = await upsertListing(stub, cfg);
        result[outcome]++;
      }

      logger.debug(
        { city: cfg.city, page, found: stubs.length, inserted: result.inserted },
        "lespac page scraped",
      );

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

// ── Probe ─────────────────────────────────────────────────────────────────────

export async function probeLesPAC(page = 1): Promise<Record<string, unknown>> {
  const cfg = LP_CITIES[0];
  const url = pageUrl(cfg, page);
  logger.info({ url }, "lespac probe");
  const { html, status } = await fetchHtml(url);
  const stubs = parsePage(html);

  const hrefRe = /href="([^"]{5,120})"/gi;
  const hrefs = new Set<string>();
  let hm: RegExpExecArray | null;
  while ((hm = hrefRe.exec(html)) !== null) {
    const h = hm[1];
    if (!h.startsWith("http") && !h.startsWith("#") && !h.startsWith("javascript")) {
      hrefs.add(h);
    }
  }

  const mid = Math.floor(html.length / 2);
  const html_mid = html.slice(Math.max(0, mid - 1500), mid + 1500);

  const cookieEnv = process.env.LESPAC_COOKIES ?? "";
  return {
    url, status,
    cookies_env_set:    cookieEnv.length > 0,
    cookies_env_length: cookieEnv.length,
    cookies_has_sid:    cookieEnv.includes("SID="),
    cookies_has_awsalb: cookieEnv.includes("AWSALB="),
    parsed_count:  stubs.length,
    parsed_sample: stubs.slice(0, 3),
    hrefs_sample:  [...hrefs].slice(0, 40),
    html_mid,
  };
}

// ── Discover geo codes ────────────────────────────────────────────────────────
// Récupère la page de recherche sans filtre geo et extrait les liens de villes
// pour identifier les codes gXXXXX à ajouter dans LP_CITIES.

export async function discoverGeoCodes(): Promise<{
  page_url: string;
  status: number;
  city_options: { label: string; geo_code: string; url: string }[];
  raw_filter_html: string;
}> {
  // Province-wide without geo sub-filter to see the city picker
  const url = `${BASE}/quebec/immobilier-location-logements_${CAT}k1${SORT}.jsa`;
  const { html, status } = await fetchHtml(url);

  // LesPAC embeds filter options as JSON or as links like:
  // href="/quebec/..._b457gXXXXXk1R2.jsa">Montréal</a>
  const geoLinkRe = /href="([^"]*?_b457(g\d{4,7})[^"]*?)"[^>]*>([^<]{2,60})<\/a>/gi;
  const city_options: { label: string; geo_code: string; url: string }[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;

  while ((m = geoLinkRe.exec(html)) !== null) {
    const geoCode = m[2];
    const label   = m[3].trim().replace(/\s+/g, " ");
    if (!seen.has(geoCode) && label.length > 1 && geoCode !== "g15398") {
      seen.add(geoCode);
      city_options.push({ label, geo_code: geoCode, url: `${BASE}${m[1]}` });
    }
  }

  // Also look for geo codes embedded in JSON filter state
  const jsonGeoRe = /"geoCode"\s*:\s*"(g\d{4,7})"\s*,\s*"label"\s*:\s*"([^"]{2,60})"/gi;
  while ((m = jsonGeoRe.exec(html)) !== null) {
    const geoCode = m[1];
    const label   = m[2].trim();
    if (!seen.has(geoCode) && geoCode !== "g15398") {
      seen.add(geoCode);
      city_options.push({ label, geo_code: geoCode, url: `${BASE}/quebec/immobilier-location-logements_${CAT}${geoCode}k1${SORT}.jsa` });
    }
  }

  // Return a chunk of HTML likely to contain the filter sidebar
  const filterIdx = html.indexOf("b457");
  const raw_filter_html = filterIdx >= 0
    ? html.slice(Math.max(0, filterIdx - 200), filterIdx + 3000)
    : html.slice(0, 3000);

  return { page_url: url, status, city_options, raw_filter_html };
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
    logger.info({ city: cfg.city, geoCode: cfg.geoCode }, "lespac city start");
    const r = await scrapeCity(cfg, opts);
    all.push(r);
    logger.info({ city: cfg.city, inserted: r.inserted, updated: r.updated, pages: r.pages_fetched }, "lespac city done");
    if (i < targets.length - 1) await delay(3000);
  }
  return all;
}
