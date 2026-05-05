/**
 * AttenteZéro v1.1.9 — Phase 2 : re-géocodage Google des fiches imprécises.
 *
 * Cible : services actifs avec service_type='physical' ET geocode_precision_m > 1500
 * (3287 fiches « rouges » à la fin de la migration Phase 1).
 *
 * Précision dérivée du `location_type` Google :
 *   ROOFTOP            → 20 m   (vert)
 *   RANGE_INTERPOLATED → 50 m   (vert)
 *   GEOMETRIC_CENTER   → 200 m  (jaune)
 *   APPROXIMATE        → 2000 m (rouge — on garde la fiche telle quelle si déjà rouge)
 *
 * Filtres de sécurité :
 *   - rejet si la réponse Google est hors Canada (latitude/longitude check)
 *   - rejet APPROXIMATE (pas mieux que ce qu'on a déjà)
 *   - DRY_RUN=1 → log seulement, n'écrit PAS en base
 *   - LIMIT=N  → ne traite que les N premières fiches (test)
 *   - SERVICE_ID=xxx → traite UNE fiche précise (debug)
 *
 * Reprise : utilise une table de checkpoint en mémoire ; en cas de crash,
 * relancer relancera les fiches non encore mises à jour (geocode_source != 'google').
 *
 * Usage :
 *   DRY_RUN=1 LIMIT=10 pnpm --filter @workspace/scripts run geocode-google
 *   LIMIT=10 pnpm --filter @workspace/scripts run geocode-google
 *   pnpm --filter @workspace/scripts run geocode-google
 */
import { db, servicesTable } from "@workspace/db";
import { and, eq, gt, isNotNull, ne, sql } from "drizzle-orm";

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_KEY) {
  console.error("ERROR: GOOGLE_MAPS_API_KEY manquant.");
  process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN === "1";
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;
const ONE_ID = process.env.SERVICE_ID || null;

// Politesse : Google permet 50 req/s mais on reste conservateur (0.1s = 10 req/s).
const DELAY_MS = 100;

// Bornes du Canada (lat 41-84, lng -141 à -52). On rejette tout ce qui sort.
const CA_BOUNDS = { latMin: 41, latMax: 84, lngMin: -141, lngMax: -52 };

type GoogleResult = {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
      location_type: "ROOFTOP" | "RANGE_INTERPOLATED" | "GEOMETRIC_CENTER" | "APPROXIMATE";
    };
    address_components: Array<{ types: string[]; long_name: string; short_name: string }>;
  }>;
  error_message?: string;
};

function precisionFromLocationType(t: string): number {
  switch (t) {
    case "ROOFTOP": return 20;
    case "RANGE_INTERPOLATED": return 50;
    case "GEOMETRIC_CENTER": return 200;
    default: return 2000; // APPROXIMATE — pas mieux que ce qu'on a
  }
}

function provinceFromComponents(comps: GoogleResult["results"][0]["address_components"]): string | null {
  const p = comps.find((c) => c.types.includes("administrative_area_level_1"));
  return p?.short_name ?? null;
}

