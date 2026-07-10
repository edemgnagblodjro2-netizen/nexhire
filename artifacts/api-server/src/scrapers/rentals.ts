import https from "node:https";
import zlib from "node:zlib";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";

const BASE           = "https://rentals.ca";
const ENGINE_VERSION = "rentals-v1";
const DELAY_MS       = 2000;

export interface CityConfig {
  slug:     string; // URL slug, e.g. "a-louer-montreal"
  city:     string;
  province: string;
}

export const RENTALS_CITIES: CityConfig[] = [
  { slug: "a-louer-prince-edward", city: "Charlottetown",    province: "PE" },
  { slug: "montreal",               city: "Montréal",         province: "QC" },
  { slug: "toronto",                city: "Toronto",          province: "ON" },
  { slug: "vancouver",              city: "Vancouver",        province: "BC" },
  { slug: "calgary",                city: "Calgary",          province: "AB" },
  { slug: "ottawa",                 city: "Ottawa",           province: "ON" },
  { slug: "edmonton",               city: "Edmonton",         province: "AB" },
  { slug: "winnipeg",               city: "Winnipeg",         province: "MB" },
  { slug: "halifax",                city: "Halifax",          province: "NS" },
  { slug: "a-louer-quebec",         city: "Québec",           province: "QC" },
];

export interface ScrapeResult {
  city:          string;
  pages_fetched: number;
  inserted:      number;
  updated:       number;
  skipped:       number;
  errors:        string[];
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function fetchHtml(url: string, depth = 0): Promise<{ html: string; status: number }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-CA,fr;q=0.9,en-CA;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control":   "no-cache",
      },
    }, (res) => {
      const status = res.statusCode ?? 200;
      const loc    = res.headers.location;
      if ((status === 301 || status === 302) && loc && depth < 3) {
        res.resume();
        const next = loc.startsWith("http") ? loc : `${BASE}${loc}`;
        fetchHtml(next, depth + 1).then(resolve).catch(reject);
        return;
      }
      const enc = res.headers["content-encoding"] ?? "";
      let stream: NodeJS.ReadableStream = res;
      if (enc === "gzip" || enc === "x-gzip") stream = res.pipe(zlib.createGunzip());
      else if (enc === "deflate")              stream = res.pipe(zlib.createInflate());
      else if (enc === "br")                   stream = res.pipe(zlib.createBrotliDecompress());
      const chunks: Buffer[] = [];
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end",  () => resolve({ html: Buffer.concat(chunks).toString("utf8"), status }));
      stream.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function pageUrl(cfg: CityConfig, page: number): string {
  const base = `${BASE}/fr/${cfg.slug}`;
  return page === 1 ? base : `${base}?page=${page}`;
}

interface ListingStub {
  url:          string;
  listing_type: string;
  bedrooms:     number | null;
  price:        number | null;
  city:         string;
  neighborhood: string | null;
  title:        string;
}

function typeFromText(t: string): string {
  const s = (t ?? "").toLowerCase();
  if (s.includes("house") || s.includes("maison"))     return "maison";
  if (s.includes("condo"))                              return "condo";
  if (s.includes("studio"))                             return "studio";
  if (s.includes("room") || s.includes("chambre"))     return "chambre";
  if (s.includes("townhouse") || s.includes("townhome")) return "townhouse";
  if (s.includes("basement") || s.includes("sous-sol")) return "basement";
  return "appartement";
}

// Strategy 1: Next.js __NEXT_DATA__ JSON blob
function parseNextData(html: string, cfg: CityConfig): ListingStub[] {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  try {
    const data = JSON.parse(m[1]);
    // rentals.ca pageProps structure varies — try multiple known paths
    const candidates = [
      data?.props?.pageProps?.listings,
      data?.props?.pageProps?.data?.listings,
      data?.props?.pageProps?.initialProps?.listings,
      data?.props?.pageProps?.searchResults,
    ].filter(Boolean);

    const listings = candidates[0];
    if (!Array.isArray(listings)) return [];

    return listings.flatMap((item: any) => {
      const price = parseInt(String(item.price ?? item.rent ?? item.monthly_rent ?? ""), 10);
      if (!price || price < 400 || price > 20000) return [];

      const url = item.permalink ?? item.url ?? item.listing_url ?? "";
      if (!url) return [];
      const fullUrl = url.startsWith("http") ? url : `${BASE}${url}`;

      const title = item.title ?? item.name ?? item.address ?? "Logement à louer";
      const beds  = item.bedrooms ?? item.beds ?? null;
      const type  = item.type ?? item.unit_type ?? typeFromText(title);
      const nbh   = item.neighbourhood ?? item.neighborhood ?? item.area ?? null;

      return [{
        url:          fullUrl,
        listing_type: typeFromText(type + " " + title),
        bedrooms:     beds != null ? parseInt(String(beds), 10) || null : null,
        price,
        city:         item.city ?? cfg.city,
        neighborhood: nbh ? String(nbh).slice(0, 120) : null,
        title:        String(title).slice(0, 500),
      }];
    });
  } catch {
    return [];
  }
}

// Strategy 2: JSON-LD RealEstateListing
function parseJsonLd(html: string, cfg: CityConfig): ListingStub[] {
  const results: ListingStub[] = [];
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      const items = Array.isArray(obj) ? obj : (obj["@graph"] ?? [obj]);
      for (const item of items) {
        if (item["@type"] !== "Apartment" && item["@type"] !== "RealEstateListing") continue;
        const priceSpec = item.offers ?? item.priceSpecification;
        const price = parseInt(String(priceSpec?.price ?? priceSpec?.lowPrice ?? ""), 10);
        if (!price || price < 400 || price > 20000) continue;
        const url = item.url ?? item["@id"] ?? "";
        if (!url) continue;
        results.push({
          url:          url.startsWith("http") ? url : `${BASE}${url}`,
          listing_type: typeFromText(item.name ?? ""),
          bedrooms:     item.numberOfRooms ? Math.max(0, parseInt(String(item.numberOfRooms), 10) - 1) : null,
          price,
          city:         item.address?.addressLocality ?? cfg.city,
          neighborhood: item.address?.addressRegion ?? null,
          title:        String(item.name ?? "Logement à louer").slice(0, 500),
        });
      }
    } catch { /* skip malformed */ }
  }
  return results;
}

