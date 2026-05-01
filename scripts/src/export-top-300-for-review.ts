import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT CSV DE RÉVISION MANUELLE — TOP 300 FICHES
//
// Lit la liste d'IDs produite par select-top-300.ts et génère un CSV optimisé
// pour la vérification manuelle :
//   - Toutes les valeurs ACTUELLES à gauche (lecture seule)
//   - Toutes les colonnes _CORRIGE à droite (à remplir si erreur)
//   - Colonne action (garder|corriger|supprimer)
//   - Colonne notes
//   - Trié par catégorie puis par nom (pour bosser par lots thématiques)
//
// Le CSV produit est compatible avec apply-corrections-csv.ts en mode strict :
//   - action="garder" → fiche marquée vérifiée, aucun changement
//   - action="corriger" + colonnes _corrige remplies → applique les corrections
//   - action="supprimer" → soft-delete (active=false)
// ─────────────────────────────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const idsPath = resolve(process.cwd(), "..", "exports", `top-300-ids-${ts}.txt`);
  console.log(`─── Lecture IDs : ${idsPath} ───`);
  const ids = readFileSync(idsPath, "utf-8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`  → ${ids.length} IDs`);

  const services = await db
    .select()
    .from(servicesTable)
    .where(inArray(servicesTable.id, ids));
  console.log(`  → ${services.length} fiches chargées`);

  // Tri : par catégorie puis par nom
  services.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  // Header — compatible apply-corrections-csv.ts
  const header = [
    "id",
    "categorie",
    "nom",
    "site_actuel",
    "site_corrige",
    "telephone_actuel",
    "telephone_corrige",
    "ville_actuelle",
    "ville_corrigee",
    "province_actuelle",
    "province_corrigee",
    "adresse_actuelle",
    "adresse_corrigee",
    "description_actuelle",
    "description_corrigee",
    "action (garder|corriger|supprimer)",
    "notes",
  ];

  const lines = [header.join(",")];
  for (const s of services) {
    lines.push(
      [
        s.id,
        s.category,
        s.name,
        s.website,
        "", // site_corrige
        s.phone,
        "", // telephone_corrige
        s.city,
        "", // ville_corrigee
        s.province,
        "", // province_corrigee
        s.address ?? "",
        "", // adresse_corrigee
        s.description,
        "", // description_corrigee
        "", // action
        "", // notes
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const outPath = resolve(
    process.cwd(),
    "..",
    "exports",
    `revision-top-300-${ts}.csv`,
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join("\n"), "utf-8");
  console.log(`\n─── CSV de révision écrit : ${outPath} ───`);
  console.log(`   ${services.length} lignes, triées par catégorie puis nom.`);
  console.log(`\nMODE D'EMPLOI :`);
  console.log(`  1) Ouvrez le CSV dans Excel ou Google Sheets`);
  console.log(`  2) Pour chaque ligne :`);
  console.log(`     a. Cliquez sur 'site_actuel' pour ouvrir le site officiel`);
  console.log(`     b. Comparez tél / adresse / ville / province`);
  console.log(`     c. Si tout est OK : tapez 'garder' dans la colonne 'action'`);
  console.log(`     d. Si erreur : remplissez la colonne *_corrige correspondante`);
  console.log(`        ET tapez 'corriger' dans 'action'`);
  console.log(`     e. Si l'organisme n'existe plus : tapez 'supprimer'`);
  console.log(`  3) Sauvegardez en CSV (UTF-8) sous le même nom`);
  console.log(`  4) Lancez : pnpm --filter @workspace/scripts run apply-corrections -- exports/revision-top-300-${ts}.csv`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
