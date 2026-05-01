import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
// Le bundle service-qc est compilé en CJS (Expo), donc on lit via default + module.exports
import * as ServicesData from "../../artifacts/service-qc/data/services";
const mod: any = (ServicesData as any).default ?? (ServicesData as any)["module.exports"] ?? ServicesData;
const SERVICES: any[] = mod.SERVICES;
const CATEGORY_LABELS: Record<string, string> = mod.CATEGORY_LABELS;
const PROVINCE_LABELS: Record<string, string> = mod.PROVINCE_LABELS;
if (!Array.isArray(SERVICES)) {
  throw new Error(`Could not load SERVICES (got ${typeof SERVICES}). Module keys: ${Object.keys(mod).join(", ")}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT du bundle static (artifacts/service-qc/data/services.ts) en CSV
//
// Sortie : exports/bundle-static-AAAAMMJJ.csv
// Utile pour archiver / inspecter ce que l'app mobile a embarqué en fallback
// avant de vider ce bundle.
// ─────────────────────────────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const header = [
  "id",
  "nom",
  "categorie_code",
  "categorie_label",
  "sous_categorie",
  "ville",
  "province_code",
  "province_label",
  "telephone",
  "site_web",
  "adresse",
  "horaires",
  "description",
  "urgent",
  "couvre_province",
  "badge_verifie",
  "featured",
  "lat",
  "lng",
  "langues",
  "organisation_id",
];

const lines = [header.join(",")];
for (const s of SERVICES) {
  lines.push(
    [
      s.id,
      s.name,
      s.category,
      CATEGORY_LABELS[s.category] ?? s.category,
      s.subcategory,
      s.city,
      s.province ?? "",
      s.province ? PROVINCE_LABELS[s.province] : "",
      s.phone,
      s.website ?? "",
      s.address ?? "",
      s.hours ?? "",
      s.description,
      s.isUrgent ? "oui" : "",
      s.isProvinceWide ? "oui" : "",
      s.badgeVerified ? "oui" : "",
      s.featured ? "oui" : "",
      s.coordinates?.lat ?? "",
      s.coordinates?.lng ?? "",
      (s.languages ?? []).join("|"),
      s.organisationId ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
}

const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const outPath = resolve(
  process.cwd(),
  "..",
  "exports",
  `bundle-static-${ts}.csv`,
);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join("\n"), "utf-8");

// Stats
const byCategory = new Map<string, number>();
const byProvince = new Map<string, number>();
const byCity = new Map<string, number>();
for (const s of SERVICES) {
  byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1);
  const p = s.province ?? "(non spécifiée)";
  byProvince.set(p, (byProvince.get(p) ?? 0) + 1);
  byCity.set(s.city, (byCity.get(s.city) ?? 0) + 1);
}

console.log(`─── CSV écrit : ${outPath} ───`);
console.log(`   ${SERVICES.length} fiches du bundle static.`);
console.log(`\n─── Répartition par catégorie ───`);
for (const [c, n] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${c.padEnd(15)} ${String(n).padStart(4)}`);
}
console.log(`\n─── Répartition par province ───`);
for (const [p, n] of [...byProvince.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${p.padEnd(20)} ${String(n).padStart(4)}`);
}
console.log(`\n─── Top 15 villes ───`);
for (const [c, n] of [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`  ${c.padEnd(35)} ${String(n).padStart(4)}`);
}
