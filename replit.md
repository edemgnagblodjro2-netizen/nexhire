# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### AttenteZéro (artifacts/service-qc)

- **Type**: Expo mobile app (React Native)
- **Preview path**: `/`
- **App name**: AttenteZéro
- **Bundle ID (iOS)**: `com.attentezero.app`
- **Package (Android)**: `com.attentezero.app`
- **Version**: 1.0.0 (versionCode: 1)
- **Purpose**: Aide les personnes vulnérables au Québec à trouver des services communautaires et sociaux. Couvre 4 villes : Trois-Rivières, Shawinigan, Drummondville, Victoriaville.

### Features

- **Splash animé** : Logo AttenteZéro avec gradient teal, animation spring, fondu avant login
- **Auth email/mot de passe** : login, register, reset-password via API `quebec-aid-finder.replit.app`
- **Accueil** : Hero gradient, barre de recherche, stats (457+ services, 4 villes, 24/7), bannières SOS/Carte/IA, catégories rapides
- **Chat IA** : GPT-4o-mini via SSE streaming, détection de situations critiques (crise suicidaire, danger immédiat), alertes humanisées, 5 langues (FR/EN/ES/AR/HT), prompts rapides par langue
- **Services** : 457 services, grille 2 colonnes, recherche texte + filtre catégorie
- **Catégories** : 10 catégories avec compteurs dynamiques
- **Résultats** : Filtres par catégorie + recherche texte (nom, ville, description, sous-catégorie)
- **Service détail** : Description, localisation, adresse, horaires, boutons Appeler / Site web
- **SOS Urgences** : 5 sections (911, hôpital, ambulance, police, pompiers), tri par distance GPS réelle
- **Aide d'urgence** : Services urgents filtrés, triés par géolocalisation
- **Carte** : Native (iOS/Android) avec épingles filtrables ; fallback web élégant
- **Profil** : Nom, email, adresse modifiable, changement mot de passe, toggle langue
- **Guide d'achat immobilier** : 8 étapes interactives (catégorie realestate)
- **Services depuis API** : ServicesContext charge les 457 services depuis l'API `/api/services` avec cache AsyncStorage (6h TTL), fallback sur données statiques
- **Mentions légales** : Conditions d'utilisation + politique de confidentialité intégrées
- **Localisation** : Haversine distance, tri automatique des services urgents par proximité
- **Dark mode** : Complet
- **Bilingue** : FR/EN avec persistance AsyncStorage

### Data

- **457 services** validés, 0 doublons d'ID, 0 téléphones vides, 0 sites web vides
- **10 catégories** : housing, food, mentalHealth, health, immigration, employment, family, social, childcare, realestate
- **Sous-catégories SOS** : "Centre 911", "Urgence hospitalière", "Service ambulancier", "Service de police", "Service des incendies" (doivent correspondre exactement dans services.ts)
- **Champs** : id, name, city, phone, website, description, category, subcategory, isUrgent?, isProvinceWide?, coordinates?, hours?, address?

### API

- **Endpoint IA** : `POST /api/ai/chat` — `{message, language, history}` → SSE streaming avec `{content}`, `{done, serviceIds}`, `{error}`
- **Base URL** : `https://quebec-aid-finder.replit.app` (configurée dans `lib/apiBase.ts`)
- **Auth API** : `/api/mobile-auth/email-login`, `/api/mobile-auth/register`, `/api/mobile-auth/update-profile`, `/api/mobile-auth/logout`

### Key Files

| Fichier | Rôle |
|---|---|
| `app.json` | Config Expo — package Android `com.attentezero.app`, bundleId iOS, permissions GPS |
| `eas.json` | Config EAS Build — 3 profils : development (APK interne), preview (APK interne), production (AAB Play Store) |
| `data/services.ts` | 457 services avec coordonnées, horaires, adresses |
| `constants/translations.ts` | Traductions FR/EN complètes |
| `constants/colors.ts` | Palette teal (`#0e7e6e`) avec dark mode |
| `lib/apiBase.ts` | URL API (env `EXPO_PUBLIC_API_URL` ou fallback `quebec-aid-finder.replit.app`) |
| `lib/auth.tsx` | AuthContext — token SecureStore, login/register/logout/updateProfile |
| `components/AppSplashScreen.tsx` | Splash animé avec `useNativeDriver: true` |
| `app/(tabs)/_layout.tsx` | Navigation tabs — Liquid Glass (iOS 26+) ou Classic |
| `app/sos.tsx` | Écran SOS urgences avec tri GPS |
| `utils/detectCritical.ts` | Détection situations critiques pour alertes chat IA |

