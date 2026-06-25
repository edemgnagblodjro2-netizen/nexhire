# PRD — Parcours IA PME
## Plateforme d'évaluation, de gouvernance et d'accompagnement de la transformation IA

**Version :** 0.3 — VALIDÉ · Prêt pour S2  
**Date :** 2026-06-25  
**Changements v0.3 :** décisions S2 verrouillées · Atlas (ex-Atlas) · email fin de parcours · suivi longitudinal → Phase 2 · pondérations révisées · AgentHub Workspace architecture

### Décisions validées (v0.3)
| Décision | Statut |
|----------|--------|
| Score /100 | ✅ Confirmé |
| Benchmark avec données démo | ✅ Confirmé |
| Suivi longitudinal | ⏭️ Phase 2 |
| Secteurs — liste fermée + "Autre" | ✅ Confirmé |
| Email demandé en fin de parcours | ✅ Confirmé |
| Nom de l'agent | ✅ **Atlas** |
| Architecture | ✅ **AgentHub Workspace** — module diagnostique = première app |
| Pondérations | ✅ Révisées (voir section 6) |

---

## 1. Vision du produit

**Problème**
Les PME veulent adopter l'IA mais ne savent pas par où commencer, quels outils choisir, comment mesurer leur progression ni comment mettre en place une gouvernance. Les organisations territoriales (chambres de commerce, ODE, regroupements sectoriels) n'ont aucune visibilité sur la maturité numérique réelle de leurs membres.

**Solution**
Un parcours guidé — l'**Indice de Maturité IA (IMAI)** — qui s'adapte au profil de l'entreprise, compare ses résultats à ses pairs, suit son évolution dans le temps et lui propose un plan d'action personnalisé. L'organisation partenaire dispose d'un Observatoire territorial avec des données agrégées actionnables.

**Positionnement**
> « Pas un formulaire. Pas un chatbot générique. Un parcours de transformation IA qui s'adapte à votre réalité, vous compare à vos pairs et mesure vos progrès dans le temps. »

**Nom programme pilote :** Parcours IA PME — CCI3R  
**Moteur :** AgentHub / CivicAI  
**Nom de l'agent :** **Atlas**

---

## 2. Utilisateurs cibles

### Persona 1 — Le dirigeant de PME
- DG, président, responsable opérations — 10 à 200 employés
- Secteurs : manufacturier, services professionnels, construction, commerce
- Motivations : compétitivité, réduction de coûts, ne pas manquer la vague IA
- Freins : manque de temps, peur du risque, ne sait pas par où commencer

### Persona 2 — L'administrateur partenaire (CCI3R)
- DG, directeur des services aux membres
- Motivations : valoriser l'adhésion, créer des programmes différenciants, mesurer l'impact territorial
- Besoin : vision agrégée, données pour orienter formations et événements

### Persona 3 — L'expert partenaire *(phase 2)*
- Consultant IA, intégrateur Microsoft, formateur, cabinet RH
- Besoin : visibilité auprès de PME ayant un besoin identifié et qualifié

---

## 3. Parcours utilisateur

### 3.1 Parcours PME — Vue complète

```
Invitation CCI3R (email / URL / QR code)
          ↓
Atlas — Introduction conversationnelle (2 min)
  · Recueille : nom entreprise, secteur, taille, défi prioritaire
  · Adapte le ton et les questions suivantes
          ↓
Questions adaptatives — 10 à 15 questions selon profil (8 min)
  · Tronc commun : 10 questions
  · Branches conditionnelles : 0 à 5 questions supplémentaires
          ↓
Calcul IMAI pondéré (instantané)
          ↓
Écran résultats
  · Score IMAI /100
  · Niveau (Débutant / Intermédiaire / Avancé)
  · Benchmark : région · secteur · taille
  · 3 forces · 3 risques · prochaine action
          ↓
Rapport PDF (généré en < 30 s)
          ↓
Option : créer un compte pour le suivi longitudinal
          ↓
CTA AgentHub — Continuer le parcours
```

### 3.2 Parcours PME — Retour trimestriel (suivi longitudinal)

