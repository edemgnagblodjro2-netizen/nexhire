import https from "node:https";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";

const BASE = "https://www.logisquebec.com";
const ENGINE_VERSION = "logisquebec-v1";
const DEFAULT_DELAY_MS = 1300;

export interface CityConfig {
  path: string;   // URL path fragment: "a-louer/ile-de-montreal/montreal"
  city: string;   // FairRent display name
  province: string;
}

// Confirmed: Montréal /a-louer/ile-de-montreal/montreal/[page] → 4 388 annonces
// Others: paths based on LogisQuébec region/city slug convention — ajuster si 404
export const LQ_CITIES: CityConfig[] = [
  { path: "a-louer/ile-de-montreal/montreal",    city: "Montréal",  province: "QC" },
  { path: "a-louer/capitale-nationale/quebec",   city: "Québec",    province: "QC" },
  { path: "a-louer/outaouais/gatineau",          city: "Gatineau",  province: "QC" },
  { path: "a-louer/laval/laval",                 city: "Laval",     province: "QC" },
  { path: "a-louer/monteregie/longueuil",        city: "Longueuil", province: "QC" },
];

export interface ScrapeResult {
  city: string;
  pages_fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function httpsGet(url: string, redirects = 0): Promise<{ html: string; status: number }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FairRentBot/1.0; +https://fairrent.ca)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-CA,fr;q=0.9",
      },
    }, (res): void => {
      const status = res.statusCode ?? 200;
      if ((status === 301 || status === 302) && res.headers.location && redirects < 3) {
        res.resume();
        httpsGet(res.headers.location, redirects + 1).then(resolve).catch(reject);
        return;
      }
      let html = "";
      res.setEncoding("utf8");
      res.on("data", (c: string) => { html += c; });
      res.on("end", () => resolve({ html, status }));
    });
    req.on("error", reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// ── Parsers ───────────────────────────────────────────────────────────────────

// "1 860$" or "1 860$" → 1860
function parsePrice(raw: string): number | null {
  const clean = raw.replace(/[\s   ]/g, "");
  const m = clean.match(/(\d{3,6})\$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 400 && n <= 15000 ? n : null;
}

// Quebec room notation: "4½" → 2 bedrooms (rooms − 2, minimum 0)
// 1½=0, 2½=0, 3½=1, 4½=2, 5½=3, 6½=4
function roomsToBedrooms(roomStr: string): number | null {
  const m = roomStr.match(/(\d+)/);
  if (!m) return null;
  return Math.max(0, parseInt(m[1], 10) - 2);
}

// URL slug → listing_type string
// /appartement-a-louer-... → "appartement"
// /chambre-et-colocation-a-louer-... → "chambre"
function slugToType(typeSlug: string): string {
  if (typeSlug.startsWith("maison"))  return "maison";
  if (typeSlug.startsWith("condo"))   return "condo";
  if (typeSlug.startsWith("studio"))  return "studio";
  if (typeSlug.includes("chambre") || typeSlug.includes("colocation")) return "chambre";
  if (typeSlug.startsWith("chalet"))  return "chalet";
  return "appartement";
}

interface ListingStub {
  url: string;
  listing_type: string;
  bedrooms: number | null;
  price: number | null;
  neighborhood: string | null;
}

// Extract all listing stubs from a single list-page HTML
function parsePage(html: string): ListingStub[] {
  const results: ListingStub[] = [];
  const seen = new Set<string>();

  // Split HTML into <li> blocks — each listing is one <li>
  const blocks = html.split(/<li[\s>]/i);

  for (const block of blocks) {
    // Listing links match: /[type]-a-louer-[location]-l[ID]
    const linkM = block.match(/href="(\/([\w-]+)-a-louer-[\w_-]+-l(\d+))"/);
    if (!linkM) continue;

    const href      = linkM[1];
    const typeSlug  = linkM[2];
    const listingId = linkM[3];

    if (seen.has(listingId)) continue;
    seen.add(listingId);

    const url          = `${BASE}${href}`;
    const listing_type = slugToType(typeSlug);

    // Price: "1 860$ par mois" — spaces may be non-breaking
    const priceM = block.match(/([\d][\d\s  ]{1,9})\$[\s\S]{0,20}?par\s+mois/i);
    const price  = priceM ? parsePrice(priceM[1] + "$") : null;

    // Rooms: "4½", "4 ½", "4&frac12;", "4&#189;"
    const roomsM   = block.match(/(\d+)\s*(?:½|&frac12;|&#189;)/i);
    const bedrooms = roomsM ? roomsToBedrooms(roomsM[1]) : null;

    // Neighborhood: "Côte-des-Neiges/Notre-Dame-de-Grâce (Montréal)" → strip the "(City)" suffix
    const locM = block.match(/([^<>(]{4,80})\(\s*[^)<]{2,40}\s*\)/);
    let neighborhood: string | null = null;
    if (locM) {
      const raw = locM[1].replace(/[,\s]+$/, "").trim();
      // Skip if it looks like a number (price artifact) or very short
      if (raw.length > 3 && !/^\d/.test(raw)) {
        neighborhood = raw.slice(0, 200);
      }
    }

    // Skip listings without a price — not useful for market-snapshot
    if (!price) continue;

    results.push({ url, listing_type, bedrooms, price, neighborhood });
  }

  return results;
}

// ── DB upsert ─────────────────────────────────────────────────────────────────

async function upsertListing(
  stub: ListingStub,
  cityConfig: CityConfig,
): Promise<"inserted" | "updated" | "skipped"> {
  try {
    const title = stub.listing_type.charAt(0).toUpperCase() + stub.listing_type.slice(1);
    const result = await db.execute(sql`
      INSERT INTO fr_listings (
        url, source, platform,
        city, province, neighborhood,
        price, bedrooms, listing_type, title,
        is_active, last_seen_at, engine_version, extraction_quality
      ) VALUES (
        ${stub.url},
        'logisquebec',
        'logisquebec',
        ${cityConfig.city},
        ${cityConfig.province},
        ${stub.neighborhood},
        ${stub.price},
        ${stub.bedrooms},
        ${stub.listing_type},
        ${title},
        true,
        NOW(),
        ${ENGINE_VERSION},
        60
      )
      ON CONFLICT (url) WHERE url IS NOT NULL DO UPDATE SET
        price          = COALESCE(EXCLUDED.price,          fr_listings.price),
        city           = EXCLUDED.city,
        province       = EXCLUDED.province,
        neighborhood   = COALESCE(EXCLUDED.neighborhood,   fr_listings.neighborhood),
        bedrooms       = COALESCE(EXCLUDED.bedrooms,       fr_listings.bedrooms),
        listing_type   = COALESCE(EXCLUDED.listing_type,   fr_listings.listing_type),
        is_active      = true,
        last_seen_at   = NOW(),
        engine_version = EXCLUDED.engine_version,
        extraction_quality = GREATEST(EXCLUDED.extraction_quality, COALESCE(fr_listings.extraction_quality, 0))
      RETURNING (xmax = 0) AS inserted
    `);
    const row = (result as unknown as { rows?: { inserted: boolean }[] }).rows?.[0];
    return row?.inserted ? "inserted" : "updated";
  } catch {
    return "skipped";
  }
}

// ── Scrape one city ───────────────────────────────────────────────────────────

export async function scrapeCity(
  cityConfig: CityConfig,
  opts: { maxPages?: number; delayMs?: number },
): Promise<ScrapeResult> {
  const maxPages = opts.maxPages ?? 30;
  const delayMs  = opts.delayMs  ?? DEFAULT_DELAY_MS;

  const result: ScrapeResult = {
    city: cityConfig.city,
    pages_fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (let page = 1; page <= maxPages; page++) {
    const pageUrl = `${BASE}/${cityConfig.path}/${page}`;
    try {
      const { html, status } = await httpsGet(pageUrl);

      // Stop conditions: 404, server error, empty response, no more results
      if (status === 404 || status >= 500) break;
      if (html.length < 1000) break;
      if (html.includes("Aucun résultat") || html.includes("aucun résultat")) break;

      const stubs = parsePage(html);
      if (stubs.length === 0) break; // past last page

      result.pages_fetched++;

      for (const stub of stubs) {
        const outcome = await upsertListing(stub, cityConfig);
        result[outcome]++;
      }

      logger.debug(
        { city: cityConfig.city, page, found: stubs.length, inserted: result.inserted },
        "lq page scraped",
      );

      if (page < maxPages) {
        await delay(delayMs + Math.random() * 500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`page ${page}: ${msg}`);
      logger.warn({ city: cityConfig.city, page, err: msg }, "lq page error");
      if (result.errors.length >= 5) break; // abort city on repeated failures
    }
  }

  return result;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runLogisQuebecScraper(opts: {
  maxPages?: number;
  delayMs?: number;
  cities?: string[]; // filter by city display name, e.g. ["Montréal"]
}): Promise<ScrapeResult[]> {
  const targets = opts.cities?.length
    ? LQ_CITIES.filter(c => (opts.cities as string[]).includes(c.city))
    : LQ_CITIES;

  const all: ScrapeResult[] = [];

  for (let i = 0; i < targets.length; i++) {
    const cityConfig = targets[i];
    logger.info({ city: cityConfig.city, maxPages: opts.maxPages ?? 30 }, "lq scraper city start");
    const r = await scrapeCity(cityConfig, opts);
    all.push(r);
    logger.info({ city: cityConfig.city, inserted: r.inserted, updated: r.updated, pages: r.pages_fetched, errors: r.errors.length }, "lq scraper city done");

    // Polite pause between cities
    if (i < targets.length - 1) {
      await delay(3000);
    }
  }

  return all;
}
