# AgentHub Platform — Design System v1.0

> **Règle fondamentale :** Toute valeur de couleur, espacement, rayon ou ombre doit utiliser une variable CSS définie dans ce système. Aucune valeur hardcodée dans les fichiers applicatifs.

Le fichier source de vérité est `static/design-system.css`.  
Ce document est la référence humaine.

---

## Gouvernance du Design System

### La règle d'or

> **Toute nouvelle couleur, tout nouveau composant ou toute nouvelle animation doit d'abord être ajouté au Design System avant d'être utilisé dans une application.**

Cette contrainte paraît lourde. Elle est la raison pour laquelle Microsoft 365, Atlassian, Notion, Linear et Shopify gardent une cohérence visuelle remarquable sur des dizaines d'applications.

### Processus de contribution

| Besoin | Action |
|---|---|
| Utiliser une couleur existante | Utiliser `var(--nom-du-token)` directement |
| Utiliser un composant existant | Utiliser la classe `.ds-*` directement |
| Besoin d'une couleur absente | Proposer l'ajout dans `design-system.css` + documenter ici |
| Besoin d'un composant absent | Créer `.ds-nouveau-composant` dans `design-system.css` + documenter ici |
| Cas unique non réutilisable | Classe applicative (`.gov-*`, `.rpt-*`...) avec valeurs **via variables** |

### Ce qui est interdit

```css
/* ❌ Couleur hardcodée */
.mon-bouton { background: #7c3aed; }

/* ✅ Via le design system */
.mon-bouton { background: var(--primary); }

/* ❌ Keyframe personnalisé pour spinner */
@keyframes mon-spin { to { transform: rotate(360deg); } }
.mon-spinner { animation: mon-spin .7s linear infinite; }

/* ✅ Keyframe partagé */
.mon-spinner { width:18px; height:18px; border:2px solid var(--border);
  border-top-color: var(--primary); border-radius: 50%;
  animation: ds-spin .65s linear infinite; }

/* ❌ Nouvelle couleur inventée */
.alerte { background: #ffedd5; color: #9a3412; }

/* ✅ Couleur sémantique existante */
.alerte { background: var(--color-warn-soft); color: var(--color-warn-on); }
```

---

---

## Couleurs

### Primary (brand)
| Token | Valeur | Usage |
|---|---|---|
| `--primary` | `#7c3aed` | Boutons principaux, onglets actifs, liens d'action |
| `--primary-dk` | `#6d28d9` | Hover du bouton primaire |
| `--primary-lt` | `#ede9fe` | Fond doux, badge primaire |
| `--primary-a10` | `rgba(124,58,237,.10)` | Focus ring (box-shadow) |

> La couleur primaire est **surchargée dynamiquement** par la couleur du partenaire via `document.documentElement.style.setProperty('--primary', partner.primary_color)`. Ne jamais hardcoder `#7c3aed` dans les apps.

### Success (vert)
| Token | Valeur | Usage |
|---|---|---|
| `--color-ok` | `#10b981` | Icône, anneau, point de statut |
| `--color-ok-bg` | `#dcfce7` | Fond de badge |
| `--color-ok-text` | `#16a34a` | Texte de badge |
| `--color-ok-soft` | `#ecfdf5` | Fond de hero/panneau (ex: app Automatisations) |
| `--color-ok-border` | `#6ee7b7` | Bordure de hero/panneau |
| `--color-ok-on` | `#064e3b` | Texte sur fond vert clair |

### Warning (ambre)
| Token | Valeur | Usage |
|---|---|---|
| `--color-warn` | `#f59e0b` | Icône, point de statut |
| `--color-warn-bg` | `#fef9c3` | Fond de badge |
| `--color-warn-text` | `#ca8a04` | Texte de badge |
| `--color-warn-soft` | `#fef3c7` | Fond de hero/panneau (ex: app Knowledge Hub) |
| `--color-warn-border` | `#fde68a` | Bordure de hero/panneau |
| `--color-warn-on` | `#78350f` | Texte sur fond ambre clair |

### Danger (rouge)
| Token | Valeur | Usage |
|---|---|---|
| `--color-err` | `#ef4444` | Icône d'erreur, bouton destructif |
| `--color-err-bg` | `#fee2e2` | Fond de badge |
| `--color-err-text` | `#dc2626` | Texte de badge |
| `--color-err-soft` | `#fef2f2` | Fond de panel d'erreur |
| `--color-err-border` | `#fca5a5` | Bordure de panel d'erreur |
| `--color-err-on` | `#7f1d1d` | Texte sur fond rouge clair |

