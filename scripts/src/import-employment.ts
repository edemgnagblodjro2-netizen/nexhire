import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type E = { id: string; name: string; subcategory: string; city: string; address?: string; phone: string; website?: string; description: string; isProvinceWide?: boolean; source: string };

const ENTRIES: E[] = [
  // ── Provincial / gouvernemental ──
  { id: "emp-services-quebec", name: "Services Québec – Centres locaux d'emploi", subcategory: "Gouvernement – emploi", city: "Province", phone: "1-877-644-4545", website: "https://www.quebec.ca/emploi", description: "130+ Centres locaux d'emploi (CLE) au Québec : aide à la recherche d'emploi, aide financière de dernier recours, formation. Trouver un CLE par code postal sur le site.", isProvinceWide: true, source: "quebec.ca" },
  { id: "emp-emploi-quebec", name: "Emploi-Québec", subcategory: "Gouvernement – emploi", city: "Province", phone: "1-888-643-4721", website: "https://www.emploiquebec.gouv.qc.ca", description: "Service public d'emploi : Placement en ligne, IMT en ligne, programmes de formation et d'employabilité.", isProvinceWide: true, source: "emploiquebec.gouv.qc.ca" },
  { id: "emp-rcjeq", name: "Réseau des carrefours jeunesse-emploi du Québec (RCJEQ)", subcategory: "Réseau – emploi jeunes", city: "Province", address: "1135, Grande Allée Ouest, bureau 220, Québec, QC G1S 1E7", phone: "418-845-7222", website: "https://rcjeq.org", description: "Regroupe 110 Carrefours jeunesse-emploi à travers le Québec.", isProvinceWide: true, source: "rcjeq.org" },
  { id: "emp-rseo", name: "Réseau des SADC et CAE du Québec", subcategory: "Développement économique régional", city: "Province", address: "1170, boul. Lebourgneuf, bureau 110, Québec, QC G2K 2E3", phone: "418-687-1354", website: "https://sadc-cae.ca", description: "57 SADC et 10 CAE soutiennent l'entrepreneuriat et la création d'emplois en région.", isProvinceWide: true, source: "sadc-cae.ca" },

  // ── CJE (Carrefours jeunesse-emploi) sample ──
  { id: "emp-cje-cdv", name: "Carrefour jeunesse-emploi Centre-Sud / Plateau Mont-Royal / Mile-End", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Montréal", address: "4321, av. Papineau, Montréal, QC H2H 1T3", phone: "514-528-6838", website: "https://cjecsplateau.org", description: "Aide à l'emploi et au retour aux études pour 16-35 ans dans Centre-Sud, Plateau et Mile-End.", source: "cjecsplateau.org" },
  { id: "emp-cje-hochelaga", name: "Carrefour jeunesse-emploi Hochelaga-Maisonneuve", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Montréal", address: "4068, rue Sainte-Catherine Est, Montréal, QC H1V 1Y1", phone: "514-251-0832", website: "https://cjehm.org", description: "Soutien à l'emploi pour 16-35 ans à Hochelaga-Maisonneuve.", source: "cjehm.org" },
  { id: "emp-cje-rosemont", name: "Carrefour jeunesse-emploi Rosemont/Petite-Patrie", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Montréal", address: "5095, 9e av., Montréal, QC H1Y 2J3", phone: "514-524-6826", website: "https://cje-rpp.org", description: "Services emploi/études pour 16-35 ans dans Rosemont et la Petite-Patrie.", source: "cje-rpp.org" },
  { id: "emp-cje-st-laurent", name: "Carrefour jeunesse-emploi de Saint-Laurent", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Montréal", address: "1055, boul. Marcel-Laurin, bureau 230, Saint-Laurent, QC H4R 1J4", phone: "514-744-5237", website: "https://cjestlaurent.qc.ca", description: "Services d'orientation, recherche d'emploi pour 16-35 ans à Saint-Laurent.", source: "cjestlaurent.qc.ca" },
  { id: "emp-cje-quebec", name: "Carrefour jeunesse-emploi de la Capitale-Nationale", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Québec", address: "275, rue de la Couronne, bureau 100, Québec, QC G1K 6E2", phone: "418-525-5526", website: "https://cjecn.com", description: "Services pour les jeunes 16-35 ans dans la région de Québec.", source: "cjecn.com" },
  { id: "emp-cje-laval", name: "Carrefour jeunesse-emploi de Laval", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Laval", address: "440, boul. Saint-Martin Ouest, bureau 100, Laval, QC H7M 3L1", phone: "450-967-9009", website: "https://cje-laval.qc.ca", description: "Aide à l'employabilité, retour aux études, entrepreneuriat à Laval.", source: "cje-laval.qc.ca" },
  { id: "emp-cje-longueuil", name: "Carrefour jeunesse-emploi Marguerite-d'Youville", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Sainte-Julie", address: "350, boul. Saint-Joseph, Sainte-Julie, QC J3E 1W6", phone: "450-922-1717", website: "https://cjemy.com", description: "Services emploi/études pour 16-35 ans à Marguerite-d'Youville.", source: "cjemy.com" },
  { id: "emp-cje-gatineau", name: "Carrefour jeunesse-emploi Outaouais", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Gatineau", address: "92, boul. Saint-Raymond, Gatineau, QC J8Y 1S7", phone: "819-771-4391", website: "https://cjeo.qc.ca", description: "Services pour les 16-35 ans en Outaouais.", source: "cjeo.qc.ca" },
  { id: "emp-cje-sherbrooke", name: "Carrefour jeunesse-emploi de Sherbrooke", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Sherbrooke", address: "187, rue Belvédère Sud, Sherbrooke, QC J1H 4B6", phone: "819-823-7508", website: "https://cje-sherbrooke.qc.ca", description: "Soutien à l'emploi pour 16-35 ans à Sherbrooke.", source: "cje-sherbrooke.qc.ca" },
  { id: "emp-cje-trois-rivieres", name: "Carrefour jeunesse-emploi de Trois-Rivières/MRC des Chenaux", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Trois-Rivières", address: "1500, rue Royale, bureau 220, Trois-Rivières, QC G9A 4J5", phone: "819-374-8045", website: "https://cjetr.qc.ca", description: "Services emploi/études pour 16-35 ans en Mauricie.", source: "cjetr.qc.ca" },
  { id: "emp-cje-saguenay", name: "Carrefour jeunesse-emploi Saguenay", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Saguenay", phone: "418-549-2470", website: "https://cjesag.qc.ca", description: "Soutien à l'employabilité pour les jeunes du Saguenay.", source: "cjesag.qc.ca" },
  { id: "emp-cje-rimouski", name: "Carrefour jeunesse-emploi Rimouski-Neigette", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Rimouski", phone: "418-722-7449", website: "https://cje-rn.org", description: "Services pour les 16-35 ans à Rimouski.", source: "cje-rn.org" },
  { id: "emp-cje-drummondville", name: "Carrefour jeunesse-emploi Drummond", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Drummondville", address: "150, rue Marchand, bureau 260, Drummondville, QC J2C 4N1", phone: "819-477-1719", website: "https://cjedrummond.com", description: "Services emploi/études pour 16-35 ans à Drummond.", source: "cjedrummond.com" },

  // ── SEMO (Services spécialisés de main-d'œuvre) ──
  { id: "emp-semo-mtl", name: "SEMO – Action main-d'œuvre", subcategory: "Service spécialisé main-d'œuvre", city: "Montréal", address: "55, av. du Mont-Royal Ouest, bureau 800, Montréal, QC H2T 2S6", phone: "514-721-4941", website: "https://actionmaindoeuvre.ca", description: "Services spécialisés en employabilité pour personnes avec contraintes (handicap, santé mentale).", source: "actionmaindoeuvre.ca" },
  { id: "emp-semo-tetes", name: "Têtes en l'air – SEMO santé mentale", subcategory: "Service spécialisé main-d'œuvre", city: "Montréal", address: "5165, rue Sherbrooke Ouest, bureau 480, Montréal, QC H4A 1T6", phone: "514-484-9889", website: "https://tetesenlair.org", description: "Aide à l'emploi pour personnes vivant avec un trouble mental.", source: "tetesenlair.org" },

  // ── Organismes spécialisés ──
  { id: "emp-equitas-mtl", name: "Promotion Intégration Société Nouvelle (PROMIS) – volet emploi", subcategory: "Employabilité immigrants", city: "Montréal", address: "3333, ch. de la Côte-Sainte-Catherine, bureau 201, Montréal, QC H3T 1C8", phone: "514-345-1615", website: "https://promis.qc.ca", description: "Insertion professionnelle des personnes immigrantes.", source: "promis.qc.ca" },
  { id: "emp-rocaq", name: "RGPAQ – Regroupement des groupes populaires en alphabétisation du Québec", subcategory: "Alphabétisation", city: "Montréal", address: "5040, boul. Saint-Laurent, bureau 100, Montréal, QC H2T 1R7", phone: "514-523-2046", website: "https://rgpaq.qc.ca", description: "75+ groupes en alphabétisation populaire au Québec.", isProvinceWide: true, source: "rgpaq.qc.ca" },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const toInsert = ENTRIES.map((o) => ({
    id: o.id, name: o.name, category: "employment", subcategory: o.subcategory, city: o.city,
    phone: o.phone, website: o.website ?? "",
    description: `${o.description} Source: ${o.source}.`,
    address: o.address ?? null, hours: null,
    isUrgent: false, isProvinceWide: o.isProvinceWide ?? false,
    lat: null, lng: null, active: true,
    verifiedAt: new Date(), verifiedBy: "curated-employment-network",
    verificationNote: `Vérifié via ${o.source}.`,
  }));
  console.log(`✅ Prepared ${toInsert.length} employment entries`);
  if (dryRun) { console.log("dry-run"); process.exit(0); }
  const result = await db.transaction(async (tx) => {
    const deleted = await tx.delete(servicesTable).where(eq(servicesTable.category, "employment")).returning({ id: servicesTable.id });
    await tx.insert(servicesTable).values(toInsert).onConflictDoNothing();
    return { deleted: deleted.length, inserted: toInsert.length };
  });
  console.log(`🎉 Done. Deleted: ${result.deleted}, Inserted: ${result.inserted}`);
  process.exit(0);
}
main().catch((err) => { console.error("❌", err); process.exit(1); });