```
Rappel automatique par email (tous les 3 mois)
          ↓
Connexion avec email (lien magique)
          ↓
Atlas : « Bienvenue ! Depuis mars, votre score est passé de 42 à 58. »
          ↓
Questions adaptatives — uniquement les dimensions en progression / régression
          ↓
Rapport comparatif : IMAI actuel vs IMAI précédent
          ↓
Plan d'action mis à jour
```

### 3.3 Parcours administrateur CCI3R

```
Connexion dashboard partenaire
          ↓
Observatoire : indicateurs agrégés en temps réel
          ↓
Filtres : secteur · taille · date · niveau de maturité
          ↓
Export données agrégées (CSV)
          ↓
Accès aux ressources (formations recommandées selon les données)
```

---

## 4. Introduction conversationnelle — Atlas

Avant les questions d'évaluation, Atlas engage une conversation de 2 minutes pour personnaliser l'expérience.

### Script d'introduction

```
Atlas :
Bonjour ! Je suis Atlas, votre guide pour le Parcours IA PME de la CCI3R.
En moins de 10 minutes, nous allons évaluer ensemble où en est votre
entreprise avec l'intelligence artificielle — et je vais vous proposer
un plan d'action concret.

Avant de commencer, j'ai quelques questions rapides.

→ Quel est le nom de votre entreprise ?
  [Champ texte libre]

→ Dans quel secteur évoluez-vous ?
  [Manufacturier] [Services professionnels] [Construction]
  [Commerce / Distribution] [Santé] [Autre]

→ Combien d'employés comptez-vous ?
  [1–9] [10–49] [50–199] [200+]

→ Quel est votre principal défi avec l'IA en ce moment ?
  [Je ne sais pas par où commencer]
  [Je veux réduire mes coûts opérationnels]
  [Je veux automatiser des tâches répétitives]
  [Je veux protéger mes données]
  [Je veux rester compétitif]
  [Je cherche à mesurer le ROI de l'IA]

Atlas :
Parfait. Je vais adapter mes questions à votre réalité de [secteur]
avec [taille] employés. Commençons !
```

**Utilisation des données de l'introduction :**
- Sector + taille → sélection des branches adaptatives
- Défi prioritaire → personnalisation du rapport et de la feuille de route
- Données CCI3R → enrichissement du benchmark sectoriel

---

## 5. Questions adaptatives

### Architecture de l'arbre de questions

Le questionnaire comporte **10 questions de tronc commun** et **jusqu'à 5 branches conditionnelles** selon le profil.

```
TRONC COMMUN (tout le monde)
├── Bloc Stratégie     Q1, Q2
├── Bloc Personnes     Q4, Q5
├── Bloc Processus     Q7
├── Bloc Technologies  Q10
└── Bloc Gouvernance   Q13, Q14, Q15

BRANCHES CONDITIONNELLES
├── Si taille ≥ 50 employés → Q3 (budget IA formalisé)
├── Si secteur = manufacturier → Q7b (automatisation production)
├── Si Q10 = Oui (M365) → Q10b (usage Copilot)
├── Si Q10 = Non → Q10c (suite collaborative alternative)
├── Si Q7 = Oui (processus identifiés) → Q8 (outils IA en usage)
└── Si Q13 = Non (pas de politique IA) → Q13b (données envoyées externellement)
```

### Questions — Tronc commun (10 questions)

**Stratégie**
| # | Question | Poids |
|---|----------|-------|
| Q1 | L'intelligence artificielle fait-elle partie de votre stratégie d'entreprise formelle ? | Élevé |
| Q2 | Avez-vous défini des objectifs mesurables pour votre adoption de l'IA ? | Élevé |

**Personnes**
| # | Question | Poids |
|---|----------|-------|
| Q4 | Vos gestionnaires ont-ils reçu une formation sur les possibilités et les risques de l'IA ? | Standard |
| Q5 | Des employés utilisent-ils l'IA dans leurs tâches quotidiennes ? | Standard |

**Processus**
| # | Question | Poids |
|---|----------|-------|
| Q7 | Avez-vous identifié des processus internes pouvant être automatisés grâce à l'IA ? | Standard |

