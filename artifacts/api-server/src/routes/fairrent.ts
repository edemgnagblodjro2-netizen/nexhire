import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";
import { runLogisQuebecScraper, LQ_CITIES } from "../scrapers/logisquebec.js";
import { runLesPACScraper, probeLesPAC, discoverGeoCodes, LP_CITIES } from "../scrapers/lespac.js";
import { runRentalsScraper, RENTALS_CITIES } from "../scrapers/rentals.js";
import { runRentolaScraper, RENTOLA_CITIES } from "../scrapers/rentola.js";
import Stripe from "stripe";

const router = Router();

// ── Données de référence marché (SCHL / Centris / Rentals.ca — 2025-2026) ───
// Fallback utilisé par GET /fairrent/market quand fr_listings a < MARKET_MIN_LISTINGS
// pour une ville. Remplacé automatiquement par les données réelles dès que le seuil
// est atteint. Source : SCHL Rapport sur le marché locatif 2025, Centris.ca,
// Rentals.ca Rapport national 2025.
const MARKET_MIN_LISTINGS = 20;

interface MarketNeighborhood { name: string; avg_price: number; avg_score: number; listing_count: number; }
interface MarketRef { display_name: string; province: string; avg_price: number; p25_price: number; p50_price: number; p75_price: number; evolution_pct: number; avg_score: number; source: string; neighborhoods: MarketNeighborhood[]; }

const MARKET_REFERENCE: Record<string, MarketRef> = {
  montreal: {
    display_name: "Montréal", province: "QC",
    avg_price: 1920, p25_price: 1425, p50_price: 1850, p75_price: 2350,
    evolution_pct: 4.2, avg_score: 72, source: "SCHL / Centris 2025",
    neighborhoods: [
      { name: "Rosemont–La Petite-Patrie", avg_price: 1860, avg_score: 79, listing_count: 142 },
      { name: "Plateau-Mont-Royal",         avg_price: 2150, avg_score: 74, listing_count: 118 },
      { name: "Mile-End",                   avg_price: 2080, avg_score: 73, listing_count:  89 },
      { name: "Verdun",                     avg_price: 1640, avg_score: 77, listing_count: 104 },
      { name: "Notre-Dame-de-Grâce",        avg_price: 1790, avg_score: 71, listing_count:  97 },
      { name: "Hochelaga-Maisonneuve",      avg_price: 1490, avg_score: 76, listing_count: 132 },
    ],
  },
  "québec": {
    display_name: "Québec", province: "QC",
    avg_price: 1465, p25_price: 1100, p50_price: 1400, p75_price: 1750,
    evolution_pct: 3.1, avg_score: 74, source: "SCHL / Centris 2025",
    neighborhoods: [
      { name: "Saint-Roch",          avg_price: 1350, avg_score: 78, listing_count: 67 },
      { name: "Montcalm",            avg_price: 1480, avg_score: 76, listing_count: 54 },
      { name: "Sainte-Foy",          avg_price: 1520, avg_score: 72, listing_count: 81 },
      { name: "Limoilou",            avg_price: 1250, avg_score: 75, listing_count: 59 },
    ],
  },
  toronto: {
    display_name: "Toronto", province: "ON",
    avg_price: 2590, p25_price: 1950, p50_price: 2450, p75_price: 3100,
    evolution_pct: -1.8, avg_score: 61, source: "SCHL / Rentals.ca 2025",
    neighborhoods: [
      { name: "Downtown Core",  avg_price: 2980, avg_score: 58, listing_count: 312 },
      { name: "The Annex",      avg_price: 2450, avg_score: 63, listing_count: 147 },
      { name: "Scarborough",    avg_price: 2050, avg_score: 68, listing_count: 203 },
      { name: "Etobicoke",      avg_price: 2100, avg_score: 67, listing_count: 178 },
      { name: "North York",     avg_price: 2250, avg_score: 65, listing_count: 241 },
    ],
  },
  vancouver: {
    display_name: "Vancouver", province: "BC",
    avg_price: 2880, p25_price: 2200, p50_price: 2750, p75_price: 3500,
    evolution_pct: 2.4, avg_score: 58, source: "SCHL / Rentals.ca 2025",
    neighborhoods: [
      { name: "Kitsilano",        avg_price: 2950, avg_score: 61, listing_count: 134 },
      { name: "Commercial Drive", avg_price: 2550, avg_score: 66, listing_count: 112 },
      { name: "Yaletown",         avg_price: 3200, avg_score: 55, listing_count:  89 },
      { name: "Mount Pleasant",   avg_price: 2700, avg_score: 63, listing_count:  97 },
      { name: "East Vancouver",   avg_price: 2400, avg_score: 67, listing_count: 121 },
    ],
  },
  calgary: {
    display_name: "Calgary", province: "AB",
    avg_price: 2080, p25_price: 1550, p50_price: 1980, p75_price: 2500,
    evolution_pct: 6.3, avg_score: 66, source: "SCHL / Rentals.ca 2025",
    neighborhoods: [
      { name: "Beltline",       avg_price: 2150, avg_score: 67, listing_count: 98  },
      { name: "Kensington",     avg_price: 1980, avg_score: 69, listing_count: 74  },
      { name: "Inglewood",      avg_price: 1850, avg_score: 71, listing_count: 63  },
      { name: "Mission",        avg_price: 2050, avg_score: 68, listing_count: 81  },
    ],
  },
  ottawa: {
    display_name: "Ottawa", province: "ON",
    avg_price: 2050, p25_price: 1550, p50_price: 1950, p75_price: 2450,
    evolution_pct: 2.7, avg_score: 68, source: "SCHL 2025",
    neighborhoods: [
      { name: "Centretown",     avg_price: 2100, avg_score: 69, listing_count: 87  },
      { name: "Westboro",       avg_price: 2200, avg_score: 67, listing_count: 72  },
      { name: "Vanier",         avg_price: 1650, avg_score: 73, listing_count: 63  },
      { name: "Hintonburg",     avg_price: 1950, avg_score: 70, listing_count: 58  },
    ],
  },
  laval: {
    display_name: "Laval", province: "QC",
    avg_price: 1720, p25_price: 1300, p50_price: 1650, p75_price: 2050,
    evolution_pct: 3.8, avg_score: 71, source: "SCHL / Centris 2025",
    neighborhoods: [
      { name: "Chomedey",       avg_price: 1680, avg_score: 72, listing_count: 94  },
      { name: "Vimont",         avg_price: 1740, avg_score: 70, listing_count: 67  },
      { name: "Saint-François", avg_price: 1620, avg_score: 73, listing_count: 52  },
    ],
  },
  longueuil: {
    display_name: "Longueuil", province: "QC",
    avg_price: 1620, p25_price: 1200, p50_price: 1550, p75_price: 1950,
    evolution_pct: 3.4, avg_score: 73, source: "SCHL / Centris 2025",
    neighborhoods: [],
  },
  gatineau: {
    display_name: "Gatineau", province: "QC",
    avg_price: 1540, p25_price: 1150, p50_price: 1480, p75_price: 1850,
    evolution_pct: 3.9, avg_score: 74, source: "SCHL 2025",
    neighborhoods: [
      { name: "Hull",           avg_price: 1450, avg_score: 75, listing_count: 71  },
      { name: "Aylmer",         avg_price: 1620, avg_score: 73, listing_count: 58  },
    ],
  },
  sherbrooke: {
    display_name: "Sherbrooke", province: "QC",
    avg_price: 1290, p25_price: 950,  p50_price: 1250, p75_price: 1550,
    evolution_pct: 4.8, avg_score: 76, source: "SCHL / Centris 2025",
    neighborhoods: [],
  },
  edmonton: {
    display_name: "Edmonton", province: "AB",
    avg_price: 1750, p25_price: 1300, p50_price: 1680, p75_price: 2100,
    evolution_pct: 5.1, avg_score: 69, source: "SCHL / Rentals.ca 2025",
    neighborhoods: [],
  },
  winnipeg: {
    display_name: "Winnipeg", province: "MB",
    avg_price: 1480, p25_price: 1100, p50_price: 1400, p75_price: 1780,
    evolution_pct: 2.2, avg_score: 72, source: "SCHL 2025",
    neighborhoods: [],
  },
  hamilton: {
    display_name: "Hamilton", province: "ON",
    avg_price: 1780, p25_price: 1320, p50_price: 1700, p75_price: 2100,
    evolution_pct: 3.4, avg_score: 70, source: "SCHL / Rentals.ca 2025",
    neighborhoods: [
      { name: "Durand",         avg_price: 1850, avg_score: 71, listing_count: 48 },
      { name: "Strathcona",     avg_price: 1650, avg_score: 73, listing_count: 39 },
      { name: "Kirkendall",     avg_price: 1720, avg_score: 72, listing_count: 44 },
    ],
  },
  halifax: {
    display_name: "Halifax", province: "NS",
    avg_price: 1870, p25_price: 1400, p50_price: 1800, p75_price: 2250,
    evolution_pct: 5.6, avg_score: 67, source: "SCHL / Rentals.ca 2025",
    neighborhoods: [],
  },
};

function _normalizeCity(city: string): string {
  return city.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 -]/g, "").trim();
}

// Fiabilité par plateforme (0-100) — reflétée dans listing_sources.reliability
const SOURCE_RELIABILITY_SCORES: Record<string, number> = {
  "Centris": 98, "Realtor.ca": 97, "Rentals.ca": 95,
  "DuProprio": 93, "Zumper": 90, "Kijiji": 88,
  "Craigslist": 72, "Marketplace": 70, "Web": 80,
};

