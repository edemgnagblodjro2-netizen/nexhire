# AttenteZéro
A mobile application connecting vulnerable individuals with community and social services across Canada.

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

## v1.1.9 (en cours)
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