**Technologies**
| # | Question | Poids |
|---|----------|-------|
| Q10 | Utilisez-vous une suite collaborative (Microsoft 365, Google Workspace) ? | Standard |

**Gouvernance**
| # | Question | Poids |
|---|----------|-------|
| Q13 | Disposez-vous d'une politique d'utilisation de l'IA approuvée par la direction ? | Critique |
| Q14 | Savez-vous quelles données de votre entreprise sont transmises à des services IA externes ? | Critique |
| Q15 | Avez-vous un processus de validation avant d'adopter un nouvel outil IA ? | Critique |

### Questions — Branches conditionnelles (0 à 5 questions)

| Condition | Question ajoutée |
|-----------|-----------------|
| Taille ≥ 50 | Q3 : Avez-vous alloué un budget spécifique à l'IA cette année ? |
| Secteur = Manufacturier | Q7b : Utilisez-vous des systèmes automatisés ou robotisés dans votre production ? |
| Q10 = Oui (M365) | Q10b : Utilisez-vous ou avez-vous évalué Microsoft Copilot ? |
| Q10 = Non | Q10c : Vos équipes utilisent-elles des outils collaboratifs alternatifs (Slack, Notion, etc.) ? |
| Q7 = Oui | Q8 : Utilisez-vous déjà des outils IA dans vos opérations (ChatGPT, Copilot, etc.) ? |
| Q13 = Non | Q13b : Des employés utilisent-ils des outils IA avec leurs comptes personnels (ChatGPT gratuit) ? |

---

## 6. Scoring pondéré — IMAI /100

### Principe
Toutes les réponses sont sur 3 niveaux : **Oui** (2 pts) · **Partiellement** (1 pt) · **Non** (0 pt).  
Le score brut de chaque dimension est normalisé en pourcentage, puis pondéré selon son importance stratégique.

### Poids par dimension (révisés v0.3)

| Dimension | Poids | Justification |
|-----------|-------|---------------|
| Gouvernance | **25 %** | Risque légal et sécurité — critique mais équilibré avec la stratégie |
| Stratégie | **25 %** | Conditionne l'investissement et l'engagement de la direction |
| Technologies | **20 %** | Socle d'activation — important mais rattrapable rapidement |
| Processus | **20 %** | Impact opérationnel direct et mesurable |
| Personnes | **10 %** | Souvent rattrapé par la formation — pondération maintenue |

### Formule de calcul

```
Score_dimension = (somme des points réels / points maximum possibles) × 100
IMAI = Σ (Score_dimension × Poids_dimension)
```

**Exemple (entreprise débutante) :**
```
Gouvernance  : 1/6 → 16.7 % × 0.25 = 4.2
Stratégie    : 2/6 → 33.3 % × 0.25 = 8.3
Technologies : 3/6 → 50.0 % × 0.20 = 10.0
Processus    : 2/6 → 33.3 % × 0.20 = 6.7
Personnes    : 2/4 → 50.0 % × 0.10 = 5.0
IMAI = 34.2 / 100 → Niveau Intermédiaire (seuil 34)
```

### Niveaux de maturité

| Score IMAI | Niveau | Couleur |
|------------|--------|---------|
| 0 – 33 | 🔴 Débutant | Rouge |
| 34 – 66 | 🟡 Intermédiaire | Jaune |
| 67 – 100 | 🟢 Avancé | Vert |

### Score par dimension — interprétation

| Score dimension | État |
|-----------------|------|
| 0 – 33 % | 🔴 Zone de risque — action prioritaire |
| 34 – 66 % | 🟡 En développement — renforcer |
| 67 – 100 % | 🟢 Maturité atteinte — maintenir |

---

## 7. Benchmark

Le benchmark permet à l'entreprise de se situer par rapport à ses pairs.  
**Règle de confidentialité :** le benchmark n'apparaît qu'à partir de **5 participants** dans la catégorie.

### Axes de comparaison

| Axe | Description |
|-----|-------------|
| Benchmark régional | Toutes les PME participantes de la CCI3R |
| Benchmark sectoriel | PME du même secteur (min. 5 participants) |
| Benchmark par taille | PME de la même tranche d'employés (min. 5 participants) |

