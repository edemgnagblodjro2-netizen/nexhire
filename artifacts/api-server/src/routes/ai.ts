import { Router, type Request } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSession, getSessionId } from "../lib/auth.js";

// ── Free-tier daily quota for AI chat ────────────────────────────
// Free users: 5 messages/day. Premium users: unlimited.
// In-memory map keyed by userId or IP. Resets at local midnight (UTC).
const FREE_DAILY_LIMIT = 5;
const aiChatCounts = new Map<string, { day: string; count: number }>();

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function bumpQuota(key: string): { count: number; limit: number; remaining: number } {
  const today = todayKey();
  const entry = aiChatCounts.get(key);
  if (!entry || entry.day !== today) {
    aiChatCounts.set(key, { day: today, count: 1 });
    return { count: 1, limit: FREE_DAILY_LIMIT, remaining: FREE_DAILY_LIMIT - 1 };
  }
  entry.count += 1;
  // Periodic GC
  if (aiChatCounts.size > 5000) {
    for (const [k, v] of aiChatCounts) {
      if (v.day !== today) aiChatCounts.delete(k);
    }
  }
  return { count: entry.count, limit: FREE_DAILY_LIMIT, remaining: Math.max(0, FREE_DAILY_LIMIT - entry.count) };
}

async function getUserPremiumStatus(req: Request): Promise<{ isPremium: boolean; userId: string | null }> {
  try {
    const sid = getSessionId(req);
    if (!sid) return { isPremium: false, userId: null };
    const session = await getSession(sid);
    const userId = session?.user?.id;
    if (!userId) return { isPremium: false, userId: null };
    const [u] = await db
      .select({ isPremium: usersTable.isPremium })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    return { isPremium: !!u?.isPremium, userId };
  } catch {
    return { isPremium: false, userId: null };
  }
}

function clientKey(req: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
  return `ip:${ip}`;
}

const router = Router();

