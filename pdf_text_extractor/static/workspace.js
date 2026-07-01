/**
 * AgentHub Platform — Workspace Shell
 * Enterprise TopBar: search, notifications, help, settings, user menu, sidebar collapse
 */

// ── Icons ─────────────────────────────────────────────────────────────────────
const IC = {
  home:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  sparkles:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 3l.8 2.2L22 6l-2.2.8L19 9l-.8-2.2L16 6l2.2-.8z"/><path d="M5 17l.6 1.4L7 19l-1.4.6L5 21l-.6-1.4L3 19l1.4-.6z"/></svg>`,
  chart:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
  eye:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  shield:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  zap:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  book:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  grid:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  file:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  settings:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  users:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  check:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  download:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  building:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
};

const icon = (name) => `<span class="ws-nav-icon">${IC[name] || IC.grid}</span>`;

// ── Navigation Enterprise ──────────────────────────────────────────────────────
const NAV = [
  {
    items: [
      { id: 'dashboard', label: 'Tableau de bord', iconKey: 'home', route: '__dashboard__' },
    ],
  },
  {
    section: 'Diagnostic & IA',
    items: [
      { id: 'diagnostic',      label: 'Diagnostic IA IMAI', iconKey: 'chart',    appSlug: 'diagnostic-ia' },
      { id: 'atlas',           label: 'ATLAS AI',           iconKey: 'sparkles', route: '__atlas__' },
      { id: 'recommandations', label: 'Recommandations',    iconKey: 'zap',      appSlug: 'recommandations', defaultSoon: true },
    ],
  },
  {
    section: 'Gouvernance',
    items: [
      { id: 'gouvernance', label: 'Gouvernance & Loi 25', iconKey: 'shield', appSlug: 'gouvernance' },
      { id: 'conformite',  label: 'Conformité',           iconKey: 'check',  appSlug: 'conformite', defaultSoon: true },
      { id: 'politiques',  label: 'Politiques',           iconKey: 'file',   appSlug: 'politiques', defaultSoon: true },
    ],
  },
  {
    section: 'Enterprise Intelligence',
    items: [
      { id: 'observatoire',      label: 'Observatoire',          iconKey: 'eye',      appSlug: 'observatoire' },
      { id: 'reports',           label: 'Rapports & Exports',    iconKey: 'file',     appSlug: 'reports' },
      { id: 'enterprise-intel',  label: 'Coûts & Optimisation',  iconKey: 'chart',    appSlug: 'enterprise-intel' },
    ],
  },
  {
    section: 'Centre d\'intégrations',
    items: [
      { id: 'integrations', label: 'Tous les connecteurs', iconKey: 'zap',      appSlug: 'integrations' },
      { id: 'ms365',        label: 'Microsoft 365',        iconKey: 'building', appSlug: 'ms365' },
    ],
  },
  {
    section: 'Identity & Access',
    items: [
      { id: 'identity', label: 'Utilisateurs & Accès', iconKey: 'users',  appSlug: 'identity' },
      { id: 'sso-mfa',  label: 'SSO & MFA',            iconKey: 'shield', appSlug: 'sso-mfa',  defaultSoon: true },
    ],
  },
  {
    section: 'Security Center',
    items: [
      { id: 'security', label: 'Tableau de sécurité', iconKey: 'alert', appSlug: 'security' },
      { id: 'audit',    label: 'Journal d\'audit',     iconKey: 'file',  appSlug: 'security' },
    ],
  },
  {
    section: 'Productivité',
    items: [
      { id: 'knowledge',  label: 'Knowledge Hub', iconKey: 'book', appSlug: 'knowledge' },
      { id: 'automation', label: 'Automatisation', iconKey: 'zap',  appSlug: 'automation', defaultSoon: true },
    ],
  },
  {
    section: 'Administration',
    items: [
      { id: 'settings', label: 'Paramètres', iconKey: 'settings', appSlug: 'settings' },
    ],
  },
];

