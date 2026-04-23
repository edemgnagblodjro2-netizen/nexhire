import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type I = { id: string; name: string; subcategory: string; city: string; address?: string; phone: string; website?: string; description: string; isUrgent?: boolean; isProvinceWide?: boolean; source: string };

const ENTRIES: I[] = [
  // ── Réseaux et organismes provinciaux ──
  { id: "imm-tcri", name: "TCRI – Table de concertation des organismes au service des personnes réfugiées et immigrantes", subcategory: "Réseau provincial", city: "Montréal", address: "518, rue Beaubien Est, bureau 200, Montréal, QC H2S 1S5", phone: "514-272-6060", website: "https://tcri.qc.ca", description: "Regroupe 150+ organismes en immigration. Annuaire provincial des services aux nouveaux arrivants.", isProvinceWide: true, source: "tcri.qc.ca" },
  { id: "imm-mifi", name: "Ministère de l'Immigration, Francisation et Intégration (MIFI)", subcategory: "Gouvernement du Québec", city: "Province", phone: "1-877-864-9191", website: "https://www.quebec.ca/immigration", description: "Information officielle sur l'immigration, la francisation et l'intégration au Québec.", isProvinceWide: true, source: "quebec.ca" },
  { id: "imm-arrima", name: "Arrima – Portail du MIFI pour candidats à l'immigration", subcategory: "Portail gouvernemental", city: "Province", phone: "1-877-864-9191", website: "https://www.quebec.ca/immigration/arrima", description: "Plateforme officielle pour soumettre une déclaration d'intérêt au PRTQ.", isProvinceWide: true, source: "quebec.ca" },
  { id: "imm-promis-mtl", name: "PROMIS – Promotion-Intégration-Société nouvelle", subcategory: "Accueil – nouveaux arrivants", city: "Montréal", address: "3333, ch. de la Côte-Sainte-Catherine, bureau 201, Montréal, QC H3T 1C8", phone: "514-345-1615", website: "https://promis.qc.ca", description: "Accueil, francisation, employabilité, jumelage interculturel.", source: "promis.qc.ca" },

  // ── Organismes Montréal ──
  { id: "imm-cari-mtl", name: "CARI Saint-Laurent (Centre d'accueil et de référence pour immigrants)", subcategory: "Accueil – nouveaux arrivants", city: "Montréal", address: "775, boul. Décarie, bureau 200, Saint-Laurent, QC H4L 3L9", phone: "514-748-2007", website: "https://cari.qc.ca", description: "Accueil, francisation, employabilité, jeunesse, aînés. Saint-Laurent.", source: "cari.qc.ca" },
  { id: "imm-collectif-mtl", name: "Collectif des femmes immigrantes du Québec (CFIQ)", subcategory: "Femmes immigrantes", city: "Montréal", address: "1255, rue Robert-Bourassa, bureau 906, Montréal, QC H3B 3W9", phone: "514-279-4246", website: "https://cfiq.ca", description: "Soutien aux femmes immigrantes : intégration, employabilité, défense des droits.", source: "cfiq.ca" },
  { id: "imm-himo-mtl", name: "Hirondelle – Services d'accueil et d'intégration", subcategory: "Accueil – nouveaux arrivants", city: "Montréal", address: "4652, rue Jeanne-Mance, Montréal, QC H2V 4J4", phone: "514-281-2038", website: "https://hirondelle.qc.ca", description: "Accueil aux personnes immigrantes : francisation, installation, employabilité.", source: "hirondelle.qc.ca" },
  { id: "imm-asfc-mtl", name: "Action Réfugiés Montréal", subcategory: "Aide aux réfugiés", city: "Montréal", address: "1439, av. Union, bureau 401, Montréal, QC H3A 2B5", phone: "514-935-7799", website: "https://actionr.org", description: "Soutien aux demandeurs d'asile et personnes réfugiées : visite en détention, jumelage.", isUrgent: true, source: "actionr.org" },
  { id: "imm-wmc-mtl", name: "Welcome Collective", subcategory: "Aide aux demandeurs d'asile", city: "Montréal", address: "5165, rue Sherbrooke Ouest, bureau 230, Montréal, QC H4A 1T6", phone: "514-507-5685", website: "https://welcomecollective.org", description: "Soutien matériel et social aux demandeurs d'asile à Montréal.", isUrgent: true, source: "welcomecollective.org" },
  { id: "imm-collectif-iberoam", name: "Centre social d'aide aux immigrants (CSAI)", subcategory: "Accueil – nouveaux arrivants", city: "Montréal", address: "6201, rue Laurendeau, Montréal, QC H4E 3X8", phone: "514-932-2953", website: "https://centrecsai.org", description: "Services d'accueil, francisation, employabilité pour immigrants à Montréal-Sud-Ouest.", source: "centrecsai.org" },
  { id: "imm-soc-asile-mtl", name: "Foyer du monde", subcategory: "Hébergement réfugiés", city: "Montréal", address: "5765, av. McKenna, Montréal, QC H3W 1S1", phone: "514-733-0554", website: "https://foyerdumonde.org", description: "Hébergement temporaire pour demandeurs d'asile et réfugiés.", isUrgent: true, source: "foyerdumonde.org" },

  // ── Autres villes ──
  { id: "imm-ccquebec", name: "CCSI – Centre culturel et social pour les immigrants (Québec)", subcategory: "Accueil – nouveaux arrivants", city: "Québec", phone: "418-628-9889", website: "https://ccquebec.ca", description: "Accueil et intégration des nouveaux arrivants à Québec.", source: "ccquebec.ca" },
  { id: "imm-soit-quebec", name: "Service d'orientation et d'intégration des immigrants au travail (SOIT)", subcategory: "Employabilité immigrants", city: "Québec", address: "1010, rue Borne, Québec, QC G1N 1L9", phone: "418-688-6311", website: "https://soit.ca", description: "Insertion professionnelle des personnes immigrantes à Québec.", source: "soit.ca" },
  { id: "imm-cito-laval", name: "Carrefour d'intercultures de Laval (CIL)", subcategory: "Accueil – nouveaux arrivants", city: "Laval", address: "1536, boul. Le Corbusier, bureau 210, Laval, QC H7S 2K1", phone: "450-686-5871", website: "https://cilaval.com", description: "Accueil, francisation, jumelage interculturel à Laval.", source: "cilaval.com" },
  { id: "imm-soifi-longueuil", name: "Service d'aide aux Néo-Canadiens (Sherbrooke)", subcategory: "Accueil – nouveaux arrivants", city: "Sherbrooke", address: "1255, rue Daniel, Sherbrooke, QC J1H 5X3", phone: "819-566-5373", website: "https://sanc-sherbrooke.ca", description: "Accueil, francisation, employabilité en Estrie.", source: "sanc-sherbrooke.ca" },
  { id: "imm-actions-interculturelles-estrie", name: "Actions Interculturelles", subcategory: "Médiation interculturelle", city: "Sherbrooke", address: "342, rue Bowen Sud, Sherbrooke, QC J1G 2E2", phone: "819-823-1300", website: "https://aide.org", description: "Médiation interculturelle, lutte au racisme, jumelage.", source: "aide.org" },
  { id: "imm-saa-trois-rivieres", name: "SANA – Service d'accueil aux nouveaux arrivants (Trois-Rivières)", subcategory: "Accueil – nouveaux arrivants", city: "Trois-Rivières", address: "858, rue des Volontaires, Trois-Rivières, QC G8T 3R5", phone: "819-697-1714", website: "https://sana3r.com", description: "Accueil, francisation, intégration des nouveaux arrivants en Mauricie.", source: "sana3r.com" },
  { id: "imm-sii-rive-sud", name: "Maison Internationale de la Rive-Sud (MIRS)", subcategory: "Accueil – nouveaux arrivants", city: "Brossard", address: "8000, boul. Taschereau, bureau A60, Brossard, QC J4X 1C2", phone: "450-445-9588", website: "https://mirs.qc.ca", description: "Accueil, francisation, employabilité sur la Rive-Sud.", source: "mirs.qc.ca" },
  { id: "imm-soit-saguenay", name: "SEMO Saguenay-Lac-Saint-Jean", subcategory: "Employabilité immigrants", city: "Saguenay", phone: "418-545-8061", website: "https://semoslsj.qc.ca", description: "Service spécialisé en main-d'œuvre pour personnes immigrantes au SLSJ.", source: "semoslsj.qc.ca" },
  { id: "imm-cana-gatineau", name: "Service Intégration Travail Outaouais (SITO)", subcategory: "Employabilité immigrants", city: "Gatineau", address: "75, rue d'Edmonton, Gatineau, QC J8Y 6X3", phone: "819-595-9444", website: "https://sito-outaouais.com", description: "Insertion professionnelle des immigrants en Outaouais.", source: "sito-outaouais.com" },
  { id: "imm-acet", name: "Accueil parrainage Outaouais (APO)", subcategory: "Accueil – nouveaux arrivants", city: "Gatineau", address: "298, rue Notre-Dame-de-l'Île, Gatineau, QC J8X 3T6", phone: "819-777-2960", website: "https://apo-qc.org", description: "Accueil, parrainage, francisation, défense des droits des immigrants en Outaouais.", source: "apo-qc.org" },

  // ── Aide juridique en immigration ──
  { id: "imm-clic-mtl", name: "Clinique pour la Justice migrante", subcategory: "Aide juridique – immigration", city: "Montréal", address: "1290, rue Saint-Denis, bureau 200, Montréal, QC H2X 3J7", phone: "514-987-8786", website: "https://cliniquejusticemigrante.org", description: "Conseils juridiques pour personnes migrantes : statut, asile, demandes humanitaires.", source: "cliniquejusticemigrante.org" },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const toInsert = ENTRIES.map((o) => ({
    id: o.id, name: o.name, category: "immigration", subcategory: o.subcategory, city: o.city,
    phone: o.phone, website: o.website ?? "",
    description: `${o.description} Source: ${o.source}.`,
    address: o.address ?? null, hours: null,
    isUrgent: o.isUrgent ?? false, isProvinceWide: o.isProvinceWide ?? false,
    lat: null, lng: null, active: true,
    verifiedAt: new Date(), verifiedBy: "curated-immigration-network",
    verificationNote: `Vérifié via ${o.source}.`,
  }));
  console.log(`✅ Prepared ${toInsert.length} immigration entries`);
  if (dryRun) { console.log("dry-run"); process.exit(0); }
  const result = await db.transaction(async (tx) => {
    const deleted = await tx.delete(servicesTable).where(eq(servicesTable.category, "immigration")).returning({ id: servicesTable.id });
    await tx.insert(servicesTable).values(toInsert).onConflictDoNothing();
    return { deleted: deleted.length, inserted: toInsert.length };
  });
  console.log(`🎉 Done. Deleted: ${result.deleted}, Inserted: ${result.inserted}`);
  process.exit(0);
}
main().catch((err) => { console.error("❌", err); process.exit(1); });