const SERVICES_CATALOG = `
PROVINCE-WIDE SERVICES (accessible depuis partout au Québec):
- ID:pw1 | 211 Québec | Référence communautaire | Tél:211 | Toutes catégories
- ID:pw2 | Info-Santé 811 | Santé - infirmières 24h | Tél:811
- ID:pw3 | SOS Violence Conjugale | Violence conjugale 24h | Tél:1-800-363-9010
- ID:pw4 | DPJ Protection de la jeunesse | Enfants en danger | Tél:1-800-463-9019
- ID:pw5 | Suicide Action Montréal / Tel-Jeunes | Prévention suicide 24h | Tél:1-866-APPELLE
- ID:pw6 | Tel-Aide Québec | Écoute anonyme | Tél:514-935-1101
- ID:pw7 | Emploi-Québec | Emploi / formations | Tél:1-888-643-4721
- ID:pw8 | TCRI – Réfugiés et demandeurs d'asile | Immigration / asile | Tél:514-272-6060
- ID:pw9 | Regroupement maisons femmes battues | Hébergement femmes violences | Tél:514-879-9010
- ID:pw10 | RSIQ – Hébergement itinérance | Personnes sans abri | Tél:514-933-9373

MONTRÉAL:
- ID:mtl-h1 | Maison du Père | Hébergement hommes sans-abri | Logement urgent
- ID:mtl-h2 | Welcome Hall Mission | Hébergement d'urgence hommes | Logement urgent
- ID:mtl-h3 | Old Brewery Mission | Hébergement / itinérance | Logement urgent
- ID:mtl-h4 | Chez Doris | Refuge femmes vulnérables | Logement urgent
- ID:mtl-h5 | OMHM | Logement social HLM | Logement subventionné
- ID:mtl-f1 | Moisson Montréal | Banque alimentaire | Nourriture urgent
- ID:mtl-f2 | Resto Pop | Café communautaire | Nourriture abordable
- ID:mtl-m1 | Centre de Crise Montréal | Crise psychologique 24h | Santé mentale urgent
- ID:mtl-m2 | Phare Espoir | Soutien santé mentale | Santé mentale
- ID:mtl-he1 | Médecins du Monde | Soins sans papiers / gratuits | Santé urgent
- ID:mtl-fa1 | Maison des femmes Montréal | Femmes en crise / violence | Famille urgent
- ID:mtl-im1 | CARI Saint-Laurent | Intégration immigrants | Immigration
- ID:mtl-s1 | Centraide Montréal | Références communautaires | Social

QUÉBEC (VILLE):
- ID:qc-h1 | Maison Lauberivière | Hébergement itinérance Québec | Logement urgent
- ID:qc-h2 | La Boussole | Hébergement transitoire Québec | Logement urgent
- ID:qc-f1 | Moisson Québec | Banque alimentaire Québec | Nourriture urgent
- ID:qc-m1 | Centre de Crise Québec | Crise psychologique Québec 24h | Santé mentale urgent
- ID:qc-fa1 | Maison Myosotis | Violence conjugale Québec | Famille urgent

LAVAL:
- ID:lav-h1 | Maison de Jonathan | Hébergement urgence Laval | Logement urgent
- ID:lav-f1 | Moisson Laval | Banque alimentaire Laval | Nourriture urgent
- ID:lav-m1 | Centre de Crise Laval | Crise psychologique Laval 24h | Santé mentale urgent

GATINEAU:
- ID:gat-h1 | Maison Montcalm | Hébergement hommes Gatineau | Logement urgent
- ID:gat-f1 | Moisson Outaouais | Banque alimentaire Gatineau | Nourriture urgent
- ID:gat-m1 | Centre de Crise Outaouais | Crise psychologique Gatineau 24h | Santé mentale urgent
- ID:gat-fa1 | Maison Espoir Gatineau | Violence conjugale Gatineau | Famille urgent

LONGUEUIL / MONTÉRÉGIE:
- ID:lng-h1 | Maison Marguerite | Hébergement femmes Longueuil | Logement urgent
- ID:lng-f1 | Moisson Rive-Sud | Banque alimentaire Longueuil | Nourriture urgent
- ID:lng-m1 | Centre de Crise Montérégie | Crise Longueuil 24h | Santé mentale urgent
- ID:sjr-h1 | Maison Sans-Abri St-Jean | Hébergement St-Jean-sur-Richelieu | Logement urgent

SHERBROOKE:
- ID:sher-h1 | La Chaumine | Hébergement itinérance Sherbrooke | Logement urgent
- ID:sher-f1 | Partage Saint-François | Dépannage alimentaire Sherbrooke | Nourriture urgent
- ID:sher-m1 | Centre de Crise Estrie | Crise Sherbrooke 24h | Santé mentale urgent
- ID:sher-fa1 | Maison La Montée | Violence conjugale Sherbrooke | Famille urgent

TROIS-RIVIÈRES (Mauricie):
- ID:tr-hop1 | CHAUR | Hôpital universitaire urgences 24h Trois-Rivières trauma chirurgie | Santé urgent Tél:819-697-3333
- ID:tr-ambu1 | Coopérative Ambulanciers Mauricie | Ambulance Trois-Rivières région TAP soins | Santé urgent Tél:819-374-4444
- ID:tr-h1 | Le Havre | Hébergement urgence hommes Trois-Rivières 24h | Logement urgent
- ID:tr-h2 | Mission de l'Espoir | Refuge hommes sans abri Trois-Rivières | Logement urgent
- ID:tr-h3 | Carrefour Le Mitan | Logement transitoire Trois-Rivières | Logement
- ID:tr-f1 | Moisson Mauricie/CDQ | Banque alimentaire Trois-Rivières | Nourriture urgent
- ID:tr-f2 | Saint-Vincent-de-Paul TR | Alimentation, vêtements, mobilier | Nourriture/Social
- ID:tr-m1 | Centre de Crise Mauricie | Crise Trois-Rivières 24h | Santé mentale urgent
- ID:tr-fa1 | La Séjournelle | Violence conjugale Trois-Rivières | Famille urgent
- ID:tr-health1 | CLSC Trois-Rivières CIUSSS MCQ | Soins santé, services sociaux | Santé Tél:819-370-2100
- ID:tr-emp1 | CJE Mauricie | Emploi jeunes 16-35 ans Trois-Rivières | Emploi Tél:819-375-1313
- ID:tr-emp2 | Emploi-Québec Trois-Rivières | Aide emploi, formations | Emploi Tél:1-888-643-4721
- ID:tr-fam1 | Centre-femmes Mauricie | Soutien femmes Trois-Rivières | Famille Tél:819-378-9373
- ID:tr-legal1 | Aide juridique Mauricie | Droit gratuit faible revenu TR | Juridique Tél:819-371-6711
- ID:tr-social1 | Centraide Mauricie | Référence 60+ organismes locaux | Social Tél:819-374-3676
- ID:tr-immig1 | CITIM Mauricie | Immigration, intégration TR | Immigration Tél:819-372-4655
- ID:tr-cavac | CAVAC Mauricie-CDQ | Victimes actes criminels TR | Famille urgent Tél:819-373-0318
- ID:tr-drop | Drogue Aide Référence TR | Dépendances TR/Mauricie | Santé mentale urgent

SHAWINIGAN (Mauricie):
- ID:shaw-hop1 | Hôpital Centre-de-la-Mauricie | Hôpital urgences 24h Shawinigan chirurgie obstétrique | Santé urgent Tél:819-536-7500
- ID:shaw-ambu1 | Ambulance 22-22 Shawinigan | Ambulance locale Shawinigan Grand-Mère | Santé urgent Tél:819-536-2222
- ID:shaw-caserne | Caserne pompiers Champlain Shawinigan | Incendie sauvetage Shawinigan | Social urgent
- ID:shaw-f1 | Dépannage Alimentaire Shawinigan | Aide alimentaire urgence Shawinigan | Nourriture urgent
- ID:shaw-food2 | Moisson Mauricie dist. Shawinigan | Paniers alimentaires Shawinigan | Nourriture urgent
- ID:shaw-h1 | La Chrysalide | Maison hébergement femmes violences Shawinigan 24h | Famille urgent
- ID:shaw-h2 | Hébergement La Vigile | Hébergement urgence sans abri Shawinigan | Logement urgent
- ID:shaw-health1 | CLSC Shawinigan CIUSSS MCQ | Soins santé Shawinigan | Santé Tél:819-536-7500
- ID:shaw-mh1 | Centre de Crise Mauricie (Shawinigan) | Crise 24h Shawinigan | Santé mentale urgent
- ID:shaw-emp1 | CJE Shawinigan | Emploi jeunes Shawinigan | Emploi Tél:819-537-0111
- ID:shaw-fam1 | Centre-femmes Shawinigan | Soutien femmes Shawinigan | Famille Tél:819-537-8261
- ID:shaw-social1 | Saint-Vincent-de-Paul Shawinigan | Aide matérielle Shawinigan | Social
- ID:shaw-legal1 | Aide juridique Shawinigan | Droit gratuit faible revenu Shawinigan | Juridique

DRUMMONDVILLE (Centre-du-Québec):
- ID:drum-hop1 | Hôpital Sainte-Croix | Hôpital urgences 24h Drummondville chirurgie soins intensifs | Santé urgent Tél:819-478-6464
- ID:drum-ambu1 | CAM Centre-du-Québec | Ambulance Drummondville TAP soins préhospitaliers | Santé urgent Tél:819-478-2323
- ID:drum-siuc | SIUCQ | Urgence civile évacuation sinistre Drummondville CDQ | Social urgent
- ID:drum-h1 | Maison Coup d'Éclat | Violence conjugale Drummondville 24h | Famille urgent Tél:819-477-8644
- ID:drum-h2 | Les Escales de Drummond | Logement transitoire Drummondville | Logement
- ID:drum-mh1 | Centre de Crise CDQ | Crise Drummondville 24h | Santé mentale urgent Tél:819-477-2433
- ID:drum-health1 | CLSC Drummond CIUSSS MCQ | Soins santé Drummondville | Santé Tél:819-474-2572
- ID:drum-emp1 | CJE Drummond | Emploi jeunes Drummondville | Emploi Tél:819-474-1463
- ID:drum-fam1 | Centre-femmes l'Essentielle | Soutien femmes Drummondville | Famille Tél:819-474-2381
- ID:drum-immig1 | CAID Drummondville | Immigration intégration Drummondville | Immigration Tél:819-474-0961
- ID:drum-legal1 | Aide juridique Drummondville | Droit gratuit Drummondville | Juridique Tél:819-478-0540
- ID:drum-social1 | Centraide CDQ | Référence organismes Centre-du-Québec | Social Tél:819-472-6444
- ID:drum-food2 | L'Armoire du Placard | Épicerie communautaire Drummondville | Nourriture
- ID:drum-cavac | CAVAC CDQ Drummondville | Victimes actes criminels Drummondville | Famille urgent

VICTORIAVILLE (Centre-du-Québec / Arthabaska):
- ID:vic-hop1 | Hôtel-Dieu d'Arthabaska | Hôpital urgences 24h Victoriaville trauma chirurgie oncologie | Santé urgent Tél:819-357-2030
- ID:vic-ambu1 | Ambulanciers Arthabaska-L'Érable | Ambulance Victoriaville Plessisville TAP | Santé urgent Tél:819-752-4444
- ID:vic-h1 | La Montée | Maison hébergement femmes violences Victoriaville 24h | Famille urgent Tél:819-758-6066
- ID:vic-h2 | Accueil-Gîte | Hébergement urgence Victoriaville | Logement urgent
- ID:vic-food1 | Moisson Arthabaska | Banque alimentaire Victoriaville région | Nourriture urgent Tél:819-752-7700
- ID:vic-mh1 | Centre de Crise CDQ (Victoriaville) | Crise 24h Victoriaville | Santé mentale urgent
- ID:vic-health1 | CLSC Arthabaska-L'Érable | Soins santé Victoriaville | Santé Tél:819-357-2100
- ID:vic-emp1 | CJE Arthabaska-L'Érable | Emploi jeunes Victoriaville | Emploi Tél:819-758-2088
- ID:vic-fam1 | Centre-femmes Victoriaville | Soutien femmes Victoriaville | Famille Tél:819-758-6262
- ID:vic-legal1 | Aide juridique Victoriaville | Droit gratuit Victoriaville | Juridique Tél:819-752-2231
- ID:vic-social1 | Saint-Vincent-de-Paul Victoriaville | Aide matérielle Victoriaville | Social
- ID:vic-social2 | REA Victoriaville | Entraide, visites amitié, soutien aînés | Social
- ID:vic-cavac | CAVAC CDQ Victoriaville | Victimes actes criminels Victoriaville | Famille urgent

SAGUENAY:
- ID:sag-h1 | Centre Le Havre | Hébergement Saguenay | Logement urgent
- ID:sag-f1 | Moisson Saguenay-LSJ | Banque alimentaire Saguenay | Nourriture urgent
- ID:sag-m1 | Centre de Crise Saguenay | Crise Saguenay 24h | Santé mentale urgent

SAINT-JÉRÔME (LAURENTIDES):
- ID:jer-h1 | Maison du Réconfort | Hébergement Laurentides | Logement urgent
- ID:jer-f1 | Moisson Laurentides | Banque alimentaire St-Jérôme | Nourriture urgent
- ID:jer-m1 | Centre de Crise Laurentides | Crise Laurentides 24h | Santé mentale urgent

AUTRES RÉGIONS:
- ID:rn-h1 | Maison Hébergement Rouyn-Noranda | Hébergement Abitibi | Logement urgent
- ID:rn-f1 | Moisson Abitibi-Témiscamingue | Banque alimentaire Abitibi | Nourriture urgent
- ID:vdo-h1 | La Piaule Val-d'Or | Hébergement Val-d'Or | Logement urgent
- ID:rim-h1 | Maison l'Alcôve | Hébergement femmes Rimouski | Famille urgent
- ID:si-h1 | Centre Hébergement Sept-Îles | Hébergement Côte-Nord | Logement urgent
- ID:gasp-fa1 | Maison Hébergement Gaspé | Violence conjugale Gaspésie | Famille urgent
- ID:lev-h1 | Maison Revivre Lévis | Hébergement Lévis | Logement urgent
- ID:jol-h1 | Centre Hébergement Joliette | Hébergement Lanaudière | Logement urgent

SERVICES DE GARDE — CPE & GARDERIES (province-wide):
- ID:cpe-pw1 | Mon Enfant – Liste d'attente CPE | Portail inscription CPE/garderies subventionnées (~10$/jour) | Tél:1-877-644-4545 | Site:monenfant.ca
- ID:cpe-pw2 | Ministère de la Famille – Aide financière garde | Subventions, aide urgence, crédit d'impôt frais de garde | Tél:1-877-644-4545
- ID:cpe-pw3 | Garde en milieu familial (RSG) | Réseau RSG à domicile, subventionné ~10$/jour | Site:monenfant.ca
- ID:cpe-urg1 | SOS Garde – Dépannage urgence garde | Garde d'urgence (violence conjugale, hospitalisation) | Tél:514-876-1158 | URGENT

SERVICES DE GARDE — RÉGIONS:
- ID:cpe-mtl1 | CPE Les Coccinelles | Montréal, CPE subventionné 0-5 ans ~10$/jour
- ID:cpe-mtl2 | CPE La Ruche – Rosemont | Montréal, CPE communautaire subventionné
- ID:cpe-mtl3 | Programme places à 0$ | Montréal, garderie non subventionnée avec aide financière
- ID:cpe-mtl4 | YMCA Services de garde | Montréal, avant/après-école, tarifs modulés selon revenu
- ID:cpe-qc1 | CPE Pas à Pas | Québec, CPE subventionné 0-5 ans
- ID:cpe-qc2 | Centre de la Famille Ste-Foy | Québec, CPE communautaire subventionné
- ID:cpe-lav1 | CPE Les Petits Amis | Laval, CPE subventionné
- ID:cpe-lav2 | Garderie La Petite Étoile | Laval, garderie non subventionnée (crédit d'impôt disponible)
- ID:cpe-gat1 | CPE Les Petits Poucets | Gatineau, CPE subventionné 0-5 ans
- ID:cpe-gat2 | Regroupement des CPE Outaouais | Gatineau, orientation vers CPE de la région
- ID:cpe-sher1 | CPE La Maison de Carton | Sherbrooke, CPE subventionné
- ID:cpe-tr1 | CPE Au Jardin d'Enfants | Trois-Rivières, CPE subventionné
- ID:cpe-sag1 | CPE Le Pionnier | Saguenay, CPE subventionné
- ID:cpe-lng1 | CPE Les Petits Loups | Longueuil, CPE subventionné
- ID:cpe-jer1 | CPE Les Castors | Saint-Jérôme, CPE subventionné Laurentides

ACHAT IMMOBILIER — PROGRAMMES GOUVERNEMENTAUX (province-wide):
- ID:re-pw1 | SCHL | Assurance hypothécaire fédérale, mise de fonds 5%-19,99%, guides premier acheteur | Tél:1-800-668-2642
- ID:re-pw2 | RAP – Régime accession propriété (REER) | Retrait jusqu'à 35 000$ REER sans impôt | Tél:1-800-959-8281
- ID:re-pw3 | CELIAPP | Épargne jusqu'à 40 000$ exonérée d'impôt pour première propriété | Tél:1-800-959-8281
- ID:re-pw4 | Centris.ca | Toutes les propriétés à vendre au Québec | Tél:514-762-2440
- ID:re-pw5 | DuProprio | Propriétés sans courtier, moins cher | Tél:1-866-387-7677
- ID:re-assist1 | OACIQ | Vérification courtiers certifiés, droits de l'acheteur | Tél:1-800-440-7170
- ID:re-assist2 | Chambre des notaires Québec | Notaire obligatoire pour acte de vente, 1000$-1800$ | Tél:1-800-263-1793

ACHAT IMMOBILIER — BANQUES ET FINANCEMENT (province-wide):
- ID:re-bank1 | Desjardins | Caisse québécoise, taux compétitifs, programme premiers acheteurs | Tél:1-800-224-7737
- ID:re-bank2 | Banque Nationale | Banque québécoise, solutions nouveaux arrivants | Tél:1-888-835-6281
- ID:re-bank3 | RBC Banque Royale | Programme Première Maison, mise de fonds réduite | Tél:1-800-769-2511
- ID:re-bank4 | TD Canada Trust | Approbation rapide, programme premier acheteur | Tél:1-866-222-3456
- ID:re-bank5 | BMO Banque de Montréal | Remboursement anticipé 20%, refinancement | Tél:1-877-225-5266
- ID:re-bank6 | Scotiabank | Aide aux nouveaux arrivants, programme STEP | Tél:1-800-472-6842
- ID:re-bank7 | Banque Laurentienne | Taux compétitifs, travailleurs autonomes | Tél:1-877-522-3863

ACHAT IMMOBILIER — MARCHÉS RÉGIONAUX (prix médian maison, du moins au plus cher):
- ID:re-sag1 | Saguenay | Le moins cher : 150 000$–280 000$ | Idéal budget limité
- ID:re-tr1 | Trois-Rivières | Très abordable : 200 000$–320 000$ | Bonne qualité de vie
- ID:re-rn1 | Abitibi-Témiscamingue (Rouyn-Noranda) | Abordable : 180 000$–300 000$ | Fort marché emploi
- ID:re-sher1 | Sherbrooke | Abordable : 250 000$–380 000$ | Ville universitaire
- ID:re-qc1 | Québec (ville) | Modéré : 280 000$–500 000$ | Qualité de vie élevée
- ID:re-gat1 | Gatineau | Modéré : 300 000$–480 000$ | Emplois fédéraux, proximité Ottawa
- ID:re-lng1 | Longueuil / Rive-Sud | Modéré : 380 000$–600 000$ | Accès métro Montréal
- ID:re-lav1 | Laval | Modéré à élevé : 450 000$–700 000$ | Métro Orange, île entre deux villes
- ID:re-mtl1 | Montréal | Le plus cher : 350 000$–1 100 000$+ | Quartiers abordables : Montréal-Nord, RDP (200K-450K)

PROCÉDURE D'ACHAT IMMOBILIER AU QUÉBEC (à expliquer si demandé):
1. PRÉQUALIFICATION : Contactez une banque ou Desjardins pour connaître votre capacité d'emprunt
2. ÉPARGNE MISE DE FONDS : Minimum 5% du prix si <500K$, 10% pour tranche 500K$-999K$. Utilisez RAP ou CELIAPP
3. RECHERCHE : Centris.ca (avec courtier) ou DuProprio (sans courtier)
4. OFFRE D'ACHAT : Votre courtier ou vous-même rédigez une offre avec conditions (financement, inspection)
5. INSPECTION PRÉ-ACHAT : Obligatoire — inspecteur en bâtiment certifié (~500$-800$)
6. FINANCEMENT FINAL : La banque confirme l'hypothèque. SCHL si mise de fonds <20%
7. NOTAIRE : Acte de vente chez le notaire (~1000$-1800$). Transfert de propriété officiel
8. REMISE DES CLÉS : Prise de possession à la date convenue
`.trim();

