# 📘 AttenteZéro — Documentation Complète du Projet

**Version** : 1.0.24 (avril 2026)
**Auteur principal** : Dieubon Yves
**Status** : En production / Internal Test Play Store

---

## 🎯 1. Mission & Vision

**AttenteZéro** est une application mobile multilingue conçue pour aider les **personnes vulnérables au Québec** à trouver rapidement des **services communautaires, sociaux et d'urgence**.

### Vision
> Réduire à zéro le temps d'attente entre une situation de détresse et l'accès à une ressource d'aide qualifiée — en français, anglais, espagnol, arabe ou créole haïtien.

### Pourquoi battre 211 ?
- 211 est limité au FR/EN, web seulement, sans app mobile native
- Pas d'IA, pas de SOS dédié, pas d'outils pour intervenants terrain
- AttenteZéro couvre **les 3 piliers** : usagers en détresse + intervenants terrain + organismes communautaires

---

## 🏗️ 2. Architecture Technique

### 2.1 Monorepo (pnpm workspaces)
```
attentezero/
├── artifacts/
│   ├── service-qc/        ← App mobile Expo (React Native)
│   ├── api-server/        ← Backend Express + PostgreSQL
│   ├── admin/             ← Panneau admin (React + Vite)
│   └── mockup-sandbox/    ← Sandbox de prototypage UI
├── lib/
│   ├── db/                ← Schémas Drizzle (PostgreSQL)
│   ├── api-spec/          ← Contrats OpenAPI
│   ├── api-zod/           ← Validation Zod partagée
│   └── api-client-react/  ← Client API généré
├── docs/                  ← Documentation
└── scripts/               ← Scripts de build/déploiement
```

### 2.2 Stack technologique

| Couche | Technologie | Version |
|---|---|---|
| **Mobile** | Expo SDK + React Native | SDK 54+ |
| **Routage mobile** | Expo Router | 6.0 |
| **Animations** | React Native Reanimated + Worklets | v4 |
| **Sécurité tokens** | expo-secure-store + fallback localStorage (web) | — |
| **Backend** | Node.js + Express 5 + TypeScript | Node 24 |
| **Base de données** | PostgreSQL + Drizzle ORM | 16 |
| **Validation** | Zod v4 + drizzle-zod | — |
| **Auth backend** | Sessions JWT + bcrypt | — |
| **Paiements** | Stripe (5 forfaits) | API 2024 |
| **IA** | OpenAI GPT-4o-mini (SSE streaming) | — |
| **Hébergement** | Replit Deployments | — |
| **Build mobile** | EAS Build (Expo) | — |
| **Build manager** | esbuild | — |

---

## 📱 3. Application Mobile (artifacts/service-qc)

### 3.1 Identité
- **Nom** : AttenteZéro
- **Bundle ID iOS / Package Android** : `com.attentezero.app`
- **Slug Expo** : `attentezero`
- **Owner Expo** : `startupayas-organization`
- **Version actuelle** : 1.0.24 (versionCode 24)

### 3.2 Écrans principaux

| Route | Description |
|---|---|
| `/` (index) | Splash animé + redirection login/accueil |
| `/login` | Connexion email + mot de passe |
| `/register` | Inscription **3 rôles** : Personne, Travailleur, Organisme |
| `/forgot-password` + `/reset-password` | Récupération mot de passe (⚠️ envoi email pas branché) |
| `/(tabs)/index` | Accueil : recherche IA, catégories, bouton SOS |
| `/(tabs)/chat` | Chat IA conversationnel (5 langues, streaming) |
| `/(tabs)/services` | Liste 532 services communautaires |
| `/(tabs)/categories` | 10 catégories visuelles |
| `/(tabs)/more` | Profil, abonnement, paramètres, légal |
| `/results` | Résultats de recherche (texte + catégorie) |
| `/service/[id]` | Fiche détaillée d'un service (description, GPS, contact) |
| `/sos` | 5 sections d'urgence (911, hôpital, ambulance, police, pompiers) |
| `/urgent.tsx` | Bouton flottant d'accès rapide |
| `/clients/*` | **CRM clients** (rôle Intervenant+) |
| `/agenda/*` | **Calendrier rendez-vous** (rôle Intervenant+) |
| `/team/*` | **Gestion équipe** (rôle Organisme+) |
| `/premium` | Tarification 5 forfaits Stripe |
| `/legal` | CGU, vie privée |
| `/buying-guide` | Guide d'achat des forfaits |