async function geocode(address: string, city: string, province: string): Promise<{
  lat: number; lng: number; locationType: string; formatted: string; provinceMatch: boolean;
} | null> {
  const q = `${address}, ${city}, ${province}, Canada`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&region=ca&key=${GOOGLE_KEY}`;
  let res: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    res = await fetch(url, { signal: ctrl.signal });
  } catch (err) {
    console.error(`  ⚠ fetch error: ${(err as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    console.error(`  ⚠ HTTP ${res.status}`);
    return null;
  }
  const data = (await res.json()) as GoogleResult;
  if (data.status === "ZERO_RESULTS") return null;
  if (data.status !== "OK") {
    console.error(`  ⚠ Google status=${data.status} ${data.error_message ?? ""}`);
    if (data.status === "OVER_QUERY_LIMIT" || data.status === "REQUEST_DENIED") {
      throw new Error(`Google API blocked: ${data.status}`);
    }
    return null;
  }
  const r0 = data.results[0]!;
  const { lat, lng } = r0.geometry.location;
  if (lat < CA_BOUNDS.latMin || lat > CA_BOUNDS.latMax || lng < CA_BOUNDS.lngMin || lng > CA_BOUNDS.lngMax) {
    console.error(`  ⚠ hors Canada: (${lat}, ${lng})`);
    return null;
  }
  const returnedProv = provinceFromComponents(r0.address_components);
  const provinceMatch = returnedProv == null || returnedProv.toUpperCase() === province.toUpperCase();
  return {
    lat, lng,
    locationType: r0.geometry.location_type,
    formatted: r0.formatted_address,
    provinceMatch,
  };
}

async function main() {
  const where = and(
    eq(servicesTable.active, true),
    eq(servicesTable.serviceType, "physical"),
    gt(servicesTable.geocodePrecisionM, 1500),
    isNotNull(servicesTable.address),
    ne(servicesTable.address, ""),
    isNotNull(servicesTable.city),
    ne(servicesTable.city, ""),
    // Skip celles déjà re-géocodées par Google (pour la reprise)
    sql`(${servicesTable.geocodeSource} IS NULL OR ${servicesTable.geocodeSource} <> 'google')`,
  );

  const candidates = ONE_ID
    ? await db.select().from(servicesTable).where(eq(servicesTable.id, ONE_ID))
    : await db.select().from(servicesTable).where(where).orderBy(servicesTable.id);

  const total = Math.min(candidates.length, LIMIT);
  console.log(`──────────────────────────────────────────────────────────`);
  console.log(`Phase 2 — re-géocodage Google`);
  console.log(`Mode       : ${DRY_RUN ? "DRY-RUN (aucune écriture DB)" : "LIVE (écriture DB)"}`);
  console.log(`Candidats  : ${candidates.length} (limite: ${LIMIT === Infinity ? "aucune" : LIMIT})`);
  console.log(`À traiter  : ${total}`);
  console.log(`Coût estimé: ${(total * 0.005).toFixed(2)} $ USD`);
  console.log(`──────────────────────────────────────────────────────────`);

  const stats = { rooftop: 0, range: 0, center: 0, approximate: 0, notFound: 0, errors: 0, provMismatch: 0, written: 0 };

  for (let i = 0; i < total; i++) {
    const s = candidates[i]!;
    const label = `[${i + 1}/${total}] ${s.id} ${s.name.slice(0, 40)}`;
    process.stdout.write(`${label}\n  → ${s.address}, ${s.city}, ${s.province} ... `);

    let g: Awaited<ReturnType<typeof geocode>> = null;
    try {
      g = await geocode(s.address!.trim(), s.city.trim(), s.province);
    } catch (err) {
      console.error(`  ✗ FATAL: ${(err as Error).message}`);
      console.error("Arrêt du script (clé bloquée ou quota dépassé).");
      break;
    }

    if (!g) {
      console.log("✗ introuvable");
      stats.notFound++;
      await sleep(DELAY_MS);
      continue;
    }

    const precision = precisionFromLocationType(g.locationType);
    if (g.locationType === "APPROXIMATE") stats.approximate++;
    else if (g.locationType === "ROOFTOP") stats.rooftop++;
    else if (g.locationType === "RANGE_INTERPOLATED") stats.range++;
    else if (g.locationType === "GEOMETRIC_CENTER") stats.center++;

    if (!g.provinceMatch) {
      console.log(`⚠ province mismatch → SKIP`);
      stats.provMismatch++;
      await sleep(DELAY_MS);
      continue;
    }

    if (g.locationType === "APPROXIMATE") {
      console.log(`✗ APPROXIMATE (${g.formatted}) → SKIP`);
      await sleep(DELAY_MS);
      continue;
    }

    console.log(`✓ ${g.locationType} → ${g.lat.toFixed(5)},${g.lng.toFixed(5)} (~${precision}m)`);

    if (!DRY_RUN) {
      await db
        .update(servicesTable)
        .set({
          lat: g.lat,
          lng: g.lng,
          geocodePrecisionM: precision,
          geocodeSource: "google",
        })
        .where(eq(servicesTable.id, s.id));
      stats.written++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`──────────────────────────────────────────────────────────`);
  console.log(`Résultats :`);
  console.log(`  ROOFTOP (~20m, vert)        : ${stats.rooftop}`);
  console.log(`  RANGE_INTERPOLATED (~50m)   : ${stats.range}`);
  console.log(`  GEOMETRIC_CENTER (~200m, j) : ${stats.center}`);
  console.log(`  APPROXIMATE (rejeté)        : ${stats.approximate}`);
  console.log(`  Province mismatch (rejeté)  : ${stats.provMismatch}`);
  console.log(`  Introuvable                 : ${stats.notFound}`);
  console.log(`  Erreurs réseau              : ${stats.errors}`);
  console.log(`  → écrit en DB               : ${stats.written}`);
  console.log(`──────────────────────────────────────────────────────────`);
  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
