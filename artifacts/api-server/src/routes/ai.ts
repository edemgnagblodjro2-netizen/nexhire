import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

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

TROIS-RIVIÈRES:
- ID:tr-h1 | Le Havre | Hébergement urgence Trois-Rivières | Logement urgent
- ID:tr-f1 | Moisson Mauricie | Banque alimentaire Trois-Rivières | Nourriture urgent
- ID:tr-m1 | Centre de Crise Mauricie | Crise Trois-Rivières 24h | Santé mentale urgent
- ID:tr-fa1 | La Séjournelle | Violence conjugale Trois-Rivières | Famille urgent

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

  return `You are AIDORA — a compassionate AI assistant helping vulnerable people in Quebec find community and social services.

${langInstruction}

Your role:
- Listen carefully to the person's situation
- Identify their main needs (housing, food, mental health, health, immigration, employment, family, social support, childcare/CPE/garderie)
- Recommend the most relevant services from the catalog below
- Be warm, non-judgmental, and concise
- If the situation is urgent or involves safety risks, always mention 911 first, then other services

When recommending services, include their IDs in this exact format at the END of your message:
[SERVICES: id1, id2, id3]

Only include service IDs that are truly relevant to the person's needs. For urgent situations, prefer services marked "urgent". Match the city/region when known.

SERVICES CATALOG:
${SERVICES_CATALOG}

Guidelines:
- Keep responses under 150 words
- Always end with the [SERVICES: ...] tag if recommending any services
- If unsure about region, recommend province-wide services
- Never make up service IDs — only use IDs from the catalog above
- Be sensitive with topics like mental health, violence, and immigration`;
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
      model: "gpt-5-mini",
      max_completion_tokens: 8192,
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
          .map((s) => s.trim())
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
