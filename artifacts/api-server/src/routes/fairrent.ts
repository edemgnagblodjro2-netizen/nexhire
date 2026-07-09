import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger";

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

// GET /api/fairrent/discover — Discovery Engine (Sprint 3)
// Discovery Score = 40% FairRent + 25% Budget + 15% Quartier + 10% Transport (placeholder 50) + 10% Fraîcheur
// Performance : fonctionne de 10 à 100k annonces sans modification de code (index fr_listings_discover_*)
router.get("/fairrent/discover", async (req, res) => {
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

    const cityF  = str2(req.query.city);
    const nbhF   = str2(req.query.neighborhood);
    const maxP   = int2(req.query.max_price);
    const minP   = int2(req.query.min_price);
    const bdF    = int2(req.query.bedrooms);
    const parkF  = req.query.parking === "true" ? true : null;
    const petsF  = req.query.pets    === "true" ? true : null;

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
    const searchUserId = req.isAuthenticated() ? ((req.user as any)?.id ?? null) : null;
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

// POST /api/fairrent/saved-properties — Sauvegarder une annonce (auth requise)
router.post("/fairrent/saved-properties", async (req, res) => {
  if (!req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ error: "non_authentifie" });
  }
  const userId   = (req.user as any).id as string;
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
router.get("/fairrent/saved-properties", async (req, res) => {
  if (!req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ error: "non_authentifie" });
  }
  const userId = (req.user as any).id as string;
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
router.post("/fairrent/search-alerts", async (req, res) => {
  if (!req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ error: "non_authentifie" });
  }
  const userId    = (req.user as any).id    as string;
  const userEmail = (req.user as any).email as string | null ?? null;

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

// GET /api/fairrent/search-alerts — Lister les alertes (auth requise)
router.get("/fairrent/search-alerts", async (req, res) => {
  if (!req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ error: "non_authentifie" });
  }
  const userId = (req.user as any).id as string;
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
router.patch("/fairrent/search-alerts/:id/toggle", async (req, res) => {
  if (!req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ error: "non_authentifie" });
  }
  const userId = (req.user as any).id as string;
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

// DELETE /api/fairrent/search-alerts/:id — Supprimer (soft delete, auth requise)
router.delete("/fairrent/search-alerts/:id", async (req, res) => {
  if (!req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ error: "non_authentifie" });
  }
  const userId = (req.user as any).id as string;
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

// DELETE /api/fairrent/saved-properties/:listingId — Unsave (soft delete, auth requise)
router.delete("/fairrent/saved-properties/:listingId", async (req, res) => {
  if (!req.isAuthenticated() || !(req.user as any)?.id) {
    return res.status(401).json({ error: "non_authentifie" });
  }
  const userId    = (req.user as any).id as string;
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
router.get("/fairrent/trends", async (req, res) => {
  try {
    const str2 = (v: unknown): string | null =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    const cityRaw  = str2(req.query.city) ?? "Montreal";
    const typeF    = str2(req.query.type);
    const weeksBack = Math.min(26, Math.max(4, parseInt(String(req.query.weeks ?? "12"), 10) || 12));

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
// ═══════════════════════════════════════════════════════════════════════════
router.post("/fairrent/portfolio", async (req, res) => {
  try {
    const raw = Array.isArray(req.body?.units) ? req.body.units.slice(0, 200) : [];
    if (raw.length === 0)
      return res.status(400).json({ error: "units_requis" });

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

export default router;