const EMERGENCY_CATALOG = `
SERVICES D'URGENCE DE PREMIÈRE LIGNE — QUÉBEC:

CENTRES 911 (dispatch temps réel):
- 911 Montréal | Centre dispatch Île de Montréal | Tél:911
- 911 Québec | Centre dispatch Ville de Québec | Tél:911
- 911 Laval | Centre dispatch Laval | Tél:911
- 911 Longueuil | Centre dispatch agglomération Longueuil | Tél:911
- 911 Gatineau–Outaouais | Centre dispatch Outaouais | Tél:911
- 911 Sherbrooke–Estrie | Centre dispatch Estrie | Tél:911
- 911 Saguenay–Lac-Saint-Jean | Centre dispatch Saguenay | Tél:911
- 911 Trois-Rivières–Mauricie | Centre dispatch Mauricie | Tél:911
- 911 Lévis–Chaudière-Appalaches | Centre dispatch Rive-Sud | Tél:911
- 911 Lanaudière | Centre dispatch Lanaudière | Tél:911
- 911 Laurentides | Centre dispatch Laurentides | Tél:911
- 911 Montérégie | Centre dispatch Montérégie | Tél:911
- 911 Centre-du-Québec | Centre dispatch Centre-du-Québec | Tél:911
- 911 Abitibi–Témiscamingue | Centre dispatch Abitibi | Tél:911
- 911 Bas-Saint-Laurent | Centre dispatch Bas-Saint-Laurent | Tél:911
- 911 Gaspésie–Îles-de-la-Madeleine | Centre dispatch Gaspésie | Tél:911
- 911 Côte-Nord | Centre dispatch Côte-Nord | Tél:911
- 911 Nord-du-Québec | Centre dispatch Nord-du-Québec | Tél:911
- 911 Nunavik | Centre dispatch Nunavik (évacuations aériennes) | Tél:911

POLICE:
- Sûreté du Québec (SQ) | Police provinciale — couvre toutes les municipalités sans service municipal | Tél:1-800-461-2131 / 911
- SPVM | Service de police Montréal | Tél:514-280-2222 / 911
- SPQ | Service de police Québec | Tél:418-641-6411 / 911
- SPL | Service de police Laval | Tél:450-662-4636 / 911
- SPAL | Police agglomération Longueuil | Tél:450-463-7211 / 911
- SPG | Police Gatineau | Tél:819-246-0222 / 911
- SPS | Police Sherbrooke | Tél:819-821-8000 / 911
- SPS | Police Saguenay | Tél:418-545-5778 / 911
- SPTR | Police Trois-Rivières | Tél:819-691-2929 / 911
- GRC Québec | Police fédérale, crimes organisés | Tél:514-939-8300 / 911

INCENDIE (pompiers):
- SIM | Service incendie Montréal — 66 casernes | Tél:514-872-3800 / 911
- Service incendie Québec | Tél:418-641-6800 / 911
- SSIL | Service incendie Laval | Tél:450-662-4900 / 911
- Service incendie Longueuil | Tél:450-646-8800 / 911
- SIG | Service incendie Gatineau | Tél:819-595-7777 / 911
- Service incendie Sherbrooke | Tél:819-821-5600 / 911
- Service incendie Saguenay | Tél:418-698-3000 / 911
- Service incendie Trois-Rivières | Tél:819-379-4600 / 911
- Service incendie Lévis | Tél:418-833-7777 / 911
⚠️ Plus de 700 services incendie municipaux au Québec — pour toute urgence incendie : 911

AMBULANCE / SOINS PRÉHOSPITALIERS:
- Urgences-santé | Montréal et Laval | Tél:514-842-4242 / 911
- CETAM | Montérégie | Tél:450-677-4411 / 911
- Services préhospitaliers Québec | Capitale-Nationale | Tél:418-529-4141 / 911
- Services ambulanciers Estrie | Tél:819-562-9341 / 911
- Services ambulanciers Mauricie–Centre-du-Québec | Tél:819-697-3333 / 911
- Services ambulanciers Outaouais | Tél:819-771-7444 / 911
- Services ambulanciers Saguenay–Lac-Saint-Jean | Tél:418-541-1000 / 911
- Services ambulanciers Laurentides | Tél:450-569-3311 / 911
- Services ambulanciers Lanaudière | Tél:450-759-8222 / 911
- Services ambulanciers Abitibi–Témiscamingue | Tél:819-764-5131 / 911
- Services ambulanciers Bas-Saint-Laurent | Tél:418-724-5231 / 911
- Services ambulanciers Côte-Nord | Tél:418-962-8811 / 911
- Services ambulanciers Chaudière-Appalaches | Tél:418-380-8996 / 911
⚠️ 773 des 1 112 municipalités du Québec n'ont pas de premiers répondants — délais possibles en zone rurale

DISTANCES ENTRE LES 4 VILLES PRIORITAIRES (Mauricie / Centre-du-Québec):
- Trois-Rivières → Shawinigan : ~30 km (autoroute 55, ~25 min)
- Trois-Rivières → Drummondville : ~70 km (autoroute 55, ~50 min)
- Trois-Rivières → Victoriaville : ~95 km (autoroute 55, ~1h05)
- Drummondville → Victoriaville : ~60 km (autoroute 55, ~45 min)
⚠️ HÔPITAUX SPÉCIALISÉS: Si patient doit être transféré depuis Shawinigan → CHAUR Trois-Rivières (trauma, cardiologie, neurologie) = 30 km. Depuis Victoriaville → CHAUR ou CHU de Québec selon la spécialité.
💡 Si personne à Shawinigan demande ambulance: Ambulance 22-22 (819-536-2222), urgences à l'Hôpital Centre-de-la-Mauricie.
💡 Si personne à Drummondville demande ambulance: CAM CDQ (819-478-2323), urgences à l'Hôpital Sainte-Croix.
💡 Si personne à Victoriaville demande ambulance: Services ambulanciers Arthabaska (819-752-4444), urgences à l'Hôtel-Dieu d'Arthabaska.

DÉPENDANCES ET LIGNES DE CRISE SPÉCIALISÉES:
- Drogue : aide et référence | Dépendances drogue/alcool 24h | Tél:1-800-265-2626
- Jeu : aide et référence | Jeu compulsif 24h | Tél:1-800-461-0140
- AA Québec | Alcooliques Anonymes | Tél:514-376-9230
- NA Québec | Narcotiques Anonymes | Tél:514-249-0555
- RQCALACS | Agressions sexuelles | Tél:1-888-933-9007
- Ligne Aide Abus Aînés | Maltraitance aînés | Tél:1-888-489-2287
- SOS Grossesse | Grossesse en crise 24h | Tél:1-800-463-5655
- Tel-Jeunes | Jeunes 12-25 ans 24h | Tél:1-800-263-2266
- Jeunesse j'écoute | Jeunes Canadiens 24h | Tél:1-800-668-6868
- Traite des personnes | Ligne nationale | Tél:1-833-900-1010
- Info-Crime Québec | Signalement anonyme | Tél:1-800-711-1800
- Croix-Rouge canadienne | Sinistres / catastrophes | Tél:1-800-418-1111
- Sécurité civile Québec | Sinistrés, indemnisation | Tél:1-800-363-1363
`.trim();