### Info (bleu)
| Token | Valeur | Usage |
|---|---|---|
| `--color-info` | `#0ea5e9` | Icône info |
| `--color-info-bg` | `#e0f2fe` | Fond de badge |
| `--color-info-text` | `#0369a1` | Texte de badge |
| `--color-info-soft` | `#eff6ff` | Fond de hero/panneau (ex: app M365 Optimizer) |
| `--color-info-border` | `#bfdbfe` | Bordure de hero/panneau |
| `--color-info-on` | `#1e3a8a` | Texte sur fond bleu clair |

### Surface & Background
| Token | Valeur | Usage |
|---|---|---|
| `--surface` / `--bg` | `#f8fafc` | Fond de page (Slate-50) |
| `--bg-2` | `#f1f5f9` | Fond de panneau, section sidebar (Slate-100) |
| `--card` | `#ffffff` | Fond de carte, modal |

### Bordures
| Token | Valeur | Usage |
|---|---|---|
| `--border` | `#e2e8f0` | Bordures externes de cartes, inputs (Slate-200) |
| `--border-2` | `#f1f5f9` | Séparateurs internes, lignes de tableau (Slate-100) |

### Texte
| Token | Valeur | Usage |
|---|---|---|
| `--text` | `#0f172a` | Titres de page, texte fort (Slate-900) |
| `--text-2` | `#475569` | Navigation, breadcrumb, UI secondaire (Slate-600) |
| `--text-body` | `#334155` | Corps de texte, contenu de carte (Slate-700) |
| `--text-sub` | `#64748b` | Sous-titres, descriptions (Slate-500) |
| `--muted` | `#94a3b8` | Timestamps, en-têtes de tableau, placeholders (Slate-400) |

---

## Typographie

| Rôle | Taille | Poids | Token |
|---|---|---|---|
| Titre de page | 22px | 700 | `.ds-page-title` |
| Sous-titre de page | 13px | 400 | `.ds-page-sub` |
| Titre de section | 14px | 700 | `.ds-section-title` |
| Corps de texte | 13px | 400 | `var(--text-body)` |
| Label de formulaire | 11px | 600, uppercase | `.ds-form-label` |
| Texte de badge | 11px | 600 | `.ds-badge` |
| Texte de tableau (header) | 10px | 600, uppercase | `.ds-table th` |
| Timestamp / helper | 12px | 400 | `var(--muted)` |

**Font stack :** `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` → `var(--font)`

---

## Espacements (échelle 4pt)

| Token | Valeur | Usage type |
|---|---|---|
| `--sp-1` | 4px | Gap interne très serré |
| `--sp-2` | 8px | Gap entre éléments proches |
| `--sp-3` | 12px | Padding compact |
| `--sp-4` | 16px | Padding standard |
| `--sp-5` | 20px | Padding de carte secondaire |
| `--sp-6` | 24px | Padding de carte principale |
| `--sp-8` | 32px | Padding de page / section |
| `--sp-10` | 40px | Padding de hero |
| `--sp-12` | 48px | Espacement de section majeure |

---

## Rayons (border-radius)

| Token | Valeur | Usage |
|---|---|---|
| `--r-sm` | 4px | Code inline, petits éléments |
| `--r` | 8px | Boutons, inputs |
| `--r-md` | 10px | Conteneurs de liste |
| `--r-lg` | 12px | Cartes standard |
| `--r-xl` | 16px | Cartes proéminentes, modals |
| `--r-2xl` | 20px | Sections hero |
| `--r-pill` | 99px | Badges, tags |

---

## Ombres

| Token | Valeur | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,.06)` | Élévation légère |
| `--shadow` | `0 4px 16px rgba(0,0,0,.08)` | Cartes flottantes, modals |
| `--shadow-primary` | `0 4px 16px rgba(124,58,237,.12)` | Hover sur cartes interactives |

---

## Composants disponibles

### `.ds-spinner` — Indicateur de chargement
```html
<div class="ds-spinner"></div>
<div class="ds-spinner ds-spinner-sm"></div>
<div class="ds-spinner ds-spinner-lg"></div>
```
Animation partagée : `@keyframes ds-spin`. Les apps ne doivent **pas** définir leurs propres keyframes de rotation.

### `.ds-btn` — Boutons
```html
<button class="ds-btn ds-btn-primary">Action</button>
<button class="ds-btn ds-btn-outline">Secondaire</button>
<button class="ds-btn ds-btn-ghost">Fantôme</button>
<button class="ds-btn ds-btn-danger ds-btn-sm">Supprimer</button>
```

### `.ds-badge` — Badges de statut
```html
<span class="ds-badge ds-badge-ok">✓ Actif</span>
<span class="ds-badge ds-badge-warn">◐ En cours</span>
<span class="ds-badge ds-badge-err">✗ Erreur</span>
<span class="ds-badge ds-badge-info">ℹ Info</span>
<span class="ds-badge ds-badge-primary">Plan Pro</span>
<span class="ds-badge ds-badge-neutral">Désactivé</span>
<span class="ds-badge ds-badge-soon">Bientôt</span>
```

### `.ds-card` — Cartes
```html
<div class="ds-card">Carte blanche standard</div>
<div class="ds-card-muted">Carte grise secondaire</div>
<div class="ds-card-featured">Carte accentuée (bordure primary)</div>
```

### `.ds-tabs` + `.ds-tab` — Navigation par onglets
```html
<div class="ds-tabs">
  <button class="ds-tab ds-tab-active" data-tab="a">Onglet A</button>
  <button class="ds-tab" data-tab="b">Onglet B</button>