### Play Store — Étapes de publication

1. **Compte EAS** : `npm install -g eas-cli` puis `eas login` (compte Expo requis)
2. **Initialiser le projet EAS** : `eas init` dans `artifacts/service-qc/` → génère un vrai `projectId`
3. **Build production** : `eas build --platform android --profile production` → génère le `.aab`
4. **Google Play Console** : Créer l'application, uploader le `.aab`, remplir fiche (descriptions FR/EN, captures d'écran, politique de confidentialité URL publique)
5. **Soumettre en test interne** d'abord, puis production

### App Store iOS — Étapes de publication

1. **Compte Apple Developer** : 99 USD/an requis
2. **Build iOS** : `eas build --platform ios --profile production`
3. **App Store Connect** : Uploader via EAS Submit ou Transporter

---

### Espace Organisme (artifacts/admin — `/admin/organisme/*`)
- **Routes**: `/organisme/login` (connexion email/mot de passe) et `/organisme/dashboard` (tableau de bord)
- **Auth**: token bearer stocké dans `localStorage` (`az_org_token`), via `/api/mobile-auth/email-login` (le rôle `organisme` est vérifié côté client)
- **Pages**:
  - `OrgLogin.tsx` — formulaire email/mdp, refuse les comptes non-organisme
  - `OrgDashboard.tsx` — bandeau forfait + statut + jours d'essai, 3 cartes stats (vues/appels/clics 30j), histogramme empilé, infos coordonnées en lecture seule, bouton « Gérer mon abonnement » (Stripe billing portal ou checkout)
- **Lib**: `lib/orgAuth.ts` (storage), `lib/orgApi.ts` (fetch `/organisations/me`, `/organisations/me/stats`, `/stripe/billing-portal`, `/stripe/create-checkout-session`)
- Le tri des services dans `/api/services` favorise les organismes Plus actifs (champ `featured`) en tête de liste, avec `badgeVerified` et `organisationId` exposés.

### Admin Panel (artifacts/admin)

- **Type**: React + Vite web app
- **Preview path**: `/admin`
- **Auth**: Clé admin `attentezero-admin-2026` (env var `ADMIN_API_KEY`)
- **Features**:
  - Login avec validation de la clé admin via l'API
  - Tableau de bord : stats totaux (services, actifs, urgents, provinciaux), liste des villes et catégories, graphique en barres
  - Gestion des services : liste paginée (25/page), recherche texte, filtres ville/catégorie/statut
  - Ajout / modification de service (modal complet)
  - Toggle actif/inactif en un clic
  - Suppression avec confirmation
- **API proxy**: `/api/*` → `http://localhost:8080/api/*` (Vite proxy)

### API Server (artifacts/api-server)

- **Type**: Express 5 API
- **Preview path**: `/api`
- **Routes**:
  - `GET /api/healthz` — health check
  - `POST /api/ai/chat` — AI chat (SSE streaming, OpenAI GPT-4o-mini)
  - `POST /api/mobile-auth/email-login` — authentification email/password
  - `POST /api/mobile-auth/register` — création de compte
  - `PATCH /api/mobile-auth/update-profile` — mise à jour profil
  - `GET /api/services` — liste publique des services (mobile app)
  - `GET /api/admin/services` — liste paginée (admin, x-admin-key requis)
  - `GET /api/admin/services/meta` — stats + villes + catégories (admin)
  - `POST /api/admin/services` — créer un service (admin)
  - `PUT /api/admin/services/:id` — modifier un service (admin)
  - `DELETE /api/admin/services/:id` — supprimer (hard) ou désactiver (soft) un service (admin)
  - `POST /api/mobile-auth/logout` — déconnexion