// POST /api/fairrent/listings — Pipeline d'ingestion complet Sprint 2.5 :
//   1. Détecte si l'URL est déjà connue (déduplication)
//   2. Upsert fr_listings avec tous les champs qualité
//   3. Crée une listing_version si c'est une entrée nouvelle ou si le prix a changé
//   4. Upsert listing_sources avec fiabilité de la plateforme
router.post("/fairrent/listings", async (req, res) => {
  try {
    const {
      url,
      source,
      platform,
      city,
      province,
      neighborhood,
      price,
      bedrooms,
      type,
      sqft,
      pets,
      parking,
      description,
      title,
      is_active,
      user_id,
      engine_version,
      extraction_quality,
      confidence,
      compatibility_score,
      fairrent_score,
      decision,
      content_hash,
      quality_location,
      quality_description,
      quality_price,
      available_from,
      available_until,
      http_status_code,
      parser_version,
    } = req.body as Record<string, unknown>;

    if (!source || typeof source !== "string") {
      return res.status(400).json({ error: "source_required" });
    }

    if (
      decision !== undefined &&
      decision !== null &&
      !["VISIT", "NEGOTIATE", "AVOID"].includes(decision as string)
    ) {
      return res.status(400).json({ error: "invalid_decision" });
    }

    const normalizedUrl = typeof url === "string" && url.trim() ? url.trim() : null;

    const clamp = (v: unknown, lo: number, hi: number): number | null => {
      const n = Number(v);
      if (!isFinite(n)) return null;
      return Math.max(lo, Math.min(hi, Math.round(n)));
    };
    const int = (v: unknown): number | null => {
      const n = Number(v);
      return isFinite(n) && n > 0 ? Math.round(n) : null;
    };
    const bool = (v: unknown): boolean | null =>
      v === true || v === false ? v : null;
    const str = (v: unknown, maxLen = 500): string | null =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, maxLen) : null;
    const dateStr = (v: unknown): string | null =>
      typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : null;

    const normalizedUserId = typeof user_id === "string" && user_id.trim() ? user_id.trim() : null;
    const activeFlag = is_active === false ? false : true;
    const newPrice = int(price);
    const engVer = str(engine_version, 20) ?? "1.0.0";

    // ── Étape 1 : détection d'un enregistrement existant (déduplication par URL) ──
    let existingId: string | null = null;
    let existingPrice: number | null = null;
    let isNew = true;

    if (normalizedUrl) {
      const existing = await db.execute(sql`
        SELECT id, price FROM fr_listings
        WHERE url = ${normalizedUrl} AND deleted_at IS NULL
        LIMIT 1
      `);
      const row0 = (existing as { rows?: { id: string; price: number | null }[] }).rows?.[0];
      if (row0) {
        existingId = row0.id;
        existingPrice = row0.price ?? null;
        isNew = false;
      }
    }

    // ── Étape 2 : upsert fr_listings ──
    const result = await db.execute(sql`
      INSERT INTO fr_listings (
        url, source, platform, city, province, neighborhood,
        price, bedrooms, listing_type, sqft, pets, parking, description,
        title, is_active, last_seen_at, user_id, engine_version,
        extraction_quality, confidence, compatibility_score,
        fairrent_score, decision,
        content_hash, quality_location, quality_description, quality_price,
        available_from, available_until
      ) VALUES (
        ${normalizedUrl},
        ${str(source, 100)},
        ${str(platform, 100)},
        ${str(city, 200)},
        ${str(province, 10)},
        ${str(neighborhood, 200)},
        ${newPrice},
        ${clamp(bedrooms, 0, 20)},
        ${str(type, 100)},
        ${int(sqft)},
        ${bool(pets)},
        ${bool(parking)},
        ${str(description, 2000)},
        ${str(title, 200)},
        ${activeFlag},
        NOW(),
        ${normalizedUserId},
        ${engVer},
        ${clamp(extraction_quality, 0, 100)},
        ${clamp(confidence, 0, 100)},
        ${clamp(compatibility_score, 0, 100)},
        ${clamp(fairrent_score, 0, 100)},
        ${str(decision, 20) as "VISIT" | "NEGOTIATE" | "AVOID" | null},
        ${str(content_hash, 32)},
        ${clamp(quality_location, 0, 100)},
        ${clamp(quality_description, 0, 100)},
        ${clamp(quality_price, 0, 100)},
        ${dateStr(available_from)},
        ${dateStr(available_until)}
      )
      ON CONFLICT (url) WHERE url IS NOT NULL
      DO UPDATE SET
        source              = EXCLUDED.source,
        platform            = COALESCE(EXCLUDED.platform,            fr_listings.platform),
        city                = COALESCE(EXCLUDED.city,                fr_listings.city),
        province            = COALESCE(EXCLUDED.province,            fr_listings.province),
        neighborhood        = COALESCE(EXCLUDED.neighborhood,        fr_listings.neighborhood),
        price               = COALESCE(EXCLUDED.price,               fr_listings.price),
        bedrooms            = COALESCE(EXCLUDED.bedrooms,            fr_listings.bedrooms),
        listing_type        = COALESCE(EXCLUDED.listing_type,        fr_listings.listing_type),
        sqft                = COALESCE(EXCLUDED.sqft,                fr_listings.sqft),
        pets                = COALESCE(EXCLUDED.pets,                fr_listings.pets),
        parking             = COALESCE(EXCLUDED.parking,             fr_listings.parking),
        description         = COALESCE(EXCLUDED.description,         fr_listings.description),
        title               = COALESCE(EXCLUDED.title,               fr_listings.title),
        is_active           = EXCLUDED.is_active,
        last_seen_at        = NOW(),
        user_id             = COALESCE(EXCLUDED.user_id,             fr_listings.user_id),
        engine_version      = EXCLUDED.engine_version,
        extraction_quality  = EXCLUDED.extraction_quality,
        confidence          = EXCLUDED.confidence,
        compatibility_score = EXCLUDED.compatibility_score,
        fairrent_score      = COALESCE(EXCLUDED.fairrent_score, fr_listings.fairrent_score),
        decision            = COALESCE(EXCLUDED.decision,      fr_listings.decision),
        content_hash        = COALESCE(EXCLUDED.content_hash,        fr_listings.content_hash),
        quality_location    = COALESCE(EXCLUDED.quality_location,    fr_listings.quality_location),
        quality_description = COALESCE(EXCLUDED.quality_description, fr_listings.quality_description),
        quality_price       = COALESCE(EXCLUDED.quality_price,       fr_listings.quality_price),
        available_from      = COALESCE(EXCLUDED.available_from,      fr_listings.available_from),
        available_until     = COALESCE(EXCLUDED.available_until,     fr_listings.available_until),
        analyzed_at         = NOW()
      RETURNING id, analyzed_at
    `);

    const row = (result as { rows?: { id: string; analyzed_at: string }[] }).rows?.[0];
    const listingId = existingId ?? row?.id;

    // ── Étape 2b : verdict automatique quand le scraper ne le fournit pas ──
    // Calcule VISIT/NEGOTIATE/AVOID à partir du prix vs la valeur marchande de référence.
    // N'écrase jamais un verdict déjà présent (COALESCE côté SQL).
    if (!str(decision, 20) && newPrice && listingId) {
      const cityStr = str(city, 200);
      if (cityStr) {
        const ref = MARKET_REFERENCE[_normalizeCity(cityStr)] ?? null;
        if (ref) {
          const ratio = newPrice / ref.avg_price;
          let autoScore: number;
          let autoDecision: "VISIT" | "NEGOTIATE" | "AVOID";
          if (ratio <= 0.88) {
            autoScore = Math.min(92, Math.round(85 + (0.88 - ratio) * 80));
            autoDecision = "VISIT";
          } else if (ratio <= 1.08) {
            // 70 à 55 selon ratio
            autoScore = Math.round(70 - ((ratio - 0.88) / 0.20) * 15);
            autoDecision = "NEGOTIATE";
          } else {
            autoScore = Math.max(15, Math.round(55 - (ratio - 1.08) * 150));
            autoDecision = "AVOID";
          }
          await db.execute(sql`
            UPDATE fr_listings SET
              fairrent_score = COALESCE(fairrent_score, ${autoScore}),
              decision       = COALESCE(decision,       ${autoDecision})
            WHERE id = ${listingId}::uuid
          `).catch(() => {});
        }
      }
    }

    // ── Étape 3 : versionnement (jamais écraser l'historique) ──
    let priceChanged = false;
    let changeType: string | null = null;
    let deltaPrice: number | null = null;

    if (isNew) {
      changeType = "new";
    } else if (newPrice !== null && existingPrice !== null && newPrice !== existingPrice) {
      deltaPrice = newPrice - existingPrice;
      changeType = deltaPrice > 0 ? "price_up" : "price_down";
      priceChanged = true;
    }

    if (changeType && listingId) {
      await db.execute(sql`
        INSERT INTO listing_versions
          (listing_id, price, content_hash, change_type, delta_price, engine_version)
        VALUES
          (${listingId}::uuid, ${newPrice}, ${str(content_hash, 32)},
           ${changeType}, ${deltaPrice}, ${engVer})
      `);
    }

    // ── Étape 4 : traçabilité par source URL ──
    if (normalizedUrl && listingId) {
      const reliability = SOURCE_RELIABILITY_SCORES[str(platform, 100) ?? "Web"] ?? 80;
      const httpStatusVal = clamp(http_status_code, 100, 599);
      const parserVer = str(parser_version, 20) ?? "1.0.0";
      await db.execute(sql`
        INSERT INTO listing_sources
          (listing_id, url, platform, status, last_seen_at, reliability, http_status, parser_version)
        VALUES
          (${listingId}::uuid, ${normalizedUrl}, ${str(platform, 100)}, 'active', NOW(),
           ${reliability}, ${httpStatusVal}, ${parserVer})
        ON CONFLICT (url) DO UPDATE SET
          listing_id     = EXCLUDED.listing_id,
          platform       = EXCLUDED.platform,
          last_seen_at   = NOW(),
          status         = 'active',
          reliability    = EXCLUDED.reliability,
          http_status    = COALESCE(EXCLUDED.http_status,    listing_sources.http_status),
          parser_version = EXCLUDED.parser_version
      `);
    }

    return res.status(201).json({
      ok: true,
      id: listingId,
      analyzed_at: row?.analyzed_at,
      is_new: isNew,
      price_changed: priceChanged,
      prev_price: existingPrice,
      change_type: changeType,
    });
  } catch (err) {
    logger.error({ err }, "fairrent/listings POST error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/listings/stats
// Statistiques agrégées pour le dashboard analytique futur.
router.get("/fairrent/listings/stats", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*)::int                                         AS total,
        COUNT(*) FILTER (WHERE decision = 'VISIT')::int      AS visit_count,
        COUNT(*) FILTER (WHERE decision = 'NEGOTIATE')::int  AS negotiate_count,
        COUNT(*) FILTER (WHERE decision = 'AVOID')::int      AS avoid_count,
        ROUND(AVG(fairrent_score))::int                      AS avg_score,
        ROUND(AVG(extraction_quality))::int                  AS avg_quality,
        ROUND(AVG(price))::int                               AS avg_price,
        COUNT(DISTINCT city)::int                            AS city_count,
        MAX(analyzed_at)                                     AS last_analyzed_at
      FROM fr_listings
    `);
    return res.json((result as { rows?: unknown[] }).rows?.[0] ?? {});
  } catch (err) {
    logger.error({ err }, "fairrent/listings/stats GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/listings/mine
// Retourne les analyses de l'utilisateur authentifié, paginées (50 par page).
router.get("/fairrent/listings/mine", async (req, res) => {
  if (!req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ error: "non_authentifie" });
  }
  const userId = (req.user as any).id as string;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  try {
    const result = await db.execute(sql`
      SELECT
        id, url, title, source, platform,
        city, province, neighborhood,
        price, bedrooms, listing_type, sqft, pets, parking,
        fairrent_score, compatibility_score, decision, confidence,
        is_active, analyzed_at
      FROM fr_listings
      WHERE user_id = ${userId}
      ORDER BY analyzed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM fr_listings WHERE user_id = ${userId}
    `);
    const rows = (result as { rows?: unknown[] }).rows ?? [];
    const total = ((countResult as { rows?: { total: number }[] }).rows?.[0]?.total) ?? 0;
    return res.json({ listings: rows, total, page, limit });
  } catch (err) {
    logger.error({ err }, "fairrent/listings/mine GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/market — Rental Intelligence (Sprint 4)
// Si fr_listings a >= MARKET_MIN_LISTINGS pour la ville → données réelles (data_source:"fairrent")
// Sinon → données de référence SCHL/Centris (data_source:"reference")
router.get("/fairrent/market", async (req, res) => {
  const cityF = typeof req.query.city === "string" && req.query.city.trim()
    ? req.query.city.trim() : null;
  const nbhF  = typeof req.query.neighborhood === "string" && req.query.neighborhood.trim()
    ? req.query.neighborhood.trim() : null;

  if (!cityF) return res.status(400).json({ error: "city_required" });

  try {
    // ── Compter les annonces disponibles pour cette ville ────────────────────
    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS n
      FROM fr_listings
      WHERE deleted_at IS NULL AND is_active = true AND city ILIKE ${cityF}
    `);
    const dbCount = Number((countResult as { rows?: { n: number }[] }).rows?.[0]?.n ?? 0);

    // ── Fallback : données de référence ─────────────────────────────────────
    if (dbCount < MARKET_MIN_LISTINGS) {
      const key = _normalizeCity(cityF);
      const ref = MARKET_REFERENCE[key];
      if (!ref) {
        return res.json({
          city: cityF, neighborhood: nbhF,
          data_source: "none",
          listing_count: 0, avg_price: null, evolution_pct: null,
          p25_price: null, p50_price: null, p75_price: null,
          avg_score: null, good_deals_count: 0, neighborhoods: [],
          reference_source: null,
        });
      }

      let neighborhoods = ref.neighborhoods as unknown[];
      if (nbhF) {
        const nl = nbhF.toLowerCase();
        neighborhoods = ref.neighborhoods.filter(n =>
          n.name.toLowerCase().includes(nl)
        );
      }

      return res.json({
        city:              ref.display_name,
        province:          ref.province,
        neighborhood:      nbhF,
        data_source:       "reference",
        reference_source:  ref.source,
        listing_count:     ref.neighborhoods.reduce((s, n) => s + n.listing_count, 0),
        avg_price:         ref.avg_price,
        evolution_pct:     ref.evolution_pct,
        p25_price:         ref.p25_price,
        p50_price:         ref.p50_price,
        p75_price:         ref.p75_price,
        avg_score:         ref.avg_score,
        good_deals_count:  null,
        neighborhoods,
      });
    }

    // ── Données réelles depuis fr_listings ───────────────────────────────────
    const statsResult = await db.execute(sql`
      SELECT
        COUNT(*)  FILTER (WHERE is_active = true)::int                                       AS listing_count,
        ROUND(AVG(price) FILTER (WHERE is_active = true))::int                               AS avg_price,
        ROUND(AVG(price) FILTER (WHERE analyzed_at > NOW() - INTERVAL '30 days'))::int       AS recent_avg_price,
        ROUND(AVG(price) FILTER (WHERE analyzed_at BETWEEN NOW() - INTERVAL '60 days'
                                                       AND NOW() - INTERVAL '30 days'))::int AS prev_avg_price,
        ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price)
              FILTER (WHERE is_active = true AND price IS NOT NULL))::int                     AS p25_price,
        ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY price)
              FILTER (WHERE is_active = true AND price IS NOT NULL))::int                     AS p50_price,
        ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)
              FILTER (WHERE is_active = true AND price IS NOT NULL))::int                     AS p75_price,
        ROUND(AVG(fairrent_score) FILTER (WHERE is_active = true))::int                      AS avg_score,
        COUNT(*) FILTER (WHERE is_active = true AND decision = 'VISIT')::int                 AS good_deals_count
      FROM fr_listings
      WHERE deleted_at IS NULL
        AND city ILIKE ${cityF}
        AND (${nbhF}::text IS NULL OR neighborhood ILIKE ${nbhF}::text)
    `);

    const nbhResult = await db.execute(sql`
      SELECT
        neighborhood,
        COUNT(*)::int                   AS listing_count,
        ROUND(AVG(price))::int          AS avg_price,
        ROUND(AVG(fairrent_score))::int AS avg_score
      FROM fr_listings
      WHERE is_active = true AND deleted_at IS NULL
        AND city ILIKE ${cityF}
        AND neighborhood IS NOT NULL
      GROUP BY neighborhood
      HAVING COUNT(*) >= 2
      ORDER BY avg_score DESC NULLS LAST
      LIMIT 6
    `);

    const stats = (statsResult as { rows?: Record<string, unknown>[] }).rows?.[0] ?? {};
    const neighborhoods = (nbhResult as { rows?: unknown[] }).rows ?? [];

    const recent = Number(stats.recent_avg_price ?? 0);
    const prev   = Number(stats.prev_avg_price   ?? 0);
    const evolutionPct = (recent > 0 && prev > 0)
      ? Number(((recent - prev) / prev * 100).toFixed(1)) : null;

    return res.json({
      city:             cityF,
      neighborhood:     nbhF,
      data_source:      "fairrent",
      listing_count:    Number(stats.listing_count    ?? 0),
      avg_price:        Number(stats.avg_price        ?? 0) || null,
      evolution_pct:    evolutionPct,
      p25_price:        Number(stats.p25_price        ?? 0) || null,
      p50_price:        Number(stats.p50_price        ?? 0) || null,
      p75_price:        Number(stats.p75_price        ?? 0) || null,
      avg_score:        Number(stats.avg_score        ?? 0) || null,
      good_deals_count: Number(stats.good_deals_count ?? 0),
      neighborhoods,
    });
  } catch (err) {
    logger.error({ err }, "fairrent/market GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ── GET /api/fairrent/trends — Données hebdomadaires pour le graphe de tendance ─
// Retourne { reference, periods, data_source, city }
// periods = données réelles depuis fr_listings groupées par semaine (si dispo)
//           sinon générées synthétiquement à partir de la référence SCHL
router.get("/fairrent/trends", async (req, res) => {
  const cityF = typeof req.query.city === "string" && req.query.city.trim()
    ? req.query.city.trim() : null;
  const typeF = typeof req.query.type === "string" && req.query.type.trim()
    ? req.query.type.trim() : null;
  const weeks = Math.min(52, Math.max(4, parseInt(String(req.query.weeks ?? "12"), 10) || 12));

  if (!cityF) return res.status(400).json({ error: "city_required" });

  try {
    const key = _normalizeCity(cityF);
    const ref = MARKET_REFERENCE[key];

    // ── Données réelles depuis fr_listings ────────────────────────────────────
    const realResult = await db.execute(sql`
      SELECT
        DATE_TRUNC('week', created_at)::date::text AS week_start,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price))::int AS median_price,
        ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price))::int AS p25_price,
        ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price))::int AS p75_price,
        COUNT(*)::int AS listing_count
      FROM fr_listings
      WHERE deleted_at IS NULL
        AND is_active = true
        AND price BETWEEN 400 AND 10000
        AND city ILIKE ${cityF}
        AND created_at >= NOW() - (${weeks} || ' weeks')::interval
        ${typeF ? sql`AND listing_type ILIKE ${typeF}` : sql``}
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week_start
    `);

    const periods = (realResult as { rows?: Record<string, unknown>[] }).rows ?? [];

    // Référence : données SCHL ou synthèse depuis fr_listings si pas de MARKET_REFERENCE
    let reference: Record<string, unknown>;
    if (ref) {
      reference = {
        p25_price:     ref.p25_price,
        p50_price:     ref.p50_price,
        p75_price:     ref.p75_price,
        avg_price:     ref.avg_price,
        evolution_pct: ref.evolution_pct,
        source:        ref.source,
      };
    } else if (periods.length > 0) {
      // Pas de référence SCHL — calculer depuis les données réelles
      const allPrices = periods.map(p => Number(p.median_price ?? 0)).filter(Boolean);
      const avg = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);
      const last = Number(periods[periods.length - 1]?.median_price ?? avg);
      const first = Number(periods[0]?.median_price ?? avg);
      const evo = first > 0 ? Number(((last - first) / first * 100).toFixed(1)) : null;
      const lastRow = periods[periods.length - 1] as Record<string, unknown>;
      reference = {
        p25_price:     Number(lastRow.p25_price ?? Math.round(avg * 0.85)),
        p50_price:     Number(lastRow.median_price ?? avg),
        p75_price:     Number(lastRow.p75_price ?? Math.round(avg * 1.15)),
        avg_price:     avg,
        evolution_pct: evo,
        source:        "FairRent Index",
      };
    } else {
      return res.json({
        city:        cityF,
        data_source: "none",
        reference:   null,
        periods:     [],
      });
    }

    return res.json({
      city:        cityF,
      data_source: periods.length >= 2 ? "fairrent" : "reference",
      reference,
      periods,
    });
  } catch (err) {
    logger.error({ err }, "fairrent/trends GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ── FairRent Subscription Middleware ─────────────────────────────────────────

const PLAN_TIER: Record<string, number> = { locataire: 1, proprietaire: 2, pro: 3 };

// Plan Gratuit : accès limité aux 8 villes du snapshot public
const FREE_CITIES = ["montreal","toronto","vancouver","calgary","ottawa","winnipeg","hamilton","halifax"];

function normalizeForCityCheck(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-\s]/g, "");
}

function isCityAllowedForPlan(city: string, plan: string): boolean {
  if (plan !== "locataire") return true;
  const norm = normalizeForCityCheck(city);
  return FREE_CITIES.some(c => norm.includes(c) || c.includes(norm));
}

const PLAN_WEEKS_LIMIT: Record<string, number> = { locataire: 4, proprietaire: 26, pro: 26 };
const PLAN_UNIT_LIMITS: Record<string, number> = { locataire: 0, proprietaire: 10, pro: 25 };
const SUPPORT_TIER: Record<string, string>     = { locataire: "standard", proprietaire: "standard", pro: "priority" };

async function fairRentAuth(req: any, res: any, next: () => void, minPlan?: string): Promise<void> {
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) { res.status(401).json({ error: "auth_required" }); return; }

  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supaUrl || !supaKey) { res.status(503).json({ error: "auth_unavailable" }); return; }

  let userId: string | null = null;
  let email: string | null  = null;
  try {
    const supaBase = supaUrl.replace(/\/$/, "").replace(/\/rest\/v1$/, "").replace(/\/auth\/v1$/, "");
    const r = await fetch(`${supaBase}/auth/v1/user`, {
      headers: { "apikey": supaKey, "Authorization": `Bearer ${token}` },
    });
    if (!r.ok) { res.status(401).json({ error: "token_invalid" }); return; }
    const u = await r.json() as { id?: string; email?: string };
    userId = u.id ?? null;
    email  = u.email ?? null;
  } catch { res.status(503).json({ error: "auth_unavailable" }); return; }

  if (!userId || !email) { res.status(401).json({ error: "token_invalid" }); return; }

  try {
    const result = await db.execute(sql`
      SELECT plan, status FROM fr_subscriptions
      WHERE email = ${email} AND status IN ('active', 'trialing')
      LIMIT 1
    `);
    const sub = (result as unknown as { rows?: { plan: string; status: string }[] }).rows?.[0];
    if (!sub) { res.status(403).json({ error: "subscription_required" }); return; }
    if (minPlan && (PLAN_TIER[sub.plan] ?? 0) < (PLAN_TIER[minPlan] ?? 1)) {
      res.status(403).json({ error: "plan_upgrade_required", required: minPlan, current: sub.plan });
      return;
    }
    req.fairRentUser = { id: userId, email, plan: sub.plan, status: sub.status };
    next();
  } catch { res.status(503).json({ error: "db_unavailable" }); }
}

function requireSub(minPlan?: string) {
  return (req: any, res: any, next: () => void) => fairRentAuth(req, res, next, minPlan);
}

// GET /api/fairrent/discover — Discovery Engine (Sprint 3)
// Discovery Score = 40% FairRent + 25% Budget + 15% Quartier + 10% Transport (placeholder 50) + 10% Fraîcheur
// Performance : fonctionne de 10 à 100k annonces sans modification de code (index fr_listings_discover_*)
router.get("/fairrent/discover", requireSub("locataire"), async (req: any, res: any) => {
  try {
    const pageNum = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const LIMIT = 20;
    const offset = (pageNum - 1) * LIMIT;

    const str2 = (v: unknown): string | null =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    const int2 = (v: unknown): number | null => {
      const n = parseInt(String(v ?? ""), 10);
      return isFinite(n) ? n : null;
    };

    const provF  = str2(req.query.province);
    const cityF  = str2(req.query.city);
    const nbhF   = str2(req.query.neighborhood);
    const maxP   = int2(req.query.max_price);
    const minP   = int2(req.query.min_price);
    const bdF    = int2(req.query.bedrooms);
    const parkF  = req.query.parking === "true" ? true : null;
    const petsF  = req.query.pets    === "true" ? true : null;

    // Plan Gratuit : villes limitées aux 8 du snapshot public
    const discoverPlan = (req.fairRentUser.plan as string) ?? "locataire";
    if (cityF && !isCityAllowedForPlan(cityF, discoverPlan)) {
      return res.status(403).json({
        error: "city_not_in_free_plan",
        city: cityF,
        allowed_cities: FREE_CITIES,
        upgrade_required: "proprietaire",
        message: "Le plan Locataire donne accès aux 8 villes du snapshot. Passez au plan Propriétaire pour toutes les villes.",
      });
    }

    const result = await db.execute(sql`
      WITH market_medians AS (
        SELECT
          city, bedrooms,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::int AS median_price
        FROM fr_listings
        WHERE is_active = true AND deleted_at IS NULL
          AND price IS NOT NULL AND city IS NOT NULL
        GROUP BY city, bedrooms
      ),
      scored AS (
        SELECT
          l.id, l.url, l.title, l.source, l.platform,
          l.city, l.province, l.neighborhood,
          l.price, l.bedrooms, l.listing_type, l.sqft, l.pets, l.parking,
          l.fairrent_score, l.compatibility_score, l.decision,
          l.extraction_quality, l.confidence, l.last_seen_at, l.available_from,
          COALESCE(m.median_price, l.price)            AS fair_value_estimate,
          COALESCE(m.median_price, l.price) - l.price  AS potential_savings,
          -- Budget compat (0-100)
          CASE
            WHEN ${maxP}::int IS NULL    THEN 50
            WHEN l.price IS NULL         THEN 25
            WHEN l.price <= ${maxP}::int THEN 100
            ELSE GREATEST(0, 100 - ROUND((l.price - ${maxP}::int)::numeric / NULLIF(${maxP}::int, 0) * 100)::int)
          END AS budget_score,
          -- Neighborhood match (0-100)
          CASE
            WHEN ${cityF}::text IS NULL       THEN 50
            WHEN l.city ILIKE ${cityF}::text  THEN 100
            ELSE 30
          END AS neighborhood_score,
          -- Freshness (0-100) : 100 aujourd'hui → 0 après 90 jours
          GREATEST(0,
            ROUND(100 - EXTRACT(EPOCH FROM (NOW() - l.last_seen_at)) / 86400.0 / 90.0 * 100)
          )::int AS freshness_score,
          COUNT(*) OVER () AS total_count
        FROM fr_listings l
        LEFT JOIN market_medians m ON m.city = l.city AND m.bedrooms = l.bedrooms
        WHERE l.is_active = true AND l.deleted_at IS NULL
          AND (${provF}::text IS NULL    OR l.province    ILIKE ${provF}::text)
          AND (${cityF}::text IS NULL    OR l.city        ILIKE ${cityF}::text)
          AND (${nbhF}::text IS NULL     OR l.neighborhood ILIKE ${nbhF}::text)
          AND (${maxP}::int  IS NULL     OR l.price IS NULL OR l.price <= ${maxP}::int * 1.25)
          AND (${minP}::int  IS NULL     OR l.price IS NULL OR l.price >= ${minP}::int)
          AND (${bdF}::smallint IS NULL  OR l.bedrooms = ${bdF}::smallint)
          AND (${parkF}::boolean IS NULL OR l.parking  = ${parkF}::boolean)
          AND (${petsF}::boolean IS NULL OR l.pets     = ${petsF}::boolean)
      )
      SELECT
        id, url, title, source, platform, city, province, neighborhood,
        price, bedrooms, listing_type, sqft, pets, parking,
        fairrent_score, compatibility_score, decision, extraction_quality, confidence,
        last_seen_at, available_from, fair_value_estimate, potential_savings,
        ROUND(
          COALESCE(fairrent_score, 50) * 0.40
          + budget_score               * 0.25
          + neighborhood_score         * 0.15
          + 50                         * 0.10
          + LEAST(100, freshness_score)* 0.10
        )::int AS discovery_score,
        total_count
      FROM scored
      ORDER BY discovery_score DESC, last_seen_at DESC
      LIMIT ${LIMIT} OFFSET ${offset}
    `);

    const rows = (result as { rows?: Record<string, unknown>[] }).rows ?? [];
    const total = Number(rows[0]?.total_count ?? 0);

    // Fire-and-forget : enregistrement dans search_history (anonyme ou authentifié)
    const searchUserId = (req as any).fairRentUser?.id ?? null;
    db.execute(sql`
      INSERT INTO search_history
        (user_id, city, neighborhood, min_price, max_price, bedrooms, parking, pets, result_count)
      VALUES
        (${searchUserId}, ${cityF}, ${nbhF}, ${minP}, ${maxP},
         ${bdF}::smallint, ${parkF}::boolean, ${petsF}::boolean, ${total})
    `).catch(() => {});

    return res.json({
      listings: rows.map(({ total_count, ...rest }) => rest),
      total,
      page: pageNum,
      limit: LIMIT,
    });
  } catch (err) {
    logger.error({ err }, "fairrent/discover GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/fairrent/saved-properties — Sauvegarder une annonce (abonnement requis)
router.post("/fairrent/saved-properties", requireSub(), async (req: any, res: any) => {
  const userId = req.fairRentUser.id as string;
  const listingId = typeof req.body?.listing_id === "string" ? req.body.listing_id.trim() : null;

  if (!listingId || !/^[0-9a-f-]{36}$/i.test(listingId)) {
    return res.status(400).json({ error: "listing_id_invalide" });
  }
  try {
    await db.execute(sql`
      INSERT INTO saved_properties (user_id, listing_id)
      VALUES (${userId}, ${listingId}::uuid)
      ON CONFLICT (user_id, listing_id) DO UPDATE SET deleted_at = NULL
    `);

    // Fire-and-forget : incrémenter listing_metrics.saves
    db.execute(sql`
      INSERT INTO listing_metrics (listing_id, saves, updated_at)
      VALUES (${listingId}::uuid, 1, NOW())
      ON CONFLICT (listing_id) DO UPDATE SET
        saves      = listing_metrics.saves + 1,
        updated_at = NOW()
    `).catch(() => {});

    return res.status(201).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "fairrent/saved-properties POST error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/saved-properties — Lister les annonces sauvegardées (auth requise)
router.get("/fairrent/saved-properties", requireSub(), async (req: any, res: any) => {
  const userId = req.fairRentUser.id as string;
  const page   = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit  = 20;
  const offset = (page - 1) * limit;
  try {
    const result = await db.execute(sql`
      SELECT
        l.id, l.url, l.title, l.source, l.platform,
        l.city, l.province, l.neighborhood, l.price, l.bedrooms,
        l.listing_type, l.sqft, l.pets, l.parking,
        l.fairrent_score, l.decision, l.last_seen_at,
        sp.created_at AS saved_at,
        COUNT(*) OVER () AS total_count
      FROM saved_properties sp
      JOIN fr_listings l ON l.id = sp.listing_id
      WHERE sp.user_id  = ${userId}
        AND sp.deleted_at IS NULL
        AND l.deleted_at  IS NULL
      ORDER BY sp.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const rows  = (result as { rows?: Record<string, unknown>[] }).rows ?? [];
    const total = Number(rows[0]?.total_count ?? 0);
    return res.json({
      listings: rows.map(({ total_count, ...rest }) => rest),
      total, page, limit,
    });
  } catch (err) {
    logger.error({ err }, "fairrent/saved-properties GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/fairrent/search-alerts — Créer une alerte (auth requise)
router.post("/fairrent/search-alerts", requireSub(), async (req: any, res: any) => {
  const userId    = req.fairRentUser.id    as string;
  const userEmail = req.fairRentUser.email as string;

  const str2 = (v: unknown, max = 200): string | null =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const int2 = (v: unknown): number | null => {
    const n = parseInt(String(v ?? ""), 10);
    return isFinite(n) ? n : null;
  };
  const bool2 = (v: unknown): boolean | null => v === true || v === false ? v : null;

  const city         = str2(req.body?.city);
  const neighborhood = str2(req.body?.neighborhood);
  const province     = str2(req.body?.province, 10);
  const queryText    = str2(req.body?.query_text, 500);
  const maxPrice     = int2(req.body?.max_price);
  const minPrice     = int2(req.body?.min_price);
  const bedrooms     = int2(req.body?.bedrooms);
  const parking      = bool2(req.body?.parking);
  const pets         = bool2(req.body?.pets);

  if (!city && !queryText) {
    return res.status(400).json({ error: "city_ou_query_requis" });
  }

  // Limite par plan : locataire = 1 alerte active max
  const userPlan = (req.fairRentUser.plan as string) ?? "locataire";
  if (userPlan === "locataire") {
    try {
      const cntRes = await db.execute(sql`
        SELECT COUNT(*)::int AS cnt FROM search_alerts
        WHERE user_id = ${userId}
          AND deleted_at IS NULL
          AND created_at >= DATE_TRUNC('month', NOW())
      `);
      const cnt = Number((cntRes as unknown as { rows?: { cnt: number }[] }).rows?.[0]?.cnt ?? 0);
      if (cnt >= 1) {
        return res.status(403).json({
          error:   "alert_limit_reached",
          current: cnt,
          limit:   1,
          reset:   "début du mois prochain",
          message: "Le plan Locataire est limité à 1 alerte par mois. Passez au plan Propriétaire pour des alertes illimitées.",
        });
      }
    } catch (err) {
      logger.error({ err }, "fairrent/search-alerts plan-limit check error");
    }
  }

  try {
    const result = await db.execute(sql`
      INSERT INTO search_alerts
        (user_id, user_email, city, neighborhood, province, query_text,
         min_price, max_price, bedrooms, parking, pets)
      VALUES
        (${userId}, ${userEmail}, ${city}, ${neighborhood}, ${province}, ${queryText},
         ${minPrice}, ${maxPrice}, ${bedrooms}::smallint, ${parking}::boolean, ${pets}::boolean)
      RETURNING id, created_at
    `);
    const row = (result as { rows?: { id: string; created_at: string }[] }).rows?.[0];
    return res.status(201).json({ ok: true, id: row?.id, created_at: row?.created_at });
  } catch (err) {
    logger.error({ err }, "fairrent/search-alerts POST error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/search-alerts — Lister les alertes (abonnement requis)
router.get("/fairrent/search-alerts", requireSub(), async (req: any, res: any) => {
  const userId = req.fairRentUser.id as string;
  try {
    const result = await db.execute(sql`
      SELECT id, city, neighborhood, province, query_text,
             min_price, max_price, bedrooms, parking, pets,
             is_active, match_count, last_match_at, created_at
      FROM search_alerts
      WHERE user_id = ${userId} AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 20
    `);
    return res.json({ alerts: (result as { rows?: unknown[] }).rows ?? [] });
  } catch (err) {
    logger.error({ err }, "fairrent/search-alerts GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// PATCH /api/fairrent/search-alerts/:id/toggle — Activer / désactiver
router.patch("/fairrent/search-alerts/:id/toggle", requireSub(), async (req: any, res: any) => {
  const userId = req.fairRentUser.id as string;
  const { id } = req.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "id_invalide" });
  }
  try {
    const result = await db.execute(sql`
      UPDATE search_alerts
      SET is_active = NOT is_active
      WHERE id = ${id}::uuid AND user_id = ${userId} AND deleted_at IS NULL
      RETURNING id, is_active
    `);
    const row = (result as { rows?: { id: string; is_active: boolean }[] }).rows?.[0];
    if (!row) return res.status(404).json({ error: "not_found" });
    return res.json({ ok: true, id: row.id, is_active: row.is_active });
  } catch (err) {
    logger.error({ err }, "fairrent/search-alerts PATCH error");
    return res.status(500).json({ error: "server_error" });
  }
});

// DELETE /api/fairrent/search-alerts/:id — Supprimer (soft delete, abonnement requis)
router.delete("/fairrent/search-alerts/:id", requireSub(), async (req: any, res: any) => {
  const userId = req.fairRentUser.id as string;
  const { id } = req.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "id_invalide" });
  }
  try {
    await db.execute(sql`
      UPDATE search_alerts
      SET deleted_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${userId} AND deleted_at IS NULL
    `);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "fairrent/search-alerts DELETE error");
    return res.status(500).json({ error: "server_error" });
  }
});

// DELETE /api/fairrent/saved-properties/:listingId — Unsave (soft delete, abonnement requis)
router.delete("/fairrent/saved-properties/:listingId", requireSub(), async (req: any, res: any) => {
  const userId = req.fairRentUser.id as string;
  const { listingId } = req.params;
  if (!listingId || !/^[0-9a-f-]{36}$/i.test(listingId)) {
    return res.status(400).json({ error: "listing_id_invalide" });
  }
  try {
    await db.execute(sql`
      UPDATE saved_properties
      SET deleted_at = NOW()
      WHERE user_id   = ${userId}
        AND listing_id = ${listingId}::uuid
        AND deleted_at IS NULL
    `);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "fairrent/saved-properties DELETE error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/fairrent/trends — Tendances hebdomadaires des loyers par ville
// Retourne avg/p25/median/p75/count par semaine — 12 semaines par défaut
// ═══════════════════════════════════════════════════════════════════════════
router.get("/fairrent/trends", requireSub("locataire"), async (req: any, res: any) => {
  try {
    const str2 = (v: unknown): string | null =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    const trendPlan = (req.fairRentUser.plan as string) ?? "locataire";
    const cityRaw  = str2(req.query.city) ?? "Montreal";
    const typeF    = str2(req.query.type);
    const maxWeeks = PLAN_WEEKS_LIMIT[trendPlan] ?? 4;
    const weeksBack = Math.min(maxWeeks, Math.max(4, parseInt(String(req.query.weeks ?? "12"), 10) || 12));

    const result = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')         AS week_start,
        ROUND(AVG(price))::int                                          AS avg_price,
        MIN(price)::int                                                 AS min_price,
        MAX(price)::int                                                 AS max_price,
        PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY price)::int       AS median_price,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price)::int       AS p25_price,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)::int       AS p75_price,
        COUNT(*)::int                                                   AS listing_count,
        ROUND(AVG(fairrent_score))::int                                AS avg_score
      FROM fr_listings
      WHERE deleted_at IS NULL
        AND is_active   = true
        AND price BETWEEN 400 AND 10000
        AND city ILIKE ${'%' + cityRaw + '%'}
        AND created_at > NOW() - (${weeksBack} || ' weeks')::interval
        AND (${typeF}::text IS NULL OR listing_type ILIKE ${typeF}::text)
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week_start ASC
    `);

    const rows = (result as { rows?: unknown[] }).rows ?? [];
    const cityKey = _normalizeCity(cityRaw);
    const ref = MARKET_REFERENCE[cityKey] ?? MARKET_REFERENCE["montreal"];

    return res.json({
      city:        cityRaw,
      type:        typeF,
      data_source: rows.length >= 2 ? "fairrent" : "reference",
      weeks_back:  weeksBack,
      periods:     rows,
      reference: {
        avg_price:      ref.avg_price,
        p25_price:      ref.p25_price,
        p50_price:      ref.p50_price,
        p75_price:      ref.p75_price,
        evolution_pct:  ref.evolution_pct,
        source:         ref.source,
      },
    });
  } catch (err) {
    logger.error({ err }, "fairrent/trends GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/fairrent/portfolio — Score un portefeuille d'unités locatives
// Body: { units: [{ address, city, current_rent, bedrooms?, type? }] }
// Retourne chaque unité avec fairrent_score, delta vs marché, opportunité
// Plan limits : proprietaire=10 unités, pro=25 unités
// ═══════════════════════════════════════════════════════════════════════════
router.post("/fairrent/portfolio", requireSub("proprietaire"), async (req: any, res: any) => {
  const unitLimit = PLAN_UNIT_LIMITS[req.fairRentUser.plan as string] ?? 0;
  try {
    const raw = Array.isArray(req.body?.units) ? req.body.units.slice(0, unitLimit) : [];
    if (raw.length === 0)
      return res.status(400).json({ error: "units_requis", max_units: unitLimit });

    const str2 = (v: unknown, max = 300): string | null =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

    // Charger les stats de marché une seule fois par ville unique
    const cities = [...new Set(raw.map((u: any) => String(u.city ?? "").trim().toLowerCase()).filter(Boolean))];
    const mktCache: Record<string, any> = {};

    for (const city of cities) {
      try {
        const r = await db.execute(sql`
          SELECT
            ROUND(AVG(price))::int                                          AS avg_price,
            PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY price)::int       AS median_price,
            PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price)::int       AS p25_price,
            PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)::int       AS p75_price,
            COUNT(*)::int                                                   AS listing_count
          FROM fr_listings
          WHERE is_active = true AND deleted_at IS NULL
            AND city ILIKE ${'%' + city + '%'}
            AND price BETWEEN 400 AND 10000
        `);
        const s = (r as { rows?: Record<string, any>[] }).rows?.[0];
        if (s && Number(s.listing_count) >= 5) {
          mktCache[city] = { ...s, source: "fairrent" };
        } else {
          const key = _normalizeCity(city);
          const ref  = MARKET_REFERENCE[key];
          if (ref) mktCache[city] = { avg_price: ref.avg_price, median_price: ref.p50_price, p25_price: ref.p25_price, p75_price: ref.p75_price, listing_count: 0, source: "reference" };
        }
      } catch {}
    }

    const scored = raw.map((u: any, i: number) => {
      const rent   = Number(u.current_rent) || 0;
      const cityK  = String(u.city ?? "").trim().toLowerCase();
      const mkt    = mktCache[cityK];
      const median = Number(mkt?.median_price ?? mkt?.avg_price ?? 0);

      let score = 50, decision = "UNKNOWN", reval = 0;
      if (median > 0 && rent > 0) {
        const ratio = rent / median;
        if      (ratio < 0.88)  { score = Math.min(95, Math.round(88 - ratio * 30)); decision = "UNDERVALUED"; reval = Math.round(median - rent); }
        else if (ratio <= 1.05) { score = Math.round(78 - (ratio - 0.88) * 40); decision = "FAIR"; reval = Math.max(0, Math.round(median - rent)); }
        else if (ratio <= 1.18) { score = Math.round(58 - (ratio - 1.05) * 60); decision = "HIGH"; }
        else                    { score = Math.max(10, Math.round(42 - (ratio - 1.18) * 80)); decision = "OVERPRICED"; }
        score = Math.max(0, Math.min(100, score));
      }

      return {
        index:               i + 1,
        address:             str2(u.address) ?? `Unité ${i + 1}`,
        city:                u.city ?? "",
        current_rent:        rent,
        bedrooms:            u.bedrooms ?? null,
        type:                u.type ?? null,
        market_avg:          Number(mkt?.avg_price    ?? 0) || null,
        market_median:       Number(mkt?.median_price ?? 0) || null,
        market_p25:          Number(mkt?.p25_price    ?? 0) || null,
        market_p75:          Number(mkt?.p75_price    ?? 0) || null,
        delta:               median > 0 ? Math.round(rent - median) : null,
        delta_pct:           median > 0 ? Number(((rent - median) / median * 100).toFixed(1)) : null,
        revaluation_monthly: reval,
        revaluation_annual:  reval * 12,
        fairrent_score:      score,
        decision,
        data_source:         mkt?.source ?? "none",
      };
    });

    const totalAnnual   = scored.reduce((s: number, u: any) => s + (u.revaluation_annual || 0), 0);
    const undervalued   = scored.filter((u: any) => u.revaluation_monthly > 0).length;
    const avgScore      = Math.round(scored.reduce((s: number, u: any) => s + u.fairrent_score, 0) / scored.length);

    return res.json({
      ok: true,
      unit_count:            scored.length,
      undervalued_count:     undervalued,
      total_annual_opportunity: totalAnnual,
      avg_score:             avgScore,
      units:                 scored,
      generated_at:          new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "fairrent/portfolio POST error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/discover/export-csv — Export CSV des annonces (plan Pro requis)
// ?city=Montreal&max_price=1800&bedrooms=2
router.get("/fairrent/discover/export-csv", requireSub("pro"), async (req: any, res: any) => {
  try {
    const str2 = (v: unknown): string | null =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    const int2 = (v: unknown): number | null => {
      const n = parseInt(String(v ?? ""), 10);
      return isFinite(n) ? n : null;
    };
    const cityF = str2(req.query.city);
    const nbhF  = str2(req.query.neighborhood);
    const maxP  = int2(req.query.max_price);
    const minP  = int2(req.query.min_price);
    const bdF   = int2(req.query.bedrooms);

    const result = await db.execute(sql`
      SELECT
        id, url, title, source, city, province, neighborhood,
        price, bedrooms, listing_type, sqft,
        pets, parking, available_from,
        fairrent_score, decision, last_seen_at
      FROM fr_listings
      WHERE is_active = true AND deleted_at IS NULL
        AND (${cityF}::text IS NULL OR city        ILIKE ${cityF}::text)
        AND (${nbhF}::text  IS NULL OR neighborhood ILIKE ${nbhF}::text)
        AND (${maxP}::int   IS NULL OR price IS NULL OR price <= ${maxP}::int)
        AND (${minP}::int   IS NULL OR price IS NULL OR price >= ${minP}::int)
        AND (${bdF}::smallint IS NULL OR bedrooms = ${bdF}::smallint)
      ORDER BY fairrent_score DESC NULLS LAST, last_seen_at DESC
      LIMIT 2000
    `);

    const rows = (result as { rows?: Record<string, unknown>[] }).rows ?? [];
    const COLS = ["id","url","title","source","city","province","neighborhood","price","bedrooms","listing_type","sqft","pets","parking","available_from","fairrent_score","decision","last_seen_at"] as const;

    const csvEscape = (v: unknown): string => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return (s.includes(",") || s.includes('"') || s.includes("\n"))
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    };

    const csv = [
      COLS.join(","),
      ...rows.map(r => COLS.map(c => csvEscape(r[c])).join(",")),
    ].join("\n");

    const ts = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="fairrent-export-${ts}.csv"`);
    return res.send(csv);
  } catch (err) {
    logger.error({ err }, "fairrent/discover/export-csv GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/webhook-check — Alertes marché déclenchées (x-fairrent-key requis)
router.get("/fairrent/webhook-check", async (req, res) => {
  const apiKey     = req.headers["x-fairrent-key"];
  const expectedKey = process.env.FAIRRENT_API_KEY ?? "";
  if (!expectedKey || apiKey !== expectedKey)
    return res.status(401).json({ error: "unauthorized" });
  try {
    const result = await db.execute(sql`
      SELECT sa.id, sa.user_email, sa.city, sa.neighborhood, sa.max_price, sa.bedrooms,
             COUNT(fl.id)::int AS matching_count,
             ROUND(AVG(fl.price))::int AS market_avg
      FROM search_alerts sa
      LEFT JOIN fr_listings fl ON (
        fl.city ILIKE sa.city AND fl.is_active = true AND fl.deleted_at IS NULL
        AND fl.price BETWEEN 400 AND COALESCE(sa.max_price, 10000)
        AND (sa.neighborhood IS NULL OR fl.neighborhood ILIKE sa.neighborhood)
        AND (sa.bedrooms IS NULL OR fl.bedrooms = sa.bedrooms)
      )
      WHERE sa.is_active = true AND sa.deleted_at IS NULL AND sa.city IS NOT NULL
        AND (sa.last_checked_at IS NULL OR sa.last_checked_at < NOW() - INTERVAL '6 hours')
      GROUP BY sa.id, sa.user_email, sa.city, sa.neighborhood, sa.max_price, sa.bedrooms
      HAVING COUNT(fl.id) > 0
      LIMIT 100
    `);
    const alerts = (result as { rows?: unknown[] }).rows ?? [];
    if (alerts.length > 0) {
      const ids = alerts.map((a: any) => a.id);
      await db.execute(sql`
        UPDATE search_alerts SET last_checked_at = NOW() WHERE id = ANY(${ids}::uuid[])
      `);
    }
    return res.json({ ok: true, triggered_count: alerts.length, alerts });
  } catch (err) {
    logger.error({ err }, "fairrent/webhook-check GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/fairrent/market-snapshot — Snapshot temps réel pour le terminal live
// Retourne prix/Δ24h/Δ7j/nouvelles annonces/délai/FairRent™ par ville
// Fallback MARKET_REFERENCE si < 3 annonces dans la fenêtre active
// ═══════════════════════════════════════════════════════════════════════════
router.get("/fairrent/market-snapshot", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      WITH
      window_now AS (
        SELECT
          city,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::int        AS median_now,
          ROUND(AVG(fairrent_score) FILTER (WHERE fairrent_score IS NOT NULL))::int AS avg_score,
          COUNT(*)::int                                                    AS total_count,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS new_24h,
          ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400))::int AS avg_days_active
        FROM fr_listings
        WHERE deleted_at IS NULL
          AND is_active = true
          AND price BETWEEN 400 AND 10000
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY city
        HAVING COUNT(*) >= 3
      ),
      window_7d_prev AS (
        SELECT
          city,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::int AS median_prev
        FROM fr_listings
        WHERE deleted_at IS NULL
          AND price BETWEEN 400 AND 10000
          AND created_at BETWEEN NOW() - INTERVAL '21 days' AND NOW() - INTERVAL '7 days'
        GROUP BY city
        HAVING COUNT(*) >= 2
      ),
      window_24h_prev AS (
        SELECT
          city,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::int AS median_prev
        FROM fr_listings
        WHERE deleted_at IS NULL
          AND price BETWEEN 400 AND 10000
          AND created_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '24 hours'
        GROUP BY city
        HAVING COUNT(*) >= 2
      )
      SELECT
        n.city,
        n.median_now                                                        AS price,
        CASE WHEN p24.median_prev > 0
          THEN ROUND(((n.median_now - p24.median_prev)::numeric / p24.median_prev * 100), 1)
          ELSE NULL END                                                     AS change24h,
        CASE WHEN p7.median_prev > 0
          THEN ROUND(((n.median_now - p7.median_prev)::numeric / p7.median_prev * 100), 1)
          ELSE NULL END                                                     AS change7d,
        n.new_24h,
        n.avg_days_active                                                   AS avg_days,
        COALESCE(n.avg_score, 0)                                           AS fair_index,
        n.total_count
      FROM window_now n
      LEFT JOIN window_7d_prev  p7  ON n.city ILIKE p7.city
      LEFT JOIN window_24h_prev p24 ON n.city ILIKE p24.city
      ORDER BY n.total_count DESC
    `);

    const rows = ((result as { rows?: Record<string, unknown>[] }).rows ?? []) as Record<string, unknown>[];

    const CITY_ORDER = ["montreal","toronto","vancouver","calgary","ottawa","winnipeg","hamilton","halifax"];

    const snapshot = CITY_ORDER.map(key => {
      const ref = MARKET_REFERENCE[key];
      if (!ref) return null;

      const dbRow = rows.find(r => {
        const norm = _normalizeCity(String(r.city ?? ""));
        return norm.includes(key) || key.split("-").every(p => norm.includes(p));
      });

      const price     = Number(dbRow?.price ?? ref.p50_price);
      // Retourner null si pas de données historiques réelles — le client préserve alors
      // les valeurs de seed (SCHL) plutôt que d'appliquer un fallback synthétique.
      const change7d  = dbRow?.change7d  != null ? Number(dbRow.change7d)  : null;
      const change24h = dbRow?.change24h != null ? Number(dbRow.change24h) : null;
      const new_listings  = Number(dbRow?.new_24h ?? 0);
      const avg_days      = Math.max(1, Number(dbRow?.avg_days ?? 21));
      const fair_index    = Number(dbRow?.fair_index ?? ref.avg_score);
      const total_count   = Number(dbRow?.total_count ?? 0);

      let demand: string;
      if (new_listings >= 15 || total_count >= 100) demand = "Très élevée";
      else if (new_listings >= 8  || total_count >= 50)  demand = "Élevée";
      else if (new_listings >= 3  || total_count >= 20)  demand = "Modérée";
      else demand = "Faible";

      return {
        key,
        name:        ref.display_name,
        prov:        ref.province,
        price,
        change24h,
        change7d,
        new_listings,
        avg_days,
        fair_index,
        demand,
        data_source: dbRow ? "fairrent" : "reference",
      };
    }).filter(Boolean);

    return res.json({
      snapshot,
      db_cities_found: rows.length,
      generated_at:    new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "fairrent/market-snapshot GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ── Admin helpers ────────────────────────────────────────────────────────────
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);

function isAdmin(req: any): boolean {
  if (!req.isAuthenticated()) return false;
  const email: string = ((req.user as any)?.email ?? "").toLowerCase();
  return ADMIN_EMAILS.includes(email);
}

// GET /api/fairrent/listings/active-urls — Liste des URLs actives pour re-check scraper (clé API requise)
router.get("/fairrent/listings/active-urls", async (req, res) => {
  const apiKey = req.headers["x-fairrent-key"] as string | undefined;
  if (!apiKey || apiKey !== process.env.FAIRRENT_SCRAPER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "500"), 10) || 500, 2000);
    const rawDays = parseInt(String(req.query.min_age_days ?? "0"), 10);
    const offsetDays = isNaN(rawDays) ? 0 : Math.max(0, rawDays);
    const rows = await db.execute(sql`
      SELECT id, url
      FROM fr_listings
      WHERE is_active = true
        AND deleted_at IS NULL
        AND url IS NOT NULL
        AND analyzed_at < NOW() - make_interval(days => ${offsetDays})
      ORDER BY analyzed_at ASC
      LIMIT ${limit}
    `);
    const list = (rows as { rows?: { id: string; url: string }[] }).rows ?? [];
    return res.json(list);
  } catch (err) {
    logger.error({ err }, "fairrent/listings/active-urls error");
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/fairrent/listings/:id/rented — Signaler un logement comme loué (public, rate-limited par IP en prod)
router.post("/fairrent/listings/:id/rented", async (req, res) => {
  const { id } = req.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }
  try {
    const result = await db.execute(sql`
      UPDATE fr_listings
      SET is_active = false, deleted_at = NOW()
      WHERE id = ${id}::uuid AND deleted_at IS NULL
      RETURNING id
    `);
    const row = (result as { rows?: { id: string }[] }).rows?.[0];
    if (!row) return res.status(404).json({ error: "not_found" });

    await db.execute(sql`
      INSERT INTO listing_versions (listing_id, change_type, changed_by, snapshot)
      VALUES (${id}::uuid, 'rented', 'user_report', '{"is_active": false}'::jsonb)
    `).catch(() => {});

    return res.json({ ok: true, id });
  } catch (err) {
    logger.error({ err }, "fairrent/listings/:id/rented error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/admin/stats
router.get("/fairrent/admin/stats", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "forbidden" });
  try {
    const [listings, alerts, emails, pipeline] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE is_active = true AND deleted_at IS NULL)     AS active,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'
                            AND deleted_at IS NULL)                           AS today
        FROM fr_listings
      `),
      db.execute(sql`
        SELECT COUNT(*) AS active_alerts
        FROM search_alerts
        WHERE is_active = true AND deleted_at IS NULL
      `),
      db.execute(sql`
        SELECT COUNT(*) AS total_sent
        FROM alert_sent_log
      `),
      db.execute(sql`
        SELECT created_at, status, quality_score, total_ms, error_message
        FROM pipeline_runs
        ORDER BY created_at DESC
        LIMIT 1
      `),
    ]);
    const ls = (listings.rows as any[])[0] ?? {};
    const al = (alerts.rows as any[])[0] ?? {};
    const em = (emails.rows as any[])[0] ?? {};
    const pr = (pipeline.rows as any[])[0] ?? null;
    return res.json({
      listings_active: Number(ls.active ?? 0),
      listings_today:  Number(ls.today  ?? 0),
      alerts_active:   Number(al.active_alerts ?? 0),
      emails_sent:     Number(em.total_sent    ?? 0),
      last_pipeline:   pr,
    });
  } catch (err) {
    logger.error({ err }, "admin/stats error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/admin/listings?page=1
router.get("/fairrent/admin/listings", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "forbidden" });
  const page  = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  try {
    const rows = await db.execute(sql`
      SELECT id, title, city, neighborhood, price, bedrooms, fairrent_score,
             decision, source, is_active, created_at
      FROM fr_listings
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return res.json({ listings: rows.rows, page, limit });
  } catch (err) {
    logger.error({ err }, "admin/listings error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/admin/alerts?page=1
router.get("/fairrent/admin/alerts", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "forbidden" });
  const page  = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  try {
    const rows = await db.execute(sql`
      SELECT id, user_email, city, neighborhood, min_price, max_price, bedrooms,
             parking, pets, is_active, match_count, last_checked_at, last_match_at, created_at
      FROM search_alerts
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    return res.json({ alerts: rows.rows, page, limit });
  } catch (err) {
    logger.error({ err }, "admin/alerts error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/admin/pipeline?limit=50
router.get("/fairrent/admin/pipeline", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "forbidden" });
  const limit = Math.min(100, Math.max(10, parseInt(String(req.query.limit ?? "50"), 10) || 50));
  try {
    const rows = await db.execute(sql`
      SELECT id, source_url, status, parser_version, http_status,
             fetch_ms, parse_ms, total_ms, fields_found, quality_score,
             error_message, created_at
      FROM pipeline_runs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    const summary = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')                                 AS ok,
        COUNT(*) FILTER (WHERE status != 'completed')                                AS errors,
        ROUND(AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL))::int      AS avg_quality,
        ROUND(AVG(total_ms)     FILTER (WHERE total_ms IS NOT NULL))::int            AS avg_ms
      FROM pipeline_runs
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);
    return res.json({ runs: rows.rows, summary: (summary.rows as any[])[0] ?? {}, limit });
  } catch (err) {
    logger.error({ err }, "admin/pipeline error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ── POST /api/fairrent/scrape/logisquebec — Lance le scraper en arrière-plan ─
// Authentification : header x-fairrent-key = process.env.FAIRRENT_SCRAPER_KEY
// Body (optionnel) : { max_pages?: number, cities?: string[] }
// Ex: curl -X POST .../api/fairrent/scrape/logisquebec \
//   -H "x-fairrent-key: $KEY" -H "Content-Type: application/json" \
//   -d '{"max_pages":50,"cities":["Montréal"]}'
router.post("/fairrent/scrape/logisquebec", (req, res) => {
  const apiKey = req.headers["x-fairrent-key"] as string | undefined;
  if (!apiKey || apiKey !== process.env.FAIRRENT_SCRAPER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const maxPages = Math.min(
    parseInt(String((req.body as Record<string, unknown>)?.max_pages ?? "30"), 10) || 30,
    500,
  );
  const citiesRaw = (req.body as Record<string, unknown>)?.cities;
  const cities    = Array.isArray(citiesRaw) ? (citiesRaw as string[]) : undefined;
  const available = LQ_CITIES.map(c => c.city);

  // Respond immediately — scraper runs in background
  res.json({
    status:    "started",
    maxPages,
    cities:    cities ?? "all",
    available,
    engine:    "logisquebec-v1",
    note:      "Résultats loggés côté serveur. Vérifier /api/fairrent/health ou /api/fairrent/admin/stats.",
  });

  // Fire and forget
  runLogisQuebecScraper({ maxPages, cities })
    .then(results => {
      const total = results.reduce(
        (a, r) => ({ inserted: a.inserted + r.inserted, updated: a.updated + r.updated, skipped: a.skipped + r.skipped }),
        { inserted: 0, updated: 0, skipped: 0 },
      );
      logger.info({ results, total }, "logisquebec scraper completed");
    })
    .catch(err => logger.error({ err }, "logisquebec scraper fatal error"));
});

// ── GET /api/fairrent/scrape/lespac/probe — Inspecter la réponse JSON brute ──
router.get("/fairrent/scrape/lespac/probe", async (req, res) => {
  const apiKey = req.headers["x-fairrent-key"] as string | undefined;
  if (!apiKey || apiKey !== process.env.FAIRRENT_SCRAPER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const page = parseInt(String((req.query as Record<string, string>).page ?? "1"), 10) || 1;
    const data = await probeLesPAC(page);
    return res.json({ probe: true, page, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "lespac probe error");
    return res.status(500).json({ error: msg });
  }
});

// ── GET /api/fairrent/scrape/lespac/discover-cities — Trouve les geo codes par ville
router.get("/fairrent/scrape/lespac/discover-cities", async (req, res) => {
  const apiKey = req.headers["x-fairrent-key"] as string | undefined;
  if (!apiKey || apiKey !== process.env.FAIRRENT_SCRAPER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  try {
    const data = await discoverGeoCodes();
    return res.json({ ok: true, data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "lespac discover-cities error");
    return res.status(500).json({ error: msg });
  }
});

// ── POST /api/fairrent/scrape/lespac — Lance le scraper LesPAC en arrière-plan
// Body (optionnel) : { max_pages?: number, cities?: string[] }
router.post("/fairrent/scrape/lespac", (req, res) => {
  const apiKey = req.headers["x-fairrent-key"] as string | undefined;
  if (!apiKey || apiKey !== process.env.FAIRRENT_SCRAPER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const maxPages = Math.min(
    parseInt(String((req.body as Record<string, unknown>)?.max_pages ?? "50"), 10) || 50,
    500,
  );
  const citiesRaw = (req.body as Record<string, unknown>)?.cities;
  const cities    = Array.isArray(citiesRaw) ? (citiesRaw as string[]) : undefined;
  const available = LP_CITIES.map(c => c.city);

  res.json({
    status:    "started",
    maxPages,
    cities:    cities ?? "all",
    available,
    engine:    "lespac-v1",
    note:      "Résultats loggés côté serveur. Utiliser /probe pour inspecter le JSON brut d'abord.",
  });

  runLesPACScraper({ maxPages, cities })
    .then(results => {
      const total = results.reduce(
        (a, r) => ({ inserted: a.inserted + r.inserted, updated: a.updated + r.updated, skipped: a.skipped + r.skipped }),
        { inserted: 0, updated: 0, skipped: 0 },
      );
      logger.info({ results, total }, "lespac scraper completed");
    })
    .catch(err => logger.error({ err }, "lespac scraper fatal error"));
});

// ── POST /api/fairrent/scrape/rentals — Lance le scraper Rentals.ca ──────────
router.post("/fairrent/scrape/rentals", (req: any, res: any) => {
  const apiKey = req.headers["x-fairrent-key"] as string | undefined;
  if (!apiKey || apiKey !== process.env.FAIRRENT_SCRAPER_KEY) {
    res.status(401).json({ error: "unauthorized" }); return;
  }
  const maxPages = Math.min(parseInt(String((req.body as any)?.max_pages ?? "20"), 10) || 20, 100);
  const citiesRaw = (req.body as any)?.cities;
  const cities    = Array.isArray(citiesRaw) ? (citiesRaw as string[]) : undefined;
  res.json({ status: "started", maxPages, cities: cities ?? "all", available: RENTALS_CITIES.map(c => c.city), engine: "rentals-v1" });
  void runRentalsScraper({ maxPages, cities })
    .then(results => {
      const total = results.reduce((a, r) => ({ inserted: a.inserted + r.inserted, updated: a.updated + r.updated, skipped: a.skipped + r.skipped }), { inserted: 0, updated: 0, skipped: 0 });
      logger.info({ results, total }, "rentals scraper completed");
    })
    .catch(err => logger.error({ err }, "rentals scraper fatal error"));
});

// ── POST /api/fairrent/scrape/rentola — Lance le scraper Rentola.ca ──────────
router.post("/fairrent/scrape/rentola", (req: any, res: any) => {
  const apiKey = req.headers["x-fairrent-key"] as string | undefined;
  if (!apiKey || apiKey !== process.env.FAIRRENT_SCRAPER_KEY) {
    res.status(401).json({ error: "unauthorized" }); return;
  }
  const maxPages = Math.min(parseInt(String((req.body as any)?.max_pages ?? "20"), 10) || 20, 100);
  const citiesRaw = (req.body as any)?.cities;
  const cities    = Array.isArray(citiesRaw) ? (citiesRaw as string[]) : undefined;
  res.json({ status: "started", maxPages, cities: cities ?? "all", available: RENTOLA_CITIES.map(c => c.city), engine: "rentola-v1" });
  void runRentolaScraper({ maxPages, cities })
    .then(results => {
      const total = results.reduce((a, r) => ({ inserted: a.inserted + r.inserted, updated: a.updated + r.updated, skipped: a.skipped + r.skipped }), { inserted: 0, updated: 0, skipped: 0 });
      logger.info({ results, total }, "rentola scraper completed");
    })
    .catch(err => logger.error({ err }, "rentola scraper fatal error"));
});

// ── GET /api/fairrent/health — Public system status (no auth required) ───────
router.get("/fairrent/health", async (_req, res) => {
  const t0 = Date.now();
  let dbOk = false;
  let listingsActive = 0;
  let pipeline24h: any = {};
  let lastAlert: any = null;

  try {
    const [dbCheck, pipeStats, alertStats, lastAlertRow] = await Promise.all([
      db.execute(sql`SELECT 1 AS ok`),
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed')                            AS ok,
          COUNT(*) FILTER (WHERE status != 'completed')                           AS errors,
          COUNT(*)                                                                 AS total,
          ROUND(AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL))::int AS avg_quality,
          ROUND(AVG(total_ms) FILTER (WHERE total_ms IS NOT NULL))::int           AS avg_ms,
          MAX(created_at)                                                          AS last_run
        FROM pipeline_runs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `),
      db.execute(sql`
        SELECT COUNT(*) AS active
        FROM fr_listings
        WHERE is_active = true AND deleted_at IS NULL
      `),
      db.execute(sql`
        SELECT sent_at FROM alert_sent_log ORDER BY sent_at DESC LIMIT 1
      `),
    ]);
    dbOk = (dbCheck.rows as any[]).length > 0;
    pipeline24h = (pipeStats.rows as any[])[0] ?? {};
    listingsActive = Number((alertStats.rows as any[])[0]?.active ?? 0);
    lastAlert = (lastAlertRow.rows as any[])[0] ?? null;
  } catch (err: any) {
    return res.status(503).json({
      status: "down",
      db: "error",
      error: err?.message ?? "unknown",
      checked_at: new Date().toISOString(),
      latency_ms: Date.now() - t0,
    });
  }

  const total = Number(pipeline24h.total ?? 0);
  const errors = Number(pipeline24h.errors ?? 0);
  const successRate = total > 0 ? Math.round((1 - errors / total) * 100) : 100;
  const avgQuality = Number(pipeline24h.avg_quality ?? 0);

  const pipelineStatus = total === 0 ? "idle"
    : successRate >= 80 && avgQuality >= 50 ? "healthy"
    : successRate >= 60 || avgQuality >= 30 ? "degraded"
    : "unhealthy";

  const overall = !dbOk ? "down"
    : pipelineStatus === "unhealthy" ? "degraded"
    : "healthy";

  return res.json({
    status: overall,
    checked_at: new Date().toISOString(),
    latency_ms: Date.now() - t0,
    components: {
      api:      { status: "healthy" },
      database: { status: dbOk ? "healthy" : "down" },
      pipeline: {
        status: pipelineStatus,
        window: "24h",
        total_runs:   total,
        errors:       errors,
        success_rate: successRate,
        avg_quality:  avgQuality,
        avg_ms:       Number(pipeline24h.avg_ms ?? 0),
        last_run:     pipeline24h.last_run ?? null,
      },
      listings: {
        status: listingsActive > 0 ? "healthy" : "idle",
        active: listingsActive,
      },
      alerts: {
        last_sent: lastAlert?.sent_at ?? null,
      },
    },
  });
});

// ── Stripe FairRent ──────────────────────────────────────────────────────────

const FAIRRENT_PLANS: Record<string, string | undefined> = {
  locataire:    process.env.Plan_Locataire_KEY,
  proprietaire: process.env.Plan_Proprietaire_KEY,
  pro:          process.env.Plan_Pro_KEY,
};

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-11-17.clover" });
}

// POST /api/fairrent/checkout
router.post("/fairrent/checkout", async (req: any, res: any) => {
  const { plan, success_url, cancel_url, customer_email } = req.body ?? {};
  const priceId = FAIRRENT_PLANS[plan as string];
  if (!priceId) {
    return res.status(400).json({ error: "plan_invalid", valid: Object.keys(FAIRRENT_PLANS) });
  }
  if (!success_url || !cancel_url) {
    return res.status(400).json({ error: "success_url et cancel_url requis" });
  }
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      ...(customer_email ? { customer_email } : {}),
      metadata: { plan, source: "fairrent" },
    });
    return res.json({ url: session.url, session_id: session.id });
  } catch (err) {
    logger.error({ err, plan }, "fairrent/checkout error");
    return res.status(500).json({ error: "stripe_error" });
  }
});

// ── Helpers Supabase Auth ────────────────────────────────────────────────────

async function sendMagicLink(email: string): Promise<void> {
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supaUrl || !supaKey) {
    logger.warn({ email }, "SUPABASE_URL / SUPABASE_SERVICE_KEY manquants — magic link non envoyé");
    return;
  }
  const r = await fetch(`${supaUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        supaKey,
      "Authorization": `Bearer ${supaKey}`,
    },
    body: JSON.stringify({
      type:    "magiclink",
      email,
      options: { redirect_to: "https://attentezero.ca/fairrent-login.html" },
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    logger.error({ email, status: r.status, body }, "magic link generation failed");
  } else {
    logger.info({ email }, "magic link envoyé");
  }
}

function stripeStatusToLocal(s: unknown): string {
  if (s === "active" || s === "trialing" || s === "past_due" || s === "canceled") return s as string;
  return "active";
}

// POST /api/fairrent/admin/seed — Crée un abonnement de test (admin uniquement, à supprimer après)
router.post("/fairrent/admin/seed", async (req: any, res: any) => {
  const secret = req.headers["x-admin-secret"];
  const adminSecret = process.env.ADMIN_SECRET ?? process.env.SUPABASE_SERVICE_KEY?.slice(-12);
  if (!secret || secret !== adminSecret) {
    return res.status(403).json({ error: "forbidden" });
  }
  const { email, plan = "pro" } = req.body ?? {};
  if (!email) return res.status(400).json({ error: "email requis" });
  try {
    await db.execute(sql`
      INSERT INTO fr_subscriptions (email, plan, status)
      VALUES (${email.toLowerCase().trim()}, ${plan}, 'active')
      ON CONFLICT (email) DO UPDATE SET plan = ${plan}, status = 'active'
    `);
    const result = await db.execute(sql`
      SELECT email, plan, status FROM fr_subscriptions WHERE email = ${email.toLowerCase().trim()}
    `);
    return res.json({ ok: true, row: (result as any).rows?.[0] });
  } catch (err) {
    logger.error({ err }, "fairrent/admin/seed error");
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/fairrent/auth/login — Supabase email+password → retourne access_token Supabase
// C'est CE token que citizen.html doit stocker comme fr_jwt (pas le session ID de mobile-auth)
router.post("/fairrent/auth/login", async (req: any, res: any) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "email_et_password_requis" });
  }
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supaUrl || !supaKey) {
    return res.status(503).json({ error: "auth_unavailable" });
  }
  try {
    const supaBase = supaUrl.replace(/\/$/, "").replace(/\/rest\/v1$/, "").replace(/\/auth\/v1$/, "");
    const r = await fetch(`${supaBase}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supaKey,
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json() as { access_token?: string; user?: { email?: string }; error?: string; error_description?: string };
    if (!r.ok || !data.access_token) {
      return res.status(401).json({ error: "identifiants_invalides" });
    }
    // Vérifier que l'abonné a bien un plan actif
    const result = await db.execute(sql`
      SELECT plan, status FROM fr_subscriptions
      WHERE email = ${email.toLowerCase().trim()} AND status IN ('active', 'trialing')
      LIMIT 1
    `);
    const sub = (result as unknown as { rows?: { plan: string; status: string }[] }).rows?.[0];
    return res.json({
      token:        data.access_token,
      email:        data.user?.email ?? email,
      plan:         sub?.plan ?? null,
      status:       sub?.status ?? null,
      subscribed:   !!sub,
    });
  } catch (err) {
    logger.error({ err }, "fairrent/auth/login error");
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/fairrent/auth/register — Supabase signup + row fr_subscriptions plan locataire
router.post("/fairrent/auth/register", async (req: any, res: any) => {
  const { email, password, full_name } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "email_et_password_requis" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "password_trop_court", min: 8 });
  }
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supaUrl || !supaKey) {
    return res.status(503).json({ error: "auth_unavailable" });
  }
  try {
    // Créer l'utilisateur Supabase via signup public
    const supaAnonKey = process.env.SUPABASE_ANON_KEY ?? supaKey;
    const r = await fetch(`${supaUrl.replace(/\/$/, "")}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey":       supaAnonKey,
      },
      body: JSON.stringify({
        email,
        password,
        data: { full_name: full_name ?? "" },
      }),
    });
    const data = await r.json() as { id?: string; email?: string; user?: { id?: string; email?: string }; error?: string; message?: string; error_description?: string };
    if (!r.ok) {
      const msg = data.error_description ?? data.message ?? data.error ?? "signup_failed";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        return res.status(409).json({ error: "email_deja_utilise" });
      }
      return res.status(400).json({ error: msg });
    }
    // Supabase signup retourne l'user dans data.user ou data directement
    const userId = data.user?.id ?? data.id ?? null;
    // Créer la souscription locataire gratuite
    await db.execute(sql`
      INSERT INTO fr_subscriptions (email, plan, status)
      VALUES (${email.toLowerCase().trim()}, 'locataire', 'active')
      ON CONFLICT (email) DO NOTHING
    `);
    // Auto-login pour retourner le token immédiatement
    const loginR = await fetch(`${supaUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": supaAnonKey },
      body: JSON.stringify({ email, password }),
    });
    const loginData = await loginR.json() as { access_token?: string };
    return res.status(201).json({
      token:      loginData.access_token ?? null,
      email:      email.toLowerCase().trim(),
      plan:       "locataire",
      status:     "active",
      subscribed: true,
    });
  } catch (err) {
    logger.error({ err }, "fairrent/auth/register error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/auth/me — info de l'abonné authentifié (valide le token)
router.get("/fairrent/auth/me", requireSub(), (req: any, res: any) => {
  const u = req.fairRentUser as { email: string; plan: string; status: string };
  const plan = u.plan;
  return res.json({
    email:        u.email,
    plan:         plan,
    status:       u.status,
    support_tier: SUPPORT_TIER[plan] ?? "standard",
    features: {
      city_limit:               plan === "locataire" ? 8 : null,
      alert_limit_per_month:    plan === "locataire" ? 1 : null,
      portfolio_limit:          PLAN_UNIT_LIMITS[plan] ?? 0,
      trends_weeks:             PLAN_WEEKS_LIMIT[plan] ?? 4,
      csv_export:               PLAN_TIER[plan] >= PLAN_TIER["pro"],
      advanced_analytics:       PLAN_TIER[plan] >= PLAN_TIER["pro"],
      neighborhood_comparison:  PLAN_TIER[plan] >= PLAN_TIER["proprietaire"],
    },
  });
});

// POST /api/fairrent/auth/magic-link — envoie un lien de connexion à l'abonné actif
// Rate limited : 3 req / IP / 10 min (géré dans app.ts)
router.post("/fairrent/auth/magic-link", async (req: any, res: any) => {
  const raw = req.body?.email;
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "email_invalide" });
  }
  try {
    const result = await db.execute(sql`
      SELECT plan FROM fr_subscriptions
      WHERE email = ${email} AND status IN ('active', 'trialing')
      LIMIT 1
    `);
    const sub = (result as unknown as { rows?: { plan: string }[] }).rows?.[0];
    if (sub) await sendMagicLink(email);
    // Toujours 200 — ne pas révéler si l'email est inscrit
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "fairrent/auth/magic-link error");
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/fairrent/stripe/webhook
// Configurer dans le dashboard Stripe : .../api/fairrent/stripe/webhook
router.post("/fairrent/stripe/webhook", async (req: any, res: any) => {
  const sig    = req.headers["stripe-signature"] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET_AZ;

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body.toString()) as Stripe.Event;
  } catch (err) {
    logger.warn({ err }, "fairrent webhook signature invalid");
    return res.status(400).json({ error: "webhook_signature_invalid" });
  }

  // Répondre immédiatement à Stripe avant le traitement DB
  res.json({ received: true });

  const obj = event.data.object as unknown as Record<string, unknown>;

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const email      = obj["customer_email"] as string | null;
        const customerId = obj["customer"]        as string | null;
        const subId      = obj["subscription"]    as string | null;
        const plan       = (obj["metadata"] as Record<string, string> | null)?.["plan"] ?? "locataire";

        if (!email) {
          logger.warn({ session_id: obj["id"] }, "fairrent checkout completed sans email");
          break;
        }

        await db.execute(sql`
          INSERT INTO fr_subscriptions (email, stripe_customer_id, stripe_sub_id, plan, status)
          VALUES (${email}, ${customerId}, ${subId}, ${plan}, 'active')
          ON CONFLICT (email) DO UPDATE SET
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            stripe_sub_id      = EXCLUDED.stripe_sub_id,
            plan               = EXCLUDED.plan,
            status             = 'active',
            updated_at         = NOW()
        `);
        logger.info({ email, plan, customerId }, "fr_subscriptions upserted");

        await sendMagicLink(email);
        break;
      }

      case "customer.subscription.updated": {
        const subId  = obj["id"]     as string | null;
        const status = stripeStatusToLocal(obj["status"]);
        if (!subId) break;
        await db.execute(sql`
          UPDATE fr_subscriptions
          SET status = ${status}, updated_at = NOW()
          WHERE stripe_sub_id = ${subId}
        `);
        logger.info({ subId, status }, "fr_subscriptions status updated");
        break;
      }

      case "customer.subscription.deleted": {
        const subId = obj["id"] as string | null;
        if (!subId) break;
        await db.execute(sql`
          UPDATE fr_subscriptions
          SET status = 'canceled', updated_at = NOW()
          WHERE stripe_sub_id = ${subId}
        `);
        logger.info({ subId }, "fr_subscriptions canceled");
        break;
      }

      default:
        logger.debug({ type: event.type }, "fairrent webhook unhandled event");
    }
  } catch (err) {
    logger.error({ err, event_type: event.type }, "fairrent webhook processing error");
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/fairrent/score — FairRent Score sur demande (locataire+)
// Query: city, price, bedrooms?, listing_type?
// Retourne score, decision, fair_value_estimate, potential_savings
// ═══════════════════════════════════════════════════════════════════════════
router.get("/fairrent/score", requireSub("locataire"), async (req: any, res: any) => {
  const city  = typeof req.query.city  === "string" && req.query.city.trim()  ? req.query.city.trim()  : null;
  const price = parseInt(String(req.query.price ?? ""), 10);

  if (!city || !isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "city_et_price_requis" });
  }

  const bedrooms    = parseInt(String(req.query.bedrooms ?? ""), 10) || null;
  const listingType = typeof req.query.listing_type === "string" ? req.query.listing_type.trim() : null;

  try {
    const medRes = await db.execute(sql`
      SELECT
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::int AS median_price,
        COUNT(*)::int AS sample_size
      FROM fr_listings
      WHERE is_active = true AND deleted_at IS NULL
        AND city ILIKE ${"%" + city + "%"}
        AND price BETWEEN 400 AND 10000
        AND (${bedrooms}::smallint IS NULL OR bedrooms = ${bedrooms}::smallint)
        AND (${listingType}::text IS NULL OR listing_type ILIKE ${listingType}::text)
    `);
    const medRow = (medRes as { rows?: { median_price: number | null; sample_size: number }[] }).rows?.[0];

    const ref      = MARKET_REFERENCE[_normalizeCity(city)];
    const median   = medRow?.median_price ?? ref?.p50_price ?? price;
    const sampleSz = medRow?.sample_size ?? 0;

    const ratio = price / (median || price);
    let score: number;
    let decision: string;
    if (ratio <= 0.88)        { score = Math.round(85 + (0.88 - ratio) / 0.88 * 15); decision = "VISIT"; }
    else if (ratio <= 1.08)   { score = Math.round(70 - (ratio - 0.88) / 0.20 * 15); decision = "NEGOTIATE"; }
    else                      { score = Math.round(Math.max(15, 55 - (ratio - 1.08) / 0.20 * 40)); decision = "AVOID"; }

    return res.json({
      city,
      price,
      bedrooms:            bedrooms ?? null,
      listing_type:        listingType ?? null,
      fairrent_score:      Math.min(100, Math.max(0, score)),
      decision,
      fair_value_estimate: median,
      potential_savings:   median - price,
      price_ratio:         Math.round(ratio * 100) / 100,
      data_source:         sampleSz >= 3 ? "fairrent" : "reference",
      sample_size:         sampleSz,
    });
  } catch (err) {
    logger.error({ err }, "fairrent/score GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/fairrent/neighborhood-comparison — Comparaison des quartiers (proprietaire+)
// Query: city (requis), bedrooms?, listing_type?
// Retourne les quartiers de la ville triés par score, prix médian, disponibilité
// ═══════════════════════════════════════════════════════════════════════════
router.get("/fairrent/neighborhood-comparison", requireSub("proprietaire"), async (req: any, res: any) => {
  const city = typeof req.query.city === "string" && req.query.city.trim() ? req.query.city.trim() : null;
  if (!city) return res.status(400).json({ error: "city_requis" });

  const bedrooms    = parseInt(String(req.query.bedrooms ?? ""), 10) || null;
  const listingType = typeof req.query.listing_type === "string" ? req.query.listing_type.trim() : null;

  try {
    const result = await db.execute(sql`
      SELECT
        COALESCE(NULLIF(TRIM(neighborhood), ''), 'Non précisé') AS neighborhood,
        COUNT(*)::int                                             AS listing_count,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::int  AS median_price,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price)::int AS p25_price,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)::int AS p75_price,
        ROUND(AVG(price))::int                                   AS avg_price,
        ROUND(AVG(fairrent_score) FILTER (WHERE fairrent_score IS NOT NULL))::int AS avg_score,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (NOW() - last_seen_at)) / 86400.0
        ))::int                                                  AS avg_days_listed,
        COUNT(*) FILTER (WHERE decision = 'VISIT')::int          AS visit_count,
        COUNT(*) FILTER (WHERE decision = 'NEGOTIATE')::int      AS negotiate_count,
        COUNT(*) FILTER (WHERE decision = 'AVOID')::int          AS avoid_count
      FROM fr_listings
      WHERE is_active = true
        AND deleted_at IS NULL
        AND city ILIKE ${"%" + city + "%"}
        AND price BETWEEN 400 AND 10000
        AND (${bedrooms}::smallint IS NULL OR bedrooms = ${bedrooms}::smallint)
        AND (${listingType}::text IS NULL OR listing_type ILIKE ${listingType}::text)
      GROUP BY COALESCE(NULLIF(TRIM(neighborhood), ''), 'Non précisé')
      HAVING COUNT(*) >= 2
      ORDER BY avg_score DESC NULLS LAST, listing_count DESC
      LIMIT 12
    `);

    const rows = (result as { rows?: unknown[] }).rows ?? [];
    const ref  = MARKET_REFERENCE[_normalizeCity(city)];

    return res.json({
      city,
      bedrooms:     bedrooms ?? null,
      listing_type: listingType ?? null,
      data_source:  rows.length >= 2 ? "fairrent" : "reference",
      neighborhoods: rows.length >= 2 ? rows : (ref?.neighborhoods ?? []),
      reference_median: ref?.p50_price ?? null,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "fairrent/neighborhood-comparison GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/fairrent/analytics — Analytics avancés (pro)
// Query: city?, weeks? (1–26)
// Retourne : distribution des prix, scores, vélocité marché, densité deals
// ═══════════════════════════════════════════════════════════════════════════
router.get("/fairrent/analytics", requireSub("pro"), async (req: any, res: any) => {
  const cityRaw  = typeof req.query.city === "string" && req.query.city.trim() ? req.query.city.trim() : null;
  const weeksBack = Math.min(26, Math.max(1, parseInt(String(req.query.weeks ?? "12"), 10) || 12));

  try {
    const cityClause = cityRaw ? sql`AND city ILIKE ${"%" + cityRaw + "%"}` : sql``;

    const [distRes, velocityRes, dealRes, typeRes] = await Promise.all([
      // Distribution des prix par tranches de 200$
      db.execute(sql`
        SELECT
          (FLOOR(price / 200) * 200)::int AS bucket,
          COUNT(*)::int                   AS count
        FROM fr_listings
        WHERE is_active = true AND deleted_at IS NULL
          AND price BETWEEN 400 AND 10000
          AND created_at > NOW() - (${weeksBack} || ' weeks')::interval
          ${cityClause}
        GROUP BY FLOOR(price / 200)
        ORDER BY bucket ASC
        LIMIT 40
      `),
      // Vélocité : nouvelles annonces par jour sur la période
      db.execute(sql`
        SELECT
          DATE(created_at)  AS day,
          COUNT(*)::int     AS new_listings
        FROM fr_listings
        WHERE is_active = true AND deleted_at IS NULL
          AND created_at > NOW() - (${weeksBack} || ' weeks')::interval
          ${cityClause}
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `),
      // Répartition des décisions + score moyen par décision
      db.execute(sql`
        SELECT
          COALESCE(decision, 'UNKNOWN') AS decision,
          COUNT(*)::int                 AS count,
          ROUND(AVG(fairrent_score))::int AS avg_score,
          ROUND(AVG(price))::int          AS avg_price
        FROM fr_listings
        WHERE is_active = true AND deleted_at IS NULL
          AND created_at > NOW() - (${weeksBack} || ' weeks')::interval
          ${cityClause}
        GROUP BY COALESCE(decision, 'UNKNOWN')
        ORDER BY count DESC
      `),
      // Prix médian par type de logement
      db.execute(sql`
        SELECT
          COALESCE(NULLIF(listing_type, ''), 'autre') AS listing_type,
          COUNT(*)::int                                AS count,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::int AS median_price,
          ROUND(AVG(fairrent_score))::int                          AS avg_score
        FROM fr_listings
        WHERE is_active = true AND deleted_at IS NULL
          AND created_at > NOW() - (${weeksBack} || ' weeks')::interval
          ${cityClause}
        GROUP BY COALESCE(NULLIF(listing_type, ''), 'autre')
        HAVING COUNT(*) >= 3
        ORDER BY count DESC
      `),
    ]);

    return res.json({
      city:              cityRaw ?? "all",
      weeks_back:        weeksBack,
      generated_at:      new Date().toISOString(),
      price_distribution: (distRes as { rows?: unknown[] }).rows ?? [],
      market_velocity:    (velocityRes as { rows?: unknown[] }).rows ?? [],
      deal_breakdown:     (dealRes as { rows?: unknown[] }).rows ?? [],
      by_listing_type:    (typeRes as { rows?: unknown[] }).rows ?? [],
    });
  } catch (err) {
    logger.error({ err }, "fairrent/analytics GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// ── PORTFOLIO ────────────────────────────────────────────────────────────────

// GET /api/fairrent/portfolio — liste des logements sauvegardés + stats
router.get("/fairrent/portfolio", requireSub("locataire"), async (req: any, res: any) => {
  try {
    const userId = req.fairRentUser?.id;
    const result = await db.execute(sql`
      SELECT
        id::text, user_id::text, listing_id::text,
        listing_url, title, price, city, province, neighborhood,
        listing_type, bedrooms, fairrent_score, decision, platform,
        status, notes, contact_name, visit_date, created_at, updated_at
      FROM fr_portfolio_units
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
    `);
    const units = (result as { rows?: Record<string, unknown>[] }).rows ?? [];

    const total       = units.length;
    const withScore   = units.filter((u: any) => u.fairrent_score != null);
    const scoreAvg    = withScore.length > 0
      ? Math.round(withScore.reduce((s: number, u: any) => s + Number(u.fairrent_score), 0) / withScore.length)
      : null;

    const stats = {
      total,
      candidatures: units.filter((u: any) => !["saved", "rejected"].includes(u.status as string)).length,
      en_attente:   units.filter((u: any) => ["to_contact", "contacted"].includes(u.status as string)).length,
      visites:      units.filter((u: any) => u.status === "visit").length,
      score_moyen:  scoreAvg,
    };

    return res.json({ units, stats });
  } catch (err) {
    logger.error({ err }, "fairrent/portfolio GET error");
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /api/fairrent/portfolio — sauvegarder un logement
router.post("/fairrent/portfolio", requireSub("locataire"), async (req: any, res: any) => {
  try {
    const userId = req.fairRentUser?.id;
    const {
      listing_url, listing_id, title, price, city, province, neighborhood,
      listing_type, bedrooms, fairrent_score, decision, platform,
    } = req.body ?? {};

    if (!listing_url) return res.status(400).json({ error: "listing_url_required" });

    const priceN = price != null ? parseInt(String(price), 10) : null;
    const bedsN  = bedrooms != null ? parseInt(String(bedrooms), 10) : null;
    const scoreN = fairrent_score != null ? parseInt(String(fairrent_score), 10) : null;
    const lid    = listing_id && String(listing_id).match(/^[0-9a-f-]{36}$/) ? listing_id : null;

    const result = await db.execute(sql`
      INSERT INTO fr_portfolio_units (
        user_id, listing_url, listing_id, title, price, city, province, neighborhood,
        listing_type, bedrooms, fairrent_score, decision, platform
      ) VALUES (
        ${userId}::uuid, ${listing_url}, ${lid ? sql`${lid}::uuid` : sql`NULL`},
        ${title ?? null}, ${priceN}, ${city ?? null}, ${province ?? null}, ${neighborhood ?? null},
        ${listing_type ?? null}, ${bedsN}, ${scoreN},
        ${decision ?? null}, ${platform ?? null}
      )
      ON CONFLICT (user_id, listing_url) DO UPDATE SET
        title          = COALESCE(EXCLUDED.title, fr_portfolio_units.title),
        price          = COALESCE(EXCLUDED.price, fr_portfolio_units.price),
        fairrent_score = COALESCE(EXCLUDED.fairrent_score, fr_portfolio_units.fairrent_score),
        updated_at     = NOW()
      RETURNING id::text, status
    `);
    const row = (result as { rows?: { id: string; status: string }[] }).rows?.[0];
    return res.json({ id: row?.id, status: row?.status });
  } catch (err) {
    logger.error({ err }, "fairrent/portfolio POST error");
    return res.status(500).json({ error: "server_error" });
  }
});

// PATCH /api/fairrent/portfolio/:id — mettre à jour statut / notes / contact
router.patch("/fairrent/portfolio/:id", requireSub("locataire"), async (req: any, res: any) => {
  try {
    const userId = req.fairRentUser?.id;
    const { id } = req.params;
    const body = req.body ?? {};

    const validStatuses = ["saved","to_contact","contacted","visit","documents","analysis","accepted","signed","rejected"];
    if (body.status !== undefined && !validStatuses.includes(body.status)) {
      return res.status(400).json({ error: "invalid_status" });
    }

    const hasStatus  = body.status       !== undefined;
    const hasNotes   = "notes"           in body;
    const hasContact = "contact_name"    in body;
    const hasVisit   = "visit_date"      in body;

    const sStatus  = hasStatus  ? (body.status       ?? null) : null;
    const sNotes   = hasNotes   ? (body.notes        ?? null) : null;
    const sContact = hasContact ? (body.contact_name ?? null) : null;
    const sVisit   = hasVisit   ? (body.visit_date   ?? null) : null;

    await db.execute(sql`
      UPDATE fr_portfolio_units SET
        status       = CASE WHEN ${hasStatus}::boolean  THEN ${sStatus}::text        ELSE status       END,
        notes        = CASE WHEN ${hasNotes}::boolean   THEN ${sNotes}::text         ELSE notes        END,
        contact_name = CASE WHEN ${hasContact}::boolean THEN ${sContact}::text       ELSE contact_name END,
        visit_date   = CASE WHEN ${hasVisit}::boolean   THEN ${sVisit}::timestamptz  ELSE visit_date   END,
        updated_at   = NOW()
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
    `);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "fairrent/portfolio PATCH error");
    return res.status(500).json({ error: "server_error" });
  }
});

// DELETE /api/fairrent/portfolio/:id — retirer un logement
router.delete("/fairrent/portfolio/:id", requireSub("locataire"), async (req: any, res: any) => {
  try {
    const userId = req.fairRentUser?.id;
    const { id } = req.params;
    await db.execute(sql`
      DELETE FROM fr_portfolio_units
      WHERE id = ${id}::uuid AND user_id = ${userId}::uuid
    `);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "fairrent/portfolio DELETE error");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /api/fairrent/discover/export-csv — Export CSV des résultats discover (max 1000 lignes)
router.get("/fairrent/discover/export-csv", requireSub("locataire"), async (req: any, res: any) => {
  try {
    const str2 = (v: unknown): string | null =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    const int2 = (v: unknown): number | null => {
      const n = parseInt(String(v ?? ""), 10);
      return isFinite(n) ? n : null;
    };

    const provF  = str2(req.query.province);
    const cityF  = str2(req.query.city);
    const nbhF   = str2(req.query.neighborhood);
    const maxP   = int2(req.query.max_price);
    const minP   = int2(req.query.min_price);
    const bdF    = int2(req.query.bedrooms);
    const parkF  = req.query.parking === "true" ? true : null;
    const petsF  = req.query.pets    === "true" ? true : null;

    const result = await db.execute(sql`
      SELECT
        l.city, l.province, l.neighborhood,
        l.price, l.bedrooms, l.listing_type, l.sqft,
        l.pets, l.parking,
        l.fairrent_score, l.decision,
        l.url, l.title, l.platform,
        l.last_seen_at
      FROM fr_listings l
      WHERE l.is_active = true AND l.deleted_at IS NULL
        AND (${provF}::text IS NULL    OR l.province    ILIKE ${provF}::text)
        AND (${cityF}::text IS NULL    OR l.city        ILIKE ${cityF}::text)
        AND (${nbhF}::text IS NULL     OR l.neighborhood ILIKE ${nbhF}::text)
        AND (${maxP}::int  IS NULL     OR l.price IS NULL OR l.price <= ${maxP}::int * 1.25)
        AND (${minP}::int  IS NULL     OR l.price IS NULL OR l.price >= ${minP}::int)
        AND (${bdF}::smallint IS NULL  OR l.bedrooms = ${bdF}::smallint)
        AND (${parkF}::boolean IS NULL OR l.parking  = ${parkF}::boolean)
        AND (${petsF}::boolean IS NULL OR l.pets     = ${petsF}::boolean)
      ORDER BY l.fairrent_score DESC NULLS LAST, l.last_seen_at DESC
      LIMIT 1000
    `);

    const rows = (result as { rows?: Record<string, unknown>[] }).rows ?? [];

    const headers = ["Ville","Province","Quartier","Prix","Chambres","Type","Sqft","Animaux","Stationnement","FairRent Score","Décision","URL","Titre","Plateforme","Dernière mise à jour"];
    const escape  = (v: unknown) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    };

    const lines = [
      headers.join(","),
      ...rows.map(r => [
        r.city, r.province, r.neighborhood,
        r.price, r.bedrooms, r.listing_type, r.sqft,
        r.pets ? "Oui" : r.pets === false ? "Non" : "",
        r.parking ? "Oui" : r.parking === false ? "Non" : "",
        r.fairrent_score, r.decision,
        r.url, r.title, r.platform,
        r.last_seen_at ? new Date(r.last_seen_at as string).toISOString().slice(0, 10) : "",
      ].map(escape).join(","))
    ];

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="fairrent-export-${date}.csv"`);
    res.send("﻿" + lines.join("\r\n")); // BOM pour Excel
  } catch (err) {
    logger.error({ err }, "fairrent/discover/export-csv error");
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