</div>
```

### `.ds-table-wrap` + `.ds-table` — Tableaux de données
```html
<div class="ds-table-wrap">
  <table class="ds-table">
    <thead><tr><th>Nom</th><th>Statut</th></tr></thead>
    <tbody><tr><td class="ds-table-name">Item</td><td>...</td></tr></tbody>
  </table>
</div>
```

### `.ds-form-grid` — Formulaires
```html
<div class="ds-form-grid">
  <div class="ds-form-field">
    <label class="ds-form-label">Champ *</label>
    <input class="ds-input" placeholder="...">
  </div>
  <div class="ds-form-field ds-form-full">
    <label class="ds-form-label">Description</label>
    <textarea class="ds-input ds-textarea"></textarea>
  </div>
</div>
```

### `.ds-modal` — Modals
```html
<div class="ds-modal" id="my-modal">
  <div class="ds-modal-box">
    <h3 class="ds-modal-title">Titre</h3>
    <!-- contenu -->
    <div class="ds-modal-footer">
      <button class="ds-btn ds-btn-outline">Annuler</button>
      <button class="ds-btn ds-btn-primary">Confirmer</button>
    </div>
  </div>
</div>
```

### `.ds-kpi-grid` + `.ds-kpi-card` — Cartes KPI
Le composant le plus utilisé dans AgentHub. Structure : icône · titre · valeur · évolution.

```html
<div class="ds-kpi-grid">
  <div class="ds-kpi-card">
    <div class="ds-kpi-icon">📊</div>
    <div class="ds-kpi-title">Score moyen</div>
    <div class="ds-kpi-value">67<span class="ds-kpi-unit">/100</span></div>
    <div class="ds-kpi-delta ds-kpi-delta-up">↑ +5 ce mois</div>
  </div>
  <div class="ds-kpi-card">
    <div class="ds-kpi-icon">🏢</div>
    <div class="ds-kpi-title">Entreprises</div>
    <div class="ds-kpi-value">48</div>
    <div class="ds-kpi-delta ds-kpi-delta-flat">— Stable</div>
  </div>
</div>
```

**Variantes :**
- `.ds-kpi-card-h` — icône à gauche, contenu à droite (horizontal)
- `.ds-kpi-card-accent` — barre colorée à gauche (couleur `--primary`)
- `.ds-kpi-delta-up` — delta vert (croissance)
- `.ds-kpi-delta-down` — delta rouge (baisse)
- `.ds-kpi-delta-flat` — delta gris (stable)

### `.ds-alert` — Alertes et messages de statut
```html
<div class="ds-alert ds-alert-ok">✓ Modifications sauvegardées.</div>
<div class="ds-alert ds-alert-warn">⚠️ Cette action est irréversible.</div>
<div class="ds-alert ds-alert-err">✗ Impossible de charger les données.</div>
<div class="ds-alert ds-alert-info">ℹ️ 8 comptes sans MFA détectés.</div>
```

### `.ds-timeline` — Fil chronologique
Pour : ATLAS, journal d'audit, historique, notifications.

```html
<div class="ds-timeline">
  <div class="ds-timeline-item">
    <div class="ds-timeline-dot ds-timeline-dot-ok"></div>
    <div class="ds-timeline-body">
      <div class="ds-timeline-title">Diagnostic complété</div>
      <div class="ds-timeline-sub">Aujourd'hui · 14h23</div>
      <p class="ds-timeline-text">Industries Tremblay — Score IMAI 68/100.</p>
    </div>
  </div>
  <div class="ds-timeline-item">
    <div class="ds-timeline-dot"></div>
    <div class="ds-timeline-body">
      <div class="ds-timeline-title">Politique IA générée</div>
      <div class="ds-timeline-sub">Hier · 09h15</div>
    </div>
  </div>
