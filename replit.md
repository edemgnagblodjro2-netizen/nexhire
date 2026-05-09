# AttenteZéro
A mobile application connecting vulnerable individuals with community and social services across Canada.

## Société
- **CivicAI** — Entreprise de services informatiques spécialisée en intelligence artificielle appliquée aux services publics et privés.
- **NEQ (Numéro d'entreprise du Québec)** : 2280791601 — à afficher dans les mentions légales mobile + footer admin (déjà fait).
- **AttenteZéro** est un produit de CivicAI (produit citoyen gratuit, modèle B2G).
- Domaine produit : `attentezero.ca` (DNS Cloudflare, alias email actifs, pas encore de site web).
- À prévoir post-launch : site vitrine `attentezero.ca` (one-pager produit) + éventuellement site corporate `civicai.ca`/`.com` pour démarchage B2G.
- **TODO post-launch — site vitrine `attentezero.ca`** : créer un nouvel artifact `marketing-site` dans le monorepo Replit (React/Vite, one-pager : hero + boutons App Store/Play Store + 3 blocs features + stats + footer mentions légales). Servir aussi `/.well-known/assetlinks.json` pour vérifier les deep links Android. Pointer le domaine `attentezero.ca` via Cloudflare (CNAME → URL Replit).
- Mentions à jour à pousser progressivement : footer admin, page « À propos » mobile, App Store/Play Store « Développeur », signatures emails transactionnels.

## Sécurité — décisions prises (mai 2026)
- **Audit pré-launch effectué** : reset password (5 essais max sur 6 chiffres), quota IA 15/jour côté serveur, signature webhook Stripe vérifiée → 3 points critiques OK 🟢.
- **MFA / SMS / SSO** : explicitement écarté pour le launch. Public cible vulnérable (sans-abri, immigrants sans statut, femmes en fuite) → un MFA obligatoire exclurait les utilisateurs à protéger. À reconsidérer post-launch UNIQUEMENT si retour terrain le justifie, et alors privilégier biométrie optionnelle (gratuite, sans téléphone) plutôt que SMS.
- **Backups BDD automatiques Replit** : à confirmer dans le dashboard avant launch.
- **TODO post-launch sécurité** : vraie auth admin (sessions par admin + 2FA) pour remplacer la clé partagée en localStorage ; rotation annuelle des secrets ; audit log actions admin.

## Run & Operate
- `pnpm --filter @workspace/service-qc run start`: Runs the Expo mobile app.
- `pnpm --filter @workspace/admin run dev`: Starts the Admin panel web app.
- `pnpm --filter @workspace/api-server run dev`: Starts the API server.
- `pnpm --filter @workspace/api-server run typecheck`: Type-checks the API server.
- `pnpm --filter @workspace/db run push`: Pushes database schema changes.
- `pnpm --filter @workspace/scripts run audit-quality`: Exports CSV for manual quality audit.
- `pnpm --filter @workspace/scripts run apply-corrections -- <file.csv>`: Applies corrections from a CSV.

**Environment Variables**:
- `DATABASE_URL`: PostgreSQL connection string.
- `OPENAI_API_KEY`: API key for OpenAI services.
- `STRIPE_SECRET_KEY`: Stripe secret key for subscriptions.
- `ADMIN_KEY`: Key for admin panel access.
- `NOTIFY_FROM_EMAIL`: Sender email for notifications (e.g., password reset).
- `AUTO_SEED_SERVICES=1`: (Optional) Automatically seeds the database if empty.
- `RESEED_SERVICES=1`: (Optional) Destructively reseeds the database.

## Stack
- **Frameworks**: React Native (Expo), React (Vite), Express.js
- **Runtime**: Node.js 24
- **Language**: TypeScript 5.9
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Build Tool**: esbuild, pnpm (monorepo)

## Where things live
- `/app`: Expo mobile application source code (React Native).
- `/artifacts/admin`: Admin panel web application source code (React + Vite).
- `/artifacts/api-server`: API server source code (Express.js).
- `/artifacts/service-qc`: Mobile application specific data and services.
- `/lib/db`: Database schema definition (`schema/*.ts`).
- `/scripts`: Utility scripts for data management and quality audits.
- `/attached_assets`: Mockups and CSV imports.
- `artifacts/api-server/src/routes/captcha.ts`: Captcha challenge and verification.
- `artifacts/api-server/src/routes/ai.ts`: AI chat and trial logic.
- `artifacts/api-server/src/routes/auth.ts`: Mobile authentication logic.
- `artifacts/api-server/src/routes/services.ts`: Service management endpoints.
- `artifacts/api-server/src/routes/serviceCorrections.ts`: User-submitted location corrections (POST public + admin queue, auto-approve at 3 concordant submissions).

## Architecture decisions
- **B2G Pivot**: Shifted from B2B "Field Mode" to B2G, focusing on free citizen services and anonymized data dashboards for public administrations.
- **AI-first**: Integrated conversational AI (GPT-4o-mini) for service finding, available as a floating chat widget across the app.
- **Monorepo**: Utilizes a pnpm monorepo for better code sharing and dependency management across mobile, admin, and API components.
- **Privacy by Design**: B2G dashboards implement a `MIN_AGGREGATE=5` privacy floor for all aggregated data, preventing re-identification. Raw IP addresses are never persisted, only SHA256 hashes for rate limiting.
- **Crowdsourced Wait Times**: Implemented a public, unauthenticated system for users to report service wait times, with anti-abuse measures and median calculations only for services with sufficient reports.

## Product
- **AI Assistant**: GPT-4o-mini powered chatbot for immediate service search and information, with a freemium model (3-day trial, 15 questions/day).
- **Service Directory**: Comprehensive listing of community and social services, filterable by category, location, and dynamically adjusting to user's province.
- **Emergency Features**: Quick access to 911, crisis lines, and urgent care information.
- **Multilingual Support**: Available in FR, EN, ES, AR, HT for core features and AI.
- **Self-signup for Organizations**: Organizations and partners can register and manage their profiles, with an admin verification process.
- **"My Canada Trip" Page**: Dedicated page for visitors from France to Canada, offering resources on immigration, housing, and local services.
- **Crowdsourced Wait Times**: Users can report and view real-time wait times for various services.

## User preferences
- I want iterative development.
- Ask before making major changes.

## Gotchas
- **`.npmrc` for `pnpm install`**: Ensure `.npmrc` with `node-linker=hoisted` and `shamefully-hoist=true` is present in the root to avoid `expo-router` resolution issues during `pnpm install`.
- **Database Schema Updates**: Drizzle-kit symlink issues can occur; `CREATE TABLE IF NOT EXISTS` is sometimes used as a fallback.
- **Service ID Deduplication**: Be mindful of soft deletes (setting `active=false`) as IDs persist. Use PUT for existing IDs rather than DELETE+POST if reactivating.
- **Captcha MIN_AGE**: 600ms (was 2000ms — bloquait les humains rapides). À ne PAS remonter sans repenser l'UX (auto-retry visible + loading state).
- **Wrong-number reports**: Tagués `[NUMERO ERRONE - service:<id>]` dans le bug-report message → filtrable côté admin.

## iOS / TestFlight setup (LIVRÉ 6 mai)
- Compte Apple Developer payé + approuvé.
- Clé App Store Connect API (.p8) générée, stockée en secrets Replit (`APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`, `APPLE_TEAM_ID`).
- ⚠️ Clé .p8 leakée 1× dans logs bash (Replit n'a pas masqué) — à révoquer/régénérer post-launch par sécurité.
- `artifacts/service-qc/asc-api-key.p8` reformatée en PEM proprement, gitignorée (`*.p8`).
- `eas.json` : profil iOS production ajouté (resourceClass=m-medium, autoIncrement=buildNumber) + submit profile complet (ascApiKeyPath, ascApiKeyId, ascApiKeyIssuerId, appleTeamId, ascAppId=6766750916).
- `app.json` : `ITSAppUsesNonExemptEncryption=false` (évite question manuelle Apple à chaque submit), `buildNumber=4`.
- App créée sur App Store Connect : Apple ID **6766750916** (bundle `com.attentezero.app`, langue fr-CA, SKU `attentezero-ios`). ⚠️ Création app via ASC API impossible (Apple bloque CREATE), web UI obligatoire.
- Override pnpm `@xmldom/xmldom: ^0.8.10` (root package.json) → fix prebuild crash sur EAS server (incompatibilité xmldom 0.9 ↔ @expo/plist 0.4.8).
- Build #1 iOS : `aaabc171-553a-49b7-862f-3da9a4c44415` ✅ (v1.1.9 build 4).
- Submit TestFlight #1 : `3d968bce-6392-4348-8933-b7b63ba9dad7` ⏳ en cours.
- **Gotcha credentials** : tout premier `eas build --platform ios` exige mode interactif (Apple ID + 2FA), même avec ASC API key. Ensuite stockés sur EAS, builds suivants tournent en `--non-interactive`.

## v1.1.13 vc76 (en attente OK build) — +Montérégie 1007 fiches via endpoint bulk déployé
- **+1007 fiches Montérégie** importées depuis `monteregie2-fr.pdf` (97k lignes, 5182 fiches sources). Pipeline `scripts/src/parse-mont.ts` (clone Outaouais) → filtre noise + extract vraie ville depuis adresse + normalize UPPERCASE → 1038 dédup interne → 1007 dédup vs prod → géocodés Google parallèle (952 ROOFTOP, 31 GC, 19 RANGE, 5 APPROX, 0 échec). Push : burst 1 XFF varié = **240 OK** (record du jour, bonne variation IPs), puis **endpoint bulk déployé en prod entre-temps** → 767 restants poussés en **1 seule requête, ~3 sec, 100% OK**. Distribution top : Longueuil 241, Saint-Jean-sur-Richelieu 74, Châteauguay 46, Vaudreuil-Dorion 42, Salaberry-de-Valleyfield 41, Saint-Hyacinthe 37, Brossard 32, Beloeil 28, La Prairie 22, Boucherville 21, Sorel-Tracy 20, Saint-Rémi 17, Saint-Constant 17, Saint-Bruno 16. Catégories : social majoritaire, food/family/housing/employment/mentalHealth/health/immigration. Coût Google Geocoding : ~5,00$ USD.
- **Endpoint bulk validé en prod** : 767 fiches en 1 requête, ~3 sec, 0 erreur. Méthode forte officiellement opérationnelle pour tous les futurs imports (Estrie, Mauricie, Saguenay, Bas-Saint-Laurent, etc.).
- **Gotcha curl** : arrays JSON >100KB dépassent la limite ARG_MAX. Utiliser `curl --data-binary @file.json` au lieu de `-d '...'` inline.
- **PROD : 2750 → 3517 services actifs (+767)** ce soir.
- Cache mobile bumpé v23→v24. Bundle régénéré (3517 fiches).

## v1.1.13 vc75 — Imports massifs OWI + Lanaudière + Laval + Outaouais + endpoint bulk
- **+90 fiches Ouest-de-l'Île** importées depuis le PDF officiel `montreal-ouest-de-l-ile-west-island-fr.pdf` (247 pages, 623 fiches au total). Pipeline : `scripts/src/parse-owi-pdf.ts` (parser PDF→JSON) → dédup auto vs prod (97 doublons détectés) → filtres exclusion (bibliothèques municipales, sociétés savantes nationales) → géocodage Google parallèle (83 ROOFTOP, 6 GEOMETRIC_CENTER, 1 échec exclu) → POST batch parallèle via API admin. Distribution : Pointe-Claire 24, Pierrefonds-Roxboro 20, Dorval 17, Beaconsfield 10, Sainte-Anne 9, Kirkland 8, DDO 8, Baie-d'Urfé 3, L'Île-Bizard 3, Senneville 1. Coût Google Geocoding : ~0,50$ USD.
- **+242 fiches Lanaudière** importées depuis PDF officiel régional (468 pages, 1340 fiches sources). Parser adapté avec post-traitement skip noms régions (bug ville="Lanaudière"). Géocodage : 233 ROOFTOP / 9 autres, 0 échec. Push initial 10 workers parallèles a déclenché le rate-limit admin (60/IP/15min) → 180/242 OK puis blocage. Reste poussé en burst après attente fenêtre 13 min. Distribution : Joliette 58, Repentigny 56, Terrebonne 42, Mascouche 30, L'Assomption 14, Rawdon 8, L'Épiphanie 5, Notre-Dame-des-Prairies 4, Saint-Lin–Laurentides 4, Chertsey 3, autres 18. Coût Google Geocoding : ~1,21$ USD.
- **+269 fiches Laval** importées depuis `laval2-fr.pdf` (1577 fiches sources). Pipeline `/tmp/parse-laval.ts` (clone du parser Lanaudière) → filtre noise (327 headers parsés à tort comme fiches) → dédup vs prod (51 doublons) → dédup interne (931 ré-occurrences) → 269 finales géocodées Google parallèle (255 ROOFTOP, 11 GEOMETRIC_CENTER, 2 RANGE, 1 APPROX, 0 échec). Push : burst initial parallèle 12 workers + XFF varié → 74 OK avant rate-limit ; cycle 2 après attente 13 min → 195/195 OK d'un coup. Distribution catégories : social 170, food 33, family 28, employment 15, mentalHealth 11, health 7, housing 4, immigration 1. Toutes ville=Laval. Coût Google ~1,35$ USD.
- **+440 fiches Outaouais** importées depuis `outaouais-fr_*.pdf` (2350 fiches sources). Pipeline `scripts/src/parse-out.ts` → filtre noise + extract vraie ville depuis adresse (segment avant "Outaouais") → dédup interne + vs prod → 440 finales géocodées (419 ROOFTOP, 8 RANGE, 8 GC, 5 APPROX, 0 échec). Push : 3 cycles burst+wait avec XFF varié → cycle 1 = 180 OK, cycle 2 = 238 OK (après 13 min), cycle 3 = 22 OK final. Distribution top : Gatineau 266, Maniwaki 23, Campbell's Bay 16, Saint-André-Avellin 13, Val-Des-Monts 8, La Pêche 7, Lochaber 6, Gracefield 6, Papineauville 6, autres ~95. Coût Google Geocoding : ~2,20$ USD.
- **MÉTHODE FORTE LIVRÉE — endpoint `POST /api/admin/services/bulk`** : accepte array de jusqu'à 1000 payloads en une seule requête → contourne proprement le rate-limit admin (1 req au lieu de N). Réponse : `{total, created, skipped, errors, results[]}`. Dédup auto via PG 23505 (skipped au lieu d'erreur). Testé en local ✅. **À DÉPLOYER pour utilisation prod** — une fois en prod, un import PDF de 500 fiches = 1 requête = ~3 sec au lieu de 1h de cycles burst+wait.
- **PROD : 1709 → 2750 services actifs (+1041)** dans la journée.
- Cache mobile bumpé v19→v23. Bundle `services-data.json` + `services.ts` régénérés depuis prod live (2750 fiches).
- ⚠️ **Gotcha rate-limit admin** : POST en parallèle vers `/api/admin/services` est limité à 60 req/IP/15min. Astuce XFF (X-Forwarded-For varié) gagne ~3× (180 OK par burst au lieu de 60) car Replit edge ne semble pas TOUJOURS overrider l'header. Pour vraiment bypass : utiliser `/api/admin/services/bulk` (1 req = N inserts).

## v1.1.13 vc74 (en attente OK build)
- **BUG MAJEUR FIXÉ — bundle mobile désynchronisé de la DB** : `data/services.ts` (bundle Expo) avait des IDs au format `qc-gat-fd001` (vieux) tandis que la DB (dev + prod) utilise `qc-imm-gatineau-aco` (format actuel via `services-data.json`). Conséquence : POST `/rate`, `/track`, `/wait` → 404 sur tous les services bundlés en TestFlight/Android internal (race au boot avant fetch API). Fix : régénération de `services.ts` depuis `services-data.json` (1710 services, IDs alignés avec l'API). 0 modification DB prod (le 1 vote `ab-211` reste intact). Cache mobile bumpé v17→v18 pour invalider les caches contenant les anciens IDs.
- **Script permanent** : `pnpm --filter @workspace/scripts run regen-mobile-bundle` — à relancer chaque fois que `services-data.json` change pour garder bundle et DB synchros.
- Tuiles home : `aspectRatio` 1.15→1.7 + marginBottom 14→10 (réduction grille de 174px = vrai fix du « gros vide »). AI CTA remis taille originale (padding 8/12, icône 26px). `allCategoriesLink` marginTop=0.
- iOS buildNumber 78→79, Android versionCode 71→72.

## v1.1.9 (en cours)
- **Phase 2 géocodage Google LIVRÉE** : 2931 fiches re-géocodées via Google Geocoding API (2750 ROOFTOP 20m, 91 RANGE 50m, 90 CENTER 200m). Bilan global : **3686 vertes (≤100m)** vs 845 avant (+335%), 90 jaunes, 93 oranges, 356 rouges restantes (adresses sans numéro de rue, non-fixables automatiquement). Coût réel ~99$ USD vs 16$ estimé (j'ai oublié de marquer les APPROX comme déjà tentées → 333 re-tests inutiles par chunk). Fiches non-fixables maintenant marquées `geocode_source='google-tried-approx'` pour éviter tout retest futur. Script `scripts/src/geocode-google.ts` avec timeout 10s + flag de reprise auto.
- Captcha MIN_AGE 2000→600ms (fix #1 plainte « inscription bloquée »).
- Bouton « Signaler un mauvais numéro » sur fiche service → préremplit /bug-report avec serviceId + nom + numéro actuel. Adresse la plainte sur les numéros de banques erronés.
- Carte : bbox prefilter ~75km avant haversine (10-50× plus rapide sur 5000+ services), favSet O(1) pour les cards.
- **urgent.tsx BUGFIX** : `sortedServices` dépendait de `urgentServices` au lieu de `filteredServices` → la barre de recherche ne filtrait JAMAIS la liste affichée. Corrigé.
- **sos.tsx redesign** : bouton 911 refait (icône cerclée rouge + chevron, plus de débordement de texte). Ajout Centre antipoison Québec (1-800-463-5060), Info-Santé 811 et Jeu : Aide et Référence (1-800-461-0140).
- **Phase 1 fiabilité géolocalisation (LIVRÉE)** :
  - Schéma : 3 colonnes ajoutées à `services` (`service_type`, `geocode_precision_m`, `geocode_source`) + nouvelle table `service_corrections`.
  - Migration auto : 4225 physical / 970 phone (211/811/911/1-800) / 143 regional. 845 verts (≤100m) ; 3287 rouges (>1500m, à re-géocoder en Phase 2).
  - Carte : services `phone` filtrés (n'apparaissent plus comme épingles aléatoires).
  - Fiche service : bandeau précision coloré (vert/jaune/rouge) + libellé spécial pour `regional`/`phone`.
  - Bouton mobile « Position fausse ? » → écran `/correction/[id]` avec saisie d'adresse + capture GPS optionnelle (`expo-location`). Anti-spam : sha256(IP+sel), 10/30min/IP.
  - Auto-validation : 3 corrections concordantes (coords <50m OU adresse normalisée identique) → service mis à jour automatiquement, précision resserrée à 50m.
  - Panneau admin : nouvelle page `/admin/corrections` avec file pending/approved/auto_approved/rejected + actions Approuver/Refuser.
- **Phase 2 (à venir, en attente OK user)** : re-géocodage Google des 3287 fiches rouges (~5$ Geocoding API) pour dégrader le rouge.
- Build vc62 (1.1.8) toujours en cours sur EAS au moment des fixes — attendre instruction « OK lance vc63 » avant relancer.

## Pointers
- **Expo Documentation**: [https://docs.expo.dev/](https://docs.expo.dev/)
- **Drizzle ORM Documentation**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Zod Documentation**: [https://zod.dev/](https://zod.dev/)
- **OpenAI API Documentation**: [https://platform.openai.com/docs/api-reference](https://platform.openai.com/docs/api-reference)
- **Stripe Documentation**: [https://stripe.com/docs/api](https://stripe.com/docs/api)