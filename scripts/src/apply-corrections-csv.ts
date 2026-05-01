import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// APPLY CORRECTIONS CSV
//
// Lit un CSV produit par audit-quality-csv.ts (ou validé manuellement par l'user)
// et applique les corrections en BDD :
//   - Pour CHAQUE ligne du CSV : marque la fiche comme vérifiée
//     (verifiedAt = maintenant, verifiedBy = label, verificationNote = notes du CSV)
//   - Si site_corrige non vide → UPDATE website
//   - SINON, si site_actuel (CSV) diffère du website actuel en BDD → UPDATE website
//     (cas où l'user a édité site_actuel directement dans son tableur)
//   - Idem pour telephone_corrige / phone, description_corrigee / description,
//     adresse_corrigee / address (les colonnes _actuelle ne sont prises en
//     compte comme correction que si une vraie différence est détectée)
//   - Si action="supprimer" OU notes contient "expired"/"offline forever"
//     → UPDATE active=false (soft delete)
//   - Si action="garder" ou vide → seulement mise à jour vérification
//
// Usage :
//   pnpm --filter @workspace/scripts run apply-corrections [-- --dry-run] [chemin.csv]
//
// Par défaut : exports/fiches-correctes-AAAAMMJJ.csv
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, string>;

function parseCSV(s: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (c === "\r") {
        // skip
      } else {
        cell += c;
      }
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.length > 1 && r[0])
    .map((r) => {
      const obj: Row = {};
      headers.forEach((h, i) => {
        obj[h] = (r[i] ?? "").trim();
      });
      return obj;
    });
}

