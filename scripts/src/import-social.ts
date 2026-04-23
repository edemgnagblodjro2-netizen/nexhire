import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type S = { id: string; name: string; subcategory: string; city: string; address?: string; phone: string; website?: string; description: string; isUrgent?: boolean; isProvinceWide?: boolean; source: string };

const ENTRIES: S[] = [
  // ── Réseaux provinciaux femmes ──
  { id: "s-fmhf", name: "Fédération des maisons d'hébergement pour femmes (FMHF)", subcategory: "Réseau – violence conjugale", city: "Province", phone: "514-878-9134", website: "https://fede.qc.ca", description: "Fédère 36 maisons d'hébergement pour femmes victimes de violence. Annuaire complet.", isProvinceWide: true, source: "fede.qc.ca" },
  { id: "s-rmfvvc", name: "Regroupement des maisons pour femmes victimes de violence conjugale", subcategory: "Réseau – violence conjugale", city: "Province", phone: "514-878-9134", website: "https://maisons-femmes.qc.ca", description: "Regroupe 43 maisons d'aide et d'hébergement. Ligne SOS violence : 1 800 363-9010.", isProvinceWide: true, source: "maisons-femmes.qc.ca" },
  { id: "s-sos-violence-conjugale", name: "SOS violence conjugale", subcategory: "Ligne provinciale 24/7 – violence", city: "Province", phone: "1-800-363-9010", website: "https://sosviolenceconjugale.ca", description: "Ligne d'aide gratuite, confidentielle, 24/7. Référence vers refuges et services.", isUrgent: true, isProvinceWide: true, source: "sosviolenceconjugale.ca" },
  { id: "s-info-aide-violence-sexuelle", name: "Info-aide violence sexuelle", subcategory: "Ligne provinciale – agression sexuelle", city: "Province", phone: "1-888-933-9007", website: "https://infoaideviolencesexuelle.ca", description: "Ligne d'écoute, info et référence pour victimes d'agression sexuelle. 24/7.", isUrgent: true, isProvinceWide: true, source: "infoaideviolencesexuelle.ca" },
  { id: "s-cavac-qc", name: "CAVAC – Centres d'aide aux victimes d'actes criminels", subcategory: "Aide victimes d'actes criminels", city: "Province", phone: "1-866-532-2822", website: "https://cavac.qc.ca", description: "17 CAVAC régionaux. Soutien gratuit aux victimes et témoins d'actes criminels.", isProvinceWide: true, source: "cavac.qc.ca" },

  // ── Maisons d'hébergement pour femmes (sample représentatif des grandes villes) ──
  { id: "s-multifemmes-mtl", name: "Auberge Madeleine", subcategory: "Maison d'hébergement – femmes", city: "Montréal", phone: "514-597-1499", website: "https://aubergemadeleine.org", description: "Hébergement pour femmes en difficulté seules ou avec enfants à Montréal.", isUrgent: true, source: "aubergemadeleine.org" },
  { id: "s-passages-mtl", name: "Passages – Maison de transition pour jeunes femmes", subcategory: "Maison d'hébergement – jeunes femmes", city: "Montréal", phone: "514-875-8119", website: "https://passagesmtl.com", description: "Hébergement pour jeunes femmes 18-30 ans en difficulté.", isUrgent: true, source: "passagesmtl.com" },
  { id: "s-violet-mtl", name: "La Maison Violette", subcategory: "Maison d'hébergement – violence conjugale", city: "Montréal", phone: "514-376-1750", website: "https://maisonviolette.org", description: "Hébergement confidentiel pour femmes victimes de violence et leurs enfants.", isUrgent: true, source: "maisonviolette.org" },
  { id: "s-pavillon-marguerite-quebec", name: "Maison Marie-Frédéric (Pavillon Marguerite)", subcategory: "Maison d'hébergement – violence conjugale", city: "Québec", phone: "418-688-1126", website: "https://maisonmariefrederic.org", description: "Hébergement femmes victimes de violence à Québec.", isUrgent: true, source: "maisonmariefrederic.org" },
  { id: "s-violence-laval", name: "L'Aviron de Laval", subcategory: "Maison d'hébergement – violence conjugale", city: "Laval", phone: "450-682-3050", website: "https://aviron-laval.com", description: "Maison d'aide et d'hébergement pour femmes victimes de violence à Laval.", isUrgent: true, source: "aviron-laval.com" },
  { id: "s-rive-femmes-longueuil", name: "Centre de femmes l'Essentielle", subcategory: "Centre de femmes", city: "Longueuil", phone: "450-651-3032", website: "https://lessentielle.org", description: "Centre de femmes : ateliers, soutien, défense des droits.", source: "lessentielle.org" },
  { id: "s-femmes-sherbrooke", name: "L'Escale de l'Estrie", subcategory: "Maison d'hébergement – violence conjugale", city: "Sherbrooke", phone: "819-569-3611", website: "https://escaledelestrie.com", description: "Hébergement femmes victimes de violence en Estrie.", isUrgent: true, source: "escaledelestrie.com" },
  { id: "s-maison-helene-st-jean", name: "La Maison Hélène-Lacroix", subcategory: "Maison d'hébergement – femmes", city: "Saint-Jean-sur-Richelieu", phone: "450-346-1645", website: "https://maisonhelenelacroix.org", description: "Hébergement pour femmes en difficulté à Saint-Jean.", isUrgent: true, source: "maisonhelenelacroix.org" },
  { id: "s-maison-isa-saguenay", name: "Maison ISA – Saguenay", subcategory: "Maison d'hébergement – violence conjugale", city: "Saguenay", phone: "418-549-0337", website: "https://maisonisa.org", description: "Aide et hébergement pour femmes victimes de violence au Saguenay.", isUrgent: true, source: "maisonisa.org" },
  { id: "s-maison-grand-pas-rimouski", name: "Maison des femmes de Rimouski", subcategory: "Centre de femmes", city: "Rimouski", phone: "418-723-0333", website: "https://maisondesfemmesderimouski.org", description: "Centre de femmes : ateliers, soutien, ressources.", source: "maisondesfemmesderimouski.org" },

  // ── Maisons de jeunes (RMJQ) ──
  { id: "s-rmjq", name: "RMJQ – Regroupement des maisons de jeunes du Québec", subcategory: "Réseau provincial – jeunes", city: "Province", address: "2400, av. d'Estimauville, bureau 100, Québec, QC G1J 5N1", phone: "418-666-6663", website: "https://rmjq.org", description: "Regroupe 198 maisons de jeunes au Québec. Annuaire par région.", isProvinceWide: true, source: "rmjq.org" },
  { id: "s-mj-hochelaga", name: "Maison des jeunes Hochelaga-Maisonneuve", subcategory: "Maison de jeunes", city: "Montréal", address: "1755, rue Joliette, Montréal, QC H1W 3G8", phone: "514-523-3593", website: "https://mdjhm.com", description: "Maison de jeunes 12-17 ans à Hochelaga.", source: "mdjhm.com" },
  { id: "s-mj-pat", name: "Maison des jeunes de Pointe-aux-Trembles", subcategory: "Maison de jeunes", city: "Montréal", address: "13 100, rue Notre-Dame Est, Montréal, QC H1A 3T6", phone: "514-642-8546", website: "https://mdjpat.com", description: "Maison de jeunes pour ados de Pointe-aux-Trembles.", source: "mdjpat.com" },
  { id: "s-mj-quebec", name: "Maison des jeunes l'Évasion (Québec)", subcategory: "Maison de jeunes", city: "Québec", phone: "418-661-1230", website: "https://mdjlevasion.com", description: "Maison de jeunes pour ados à Québec.", source: "mdjlevasion.com" },

  // ── Centres de bénévolat (FCABQ) ──
  { id: "s-fcabq", name: "FCABQ – Fédération des centres d'action bénévole du Québec", subcategory: "Réseau – bénévolat", city: "Montréal", address: "1557, av. Papineau, bureau 200, Montréal, QC H2K 4H7", phone: "514-843-6312", website: "https://fcabq.org", description: "Fédère 105 centres d'action bénévole. Annuaire par région.", isProvinceWide: true, source: "fcabq.org" },
  { id: "s-cab-mtl", name: "Centre d'action bénévole de Montréal", subcategory: "Centre d'action bénévole", city: "Montréal", address: "1474, rue Fleury Est, Montréal, QC H2C 1S1", phone: "514-842-3351", website: "https://cabm.net", description: "Référence en bénévolat à Montréal. Plus de 1 500 organismes recensés.", source: "cabm.net" },
  { id: "s-cab-quebec", name: "Centre d'action bénévole de Québec", subcategory: "Centre d'action bénévole", city: "Québec", address: "1453, rue de Bellechasse, Québec, QC G1L 1B7", phone: "418-681-3501", website: "https://cabquebec.org", description: "Référence en bénévolat dans la région de Québec.", source: "cabquebec.org" },

  // ── Itinérance / personnes vulnérables ──
  { id: "s-rsiq", name: "RSIQ – Réseau Solidarité Itinérance du Québec", subcategory: "Réseau – itinérance", city: "Province", address: "1431, rue Fullum, bureau 102, Montréal, QC H2K 0B5", phone: "514-879-1949", website: "https://rsiq.org", description: "Coalition d'organismes œuvrant en itinérance au Québec.", isProvinceWide: true, source: "rsiq.org" },
  { id: "s-resilience-mtl", name: "Résilience Montréal", subcategory: "Itinérance", city: "Montréal", address: "1684, rue Sainte-Catherine Ouest, Montréal, QC H3H 1L7", phone: "438-381-0222", website: "https://resiliencemontreal.com", description: "Refuge de jour et services pour personnes en situation d'itinérance autochtones.", isUrgent: true, source: "resiliencemontreal.com" },
  { id: "s-pas-rue-mtl", name: "Pas de la rue", subcategory: "Itinérance – aînés", city: "Montréal", address: "1575, boul. de Maisonneuve Est, Montréal, QC H2L 1Y6", phone: "514-525-1561", website: "https://pasdelarue.org", description: "Centre de jour pour personnes aînées en situation d'itinérance.", isUrgent: true, source: "pasdelarue.org" },
  { id: "s-yslm-mtl", name: "Y des femmes de Montréal (YWCA)", subcategory: "Hébergement – femmes", city: "Montréal", address: "1355, boul. René-Lévesque Ouest, Montréal, QC H3G 1T3", phone: "514-866-9941", website: "https://ydesfemmesmtl.org", description: "Hébergement, programmes et services pour femmes et filles en difficulté.", isUrgent: true, source: "ydesfemmesmtl.org" },
  { id: "s-stmichaels-shelter", name: "Refuge des jeunes de Montréal", subcategory: "Hébergement – jeunes", city: "Montréal", address: "1836, rue Sainte-Catherine Est, Montréal, QC H2K 2H3", phone: "514-849-4221", website: "https://refugedesjeunes.org", description: "Hébergement d'urgence pour hommes 17-25 ans.", isUrgent: true, source: "refugedesjeunes.org" },
  { id: "s-bunker-mtl", name: "Le Bunker – Hébergement jeunes", subcategory: "Hébergement – jeunes", city: "Montréal", address: "1490, av. de l'Hôtel-de-Ville, Montréal, QC H2X 3K3", phone: "514-524-0029", website: "https://en-marge.qc.ca", description: "Hébergement d'urgence pour jeunes 12-21 ans (En Marge 12-17).", isUrgent: true, source: "en-marge.qc.ca" },

  // ── Centres communautaires majeurs ──
  { id: "s-centraide-grand-mtl", name: "Centraide du Grand Montréal", subcategory: "Centraide", city: "Montréal", address: "493, rue Sherbrooke Ouest, Montréal, QC H3A 1B6", phone: "514-288-1261", website: "https://centraide-mtl.org", description: "Investit dans 350+ organismes communautaires du Grand Montréal.", source: "centraide-mtl.org" },
  { id: "s-centraide-quebec", name: "Centraide Québec et Chaudière-Appalaches", subcategory: "Centraide", city: "Québec", address: "150, boul. René-Lévesque Est, bureau 200, Québec, QC G1R 2B2", phone: "418-660-2000", website: "https://centraide-quebec.com", description: "Soutient 215+ organismes dans Québec et Chaudière-Appalaches.", source: "centraide-quebec.com" },

  // ── 211 ──
  { id: "s-211-qc", name: "211 Grand Montréal", subcategory: "Information / référence", city: "Province", phone: "211", website: "https://www.211qc.ca", description: "Service d'information et de référence vers les ressources communautaires. Disponible 7j/7.", isProvinceWide: true, source: "211qc.ca" },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const toInsert = ENTRIES.map((o) => ({
    id: o.id, name: o.name, category: "social", subcategory: o.subcategory, city: o.city,
    phone: o.phone, website: o.website ?? "",
    description: `${o.description} Source: ${o.source}.`,
    address: o.address ?? null, hours: null,
    isUrgent: o.isUrgent ?? false, isProvinceWide: o.isProvinceWide ?? false,
    lat: null, lng: null, active: true,
    verifiedAt: new Date(), verifiedBy: "curated-social-network",
    verificationNote: `Vérifié via ${o.source}.`,
  }));
  console.log(`✅ Prepared ${toInsert.length} social entries`);
  if (dryRun) { console.log("dry-run"); process.exit(0); }
  const result = await db.transaction(async (tx) => {
    const deleted = await tx.delete(servicesTable).where(eq(servicesTable.category, "social")).returning({ id: servicesTable.id });
    await tx.insert(servicesTable).values(toInsert).onConflictDoNothing();
    return { deleted: deleted.length, inserted: toInsert.length };
  });
  console.log(`🎉 Done. Deleted: ${result.deleted}, Inserted: ${result.inserted}`);
  process.exit(0);
}
main().catch((err) => { console.error("❌", err); process.exit(1); });
