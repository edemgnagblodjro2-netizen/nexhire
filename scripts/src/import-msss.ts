import "dotenv/config";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CSV_URL =
  "https://www.donneesquebec.ca/recherche/dataset/51998b55-7d4c-4381-8c20-0ac1cd9c1b87/resource/2aa06e66-c1d0-4e2f-bf3c-c2e413c3f84d/download/installationscsv.csv";
const CACHE = "/tmp/msss-installations.csv";

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const header = rows[0];
  return rows.slice(1)
    .filter((r) => r.length === header.length && r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function titleCase(s: string): string {
  const lower = s.toLocaleLowerCase("fr-CA");
  return lower.replace(/(^|[\s\-'"\(\.])(\p{L})/gu, (_m, p, l) => p + l.toLocaleUpperCase("fr-CA"))
    .replace(/\bClsc\b/gi, "CLSC")
    .replace(/\bChsld\b/gi, "CHSLD")
    .replace(/\bCh\b/gi, "CH")
    .replace(/\bCiusss\b/gi, "CIUSSS")
    .replace(/\bCisss\b/gi, "CISSS")
    .replace(/\bGmf\b/gi, "GMF");
}

function formatPhone(raw: string): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) return `${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  return raw.trim();
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function fetchCsv(): Promise<string> {
  if (existsSync(CACHE)) {
    console.log("📦 Using cached CSV at", CACHE);
    return readFileSync(CACHE, "utf-8");
  }
  console.log("⬇️  Downloading", CSV_URL);
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  writeFileSync(CACHE, text);
  return text;
}

type CategorySpec = {
  category: string;
  flags: string[]; // installation flags to include (CLSC, CHSGS, CHSLD, CHPSY...)
  subcategoryFor: (r: Record<string, string>) => string;
};

const SPECS: Record<string, CategorySpec> = {
  health: {
    category: "health",
    flags: ["CLSC", "CHSGS", "CHSLD"],
    subcategoryFor: (r) => {
      if (r.CLSC === "Oui") return "CLSC";
      if (r.CHSGS === "Oui") return "Hôpital";
      if (r.CHSLD === "Oui") return "CHSLD";
      return "Établissement";
    },
  },
  mentalHealth: {
    category: "mentalHealth",
    flags: ["CHPSY"],
    subcategoryFor: () => "Centre hospitalier psychiatrique",
  },
};

async function main() {
  const targetCat = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!targetCat || !SPECS[targetCat]) {
    console.error(`Usage: tsx import-msss.ts <category> [--dry-run]\nAvailable: ${Object.keys(SPECS).join(", ")}`);
    process.exit(1);
  }
  const spec = SPECS[targetCat];

  const csv = await fetchCsv();
  const rows = parseCsv(csv);
  console.log(`📄 Parsed ${rows.length} installations from MSSS M02`);

  const filtered = rows.filter((r) => spec.flags.some((f) => r[f] === "Oui"));
  console.log(`🔎 Filtered ${filtered.length} matching ${spec.flags.join("/")}`);

  const seen = new Set<string>();
  const toInsert = filtered
    .map((r) => {
      const rawName = (r["INSTAL_NOM"] ?? "").trim();
      const etabName = (r["ETAB_NOM_A"] ?? r["ETAB_NOM"] ?? "").trim();
      const city = (r["MUN_NOM"] ?? "").trim();
      const region = (r["RSS_NOM"] ?? "").trim();
      const addr = (r["ADRESSE"] ?? "").trim();
      const postal = (r["CODE_POSTA"] ?? "").trim().toUpperCase().replace(/^(\w{3})(\w{3})$/, "$1 $2");
      const lat = parseFloat(r["LATITUDE"] ?? "");
      const lng = parseFloat(r["LONGITUDE"] ?? "");
      const dateOuv = (r["DATE_OUVER"] ?? "").trim();

      if (!rawName || !city) return null;

      const fullAddr = addr ? `${addr}, ${city}, QC ${postal}`.trim() : `${city}, QC ${postal}`.trim();
      const name = titleCase(rawName);
      const subcategory = spec.subcategoryFor(r);

      const baseId = `msss-${slugify(subcategory)}-${slugify(city)}-${slugify(rawName)}`;
      let id = baseId;
      let n = 2;
      while (seen.has(id)) { id = `${baseId}-${n++}`; }
      seen.add(id);

      const descParts: string[] = [];
      const subcategoryDesc: Record<string, string> = {
        "CLSC": "Centre local de services communautaires (CLSC). Services de première ligne en santé et services sociaux.",
        "Hôpital": "Centre hospitalier de soins généraux et spécialisés (CHSGS).",
        "CHSLD": "Centre d'hébergement et de soins de longue durée (CHSLD).",
        "Centre hospitalier psychiatrique": "Centre hospitalier offrant des soins psychiatriques spécialisés.",
      };
      if (subcategoryDesc[subcategory]) descParts.push(subcategoryDesc[subcategory]);
      if (etabName) descParts.push(`Rattaché à ${titleCase(etabName)}.`);
      descParts.push("Source: MSSS – Fichier M02 des installations.");

      return {
        id,
        name,
        category: spec.category,
        subcategory,
        city,
        phone: "",
        website: "",
        description: descParts.join(" "),
        address: fullAddr,
        hours: null,
        isUrgent: subcategory === "Hôpital",
        isProvinceWide: false,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        active: true,
        verifiedAt: new Date(),
        verifiedBy: "donnees-quebec.ca/MSSS",
        verificationNote: `Région: ${region}. Date d'ouverture: ${dateOuv || "n/d"}. Importé du fichier M02 (Ministère de la Santé et des Services sociaux).`,
      };
    })
    .filter(Boolean) as any[];

  console.log(`✅ Prepared ${toInsert.length} valid services for category=${spec.category}`);
  console.log("📊 Samples:", toInsert.slice(0, 3).map((r) => ({ id: r.id, name: r.name, city: r.city, addr: r.address, gps: [r.lat, r.lng] })));

  if (dryRun) {
    console.log("🚫 --dry-run set, exiting without DB changes");
    process.exit(0);
  }

  const result = await db.transaction(async (tx) => {
    const deleted = await tx.delete(servicesTable).where(eq(servicesTable.category, spec.category)).returning({ id: servicesTable.id });
    console.log(`🗑️  Deleted ${deleted.length} existing ${spec.category} entries`);

    const batchSize = 200;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      await tx.insert(servicesTable).values(batch).onConflictDoNothing();
      inserted += batch.length;
      process.stdout.write(`\r📥 Inserted ${inserted}/${toInsert.length}`);
    }
    process.stdout.write("\n");
    return { deleted: deleted.length, inserted };
  });

  console.log(`\n🎉 Done. Deleted: ${result.deleted}, Inserted: ${result.inserted}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