function getQuebecTimeContext(): string {
  const now = new Date();
  const quebecTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Montreal" }));
  const hour = quebecTime.getHours();
  const month = quebecTime.getMonth() + 1;
  const dayOfWeek = quebecTime.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayName = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][dayOfWeek];

  const risks: string[] = [];

  if (hour >= 22 || hour < 6) {
    risks.push("NUIT (22h–6h) : risques accrus de violence, intoxication, accidents de la route, hypothermie");
  }
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
    risks.push("HEURE DE POINTE : risques élevés d'accidents de la route et de surcharge des services d'urgence");
  }
  if (isWeekend && hour >= 20) {
    risks.push("SOIRÉE DE FIN DE SEMAINE : risques accrus d'intoxication à l'alcool/drogues, violences, accidents");
  }
  if (month >= 12 || month <= 2) {
    risks.push("HIVER : risques d'hypothermie pour personnes sans abri, verglas, accidents de la route, chutes");
  }
  if (month === 3 || month === 4) {
    risks.push("DÉGEL PRINTANIER : risques d'inondations, glaces instables, crues subites en région");
  }
  if (month >= 6 && month <= 8) {
    risks.push("ÉTÉ : coups de chaleur, noyades, accidents vélos/motos, incendies de forêt possible en région");
  }

  return `
CONTEXTE TEMPOREL ACTUEL (Québec):
- Heure locale : ${quebecTime.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })} (${dayName})
- Mois : ${quebecTime.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })}
${risks.length > 0 ? `- Alertes de risques actives :\n  • ${risks.join("\n  • ")}` : "- Pas d'alerte de risque particulière pour ce moment"}
`.trim();
}

