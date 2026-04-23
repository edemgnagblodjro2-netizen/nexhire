import "dotenv/config";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CSV_URL =
  "https://www.donneesquebec.ca/recherche/dataset/be36f85e-e419-4978-9c34-cb5795622595/resource/89af3537-4506-488c-8d0e-6d85b4033a0e/download/repertoire-installation.csv";
const CACHE = "/tmp/cpe-quebec.csv";

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
  return lower.replace(/(^|[\s\-'"\(])(\p{L})/gu, (_m, p, l) => p + l.toLocaleUpperCase("fr-CA"))
    .replace(/\bCpe\b/g, "CPE")
    .replace(/\bInc\.\b/gi, "inc.");
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    return `${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  }
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

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const csv = await fetchCsv();
  const rows = parseCsv(csv);
  console.log(`📄 Parsed ${rows.length} rows from open data`);

  const seen = new Set<string>();
  const toInsert = rows
    .map((r) => {
      const rawName = (r["NOM"] ?? "").trim().replace(/^"+|"+$/g, "");
      const type = (r["TYPE"] ?? "").trim();
      const city = (r["NOM_MUN_COMPO"] ?? "").trim();
      const region = (r["REGION"] ?? "").trim().replace(/^\d+\s*-\s*/, "");
      const addr = (r["ADRESSE"] ?? "").trim().replace(/^"+|"+$/g, "");
      const postal = (r["CODE_POSTAL_COMPO"] ?? "").trim().toUpperCase();
      const phone = formatPhone(r["telephone1"] ?? "");
      const email = (r["INTERNET"] ?? "").trim();
      const placesTotal = parseInt(r["PLACE_TOTAL"] ?? "0", 10) || 0;
      const placesPoupon = parseInt(r["PLACE_TOTAL_POUPON"] ?? "0", 10) || 0;

      if (!rawName || !city) return null;

      const fullAddr = addr ? `${addr}, ${city}, QC ${postal}`.trim() : `${city}, QC ${postal}`.trim();
      const name = titleCase(rawName);
      const subcategory = type === "CPE" ? "CPE" : type === "GARD" ? "Garderie" : type;

      const baseId = `cpe-qc-${slugify(city)}-${slugify(rawName)}`;
      let id = baseId;
      let n = 2;
      while (seen.has(id)) { id = `${baseId}-${n++}`; }
      seen.add(id);

      const descParts: string[] = [];
      descParts.push(subcategory === "CPE" ? "Centre de la petite enfance (CPE)." : "Garderie subventionnée ou non.");
      if (placesTotal) descParts.push(`${placesTotal} places${placesPoupon ? ` (dont ${placesPoupon} poupons)` : ""}.`);
      descParts.push("Source: Ministère de la Famille du Québec.");

      return {
        id,
        name,
        category: "childcare",
        subcategory,
        city,
        phone,
        website: email && email.includes("@") ? `mailto:${email}` : (email.startsWith("http") ? email : ""),
        description: descParts.join(" "),
        address: fullAddr,
        hours: null,
        isUrgent: false,
        isProvinceWide: false,
        lat: null,
        lng: null,
        active: true,
        verifiedAt: new Date(),
        verifiedBy: "donnees-quebec.ca",
        verificationNote: `Région: ${region}. Importé du Répertoire officiel des CPE et garderies (Ministère de la Famille).`,
      };
    })
    .filter(Boolean) as any[];

  console.log(`✅ Prepared ${toInsert.length} valid services`);
  console.log("📊 Sample:", toInsert.slice(0, 3).map((r) => ({ id: r.id, name: r.name, city: r.city, addr: r.address, phone: r.phone })));

  if (dryRun) {
    console.log("🚫 --dry-run set, exiting without DB changes");
    process.exit(0);
  }

  // Replace category=childcare in a transaction
  const result = await db.transaction(async (tx) => {
    const deleted = await tx.delete(servicesTable).where(eq(servicesTable.category, "childcare")).returning({ id: servicesTable.id });
    console.log(`🗑️  Deleted ${deleted.length} existing childcare entries`);

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