const ACTION_KEY = "action (garder|corriger|supprimer)";
const VERIFIED_BY = `csv-validation-${new Date().toISOString().slice(0, 10)}`;

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const dryRun = process.argv.includes("--dry-run");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const csvPath = resolve(
    process.cwd(),
    "..",
    args[0] ?? `exports/fiches-correctes-${today}.csv`,
  );

  console.log(`─── Lecture ${csvPath} ───`);
  const txt = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(txt);
  console.log(`  → ${rows.length} fiches dans le CSV`);

  // Charger les fiches de la BDD pour comparer avec les valeurs _actuelle du CSV
  // (l'user édite parfois directement les colonnes _actuelle au lieu de remplir _corrige)
  const ids = rows.map((r) => r.id).filter(Boolean);
  const existing = await db
    .select({
      id: servicesTable.id,
      website: servicesTable.website,
      phone: servicesTable.phone,
      description: servicesTable.description,
      address: servicesTable.address,
    })
    .from(servicesTable)
    .where(inArray(servicesTable.id, ids));
  const existingSet = new Set(existing.map((r) => r.id));
  const existingMap = new Map(existing.map((r) => [r.id, r]));
  const missing = rows.filter((r) => !existingSet.has(r.id));
  if (missing.length) {
    console.log(`\n  ⚠️  ${missing.length} id(s) du CSV introuvables en BDD :`);
    missing.slice(0, 10).forEach((r) => console.log(`     - ${r.id} (${r.nom})`));
    if (missing.length > 10) console.log(`     ... et ${missing.length - 10} autres`);
  }

  // Compte des changements à appliquer
  const stats = {
    valider: 0,
    siteCorrige: 0,
    telCorrige: 0,
    descCorrigee: 0,
    adresseCorrigee: 0,
    soitDesactive: 0,
    notesCopiees: 0,
  };
  const updates: Array<{
    id: string;
    patch: Record<string, unknown>;
    note: string;
  }> = [];

  for (const r of rows) {
    if (!existingSet.has(r.id)) continue;
    const action = (r[ACTION_KEY] ?? "").toLowerCase();
    const noteText = (r.notes ?? "").toLowerCase();
    const dbRow = existingMap.get(r.id)!;
    const patch: Record<string, unknown> = {
      verifiedAt: new Date(),
      verifiedBy: VERIFIED_BY,
    };
    const noteParts: string[] = [];
    stats.valider++;

    // Site web : priorité à site_corrige, sinon détecter modification de site_actuel
    if (r.site_corrige && r.site_corrige !== dbRow.website) {
      patch.website = r.site_corrige;
      stats.siteCorrige++;
      noteParts.push(`URL corrigée (${dbRow.website || "vide"} → ${r.site_corrige})`);
    } else if (r.site_actuel && r.site_actuel !== (dbRow.website ?? "")) {
      patch.website = r.site_actuel;
      stats.siteCorrige++;
      noteParts.push(`URL mise à jour (${dbRow.website || "vide"} → ${r.site_actuel})`);
    }
    // Téléphone : idem
    if (r.telephone_corrige && r.telephone_corrige !== dbRow.phone) {
      patch.phone = r.telephone_corrige;
      stats.telCorrige++;
      noteParts.push(`Téléphone corrigé`);
    } else if (r.telephone_actuel && r.telephone_actuel !== (dbRow.phone ?? "")) {
      patch.phone = r.telephone_actuel;
      stats.telCorrige++;
      noteParts.push(`Téléphone mis à jour`);
    }
    // Description : idem
    if (r.description_corrigee && r.description_corrigee !== dbRow.description) {
      patch.description = r.description_corrigee;
      stats.descCorrigee++;
      noteParts.push(`Description corrigée`);
    } else if (
      r.description_actuelle &&
      r.description_actuelle !== (dbRow.description ?? "")
    ) {
      patch.description = r.description_actuelle;
      stats.descCorrigee++;
      noteParts.push(`Description mise à jour`);
    }
    // Adresse : idem
    if (r.adresse_corrigee && r.adresse_corrigee !== dbRow.address) {
      patch.address = r.adresse_corrigee;
      stats.adresseCorrigee++;
      noteParts.push(`Adresse corrigée`);
    } else if (r.adresse_actuelle && r.adresse_actuelle !== (dbRow.address ?? "")) {
      patch.address = r.adresse_actuelle;
      stats.adresseCorrigee++;
      noteParts.push(`Adresse mise à jour`);
    }

    // Désactivation : action explicite OU notes contenant un signal "expired"
    const shouldDeactivate =
      action === "supprimer" ||
      noteText.includes("expired") ||
      noteText.includes("offline forever") ||
      noteText.includes("définitivement fermé");
    if (shouldDeactivate) {
      patch.active = false;
      stats.soitDesactive++;
      noteParts.push("Désactivée (site expiré / fermé)");
    }
    if (r.notes) {
      noteParts.push(`Note user: ${r.notes}`);
      stats.notesCopiees++;
    }

    const baseNote = noteParts.length
      ? noteParts.join(" | ")
      : "Validée — fiche jugée correcte le " + new Date().toISOString().slice(0, 10);
    patch.verificationNote = baseNote;

    updates.push({ id: r.id, patch, note: baseNote });
  }

  console.log(`\n─── Résumé des changements ───`);
  console.log(`  • Marquées vérifiées ........ ${stats.valider}`);
  console.log(`  • Sites web corrigés ........ ${stats.siteCorrige}`);
  console.log(`  • Téléphones corrigés ....... ${stats.telCorrige}`);
  console.log(`  • Descriptions corrigées .... ${stats.descCorrigee}`);
  console.log(`  • Adresses corrigées ........ ${stats.adresseCorrigee}`);
  console.log(`  • Désactivées (supprimer) ... ${stats.soitDesactive}`);
  console.log(`  • Notes user reportées ...... ${stats.notesCopiees}`);

  if (dryRun) {
    console.log(`\n[dry-run] Aucune modification effectuée.`);
    console.log(`Exemples (3 premières) :`);
    updates.slice(0, 3).forEach((u) => {
      console.log(`  ${u.id}: ${JSON.stringify({ ...u.patch, verifiedAt: "<now>" })}`);
    });
    process.exit(0);
  }

  console.log(`\n─── Application en BDD (${updates.length} updates) ───`);
  let done = 0;
  for (const u of updates) {
    await db.update(servicesTable).set(u.patch).where(eq(servicesTable.id, u.id));
    done++;
    if (done % 50 === 0) console.log(`  ... ${done}/${updates.length}`);
  }
  console.log(`\n🎉 Terminé. ${done} fiches mises à jour.`);
  console.log(`   verified_by = "${VERIFIED_BY}"`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
