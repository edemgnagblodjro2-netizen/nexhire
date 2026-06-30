/**
 * AgentHub Platform — Workspace Shell v2
 * Sprint 1: sidebar professionnelle, dashboard, architecture modulaire
 */

// ── Icons (Lucide-style SVG inline) ──────────────────────────────────────────
const IC = {
  home:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  sparkles:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 3l.8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8z"/><path d="M5 17l.6 1.4L7 19l-1.4.6L5 21l-.6-1.4L3 19l1.4-.6z"/></svg>`,
  chart:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  eye:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  shield:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  zap:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  book:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  grid:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  link:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  graduation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  layers:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  award:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  file:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  settings:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  users:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  dollar:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  trending:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  megaphone:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
  headset:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
  store:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
};

const icon = (name) => `<span class="ws-nav-icon">${IC[name] || IC.grid}</span>`;

// ── Navigation structure (fixed shell, not from DB) ───────────────────────────
const NAV = [
  {
    items: [
      { id: 'dashboard', label: 'Tableau de bord', iconKey: 'home', route: '__dashboard__' },
    ],
  },
  {
    section: 'Intelligence artificielle',
    items: [
      { id: 'atlas',        label: 'ATLAS AI',        iconKey: 'sparkles', route: '__atlas__' },
      { id: 'diagnostic',   label: 'Diagnostic IA',   iconKey: 'chart',    appSlug: 'diagnostic-ia' },
      { id: 'observatoire', label: 'Observatoire IA', iconKey: 'eye',      appSlug: 'observatoire'  },
      { id: 'gouvernance',  label: 'Gouvernance IA',  iconKey: 'shield',   appSlug: 'gouvernance',   defaultSoon: true },
    ],
  },
  {
    section: 'Productivité',
    items: [
      { id: 'automation', label: 'Automatisations', iconKey: 'zap',  appSlug: 'automation', defaultSoon: true },
      { id: 'knowledge',  label: 'Knowledge Hub',   iconKey: 'book', appSlug: 'knowledge',  defaultSoon: true },
      { id: 'optimizer',  label: 'M365 Optimizer',  iconKey: 'grid', appSlug: 'ms365',      defaultSoon: true },
    ],
  },
  {
    section: 'Analytique',
    items: [
      { id: 'reports', label: 'Rapports', iconKey: 'file', appSlug: 'reports', defaultSoon: true },
    ],
  },
  {
    section: 'Administration',
    items: [
      { id: 'settings', label: 'Paramètres', iconKey: 'settings', appSlug: 'settings', defaultSoon: true },
    ],
  },
];

const COMING_SOON = [
  { id: 'rh',          label: 'RH Intelligence',       iconKey: 'users'      },
  { id: 'finance',     label: 'Finance Intelligence',   iconKey: 'dollar'     },
  { id: 'sales',       label: 'Sales Intelligence',     iconKey: 'trending'   },
  { id: 'marketing',   label: 'Marketing Intelligence', iconKey: 'megaphone'  },
  { id: 'support',     label: 'Service Client IA',      iconKey: 'headset'    },
  { id: 'marketplace', label: 'Marketplace d\'agents',  iconKey: 'store'      },
  { id: 'connectors',  label: 'Connecteurs',            iconKey: 'link'       },
  { id: 'formation',   label: 'Centre de Formation',    iconKey: 'graduation' },
  { id: 'projects',    label: 'Projets IA',             iconKey: 'layers'     },
  { id: 'grants',      label: 'Centre de Subventions',  iconKey: 'award'      },
  { id: 'civicstore',  label: 'CivicAI Store',          iconKey: 'store'      },
];

// ── Vocabulary adaptation par type de partenaire ─────────────────────────────
const VOCAB = {
  chamber:      { members: 'membres',  cohort: 'cohorte',    member: 'membre',   orgs: 'entreprises membres' },
  incubator:    { members: 'startups', cohort: 'promotion',  member: 'startup',  orgs: 'startups en cohorte' },
  association:  { members: 'membres',  cohort: 'cohorte',    member: 'membre',   orgs: 'membres participants' },
  municipality: { members: 'services', cohort: 'programme',  member: 'service',  orgs: 'services participants' },
  university:   { members: 'projets',  cohort: 'cohorte',    member: 'projet',   orgs: 'projets en cohorte' },
  direct:       { members: 'équipes',  cohort: 'programme',  member: 'équipe',   orgs: 'équipes participantes' },
};

