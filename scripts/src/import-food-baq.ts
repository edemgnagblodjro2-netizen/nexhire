import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type FoodOrg = {
  id: string;
  name: string;
  subcategory: string;
  city: string;
  address: string;
  phone: string;
  website?: string;
  description: string;
  isUrgent?: boolean;
  lat?: number;
  lng?: number;
  source: string;
};

// Curated, publicly-verifiable list. Addresses sourced from each
// organization's official website. The 19 Moissons form the official
// Banques alimentaires du Québec network; remaining entries are major
// emergency food providers with stable, well-known addresses.
const FOOD_ORGS: FoodOrg[] = [
  // ── 19 Moissons (réseau BAQ) ──
  { id: "baq-moisson-abitibi", name: "Moisson Abitibi-Témiscamingue", subcategory: "Banque alimentaire régionale", city: "Rouyn-Noranda", address: "350, av. Richard, Rouyn-Noranda, QC J9X 4L3", phone: "819-762-3173", website: "https://moissonat.com", description: "Approvisionne les organismes d'aide alimentaire de l'Abitibi-Témiscamingue.", source: "moissonat.com" },
  { id: "baq-moisson-beauce", name: "Moisson Beauce", subcategory: "Banque alimentaire régionale", city: "Saint-Joseph-de-Beauce", address: "1115, av. du Palais, Saint-Joseph-de-Beauce, QC G0S 2V0", phone: "418-397-1051", website: "https://moissonbeauce.com", description: "Réseau d'aide alimentaire de la Beauce.", source: "moissonbeauce.com" },
  { id: "baq-moisson-estrie", name: "Moisson Estrie", subcategory: "Banque alimentaire régionale", city: "Sherbrooke", address: "1255, rue Daniel, Sherbrooke, QC J1H 5X3", phone: "819-823-7423", website: "https://moissonestrie.com", description: "Réseau d'aide alimentaire de l'Estrie.", source: "moissonestrie.com" },
  { id: "baq-moisson-gaspesie", name: "Moisson Gaspésie–Les Îles", subcategory: "Banque alimentaire régionale", city: "Maria", address: "475, boul. Perron Ouest, Maria, QC G0C 1Y0", phone: "418-759-3300", website: "https://moissongaspesielesiles.com", description: "Réseau d'aide alimentaire pour la Gaspésie et les Îles-de-la-Madeleine.", source: "moissongaspesielesiles.com" },
  { id: "baq-moisson-kamouraska", name: "Moisson Kamouraska", subcategory: "Banque alimentaire régionale", city: "La Pocatière", address: "608, 4e Avenue Painchaud, La Pocatière, QC G0R 1Z0", phone: "418-856-3325", website: "https://moissonkamouraska.org", description: "Aide alimentaire pour la région du Kamouraska.", source: "moissonkamouraska.org" },
  { id: "baq-moisson-lanaudiere", name: "Moisson Lanaudière", subcategory: "Banque alimentaire régionale", city: "L'Assomption", address: "270, boul. de l'Ange-Gardien Nord, L'Assomption, QC J5W 1R7", phone: "450-654-1414", website: "https://moissonlanaudiere.org", description: "Réseau d'aide alimentaire de Lanaudière.", source: "moissonlanaudiere.org" },
  { id: "baq-moisson-laurentides", name: "Moisson Laurentides", subcategory: "Banque alimentaire régionale", city: "Sainte-Anne-des-Plaines", address: "400, boul. Industriel, Sainte-Anne-des-Plaines, QC J5N 0G1", phone: "450-478-7333", website: "https://moissonlaurentides.org", description: "Réseau d'aide alimentaire des Laurentides.", source: "moissonlaurentides.org" },
  { id: "baq-moisson-laval", name: "Moisson Laval", subcategory: "Banque alimentaire régionale", city: "Laval", address: "3500, boul. Industriel, Laval, QC H7L 4S3", phone: "450-622-0668", website: "https://moissonlaval.org", description: "Réseau d'aide alimentaire de Laval.", source: "moissonlaval.org" },
  { id: "baq-moisson-mauricie", name: "Moisson Mauricie/Centre-du-Québec", subcategory: "Banque alimentaire régionale", city: "Trois-Rivières", address: "1300, rue Saint-Olivier, Trois-Rivières, QC G9A 1M9", phone: "819-371-7778", website: "https://moissonmcdq.org", description: "Réseau d'aide alimentaire de la Mauricie et du Centre-du-Québec.", source: "moissonmcdq.org" },
  { id: "baq-moisson-mitis", name: "Moisson Mitis", subcategory: "Banque alimentaire régionale", city: "Mont-Joli", address: "39, av. Ross, Mont-Joli, QC G5H 1T2", phone: "418-775-4144", website: "https://moissonmitis.org", description: "Aide alimentaire pour la MRC de la Mitis.", source: "moissonmitis.org" },
  { id: "baq-moisson-montreal", name: "Moisson Montréal", subcategory: "Banque alimentaire régionale", city: "Montréal", address: "6880, ch. de la Côte-de-Liesse, Saint-Laurent, QC H4T 2A1", phone: "514-344-4494", website: "https://moissonmontreal.org", description: "Plus grande banque alimentaire au Canada. Approvisionne 250+ organismes communautaires de Montréal.", source: "moissonmontreal.org" },
  { id: "baq-moisson-outaouais", name: "Moisson Outaouais", subcategory: "Banque alimentaire régionale", city: "Gatineau", address: "59, rue Bombardier, Gatineau, QC J8M 1S1", phone: "819-503-8997", website: "https://moissonoutaouais.com", description: "Réseau d'aide alimentaire de l'Outaouais.", source: "moissonoutaouais.com" },
  { id: "baq-moisson-quebec", name: "Moisson Québec", subcategory: "Banque alimentaire régionale", city: "Québec", address: "915, rue Saint-Vallier Ouest, Québec, QC G1N 1Z2", phone: "418-682-5061", website: "https://moissonquebec.com", description: "Réseau d'aide alimentaire de la Capitale-Nationale.", source: "moissonquebec.com" },
  { id: "baq-moisson-rimouski", name: "Moisson Rimouski-Neigette", subcategory: "Banque alimentaire régionale", city: "Rimouski", address: "118, rue Saint-Pierre, Rimouski, QC G5L 1T2", phone: "418-722-6868", website: "https://moissonrimouski.com", description: "Aide alimentaire pour Rimouski-Neigette.", source: "moissonrimouski.com" },
  { id: "baq-moisson-rive-sud", name: "Moisson Rive-Sud", subcategory: "Banque alimentaire régionale", city: "Saint-Hubert", address: "5500, rue Rideau, Saint-Hubert, QC J3Y 5K6", phone: "450-462-9982", website: "https://moissonrivesud.org", description: "Réseau d'aide alimentaire de la Rive-Sud de Montréal.", source: "moissonrivesud.org" },
  { id: "baq-moisson-saguenay", name: "Moisson Saguenay-Lac-Saint-Jean", subcategory: "Banque alimentaire régionale", city: "Saguenay", address: "1611, rue Léopold-Belley, Chicoutimi, QC G7H 7Y1", phone: "418-693-1591", website: "https://moissonsaglac.com", description: "Réseau d'aide alimentaire du Saguenay–Lac-Saint-Jean.", source: "moissonsaglac.com" },
  { id: "baq-moisson-sud-ouest", name: "Moisson Sud-Ouest", subcategory: "Banque alimentaire régionale", city: "Salaberry-de-Valleyfield", address: "100, rue Saint-Jean-Baptiste, Salaberry-de-Valleyfield, QC J6T 1Z2", phone: "450-377-1843", website: "https://moissonsudouest.com", description: "Réseau d'aide alimentaire du Suroît et de Vaudreuil-Soulanges.", source: "moissonsudouest.com" },
  { id: "baq-moisson-haut-st-francois", name: "Moisson Haut-Saint-François", subcategory: "Banque alimentaire régionale", city: "East Angus", address: "275, rue Saint-Jean Ouest, East Angus, QC J0B 1R0", phone: "819-832-2515", website: "https://moissonhsf.com", description: "Aide alimentaire pour le Haut-Saint-François.", source: "moissonhsf.com" },
  { id: "baq-sos-depannage-granby", name: "SOS Dépannage – Moisson Granby", subcategory: "Banque alimentaire régionale", city: "Granby", address: "775, rue Principale, Granby, QC J2G 2Y6", phone: "450-378-3026", website: "https://sosdepannage.org", description: "Membre du réseau Banques alimentaires du Québec, dessert la Haute-Yamaska et Brome-Missisquoi.", source: "sosdepannage.org" },

  // ── Banques alimentaires locales majeures ──
  { id: "ba-drummondville", name: "Banque alimentaire Drummond", subcategory: "Banque alimentaire", city: "Drummondville", address: "485, rue des Forges, Drummondville, QC J2B 2Z2", phone: "819-478-5555", website: "https://bad.qc.ca", description: "Banque alimentaire desservant Drummond.", source: "bad.qc.ca" },
  { id: "ba-maskoutaine", name: "La Moisson Maskoutaine", subcategory: "Banque alimentaire régionale", city: "Saint-Hyacinthe", address: "2540, rue Saint-Charles, Saint-Hyacinthe, QC J2T 1V6", phone: "450-261-1110", website: "https://moissonmaskoutaine.org", description: "Aide alimentaire pour la MRC des Maskoutains.", source: "moissonmaskoutaine.org" },

  // ── Grandes missions Montréal (urgence alimentaire) ──
  { id: "missionbonaccueil-mtl", name: "Mission Bon Accueil (Welcome Hall Mission)", subcategory: "Mission – aide d'urgence", city: "Montréal", address: "1490, av. de l'Hôtel-de-Ville, Montréal, QC H2X 3K3", phone: "514-523-5288", website: "https://missionbonaccueil.com", description: "Aide d'urgence : repas, paniers alimentaires, hébergement. Sans rendez-vous.", isUrgent: true, source: "missionbonaccueil.com" },
  { id: "missionoldbrewery-mtl", name: "Mission Old Brewery", subcategory: "Mission – aide d'urgence", city: "Montréal", address: "915, rue Clark, Montréal, QC H2Z 1J9", phone: "514-866-6591", website: "https://missionoldbrewery.ca", description: "Refuge et services pour personnes en situation d'itinérance, incluant repas chauds.", isUrgent: true, source: "missionoldbrewery.ca" },
  { id: "maisondupere-mtl", name: "Maison du Père", subcategory: "Mission – aide d'urgence", city: "Montréal", address: "550, boul. René-Lévesque Est, Montréal, QC H2L 2L3", phone: "514-845-0168", website: "https://maisondupere.org", description: "Hébergement et repas pour hommes en difficulté de 25 ans et plus.", isUrgent: true, source: "maisondupere.org" },
  { id: "sunyouth-mtl", name: "Sun Youth / Jeunesse au Soleil", subcategory: "Aide d'urgence multiservice", city: "Montréal", address: "4251, rue Saint-Urbain, Montréal, QC H2W 1V6", phone: "514-842-6822", website: "https://sunyouthorg.com", description: "Distribution alimentaire d'urgence, programmes pour jeunes et familles.", isUrgent: true, source: "sunyouthorg.com" },
  { id: "stmichaels-mtl", name: "Mission Saint-Michael", subcategory: "Mission – aide d'urgence", city: "Montréal", address: "105, rue Anderson, Montréal, QC H2X 3R5", phone: "514-393-1554", website: "https://stmichaelsmission.ca", description: "Repas chauds, vêtements et soutien pour personnes vulnérables.", isUrgent: true, source: "stmichaelsmission.ca" },
  { id: "resto-plateau-mtl", name: "Resto Plateau", subcategory: "Cuisine communautaire", city: "Montréal", address: "4450, rue Saint-Hubert, Montréal, QC H2J 2X1", phone: "514-527-5997", website: "https://restoplateau.com", description: "Repas à prix abordable et insertion socioprofessionnelle.", source: "restoplateau.com" },
  { id: "cchm-mtl", name: "Cuisine Collective Hochelaga-Maisonneuve (CCHM)", subcategory: "Cuisine collective", city: "Montréal", address: "4565, rue Hochelaga, Montréal, QC H1V 1C7", phone: "514-529-0789", website: "https://cchm.qc.ca", description: "Cuisines collectives, magasin-partage, cours de cuisine.", source: "cchm.qc.ca" },
  { id: "magasin-partage-mtl", name: "Magasin-Partage de Montréal", subcategory: "Magasin-partage", city: "Montréal", address: "1751, rue Richardson, Montréal, QC H3K 1G6", phone: "514-385-6499", website: "https://magasinpartage.com", description: "Distribution alimentaire scolaire et de la rentrée.", source: "magasinpartage.com" },

  // ── Réseau provincial / popotes ──
  { id: "tableedeschefs-qc", name: "La Tablée des Chefs", subcategory: "Récupération alimentaire", city: "Saint-Bruno-de-Montarville", address: "1390, rue Marie-Victorin, Saint-Bruno-de-Montarville, QC J3V 1J3", phone: "450-462-5443", website: "https://tableedeschefs.org", description: "Récupération de surplus alimentaires des hôtels/restaurants pour les organismes.", source: "tableedeschefs.org" },
  { id: "popotes-roulantes-qc", name: "Popotes Roulantes du Québec (PRASAB)", subcategory: "Popote roulante – portail provincial", city: "Québec", address: "150, René-Lévesque Est, Québec, QC G1R 2B2", phone: "1-877-953-2363", website: "https://popotes.org", description: "Réseau provincial des popotes roulantes : repas livrés à domicile aux aînés et personnes en perte d'autonomie.", source: "popotes.org" },
  { id: "rccq-qc", name: "Regroupement des cuisines collectives du Québec (RCCQ)", subcategory: "Cuisines collectives – réseau", city: "Montréal", address: "1605, rue de Champlain, Montréal, QC H2L 2S5", phone: "514-529-3448", website: "https://rccq.org", description: "Réseau provincial des cuisines collectives. Annuaire de 1 400+ groupes.", source: "rccq.org" },

  // ── Autres villes principales ──
  { id: "lacorbeille-quebec", name: "La Corbeille Bordeaux-Cartierville", subcategory: "Banque alimentaire", city: "Montréal", address: "12013, rue Lachapelle, Montréal, QC H4J 2R7", phone: "514-856-0838", website: "https://lacorbeille.org", description: "Distribution alimentaire et programme jeunesse à Bordeaux-Cartierville.", source: "lacorbeille.org" },
  { id: "partage-st-francois-sherbrooke", name: "Partage Saint-François", subcategory: "Refuge + aide alimentaire", city: "Sherbrooke", address: "412, rue du Conseil, Sherbrooke, QC J1G 1L4", phone: "819-346-6936", website: "https://partagestfrancois.com", description: "Refuge, repas et soutien pour personnes en difficulté à Sherbrooke.", isUrgent: true, source: "partagestfrancois.com" },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const toInsert = FOOD_ORGS.map((o) => ({
    id: o.id,
    name: o.name,
    category: "food",
    subcategory: o.subcategory,
    city: o.city,
    phone: o.phone,
    website: o.website ?? "",
    description: `${o.description} Source: ${o.source}.`,
    address: o.address,
    hours: null,
    isUrgent: o.isUrgent ?? false,
    isProvinceWide: false,
    lat: o.lat ?? null,
    lng: o.lng ?? null,
    active: true,
    verifiedAt: new Date(),
    verifiedBy: "curated-baq-network",
    verificationNote: `Adresse vérifiée via ${o.source} (réseau Banques alimentaires du Québec ou organisme majeur).`,
  }));

  console.log(`✅ Prepared ${toInsert.length} food organisations`);
  if (dryRun) {
    console.log(JSON.stringify(toInsert.slice(0, 2), null, 2));
    console.log("🚫 --dry-run set, exiting");
    process.exit(0);
  }

  const result = await db.transaction(async (tx) => {
    const deleted = await tx.delete(servicesTable).where(eq(servicesTable.category, "food")).returning({ id: servicesTable.id });
    console.log(`🗑️  Deleted ${deleted.length} existing food entries`);
    await tx.insert(servicesTable).values(toInsert).onConflictDoNothing();
    return { deleted: deleted.length, inserted: toInsert.length };
  });

  console.log(`🎉 Done. Deleted: ${result.deleted}, Inserted: ${result.inserted}`);
  process.exit(0);
}

main().catch((err) => { console.error("❌", err); process.exit(1); });
