# Guide de contribution — AgentHub Platform

## Classification des données AgentHub

Toute donnée affichée dans AgentHub appartient à l'une des quatre catégories suivantes. Les catégories 2, 3 et 4 ne doivent **jamais** être codées en dur.

---

### Niveau 1 — Métadonnée Produit ✅ Statique autorisée

Listes définissant ce que la plateforme **supporte** — pas ce qu'une organisation a configuré.

Exemples : connecteurs supportés, fournisseurs SSO disponibles, frameworks de gouvernance, modèles de templates, plans tarifaires, catégories de contrats, types d'actifs TI.

```js
// ✅ Acceptable — définit ce que le produit supporte
const CONNECTOR_META = { microsoft365: { icon: '☁️', label: 'Microsoft 365' }, ... };
const SSO_PROVIDERS  = ['entra', 'google', 'okta'];
```

---

### Niveau 2 — Configuration Organisation ✅ Persistée en base

Ce qu'une organisation a activé ou configuré. Doit venir de l'API ou de la base de données.

Exemples : fournisseurs SSO activés, MFA activé, connecteurs installés, paramètres IA, couleurs du workspace.

```js
// ❌ Interdit
const ssoEnabled = true;

// ✅ Correct
const { sso_config } = await fetch('/api/sso/config').then(r => r.json());
```

---

### Niveau 3 — Donnée Métier ✅ Toujours issue de PostgreSQL, API ou connecteur

Données produites par l'activité réelle d'une organisation.

Exemples : utilisateurs, contrats, actifs TI, workflows, recommandations, KPI plateforme, budget, pipeline commercial, sessions de diagnostic, alertes de sécurité.

```js
// ❌ Interdit
const MOCK_USERS = [{ name: 'Alice', role: 'admin' }, ...];

// ✅ Correct
const users = await fetch('/api/users').then(r => r.json());
```

---

### Niveau 4 — Donnée Calculée ✅ Toujours le résultat d'un calcul

Scores, ratios et indicateurs dérivés de données réelles.

Exemples : IMAI, ROI, score d'efficacité, adoption MFA, score de conformité, utilisation IA, santé plateforme.

```js
// ❌ Interdit
const score = 82;
const adoption = '67%';

// ✅ Correct
const { efficiency_score } = await fetch('/api/optimization/efficiency-score').then(r => r.json());
const adoption = users_with_mfa / total_users * 100;
```

---

## Règle de Pull Request

> **Toute Pull Request introduisant une donnée métier simulée sera refusée.**

Checklist avant de soumettre une PR :

- [ ] Aucun `MOCK_*`, `DEMO_*`, `FAKE_*`, `SAMPLE_*` dans le code
- [ ] Aucun tableau `const data = [{ ... }]` contenant des données métier
- [ ] Aucun KPI numérique écrit en dur dans une fonction de rendu (`const score = 87`)
- [ ] Aucun compteur statique dans le HTML/JS (`42 utilisateurs`, `6.1s`)
- [ ] Toute configuration organisation chargée depuis `/api/*`
- [ ] Les états vides affichent un message clair + une action (`Créer`, `Importer`, `Configurer`)

---

## Pattern état vide

Quand une donnée n'existe pas encore, afficher un état vide honnête — jamais de données fictives.

```js
// ✅ Correct
if (!data.length) {
  return `<div class="empty-state">
    <div>Aucun actif enregistré.</div>
    <button onclick="openCreateModal()">Ajouter un actif →</button>
  </div>`;
}
```

---

## Données statiques autorisées (Niveau 1)

Les constantes suivantes sont des métadonnées produit et peuvent être définies statiquement dans les modules frontend :

| Constante | Module | Justification |
|-----------|--------|---------------|
| `CONNECTOR_META` | marketplace, integrations | Catalogue des connecteurs que la plateforme supporte |
| `DEVICE_TYPES` | assets | Types d'actifs TI supportés |
| `FRAMEWORKS` | gouvernance | Référentiels de conformité publiés (ISO 27001, NIST…) |
| `PLANS` | billing | Plans tarifaires du produit |
| `TRIGGER_TYPES` | automation | Types de déclencheurs supportés |
| `MFA_METHODS` | sso-mfa | Méthodes MFA supportées par la plateforme |
| `CATEGORY_LABELS` | contracts, budget | Catégories définies par le produit |

---

## Architecture de données

```
Frontend module
    └── fetch('/api/...')          ← données Niveau 2/3/4
         └── FastAPI route
              └── PostgreSQL (Supabase)
                   └── données réelles
```

Les modules frontend ne doivent **jamais** être la source de vérité pour des données de Niveau 2, 3 ou 4.