// ── State ─────────────────────────────────────────────────────────────────────
const _state = {
  partner:    null,
  dbApps:     [],
  activeId:   null,
  activeApp:  null,
  module:     null,
  vocab:      VOCAB.chamber,
};

const $ = (id) => document.getElementById(id);

const _slug = () => location.pathname.split('/').filter(Boolean)[1] || null;
const _pathApp = () => location.pathname.split('/').filter(Boolean)[2] || null;

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  const slug = _slug();
  if (!slug) { _showFatal('URL de workspace invalide.'); return; }

  try {
    const [pRes, aRes] = await Promise.all([
      fetch(`/api/workspace/${slug}`, { credentials: 'include' }),
      fetch(`/api/workspace/${slug}/apps`, { credentials: 'include' }),
    ]);

    if (!pRes.ok) throw new Error((await pRes.json()).detail || 'Workspace introuvable.');
    if (!aRes.ok) throw new Error((await aRes.json()).detail || 'Erreur chargement apps.');

    _state.partner = await pRes.json();
    _state.dbApps  = (await aRes.json()).apps || [];
    _state.vocab   = VOCAB[_state.partner.partner_type] || VOCAB.chamber;

    _applyBranding(_state.partner);
    _renderNav();

    const appFromPath = _pathApp();
    if (appFromPath) {
      const resolved = _resolveNavItems();
      const navItem = resolved.find(n =>
        (n.appSlug === appFromPath && n.enabled) ||
        (n.id === appFromPath && n.route && n.enabled)
      );
      if (navItem) { _navigateTo(navItem); return; }
    }

    _navigateTo({ id: 'dashboard', label: 'Tableau de bord', route: '__dashboard__' });

  } catch (err) {
    _toast(err.message, 'error');
  }
}

// ── Branding ──────────────────────────────────────────────────────────────────
function _applyBranding(p) {
  document.title = `${p.name} · AgentHub`;
  $('ws-program-name').textContent = p.hero_title   || p.name || 'AgentHub';
  $('ws-powered-by').textContent   = p.hero_subtitle || 'AgentHub Platform';

  if (p.logo_url) {
    const logo = $('ws-logo');
    logo.src = p.logo_url; logo.alt = p.name; logo.style.display = 'block';
  }

  if (p.primary_color) {
    const r = document.documentElement.style;
    r.setProperty('--primary',    p.primary_color);
    r.setProperty('--primary-dk', p.primary_color);
    r.setProperty('--primary-lt', p.primary_color + '20');
    r.setProperty('--primary-a10', p.primary_color + '1a');
  }

  const initials = (p.name || 'AG').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  $('ws-user-avatar').textContent = initials;

  if (p.favicon_url) {
    let link = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon'; link.href = p.favicon_url; document.head.appendChild(link);
  }
}

// ── Nav resolution ────────────────────────────────────────────────────────────
function _resolveNavItems() {
  const resolved = [];
  for (const group of NAV) {
    for (const item of group.items) {
      if (item.route) {
        resolved.push({ ...item, enabled: true, soon: false });
        continue;
      }
      if (item.appSlug) {
        const dbApp = _state.dbApps.find(a => a.slug === item.appSlug);
        const enabled = !!(dbApp && dbApp.is_installed);
        resolved.push({ ...item, enabled, app: dbApp || null, soon: !enabled });
      }
    }
  }
  return resolved;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function _renderNav() {
  const nav = $('ws-nav');
  const resolved = _resolveNavItems();
  let idx = 0;
  let html = '';

  for (const group of NAV) {
    html += `<div class="ws-nav-section">`;
    if (group.section) html += `<div class="ws-nav-label">${group.section}</div>`;

    for (const item of group.items) {
      const r = resolved[idx++];
      const disabled = r.soon ? 'disabled' : '';
      const badge = r.soon
        ? `<span class="ws-nav-badge ws-badge-soon">Bientôt</span>`
        : '';
      html += `
        <button class="ws-nav-item" data-id="${item.id}" ${disabled}
          aria-label="${item.label}">
          ${icon(item.iconKey)}
          <span class="ws-nav-name">${item.label}</span>
          ${badge}
        </button>`;
    }

    html += `</div>`;
  }

  // À venir section
  html += `<div class="ws-sidebar-divider"></div>`;
  html += `<div class="ws-nav-section"><div class="ws-nav-label">À venir</div>`;
  for (const cs of COMING_SOON) {
    html += `
      <button class="ws-nav-item" disabled aria-label="${cs.label}">
        ${icon(cs.iconKey)}
        <span class="ws-nav-name">${cs.label}</span>
        <span class="ws-nav-badge ws-badge-soon">Bientôt</span>
      </button>`;
  }
  html += `</div>`;

  nav.innerHTML = html;

  nav.querySelectorAll('.ws-nav-item:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = _resolveNavItems().find(n => n.id === btn.dataset.id);
      if (r) _navigateTo(r);
    });
  });
}