const VOCAB = {
  chamber:      { members: 'membres',  cohort: 'cohorte',   member: 'membre',  orgs: 'entreprises membres' },
  incubator:    { members: 'startups', cohort: 'promotion', member: 'startup', orgs: 'startups en cohorte' },
  association:  { members: 'membres',  cohort: 'cohorte',   member: 'membre',  orgs: 'membres participants' },
  municipality: { members: 'services', cohort: 'programme', member: 'service', orgs: 'services participants' },
  university:   { members: 'projets',  cohort: 'cohorte',   member: 'projet',  orgs: 'projets en cohorte' },
  direct:       { members: 'équipes',  cohort: 'programme', member: 'équipe',  orgs: 'équipes participantes' },
};

// ── Notifications mock data ────────────────────────────────────────────────────
let _notifications = [
  { id: 1, icon: '📊', title: 'Nouveau rapport disponible', sub: 'Rapport de maturité IA — Juin 2026', time: 'il y a 5 min', unread: true },
  { id: 2, icon: '✅', title: 'Diagnostic complété', sub: 'Score : 58/100 · Niveau Intermédiaire', time: 'il y a 2 h', unread: true },
  { id: 3, icon: '🤖', title: 'ATLAS recommande une action', sub: 'Renforcer la gouvernance des données · Priorité élevée', time: 'il y a 1 j', unread: true },
  { id: 4, icon: '🚀', title: 'Mise à jour AgentHub disponible', sub: 'AgentHub Platform v1.0 RC1', time: 'il y a 2 j', unread: false },
];

// ── Search quick items ────────────────────────────────────────────────────────
const SEARCH_ITEMS = [
  { icon: '🏠', title: 'Tableau de bord',     sub: 'Vue d\'ensemble de votre organisation', id: 'dashboard' },
  { icon: '📊', title: 'Diagnostic IA IMAI',  sub: 'Évaluer la maturité IA de votre organisation', id: 'diagnostic' },
  { icon: '🤖', title: 'ATLAS AI',             sub: 'Votre conseiller IA personnel', id: 'atlas' },
  { icon: '🛡️', title: 'Gouvernance & Loi 25', sub: 'Conformité et politiques de gouvernance', id: 'gouvernance' },
  { icon: '🔭', title: 'Observatoire IA',      sub: 'Tableau de bord du programme partenaire', id: 'observatoire' },
  { icon: '📄', title: 'Rapports',             sub: 'Rapports d\'analyse et de synthèse', id: 'reports' },
  { icon: '⚙️', title: 'Paramètres',           sub: 'Configuration de l\'organisation', id: 'settings' },
];

// ── State ─────────────────────────────────────────────────────────────────────
const _state = {
  partner:     null,
  dbApps:      [],
  activeId:    null,
  activeApp:   null,
  module:      null,
  vocab:       VOCAB.chamber,
  user:        null,
  userProfile: null,
};

const $ = (id) => document.getElementById(id);
const _slug    = () => location.pathname.split('/').filter(Boolean)[1] || null;
const _pathApp = () => location.pathname.split('/').filter(Boolean)[2] || null;

