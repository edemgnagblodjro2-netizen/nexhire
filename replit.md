# AttenteZéro
A mobile application connecting vulnerable individuals with community and social services across Canada.

## Société
- **CivicAI** — Entreprise de services informatiques spécialisée en intelligence artificielle appliquée aux services publics et privés.
- **NEQ (Numéro d'entreprise du Québec)** : 2280791601 — à afficher dans les mentions légales mobile + footer admin (déjà fait).
- **AttenteZéro** est un produit de CivicAI (produit citoyen gratuit, modèle B2G).
- Domaine produit : `attentezero.ca` (DNS Cloudflare, alias email actifs).
- **DNS attentezero.ca → API server Replit** (mai 2026) : enregistrements `A @ → 34.111.179.208` + `TXT @ → replit-verify=109734be-...` ajoutés sur Cloudflare en mode **DNS only** (nuage gris, pas proxy orange). Replit gère la TLS Let's Encrypt automatiquement. Routes servies à racine : `/s/:id` (page de partage de service) + `/.well-known/apple-app-site-association` (Universal Links iOS) + `/.well-known/assetlinks.json` (App Links Android). ⚠️ La racine `/` retourne 500 (pas de site vitrine). Quand on créera le marketing site, il faudra repenser le routing : soit servir la racine depuis l'API server, soit déplacer l'API sur un sous-domaine `api.attentezero.ca`.
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

## v1.1.16 vc91 — Fix stats "au Québec" + splash count corrigé
- **Stats strip accueil corrigées** : labels sous les chiffres passent de `"services"` → `"services au Québec"` (FR) / `"services in Québec"` (EN) et `"villes"` → `"villes QC"` / `"QC cities"`.
- **Splash count corrigé** : `SERVICES_COUNT_LABEL` corrigé `8 037 → 7 957` (vrai count BDD prod).
- **Cache v32→v33** : force un fresh fetch côté app pour afficher le bon total (7 892 filtrés QC).
- Android versionCode 76→77, iOS buildNumber EAS auto-bump 90→91.
- EAS build production lancé iOS + Android (v1.1.16) avec auto-submit.

## v1.1.15 vc89 — Fix tab bar Android (safe area insets)
- **Bug Android corrigé** : tab bar partiellement cachée derrière la barre de navigation système (gestes ou boutons) sur certains téléphones Android. Fix : `useSafeAreaInsets()` dans `_layout.tsx`, `height: 60 + insets.bottom` + `paddingBottom: insets.bottom` sur `tabBarStyle`. Les onglets Accueil/Services/IA sont maintenant toujours accessibles.
- iOS buildNumber EAS auto-bump 88→89, Android versionCode 75→76.
- Cleanup imports inutilisés (`BlurView`, `useColors`, `useColorScheme`, `isDark`, `isIOS`).
- EAS build production lancé iOS + Android (v1.1.15).

## v1.1.14 vc85 — Overflow numéro téléphone + couverture services (mai 2026)
- **Bug UI corrigé** : débordement du numéro de téléphone dans `ServiceCard.tsx` quand le texte est long. Footer `flexWrap: "wrap"` + `flex: 1` sur `cityRow` → le bouton appel passe automatiquement à la ligne suivante si trop large. `flexShrink: 0` sur callButton, `flexShrink: 1` sur callText.
- **+80 services ajoutés en prod** (7 957 → 8 037) sur 12 villes QC sous-couvertes : mentalHealth (JEVI, CPS RN, CPS Val-d'Or, CEPS 02 Saguenay/Alma/Laurentides), health (CLSCs Sherbrooke/Saguenay/Saint-Jérôme/Rouyn-Noranda/Mirabel/Blainville/Val-d'Or/Alma), administrative (Service Canada x7), food (Ressourcerie RN, Action Source Vie STJ, BAM Magog, Entraide Mirabel), immigration (Le Coffret STJ, Groupe Inclusia Saguenay), employment (CJE Abitibi-Est Val-d'Or), social (CABS Sherbrooke), family (La Cigogne Alma).
- iOS buildNumber 84→87 (auto-incrémenté par EAS), Android versionCode 74→75.
- **Splash count mis à jour** : `SERVICES_COUNT_LABEL` → 8 037 (à faire manuellement dans AppSplashScreen.tsx pour le prochain build).
- EAS build production lancé : Android `644afb9e` (new) + iOS en cours.

## v1.1.13 vc78 (en attente OK build) — Tab bar redesign
- `app/(tabs)/_layout.tsx` retravaillé pour un look plus designer :
  - Fond `#0d9488` (teal moderne, cohérent avec splash B au lieu du vieux `#0E7E6E`).
  - Coins haut bien arrondis (`borderTopLeftRadius/RightRadius: 24`, `overflow: hidden` sur la bar + le `tabBarBackground`).
  - Ombre relevée (`offset -4`, `opacity 0.18`, `radius 14`, `elevation 16`) → la bar « flotte » visuellement.
  - Pill actif unifié sur **toutes** les tabs (helper `<TabIcon>`) : `bg rgba(255,255,255,0.18)`, `radius 14`, `minWidth 44`. Plus de cas spécial chat-only.
  - Inactive tint un poil plus visible (`0.62` au lieu de `0.65` — on garde le contraste blanc/teal).
  - Icônes 21→20px (un poil moins lourd dans le pill), letterSpacing label 0.2→0.3.
- iOS buildNumber 81→82, Android versionCode 73→74.

## v1.1.13 vc77 (en attente OK build) — Splash design B (Moderne illustration)
- Splash mobile redesign : `components/AppSplashScreen.tsx` réécrit selon design B approuvé.
  - Fond `#0d9488` plein, 5 cercles concentriques décoratifs `border rgba(255,255,255,~0.1-0.18)`, 5 sparkles dispersés.
  - Logo card 112x112 sur outer-glow 128x128 (blanc 6% opacité, shadow forte).
  - Wordmark `AttenteZéro` Inter_700Bold 34pt, tagline `Services communautaires du Québec` Inter_500Medium 13pt.
  - Badge pill `7 957 services actifs` (dot vert + nombre + label) — `bg rgba(255,255,255,0.14)`, border `rgba(255,255,255,0.22)`.
  - Footer `PROPULSÉ PAR / CivicAI`.
  - Animation : rings+logo (350ms parallèle) → text (220ms) → badge+footer (220ms) → total ~1.1s ; hold splash bumpé `800ms → 1400ms` après ready dans `app/_layout.tsx` pour laisser l'anim finir avant fade-out.
- Compte hardcodé `7 957` dans `SERVICES_COUNT_LABEL` — à mettre à jour manuellement quand ce nombre évolue (impossible de le rendre dynamique car splash s'affiche AVANT chargement services).
- iOS buildNumber 80→81, Android versionCode 72→73.
- ⚠️ Web preview fige sur 1ère frame de l'anim (useNativeDriver pas dispo en web RN) — normal, native iOS/Android tourne smooth.

## Historique
Releases vc76 et antérieures → voir `CHANGELOG.md`.

## Pointers
- **Expo Documentation**: [https://docs.expo.dev/](https://docs.expo.dev/)
- **Drizzle ORM Documentation**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Zod Documentation**: [https://zod.dev/](https://zod.dev/)
- **OpenAI API Documentation**: [https://platform.openai.com/docs/api-reference](https://platform.openai.com/docs/api-reference)
- **Stripe Documentation**: [https://stripe.com/docs/api](https://stripe.com/docs/api)