function _setActiveNav(id) {
  document.querySelectorAll('.ws-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.id === id);
  });
  _state.activeId = id;
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function _setBreadcrumb(label) {
  const partnerName = _state.partner?.name || 'AgentHub';
  $('ws-breadcrumb').innerHTML =
    `<span>${partnerName}</span>
     <span class="bc-sep">›</span>
     <span class="bc-current">${label}</span>`;
}

// ── Navigation ────────────────────────────────────────────────────────────────
async function _navigateTo(navItem) {
  if (_state.module?.unmount) _state.module.unmount($('ws-app-container'));
  _state.module = null; _state.activeApp = null;

  _setActiveNav(navItem.id);
  _setBreadcrumb(navItem.label);
  _showLoading();

  try {
    if (navItem.route === '__dashboard__') {
      const mod = await import('/static/workspace/dashboard/main.js');
      _state.module = mod.default;
      history.replaceState({ id: 'dashboard' }, '', `/workspace/${_slug()}`);

    } else if (navItem.route === '__atlas__') {
      const mod = await import('/static/workspace/atlas/main.js');
      _state.module = mod.default;
      const newPath = `/workspace/${_slug()}/atlas`;
      if (location.pathname !== newPath) history.pushState({ id: 'atlas' }, '', newPath);

    } else if (navItem.appSlug && navItem.enabled) {
      const mod = await import(`/static/apps/${navItem.appSlug}/main.js`);
      _state.module = mod.default;
      _state.activeApp = navItem.appSlug;
      const newPath = `/workspace/${_slug()}/${navItem.appSlug}`;
      if (location.pathname !== newPath) history.pushState({ id: navItem.id }, '', newPath);

    } else {
      _showComingSoon(navItem.label);
      return;
    }

    const ctx = {
      partnerSlug: _slug(),
      partner:     _state.partner,
      appConfig:   navItem.app?.config || {},
      vocab:       _state.vocab,
      user:        null,
    };

    $('ws-app-container').innerHTML = '';
    _state.module.mount($('ws-app-container'), ctx);

  } catch (err) {
    _showAppError(navItem.label, err.message);
  }
}

window.addEventListener('popstate', (e) => {
  const id = e.state?.id || _pathApp();
  if (id) {
    const r = _resolveNavItems().find(n => n.id === id || n.appSlug === id);
    if (r) { _navigateTo(r); return; }
  }
  if (_state.module?.unmount) _state.module.unmount($('ws-app-container'));
  _state.module = null;
  _navigateTo({ id: 'dashboard', label: 'Tableau de bord', route: '__dashboard__' });
});

// ── States visuels ────────────────────────────────────────────────────────────
function _showLoading() {
  $('ws-app-container').innerHTML = `
    <div class="ws-state">
      <div class="ws-spinner"></div>
    </div>`;
}

function _showAppError(name, msg) {
  $('ws-app-container').innerHTML = `
    <div class="ws-state">
      <div class="ws-state-icon">⚠️</div>
      <div class="ws-state-title">Impossible de charger ${name}</div>
      <div class="ws-state-msg">${msg || 'Une erreur est survenue. Veuillez réessayer.'}</div>
    </div>`;
}

function _showComingSoon(name) {
  $('ws-app-container').innerHTML = `
    <div class="ws-state">
      <div class="ws-state-icon">🚀</div>
      <div class="ws-state-title">${name}</div>
      <div class="ws-state-msg">Ce module est en cours de développement et sera disponible prochainement.</div>
    </div>`;
}

function _showFatal(msg) {
  document.body.innerHTML = `
    <div class="ws-state" style="height:100vh">
      <div class="ws-state-icon">❌</div>
      <div class="ws-state-title">Workspace introuvable</div>
      <div class="ws-state-msg">${msg}</div>
    </div>`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function _toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'ws-toast-item';
  if (type === 'error') el.style.background = '#dc2626';
  el.textContent = msg;
  $('ws-toast').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ── Start ─────────────────────────────────────────────────────────────────────
boot();
