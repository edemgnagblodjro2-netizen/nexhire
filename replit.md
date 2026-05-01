# Overview

**Current version: v1.0.55 (versionCode 52, app.json local 55) — 2026-04-29**

> 🛠️ **v1.0.55 BUILD EAS EN COURS sur D:\attentezero-v1.0.55**
>
> 177 fiches "à corriger en priorité" rectifiées (153 services province-wide → "N/A — service téléphonique/en ligne", 9 centres 911, 8 services CFS provinciaux, 7 vraies adresses). Bundle services-data.json régénéré (1710 fiches), prod redéployée avec RESEED_SERVICES=1 puis RESEED_SERVICES retiré (mode sécurisé restauré).
>
> ⚠️ **BUG ARCHIVE v1.0.55-monorepo-FULL.tar.gz — `.npmrc` racine MANQUANT**
>
> L'archive shippée à l'utilisateur ne contient pas `.npmrc` (la commande tar liste les fichiers explicitement et oublie les dotfiles). Sans ce `.npmrc` à la racine, `pnpm install` n'utilise pas `node-linker=hoisted` ni `shamefully-hoist=true`, et chaque package n'a pas de `node_modules` plat → EAS local pre-flight check échoue avec "Failed to resolve plugin for module 'expo-router'".
>
> Workaround appliqué côté utilisateur : ajouter manuellement à `D:\attentezero-v1.0.55\.npmrc`:
> ```
> node-linker=hoisted
> shamefully-hoist=true
> ```
> puis `pnpm install --no-frozen-lockfile`.
>
> **À CORRIGER pour v1.0.56 et suivants** : ajouter `.npmrc` (et tout autre dotfile critique : `.easignore`, etc.) à la liste explicite des fichiers tar.

**v1.0.54 (versionCode 51) — 2026-04-29**

Ajout de la fiche officielle **SANA — Service d'Accueil des Nouveaux Arrivants de Trois-Rivières** avec ses coordonnées vérifiées : 2000 boulevard des Récollets, édifice B, Trois-Rivières QC G9A 5K3 · 819-375-2196 · sana3r.ca · communication@sana3r.ca. Organisme officiel d'accueil et d'intégration en Mauricie depuis 1968.

**v1.0.53 (versionCode 50) — 2026-04-29**

Ajout de **3 services francophones supplémentaires par province hors QC = 36 nouvelles fiches**. Chaque province non-QC dispose maintenant de **5 services francophones** dédiés aux immigrants francophones (catégories : immigration, social, famille, emploi, santé, garderie).

Exemples par province : ON ajoute AFO, RIF-CSO, Oasis Centre des femmes ; BC ajoute Maillardville, Éducacentre, SDECB ; AB ajoute La Cité francophone, Accueil Calgary, CDÉA ; MB ajoute CCFM, Pluri-elles, CDEM ; SK ajoute CÉCS, Réseau Santé fransaskois, CCF ; NB ajoute CAIIM, CARI, AAFANB ; NS ajoute Conseil Grand-Havre, U. Sainte-Anne, Réseau Santé NS ; PE ajoute La Belle-Alliance, Carrefour Isle-Saint-Jean, RDÉE Î.-P.-É. ; NL ajoute ACFSJ, ARCO, Franco-Jeunes ; YT ajoute EssentiElles, Garderie petit cheval blanc, RDÉE Yukon ; NT ajoute AFCY, CDÉTNO, Réseau Santé TNO ; NU ajoute Carrefour Nunavut, Franco-Centre, Réseau Santé Nunavut.

Toutes vérifiées (`badgeVerified: true`), avec téléphone, adresse, site et coordonnées géographiques. **Total app : 1032 services**.

**v1.0.52 (versionCode 49) — 2026-04-28**