// ── Boot ──────────────────────────────────────────────────────────────────────
async function boot() {
  const slug = _slug();
  if (!slug) { _showFatal('URL de workspace invalide.'); return; }

  // Restore sidebar collapse state
  if (localStorage.getItem('ws_sidebar_collapsed') === '1') {
    document.body.classList.add('sidebar-collapsed');
  }

  try {
    const _token   = localStorage.getItem('nexhire_token');
    const _authHdr = _token ? { Authorization: `Bearer ${_token}` } : {};

    const [pRes, aRes] = await Promise.all([
      fetch(`/api/workspace/${slug}`, { credentials: 'include', headers: _authHdr }),
      fetch(`/api/workspace/${slug}/apps`, { credentials: 'include', headers: _authHdr }),
    ]);

    if (!pRes.ok) throw new Error((await pRes.json()).detail || 'Workspace introuvable.');
    if (!aRes.ok) throw new Error((await aRes.json()).detail || 'Erreur chargement apps.');

    const pData    = await pRes.json();
    _state.partner = pData;
    _state.user    = pData.viewer?.authenticated ? pData.viewer : null;
    _state.dbApps  = (await aRes.json()).apps || [];
    _state.vocab   = VOCAB[_state.partner.partner_type] || VOCAB.chamber;

    // Load user profile before rendering so greeting is ready
    if (_token && _state.user) {
      try {
        const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${_token}` } });
        if (meRes.ok) _state.userProfile = await meRes.json();
      } catch {}
    }

    _applyBranding(_state.partner);
    _applyUserInfo(_state.userProfile);
    _renderNav();
    _initTopbar();

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
  $('ws-program-name').textContent = p.hero_title    || p.name || 'AgentHub';
  $('ws-powered-by').textContent   = p.hero_subtitle || 'AgentHub Platform';

  if (p.logo_url) {
    const logo = $('ws-logo');
    logo.src = p.logo_url; logo.alt = p.name; logo.style.display = 'block';
  }

  if (p.primary_color) {
    const r = document.documentElement.style;
    r.setProperty('--primary',     p.primary_color);
    r.setProperty('--primary-dk',  p.primary_color);
    r.setProperty('--primary-lt',  p.primary_color + '20');
    r.setProperty('--primary-a10', p.primary_color + '1a');
  }

  // Set partner initials as fallback avatar (overridden by _applyUserInfo)
  const initials = (p.name || 'AG').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatar = $('ws-user-avatar');
  if (avatar) avatar.textContent = initials;

  const orgEl = $('ws-user-org');
  if (orgEl) orgEl.textContent = p.name || 'AgentHub';

  if (p.favicon_url) {
    let link = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon'; link.href = p.favicon_url; document.head.appendChild(link);
  }
}

// ── User info ─────────────────────────────────────────────────────────────────
function _applyUserInfo(profile) {
  if (!profile) return;

  const fullName = profile.organization_name ? profile.full_name || '' : '';
  const displayName = fullName || profile.email?.split('@')[0] || '—';
  const parts = displayName.trim().split(' ');
  const firstName = parts[0] || '';
  const lastInitial = parts[1]?.[0] || '';
  const shortName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;
  const initials = parts.map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const setTxt = (id, val) => { const el = $(id); if (el) el.textContent = val; };

  setTxt('ws-user-avatar', initials);
  setTxt('ws-user-name', shortName || displayName);
  setTxt('ws-user-org', profile.organization_name || _state.partner?.name || '—');
  setTxt('ws-up-name', displayName);
  setTxt('ws-up-email', profile.email || '—');

  const roleMap = { owner: 'Administrateur', admin: 'Admin', user: 'Utilisateur' };
  setTxt('ws-up-role', roleMap[profile.role] || profile.role || 'Utilisateur');
}

// Apps core livrées avec la plateforme — toujours disponibles sans besoin d'activation DB
const CORE_APPS = new Set(['diagnostic-ia', 'gouvernance', 'observatoire', 'reports', 'settings', 'security', 'ms365', 'integrations', 'enterprise-intel', 'identity']);

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
        const dbApp   = _state.dbApps.find(a => a.slug === item.appSlug);
        const isCore  = CORE_APPS.has(item.appSlug);
        const enabled = isCore || !!(dbApp && dbApp.is_installed);
        resolved.push({ ...item, enabled, app: dbApp || null, soon: !enabled });
      }
    }
  }
  return resolved;
}

// ── Sidebar nav ───────────────────────────────────────────────────────────────
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
      const badge    = r.soon ? `<span class="ws-nav-badge ws-badge-soon">Bientôt</span>` : '';
      html += `
        <button class="ws-nav-item" data-id="${item.id}" ${disabled} aria-label="${item.label}">
          ${icon(item.iconKey)}
          <span class="ws-nav-name">${item.label}</span>
          ${badge}
        </button>`;
    }

    html += `</div>`;
  }

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
    `<span>${partnerName}</span><span class="bc-sep">›</span><span class="bc-current">${label}</span>`;
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
      user:        _state.user        || null,
      userProfile: _state.userProfile || null,
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

// ── TopBar ────────────────────────────────────────────────────────────────────
function _initTopbar() {
  // Generic dropdown toggle
  const PAIRS = [
    ['ws-notif-btn',    'ws-notif-panel'],
    ['ws-help-btn',     'ws-help-panel'],
    ['ws-settings-btn', 'ws-settings-panel'],
    ['ws-user-btn',     'ws-user-panel'],
  ];

  PAIRS.forEach(([btnId, panelId]) => {
    const btn   = $(btnId);
    const panel = $(panelId);
    if (!btn || !panel) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = panel.classList.contains('open');
      _closeAllPanels();
      if (!wasOpen) panel.classList.add('open');
      if (btnId === 'ws-user-btn') btn.setAttribute('aria-expanded', !wasOpen);
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.ws-tb-wrap')) _closeAllPanels();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') _closeAllPanels();
  });

  // Notifications
  _renderNotifications();
  $('ws-notif-mark-all')?.addEventListener('click', () => {
    _notifications.forEach(n => n.unread = false);
    _renderNotifications();
  });

  // Help → ATLAS shortcut
  $('ws-help-atlas-btn')?.addEventListener('click', () => {
    _closeAllPanels();
    const r = _resolveNavItems().find(n => n.id === 'atlas');
    if (r) _navigateTo(r);
  });

  // Logout
  $('ws-logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('nexhire_token');
    localStorage.removeItem('nexhire_refresh_token');
    const slug = _slug();
    window.location.href = slug ? `/inscription?partenaire=${slug}` : '/inscription';
  });

  // Sidebar toggle
  $('ws-sidebar-toggle')?.addEventListener('click', _toggleSidebar);
  $('ws-collapse-btn')?.addEventListener('click', _toggleSidebar);

  // Demo mode toggle
  const demoSwitch = $('ws-demo-switch');
  if (demoSwitch) {
    const isDemo = _slug() === 'demo';
    demoSwitch.classList.toggle('on', isDemo);
    demoSwitch.setAttribute('aria-checked', isDemo);
    demoSwitch.addEventListener('click', () => {
      const newState = demoSwitch.classList.toggle('on');
      demoSwitch.setAttribute('aria-checked', newState);
    });
  }

  // Search
  _initSearch();
}

function _closeAllPanels() {
  document.querySelectorAll('.ws-tb-panel.open').forEach(p => p.classList.remove('open'));
  $('ws-user-btn')?.setAttribute('aria-expanded', 'false');
}

function _toggleSidebar() {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('ws_sidebar_collapsed', collapsed ? '1' : '0');
}

// ── Notifications ─────────────────────────────────────────────────────────────
function _renderNotifications() {
  const list  = $('ws-notif-list');
  const badge = $('ws-notif-badge');
  if (!list || !badge) return;

  const unreadCount = _notifications.filter(n => n.unread).length;
  badge.textContent = unreadCount;
  badge.hidden      = unreadCount === 0;

  list.innerHTML = _notifications.map(n => `
    <div class="ws-notif-item${n.unread ? ' unread' : ''}" data-id="${n.id}">
      <span class="ws-notif-ico">${n.icon}</span>
      <div class="ws-notif-body">
        <div class="ws-notif-title">${n.title}</div>
        <div class="ws-notif-sub">${n.sub}</div>
        <div class="ws-notif-time">${n.time}</div>
      </div>
      ${n.unread ? '<div class="ws-notif-dot"></div>' : ''}
    </div>`).join('');

  list.querySelectorAll('.ws-notif-item').forEach(el => {
    el.addEventListener('click', () => {
      const n = _notifications.find(x => x.id === +el.dataset.id);
      if (n) { n.unread = false; _renderNotifications(); }
    });
  });
}

// ── Search (command palette) ──────────────────────────────────────────────────
function _initSearch() {
  const overlay = $('ws-search-overlay');
  const input   = $('ws-search-input');
  const results = $('ws-search-results');
  const trigger = $('ws-search-trigger');
  if (!overlay || !input || !results || !trigger) return;

  function open() {
    overlay.classList.add('open');
    input.value = '';
    _renderSearchResults('');
    requestAnimationFrame(() => input.focus());
  }

  function close() {
    overlay.classList.remove('open');
  }

  function _renderSearchResults(q) {
    const query    = q.toLowerCase().trim();
    const filtered = query
      ? SEARCH_ITEMS.filter(it => it.title.toLowerCase().includes(query) || it.sub.toLowerCase().includes(query))
      : SEARCH_ITEMS;

    if (!filtered.length) {
      results.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">Aucun résultat pour « ${q} »</div>`;
      return;
    }

    results.innerHTML = `
      <div class="ws-sr-section">
        <div class="ws-sr-label">${query ? 'Résultats' : 'Navigation rapide'}</div>
        ${filtered.map(it => `
          <button class="ws-sr-item" data-nav-id="${it.id}">
            <span class="ws-sr-icon">${it.icon}</span>
            <span>
              <span class="ws-sr-title">${it.title}</span>
              <span class="ws-sr-sub">${it.sub}</span>
            </span>
          </button>`).join('')}
      </div>`;

    results.querySelectorAll('.ws-sr-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = _resolveNavItems().find(n => n.id === btn.dataset.navId);
        close();
        if (r && r.enabled) _navigateTo(r);
        else if (r) _toast(`${r.label} — module en cours de déploiement`, 'info');
      });
    });
  }

  trigger.addEventListener('click', open);
  trigger.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  $('ws-search-esc')?.addEventListener('click', close);
  input.addEventListener('input', () => _renderSearchResults(input.value));

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open(); }
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });
}