### Affichage dans le rapport

```
Votre IMAI : 42 / 100

                         Vous    Région   Secteur  Taille
Score global             42      38       41       45
Gouvernance              22      18       21       28
Stratégie                48      42       44       50
Technologies             55      49       52       58
Processus                40      35       38       44
Personnes                38      32       36       40

↑ Vous êtes au-dessus de la moyenne régionale (+4 pts)
↓ Vous êtes légèrement en-dessous de la moyenne par taille (-3 pts)
```

### Évolution du benchmark dans le temps

Le tableau de bord CCI3R montre l'évolution du benchmark trimestriel, permettant de mesurer l'impact de leurs programmes de formation et d'accompagnement.

---

## 8. Suivi longitudinal

### Concept
Une entreprise peut reprendre son évaluation tous les trimestres. Atlas compare automatiquement avec le score précédent et adapte les questions aux zones de progression ou de régression.

### Mécanisme d'identification
- **Option A (MVP)** : email + lien magique (aucun mot de passe)
- **Option B (Phase 2)** : compte AgentHub complet

### Données suivies

| Donnée | Fréquence |
|--------|-----------|
| IMAI global | Chaque évaluation |
| Score par dimension | Chaque évaluation |
| Questions ayant progressé | Calculé par delta |
| Plan d'action complété | Auto-déclaré |
| Date d'évaluation | Automatique |

### Affichage dans Atlas (retour trimestriel)

```
Atlas :
Bienvenue ! Vous aviez obtenu un score de 42/100 en mars 2026.

Depuis votre dernière évaluation, de nombreuses PME de la CCI3R
ont progressé sur la gouvernance et la formation.

Je vais concentrer nos questions sur les dimensions où vous pouvez
gagner le plus de points : Gouvernance et Stratégie.

C'est parti !
```

### Rapport comparatif PDF (retour trimestriel)

Ajouter une page "Votre évolution" :
```
Mars 2026     Juin 2026     Progression
42 / 100  →  58 / 100      +16 pts (+38 %)

Dimension ayant le plus progressé : Gouvernance (+22 pts)
Dimension à travailler : Personnes (-2 pts)
```

---

## 9. Format du rapport PDF

**Structure (5 pages — v0.2)**

**Page 1 — Couverture**
- Logo CCI3R + Parcours IA PME · Logo AgentHub (discret)
- Nom de l'entreprise · Secteur · Date
- Score IMAI : **XX / 100**
- Niveau : Débutant / Intermédiaire / Avancé

**Page 2 — Tableau de bord**
- Radar chart 5 dimensions (pondérées)
- Score par dimension + barre de progression
- Benchmark : Vous vs Région vs Secteur (tableau condensé)
- 3 forces (vert) · 3 risques (rouge)

**Page 3 — Prochaine action & Plan d'action**
- **Prochaine action immédiate** (grande police, encadrée)
- Feuille de route 30 / 90 / 180 jours adaptée au niveau
- Personnalisée selon le défi déclaré en introduction

**Page 4 — Votre évolution** *(uniquement lors du retour trimestriel)*
- Graphique : score IMAI sur le temps
- Delta par dimension vs évaluation précédente
- Actions complétées (auto-déclarées)

**Page 5 — Aller plus loin**
- Prochains événements CCI3R recommandés (selon dimensions faibles)
- Présentation AgentHub en 3 lignes
- QR code vers la plateforme
- Mentions légales et confidentialité

---

## 10. Tableau de bord partenaire (Observatoire CCI3R)

### Métriques affichées

| Indicateur | Format | Note |
|------------|--------|------|
| Entreprises participantes | Compteur | Temps réel |
| Score IMAI moyen | Gauge 0–100 | Pondéré |
| Répartition par niveau | Camembert | Débutant / Inter / Avancé |
| Évolution trimestrielle | Courbe | Score moyen par période |
| Répartition par secteur | Barres | Top 5 secteurs |
| Dimensions les plus faibles | Classement | Agrégé |
| Top 5 actions recommandées | Liste | Fréquence d'apparition |
| Taux de retour trimestriel | % | Entreprises avec ≥ 2 évaluations |
| Défis prioritaires déclarés | Nuage / liste | Introduits par Atlas |
| Benchmark d'évolution | Delta | Score actuel vs T-1 |