### 3.3 Contextes React (state global)
- **`AuthContext`** (`lib/auth.tsx`) — Session utilisateur, login, register, logout
- **`LanguageContext`** — Bascule FR/EN/ES/AR/HT, traductions
- **`LocationContext`** — Géolocalisation pour services proches
- **`ServicesContext`** — Cache des 532 services (data statique `data/services.ts`)

### 3.4 Composants partagés
- `AppSplashScreen` — Logo animé teal au démarrage
- `ErrorBoundary` + `ErrorFallback` — Capture des crashs React
- `HomeBannerSlider` — Carrousel SOS/Carte/IA sur l'accueil
- `ServiceCard` — Carte d'un service dans les listes
- `PremiumGateModal` — Modal "Passez Premium" si quota atteint
- `UrgentButton` — Bouton flottant rouge d'urgence

### 3.5 Multilingue
**Langues supportées** : Français (défaut), Anglais, Espagnol, **Arabe**, **Créole Haïtien**.

Le contexte `LanguageContext` charge les traductions à chaud, persiste le choix dans `localStorage`/`SecureStore`, et bascule automatiquement le sens RTL pour l'arabe.

---

## 🗄️ 4. Base de Données (PostgreSQL)

### 4.1 Tables principales (`lib/db/src/schema/`)

| Table | Rôle |
|---|---|
| `auth` (users) | Comptes utilisateurs, hash mot de passe, rôle, premium |
| `services` | 532 services communautaires (pré-seeded) |
| `conversations` | Conversations chat IA |
| `messages` | Messages individuels avec quota tracking |
| `organisations` | Organismes payants (forfait, ville, plan) |
| `organisation_members` | Membres d'un organisme avec rôle (owner/admin/member) |
| `clients` | Carnet clients d'un intervenant |
| `appointments` | Rendez-vous client/intervenant |

### 4.2 Migrations
Drizzle Kit avec `db:push --force` pour sync schéma. Migrations automatiques au démarrage de l'API.

---

## 🔐 5. Authentification & Sécurité

### 5.1 Flux d'auth mobile
1. POST `/api/mobile-auth/register` ou `/email-login` → renvoie `{ token, user }`
2. Token stocké dans **expo-secure-store** (Keystore Android / Keychain iOS) ou **localStorage** (web)
3. Toutes les requêtes authentifiées → `Authorization: Bearer <token>`
4. Middleware `authMiddleware` vérifie le token et injecte `req.user`

### 5.2 Hardening sécurité (avril 2026)
- ✅ `helmet` (CSP, HSTS, etc.)
- ✅ `express-rate-limit` (anti-brute force)
- ✅ CORS restrictif (whitelist domaines `.replit.dev`, `.replit.app`)
- ✅ `trust proxy 1` (Replit edge)
- ✅ Body limit 1 MB
- ✅ Secrets jamais loggés
- ✅ `/forgot-password` ne révèle plus si l'email existe
- ✅ Clé admin obligatoire en HEADER (jamais en query string)
- ⚠️ **Reset password : envoi email pas connecté** (Resend/Brevo à brancher)

---

## 💳 6. Monétisation Stripe

### 6.1 Les 5 forfaits

