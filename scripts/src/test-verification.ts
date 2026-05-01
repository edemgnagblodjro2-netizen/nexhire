import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq, and, isNotNull, ne, sql } from "drizzle-orm";

const FIREFOX_UA =
  "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0";
const NOMINATIM_UA = "AttenteZero-DataAudit/1.0 (contact@attentezero.ca)";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizePhone(p: string | null | undefined): string {
  if (!p) return "";
  return p.replace(/[^0-9]/g, "").replace(/^1/, "");
}

function extractPhones(html: string): string[] {
  const found = new Set<string>();
  const re =
    /(?:\+?1[\s\-.]?)?\(?(\d{3})\)?[\s\-.]?(\d{3})[\s\-.]?(\d{4})\b/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    found.add(`${m[1]}${m[2]}${m[3]}`);
  }
  return [...found];
}

async function nominatim(query: string): Promise<{
  ok: boolean;
  postcode?: string;
  display?: string;
}> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1&countrycodes=ca`;
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA } });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as Array<{
      display_name: string;
      address?: { postcode?: string };
    }>;
    if (!data.length) return { ok: false };
    return {
      ok: true,
      postcode: data[0].address?.postcode,
      display: data[0].display_name,
    };
  } catch {
    return { ok: false };
  }
}

async function fetchSite(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      headers: { "User-Agent": FIREFOX_UA },
      redirect: "follow",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function main() {
  console.log("─── Sélection 20 fiches actives au hasard ───\n");

  const rows = await db
    .select({
      id: servicesTable.id,
      nom: servicesTable.name,
      ville: servicesTable.city,
      province: servicesTable.province,
      tel: servicesTable.phone,
      adresse: servicesTable.address,
      site: servicesTable.website,
    })
    .from(servicesTable)
    .where(
      and(
        eq(servicesTable.active, true),
        isNotNull(servicesTable.phone),
        isNotNull(servicesTable.address),
        ne(servicesTable.phone, ""),
        ne(servicesTable.address, ""),
      ),
    )
    .orderBy(sql`random()`)
    .limit(20);

  console.log(`Échantillon : ${rows.length} fiches\n`);

  const results: Array<{
    id: string;
    nom: string;
    ville: string;
    addr_osm: string;
    cp_match: string;
    site_status: string;
    tel_match: string;
  }> = [];

  let i = 0;
  for (const r of rows) {
    i++;
    process.stdout.write(`[${i}/20] ${r.id.padEnd(35)} `);

    // Test 1 : adresse via OpenStreetMap
    const osmQuery = `${r.adresse}, ${r.ville}, ${r.province}, Canada`;
    const osm = await nominatim(osmQuery);
    let addrOsm = "❌ non trouvée";
    let cpMatch = "—";
    if (osm.ok) {
      addrOsm = "✅ trouvée";
      const cpInDb = (r.adresse ?? "").match(/[A-Z][0-9][A-Z]\s*[0-9][A-Z][0-9]/i)?.[0];
      if (osm.postcode && cpInDb) {
        cpMatch =
          osm.postcode.replace(/\s/g, "").toUpperCase() ===
          cpInDb.replace(/\s/g, "").toUpperCase()
            ? "✅ identique"
            : `⚠️ DB=${cpInDb} OSM=${osm.postcode}`;
      } else if (osm.postcode && !cpInDb) {
        cpMatch = `🆕 OSM=${osm.postcode} (DB vide)`;
      }
    }
    await sleep(1100); // respect rate limit Nominatim

    // Test 2 : crawl site → extraire téléphone
    let siteStatus = "—";
    let telMatch = "—";
    if (r.site) {
      const html = await fetchSite(r.site);
      if (html === null) {
        siteStatus = "❌ inaccessible";
      } else {
        siteStatus = "✅ OK";
        const phonesOnSite = extractPhones(html);
        const dbPhone = normalizePhone(r.tel);
        if (phonesOnSite.includes(dbPhone)) {
          telMatch = "✅ confirmé sur site";
        } else if (phonesOnSite.length > 0) {
          telMatch = `⚠️ DB=${dbPhone}, site=[${phonesOnSite.slice(0, 2).join(",")}]`;
        } else {
          telMatch = "❓ aucun n° sur la page";
        }
      }
    } else {
      siteStatus = "(pas de site)";
    }

    results.push({
      id: r.id,
      nom: (r.nom ?? "").slice(0, 35),
      ville: r.ville ?? "",
      addr_osm: addrOsm,
      cp_match: cpMatch,
      site_status: siteStatus,
      tel_match: telMatch,
    });

    process.stdout.write(`addr:${addrOsm.slice(0, 12)} | tel:${telMatch.slice(0, 25)}\n`);
  }

  console.log("\n═══ RÉSULTATS ═══\n");
  for (const r of results) {
    console.log(`▸ ${r.id} — ${r.nom} (${r.ville})`);
    console.log(`   adresse OSM : ${r.addr_osm}   |  CP : ${r.cp_match}`);
    console.log(`   site        : ${r.site_status}   |  tel : ${r.tel_match}`);
  }

  // Stats globales
  const addrOk = results.filter((r) => r.addr_osm.includes("✅")).length;
  const cpConfirme = results.filter((r) => r.cp_match.includes("✅")).length;
  const cpNouveau = results.filter((r) => r.cp_match.includes("🆕")).length;
  const cpDifferent = results.filter((r) => r.cp_match.includes("⚠️")).length;
  const siteOk = results.filter((r) => r.site_status.includes("✅")).length;
  const telConfirme = results.filter((r) => r.tel_match.includes("✅")).length;
  const telDifferent = results.filter((r) => r.tel_match.includes("⚠️")).length;

  console.log("\n═══ SYNTHÈSE ═══");
  console.log(`Adresses trouvées dans OSM .......... ${addrOk}/20`);
  console.log(`Code postal confirmé identique ...... ${cpConfirme}/20`);
  console.log(`Code postal récupéré (BDD vide) ..... ${cpNouveau}/20`);
  console.log(`Code postal DIFFÉRENT (à vérifier) .. ${cpDifferent}/20`);
  console.log(`Sites web accessibles ............... ${siteOk}/20`);
  console.log(`Téléphone CONFIRMÉ sur site officiel  ${telConfirme}/20`);
  console.log(`Téléphone DIFFÉRENT sur site (alerte) ${telDifferent}/20`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