### Règles de confidentialité
- Aucune donnée individuelle visible par la CCI3R
- Statistiques visibles uniquement à partir de **5 participants minimum** par catégorie
- Consentement explicite de l'entreprise au moment de l'évaluation
- Conformité PIPEDA / Loi 25

---

## 11. Architecture technique (MVP)

### Architecture — AgentHub Workspace

Le module diagnostique est la **première application** d'une plateforme modulaire.  
Chaque partenaire (CCI3R, autre chambre, ODE) dispose de son propre **Workspace**.  
Chaque Workspace peut activer une ou plusieurs **Apps** (Diagnostic IA, Analyse RH, Revue financière…).

```
AgentHub Workspace
├── /workspace/{slug}/                → page d'accueil du partenaire
├── /workspace/{slug}/diagnostic/    → App 1 : Parcours IA PME (MVP)
├── /workspace/{slug}/dashboard/     → Observatoire partenaire
└── /workspace/{slug}/apps/          → Catalogue apps (Phase 2+)
```

Cette architecture permet de reproduire le modèle CCI3R pour tout nouveau partenaire en créant un simple enregistrement `diagnostic_partners` sans redéploiement.

### Stack
- **Backend :** FastAPI (Python) — `routes_diagnostic.py`
- **Agent Atlas :** Claude API (`claude-sonnet-4-6`) avec prompts structurés et logique de branchement déterministe
- **Scoring :** Calcul Python pur — logique déterministe, pas de ML
- **PDF :** WeasyPrint (HTML → PDF, templates Jinja2 par partenaire)
- **Frontend :** Vanilla JS — nouvelle page `workspace.html` + module dashboard
- **Base de données :** Supabase PostgreSQL — nouvelles tables isolées

### Nouvelles tables SQL

```sql
-- Partenaires (CCI3R, autres chambres, ODE…)
diagnostic_partners (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,       -- 'cci3r', 'cciqs', etc.
  name          text NOT NULL,
  logo_url      text,
  primary_color text DEFAULT '#2563eb',
  created_at    timestamptz DEFAULT now()
);

-- Session d'évaluation (une par évaluation, renouvellable trimestriellement)
diagnostic_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          uuid REFERENCES diagnostic_partners(id),
  company_email       text,                -- pour suivi longitudinal (optionnel)
  company_name        text NOT NULL,
  sector              text NOT NULL,
  size_range          text NOT NULL,       -- '1-9', '10-49', '50-199', '200+'
  priority_challenge  text,               -- déclaré par Atlas en intro
  -- Scores
  imai_score          numeric(5,2),        -- 0–100
  score_strategie     numeric(5,2),        -- 0–100
  score_personnes     numeric(5,2),
  score_processus     numeric(5,2),
  score_technologies  numeric(5,2),
  score_gouvernance   numeric(5,2),
  niveau              text,                -- debutant / intermediaire / avance
  -- État
  status              text DEFAULT 'in_progress',  -- in_progress / completed
  rapport_url         text,
  created_at          timestamptz DEFAULT now(),
  completed_at        timestamptz,
  -- Suivi longitudinal
  previous_session_id uuid REFERENCES diagnostic_sessions(id)
);

-- Réponses individuelles
diagnostic_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  question_code   text NOT NULL,    -- 'Q1', 'Q10b', 'Q13b', etc.
  dimension       text NOT NULL,    -- strategie / personnes / processus / technologies / gouvernance
  answer          text NOT NULL,    -- oui / partiellement / non
  score           smallint NOT NULL, -- 0, 1, ou 2
  is_conditional  boolean DEFAULT false,
  answered_at     timestamptz DEFAULT now()
);

-- Benchmark agrégé (calculé quotidiennement, jamais données individuelles)
diagnostic_benchmarks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid REFERENCES diagnostic_partners(id),
  period      date NOT NULL,          -- premier jour du trimestre
  sector      text,                   -- NULL = tous secteurs
  size_range  text,                   -- NULL = toutes tailles
  sample_size integer NOT NULL,
  imai_avg    numeric(5,2),
  imai_p25    numeric(5,2),           -- 1er quartile
  imai_p75    numeric(5,2),           -- 3e quartile
  dim_strategie_avg   numeric(5,2),
  dim_personnes_avg   numeric(5,2),
  dim_processus_avg   numeric(5,2),
  dim_technologies_avg numeric(5,2),
  dim_gouvernance_avg  numeric(5,2),
  computed_at timestamptz DEFAULT now()
);
```