function buildSystemPrompt(language: string): string {
  const isEn = language === "en";
  const isEs = language === "es";
  const isAr = language === "ar";
  const isHt = language === "ht";

  let langInstruction = "";
  if (isEn) {
    langInstruction =
      "Respond in English. The user may not speak French well. Be welcoming and clear.";
  } else if (isEs) {
    langInstruction =
      "Respond in Spanish (español). The user is likely a Spanish-speaking immigrant. Be welcoming and clear.";
  } else if (isAr) {
    langInstruction =
      "Respond in Arabic (العربية). The user is likely an Arabic-speaking immigrant. Be welcoming and clear.";
  } else if (isHt) {
    langInstruction =
      "Respond in Haitian Creole (Kreyòl ayisyen). The user is likely a Haitian Creole speaker. Be welcoming and clear.";
  } else {
    langInstruction =
      "Respond in French. The user is in Quebec. Be welcoming and clear.";
  }

  const timeContext = getQuebecTimeContext();

  return `You are AttenteZéro — a compassionate AI guide and emergency coordinator helping vulnerable people in Quebec find community, social, and emergency services.

${langInstruction}

Your role:
- Listen carefully to the person's situation with empathy
- Identify their needs: housing, food, mental health, health, immigration, employment, family, social support, childcare, emergency
- Recommend the most relevant services — including emergency services when appropriate
- Be warm, non-judgmental, trauma-informed, and concise
- Use the time context below to anticipate risks and give proactive safety advice

${timeContext}

INTELLIGENCE PRÉDICTIVE — utilise le contexte temporel pour:
- Mentionner les risques saisonniers ou horaires pertinents si la situation l'exige
- Prioriser les ressources d'hébergement d'urgence la nuit en hiver
- Avertir des risques d'hypothermie pour les personnes sans abri par temps froid
- Alerter sur les risques d'intoxication en soirée de fin de semaine
- Signaler les risques d'inondations au printemps pour les zones à risque
- Recommander de l'eau et de l'ombre en période de canicule

CENTRALISATION DES SERVICES D'URGENCE — pour toute urgence, TOUJOURS mentionner:
1. Composez le 911 en PREMIER (police + pompiers + ambulance via dispatch centralisé)
2. Le 911 coordonne automatiquement les services disponibles dans la région
3. Préciser que 773 des 1 112 municipalités n'ont pas de premiers répondants — délais possibles

CRITICAL SITUATIONS — respond to these with the highest priority:
- Suicide, self-harm, wanting to die: START with 911 + Suicide Action (1-866-APPELLE). They are not alone.
- Domestic violence, assault, immediate danger: START with 911 + SOS Violence conjugale (1-800-363-9010).
- Child in danger: START with 911 + DPJ (1-800-463-9019).
- Fire / building emergency: START with 911 + local fire service.
- Medical emergency: START with 911 + Urgences-santé or regional ambulance.
- Drug overdose: START with 911 + Drogue : aide et référence (1-800-265-2626).
- Elder abuse: START with Aide Abus Aînés (1-888-489-2287) + 911 if immediate danger.
- For any urgent/crisis: be brief, direct, reassuring. Do NOT overwhelm.

PROFESSIONAL REFERRALS — proactively recommend:
- Mental health / addiction: psychologist, travailleur social, pw5, crisis centres.
- Family conflict or violence: social worker, family mediator.
- Immigration complex situations: legal consultant or lawyer.
- Chronic health: doctor or community health clinic.

When recommending services, include their IDs in this exact format at the END of your message:
[SERVICES: id1, id2, id3]

Only include service IDs from the catalogs below. For urgent situations, prefer services marked "urgent". Match the city/region when known.

EMERGENCY SERVICES CATALOG:
${EMERGENCY_CATALOG}

COMMUNITY SERVICES CATALOG:
${SERVICES_CATALOG}

Guidelines:
- Keep responses under 200 words
- Always end with the [SERVICES: ...] tag if recommending any services
- If unsure about region, recommend province-wide services (pw1–pw10)
- For emergency queries, always start with 911 instruction
- Never make up service IDs — only use IDs from the catalogs above
- Never be dismissive — every situation deserves a caring, actionable response
- For mental health and crisis topics: validate feelings first, then provide resources`;
}