// ── Visual states ─────────────────────────────────────────────────────────────
function _showLoading() {
  $('ws-app-container').innerHTML = `<div class="ws-state"><div class="ws-spinner"></div></div>`;
}

function _showAppError(name, msg) {
  $('ws-app-container').innerHTML = `
    <div class="ws-state">
      <div class="ds-empty">
        <div class="ds-empty-icon">⚠️</div>
        <div class="ds-empty-title">Impossible de charger ${name}</div>
        <div class="ds-empty-desc">${msg || 'Vérifiez votre connexion et réessayez.'}</div>
        <button class="ds-empty-action ds-empty-action-ghost" onclick="location.reload()">Réessayer</button>
      </div>
    </div>`;
}

function _showComingSoon(name) {
  $('ws-app-container').innerHTML = `
    <div class="ws-state">
      <div class="ds-empty">
        <div class="ds-empty-icon">🚀</div>
        <div class="ds-empty-title">${name}</div>
        <div class="ds-empty-desc">Ce module sera disponible prochainement dans votre espace de travail.</div>
      </div>
    </div>`;
}

function _showFatal(msg) {
  document.body.innerHTML = `
    <div style="height:100dvh;display:flex;align-items:center;justify-content:center;background:var(--bg,#f8fafc);font-family:system-ui,sans-serif">
      <div class="ds-empty">
        <div class="ds-empty-icon">🔒</div>
        <div class="ds-empty-title">Workspace introuvable</div>
        <div class="ds-empty-desc">${msg}</div>
        <a href="/" class="ds-empty-action ds-empty-action-ghost">Retour à l'accueil</a>
      </div>
    </div>`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function _toast(msg, type = 'info') {
  const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
  const types = { info: '', success: 't-success', warning: 't-warning', error: 't-error' };
  const el = document.createElement('div');
  el.className = `ws-toast-item ${types[type] || ''}`.trim();
  el.innerHTML = `<span class="t-icon">${icons[type] || icons.info}</span><span class="t-msg">${msg}</span>`;
  $('ws-toast').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0'; el.style.transform = 'translateX(12px)';
    setTimeout(() => el.remove(), 200);
  }, 3800);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function _modal({ title, body, footer = '', onClose } = {}) {
  const overlay = document.getElementById('ws-modal-overlay');
  document.getElementById('ws-modal-title').textContent = title || '';
  document.getElementById('ws-modal-body').innerHTML    = body  || '';
  document.getElementById('ws-modal-ft').innerHTML      = footer;
  overlay.classList.add('open');
  const close = () => { overlay.classList.remove('open'); onClose?.(); };
  document.getElementById('ws-modal-close').onclick = close;
  const esc = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  return close;
}

boot();