### Endpoints API

```
POST /api/diagnostic/start                        → Créer session + intro Atlas
POST /api/diagnostic/{id}/answer                  → Enregistrer une réponse
GET  /api/diagnostic/{id}/next-question           → Prochaine question (logique adaptative)
GET  /api/diagnostic/{id}/results                 → Calcul IMAI pondéré + benchmark
GET  /api/diagnostic/{id}/pdf                     → Générer et retourner le PDF
POST /api/diagnostic/resume                       → Retrouver sessions par email (lien magique)
GET  /api/diagnostic/partner/{slug}/dashboard     → Stats agrégées partenaire (auth requise)
GET  /api/diagnostic/partner/{slug}/export        → Export CSV agrégé
POST /api/diagnostic/benchmark/refresh            → Recalcul benchmark (cron quotidien)
```

---

## 12. Écrans MVP

### Écran 1 — Accueil partenaire
```
[Logo CCI3R]
Parcours IA PME · Chambre de commerce de Trois-Rivières

Évaluez la maturité IA de votre entreprise en 10 minutes.
Obtenez un plan d'action personnalisé et comparez-vous à vos pairs.

                    [Démarrer mon évaluation →]

Gratuit · Confidentiel · Résultat immédiat
Propulsé par AgentHub
```

### Écran 2 — Introduction Atlas
```
[Avatar Atlas]
Bonjour ! Je suis Atlas, votre guide pour le Parcours IA PME.

Avant de commencer, quelques questions rapides pour
adapter votre évaluation à votre réalité.

Quel est le nom de votre entreprise ?
[________________________]

Dans quel secteur évoluez-vous ?
[Manufacturier ▼]

Combien d'employés ?
[10–49 ▼]

Quel est votre principal défi avec l'IA ?
○ Je ne sais pas par où commencer
○ Réduire mes coûts opérationnels
○ Automatiser des tâches répétitives
○ Protéger mes données
○ Rester compétitif
○ Mesurer le ROI de l'IA

                    [Continuer →]
```

### Écran 3 — Agent conversationnel
```
[Avatar Atlas]
Parlons de votre gouvernance IA — c'est souvent
là que se cachent les plus grands risques.

Disposez-vous d'une politique d'utilisation
de l'IA approuvée par la direction ?

[Oui, elle est documentée et communiquée]
[Nous y travaillons / c'est informel]
[Non, nous n'en avons pas encore]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Question 8 / 12
```

### Écran 4 — Résultats
```
Votre Indice de Maturité IA

        [Radar chart — 5 dimensions]

IMAI : 42 / 100    Niveau : Intermédiaire 🟡

  Benchmark      Vous    Région   Secteur
  Score global    42      38       41
  Gouvernance     22      18       21
  ← Dimension la plus faible

✓ Forces                   ✗ Risques
Processus identifiés       Aucune politique IA
Suite M365 active          Données exposées à l'externe
Équipes sensibilisées      Pas de responsable IA

Prochaine action recommandée :
→ Rédiger une politique IA d'une page avec 3 règles claires

[📄 Télécharger mon rapport PDF]   [Continuer avec AgentHub →]
[📧 Recevoir un suivi dans 3 mois]
```

