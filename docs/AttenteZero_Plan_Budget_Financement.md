# AttenteZéro
## Plan d'affaires, budget et demande de financement

**Plateforme mobile et web d'orientation rapide vers les services communautaires du Québec**

---

## 1. Mise en contexte et besoins ressentis

### 1.1 Le constat sur le terrain

Au Québec, des milliers de personnes en situation de vulnérabilité — sans-abri, victimes de violence conjugale, jeunes en détresse, aînés isolés, nouveaux arrivants, personnes en crise de santé mentale — peinent quotidiennement à accéder rapidement aux services communautaires dont elles ont un besoin urgent.

Les obstacles récurrents identifiés :

- **Délais d'attente trop longs** : appels au 211 ou aux organismes saturés, transferts multiples, files d'attente de plusieurs jours pour un premier rendez-vous
- **Méconnaissance de l'offre locale** : 80 % des riveraines et riverains ignorent l'existence des organismes situés à moins de 2 km de chez eux
- **Barrière linguistique** : les personnes allophones (arabophones, hispanophones, créolophones, anglophones) reçoivent une orientation moins efficace
- **Fracture numérique des intervenants terrain** : les travailleurs sociaux et intervenants de proximité utilisent encore des feuilles Excel ou des classeurs papier pour suivre leurs dossiers
- **Cloisonnement institutionnel** : les CIUSSS, CLSC, refuges et organismes communautaires ne partagent pas un référentiel commun de leurs clients partagés
- **Absence d'outils en mobilité** : un intervenant en travail de rue n'a aucun moyen rapide de trouver, en temps réel et près de sa position GPS, le service le plus pertinent à orienter pour son usager

### 1.2 Notre positionnement par rapport au 211 Québec

**AttenteZéro ne remplace en aucun cas le 211 Québec.** Le 211 demeure le service de référence officiel et reconnu pour l'information et l'orientation vers les ressources communautaires de la province.

AttenteZéro vient en **complément du 211** et répond à un besoin distinct :

| 211 Québec | AttenteZéro |
|---|---|
| Service téléphonique avec intervenant humain | Application mobile et web instantanée, 24/7 |
| Réponse en 2 à 15 minutes selon achalandage | Réponse en moins de 5 secondes |
| Couverture provinciale uniforme | Géolocalisation hyper-locale (rayon 1 à 50 km) |
| Référence générale | Filtrage par profil (LGBTQ+, autochtone, jeunes, aînés, etc.) |
| Orientation vers un service | Outils de gestion pour les organismes et intervenants |

L'objectif d'AttenteZéro est de **réduire la pression sur le 211** en absorbant la demande des usagers qui cherchent une réponse rapide géolocalisée, et de **donner aux intervenants terrain un outil de mobilité** qui leur manque actuellement.

---

## 2. Présentation de la plateforme

### 2.1 Architecture

AttenteZéro est une plateforme à trois composantes interconnectées :

1. **Application mobile** (Android et iOS) destinée aux citoyens et aux intervenants terrain
2. **Panneau web administratif** pour les organismes et les institutions
3. **Serveur d'API centralisé** hébergé en infrastructure infonuagique sécurisée

### 2.2 Fonctionnalités complètes

#### Pour les citoyens (gratuit)

- **Recherche géolocalisée** parmi 531 services communautaires du Québec actuellement répertoriés
- **Filtrage par catégorie** : santé mentale, hébergement d'urgence, violence conjugale, alimentation, jeunesse, aînés, dépendances, immigration, etc.
- **Détection automatique de crise** par intelligence artificielle : si l'utilisateur exprime une détresse aiguë, l'application affiche immédiatement les ressources d'urgence (Centre de prévention du suicide, Info-Santé 811, 911, SOS violence conjugale)
- **Multilinguisme natif** : français, anglais, espagnol, arabe, créole haïtien
- **Itinéraires** vers les services avec estimation des délais
- **Fiches détaillées** : horaires, langues parlées, critères d'admissibilité, contacts
- **Mode hors ligne** pour les zones à connectivité faible

#### Pour les utilisateurs Premium (10 $ une seule fois)