Diagnostic IA désormais **multi-province** :
- Nouveau contexte `UserProvinceContext` (persistance AsyncStorage, défaut « QC ») branché à la racine de l'app.
- `scoreService()` utilise maintenant `userProvince` au lieu d'exclure tout ce qui n'est pas QC. Un utilisateur ontarien obtient des recommandations ON, un BC obtient des recommandations BC, etc.
- Sélecteur de province intégré en tête de l'écran diagnostic (chips horizontales QC/ON/BC/…/NU) avec bandeau « Résultats filtrés pour [Province] ».

Ajout de **24 services francophones pour immigrants francophones** (2 par province hors QC × 12) :
- ON : Centre francophone du Grand Toronto (CFGT), MOFIF
- BC : La Boussole, Réseau-Femmes C.-B.
- AB : Centre d'accueil et d'établissement (CAE) Nord-Alberta, ACFA
- MB : Accueil francophone Manitoba, SFM
- SK : RIFS, Assemblée communautaire fransaskoise (ACF)
- NB : CAFI Sud-Est, SANB
- NS : CDÉNÉ, FANE
- PE : SSTA, RIF Î.-P.-É.
- NL : FFTNL, RIF Atlantique antenne T.-N.-L.
- YT : AFY, Partenariat communauté en santé Yukon
- NT : Fédération franco-ténoise, RDÉE TNO
- NU : Association des francophones du Nunavut (AFN), RIF Nunavut

Toutes vérifiées (`badgeVerified: true`), avec téléphone, adresse, site et coordonnées géographiques. Total app : **827 services**.

**v1.0.51 (versionCode 48) — 2026-04-28**

Ajout de **5 organismes communautaires par province × 12 provinces hors QC = 60 fiches** couvrant 5 catégories distinctes par province : alimentation communautaire, refuge/jeunesse (famille), accueil immigrants, santé mentale (CMHA local), emploi/formation. Toutes vérifiées avec téléphone, adresse complète et site web. Exemples : Second Harvest (ON), MOSAIC (BC), Bissell Centre (AB), IRCOM (MB), EGADZ (SK), ISANS (NS), ANC (NL), Skookum Jim Friendship Centre (YT), Fédération franco-ténoise (NT), Embrace Life Council (NU). Total app : **803 services**.

**v1.0.50 (versionCode 47) — 2026-04-28**

Ajout massif de ressources **hors Québec uniquement** : **5 services vérifiés par province × 12 provinces** = 60 fiches (ligne santé 811, ligne d'écoute/crise, violence familiale, aide juridique, banque alimentaire) + **5 services urgents × 12 provinces** = 60 fiches (911, 9-8-8 suicide, Jeunesse J'écoute, Espoir Autochtones, Trans Lifeline) + **5 lignes SOS × 12 provinces** = 60 fiches (Refuges femmes, Protection enfance, Espace mieux-être, Enfants disparus, Aînés). Total : **180 nouvelles fiches** taguées ON, BC, AB, MB, SK, NB, NS, PE, NL, YT, NT, NU. Aucune ajoutée à Québec (les utilisateurs québécois ont déjà leurs équivalents francophones spécialisés). Toutes vérifiées (`badgeVerified: true`, `isProvinceWide: true`).

**v1.0.49 (versionCode 46) — 2026-04-28**

Ajout de 10 ressources de référence (gouvernementales et communautaires) couvrant les catégories demandées : logement (SHQ), nourriture (Banques alimentaires du Québec), santé mentale (Mouvement Santé Mentale Québec), immigration (MIFI), emploi (Services Québec), famille (LigneParents 24/7), aide juridique (Commission des services juridiques + Juripop), services francophones hors Québec (FCCF), et exemple Ontario en français (Tribunaux administratifs Ontario). Toutes vérifiées (`badgeVerified: true`) et marquées `isProvinceWide: true`.

**v1.0.48 (versionCode 45) — 2026-04-28**

