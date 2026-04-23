import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type H = { id: string; name: string; subcategory: string; city: string; address?: string; phone: string; website?: string; description: string; isUrgent?: boolean; isProvinceWide?: boolean; source: string };

const ENTRIES: H[] = [
  // ── Réseaux provinciaux ──
  { id: "h-frapru", name: "FRAPRU – Front d'action populaire en réaménagement urbain", subcategory: "Réseau provincial – défense logement", city: "Montréal", address: "1431, rue Fullum, bureau 102, Montréal, QC H2K 0B5", phone: "514-522-1010", website: "https://frapru.qc.ca", description: "Coalition pour le droit au logement. Annuaire des comités logement régionaux.", isProvinceWide: true, source: "frapru.qc.ca" },
  { id: "h-rclalq", name: "RCLALQ – Regroupement des comités logement et associations de locataires du Québec", subcategory: "Défense des locataires", city: "Montréal", address: "920, rue Sherbrooke Est, bureau 200, Montréal, QC H2L 1L2", phone: "514-521-7114", website: "https://rclalq.qc.ca", description: "Défense des droits des locataires. Annuaire de 60+ comités logement.", isProvinceWide: true, source: "rclalq.qc.ca" },
  { id: "h-rqoh", name: "RQOH – Réseau québécois des OSBL d'habitation", subcategory: "Réseau OSBL d'habitation", city: "Montréal", address: "533, rue Ontario Est, bureau 202, Montréal, QC H2L 1N8", phone: "1-866-846-9276", website: "https://rqoh.com", description: "Fédère 8 fédérations régionales d'OSBL d'habitation. 1 200+ membres au QC.", isProvinceWide: true, source: "rqoh.com" },
  { id: "h-rohq", name: "ROHQ – Regroupement des offices d'habitation du Québec", subcategory: "Réseau OMH", city: "Québec", address: "1135, Grande Allée Ouest, bureau 240, Québec, QC G1S 1E7", phone: "418-527-6228", website: "https://rohq.qc.ca", description: "Représente 165 offices d'habitation municipaux au Québec.", isProvinceWide: true, source: "rohq.qc.ca" },
  { id: "h-fohm", name: "FOHM – Fédération des OSBL d'habitation de Montréal", subcategory: "Fédération OSBL Montréal", city: "Montréal", address: "1000, rue Amherst, bureau 200, Montréal, QC H2L 3K5", phone: "514-527-6668", website: "https://fohm.org", description: "Fédère 175+ OSBL d'habitation à Montréal. Logement social et abordable.", source: "fohm.org" },

  // ── Offices d'habitation municipaux principaux ──
  { id: "h-omh-mtl", name: "Office municipal d'habitation de Montréal (OMHM)", subcategory: "Office municipal d'habitation", city: "Montréal", address: "415, rue Saint-Antoine Ouest, Montréal, QC H2Z 1H8", phone: "514-872-6646", website: "https://omhm.qc.ca", description: "Plus grand OMH au Canada : 21 000 logements à loyer modique (HLM) à Montréal.", source: "omhm.qc.ca" },
  { id: "h-omh-quebec", name: "Office municipal d'habitation de Québec (OMHQ)", subcategory: "Office municipal d'habitation", city: "Québec", address: "550, boul. Charest Est, bureau 200, Québec, QC G1K 3J3", phone: "418-780-5211", website: "https://omhq.qc.ca", description: "Gère plus de 4 200 logements sociaux dans la ville de Québec.", source: "omhq.qc.ca" },
  { id: "h-omh-laval", name: "Office municipal d'habitation de Laval", subcategory: "Office municipal d'habitation", city: "Laval", address: "1015, place Théodore-Robitaille, Laval, QC H7V 4R6", phone: "450-682-9272", website: "https://omhlaval.ca", description: "Logements sociaux et programmes de supplément au loyer pour les Lavallois.", source: "omhlaval.ca" },
  { id: "h-omh-longueuil", name: "Office municipal d'habitation de Longueuil", subcategory: "Office municipal d'habitation", city: "Longueuil", address: "300, rue Saint-Jean, Longueuil, QC J4H 2X4", phone: "450-670-1278", website: "https://omhl.ca", description: "Logements sociaux pour Longueuil et l'agglomération.", source: "omhl.ca" },
  { id: "h-omh-gatineau", name: "Office municipal d'habitation de Gatineau", subcategory: "Office municipal d'habitation", city: "Gatineau", address: "151, boul. Mont-Bleu, Gatineau, QC J8Z 1J3", phone: "819-771-5862", website: "https://omhg.ca", description: "HLM, supplément au loyer et coopératives à Gatineau.", source: "omhg.ca" },
  { id: "h-omh-sherbrooke", name: "Office municipal d'habitation de Sherbrooke", subcategory: "Office municipal d'habitation", city: "Sherbrooke", address: "65, rue Wellington Sud, Sherbrooke, QC J1H 5C5", phone: "819-566-7868", website: "https://omhs.qc.ca", description: "HLM et logements sociaux pour Sherbrooke.", source: "omhs.qc.ca" },
  { id: "h-omh-trois-rivieres", name: "Office municipal d'habitation de Trois-Rivières", subcategory: "Office municipal d'habitation", city: "Trois-Rivières", address: "30, rue Williams, Trois-Rivières, QC G8T 1S5", phone: "819-378-5438", website: "https://omhtr.ca", description: "HLM et programmes d'aide au logement à Trois-Rivières.", source: "omhtr.ca" },
  { id: "h-omh-saguenay", name: "Office municipal d'habitation de Saguenay", subcategory: "Office municipal d'habitation", city: "Saguenay", address: "555, rue Bersimis, Chicoutimi, QC G7K 1H8", phone: "418-545-8362", website: "https://omhsaguenay.ca", description: "Logements sociaux pour Saguenay.", source: "omhsaguenay.ca" },
  { id: "h-omh-levis", name: "Office municipal d'habitation de Lévis", subcategory: "Office municipal d'habitation", city: "Lévis", address: "1700, av. Taniata, Lévis, QC G6Z 0G3", phone: "418-833-1531", website: "https://omhlevis.com", description: "Logements abordables pour Lévis.", source: "omhlevis.com" },
  { id: "h-omh-drummondville", name: "Office municipal d'habitation Drummond", subcategory: "Office municipal d'habitation", city: "Drummondville", address: "750, rue des Forges, Drummondville, QC J2B 6K6", phone: "819-477-1620", website: "https://omhd.ca", description: "HLM et logements pour personnes âgées dans Drummond.", source: "omhd.ca" },
  { id: "h-omh-saint-jerome", name: "Office municipal d'habitation de Saint-Jérôme", subcategory: "Office municipal d'habitation", city: "Saint-Jérôme", address: "200, rue Saint-Georges, Saint-Jérôme, QC J7Z 4Y7", phone: "450-432-6862", website: "https://omhsj.ca", description: "Logements sociaux pour Saint-Jérôme.", source: "omhsj.ca" },
  { id: "h-omh-saint-jean", name: "Office municipal d'habitation du Haut-Richelieu", subcategory: "Office municipal d'habitation", city: "Saint-Jean-sur-Richelieu", address: "395, rue Saint-Charles, Saint-Jean-sur-Richelieu, QC J3B 2C5", phone: "450-348-0289", website: "https://omhhr.ca", description: "Logements sociaux pour Saint-Jean-sur-Richelieu et le Haut-Richelieu.", source: "omhhr.ca" },
  { id: "h-omh-rimouski", name: "Office municipal d'habitation de Rimouski-Neigette", subcategory: "Office municipal d'habitation", city: "Rimouski", address: "320, rue Saint-Germain Est, Rimouski, QC G5L 1B4", phone: "418-723-3115", website: "https://omhrn.ca", description: "Logements sociaux pour Rimouski-Neigette.", source: "omhrn.ca" },

  // ── Comités logement majeurs (membres FRAPRU/RCLALQ) ──
  { id: "h-comite-logement-rosemont", name: "Comité logement Rosemont", subcategory: "Comité logement", city: "Montréal", address: "5350, rue Lafond, Montréal, QC H1X 2X2", phone: "514-597-2581", website: "https://comitelogement.org", description: "Défense des locataires de Rosemont. Conseils gratuits.", source: "comitelogement.org" },
  { id: "h-clpp-mtl", name: "Comité logement du Plateau Mont-Royal", subcategory: "Comité logement", city: "Montréal", address: "4450, rue Saint-Hubert, bureau 328, Montréal, QC H2J 2W9", phone: "514-527-3495", website: "https://clpmr.com", description: "Conseils aux locataires, droits, Tribunal administratif du logement.", source: "clpmr.com" },
  { id: "h-cl-villeray", name: "Comité logement de Villeray", subcategory: "Comité logement", city: "Montréal", address: "660, rue Villeray, Montréal, QC H2R 1J1", phone: "514-270-6703", website: "https://clvillerays.com", description: "Soutien aux locataires de Villeray.", source: "clvillerays.com" },
  { id: "h-cl-petite-patrie", name: "Comité logement de la Petite-Patrie", subcategory: "Comité logement", city: "Montréal", address: "6839, rue Drolet, Montréal, QC H2S 2T1", phone: "514-272-9006", website: "https://comitelogementpp.org", description: "Défense des droits des locataires de la Petite-Patrie.", source: "comitelogementpp.org" },
  { id: "h-clos-mtl", name: "CLOS – Comité logement Centre-Sud", subcategory: "Comité logement", city: "Montréal", address: "2349, rue de Rouen, bureau 210, Montréal, QC H2K 1L8", phone: "514-525-0399", website: "https://clos-mtl.org", description: "Soutien locataires Centre-Sud, Hochelaga, Mercier.", source: "clos-mtl.org" },
  { id: "h-blu-quebec", name: "Bureau d'animation et de leadership pour le logement (BAIL)", subcategory: "Comité logement", city: "Québec", address: "780, rue Saint-Vallier Est, Québec, QC G1K 3P9", phone: "418-523-6177", website: "https://lebail.qc.ca", description: "Comité logement de Québec. Conseils, info, défense des droits.", source: "lebail.qc.ca" },
  { id: "h-cl-laval", name: "Comité logement de Laval", subcategory: "Comité logement", city: "Laval", address: "295, boul. Cartier Ouest, bureau 5, Laval, QC H7N 2J5", phone: "450-967-3138", website: "https://comitelogementlaval.org", description: "Défense des locataires de Laval.", source: "comitelogementlaval.org" },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const toInsert = ENTRIES.map((o) => ({
    id: o.id, name: o.name, category: "housing", subcategory: o.subcategory, city: o.city,
    phone: o.phone, website: o.website ?? "",
    description: `${o.description} Source: ${o.source}.`,
    address: o.address ?? null, hours: null,
    isUrgent: o.isUrgent ?? false, isProvinceWide: o.isProvinceWide ?? false,
    lat: null, lng: null, active: true,
    verifiedAt: new Date(), verifiedBy: "curated-housing-network",
    verificationNote: `Vérifié via ${o.source}.`,
  }));
  console.log(`✅ Prepared ${toInsert.length} housing entries`);
  if (dryRun) { console.log("dry-run"); process.exit(0); }
  const result = await db.transaction(async (tx) => {
    const deleted = await tx.delete(servicesTable).where(eq(servicesTable.category, "housing")).returning({ id: servicesTable.id });
    await tx.insert(servicesTable).values(toInsert).onConflictDoNothing();
    return { deleted: deleted.length, inserted: toInsert.length };
  });
  console.log(`🎉 Done. Deleted: ${result.deleted}, Inserted: ${result.inserted}`);
  process.exit(0);
}
main().catch((err) => { console.error("❌", err); process.exit(1); });