- **Chat intelligent par IA** pour reformuler ses besoins en langage naturel et recevoir des recommandations personnalisées
- **Transcription vocale** pour les personnes qui préfèrent parler plutôt qu'écrire
- **Liste de favoris** pour retrouver rapidement ses ressources de référence
- **Historique des consultations**

#### Pour les intervenants terrain (Forfait Terrain — 19 $/mois)

- Tous les avantages Premium
- **Carnet de clients** personnel pour suivre les personnes accompagnées en mobilité
- **Notes de suivi** géolocalisées
- **Rappels** de rendez-vous
- **Génération de rapports PDF** pour les bilans

#### Pour les organismes communautaires (Forfait Organisme — 39 $/mois)

- Jusqu'à **3 sièges** d'intervenants partagés
- **Carnet de clients partagé** au sein de l'équipe
- **Tableau de bord** des dossiers actifs
- **Statistiques d'utilisation**
- **Référencement amélioré** dans les résultats de recherche
- Essai gratuit de **14 jours**

#### Pour les institutions (CIUSSS, CLSC, grands refuges — 199 $/mois)

- Jusqu'à **15 sièges** d'intervenants
- **Dossier client unifié** partagé entre toutes les équipes de l'institution
- **Tableau de bord institutionnel** avec métriques agrégées
- **Intégration API** vers les systèmes existants
- **Conformité aux normes de protection des renseignements personnels** (Loi 25)
- **Support prioritaire**
- Essai gratuit de **14 jours**

### 2.3 Sécurité et conformité