</div>
```

**Variantes de point :** `.ds-timeline-dot-ok` (vert) · `.ds-timeline-dot-warn` (ambre) · `.ds-timeline-dot-err` (rouge) · par défaut (primary)

### `.ds-chart-card` — Conteneur de graphique (Chart.js)
Structure standardisée pour tous les graphiques, quelle que soit la librairie utilisée.

```html
<div class="ds-chart-card">
  <div class="ds-chart-header">
    <div>
      <h3 class="ds-chart-title">Évolution du score IMAI</h3>
      <p class="ds-chart-sub">12 dernières semaines</p>
    </div>
    <div class="ds-chart-toolbar">
      <button class="ds-btn ds-btn-outline ds-btn-sm">3 mois</button>
      <button class="ds-btn ds-btn-outline ds-btn-sm">6 mois</button>
    </div>
  </div>
  <div class="ds-chart-body">
    <canvas id="chart-imai"></canvas>
  </div>
  <div class="ds-chart-footer">Source : 48 diagnostics complétés · Partenaire</div>
</div>
```

### `.ds-page-header` + `.ds-toolbar` + `.ds-breadcrumb` — Navigation de page
Inspiré Microsoft Fabric. Structure : breadcrumb + titre + actions.

```html
<div class="ds-page-header">
  <div class="ds-page-header-left">
    <div class="ds-breadcrumb">
      <a href="#">Observatoire</a>
      <span class="ds-breadcrumb-sep">/</span>
      <span class="ds-breadcrumb-current">Sessions</span>
    </div>
    <h1 class="ds-page-title">Sessions diagnostics</h1>
    <p class="ds-page-sub">48 sessions · 12 complétées ce mois</p>
  </div>
  <div class="ds-toolbar">
    <button class="ds-btn ds-btn-outline ds-btn-sm">Filtrer</button>
    <div class="ds-toolbar-divider"></div>
    <button class="ds-btn ds-btn-primary ds-btn-sm">Exporter CSV</button>
  </div>
</div>
```

### `.ds-empty` — États vides
```html
<div class="ds-empty">
  <div class="ds-empty-icon">🤖</div>
  <p>Aucun élément disponible.</p>
</div>
```

### `.ds-wrap` — Conteneur de page
```html
<div class="ds-wrap">
  <h1 class="ds-page-title">Titre</h1>
  <p class="ds-page-sub">Sous-titre descriptif</p>
</div>
```

---

## Conventions de nommage

| Contexte | Convention | Exemple |
|---|---|---|
| Variables design system | `--nom-catégorie` | `--color-ok`, `--text-sub` |
| Classes design system | `.ds-composant[-variante]` | `.ds-btn-primary`, `.ds-badge-ok` |
| Classes applicatives | `.abbrev-élément[-état]` | `.gov-card`, `.rpt-btn`, `.set-tab-a` |
| IDs applicatifs | `abbrev-élément` | `#gov-panel`, `#rpt-sessions` |

### Abréviations d'apps
| App | Préfixe |
|---|---|
| Diagnostic IA | `dia-` |
| Observatoire | `obs-` |
| Gouvernance | `gov-` |
| Reports | `rpt-` |
| Settings | `set-` |
| Automation | `aut-` |
| Knowledge Hub | `kno-` |
| M365 Optimizer | `m365-` |
| Org workspace | `org-` |
| Workspace shell | `ws-` |

---

## Règles de contribution

1. **Aucune couleur hardcodée** dans les fichiers applicatifs. Tout doit passer par `var(--)`.
2. **Nouvelle couleur = PR vers `design-system.css`** avec justification dans ce document.
3. **Palettes sémantiques uniquement** pour les couleurs d'accent des apps placeholder :
   - App à connotation succès/vert → `--color-ok-*`
   - App à connotation info/bleu → `--color-info-*`
   - App à connotation warning/ambre → `--color-warn-*`
4. **Spinner unique** : utiliser `ds-spin` comme keyframe. Ne pas définir `@keyframes spin` dans les apps.
5. **Pas de `!important`** sauf dans `.ds-tab-active` (nécessaire pour surcharger l'état par défaut).
6. **Mobile first** : les classes `.ds-*` incluent leurs propres breakpoints `@media (max-width: 600px)`.
7. **Phase 2** : migrer progressivement les templates HTML des apps vers les classes `ds-*` en remplaçant les classes applicatives par leurs équivalents design system.