| Forfait | Prix/mois | Cible | Fonctionnalités clés |
|---|---|---|---|
| **Personne** | Gratuit | Usagers grand public | 5 messages IA/jour, accès tous services, SOS |
| **Travailleur (Intervenant)** | 19$ | Travailleurs de rue, soc. | + Clients illimités + Agenda + IA illimitée |
| **Organisme Standard** | 39$ | OBNL petits | + Équipe (jusqu'à 5 membres) + statistiques |
| **Plus** | 89$ | OBNL moyens | + Rappels SMS + analytics avancés + exports |
| **Institution** | 199$ | CIUSSS, gros OBNL | + Multi-équipes + import CSV + intégrations |

### 6.2 Flux paiement
1. App → `POST /api/stripe/create-checkout` → URL Stripe Checkout
2. Utilisateur paie sur Stripe → webhook `/api/stripe/webhook` met à jour `users.isPremium` + `organisations.plan`
3. Retour app → polling `refreshUser` 6× sur 12s pour gérer la latence webhook
4. **Portail client** : `/api/stripe/user-portal` (auth obligatoire) ouvre le portail pour gérer/annuler

---

## 🤖 7. Chat IA

### 7.1 Architecture
- Modèle : **OpenAI GPT-4o-mini** (proxy Replit AI Integrations, pas de clé API requise)
- Streaming : **Server-Sent Events (SSE)** pour réponses progressives
- Détection de crise : pattern matching + classification GPT pour détecter idéations suicidaires, violence conjugale, danger immédiat
- Réponses humanisées : ton bienveillant, propose des ressources locales

### 7.2 Quota
- **Gratuit** : 5 messages/jour (reset minuit)
- **Premium (tous forfaits payants)** : illimité
- Headers HTTP : `X-AI-Quota-Limit`, `X-AI-Quota-Remaining`
- Au quota dépassé : HTTP 429 + `{ quotaExceeded: true }` → modal upgrade

### 7.3 Prompts rapides (par langue)
Chaque langue a ses propres suggestions cliquables sur l'écran chat (ex : « J'ai besoin d'un logement ce soir » / « Necesito ayuda alimentaria »).

---

## 🆘 8. Module SOS (Urgences)

5 catégories d'urgence sur l'écran `/sos` :
1. **911** — Bouton appel direct
2. **Hôpitaux** — Triés par distance GPS réelle (geolocation)
3. **Ambulance** — Numéros régionaux
4. **Police** — Postes locaux
5. **Pompiers** — Casernes

Chaque entrée a : nom, téléphone (tap-to-call), adresse, distance calculée.

---

## 🛠️ 9. Backend API (artifacts/api-server)

### 9.1 Routes principales

| Préfixe | Description |
|---|---|
| `/api/auth/*` | Auth web (sessions cookie) |
| `/api/mobile-auth/*` | Auth mobile (JWT bearer) |
| `/api/services/*` | Liste/recherche services (public) |
| `/api/ai/*` | Chat IA streaming + quota |
| `/api/clients/*` | CRUD clients (Intervenant+) |
| `/api/appointments/*` | CRUD rendez-vous (Intervenant+) |
| `/api/organisations/*` | Gestion organisme (Organisme+) |
| `/api/team/*` | Membres d'équipe (Organisme+) |
| `/api/stripe/*` | Checkout, webhooks, portail client |
| `/api/transcribe/*` | Speech-to-text (préparation saisie vocale) |
| `/api/verifications/*` | Vérification email |
| `/api/admin/*` | Endpoints admin (clé header obligatoire) |
| `/api/health` | Healthcheck |

### 9.2 Démarrage
- Build : `pnpm --filter @workspace/api-server run build` (esbuild → `dist/index.mjs`)
- Run : `node --enable-source-maps dist/index.mjs`
- Port : variable `PORT` (8080 en local Replit)
- Migrations exécutées au démarrage

---

## 🎨 10. Panneau Admin (artifacts/admin)

App **React + Vite** servie sur `/admin/` par l'API server.

### Fonctionnalités
- Authentification par clé admin (header `X-Admin-Key`)
- Tableau de bord global (utilisateurs, conversations, abonnements)
- **OrgDashboard** : vue par organisme avec section « Avantages de votre forfait » + carte d'upsell
- Gestion des services (CRUD admin sur les 532 entrées)
- Modération des messages chat
- Statistiques d'usage IA par jour/utilisateur

---

## 📦 11. Build & Déploiement

### 11.1 Backend (Replit Deployments)
- Push automatique au merge → déploiement
- URL prod : `https://quebec-aid-finder.replit.app`
- Domaine custom possible (à configurer)

### 11.2 Mobile (EAS Build)
**Profils dans `eas.json`** :
- `development` — APK debug pour test interne
- `preview` — APK signé pour QA
- `production` — AAB signé pour Play Store

**Variables d'env build** :
- `EXPO_ROUTER_APP_ROOT=./app` (chemin routes)
- Babel : plugin `react-native-worklets/plugin` (Reanimated v4)

**Commande** :
```powershell
cd artifacts\service-qc
eas build --profile production --platform android
```

### 11.3 Play Store (Internal Test)
- Console : Google Play Console
- Track : Internal testing (3 testeurs configurés)
- Lien d'opt-in propagé via email Play Store
- Mises à jour : nouveau AAB → upload → propagation 5-15 min

### 11.4 Keystore
- Géré par EAS (jamais en local)
- SHA1 : `49:FD:00:65:B8:8F:82:82:2B:C5:8E:AC:86:86:AB:09:3E:40:34:A1`
- ⚠️ Mots de passe à ROTER (`eas credentials`)

---

## 🌍 12. Couverture Géographique

**Phase 1 (actuelle)** : 4 villes, 532 services
- Trois-Rivières
- Shawinigan
- Drummondville
- Victoriaville

**Phase 2 (roadmap)** : Montréal, Québec, Sherbrooke, Gatineau, Saguenay
**Phase 3** : Tout le Québec (~1500 villes/villages)

---

## 🚀 13. Roadmap

### Court terme (déjà en cours)
- ✅ AAB v24 publié sur Internal Test
- ⏳ Validation utilisateurs internes (testeurs)
- ⏳ Brancher service email pour reset password (Resend/Brevo)
- ⏳ Production track Play Store

### Moyen terme (1-3 mois)
- Saisie **vocale** dans le chat IA (Whisper + transcribe.ts déjà préparé)
- **Favoris** + historique de recherches
- **Mode sombre** + tailles de police accessibles
- Filtre **ville/quartier** ultra-rapide (compense l'absence de carte)
- Notifications push (rappels RDV)

### Long terme (6-12 mois)
- Extension Phase 2 (Montréal, Québec)
- Système d'**avis et notes** des services
- **Application iOS** (build EAS pour iOS App Store)
- API publique pour partenaires (CLSC, Centraide)
- Tableau de bord institutionnel pour CIUSSS

---

## 🧪 14. Tests & Qualité

- **TypeScript strict** : `pnpm run typecheck` couvre tout le monorepo
- **Build vérifié** : esbuild + Metro bundler (1571 modules web)
- **Validation runtime** : Zod sur toutes les inputs API
- **Sentry/Logs** : Pino structured logs + source maps en prod
- **Tests E2E** : Playwright (à étendre)

---

## 📞 15. Support & Contact

- **Compte Expo** : `startupayas-organization` (login: dieubonyves@gmail.com)
- **Compte Google Play Console** : (votre compte développeur)
- **Compte Stripe** : Dashboard avec 5 produits configurés
- **Repo Replit** : workspace principal en TypeScript/pnpm

---

## ⚖️ 16. Légal & Conformité

- **CGU** : page `/legal` dans l'app
- **Vie privée** : conforme RGPD/Loi 25 Québec
- **Données utilisateurs** : stockées au Canada (Replit infra)
- **Paiements** : PCI-DSS via Stripe (jamais de carte stockée localement)
- **Rétention** : 90 jours pour conversations supprimées, conformité demandes d'effacement

---

## 🎓 17. Lexique

| Terme | Définition |
|---|---|
| **Usager / Personne** | Utilisateur grand public (forfait gratuit) |
| **Intervenant / Travailleur** | Professionnel terrain (TS, infirmier, travailleur de rue) — 19$/mois |
| **Organisme** | OBNL communautaire — 39$/mois et + |
| **AAB** | Android App Bundle (format Google Play) |
| **EAS** | Expo Application Services (build cloud) |
| **versionCode** | Entier croissant unique exigé par Play Store à chaque upload |
| **211** | Service téléphonique de référencement communautaire (concurrent historique) |

---

*Dernière mise à jour : avril 2026 — version 1.0.24*