Hotfix sur le diagnostic IA :
- **Bug corrigé** : le diagnostic IA classait des services d'autres provinces (ON, BC, AB, etc.) parmi les recommandations quand l'utilisateur ne filtrait pas par « ouvert maintenant ». Comme AttenteZéro est un service québécois, on exclut maintenant systématiquement toute fiche dont `province` ≠ "QC" (les fiches sans province sont supposées QC pour rétrocompatibilité). Fix dans `app/diagnostic.tsx` → `scoreService()`.

**v1.0.47 (versionCode 44) — 2026-04-28**

Audit & polish release based on feature gap analysis vs vision:
- **Premium honesty**: 4 advanced features (Suivi/Historique/Alertes/Priorisation) re-labeled "BIENTÔT" (orange) instead of "PREMIUM" (purple lock) so users who pay 10$ today don't expect features that aren't built yet. Tap shows "in development" alert.
- **Recent history**: New `lib/history.ts` (AsyncStorage, last 20 services). Auto-tracked when opening any service detail. Shows top 5 in profile with relative timestamps + "Clear" button.
- **Offline banner**: New `components/OfflineBanner.tsx` (uses `@react-native-community/netinfo`) renders an orange "Mode hors ligne · liste sauvegardée affichée" bar at the top of every screen when no internet.
- **Avatar in home header**: Round profile button next to language toggle on `(tabs)/index.tsx` hero — taps to `/(tabs)/profile`.
- **Onboarding**: New `app/onboarding.tsx` — 3-slide first-launch tour (Trouvez · Appelez · Demandez à l'IA). AsyncStorage flag `attentezero_onboarding_seen_v1`. Gated in root `_layout.tsx` `AppContent`. Skip button.
- **Push notifications scaffolding**: Installed `expo-notifications` + plugin in app.json. New `lib/notifications.ts` requests permission and registers Expo push token on AsyncStorage at end of onboarding. Backend cron / "new service near you" sender NOT YET BUILT — token is stored client-side only.
- **Resend production domain**: `notify.ts` reads `NOTIFY_FROM_EMAIL` env var. Default falls back to `onboarding@resend.dev` (sandbox). To send password-reset emails from `noreply@attentezero.ca` in production: (1) verify domain in Resend dashboard, (2) set `NOTIFY_FROM_EMAIL="AttenteZéro <noreply@attentezero.ca>"` secret on the deployment.

This project is a pnpm workspace monorepo using TypeScript, designed to provide a comprehensive aid-finding service for vulnerable individuals in Quebec. The primary application, "AttenteZéro," is an Expo mobile app (React Native) focused on connecting users with community and social services across four key cities in Quebec. The project aims to become a 100% free citizen service, complemented by a B2G (Business-to-Government) infrastructure offering institutional contracts and anonymized aggregated dashboards to municipalities and governmental organizations.

The core vision is to leverage mobile UX, conversational AI, geolocation, and multilingual support to offer a superior experience compared to existing directories. The strategic pivot focuses on avoiding sensitive beneficiary data storage to streamline compliance and target public administrations as primary paying customers, recognizing their solvency over individual professionals.

Key capabilities include an AI-powered chat for assistance (GPT-4o-mini), a comprehensive service directory with search and filtering, emergency SOS features, interactive maps, and user authentication. The project includes an administrative panel for managing services and an API server to support all functionalities.

# User Preferences

I want iterative development.
Ask before making major changes.

# System Architecture

## Monorepo Structure
The project is organized as a pnpm workspace monorepo, with each package managing its own dependencies. The stack utilizes Node.js 24, pnpm, and TypeScript 5.9.

## Mobile Application (AttenteZéro)
- **Technology**: Expo mobile app (React Native).
- **UI/UX**: Features an animated splash screen, gradient hero sections, and a complete dark mode.
- **Key Features**:
    - **Authentication**: Email/password login, registration, and reset-password functionality (awaiting external email service integration for full reset functionality).
    - **AI Chat**: GPT-4o-mini via SSE streaming, includes critical situation detection, humanized alerts, and supports 5 languages (FR/EN/ES/AR/HT). Offers a free quota (5 messages/day) with an unlimited premium option.
    - **Subscription Management**: Secure endpoint for Stripe user portal integration for premium features.
    - **Service Directory**: Displays 457 services with search, category filtering, and detailed views (description, location, hours). Services are loaded from API with AsyncStorage cache (6h TTL).
    - **Emergency Services**: SOS feature with 5 sections (911, hospital, ambulance, police, fire department), sorted by real-time GPS distance.
    - **Mapping**: Native iOS/Android map with filterable pins and an elegant web fallback.
    - **User Profile**: Editable name, email, address, password change, and language toggle.
    - **Multilingual Support**: FR/EN with AsyncStorage persistence.
- **Strategic Pivot (v1.0.33)**: Removed B2B "Field Mode" features (client files, appointments, team management) to reposition as a B2G infrastructure. The app now focuses on free citizen services (service search, map, SOS, AI Chat) and a one-time premium purchase for unlimited AI chat, favorites, and alerts. Archived B2B modules remain in the codebase but are deactivated.
- **B2G Insights Dashboard (Phase 2, v1.0.33)**: New `/b2g` page in the admin panel showing anonymized regional analytics for municipalities and CIUSSS — KPIs, top categories, daily activity, top services, coverage gap detection, CSV export. Backed by `GET /api/b2g/regions` and `GET /api/b2g/insights?city=&days=` (gated by `x-admin-key`). Privacy floor `MIN_AGGREGATE=5` clamps every aggregate (totals, daily series, top lists) below 5 events to zero. Visitor metric is split into `distinctAuthenticatedUsers` (count distinct user_id NOT NULL) and `anonymousEvents` (rows with NULL user_id) — never inflated estimates. Composite index `service_views(service_id, created_at)` and `services(city, active)` added for query performance. The endpoint also returns a global `userStats` block (total accounts, new in period, premium count, conversion %, citizens vs organisations) plus a `dailySignups` series rendered as an "Adoption — comptes utilisateurs" section in the dashboard.
- **"Combien d'attente ?" — Crowdsourced Wait Times (v1.0.33)**: Citizens can submit how long they actually waited at a service (urgences, CLSC, banques alimentaires, etc.) and see a live rolling 2-hour median on the service detail screen. Backend: `wait_time_reports` table (id serial, service_id, minutes 1–480, user_id nullable, ip_hash sha256, created_at). Public endpoints `POST /api/services/:id/wait` and `GET /api/services/:id/wait` (no auth required). Anti-abuse: same IP rate-limited to 1 report per service per 15 minutes via `sha256(ip + WAIT_REPORT_SALT)` — raw IPs are never persisted. Median is only published once a service has at least 3 reports in the rolling window. Mobile widget `components/WaitTimeWidget.tsx` is embedded between the hours card and the action buttons on `app/service/[id].tsx`; it shows the median + sample count + freshness, lets the user tap one of 7 preset chips (5/15/30/45/60/90/120 min) to submit, and auto-refreshes every 60 s. The B2G dashboard now includes a "Combien d'attente ? — pouls citoyen" section listing the 5 services in the region with the longest live medians (still gated by the `MIN_AGGREGATE=5` privacy floor on the per-service sample count).

## Admin Panel
- **Technology**: React + Vite web app.
- **Authentication**: Admin key-based login.
- **Features**: Dashboard with total stats, city/category lists, bar graphs. Service management including paginated lists, search, filters, add/edit modals, active/inactive toggles, and deletion. B2G regional insights dashboard at `/b2g` for partner municipalities/CIUSSS.

## API Server
- **Technology**: Express 5 API.
- **Database**: PostgreSQL + Drizzle ORM.
- **Validation**: Zod (`zod/v4`), `drizzle-zod`.
- **Build**: esbuild (CJS bundle).
- **Core Routes**:
    - Health check (`/api/healthz`).
    - AI chat (`POST /api/ai/chat`) with SSE streaming.
    - Mobile authentication (`/api/mobile-auth/*`).
    - Public service listing (`GET /api/services`).
    - Admin service management (`/api/admin/services/*`).
    - AI Voice transcription (`POST /api/ai/transcribe`) using Whisper-1, secured with authentication and rate-limiting.
    - Archived B2B routes (`/api/clients`, `/api/appointments`, `/api/team`) are present but not actively used in the current app version.

# External Dependencies

- **OpenAI**: Used for AI chat features (GPT-4o-mini) and voice transcription (Whisper-1).
- **Stripe**: Integrated for subscription management and billing portal access for premium features.
- **PostgreSQL**: Primary database for storing application data.
- **Drizzle ORM**: Used for database interaction with PostgreSQL.
- **Expo**: Framework for building the React Native mobile application.
- **Google Play Console / Apple App Store Connect**: Platforms for mobile application distribution.
# Audit qualité & enrichissement (2026-04-30)

## Outils dédiés (`@workspace/scripts`)
- `pnpm --filter @workspace/scripts run audit-quality` — Crawle tous les sites web actifs (concurrence 20, UA Firefox, double tentative HEAD→GET) et exporte `exports/fiches-a-corriger-AAAAMMJJ.csv` avec les colonnes vides à remplir manuellement (téléphone, site, description, adresse corrigés + colonne action garder|corriger|supprimer).
  - Catégories de problèmes : `SANS_SITE`, `SANS_DESCRIPTION`, `JAMAIS_VERIFIE`, `ADRESSE_SANS_CODE_POSTAL`, `SITE_HTTP_xxx`, `SITE_TIMEOUT`, `SITE_DNS_MORT`, `SITE_PROBABLEMENT_OK_MAIS_BLOQUE_BOT` (cas spécial : 403/429 ⇒ probablement actif mais Cloudflare/WAF rejette le bot). Beaucoup de `SITE_ERR:fetch failed` peuvent être des faux positifs liés à l'IP de Replit (canada.ca, gnb.ca, novascotia.ca etc. retournent `000` même via curl direct).

- `pnpm --filter @workspace/scripts run import-enrichment` — UPSERT (par id) de fiches communautaires québécoises curées :
  - 18 Carrefours jeunesse-emploi (CJE) supplémentaires
  - 16 Offices municipaux d'habitation (OMH)
  - 12 banques alimentaires/cuisines collectives (RCCQ + Moissons régionales)
  - 11 ACSM/CMHA filiales québécoises + Revivre, AMI-Québec, AQPS, Phobies-Zéro
  - Toutes marquées `verified_by='curation-officielle-2026-04-30'`. NE supprime aucune fiche existante.

## État BDD au 2026-05-01 (fin de session)
- **1 752 fiches actives** (15 désactivées au total)
- **1 548 fiches QC actives** (88% de la BDD)
- **672 fiches vérifiées (38%)** ; 1 080 jamais vérifiées
- 432 fiches validées via CSV le 2026-05-01

### Couverture par catégorie (déséquilibre identifié)
| Catégorie | Fiches | Constat |
|---|---:|---|
| santé | 938 (54%) | Sur-représentée |
| famille | 233 (13%) | Bien |
| soutienSocial | 122 | OK |
| santé mentale | 106 | Léger |
| logement | 100 | Sous-couvert |
| emploi | 87 | Sous-couvert |
| alimentation | 81 | Sous-couvert |
| immigration | 53 | Critique |
| achatImmobilier | 32 | Critique |

### Couverture par province
QC 1548 · ON 40 · BC 23 · AB 22 · MB 17 · SK/NS 16 · NB 15 · PE/NL 13 · YT 11 · NT 10 · NU 8

## Boucle CSV de validation manuelle

Workflow rodé pour la validation continue par l'utilisateur :

1. **Export** : `pnpm --filter @workspace/scripts run audit-quality`
   → produit `exports/fiches-a-corriger-AAAAMMJJ.csv`
2. **L'utilisateur** ouvre le CSV. Il peut éditer **soit** la colonne `_corrige` (URL, téléphone, description, adresse), **soit** directement la colonne `_actuel` correspondante — le script détecte la différence avec la BDD dans les deux cas. Met `supprimer` dans la colonne action OU `expired`/`offline forever` dans `notes` OU `DOMAINE_*_SUPPRIMER` dans `http_status` pour soft-delete.
3. **Réimport** : `pnpm --filter @workspace/scripts run apply-corrections -- exports/fiches-correctes-AAAAMMJJ.csv`
   - **Mode strict (par défaut)** : ne marque vérifiée que les fiches avec signal positif (`http_status=OK_200`, correction explicite, ou action `supprimer`/`corriger`). Les autres lignes sont ignorées (pas de validation aveugle).
   - **Mode `--loose`** : valide toute ligne du CSV (ancien comportement, à utiliser si CSV pré-filtré).
   - Marque `verified_at = now`, `verified_by = "csv-validation-AAAA-MM-JJ"`, applique les corrections, soft-delete les fiches à supprimer. Idempotent (pure UPDATE par id).

### Passages effectués (2026-05-01)
| Passage | Lignes | Vérifiées | URLs corrigées | Désactivées |
|---|---:|---:|---:|---:|
| 1. fiches-correctes (audit V1) | 361 | 361 | 110 | 0 |
| 2. fiches-a-traiter manuellement | 57 | 57 | 47 | 0 |
| 3. fiches-corrigees-v2 (mode strict) | 1672 | 373 | 126 | 3 |
| **Cumul** | | **791 actions** | **283** | **3** |

## Priorité absolue de qualité (rappelée par l'utilisateur 2026-05-01)

**Pour l'utilisateur final en détresse : téléphone et adresse > site web.**
Un site mort n'empêche pas de joindre l'aide ; un mauvais numéro = échec total.
Hiérarchie de priorité de vérification :
1. **Téléphone** (le plus critique — la personne doit pouvoir appeler)
2. **Adresse** (savoir où aller physiquement)
3. **Site web** (utile mais secondaire)

### État qualité tel/adresse au 2026-05-01
| Champ | Couverture | Action requise |
|---|---:|---|
| Téléphone présent | 1 751/1 752 (100%) | Vérifier qu'ils répondent encore au bon service |
| Téléphone format invalide | 44 (211/811/etc.) | Pas grave — numéros courts |
| Adresse présente | 1 725 (98%) | OK |
| Adresse avec code postal | 1 537 (88%) | 215 fiches à compléter (priorité) |
| Sans adresse du tout | 27 fiches | À combler |

### TODO pour la prochaine session
- [ ] Étendre `audit-quality-csv.ts` pour signaler les téléphones suspects (longueur anormale, indicatifs invalides, doublons entre fiches différentes)
- [ ] Créer un export `fiches-sans-code-postal.csv` (215 lignes) prioritaire
- [ ] Créer un export `fiches-sans-adresse.csv` (27 lignes) prioritaire

## Prochaines étapes (à reprendre)

L'utilisateur a confirmé la stratégie en 2 temps :
1. **Court terme** : finir la qualité des 1 080 fiches non vérifiées via la boucle CSV avant d'enrichir — **en priorisant tel/adresse plutôt que sites web**
2. **Ensuite** : enrichissements ciblés par lots de 50-100 fiches vérifiées à la source pour combler les manques (logement hors QC, banques alimentaires, immigration, ON/BC/AB)

Cible globale réaliste discutée : **~2 800 fiches au total** (vs 1 752 actuelles), donc ~1 050 nouvelles fiches **vérifiées** à terme.

## Note technique
- Le workflow `artifacts/api-server: API Server` était failed en fin de session 2026-05-01. À redémarrer si besoin de l'admin web ; sans impact sur les scripts CSV qui accèdent directement à la BDD.
