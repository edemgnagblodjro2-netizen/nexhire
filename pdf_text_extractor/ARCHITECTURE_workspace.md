# Architecture — AgentHub Platform
## myportal.nexhire.ca → Plateforme modulaire Core + Apps

**Version :** 3.0 — 2026-06-25  
**Statut : GELÉE** — Aucun changement d'architecture sans problème majeur identifié.  
Toute nouvelle idée (marketplace, modules supplémentaires) va en roadmap.

---

## Vision

**AgentHub Platform** est le produit.  
**Workspace** est l'expérience utilisateur exposée aux partenaires et à leurs membres.

- Les URLs, tables et modules sont nommés en termes de **Platform**
- L'expérience **Workspace** est un composant de la Platform, pas l'inverse
- Dans 2 ans, la Platform aura 10+ apps ; le Workspace sera une vue parmi d'autres

---

## Structure Platform : Core + Apps

```
AgentHub Platform
      │
      ├── Core  (services partagés — non visibles dans le catalogue)
      │     ├── Auth & JWT
      │     ├── RBAC
      │     ├── Billing
      │     ├── Organizations
      │     ├── Connectors
      │     ├── Notifications
      │     ├── AI Engine        ← prompts, modèles, conversations, scoring, recommandations
      │     └── PDF Engine       ← génération de rapports via WeasyPrint/Jinja2
      │
      └── Apps  (modules installables — catalogue Workspace)
              ├── 📊 Diagnostic IA          [v1.0 — disponible]   ← première app du Parcours IA
              ├── 🔭 Observatoire IA        [v0.9 — bientôt]      ← suite du Parcours IA
              ├── ⚖️  Gouvernance IA         [v0.5 — bientôt]
              ├── 🤖 Optimisation M365      [v0.5 — bientôt]
              ├── 👥 RH Intelligence        [v0.1 — bientôt]
              └── 💰 Finance Intelligence   [v1.0 — bientôt]
```

### Vocabulaire — Parcours IA vs Diagnostic IA

**Parcours IA** = le produit complet, l'expérience utilisateur de bout en bout :

```
Parcours IA (produit)
      │
      ├── Diagnostic IA    → app : évaluation IMAI /100  [S2 — MVP]
      ├── Roadmap IA       → app : plan d'action personnalisé        [Phase 2]
      ├── Suivi IA         → app : mesure des progrès               [Phase 2]
      └── Observatoire IA  → app : benchmark sectoriel anonymisé    [Phase 2]
```

**Diagnostic IA** = la première application du Parcours IA.  
Slug : `diagnostic-ia` — URL : `/workspace/{slug}/diagnostic-ia`

Cette séparation permet d'enrichir le Parcours IA (ajouter Roadmap, Suivi…) sans renommer l'existant.

---

## Hiérarchie métier

```
Partner                    ← CCI3R, Chambre Québec, réseau sectoriel…
    │
    ├── Organization        ← PME membre du partenaire
    │       ├── User
    │       └── User
    │
    └── Organization
            └── User
```

Un partenaire n'est pas un client du produit Enterprise.  
C'est un distributeur de la Platform auprès de ses membres (organisations).

---

## Catalogue d'applications — expérience Workspace

Même avec une seule app disponible, le Workspace affiche le catalogue complet.  
Cela communique immédiatement l'identité plateforme.

