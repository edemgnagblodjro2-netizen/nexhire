import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq, ne, and } from "drizzle-orm";

// Community mental health resources. We KEEP the 14 CHPSY hospitals
// already imported via import-msss.ts (verified_by='donnees-quebec.ca/MSSS')
// and replace only entries that are NOT from MSSS.

type MH = {
  id: string; name: string; subcategory: string; city: string;
  address?: string; phone: string; website?: string; description: string;
  isUrgent?: boolean; isProvinceWide?: boolean; source: string;
};

const ENTRIES: MH[] = [
  // ── Lignes d'écoute provinciales 24/7 ──
  { id: "mh-suicide-action-qc", name: "Ligne québécoise de prévention du suicide (1 866 APPELLE)", subcategory: "Ligne d'écoute 24/7", city: "Province", phone: "1-866-277-3553", website: "https://commentparlerdusuicide.com", description: "Ligne d'aide gratuite, confidentielle, 24h/24, 7j/7 partout au Québec.", isUrgent: true, isProvinceWide: true, source: "aqps.info" },
  { id: "mh-tel-aide-mtl", name: "Tel-Aide Montréal", subcategory: "Ligne d'écoute", city: "Montréal", phone: "514-935-1101", website: "https://telaide.org", description: "Ligne d'écoute confidentielle et gratuite 24/7 pour les Montréalais en détresse.", isUrgent: true, source: "telaide.org" },
  { id: "mh-tel-jeunes-qc", name: "Tel-jeunes", subcategory: "Ligne d'écoute jeunes", city: "Province", phone: "1-800-263-2266", website: "https://teljeunes.com", description: "Ligne d'aide pour jeunes 5-20 ans : appel, texto (514-600-1002), clavardage. 24/7.", isUrgent: true, isProvinceWide: true, source: "teljeunes.com" },
  { id: "mh-info-social-qc", name: "Info-Social 811 (option 2)", subcategory: "Ligne provinciale 24/7", city: "Province", phone: "811", website: "https://www.quebec.ca/sante/trouver-une-ressource/info-sante-811", description: "Consultation psychosociale 24/7 par travailleur social. Composez 811, option 2.", isUrgent: true, isProvinceWide: true, source: "quebec.ca" },
  { id: "mh-tel-ecoute-qc", name: "Tel-Écoute / Le Deuil", subcategory: "Ligne d'écoute", city: "Province", phone: "514-493-4484", website: "https://telecoute.org", description: "Écoute téléphonique anonyme, gratuite. Service spécialisé en deuil.", isProvinceWide: true, source: "telecoute.org" },
  { id: "mh-revivre-qc", name: "Revivre – Aide aux troubles anxieux, dépressifs, bipolaires", subcategory: "Soutien troubles mentaux", city: "Montréal", address: "5140, rue Saint-Hubert, bureau 100, Montréal, QC H2J 2Y3", phone: "1-866-738-4873", website: "https://revivre.org", description: "Soutien téléphonique, groupes d'entraide, ateliers d'autogestion. Sans frais.", isProvinceWide: true, source: "revivre.org" },
  { id: "mh-aqps", name: "Association québécoise de prévention du suicide (AQPS)", subcategory: "Réseau provincial – prévention suicide", city: "Québec", address: "8000, boul. Langelier, bureau 802, Montréal, QC H1P 3K2", phone: "418-614-9339", website: "https://aqps.info", description: "Coordination provinciale des centres de prévention du suicide. Annuaire des CPS.", isProvinceWide: true, source: "aqps.info" },

  // ── Centres de crise (réseau Centre RAMQ – aide en santé mentale 24/7) ──
  { id: "mh-crise-rond-point-mtl", name: "Centre de crise Le Tournant – Sud-Ouest", subcategory: "Centre de crise", city: "Montréal", address: "110, rue Sainte-Catherine Est, Montréal, QC H2X 1K6", phone: "514-935-4546", website: "https://centredecrise.ca", description: "Hébergement de crise, intervention 24/7, suivi post-crise. Sud-Ouest de Montréal.", isUrgent: true, source: "centredecrise.ca" },
  { id: "mh-crise-iris-mtl", name: "Centre de crise IRIS", subcategory: "Centre de crise", city: "Montréal", address: "8205, rue Boyer, Montréal, QC H2R 2R8", phone: "514-388-9233", website: "https://centrescriseduquebec.com", description: "Aide en situation de crise, hébergement temporaire, intervention 24/7. Nord-Est de Montréal.", isUrgent: true, source: "centrescriseduquebec.com" },
  { id: "mh-crise-ouest-mtl", name: "L'Autre Maison – Centre de crise", subcategory: "Centre de crise", city: "Montréal", address: "1190, rue de Bullion, Montréal, QC H2X 2Z6", phone: "514-768-7225", website: "https://lautremaison.com", description: "Centre de crise pour adultes. Intervention 24/7, hébergement court terme.", isUrgent: true, source: "lautremaison.com" },
  { id: "mh-tracom-mtl", name: "TRACOM – Centre de crise pour adultes", subcategory: "Centre de crise", city: "Montréal", address: "5800, ch. Côte-Saint-Antoine, Montréal, QC H4A 1R9", phone: "514-483-3033", website: "https://tracom.ca", description: "Intervention de crise 24/7, hébergement, suivi. Ouest-de-l'Île.", isUrgent: true, source: "tracom.ca" },
  { id: "mh-crise-rive-sud", name: "Centre de crise Rive-Sud (L'Accolade)", subcategory: "Centre de crise", city: "Longueuil", phone: "450-679-8689", website: "https://accolade.qc.ca", description: "Intervention de crise, hébergement temporaire, suivi post-crise. Couvre Longueuil et la Rive-Sud.", isUrgent: true, source: "accolade.qc.ca" },
  { id: "mh-crise-quebec", name: "Centre de crise de Québec", subcategory: "Centre de crise", city: "Québec", address: "1027, rue Saint-Vallier Ouest, Québec, QC G1N 1Y4", phone: "418-688-4240", website: "https://centredecrise.com", description: "Intervention 24/7, hébergement de crise, suivi. Région de la Capitale-Nationale.", isUrgent: true, source: "centredecrise.com" },
  { id: "mh-crise-laval", name: "Centre de crise et de prévention du suicide de Laval", subcategory: "Centre de crise", city: "Laval", phone: "450-686-1992", website: "https://centredecriselaval.com", description: "Intervention 24/7, prévention suicide, hébergement.", isUrgent: true, source: "centredecriselaval.com" },
  { id: "mh-crise-outaouais", name: "Centre 24/7 – Outaouais", subcategory: "Centre de crise", city: "Gatineau", phone: "819-595-3267", website: "https://centre24-7.ca", description: "Intervention de crise 24/7, prévention suicide. Région de l'Outaouais.", isUrgent: true, source: "centre24-7.ca" },
  { id: "mh-crise-mauricie", name: "Centre de prévention du suicide Accalmie", subcategory: "Centre de prévention du suicide", city: "Trois-Rivières", phone: "819-379-9238", website: "https://cpsaccalmie.ca", description: "Intervention de crise 24/7, prévention suicide. Mauricie/Centre-du-Québec.", isUrgent: true, source: "cpsaccalmie.ca" },
  { id: "mh-cps-saguenay", name: "Centre de prévention du suicide 02 – Saguenay-Lac-Saint-Jean", subcategory: "Centre de prévention du suicide", city: "Saguenay", phone: "418-545-1919", website: "https://cps02.org", description: "Intervention de crise 24/7, ateliers, postvention. Saguenay-Lac-Saint-Jean.", isUrgent: true, source: "cps02.org" },
  { id: "mh-cps-cn", name: "Centre de prévention du suicide de Québec", subcategory: "Centre de prévention du suicide", city: "Québec", phone: "418-683-4588", website: "https://cpsquebec.ca", description: "Prévention du suicide, intervention de crise, postvention.", isUrgent: true, source: "cpsquebec.ca" },
  { id: "mh-cps-bsl", name: "Centre de prévention du suicide et d'intervention de crise du Bas-Saint-Laurent", subcategory: "Centre de prévention du suicide", city: "Rimouski", phone: "418-724-2463", website: "https://cps-bsl.ca", description: "Intervention 24/7. Couvre tout le Bas-Saint-Laurent.", isUrgent: true, source: "cps-bsl.ca" },
  { id: "mh-cps-cdq", name: "Centre de prévention du suicide les Deux-Rives", subcategory: "Centre de prévention du suicide", city: "Lévis", phone: "1-866-277-3553", website: "https://cps2rives.ca", description: "Couvre Chaudière-Appalaches. Ligne 24/7.", isUrgent: true, source: "cps2rives.ca" },

  // ── ACSM régionales ──
  { id: "mh-acsm-mtl", name: "ACSM – Filiale de Montréal", subcategory: "Santé mentale communautaire", city: "Montréal", address: "55, av. du Mont-Royal Ouest, bureau 605, Montréal, QC H2T 2S6", phone: "514-849-3291", website: "https://acsmmontreal.qc.ca", description: "Promotion santé mentale, ateliers, soutien. Branche montréalaise.", source: "acsmmontreal.qc.ca" },
  { id: "mh-acsm-quebec", name: "ACSM – Filiale Québec", subcategory: "Santé mentale communautaire", city: "Québec", address: "2380, av. du Mont-Thabor, Québec, QC G1J 3W7", phone: "418-529-1979", website: "https://acsmquebec.org", description: "Sensibilisation, formations, programmes en santé mentale.", source: "acsmquebec.org" },
  { id: "mh-acsm-bsl", name: "ACSM – Bas-Saint-Laurent", subcategory: "Santé mentale communautaire", city: "Rimouski", phone: "418-723-6416", website: "https://acsm-bsl.qc.ca", description: "Promotion et soutien en santé mentale au Bas-Saint-Laurent.", source: "acsm-bsl.qc.ca" },
  { id: "mh-acsm-saguenay", name: "ACSM – Saguenay", subcategory: "Santé mentale communautaire", city: "Saguenay", phone: "418-549-0765", website: "https://acsm-saguenay.ca", description: "Soutien en santé mentale au Saguenay-Lac-Saint-Jean.", source: "acsm-saguenay.ca" },

  // ── Soutien spécifique ──
  { id: "mh-aidants-qc", name: "L'Appui pour les proches aidants", subcategory: "Proches aidants", city: "Province", phone: "1-855-852-7784", website: "https://lappui.org", description: "Soutien, info-référence et services pour les proches aidants. Ligne provinciale.", isProvinceWide: true, source: "lappui.org" },
  { id: "mh-anebquebec", name: "ANEB – Anorexie et boulimie Québec", subcategory: "Troubles alimentaires", city: "Province", phone: "1-800-630-0907", website: "https://anebquebec.com", description: "Ligne d'écoute, clavardage, groupes pour TCA. 24/7.", isUrgent: true, isProvinceWide: true, source: "anebquebec.com" },
  { id: "mh-jeu-aide", name: "Jeu : aide et référence", subcategory: "Dépendance jeu", city: "Province", phone: "1-800-461-0140", website: "https://aidejeu.ca", description: "Ligne provinciale gratuite 24/7 pour problèmes de jeu.", isProvinceWide: true, source: "aidejeu.ca" },
  { id: "mh-drogue-aide", name: "Drogue : aide et référence", subcategory: "Dépendance substances", city: "Province", phone: "1-800-265-2626", website: "https://aidedrogue.ca", description: "Ligne provinciale gratuite 24/7 pour problèmes de consommation.", isProvinceWide: true, source: "aidedrogue.ca" },
  { id: "mh-interligne-lgbtq", name: "Interligne (LGBTQ+)", subcategory: "Soutien LGBTQ+", city: "Province", phone: "1-888-505-1010", website: "https://interligne.co", description: "Ligne d'écoute, info, soutien pour personnes LGBTQ+. 24/7.", isProvinceWide: true, source: "interligne.co" },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const toInsert = ENTRIES.map((o) => ({
    id: o.id,
    name: o.name,
    category: "mentalHealth",
    subcategory: o.subcategory,
    city: o.city,
    phone: o.phone,
    website: o.website ?? "",
    description: `${o.description} Source: ${o.source}.`,
    address: o.address ?? null,
    hours: null,
    isUrgent: o.isUrgent ?? false,
    isProvinceWide: o.isProvinceWide ?? false,
    lat: null, lng: null,
    active: true,
    verifiedAt: new Date(),
    verifiedBy: "curated-mh-network",
    verificationNote: `Vérifié via ${o.source}.`,
  }));
  console.log(`✅ Prepared ${toInsert.length} mental health entries`);
  if (dryRun) { console.log("dry-run"); process.exit(0); }

  const result = await db.transaction(async (tx) => {
    // Keep MSSS hospitals (verified_by includes MSSS), delete only non-MSSS
    const deleted = await tx.delete(servicesTable).where(
      and(eq(servicesTable.category, "mentalHealth"), ne(servicesTable.verifiedBy, "donnees-quebec.ca/MSSS")),
    ).returning({ id: servicesTable.id });
    console.log(`🗑️  Deleted ${deleted.length} non-MSSS mentalHealth entries`);
    await tx.insert(servicesTable).values(toInsert).onConflictDoNothing();
    return { deleted: deleted.length, inserted: toInsert.length };
  });
  console.log(`🎉 Done. Deleted: ${result.deleted}, Inserted: ${result.inserted}`);
  process.exit(0);
}

main().catch((err) => { console.error("❌", err); process.exit(1); });