// Strategy 3: HTML attribute scraping (data-id, data-price on listing cards)
function parseHtmlAttrs(html: string, cfg: CityConfig): ListingStub[] {
  const results: ListingStub[] = [];
  const seen = new Set<string>();

  // Match canonical listing links with price nearby: href="/listing/..." or /fr/...
  const linkRe = /href="(\/(?:fr\/)?[a-z0-9-]+\/[a-z0-9-]+-\d+[^"]{0,80})"/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    if (seen.has(href)) continue;
    seen.add(href);

    const ctx = html.slice(Math.max(0, m.index - 200), m.index + 2000);

    // Extract price from nearby context
    const priceM = ctx.match(/\$\s*(\d[\d,\s]*)\s*(?:\/?\s*(?:month|mo|mois|m))/i)
      ?? ctx.match(/"price"\s*:\s*"?(\d+)"?/)
      ?? ctx.match(/data-price="(\d+)"/);
    if (!priceM) continue;
    const price = parseInt(priceM[1].replace(/[,\s]/g, ""), 10);
    if (!price || price < 400 || price > 20000) continue;

    // Title
    const titleM = ctx.match(/(?:data-title|aria-label|alt)="([^"]{5,200})"/i)
      ?? ctx.match(/<h[23][^>]*>([^<]{5,200})<\/h[23]>/i);
    const title = titleM ? titleM[1].trim() : `Logement à louer — ${cfg.city}`;

    // Bedrooms
    const bedM = ctx.match(/(\d+)\s*(?:bed|bedroom|bdr|br|chambre)/i);
    const beds = bedM ? parseInt(bedM[1], 10) : null;

    results.push({
      url:          `${BASE}${href}`,
      listing_type: typeFromText(title),
      bedrooms:     beds,
      price,
      city:         cfg.city,
      neighborhood: null,
      title:        title.slice(0, 500),
    });
  }
  return results;
}