router.post("/ai/chat", async (req, res) => {
  const { message, language = "fr", history = [] } = req.body as {
    message: string;
    language?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // ── Quota check (free users: 5/day, premium: unlimited) ──────
  const { isPremium, userId } = await getUserPremiumStatus(req);
  if (!isPremium) {
    const key = clientKey(req, userId);
    const q = bumpQuota(key);
    if (q.count > q.limit) {
      res.status(429).json({
        error: language === "en"
          ? `Daily free limit reached (${q.limit} messages/day). Upgrade to Premium for unlimited AI chat.`
          : `Limite quotidienne atteinte (${q.limit} messages/jour). Passez à Premium pour un usage illimité.`,
        quotaExceeded: true,
        limit: q.limit,
        upgradeUrl: "/premium",
      });
      return;
    }
    // Inform client of remaining quota via headers
    res.setHeader("X-AI-Quota-Limit", String(q.limit));
    res.setHeader("X-AI-Quota-Remaining", String(q.remaining));
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const messages: { role: "system" | "user" | "assistant"; content: string }[] =
      [
        { role: "system", content: buildSystemPrompt(language) },
        ...history.slice(-6).map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user", content: message },
      ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages,
      stream: true,
    });

    let fullResponse = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    const serviceMatch = fullResponse.match(/\[SERVICES:\s*([^\]]+)\]/);
    const serviceIds = serviceMatch
      ? serviceMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/^ID:/i, ""))
          .filter(Boolean)
      : [];

    res.write(
      `data: ${JSON.stringify({ done: true, serviceIds })}\n\n`
    );
    res.end();
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "AI chat error");
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

export default router;