```
┌──────────────────────────────────────────────────────────────┐
│  AgentHub Platform · CCI3R                          [Admin] │
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│  Applications  │  Contenu de l'app active                   │
│  ──────────    │                                             │
│  📊 Diagnostic │                                             │
│     IA      ✓  │  [App montée ici dynamiquement]            │
│  ──────────    │                                             │
│  🔭 Observ.    │                                             │
│     (Bientôt)  │                                             │
│  ──────────    │                                             │
│  ⚖️  Gouver.    │                                             │
│     (Bientôt)  │                                             │
│  ──────────    │                                             │
│  🤖 M365       │                                             │
│     (Bientôt)  │                                             │
│                │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

Le sidebar est généré par `GET /api/workspace/{slug}/apps` → vue `workspace_catalog`.  
Chaque item a un `catalog_status` : `installed` | `coming_soon` | `available` | `available_beta`.

---

## Contrat d'une application Platform

**Règle :** Toute nouvelle application DOIT implémenter ce contrat.  
Le noyau de la Platform ne doit jamais être modifié pour accueillir une app.

### Contrat DB (app_registry)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `slug` | text PK | ✅ | Identifiant stable, kebab-case, immuable |
| `name` | text | ✅ | Nom affiché dans le catalogue |
| `description` | text | ✅ | Description courte (1 phrase) |
| `icon` | text | ✅ | Emoji ou URL SVG |
| `version` | text | ✅ | Semver simplifié (ex: `'1.0'`) |
| `status` | enum | ✅ | `available` \| `coming_soon` \| `beta` \| `deprecated` |
| `permissions` | jsonb | ✅ | `{"min_role": "user", "min_plan": "starter"}` |
| `dependencies` | jsonb | ✅ | `{"core": ["ai-engine"], "apps": []}` |
| `category` | enum | ✅ | `evaluation` \| `governance` \| `analytics` \| etc. |
| `entry_path` | text | ✅ | `/workspace/{slug}/{app-slug}` |
| `sort_order` | integer | ✅ | Ordre dans le catalogue |

**Exemple — Diagnostic IA v1.0 :**
```json
{
  "slug": "diagnostic-ia",
  "version": "1.0",
  "permissions": {"min_role": "user", "min_plan": "starter"},
  "dependencies": {"core": ["ai-engine", "notifications", "pdf-engine"], "apps": []}
}
```

**Exemple — Observatoire (dépend d'une autre app) :**
```json
{
  "slug": "observatoire",
  "version": "0.9",
  "dependencies": {"core": ["ai-engine"], "apps": ["diagnostic-ia"]}
}
```

`routes_workspace.py` vérifiera les dépendances `core` et `apps` lors de l'installation d'une app.

### Contrat JS (static/apps/{slug}/main.js)

```javascript
// Toute app Platform DOIT exporter ce contrat.
// Le shell workspace.js ne sait rien de l'app — il appelle mount() et unmount().
export default {
  // Identité — doit correspondre à app_registry
  slug:        'parcours-ia',
  name:        'Parcours IA PME',
  version:     '1.0',

  // Montage dans le container fourni par le shell
  // context = { partnerSlug, partnerConfig, user, appConfig }
  mount(container, context) {
    // Rendre l'UI de l'app dans container
    // Enregistrer les event listeners
    // Appeler les APIs /api/{app-slug}/*
  },

  // Nettoyage avant navigation vers une autre app
  unmount(container) {
    container.innerHTML = '';
    // Libérer les ressources (timers, listeners, streams)
  },
};
```

### Naviguer vers une app (workspace.js)

```javascript
async function navigateTo(partnerSlug, appSlug) {
  // 1. Vérifier catalog_status === 'installed'
  // 2. Unmount app précédente si présente
  // 3. Import dynamique du module
  const module = await import(`/static/apps/${appSlug}/main.js`);
  // 4. Mount dans le container
  module.default.mount(document.getElementById('app-container'), {
    partnerSlug,
    partnerConfig: currentPartner,   // branding, couleurs
    user:          currentUser,
    appConfig:     currentApp.config, // config spécifique installée
  });
  // 5. Mettre à jour l'URL et le sidebar actif
  history.pushState({}, '', `/workspace/${partnerSlug}/${appSlug}`);
}
```

---

## Un seul produit — stratégie d'évolution

`myportal.nexhire.ca` est et restera **le produit AgentHub Platform**.  
Il n'y a pas deux produits — il y a un produit qui évolue.

```
myportal.nexhire.ca  (aujourd'hui → demain)
│
├── /                    → Auth (login / signup)
│
├── /app                 → CODE LEGACY — ne pas agrandir, ne pas maintenir
│   └── index.html/app.js → SPA actuelle (14k lignes) pour clients existants
│                           Sera dépréciée à mesure que /workspace mûrit
│
└── /workspace/{slug}    → AgentHub Platform — LE FUTUR du portail
    ├── workspace.html   → Shell du portail (tous les utilisateurs, à terme)
    ├── workspace.js     → Navigation + catalogue + lazy loading
    │
    └── /static/apps/    → Toutes les apps de la Platform
        ├── parcours-ia/ → App 1 : Parcours IA PME           [S2 — partenaires]
        ├── finance/     → App 2 : Finance Intelligence       [migration Enterprise]
        ├── agent/       → App 3 : Agent IA                   [migration Enterprise]
        ├── connectors/  → App 4 : Connecteurs                [migration Enterprise]
        ├── observatoire/→ App 5 : Observatoire IA            [Phase 2]
        └── ...
```

**Règle 1 :** Ne jamais ajouter de code dans `app.js` ou `index.html`.  
**Règle 2 :** Toute nouvelle fonctionnalité = une app dans `/static/apps/`.  
**Règle 3 :** Les clients Enterprise migreront vers `/workspace/{org-slug}` à mesure que leurs apps sont portées.

### Chemin de migration progressive

```
Phase 1 (maintenant) : Parcours IA PME dans /workspace — partenaires CCI3R
Phase 2              : 2e et 3e apps Workspace
Phase 3              : Migration des premières apps Enterprise (Finance, Agent)
Phase 4              : Dépréciation de /app — tous les clients sur /workspace
```

Le rythme de migration est dicté par les clients, pas par un calendrier arbitraire.

---

## Schéma DB

### Ordre d'exécution obligatoire

```
1. phase42_platform_core.sql    → partners, app_registry, installed_apps, workspace_catalog
2. phase41_diagnostic_workspace.sql  → diagnostic_sessions, diagnostic_answers, diagnostic_benchmarks
```

### Tables Core (phase42)

| Table | Rôle |
|-------|------|
| `partners` | Entité Core — partenaires de la Platform |
| `organizations.partner_id` | FK — une org appartient à un partenaire |
| `users.partner_id` | FK — workspace_admin = `owner` + `partner_id IS NOT NULL` |
| `app_registry` | Catalogue complet des apps (Core + App) |
| `installed_apps` | Apps activées par partenaire + config |
| `workspace_catalog` (vue) | Catalogue complet avec `catalog_status` par partenaire |
| `platform_hierarchy` (vue) | Partner → Org → User count |

### Tables App Parcours IA (phase41)

| Table | Rôle |
|-------|------|
| `diagnostic_sessions` | Session par entreprise |
| `diagnostic_answers` | Réponses par question |
| `diagnostic_benchmarks` | Agrégats anonymisés |
| `diagnostic_partner_stats` (vue) | Stats agrégées par partenaire |

---

## Gestion des rôles

| Rôle | Qui | Comment détecté |
|------|-----|-----------------|
| `superadmin` | CivicAI | Email dans `SUPERADMIN_EMAILS` |
| `workspace_admin` | Admin CCI3R | `role='owner'` + `partner_id IS NOT NULL` |
| `org_owner` | DG d'une PME | `role='owner'`, `organization_id` défini |
| `org_user` | Employé PME | `role='user'`, `organization_id` défini |
| `participant` | PME anonyme | Aucun compte — session UUID créée à la volée |

---

## API Platform Workspace (S1)

```
GET  /api/workspace/{slug}           → Info partenaire + validation is_active
GET  /api/workspace/{slug}/apps      → workspace_catalog filtrée pour ce partenaire
GET  /api/workspace/{slug}/config    → Branding (logo, couleurs, nom)
```

Réponse `GET /api/workspace/{slug}/apps` :
```json
{
  "partner": { "slug": "cci3r", "name": "CCI3R", "primary_color": "#1d4ed8" },
  "apps": [
    {
      "slug": "parcours-ia",
      "name": "Parcours IA PME",
      "icon": "📊",
      "catalog_status": "installed",
      "entry_path": "/workspace/cci3r/parcours-ia",
      "version": "1.0"
    },
    {
      "slug": "observatoire",
      "name": "Observatoire IA",
      "icon": "🔭",
      "catalog_status": "coming_soon",
      "entry_path": null,
      "version": "0.9"
    }
  ]
}
```

---

## Plan de développement

### S1 — Socle Platform (~6h30) ← PROCHAIN

| Ordre | Tâche |
|-------|-------|
| 1 | Exécuter `phase42_platform_core.sql` dans Supabase |
| 2 | Exécuter `phase41_diagnostic_workspace.sql` dans Supabase |
| 3 | `routes_workspace.py` — 3 endpoints + logique catalog_status |
| 4 | `static/workspace.html` — shell (~200 lignes) |
| 5 | `static/workspace.js` — navigation + catalogue + lazy loading |
| 6 | Enregistrer `/workspace/{slug}` dans `main.py` |

### S2 — App Parcours IA PME

Agent Atlas, scoring IMAI, PDF, dashboard CCI3R.

---

## Roadmap (idées futures — ne pas implémenter maintenant)

- Marketplace public d'apps (Phase 3)
- custom_domain par partenaire (`agenthub.cci3r.qc.ca`)
- API webhook pour événements app (app_installed, session_completed)
- Tableau de bord superadmin multi-partenaires
- Facturation par app (billing à la carte)

---

*CivicAI Inc. · Architecture AgentHub Platform v3.0 · GELÉE*
