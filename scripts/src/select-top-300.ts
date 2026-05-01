import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const TARGET_TOTAL = 300;

const POSTAL_RE = /[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]/i;
const PHONE_DIGITS_RE = /\d/g;

type Service = typeof servicesTable.$inferSelect;

function scorePhone(phone: string): number {
  if (!phone) return 0;
  const digits = phone.match(PHONE_DIGITS_RE)?.length ?? 0;
  if (digits < 10) return 0;
  if (digits === 10 || digits === 11) return 25;
  return 10;
}

function scoreAddress(s: Service): number {
  if (s.isProvinceWide) return 15;
  if (!s.address) return 0;
  const hasPostal = POSTAL_RE.test(s.address);
  const longEnough = s.address.length >= 15;
  if (hasPostal && longEnough) return 25;
  if (hasPostal) return 18;
  if (longEnough) return 10;
  return 5;
}

function scoreWebsite(website: string): number {
  if (!website) return 0;
  if (!website.startsWith("http")) return 0;
  return 10;
}

function scoreVerification(s: Service): number {
  if (!s.verifiedAt) return 0;
  const days = (Date.now() - new Date(s.verifiedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 30) return 25;
  if (days <= 90) return 18;
  if (days <= 365) return 10;
  return 5;
}

function scoreDescription(desc: string): number {
  if (!desc) return 0;
  if (desc.length >= 80) return 10;
  if (desc.length >= 30) return 5;
  return 0;
}

function scoreGeo(s: Service): number {
  return s.lat != null && s.lng != null ? 5 : 0;
}

function scoreCity(city: string): number {
  return city && city.length >= 2 ? 5 : 0;
}

function totalScore(s: Service): number {
  return (
    scorePhone(s.phone) +
    scoreAddress(s) +
    scoreWebsite(s.website) +
    scoreVerification(s) +
    scoreDescription(s.description) +
    scoreGeo(s) +
    scoreCity(s.city)
  );
}

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  console.log("─── Chargement des fiches actives ───");
  const all = await db.select().from(servicesTable).where(eq(servicesTable.active, true));
  console.log(`  → ${all.length} fiches actives au total`);

  const scored = all
    .map((s) => ({ s, score: totalScore(s) }))
    .sort((a, b) => b.score - a.score);

  // Stats globales
  const max = scored[0]?.score ?? 0;
  const median = scored[Math.floor(scored.length / 2)]?.score ?? 0;
  console.log(`  → score max=${max}, médiane=${median}, min=${scored.at(-1)?.score}`);

  // Stats par catégorie
  const byCat = new Map<string, { s: Service; score: number }[]>();
  for (const r of scored) {
    const arr = byCat.get(r.s.category) ?? [];
    arr.push(r);
    byCat.set(r.s.category, arr);
  }
  console.log("\n─── Disponible par catégorie (triées par score) ───");
  const cats = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [cat, arr] of cats) {
    console.log(`  ${cat.padEnd(20)} ${String(arr.length).padStart(5)} fiches  (top score: ${arr[0]?.score})`);
  }

  // ────────────── Sélection équilibrée ──────────────
  // Étape 1 : quota minimum par catégorie pour garantir la diversité
  // Étape 2 : on remplit les places restantes par score global
  const MIN_PER_CAT = 15;
  const MAX_PER_CAT = 60;

  const selected = new Map<string, Service>();
  // Étape 1 : top MIN_PER_CAT de chaque catégorie
  for (const [, arr] of byCat) {
    for (const r of arr.slice(0, MIN_PER_CAT)) {
      selected.set(r.s.id, r.s);
    }
  }
  console.log(`\n─── Étape 1 (quota min ${MIN_PER_CAT}/cat) : ${selected.size} fiches ───`);

  // Étape 2 : remplir le reste par score global, en respectant MAX_PER_CAT
  const catCount = new Map<string, number>();
  for (const s of selected.values()) {
    catCount.set(s.category, (catCount.get(s.category) ?? 0) + 1);
  }
  for (const r of scored) {
    if (selected.size >= TARGET_TOTAL) break;
    if (selected.has(r.s.id)) continue;
    const c = catCount.get(r.s.category) ?? 0;
    if (c >= MAX_PER_CAT) continue;
    selected.set(r.s.id, r.s);
    catCount.set(r.s.category, c + 1);
  }
  console.log(`─── Étape 2 (top score, max ${MAX_PER_CAT}/cat) : ${selected.size} fiches ───`);

  // Résumé final
  const finalArr = [...selected.values()];
  const finalByCat = new Map<string, number>();
  for (const s of finalArr) {
    finalByCat.set(s.category, (finalByCat.get(s.category) ?? 0) + 1);
  }
  console.log("\n─── Répartition finale ───");
  for (const [cat, n] of [...finalByCat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)} ${String(n).padStart(3)}`);
  }

  const finalByProv = new Map<string, number>();
  for (const s of finalArr) {
    finalByProv.set(s.province, (finalByProv.get(s.province) ?? 0) + 1);
  }
  console.log("\n─── Répartition par province ───");
  for (const [p, n] of [...finalByProv.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p.padEnd(5)} ${String(n).padStart(3)}`);
  }

  // Stats qualité du top 300
  const withPhone = finalArr.filter((s) => scorePhone(s.phone) >= 25).length;
  const withAddr = finalArr.filter((s) => scoreAddress(s) >= 18).length;
  const withWeb = finalArr.filter((s) => s.website?.startsWith("http")).length;
  const verified = finalArr.filter((s) => s.verifiedAt).length;
  const withGeo = finalArr.filter((s) => s.lat != null && s.lng != null).length;
  console.log("\n─── Qualité du top 300 ───");
  console.log(`  Tél valide (10-11 chiffres) : ${withPhone}/${finalArr.length} (${Math.round(withPhone/finalArr.length*100)}%)`);
  console.log(`  Adresse + code postal       : ${withAddr}/${finalArr.length} (${Math.round(withAddr/finalArr.length*100)}%)`);
  console.log(`  Site web                    : ${withWeb}/${finalArr.length} (${Math.round(withWeb/finalArr.length*100)}%)`);
  console.log(`  Vérifié manuellement        : ${verified}/${finalArr.length} (${Math.round(verified/finalArr.length*100)}%)`);
  console.log(`  Géolocalisé (lat/lng)       : ${withGeo}/${finalArr.length} (${Math.round(withGeo/finalArr.length*100)}%)`);

  // Tri final pour le CSV : par catégorie puis par score décroissant
  const scoreById = new Map(scored.map((r) => [r.s.id, r.score]));
  finalArr.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0);
  });

  // CSV complet
  const header = [
    "id", "score", "categorie", "sous_categorie", "nom",
    "ville", "province", "telephone", "adresse",
    "site_web", "description", "horaires",
    "urgent", "couvre_province", "lat", "lng",
    "verifie_le", "verifie_par",
  ];
  const lines = [header.join(",")];
  for (const s of finalArr) {
    lines.push([
      s.id,
      scoreById.get(s.id) ?? 0,
      s.category,
      s.subcategory,
      s.name,
      s.city,
      s.province,
      s.phone,
      s.address ?? "",
      s.website,
      s.description,
      s.hours ?? "",
      s.isUrgent ? "oui" : "",
      s.isProvinceWide ? "oui" : "",
      s.lat ?? "",
      s.lng ?? "",
      s.verifiedAt ? new Date(s.verifiedAt).toISOString().slice(0, 10) : "",
      s.verifiedBy ?? "",
    ].map(csvEscape).join(","));
  }

  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = resolve(process.cwd(), "..", "exports", `top-300-fiches-beton-${ts}.csv`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`\n─── CSV écrit : ${outPath} (${finalArr.length} fiches) ───`);

  // Liste des IDs (utile pour ré-imports / soft-delete du reste)
  const idsPath = resolve(process.cwd(), "..", "exports", `top-300-ids-${ts}.txt`);
  writeFileSync(idsPath, finalArr.map((s) => s.id).join("\n"), "utf-8");
  console.log(`─── IDs écrits : ${idsPath}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