### Écran 5 — Dashboard CCI3R (Observatoire)
```
Observatoire IA PME — CCI3R                         [Export CSV ↓]
Mise à jour : aujourd'hui à 14h32

[42 entreprises]  [IMAI moyen : 38/100]  [Taux retour : 31%]

[Camembert niveaux]        [Courbe évolution T1→T4]
  Débutant   52%             T1 : 32  T2 : 36  T3 : 38
  Inter.     39%
  Avancé      9%

[Barres secteurs]          [Classement dimensions faibles]
  Manufacturier  18          1. Gouvernance    22/100
  Services       12          2. Stratégie      31/100
  Construction    7          3. Personnes      34/100
  Commerce        5

Top 5 défis déclarés       Top 5 actions recommandées
1. Ne sais pas par où      1. Créer politique IA (68%)
   commencer (44%)         2. Désigner resp. IA (54%)
2. Automatisation (31%)    3. Inventaire outils (47%)
3. Compétitivité (18%)     4. Former gestionnaires (43%)
4. Protection données(7%)  5. Déployer Copilot (28%)
```

---

## 13. Critères d'acceptation (MVP)

| Fonctionnalité | Critère |
|----------------|---------|
| Introduction Atlas | Agent recueille secteur, taille, défi en < 2 min, adapte les questions |
| Questions adaptatives | Tronc 10 questions + jusqu'à 5 branches selon profil |
| Scoring pondéré | IMAI /100 calculé selon poids par dimension, résultat en < 1 s |
| Benchmark | Affiché uniquement si ≥ 5 participants dans la catégorie (sinon masqué) |
| Rapport PDF | Généré en < 30 s, A4, lisible sur mobile, logo CCI3R en couverture |
| Suivi longitudinal | Email + lien magique fonctionnel, rapport comparatif généré si ≥ 2 sessions |
| Dashboard partenaire | Données agrégées exactes, aucune donnée individuelle exposée |
| Confidentialité | Consentement explicite avant démarrage, PIPEDA conforme |
| Mobile | Interface 100 % responsive |
| Langue | Français (MVP) |
| Performance | Réponse Atlas < 3 s par question, PDF < 30 s |
| Données démo | Dashboard affichable avec données fictives labellisées "DÉMO" |

---

## 14. Hors scope MVP

- Suivi longitudinal / retour trimestriel (Phase 2)
- Marketplace d'experts partenaires (Phase 2)
- Catalogue apps AgentHub Workspace (Phase 2)
- Multilingue EN / ES (Phase 2)
- Intégration Microsoft 365 / connecteurs (Phase 2)
- Notifications push / rappels automatiques (Phase 2)
- Facturation et abonnement en ligne (Phase 2)
- Application mobile native (Phase 3)
- IA générative pour les plans d'action (MVP = logique déterministe)

---

## 15. Questions ouvertes à valider avant S2

| # | Question | Décision attendue |
|---|----------|------------------|
| 1 | Les poids par dimension (Gouvernance 30 %, etc.) sont-ils validés ? | Oui / Ajuster |
| 2 | Le score sur 100 est-il préférable au score sur 30 de la v0.1 ? | Confirmé |
| 3 | Le suivi longitudinal est-il dans le MVP ou en Phase 2 ? | MVP / Phase 2 |
| 4 | Le benchmark s'affiche-t-il en mode démo (données fictives) pour la démo CCI3R ? | Oui / Non |
| 5 | L'email pour le suivi longitudinal est-il obligatoire ou optionnel ? | Obligatoire / Optionnel |
| 6 | Combien de secteurs dans le menu Atlas ? (Liste fermée ou saisie libre ?) | Fermée / Libre |
| 7 | Le nom "Atlas" pour l'agent est-il retenu ? | Oui / Autre |

---

## 16. Plan de livraison

| Semaine | Objectif | Livrable |
|---------|----------|---------|
| **S1** | Conception | PRD validé · Questions finalisées · Maquettes approuvées · Tables SQL créées |
| **S2** | Core engine | Agent Atlas · Logique adaptative · Scoring pondéré · Base de données |
| **S3** | Rapport & Dashboard | Génération PDF · Dashboard CCI3R · Suivi longitudinal (email) |
| **S4** | Finition | Données démo · Tests complets · Déploiement staging · Répétition démo CCI3R |

---

*Document confidentiel — CivicAI Inc. · Parcours IA PME v0.2*