function parsePage(html: string, cfg: CityConfig): ListingStub[] {
  const from_next = parseNextData(html, cfg);
  if (from_next.length > 0) return from_next;

  const from_ld = parseJsonLd(html, cfg);
  if (from_ld.length > 0) return from_ld;

  return parseHtmlAttrs(html, cfg);
}

function hasMorePages(html: string, page: number): boolean {
  // next page link present
  return html.includes(`page=${page + 1}`) || html.includes(`"nextPage"`) || html.includes(`rel="next"`);
}

async function upsertListing(stub: ListingStub, cfg: CityConfig): Promise<"inserted" | "updated" | "skipped"> {
  try {
    const result = await db.execute(sql`
      INSERT INTO fr_listings (
        url, source, platform,
        city, province, neighborhood,
        price, bedrooms, listing_type, title,
        is_active, last_seen_at, engine_version, extraction_quality
      ) VALUES (
        ${stub.url}, 'rentals', 'rentals',
        ${stub.city}, ${cfg.province}, ${stub.neighborhood},
        ${stub.price}, ${stub.bedrooms}, ${stub.listing_type}, ${stub.title},
        true, NOW(), ${ENGINE_VERSION}, 70
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

export async function scrapeCity(cfg: CityConfig, opts: { maxPages?: number; delayMs?: number }): Promise<ScrapeResult> {
  const maxPages = opts.maxPages ?? 20;
  const delayMs  = opts.delayMs  ?? DELAY_MS;
  const result: ScrapeResult = { city: cfg.city, pages_fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (let page = 1; page <= maxPages; page++) {
    const url = pageUrl(cfg, page);
    try {
      const { html, status } = await fetchHtml(url);
      if (status === 404 || status >= 500) break;
      if (html.length < 1000) break;
      if (html.includes("No listings found") || html.includes("Aucun logement")) break;

      const stubs = parsePage(html, cfg);
      if (stubs.length === 0) {
        if (page > 1) break; // no results past page 1 = end
        result.errors.push(`page ${page}: 0 annonces parsées`);
        break;
      }

      result.pages_fetched++;
      for (const stub of stubs) {
        const outcome = await upsertListing(stub, cfg);
        result[outcome]++;
      }

      logger.debug({ city: cfg.city, page, found: stubs.length }, "rentals page scraped");

      if (!hasMorePages(html, page)) break;
      if (page < maxPages) await delay(delayMs + Math.random() * 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`page ${page}: ${msg}`);
      logger.warn({ city: cfg.city, page, err: msg }, "rentals page error");
      if (result.errors.length >= 5) break;
    }
  }
  return result;
}

export async function runRentalsScraper(opts: { maxPages?: number; delayMs?: number; cities?: string[] }): Promise<ScrapeResult[]> {
  const targets = opts.cities?.length
    ? RENTALS_CITIES.filter(c => opts.cities!.includes(c.city) || opts.cities!.includes(c.slug))
    : RENTALS_CITIES;

  const all: ScrapeResult[] = [];
  for (let i = 0; i < targets.length; i++) {
    const cfg = targets[i];
    logger.info({ city: cfg.city, slug: cfg.slug }, "rentals city start");
    const r = await scrapeCity(cfg, opts);
    all.push(r);
    logger.info({ city: cfg.city, inserted: r.inserted, updated: r.updated, pages: r.pages_fetched, errors: r.errors }, "rentals city done");
    if (i < targets.length - 1) await delay(4000);
  }
  return all;
}