- Authentification renforcée (chiffrement des jetons d'accès, stockage sécurisé)
- Limitation du débit sur les points sensibles (anti-abus IA et transcription vocale)
- Hébergement des données au Canada
- Conformité **Loi 25** (protection des renseignements personnels au Québec)
- Aucune revente de données aux tiers
- Audits de sécurité périodiques

---

## 3. Zones actuellement desservies

L'application est opérationnelle sur **l'ensemble du territoire québécois** avec une base de **531 services** déjà référencés et géolocalisés. Toutefois, la densité du référencement varie selon les régions.

### 3.1 Zones à couverture forte (densité élevée de services référencés)

- **Montréal** (toutes les régions sociosanitaires : Centre-Ouest, Centre-Sud, Nord, Est, Ouest)
- **Laval**
- **Longueuil et la Rive-Sud**
- **Ville de Québec**
- **Gatineau**
- **Sherbrooke**

### 3.2 Zones à couverture moyenne (en consolidation)

- **Trois-Rivières et la Mauricie**
- **Saguenay – Lac-Saint-Jean**
- **Drummondville et le Centre-du-Québec**
- **Lévis et la Chaudière-Appalaches**

### 3.3 Zones à couverture initiale (à approfondir en 2026)

- Bas-Saint-Laurent
- Côte-Nord
- Abitibi-Témiscamingue
- Gaspésie–Îles-de-la-Madeleine
- Nord-du-Québec et Eeyou Istchee Baie-James

---

## 4. Plan de déploiement et zones futures

### 4.1 Phase 1 — Consolidation (T1 et T2 2026)

- Référencement exhaustif des **15 régions sociosanitaires** du Québec
- Atteinte de **2 000 services référencés** (multiplication par 4 du référentiel actuel)
- Partenariats formels avec **5 CIUSSS** pilotes
- Lancement officiel sur Google Play et l'App Store

### 4.2 Phase 2 — Expansion régionale (T3 et T4 2026)

Déploiement intensifié dans les régions suivantes, identifiées comme sous-desservies en outils numériques d'orientation :

- **Côte-Nord** (Sept-Îles, Baie-Comeau, Havre-Saint-Pierre)
- **Gaspésie–Îles-de-la-Madeleine**
- **Abitibi-Témiscamingue** (Rouyn-Noranda, Val-d'Or, Amos)
- **Nord-du-Québec** avec un volet adapté aux **communautés autochtones cries et inuites** (interface en langues autochtones, partenariats avec les organismes des Premières Nations)
- **Bas-Saint-Laurent** (Rimouski, Rivière-du-Loup)
- **Mauricie hors-Trois-Rivières**

### 4.3 Phase 3 — Spécialisation et adaptation (2027)

- **Module autochtone** dédié (langues, services culturellement adaptés, partenariats avec les conseils de bande)
- **Module rural et éloigné** avec navigation hors-ligne renforcée
- **Module aînés** avec interface accessible (gros caractères, voix, simplicité maximale)
- **Module jeunesse** avec ton et ergonomie adaptés aux 12-17 ans

---

## 5. Modèle économique

### 5.1 Sources de revenus

| Source | Tarif | Cible | Volume estimé an 1 |
|---|---|---|---|
| Citoyens — gratuit | 0 $ | Grand public | 50 000 utilisateurs |
| Premium individuel | 10 $ une seule fois | Citoyens engagés | 5 000 conversions |
| Forfait Terrain | 19 $/mois | Intervenants indépendants | 300 abonnés |
| Forfait Organisme | 39 $/mois | OBNL et organismes communautaires | 150 abonnés |
| Forfait Institution | 199 $/mois | CIUSSS, CLSC, grands refuges | 25 abonnés |
| Subventions | Variable | Programmes gouvernementaux et fondations | — |

### 5.2 Revenus projetés (an 1)

- Premium individuel : 5 000 × 10 $ = **50 000 $**
- Forfait Terrain : 300 × 19 $ × 12 = **68 400 $**
- Forfait Organisme : 150 × 39 $ × 12 = **70 200 $**
- Forfait Institution : 25 × 199 $ × 12 = **59 700 $**

**Total revenus récurrents projetés an 1 : 248 300 $**

---

## 6. Budget prévisionnel

### 6.1 Budget de fonctionnement annuel (an 1)

| Poste | Montant annuel |
|---|---|
| **Développement et maintenance** | |
| Salaires équipe technique (2 développeurs à temps partiel) | 90 000 $ |
| Hébergement infonuagique sécurisé (Replit, base de données, stockage) | 6 000 $ |
| Services d'intelligence artificielle (OpenAI, transcription) | 12 000 $ |
| Frais de plateformes (Google Play, App Store, Stripe) | 4 500 $ |
| **Référencement de services** | |
| Recherche et validation de 1 500 nouveaux services (3 agents à temps partiel) | 45 000 $ |
| Vérifications terrain et appels téléphoniques | 8 000 $ |
| **Marketing et communication** | |
| Campagnes ciblées sur les réseaux sociaux (FB, Instagram, TikTok) | 15 000 $ |
| Affichage dans les CLSC, organismes, métros | 10 000 $ |
| Présence à 6 événements communautaires majeurs | 6 000 $ |
| Production de capsules vidéo en 5 langues | 8 000 $ |
| **Partenariats et déploiement** | |
| Visites et formations dans 5 CIUSSS pilotes | 12 000 $ |
| Voyages dans les régions éloignées (Nord-du-Québec, Côte-Nord, Gaspésie) | 18 000 $ |
| **Frais administratifs** | |
| Coordination de projet | 35 000 $ |
| Comptabilité et frais légaux | 8 000 $ |
| Assurances responsabilité | 3 500 $ |
| **Réserve de contingence (5 %)** | 14 000 $ |

**TOTAL BUDGET DE FONCTIONNEMENT AN 1 : 295 000 $**

### 6.2 Budget d'investissement initial

| Poste | Montant |
|---|---|
| Audit de sécurité et certification Loi 25 | 12 000 $ |
| Refonte ergonomique pour accessibilité (normes WCAG 2.1) | 18 000 $ |
| Traduction et adaptation linguistique (5 langues + langues autochtones) | 22 000 $ |
| Intégration API avec 3 systèmes hospitaliers pilotes | 35 000 $ |
| Études d'impact et évaluations terrain | 15 000 $ |

**TOTAL INVESTISSEMENT INITIAL : 102 000 $**

### 6.3 Bilan financier an 1

| | Montant |
|---|---|
| Total dépenses (fonctionnement + investissement) | 397 000 $ |
| Revenus récurrents projetés | 248 300 $ |
| **Écart à combler par financement** | **148 700 $** |

---

## 7. Demande de financement pour l'élargissement

### 7.1 Montant demandé

**150 000 $** sur 12 mois pour l'élargissement provincial de la plateforme.

### 7.2 Utilisation détaillée du financement demandé

| Volet | Montant | Description |
|---|---|---|
| **Référencement régional intensif** | 45 000 $ | Embauche de 3 agents pour cataloguer 1 500 services additionnels dans les régions sous-desservies (Côte-Nord, Gaspésie, Abitibi, Bas-Saint-Laurent, Nord-du-Québec) |
| **Adaptation autochtone** | 25 000 $ | Traduction en langues autochtones (cri, innu, inuktitut), partenariats avec les conseils de bande, adaptation culturelle |
| **Déploiement régional** | 18 000 $ | Voyages, formations et installations dans 8 régions hors centres urbains |
| **Marketing ciblé bilingue** | 25 000 $ | Campagnes adaptées aux populations vulnérables et allophones |
| **Renforcement de la sécurité** | 12 000 $ | Audit Loi 25, certification, infrastructure sécurisée additionnelle |
| **Accessibilité universelle** | 15 000 $ | Conformité WCAG 2.1, version aînés, version jeunesse |
| **Coordination du projet d'expansion** | 10 000 $ | Salaire d'une personne coordonnatrice à temps partiel sur 12 mois |

### 7.3 Bailleurs de fonds visés

- **Secrétariat à la jeunesse du Québec** (volet jeunesse en détresse)
- **Ministère de la Santé et des Services sociaux du Québec** (innovation en services sociaux)
- **Ministère de l'Immigration, de la Francisation et de l'Intégration** (soutien aux nouveaux arrivants)
- **Secrétariat aux affaires autochtones** (volet autochtone)
- **Centraide du Grand Montréal** et **Centraide Québec et Chaudière-Appalaches**
- **Fondation Lucie et André Chagnon** (lutte contre la pauvreté)
- **Fondation McConnell** (innovation sociale)
- **Patrimoine canadien** (volet langues officielles)

---

## 8. Indicateurs de succès et impact mesurable

### 8.1 Indicateurs quantitatifs an 1

- **50 000 téléchargements** de l'application mobile
- **2 000 services** géolocalisés et vérifiés
- **150 organismes** abonnés à un forfait B2B
- **5 CIUSSS** partenaires officiels
- **15 régions sociosanitaires** couvertes avec un référentiel actif
- **25 000 orientations** réussies vers un service approprié

### 8.2 Indicateurs qualitatifs

- **Réduction du délai moyen** d'orientation de 15 minutes à moins de 5 secondes pour les requêtes simples
- **Diminution de la pression** sur la ligne 211 pour les demandes hyper-locales
- **Témoignages** d'intervenants terrain documentés (vidéos, études de cas)
- **Taux de satisfaction** des organismes partenaires supérieur à 80 %

### 8.3 Reddition de comptes

- Rapport trimestriel envoyé aux bailleurs de fonds
- Rapport annuel public d'impact
- Tableau de bord en temps réel accessible aux partenaires institutionnels
- Audits financiers et d'impact indépendants

---

## 9. Pourquoi soutenir AttenteZéro

- **Une réponse rapide à un besoin réel** : les Québécoises et Québécois en détresse n'ont pas le temps d'attendre
- **Un complément, pas un concurrent** : AttenteZéro renforce l'écosystème existant (211, CLSC, organismes) sans le remplacer
- **Une portée provinciale** avec une attention particulière aux régions éloignées et aux communautés autochtones
- **Un modèle économique hybride** qui combine revenus autonomes et financement public, gage de pérennité
- **Une équipe engagée** qui connaît le terrain communautaire québécois
- **Une technologie déjà déployée et opérationnelle**, pas un projet sur papier

---

## 10. Conclusion

AttenteZéro est une plateforme qui existe déjà, qui fonctionne et qui sert ses premiers utilisateurs. Le financement demandé permettra de franchir un palier décisif : passer d'une couverture urbaine forte à une **présence provinciale équilibrée**, en touchant les populations les plus vulnérables, là où elles vivent, dans la langue qu'elles parlent et au moment où elles en ont besoin.

Aucune personne en détresse ne devrait avoir à attendre. C'est le sens même du nom **AttenteZéro**.

---

*Document préparé en avril 2026.*
*Pour toute question : attentezero5@gmail.com*
