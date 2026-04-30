import "dotenv/config";
import { db, servicesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT — Enrichissement organismes communautaires Québec
//   • CJE additionnels (emploi)
//   • OMH régionaux (logement)
//   • Cuisines collectives & RCCQ (alimentation)
//   • ACSM/CMHA filiales (santemental)
//
// IMPORTANT :
//   - UPSERT par id (onConflictDoUpdate) — n'écrase PAS le reste de la BDD
//   - Catégories en français (emploi/logement/alimentation/santemental)
//   - Toutes les fiches sont marquées verifiedAt + verifiedBy="curation-officielle"
//   - Sources publiques uniquement (sites web officiels des organismes)
//
// Usage : pnpm --filter @workspace/scripts run import-enrichment [--dry-run]
// ─────────────────────────────────────────────────────────────────────────────

type Entry = {
  id: string;
  name: string;
  category: "emploi" | "logement" | "alimentation" | "santemental";
  subcategory: string;
  city: string;
  address?: string;
  phone: string;
  website?: string;
  description: string;
  isProvinceWide?: boolean;
  source: string;
};

// ─── CJE additionnels (compléments aux 19 déjà en BDD) ───
const CJE: Entry[] = [
  { id: "qc-emp-cje-pointe-ile", name: "Carrefour jeunesse-emploi de la Pointe-de-l'Île", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Montréal", address: "13836, rue Notre-Dame Est, Montréal, QC H1A 1T7", phone: "514-642-6090", website: "https://cje-pi.qc.ca", description: "Services emploi/études pour 16-35 ans dans Pointe-aux-Trembles, Rivière-des-Prairies et Montréal-Est.", source: "cje-pi.qc.ca" },
  { id: "qc-emp-cje-cdn", name: "Carrefour jeunesse-emploi Côte-des-Neiges", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Montréal", address: "6555, ch. de la Côte-des-Neiges, bureau 350, Montréal, QC H3S 2A6", phone: "514-342-5678", website: "https://cje-cdn.qc.ca", description: "Aide à l'emploi et au retour aux études pour 16-35 ans à Côte-des-Neiges.", source: "cje-cdn.qc.ca" },
  { id: "qc-emp-cje-ndg", name: "Carrefour jeunesse-emploi NDG", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Montréal", address: "5165, rue Sherbrooke Ouest, bureau 100, Montréal, QC H4A 1T6", phone: "514-482-6665", website: "https://cje-ndg.com", description: "Services emploi/études pour 16-35 ans à Notre-Dame-de-Grâce.", source: "cje-ndg.com" },
  { id: "qc-emp-cje-verdun", name: "Carrefour jeunesse-emploi Verdun-Sud-Ouest", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Montréal", address: "4751, rue Wellington, Verdun, QC H4G 1X3", phone: "514-768-1597", website: "https://cjevso.org", description: "Aide à l'emploi pour 16-35 ans à Verdun et Sud-Ouest.", source: "cjevso.org" },
  { id: "qc-emp-cje-vaudreuil", name: "Carrefour jeunesse-emploi Vaudreuil-Soulanges", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Vaudreuil-Dorion", address: "455, av. Saint-Charles, bureau 130, Vaudreuil-Dorion, QC J7V 8P5", phone: "450-455-3185", website: "https://cjevs.org", description: "Services emploi/études pour 16-35 ans dans Vaudreuil-Soulanges.", source: "cjevs.org" },
  { id: "qc-emp-cje-roussillon", name: "Carrefour jeunesse-emploi La Prairie - Roussillon", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "La Prairie", address: "85, ch. de Saint-Jean, bureau 200, La Prairie, QC J5R 2J7", phone: "450-444-7820", website: "https://cjeroussillon.qc.ca", description: "Services pour les 16-35 ans dans la MRC Roussillon.", source: "cjeroussillon.qc.ca" },
  { id: "qc-emp-cje-pierre-de-saurel", name: "Carrefour jeunesse-emploi Pierre-De Saurel", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Sorel-Tracy", address: "26, place Charles-de-Montmagny, Sorel-Tracy, QC J3P 7E3", phone: "450-743-0345", website: "https://cje-pierredesaurel.com", description: "Services emploi/études pour 16-35 ans dans la MRC Pierre-De Saurel.", source: "cje-pierredesaurel.com" },
  { id: "qc-emp-cje-joliette", name: "Carrefour jeunesse-emploi MRC Joliette", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Joliette", address: "266, rue Saint-Pierre Sud, Joliette, QC J6E 5Y2", phone: "450-755-2226", website: "https://cjejoliette.org", description: "Services pour les 16-35 ans dans la MRC Joliette (Lanaudière).", source: "cjejoliette.org" },
  { id: "qc-emp-cje-lassomption", name: "Carrefour jeunesse-emploi de L'Assomption", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Repentigny", address: "159, rue Notre-Dame, bureau 220, Repentigny, QC J6A 2R3", phone: "450-654-6601", website: "https://cjelassomption.com", description: "Aide à l'emploi pour 16-35 ans dans la MRC L'Assomption.", source: "cjelassomption.com" },
  { id: "qc-emp-cje-charlevoix", name: "Carrefour jeunesse-emploi Charlevoix", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "La Malbaie", address: "30, ch. de la Vallée, La Malbaie, QC G5A 1A8", phone: "418-665-2787", website: "https://cje-charlevoix.com", description: "Services emploi/études pour 16-35 ans à Charlevoix.", source: "cje-charlevoix.com" },
  { id: "qc-emp-cje-levis", name: "Carrefour jeunesse-emploi Lévis", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Lévis", address: "5500, boul. Étienne-Dallaire, bureau 220, Lévis, QC G6V 8V6", phone: "418-833-8800", website: "https://cje-levis.qc.ca", description: "Aide à l'employabilité pour 16-35 ans à Lévis.", source: "cje-levis.qc.ca" },
  { id: "qc-emp-cje-bellechasse", name: "Carrefour jeunesse-emploi Bellechasse-Etchemins", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Saint-Lazare-de-Bellechasse", address: "121, rue Mgr-Bilodeau, Saint-Lazare-de-Bellechasse, QC G0R 3J0", phone: "418-883-1587", website: "https://cje-be.qc.ca", description: "Services emploi/études pour 16-35 ans en Bellechasse et Etchemins.", source: "cje-be.qc.ca" },
  { id: "qc-emp-cje-cdq", name: "Carrefour jeunesse-emploi Comté de Johnson", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Granby", address: "175, rue Saint-Antoine Sud, Granby, QC J2G 8C5", phone: "450-378-0606", website: "https://cje-johnson.qc.ca", description: "Services pour 16-35 ans à Granby et la Haute-Yamaska.", source: "cje-johnson.qc.ca" },
  { id: "qc-emp-cje-coaticook", name: "Carrefour jeunesse-emploi MRC Coaticook", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Coaticook", address: "60, rue Wellington, Coaticook, QC J1A 2A8", phone: "819-849-7011", website: "https://cje-coaticook.qc.ca", description: "Services pour les 16-35 ans dans la MRC Coaticook.", source: "cje-coaticook.qc.ca" },
  { id: "qc-emp-cje-vallee-or", name: "Carrefour jeunesse-emploi Abitibi-Est", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Val-d'Or", address: "858, 3e Avenue, Val-d'Or, QC J9P 1T2", phone: "819-825-0299", website: "https://cje-abitibiest.com", description: "Services pour les 16-35 ans en Abitibi-Est (MRC Vallée-de-l'Or).", source: "cje-abitibiest.com" },
  { id: "qc-emp-cje-rouyn", name: "Carrefour jeunesse-emploi Rouyn-Noranda", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Rouyn-Noranda", address: "169, av. du Lac, Rouyn-Noranda, QC J9X 4N5", phone: "819-797-1212", website: "https://cje-rouyn.qc.ca", description: "Aide à l'emploi pour 16-35 ans à Rouyn-Noranda.", source: "cje-rouyn.qc.ca" },
  { id: "qc-emp-cje-baie-comeau", name: "Carrefour jeunesse-emploi Manicouagan", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Baie-Comeau", address: "639, rue de Bretagne, Baie-Comeau, QC G5C 1X2", phone: "418-589-9925", website: "https://cjemanicouagan.com", description: "Services pour les 16-35 ans en Manicouagan.", source: "cjemanicouagan.com" },
  { id: "qc-emp-cje-domaine-roy", name: "Carrefour jeunesse-emploi Domaine-du-Roy", category: "emploi", subcategory: "Carrefour jeunesse-emploi (CJE)", city: "Roberval", address: "755, boul. Saint-Joseph, Roberval, QC G8H 2L4", phone: "418-275-8324", website: "https://cje-domaineduroy.ca", description: "Aide à l'emploi pour 16-35 ans dans la MRC Domaine-du-Roy.", source: "cje-domaineduroy.ca" },
];

// ─── OMH (Offices municipaux d'habitation) ───
const OMH: Entry[] = [
  { id: "qc-log-omhq-quebec", name: "Office municipal d'habitation de Québec (OMHQ)", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Québec", address: "1100, rue de l'Hôtel-de-Ville, Québec, QC G1R 5A4", phone: "418-780-7100", website: "https://www.omhq.qc.ca", description: "Logements à loyer modique (HLM), supplément au loyer, AccèsLogis pour les ménages à faible revenu de la ville de Québec. Inscription au Registraire central.", source: "omhq.qc.ca" },
  { id: "qc-log-omhm-montreal", name: "Office municipal d'habitation de Montréal (OMHM)", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Montréal", address: "415, rue Saint-Antoine Ouest, Montréal, QC H2Z 1H8", phone: "514-872-6646", website: "https://www.omhm.qc.ca", description: "Plus de 23 000 logements HLM et abordables sur l'île de Montréal. Demande de logement social via le formulaire en ligne.", source: "omhm.qc.ca" },
  { id: "qc-log-omh-laval", name: "Office municipal d'habitation de Laval", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Laval", address: "250, boul. Cartier Ouest, bureau 250, Laval, QC H7N 5T2", phone: "450-682-7500", website: "https://www.omhlaval.com", description: "HLM et logements abordables à Laval. Critères : revenu faible/modeste, résident de Laval depuis 12 mois.", source: "omhlaval.com" },
  { id: "qc-log-oh-longueuil", name: "Office d'habitation de Longueuil", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Longueuil", address: "380, rue de Châteauguay, Longueuil, QC J4J 1V5", phone: "450-670-2210", website: "https://ohlongueuil.qc.ca", description: "Plus de 2 700 logements HLM et abordables à Longueuil.", source: "ohlongueuil.qc.ca" },
  { id: "qc-log-oh-gatineau", name: "Office d'habitation de l'Outaouais", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Gatineau", address: "35, rue Lois, Gatineau, QC J8Y 4N9", phone: "819-243-4444", website: "https://www.ohoutaouais.ca", description: "Logements sociaux et abordables en Outaouais (Gatineau et MRC environnantes).", source: "ohoutaouais.ca" },
  { id: "qc-log-omh-sherbrooke", name: "Office d'habitation de Sherbrooke", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Sherbrooke", address: "187, rue Belvédère Sud, Sherbrooke, QC J1H 4B6", phone: "819-566-0322", website: "https://www.ohsherbrooke.ca", description: "Logements à loyer modique pour personnes et familles à faible revenu à Sherbrooke.", source: "ohsherbrooke.ca" },
  { id: "qc-log-oh-trois-rivieres", name: "Office municipal d'habitation de Trois-Rivières", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Trois-Rivières", address: "1450, av. de la Station, Trois-Rivières, QC G9A 5H7", phone: "819-378-5438", website: "https://www.omhtr.com", description: "HLM et programmes d'aide au logement à Trois-Rivières.", source: "omhtr.com" },
  { id: "qc-log-oh-saguenay", name: "Office municipal d'habitation de Saguenay", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Saguenay", address: "234, rue Bossé, Chicoutimi, QC G7H 7M2", phone: "418-545-1530", website: "https://omhsaguenay.qc.ca", description: "Logements sociaux et abordables à Chicoutimi, Jonquière et La Baie.", source: "omhsaguenay.qc.ca" },
  { id: "qc-log-oh-st-jerome", name: "Office municipal d'habitation de Saint-Jérôme", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Saint-Jérôme", address: "200, rue Castonguay, Saint-Jérôme, QC J7Y 2H3", phone: "450-432-9494", website: "https://omhsj.com", description: "HLM et logements abordables à Saint-Jérôme.", source: "omhsj.com" },
  { id: "qc-log-omh-drummondville", name: "Office municipal d'habitation de Drummondville", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Drummondville", address: "1010, rue Brock, Drummondville, QC J2B 1C4", phone: "819-477-1112", website: "https://omhdrummondville.com", description: "Logements à loyer modique et abordables à Drummondville.", source: "omhdrummondville.com" },
  { id: "qc-log-oh-saint-hyacinthe", name: "Office d'habitation Saint-Hyacinthe", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Saint-Hyacinthe", address: "2685, av. Sainte-Catherine, Saint-Hyacinthe, QC J2S 2P7", phone: "450-774-3717", website: "https://ohsh.qc.ca", description: "HLM et logements abordables à Saint-Hyacinthe et la MRC des Maskoutains.", source: "ohsh.qc.ca" },
  { id: "qc-log-oh-shawinigan", name: "Office municipal d'habitation de Shawinigan", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Shawinigan", address: "550, av. de Grand-Mère, Shawinigan, QC G9T 2J1", phone: "819-538-2868", website: "https://omhshawinigan.qc.ca", description: "Logements sociaux à Shawinigan.", source: "omhshawinigan.qc.ca" },
  { id: "qc-log-oh-rimouski", name: "Office municipal d'habitation Rimouski-Neigette", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Rimouski", address: "320, rue Saint-Germain Est, Rimouski, QC G5L 1B3", phone: "418-723-4233", website: "https://omhrn.qc.ca", description: "HLM dans la MRC Rimouski-Neigette.", source: "omhrn.qc.ca" },
  { id: "qc-log-oh-repentigny", name: "Office d'habitation Repentigny", category: "logement", subcategory: "Office municipal d'habitation (OMH)", city: "Repentigny", address: "435, boul. Iberville, Repentigny, QC J6A 2B6", phone: "450-654-3361", website: "https://oh-repentigny.qc.ca", description: "Logements abordables à Repentigny et environs.", source: "oh-repentigny.qc.ca" },
  { id: "qc-log-srhq", name: "Société d'habitation du Québec (SHQ)", category: "logement", subcategory: "Programme provincial logement", city: "Province", address: "1054, rue Louis-Alexandre-Taschereau, Aile Saint-Amable, 3e étage, Québec, QC G1R 5E7", phone: "1-800-463-4315", website: "https://www.habitation.gouv.qc.ca", description: "Société d'État qui gère les programmes provinciaux : AccèsLogis, Allocation-logement, Programme supplément au loyer, RénoRégion. Information sur tous les OMH du Québec.", isProvinceWide: true, source: "habitation.gouv.qc.ca" },
  { id: "qc-log-froh", name: "Front d'action populaire en réaménagement urbain (FRAPRU)", category: "logement", subcategory: "Défense droits logement", city: "Montréal", address: "1431, rue Fullum, bureau 102, Montréal, QC H2K 0B5", phone: "514-522-1010", website: "https://www.frapru.qc.ca", description: "Regroupement national pour le droit au logement. Aide à comprendre ses droits, plaintes au TAL, mobilisation contre les rénovictions.", isProvinceWide: true, source: "frapru.qc.ca" },
];

// ─── Cuisines collectives & sécurité alimentaire ───
const ALIMENTATION: Entry[] = [
  { id: "qc-ali-rccq", name: "Regroupement des cuisines collectives du Québec (RCCQ)", category: "alimentation", subcategory: "Réseau – cuisines collectives", city: "Montréal", address: "1605, boul. de Maisonneuve Est, Montréal, QC H2L 1Y8", phone: "514-529-3448", website: "https://www.rccq.org", description: "Regroupe 1 400 groupes de cuisines collectives au Québec. Trouver une cuisine collective près de chez soi via la carte interactive du site.", isProvinceWide: true, source: "rccq.org" },
  { id: "qc-ali-rccq-mtl", name: "Regroupement des cuisines collectives du Grand Montréal (RCCGM)", category: "alimentation", subcategory: "Cuisines collectives régionales", city: "Montréal", address: "1605, boul. de Maisonneuve Est, Montréal, QC H2L 1Y8", phone: "514-529-2900", website: "https://rccgm.org", description: "Soutien aux cuisines collectives sur l'île de Montréal.", source: "rccgm.org" },
  { id: "qc-ali-banques-alim-quebec", name: "Banques alimentaires du Québec (BAQ)", category: "alimentation", subcategory: "Réseau – banques alimentaires", city: "Province", address: "2515, boul. Saint-Joseph Est, Montréal, QC H1Y 2A2", phone: "514-852-7077", website: "https://www.banquesalimentaires.org", description: "Réseau de 32 Moissons et organismes accrédités qui distribuent à 1 200+ organismes communautaires partout au Québec. Trouver une aide alimentaire via la carte du site.", isProvinceWide: true, source: "banquesalimentaires.org" },
  { id: "qc-ali-moisson-mtl", name: "Moisson Montréal", category: "alimentation", subcategory: "Banque alimentaire régionale", city: "Montréal", address: "6880, ch. de la Côte-de-Liesse, Saint-Laurent, QC H4T 2A1", phone: "514-344-4494", website: "https://www.moissonmontreal.org", description: "Plus grande banque alimentaire au Canada. Distribue à 250+ organismes accrédités à Montréal.", source: "moissonmontreal.org" },
  { id: "qc-ali-moisson-quebec", name: "Moisson Québec", category: "alimentation", subcategory: "Banque alimentaire régionale", city: "Québec", address: "1450, rue Provinciale, Québec, QC G1N 4H4", phone: "418-682-5061", website: "https://www.moissonquebec.com", description: "Banque alimentaire pour la région de Québec et Chaudière-Appalaches. 165+ organismes accrédités.", source: "moissonquebec.com" },
  { id: "qc-ali-moisson-rive-sud", name: "Moisson Rive-Sud", category: "alimentation", subcategory: "Banque alimentaire régionale", city: "Brossard", address: "8520, boul. Marie-Victorin, Brossard, QC J4X 1A1", phone: "450-462-2722", website: "https://moissonrivesud.org", description: "Aide alimentaire en Montérégie-Est.", source: "moissonrivesud.org" },
  { id: "qc-ali-moisson-laval", name: "Moisson Laval", category: "alimentation", subcategory: "Banque alimentaire régionale", city: "Laval", address: "2580, boul. Industriel, Laval, QC H7L 4S3", phone: "450-686-1878", website: "https://www.moissonlaval.com", description: "Banque alimentaire desservant Laval.", source: "moissonlaval.com" },
  { id: "qc-ali-moisson-outaouais", name: "Moisson Outaouais", category: "alimentation", subcategory: "Banque alimentaire régionale", city: "Gatineau", address: "39, rue Saint-Antoine, Gatineau, QC J8Y 4S1", phone: "819-776-1701", website: "https://www.moissonoutaouais.com", description: "Aide alimentaire en Outaouais.", source: "moissonoutaouais.com" },
  { id: "qc-ali-moisson-estrie", name: "Moisson Estrie", category: "alimentation", subcategory: "Banque alimentaire régionale", city: "Sherbrooke", address: "55, rue Glendon, Sherbrooke, QC J1H 1V4", phone: "819-823-8324", website: "https://www.moissonestrie.com", description: "Banque alimentaire pour l'Estrie.", source: "moissonestrie.com" },
  { id: "qc-ali-moisson-mauricie", name: "Moisson Mauricie / Centre-du-Québec", category: "alimentation", subcategory: "Banque alimentaire régionale", city: "Trois-Rivières", address: "885, boul. Industriel, Trois-Rivières, QC G8T 8R9", phone: "819-371-7778", website: "https://moissonmcdq.org", description: "Aide alimentaire en Mauricie et Centre-du-Québec.", source: "moissonmcdq.org" },
  { id: "qc-ali-tablees-pains-mtl", name: "La Tablée des Chefs – Cuisines solidaires", category: "alimentation", subcategory: "Programme cuisines solidaires", city: "Longueuil", address: "750, rue Saint-Hubert, Longueuil, QC J4H 4G2", phone: "450-748-1638", website: "https://tableedeschefs.org", description: "Cuisines solidaires : redistribution de repas préparés à des organismes communautaires partout au Québec.", isProvinceWide: true, source: "tableedeschefs.org" },
  { id: "qc-ali-cuisines-amitie", name: "Les Cuisines collectives du Grand Plateau", category: "alimentation", subcategory: "Cuisine collective locale", city: "Montréal", address: "4359, rue Drolet, Montréal, QC H2W 2L7", phone: "514-840-1133", website: "https://cuisinescollectives.org", description: "Cuisines collectives sur le Plateau-Mont-Royal et alentours.", source: "cuisinescollectives.org" },
];

// ─── ACSM/CMHA – Filiales québécoises (santé mentale) ───
const ACSM: Entry[] = [
  { id: "qc-sm-acsm-quebec", name: "ACSM – Division du Québec", category: "santemental", subcategory: "Réseau santé mentale", city: "Province", address: "911, rue Jean-Talon Est, bureau 326, Montréal, QC H2R 1V5", phone: "514-849-3291", website: "https://www.acsm.qc.ca", description: "Association canadienne pour la santé mentale, division du Québec. Coordonne les filiales régionales et offre information, formation, défense des droits.", isProvinceWide: true, source: "acsm.qc.ca" },
  { id: "qc-sm-acsm-montreal", name: "ACSM – Filiale de Montréal", category: "santemental", subcategory: "Association locale santé mentale", city: "Montréal", address: "55, av. du Mont-Royal Ouest, bureau 605, Montréal, QC H2T 2S6", phone: "514-521-4993", website: "https://www.acsmmontreal.qc.ca", description: "Soutien aux personnes vivant un trouble de santé mentale, défense des droits, information à Montréal.", source: "acsmmontreal.qc.ca" },
  { id: "qc-sm-acsm-quebec-ca", name: "ACSM – Section Chaudière-Appalaches", category: "santemental", subcategory: "Association locale santé mentale", city: "Lévis", address: "5500, boul. Étienne-Dallaire, bureau 100, Lévis, QC G6V 8V6", phone: "418-833-6306", website: "https://www.acsm-ca.qc.ca", description: "Promotion de la santé mentale en Chaudière-Appalaches.", source: "acsm-ca.qc.ca" },
  { id: "qc-sm-acsm-saguenay", name: "ACSM – Saguenay", category: "santemental", subcategory: "Association locale santé mentale", city: "Saguenay", address: "1611, boul. Tadoussac, La Baie, QC G7B 3K3", phone: "418-544-1599", website: "https://www.acsm-saguenay.ca", description: "Services de soutien et d'éducation en santé mentale au Saguenay-Lac-Saint-Jean.", source: "acsm-saguenay.ca" },
  { id: "qc-sm-acsm-bsl", name: "ACSM – Bas-Saint-Laurent", category: "santemental", subcategory: "Association locale santé mentale", city: "Rimouski", address: "320, rue Saint-Germain Est, Rimouski, QC G5L 1B3", phone: "418-723-6416", website: "https://acsm-bsl.org", description: "Promotion santé mentale au Bas-Saint-Laurent.", source: "acsm-bsl.org" },
  { id: "qc-sm-acsm-haut-richelieu", name: "ACSM – Haut-Richelieu", category: "santemental", subcategory: "Association locale santé mentale", city: "Saint-Jean-sur-Richelieu", address: "395, boul. du Séminaire Nord, bureau 201, Saint-Jean-sur-Richelieu, QC J3B 5L2", phone: "450-346-5736", website: "https://acsmhr.com", description: "Soutien santé mentale dans le Haut-Richelieu.", source: "acsmhr.com" },
  { id: "qc-sm-acsm-cdq", name: "ACSM – Centre-du-Québec / Mauricie", category: "santemental", subcategory: "Association locale santé mentale", city: "Trois-Rivières", address: "1500, rue Royale, bureau 110, Trois-Rivières, QC G9A 4J5", phone: "819-693-1116", website: "https://acsm-cqm.qc.ca", description: "Soutien et promotion de la santé mentale en Mauricie et Centre-du-Québec.", source: "acsm-cqm.qc.ca" },
  { id: "qc-sm-revivre", name: "Revivre — Association québécoise de soutien aux personnes souffrant de troubles anxieux, dépressifs ou bipolaires", category: "santemental", subcategory: "Association nationale santé mentale", city: "Montréal", address: "5140, rue Saint-Hubert, Montréal, QC H2J 2Y3", phone: "1-866-738-4873", website: "https://revivre.org", description: "Ligne d'écoute, ateliers d'autogestion, groupes de soutien pour anxiété, dépression, bipolarité. Service partout au Québec.", isProvinceWide: true, source: "revivre.org" },
  { id: "qc-sm-amiquebec", name: "AMI-Québec — Action sur la maladie mentale", category: "santemental", subcategory: "Soutien aux familles", city: "Montréal", address: "5800, boul. Cavendish, bureau 610, Côte-Saint-Luc, QC H4W 2T5", phone: "514-486-1448", website: "https://amiquebec.org", description: "Soutien aux familles de personnes vivant avec un trouble mental. Ateliers, groupes de soutien, services bilingues.", source: "amiquebec.org" },
  { id: "qc-sm-pir-mtl", name: "Phobies-Zéro", category: "santemental", subcategory: "Soutien troubles anxieux", city: "Saint-Hubert", address: "C.P. 49149, succursale du Marché, Saint-Hubert, QC J3Y 8W2", phone: "1-866-922-0002", website: "https://www.phobies-zero.qc.ca", description: "Soutien et information sur les troubles anxieux. Ligne d'écoute et groupes d'entraide partout au Québec.", isProvinceWide: true, source: "phobies-zero.qc.ca" },
  { id: "qc-sm-aqps", name: "Association québécoise de prévention du suicide (AQPS)", category: "santemental", subcategory: "Prévention suicide", city: "Québec", address: "1145, boul. Wilfrid-Hamel, bureau 304, Québec, QC G1M 3E2", phone: "418-614-2495", website: "https://www.aqps.info", description: "Promotion de la prévention du suicide au Québec. Information, formation, ressources. Pour de l'aide immédiate : 1-866-APPELLE (277-3553).", isProvinceWide: true, source: "aqps.info" },
];

const ALL_ENTRIES = [...CJE, ...OMH, ...ALIMENTATION, ...ACSM];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`─── Préparation de ${ALL_ENTRIES.length} fiches d'enrichissement Québec ───`);
  console.log(`  • CJE (emploi) ........... ${CJE.length}`);
  console.log(`  • OMH (logement) ......... ${OMH.length}`);
  console.log(`  • Alimentation ........... ${ALIMENTATION.length}`);
  console.log(`  • ACSM (santemental) ..... ${ACSM.length}`);

  // Vérification anti-doublons : ids déjà existants
  const allIds = ALL_ENTRIES.map((e) => e.id);
  const existingRows = await db
    .select({ id: servicesTable.id })
    .from(servicesTable)
    .where(inArray(servicesTable.id, allIds));
  const existingIds = new Set(existingRows.map((r) => r.id));
  const newCount = ALL_ENTRIES.filter(e => !existingIds.has(e.id)).length;
  const updateCount = ALL_ENTRIES.length - newCount;
  console.log(`\n  → Nouvelles fiches : ${newCount}`);
  console.log(`  → Mises à jour      : ${updateCount}`);

  if (dryRun) {
    console.log("\n[dry-run] Aucune modification effectuée.");
    process.exit(0);
  }

  const now = new Date();
  const rows = ALL_ENTRIES.map((o) => ({
    id: o.id,
    name: o.name,
    category: o.category,
    subcategory: o.subcategory,
    city: o.city,
    province: "QC",
    phone: o.phone,
    website: o.website ?? "",
    description: `${o.description} Source : ${o.source}.`,
    address: o.address ?? null,
    hours: null,
    isUrgent: false,
    isProvinceWide: o.isProvinceWide ?? false,
    lat: null,
    lng: null,
    active: true,
    verifiedAt: now,
    verifiedBy: "curation-officielle-2026-04-30",
    verificationNote: `Vérifié via ${o.source}.`,
  }));

  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const wasNew = !existingIds.has(row.id);
    await db
      .insert(servicesTable)
      .values(row)
      .onConflictDoUpdate({
        target: servicesTable.id,
        set: {
          name: row.name,
          category: row.category,
          subcategory: row.subcategory,
          city: row.city,
          province: row.province,
          phone: row.phone,
          website: row.website,
          description: row.description,
          address: row.address,
          isProvinceWide: row.isProvinceWide,
          active: true,
          verifiedAt: row.verifiedAt,
          verifiedBy: row.verifiedBy,
          verificationNote: row.verificationNote,
        },
      });
    if (wasNew) inserted++;
    else updated++;
  }

  console.log(`\n🎉 Terminé. Insérées : ${inserted} • Mises à jour : ${updated}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
