import { Router } from "express";
import { db, servicesTable, organisationsTable, subscriptionsTable, verificationRequestsTable } from "@workspace/db";
import { and, asc, count, desc, eq, ilike, inArray, isNull, isNotNull, or, sql } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const servicesRouter = Router();

// ── Admin auth middleware ───────────────────────────────────────────────────
function requireAdminKey(req: any, res: any, next: any) {
  const adminKey = process.env.ADMIN_API_KEY;
  // Header only — never accept admin key in query string (would leak to logs/proxies/Referer).
  const provided = req.headers["x-admin-key"];
  if (!adminKey || provided !== adminKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── GET /api/services  (public — for mobile app) ───────────────────────────
// Joins organisation + active subscription to expose `badgeVerified`, `featured`
// (Plus plan with active/trialing status) and `organisationId`.
// Sorts featured services first, then alphabetical.
servicesRouter.get("/services", async (_req, res) => {
  try {
    const featured = sql<boolean>`(${subscriptionsTable.plan} = 'plus' AND ${subscriptionsTable.status} IN ('active','trialing'))`;
    const badgeValid = sql<boolean>`(
      ${organisationsTable.badgeVerified} = true
      AND EXISTS (
        SELECT 1 FROM ${verificationRequestsTable}
        WHERE ${verificationRequestsTable.organisationId} = ${organisationsTable.id}
          AND ${verificationRequestsTable.status} IN ('approved', 'auto_approved')
          AND ${verificationRequestsTable.expiresAt} > now()
      )
    )`;
    const rows = await db
      .select({
        service: servicesTable,
        organisationId: organisationsTable.id,
        badgeVerified: badgeValid,
        featured,
      })
      .from(servicesTable)
      .leftJoin(organisationsTable, eq(organisationsTable.serviceId, servicesTable.id))
      .leftJoin(subscriptionsTable, and(
        eq(subscriptionsTable.organisationId, organisationsTable.id),
        inArray(subscriptionsTable.status, ["active", "trialing"]),
      ))
      .where(eq(servicesTable.active, true))
      .orderBy(desc(featured), asc(servicesTable.name));

    const services = rows.map((r) => ({
      ...r.service,
      organisationId: r.organisationId,
      badgeVerified: r.badgeVerified ?? false,
      featured: !!r.featured,
    }));
    res.json(services);
  } catch (err) {
    logger.error({ err }, "GET /api/services error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── GET /api/admin/services  (paginated, filtered) ─────────────────────────
servicesRouter.get("/admin/services", requireAdminKey, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const city = req.query.city as string | undefined;
    const province = req.query.province as string | undefined;
    const category = req.query.category as string | undefined;
    const activeFilter = req.query.active as string | undefined;
    const quality = req.query.quality as string | undefined;

    const conditions: any[] = [];

    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(servicesTable.name, q),
          ilike(servicesTable.description, q),
          ilike(servicesTable.subcategory, q),
        )
      );
    }
    if (city) conditions.push(eq(servicesTable.city, city));
    if (province) conditions.push(eq(servicesTable.province, province));
    if (category) conditions.push(eq(servicesTable.category, category));
    if (activeFilter === "true") conditions.push(eq(servicesTable.active, true));
    if (activeFilter === "false") conditions.push(eq(servicesTable.active, false));

    // Data quality filters
    if (quality === "missing-address") {
      conditions.push(or(isNull(servicesTable.address), eq(servicesTable.address, "")));
    } else if (quality === "missing-gps") {
      conditions.push(or(isNull(servicesTable.lat), isNull(servicesTable.lng)));
    } else if (quality === "missing-phone") {
      conditions.push(eq(servicesTable.phone, ""));
    } else if (quality === "suspect-phone") {
      conditions.push(
        or(
          ilike(servicesTable.phone, "%-5555%"),
          ilike(servicesTable.phone, "%-5558%"),
          ilike(servicesTable.phone, "%-0555%"),
          ilike(servicesTable.phone, "%555-555%"),
        ),
      );
    } else if (quality === "unverified") {
      conditions.push(isNull(servicesTable.verifiedAt));
    } else if (quality === "verified") {
      conditions.push(isNotNull(servicesTable.verifiedAt));
    } else if (quality === "stale") {
      // Verified more than 6 months ago
      conditions.push(
        and(
          isNotNull(servicesTable.verifiedAt),
          sql`${servicesTable.verifiedAt} < now() - interval '6 months'`,
        ),
      );
    } else if (quality === "province-wide") {
      conditions.push(eq(servicesTable.isProvinceWide, true));
    } else if (quality === "needs-fix") {
      // Real data quality problems AND not yet validated by admin.
      // Once an admin clicks "Marquer ✓", the fiche leaves this list
      // (interpreted as "I confirm this fiche is OK as-is").
      conditions.push(
        and(
          isNull(servicesTable.verifiedAt),
          or(
            isNull(servicesTable.address),
            eq(servicesTable.address, ""),
            isNull(servicesTable.lat),
            isNull(servicesTable.lng),
            eq(servicesTable.phone, ""),
            ilike(servicesTable.phone, "%-5555%"),
            ilike(servicesTable.phone, "%-5558%"),
            ilike(servicesTable.phone, "%-0555%"),
            ilike(servicesTable.phone, "%555-555%"),
          ),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(servicesTable)
        .where(where)
        .orderBy(asc(servicesTable.city), asc(servicesTable.name))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(servicesTable)
        .where(where),
    ]);

    res.json({
      data: rows,
      page,
      limit,
      total: Number(total),
      pages: Math.ceil(Number(total) / limit),
    });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/services error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── GET /api/admin/services/meta  (cities + categories list) ───────────────
servicesRouter.get("/admin/services/meta", requireAdminKey, async (req, res) => {
  try {
    const [cities, provinces, categories, stats] = await Promise.all([
      db
        .selectDistinct({ city: servicesTable.city })
        .from(servicesTable)
        .orderBy(asc(servicesTable.city)),
      db
        .select({
          province: servicesTable.province,
          count: count(),
        })
        .from(servicesTable)
        .where(eq(servicesTable.active, true))
        .groupBy(servicesTable.province)
        .orderBy(asc(servicesTable.province)),
      db
        .selectDistinct({ category: servicesTable.category })
        .from(servicesTable)
        .orderBy(asc(servicesTable.category)),
      db
        .select({
          total: count(),
          active: sql<number>`sum(case when ${servicesTable.active} then 1 else 0 end)`,
          urgent: sql<number>`sum(case when ${servicesTable.isUrgent} then 1 else 0 end)`,
          provinceWide: sql<number>`sum(case when ${servicesTable.isProvinceWide} then 1 else 0 end)`,
          missingAddress: sql<number>`sum(case when (${servicesTable.address} is null or ${servicesTable.address} = '') and ${servicesTable.active} then 1 else 0 end)`,
          missingGps: sql<number>`sum(case when (${servicesTable.lat} is null or ${servicesTable.lng} is null) and ${servicesTable.active} then 1 else 0 end)`,
          missingPhone: sql<number>`sum(case when ${servicesTable.phone} = '' and ${servicesTable.active} then 1 else 0 end)`,
          suspectPhone: sql<number>`sum(case when (${servicesTable.phone} ilike '%-5555%' or ${servicesTable.phone} ilike '%-5558%' or ${servicesTable.phone} ilike '%-0555%' or ${servicesTable.phone} ilike '%555-555%') and ${servicesTable.active} then 1 else 0 end)`,
          verified: sql<number>`sum(case when ${servicesTable.verifiedAt} is not null and ${servicesTable.active} then 1 else 0 end)`,
          unverified: sql<number>`sum(case when ${servicesTable.verifiedAt} is null and ${servicesTable.active} then 1 else 0 end)`,
          stale: sql<number>`sum(case when ${servicesTable.verifiedAt} is not null and ${servicesTable.verifiedAt} < now() - interval '6 months' and ${servicesTable.active} then 1 else 0 end)`,
          needsFix: sql<number>`sum(case when ${servicesTable.verifiedAt} is null and (${servicesTable.address} is null or ${servicesTable.address} = '' or ${servicesTable.lat} is null or ${servicesTable.lng} is null or ${servicesTable.phone} = '' or ${servicesTable.phone} ilike '%-5555%' or ${servicesTable.phone} ilike '%-5558%' or ${servicesTable.phone} ilike '%-0555%' or ${servicesTable.phone} ilike '%555-555%') and ${servicesTable.active} then 1 else 0 end)`,
        })
        .from(servicesTable),
    ]);

    res.json({
      cities: cities.map((r) => r.city).filter(Boolean),
      provinces: provinces
        .filter((r) => r.province)
        .map((r) => ({ code: r.province as string, count: Number(r.count) })),
      categories: categories.map((r) => r.category).filter(Boolean),
      stats: stats[0],
    });
  } catch (err) {
    logger.error({ err }, "GET /api/admin/services/meta error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── POST /api/admin/services  (create) ─────────────────────────────────────
servicesRouter.post("/admin/services", requireAdminKey, async (req, res) => {
  try {
    const body = req.body;
    if (!body.id || !body.name || !body.category) {
      return res.status(400).json({ error: "id, name, category are required" });
    }
    if (!VALID_CATEGORIES.includes(body.category)) {
      return res.status(400).json({ error: `Invalid category. Allowed: ${VALID_CATEGORIES.join(", ")}` });
    }
    if (body.province !== undefined && !VALID_PROVINCES.includes(body.province)) {
      return res.status(400).json({ error: `Invalid province. Allowed: ${VALID_PROVINCES.join(", ")}` });
    }

    const [created] = await db
      .insert(servicesTable)
      .values({
        id: body.id,
        name: body.name,
        category: body.category,
        subcategory: body.subcategory ?? "",
        city: body.city ?? "",
        province: body.province ?? "QC",
        phone: body.phone ?? "",
        website: body.website ?? "",
        description: body.description ?? "",
        address: body.address ?? null,
        hours: body.hours ?? null,
        isUrgent: body.isUrgent ?? false,
        isProvinceWide: body.isProvinceWide ?? false,
        lat: body.lat != null ? Number(body.lat) : null,
        lng: body.lng != null ? Number(body.lng) : null,
        active: body.active ?? true,
      })
      .returning();

    return res.status(201).json(created);
  } catch (err: any) {
    logger.error({ err }, "POST /api/admin/services error");
    // Drizzle wraps PG errors; check both top-level and .cause
    const pgCode = err?.code ?? err?.cause?.code;
    if (pgCode === "23505") {
      return res.status(409).json({ error: "Service ID already exists" });
    }
    return res.status(500).json({ error: "Internal error" });
  }
});

// ── PUT /api/admin/services/:id  (update) ──────────────────────────────────
servicesRouter.put("/admin/services/:id", requireAdminKey, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category)) {
      return res.status(400).json({ error: `Invalid category. Allowed: ${VALID_CATEGORIES.join(", ")}` });
    }
    if (body.province !== undefined && !VALID_PROVINCES.includes(body.province)) {
      return res.status(400).json({ error: `Invalid province. Allowed: ${VALID_PROVINCES.join(", ")}` });
    }

    const update: Partial<typeof servicesTable.$inferInsert> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.category !== undefined) update.category = body.category;
    if (body.subcategory !== undefined) update.subcategory = body.subcategory;
    if (body.city !== undefined) update.city = body.city;
    if (body.province !== undefined) update.province = body.province;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.website !== undefined) update.website = body.website;
    if (body.description !== undefined) update.description = body.description;
    if (body.address !== undefined) update.address = body.address;
    if (body.hours !== undefined) update.hours = body.hours;
    if (body.isUrgent !== undefined) update.isUrgent = body.isUrgent;
    if (body.isProvinceWide !== undefined) update.isProvinceWide = body.isProvinceWide;
    if (body.lat !== undefined) update.lat = body.lat != null ? Number(body.lat) : null;
    if (body.lng !== undefined) update.lng = body.lng != null ? Number(body.lng) : null;
    if (body.active !== undefined) update.active = body.active;

    const [updated] = await db
      .update(servicesTable)
      .set(update)
      .where(eq(servicesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Service not found" });
    return res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /api/admin/services/:id error");
    return res.status(500).json({ error: "Internal error" });
  }
});

// ── POST /api/admin/services/:id/verify  (mark as verified / un-verify) ───
servicesRouter.post("/admin/services/:id/verify", requireAdminKey, async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, verifiedBy, note } = req.body ?? {};

    const update: Partial<typeof servicesTable.$inferInsert> = verified === false
      ? { verifiedAt: null, verifiedBy: null, verificationNote: null }
      : {
          verifiedAt: new Date(),
          verifiedBy: verifiedBy || "admin",
          verificationNote: note || null,
        };

    const [updated] = await db
      .update(servicesTable)
      .set(update)
      .where(eq(servicesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Service not found" });
    return res.json(updated);
  } catch (err) {
    logger.error({ err }, "POST /api/admin/services/:id/verify error");
    return res.status(500).json({ error: "Internal error" });
  }
});

// ── DELETE /api/admin/services/:id  (soft delete) ──────────────────────────
servicesRouter.delete("/admin/services/:id", requireAdminKey, async (req, res) => {
  try {
    const { id } = req.params;
    const hard = req.query.hard === "true";

    if (hard) {
      await db.delete(servicesTable).where(eq(servicesTable.id, id));
    } else {
      await db
        .update(servicesTable)
        .set({ active: false })
        .where(eq(servicesTable.id, id));
    }

    res.json({ success: true, id });
  } catch (err) {
    logger.error({ err }, "DELETE /api/admin/services/:id error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── POST /api/admin/services/ai-suggest  (AI pre-fill via web search) ─────
// Body: { query: string, hint?: { city?: string, province?: string } }
// Returns a draft service object the admin can review and save.
const VALID_CATEGORIES = [
  "housing", "food", "mentalHealth", "health", "immigration",
  "employment", "family", "social", "childcare", "realestate",
  "legal", "administrative",
];

const VALID_PROVINCES = [
  "QC", "ON", "BC", "AB", "MB", "SK", "NB", "NS", "PE", "NL", "YT", "NT", "NU",
];

const SUGGEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "category", "subcategory", "city", "province",
    "phone", "website", "address", "description", "isProvinceWide",
    "sources", "confidence", "warnings",
  ],
  properties: {
    name: { type: "string", description: "Nom officiel exact de l'organisme." },
    category: { type: "string", enum: VALID_CATEGORIES },
    subcategory: { type: "string", description: "Type précis du service (ex: 'Banque alimentaire', 'Hébergement femmes')." },
    city: { type: "string", description: "Ville principale d'opération." },
    province: { type: "string", enum: VALID_PROVINCES },
    phone: { type: "string", description: "Téléphone format 'XXX-XXX-XXXX' ou '1-800-...'. Vide si introuvable." },
    website: { type: "string", description: "URL officielle complète (https://...). Vide si introuvable." },
    address: { type: "string", description: "Adresse civique complète. Vide si introuvable." },
    description: { type: "string", description: "Description courte FR (1-2 phrases) du service offert." },
    isProvinceWide: { type: "boolean", description: "True si service couvre toute la province (ligne 1-800, etc.)." },
    sources: {
      type: "array",
      description: "URLs sources web utilisées pour vérifier les infos.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["url", "title"],
        properties: {
          url: { type: "string" },
          title: { type: "string" },
        },
      },
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    warnings: {
      type: "array",
      description: "Avertissements pour l'humain (champ douteux, info manquante, etc.).",
      items: { type: "string" },
    },
  },
} as const;

// ── Rate-limit + concurrency for AI suggest (per admin key, in-process) ──
const AI_SUGGEST_MAX_QUERY_LEN = 200;
const AI_SUGGEST_WINDOW_MS = 60_000; // 1 minute window
const AI_SUGGEST_PER_KEY_LIMIT = 12; // 12 calls / minute / key (~1 every 5s)
const AI_SUGGEST_GLOBAL_LIMIT = 30;  // 30 calls / minute total
const AI_SUGGEST_TIMEOUT_MS = 90_000; // 90s hard timeout per call
const aiSuggestCalls = new Map<string, number[]>(); // key → array of timestamps
const aiSuggestInFlight = new Map<string, number>(); // key → in-flight count

function checkRateLimit(adminKey: string): { ok: true } | { ok: false; retryAfter: number; reason: string } {
  const now = Date.now();
  const cutoff = now - AI_SUGGEST_WINDOW_MS;

  // Clean up old entries (and tally global)
  let globalCount = 0;
  for (const [k, ts] of aiSuggestCalls) {
    const fresh = ts.filter((t) => t > cutoff);
    if (fresh.length === 0) aiSuggestCalls.delete(k);
    else {
      aiSuggestCalls.set(k, fresh);
      globalCount += fresh.length;
    }
  }

  if (globalCount >= AI_SUGGEST_GLOBAL_LIMIT) {
    return { ok: false, retryAfter: Math.ceil(AI_SUGGEST_WINDOW_MS / 1000), reason: "global rate limit" };
  }

  const keyCalls = aiSuggestCalls.get(adminKey) ?? [];
  if (keyCalls.length >= AI_SUGGEST_PER_KEY_LIMIT) {
    return { ok: false, retryAfter: Math.ceil(AI_SUGGEST_WINDOW_MS / 1000), reason: "per-key rate limit" };
  }

  const inFlight = aiSuggestInFlight.get(adminKey) ?? 0;
  if (inFlight >= 2) {
    return { ok: false, retryAfter: 5, reason: "concurrency limit (max 2 simultaneous)" };
  }

  keyCalls.push(now);
  aiSuggestCalls.set(adminKey, keyCalls);
  aiSuggestInFlight.set(adminKey, inFlight + 1);
  return { ok: true };
}

function releaseInFlight(adminKey: string) {
  const cur = aiSuggestInFlight.get(adminKey) ?? 1;
  if (cur <= 1) aiSuggestInFlight.delete(adminKey);
  else aiSuggestInFlight.set(adminKey, cur - 1);
}

// ── Post-AI sanitization: strip anything that doesn't look real ──────────
const PHONE_RE = /^(?:1-)?\d{3}-\d{3}-\d{4}$|^(?:1-)?(?:8(?:00|33|44|55|66|77|88)-\d{3}-\d{4})$|^[2-9]11$|^\d{3,4}$/;

function sanitizeSuggestion(s: any): { sanitized: any; addedWarnings: string[] } {
  const warnings: string[] = [];

  // phone: keep only if matches a Canadian-ish format, else clear
  if (s.phone && !PHONE_RE.test(String(s.phone).trim())) {
    warnings.push(`Téléphone "${s.phone}" rejeté (format inattendu) — à saisir à la main.`);
    s.phone = "";
  }

  // website: must be http(s) URL
  if (s.website) {
    try {
      const u = new URL(s.website);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        warnings.push(`Site web "${s.website}" rejeté (protocole non-http) — à saisir à la main.`);
        s.website = "";
      }
    } catch {
      warnings.push(`Site web "${s.website}" rejeté (URL invalide) — à saisir à la main.`);
      s.website = "";
    }
  }

  // sources: keep only http(s) URLs
  if (Array.isArray(s.sources)) {
    s.sources = s.sources.filter((src: any) => {
      try {
        const u = new URL(src?.url ?? "");
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    });
  } else {
    s.sources = [];
  }

  // confidence vs sources sanity check
  if (s.confidence === "high" && s.sources.length === 0) {
    warnings.push("⚠️ Aucune source web fournie : fiabilité ramenée à 'low'.");
    s.confidence = "low";
  }

  // address sanity: if it looks like just a city/province, clear it
  if (s.address && s.address.length < 8) {
    warnings.push(`Adresse "${s.address}" trop courte — à saisir à la main.`);
    s.address = "";
  }

  return { sanitized: s, addedWarnings: warnings };
}

servicesRouter.post("/admin/services/ai-suggest", requireAdminKey, async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string;
  const query = String(req.body?.query ?? "").trim();
  const hintCity = req.body?.hint?.city ? String(req.body.hint.city) : undefined;
  const hintProvince = req.body?.hint?.province ? String(req.body.hint.province) : undefined;
  const allowFallback = req.body?.allowFallback === true;

  if (!query || query.length < 3) {
    return res.status(400).json({ error: "query is required (min 3 chars)" });
  }
  if (query.length > AI_SUGGEST_MAX_QUERY_LEN) {
    return res.status(400).json({ error: `query too long (max ${AI_SUGGEST_MAX_QUERY_LEN} chars)` });
  }

  const limit = checkRateLimit(adminKey);
  if (!limit.ok) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    return res.status(429).json({
      error: "Trop de requêtes IA, réessayez dans quelques secondes.",
      reason: limit.reason,
      retryAfter: limit.retryAfter,
    });
  }

  const instructions = [
    "Tu es un assistant qui aide à remplir une fiche d'organisme communautaire au Canada (FR).",
    "Cherche sur le web l'information OFFICIELLE et la plus à jour pour l'organisme demandé.",
    "Privilégie : site officiel de l'organisme, sites .gouv.qc.ca / .gc.ca / .ca, 211, Centraide.",
    "NE JAMAIS inventer un téléphone, une adresse ou une URL. Si tu n'es pas sûr, laisse vide et ajoute un warning.",
    "Format téléphone : 'XXX-XXX-XXXX' ou '1-800-XXX-XXXX'.",
    "Catégories autorisées :",
    "  - housing (logement, hébergement, refuge)",
    "  - food (alimentation, banque alimentaire, dépannage)",
    "  - mentalHealth (santé mentale, ligne d'écoute, crise)",
    "  - health (santé physique, CLSC, clinique)",
    "  - immigration (accueil immigrants, réfugiés)",
    "  - employment (emploi, formation, CJE)",
    "  - family (famille, violence conjugale, jeunesse)",
    "  - social (entraide, soutien général, Centraide)",
    "  - childcare (garderie, CPE, services de garde)",
    "  - realestate (achat immobilier, banque hypothécaire)",
    "  - legal (aide juridique, droit)",
    "  - administrative (démarches gouvernementales)",
    "isProvinceWide = true si l'organisme dessert TOUTE la province (ex: ligne 1-800, ministère).",
    "Toujours retourner les sources web utilisées (URLs réelles consultées).",
    "Confidence: 'high' si site officiel trouvé + tél confirmé; 'medium' si une info manque; 'low' si infos partielles.",
  ].join("\n");

  const userPrompt = [
    `Recherche : ${query}`,
    hintCity ? `Indice ville : ${hintCity}` : null,
    hintProvince ? `Indice province : ${hintProvince}` : null,
    "Trouve les informations officielles et remplis la fiche selon le schéma JSON.",
  ].filter(Boolean).join("\n");

  // Hard timeout via AbortController so a hung OpenAI call cannot block forever
  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), AI_SUGGEST_TIMEOUT_MS);

  try {
    // Try OpenAI Responses API with web_search tool
    const response = await (openai as any).responses.create(
      {
        model: "gpt-5-mini",
        instructions,
        input: userPrompt,
        tools: [{ type: "web_search" }],
        text: {
          format: {
            type: "json_schema",
            name: "service_suggestion",
            strict: true,
            schema: SUGGEST_SCHEMA,
          },
        },
      },
      { signal: ac.signal },
    );

    // Extract the final JSON output from the response
    const outputText = (response as any).output_text
      ?? extractJsonFromResponse(response);

    if (!outputText) {
      logger.error({ response }, "AI suggest: no output_text in response");
      return res.status(502).json({ error: "AI returned no usable output" });
    }

    let parsed: any;
    try {
      parsed = typeof outputText === "string" ? JSON.parse(outputText) : outputText;
    } catch (e) {
      logger.error({ outputText, err: e }, "AI suggest: failed to parse JSON");
      return res.status(502).json({ error: "AI returned invalid JSON" });
    }

    // Sanitize before returning to UI (anti-hallucination)
    const { sanitized, addedWarnings } = sanitizeSuggestion(parsed);
    sanitized.warnings = [...(Array.isArray(sanitized.warnings) ? sanitized.warnings : []), ...addedWarnings];

    return res.json({
      ...sanitized,
      generatedAt: new Date().toISOString(),
      model: "gpt-5-mini",
      mode: "web_search",
    });
  } catch (err: any) {
    const wasAborted = ac.signal.aborted;
    logger.warn({ err: err?.message, aborted: wasAborted, allowFallback }, "AI suggest with web_search failed");

    // Fail closed by default — only run fallback if caller explicitly opted in.
    // Rationale: a no-web answer can fabricate plausible-but-false phone/address.
    if (!allowFallback) {
      const status = wasAborted ? 504 : 502;
      return res.status(status).json({
        error: wasAborted
          ? "Délai dépassé (>90 s). Réessayez dans un instant."
          : "Recherche web indisponible. Réessayez dans un instant ou saisissez les champs à la main.",
        detail: err?.message,
        canRetry: true,
      });
    }

    // Explicit opt-in fallback (no web search, lower trust)
    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: instructions + "\n\n⚠️ Tu n'as PAS accès au web — base-toi sur tes connaissances. NE JAMAIS inventer un téléphone/adresse/site, laisse vide en cas de doute. Marque confidence='low'." },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "service_suggestion",
              strict: true,
              schema: SUGGEST_SCHEMA as any,
            },
          },
        },
        { signal: ac.signal },
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(502).json({ error: "AI fallback returned no content" });
      }
      const parsed = JSON.parse(content);

      // Sanitize + force fail-closed flags
      const { sanitized, addedWarnings } = sanitizeSuggestion(parsed);
      const warnings = [...(Array.isArray(sanitized.warnings) ? sanitized.warnings : []), ...addedWarnings];
      if (!warnings.some((w: string) => w.includes("VÉRIFIER") || w.includes("sans recherche web"))) {
        warnings.unshift("⚠️ Généré sans recherche web — vérifier toutes les infos avant d'enregistrer.");
      }
      return res.json({
        ...sanitized,
        warnings,
        confidence: "low",
        generatedAt: new Date().toISOString(),
        model: "gpt-5-mini",
        mode: "fallback_no_web",
      });
    } catch (fallbackErr: any) {
      logger.error({ err: fallbackErr?.message, original: err?.message }, "AI suggest fallback also failed");
      return res.status(500).json({
        error: "AI suggestion failed",
        detail: fallbackErr?.message ?? err?.message,
      });
    }
  } finally {
    clearTimeout(timeoutId);
    releaseInFlight(adminKey);
  }
});

function extractJsonFromResponse(response: any): string | null {
  // Walk the Responses API output array looking for the final assistant text
  const output = response?.output;
  if (!Array.isArray(output)) return null;
  for (let i = output.length - 1; i >= 0; i--) {
    const item = output[i];
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const c of item.content) {
        if (c?.type === "output_text" && typeof c.text === "string") return c.text;
        if (c?.type === "text" && typeof c.text === "string") return c.text;
      }
    }
  }
  return null;
}

export default servicesRouter;
