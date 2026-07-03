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
  key:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  help:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  store:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M3 9h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 9v2a3 3 0 0 0 6 0V9"/></svg>`,
  target:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  mail:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  calendar:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
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
      { id: 'recommandations', label: 'Recommandations',    iconKey: 'zap',      appSlug: 'recommandations' },
    ],
  },
  {
    section: 'Intelligence Décisionnelle',
    items: [
      { id: 'decisions',      label: 'Décisions IA',           iconKey: 'zap',      route: '__decisions__' },
      { id: 'initiatives',    label: 'Initiatives',            iconKey: 'chart',    route: '__initiatives__' },
      { id: 'playbooks',      label: 'Playbooks',              iconKey: 'book',     route: '__playbooks__' },
      { id: 'orchestrations', label: "Centre d'Orchestration", iconKey: 'zap',      route: '__orchestrations__' },
    ],
  },
  {
    section: 'Gouvernance',
    items: [
      { id: 'gouvernance', label: 'Gouvernance & Loi 25', iconKey: 'shield', appSlug: 'gouvernance' },
      { id: 'conformite',  label: 'Conformité Causale',   iconKey: 'check',  route: '__conformite__' },
      { id: 'politiques',  label: 'Politiques Vivantes',  iconKey: 'file',   route: '__politiques__' },
    ],
  },
  {
    section: 'Vue Direction',
    items: [
      { id: 'executive', label: 'Dashboard Exécutif', iconKey: 'building', appSlug: 'executive' },
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
    section: 'Sales Intelligence',
    items: [
      { id: 'sales-intelligence', label: 'Sales Intelligence', iconKey: 'target', appSlug: 'sales-intelligence' },
    ],
  },
  {
    section: 'Marketplace',
    items: [
      { id: 'marketplace', label: 'Workspace Marketplace', iconKey: 'store', appSlug: 'marketplace' },
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
    section: 'Organisation',
    items: [
      { id: 'departments', label: 'Départements', iconKey: 'grid',     appSlug: 'departments' },
      { id: 'assets',      label: 'Parc TI',      iconKey: 'building', appSlug: 'assets' },
    ],
  },
  {
    section: 'Finance & Contrats',
    items: [
      { id: 'budget',    label: 'Budget & Finances', iconKey: 'chart',  appSlug: 'budget' },
      { id: 'contracts', label: 'Contrats',           iconKey: 'file',   appSlug: 'contracts' },
    ],
  },
  {
    section: 'Identity & Access',
    items: [
      { id: 'identity',    label: 'Utilisateurs & Accès', iconKey: 'users',  appSlug: 'identity' },
      { id: 'sso-mfa',     label: 'SSO & MFA',             iconKey: 'shield', appSlug: 'sso-mfa' },
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
      { id: 'automation', label: 'Automatisation', iconKey: 'zap',  appSlug: 'automation' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { id: 'billing',          label: 'Facturation',        iconKey: 'file',     appSlug: 'billing' },
      { id: 'service-accounts', label: 'Comptes de service', iconKey: 'key',      appSlug: 'service-accounts' },
      { id: 'help',             label: 'Centre d\'aide',     iconKey: 'help',     appSlug: 'help' },
      { id: 'settings',         label: 'Paramètres',         iconKey: 'settings', appSlug: 'settings' },
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
  partner:       null,
  dbApps:        [],
  activeId:      null,
  activeApp:     null,
  activeNavItem: null,
  module:        null,
  vocab:         VOCAB.chamber,
  user:          null,
  userProfile:   null,
};

// ── Idle session management ────────────────────────────────────────────────────
const _IDLE_WARN_MS      = 15 * 60 * 1000; // 15 min → avertissement
const _IDLE_WARN_SECS    = 120;             // 2 min de grâce avant déconnexion

let _idleWarnTimer  = null;
let _idleKillTimer  = null;
let _idleWarnEl     = null;
let _idleTickTimer  = null;

function _idleRouteKey() { return `nh_restore_${_slug()}`; }

function _saveLastRoute(navItem) {
  if (!navItem || !_slug()) return;
  try { localStorage.setItem(_idleRouteKey(), JSON.stringify({ id: navItem.id, label: navItem.label, route: navItem.route, appSlug: navItem.appSlug })); } catch {}
}
function _clearLastRoute() {
  try { localStorage.removeItem(_idleRouteKey()); } catch {}
}

function _doAutoLogout() {
  clearTimeout(_idleWarnTimer); clearTimeout(_idleKillTimer); clearInterval(_idleTickTimer);
  const slug = _slug();
  localStorage.removeItem('nexhire_token');
  localStorage.removeItem('nexhire_refresh_token');
  // B2B2B (chambre) → préserver le slug partenaire ; B2B direct → login générique
  const isPartner = _state.partner && _state.partner.partner_type !== 'direct';
  window.location.href = (slug && isPartner) ? `/inscription?partenaire=${slug}` : '/inscription';
}

function _dismissIdleWarning() {
  clearInterval(_idleTickTimer); _idleTickTimer = null;
  _idleWarnEl?.remove(); _idleWarnEl = null;
}

function _showIdleWarning() {
  if (_idleWarnEl) return;
  let secs = _IDLE_WARN_SECS;

  _idleWarnEl = document.createElement('div');
  _idleWarnEl.id = 'ws-idle-overlay';
  _idleWarnEl.innerHTML = `
<style>
#ws-idle-overlay {
  position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;
  background:rgba(15,23,42,.65);backdrop-filter:blur(4px);
  animation:wsio-in .3s ease both;
}
@keyframes wsio-in { from{opacity:0} to{opacity:1} }
.wsio-card {
  background:#fff;border-radius:16px;padding:36px 40px;width:100%;max-width:420px;
  text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.28);
  animation:wsio-up .3s ease both;
}
@keyframes wsio-up { from{transform:translateY(16px);opacity:0} to{transform:none;opacity:1} }
.wsio-icon { font-size:40px; margin-bottom:12px; }
.wsio-title { font-size:18px;font-weight:800;color:#0f172a;margin-bottom:6px; }
.wsio-sub   { font-size:13.5px;color:#64748b;margin-bottom:24px;line-height:1.55; }
.wsio-timer {
  font-size:48px;font-weight:800;font-variant-numeric:tabular-nums;
  color:#dc2626;letter-spacing:-.02em;margin-bottom:12px;line-height:1;
}
.wsio-bar-wrap { background:#fee2e2;border-radius:4px;height:6px;margin-bottom:28px;overflow:hidden; }
.wsio-bar { height:100%;background:#dc2626;border-radius:4px;transition:width 1s linear; }
.wsio-actions { display:flex;gap:10px;justify-content:center; }
.wsio-stay {
  flex:1;background:#6366f1;color:#fff;border:none;border-radius:10px;padding:12px 20px;
  font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:background .2s;
}
.wsio-stay:hover { background:#4f46e5; }
.wsio-logout {
  background:#fff;border:1px solid #e2e8f0;color:#64748b;border-radius:10px;padding:12px 20px;
  font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:background .2s;
}
.wsio-logout:hover { background:#f1f5f9; }
</style>
<div class="wsio-card">
  <div class="wsio-icon">⏱️</div>
  <div class="wsio-title">Session inactive</div>
  <div class="wsio-sub">Vous semblez absent. Votre session sera fermée automatiquement pour protéger vos données.</div>
  <div class="wsio-timer" id="wsio-timer">2:00</div>
  <div class="wsio-bar-wrap"><div class="wsio-bar" id="wsio-bar" style="width:100%"></div></div>
  <div class="wsio-actions">
    <button class="wsio-stay"   id="wsio-stay">Rester connecté</button>
    <button class="wsio-logout" id="wsio-logout">Se déconnecter</button>
  </div>
</div>`;
  document.body.appendChild(_idleWarnEl);

  const timerEl = _idleWarnEl.querySelector('#wsio-timer');
  const barEl   = _idleWarnEl.querySelector('#wsio-bar');

  _idleTickTimer = setInterval(() => {
    secs--;
    if (secs <= 0) { clearInterval(_idleTickTimer); _doAutoLogout(); return; }
    const m = Math.floor(secs / 60), s = secs % 60;
    if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (barEl)   barEl.style.width   = `${(secs / _IDLE_WARN_SECS) * 100}%`;
  }, 1000);

  _idleWarnEl.querySelector('#wsio-stay')?.addEventListener('click', () => {
    _dismissIdleWarning();
    _resetIdleTimers();
  });
  _idleWarnEl.querySelector('#wsio-logout')?.addEventListener('click', () => {
    _clearLastRoute();
    _doAutoLogout();
  });
}

function _resetIdleTimers() {
  clearTimeout(_idleWarnTimer);
  clearTimeout(_idleKillTimer);
  _dismissIdleWarning();
  _idleWarnTimer = setTimeout(_showIdleWarning, _IDLE_WARN_MS);
  _idleKillTimer = setTimeout(_doAutoLogout,    _IDLE_WARN_MS + _IDLE_WARN_SECS * 1000);
}

function _initIdleDetection() {
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(ev =>
    window.addEventListener(ev, _resetIdleTimers, { passive: true })
  );
  _resetIdleTimers();
}

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

    if (pRes.status === 401 || aRes.status === 401) {
      localStorage.removeItem('nexhire_token');
      localStorage.removeItem('nexhire_refresh_token');
      // 401 sur workspace partenaire = token expiré → reprendre le contexte partenaire
      // 401 sur workspace org directe = accès non authentifié → login générique
      // On ne connaît pas encore le type (boot pas terminé), donc on tente de garder le slug
      // puis le /me post-login redirigera correctement vers le bon workspace
      window.location.href = '/inscription';
      return;
    }
    if (!pRes.ok) { let d = 'Workspace introuvable.'; try { d = (await pRes.json()).detail || d; } catch {} throw new Error(d); }
    if (!aRes.ok) { let d = 'Erreur chargement apps.'; try { d = (await aRes.json()).detail || d; } catch {} throw new Error(d); }

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

    // ── Idle session detection ─────────────────────────────────────────────────
    if (_state.userProfile) _initIdleDetection();

    // ── Welcome screen (une fois par session, utilisateurs authentifiés) ────────
    const _welcomeKey = `nh_welcomed_${slug}`;
    if (_state.userProfile && !sessionStorage.getItem(_welcomeKey)) {
      sessionStorage.setItem(_welcomeKey, '1');
      await _showWelcomeScreen(_state.userProfile, _state.partner);
    }

    // ── Onboarding wizard (première connexion owner sans données) ──────────────
    if (_state.user?.authenticated) {
      try {
        const _token2 = localStorage.getItem('nexhire_token');
        const obRes = await fetch('/api/onboarding/status', {
          headers: _token2 ? { Authorization: `Bearer ${_token2}` } : {},
          credentials: 'include',
        });
        if (obRes.ok) {
          const obData = await obRes.json();
          if (obData.should_show) {
            const { mount } = await import('/static/workspace/onboarding/main.js');
            const ctx = { partnerSlug: slug, partner: _state.partner };
            await mount(document.body, ctx, () => {
              _navigateTo({ id: 'dashboard', label: 'Tableau de bord', route: '__dashboard__' });
            });
            return;
          }
        }
      } catch {}
    }

    // ── Restauration de session après déconnexion automatique ────────────────
    const savedRoute = localStorage.getItem(_idleRouteKey());
    if (savedRoute) {
      try {
        const item = JSON.parse(savedRoute);
        localStorage.removeItem(_idleRouteKey());
        const resolved = _resolveNavItems();
        const navItem  = resolved.find(n => n.id === item.id && n.enabled !== false);
        if (navItem) { _navigateTo(navItem); return; }
      } catch {}
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

// ── Welcome screen ────────────────────────────────────────────────────────────
function _showWelcomeScreen(profile, partner) {
  return new Promise(resolve => {
    const DURATION  = 8000;
    const orgName   = profile?.organization_name || partner?.name || 'votre organisation';
    const userName  = profile?.full_name || profile?.email?.split('@')[0] || '';
    const roleMap   = { owner: 'Propriétaire', admin: 'Administrateur', manager: 'Manager', user: 'Utilisateur' };
    const roleLabel = roleMap[profile?.role] || 'Collaborateur';

    const overlay = document.createElement('div');
    overlay.id = 'ws-welcome-overlay';
    overlay.innerHTML = `
<style>
#ws-welcome-overlay {
  position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(155deg,#1e1b4b 0%,#312e81 48%,#4c1d95 100%);
  font-family:var(--font,'Segoe UI',system-ui,sans-serif);
  opacity:0;transition:opacity .5s ease;
}
#ws-welcome-overlay.in { opacity:1; }
#ws-welcome-overlay.out { opacity:0;pointer-events:none; }
.wc-grid {
  position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(255,255,255,.04)1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04)1px,transparent 1px);
  background-size:48px 48px;
}
.wc-glow1 {
  position:absolute;top:-100px;right:-100px;width:480px;height:480px;border-radius:50%;
  background:radial-gradient(circle,rgba(139,92,246,.25)0%,transparent 70%);pointer-events:none;
}
.wc-glow2 {
  position:absolute;bottom:-80px;left:-60px;width:320px;height:320px;border-radius:50%;
  background:radial-gradient(circle,rgba(99,102,241,.2)0%,transparent 70%);pointer-events:none;
}
.wc-card {
  position:relative;z-index:2;width:100%;max-width:480px;padding:0 24px;text-align:center;
}
.wc-badge {
  display:inline-flex;align-items:center;gap:8px;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  border-radius:99px;padding:6px 16px;font-size:12px;font-weight:700;
  color:rgba(255,255,255,.85);letter-spacing:.05em;text-transform:uppercase;margin-bottom:32px;
  backdrop-filter:blur(8px);
}
.wc-badge-dot { width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80;animation:wc-pulse 1.6s infinite; }
@keyframes wc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.2)} }
.wc-tagline { font-size:12px;color:rgba(255,255,255,.4);letter-spacing:.04em;margin-bottom:22px; }
.wc-identity {
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
  border-radius:12px;padding:16px 20px;margin-bottom:18px;text-align:left;
}
.wc-identity-org { font-size:17px;font-weight:800;color:#fff;margin-bottom:7px;letter-spacing:-.01em; }
.wc-identity-user { font-size:13px;color:rgba(255,255,255,.6);margin-bottom:3px; }
.wc-identity-role {
  display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
  background:rgba(99,102,241,.3);color:#a5b4fc;border:1px solid rgba(129,140,248,.3);
  border-radius:6px;padding:2px 10px;margin-top:4px;
}
.wc-atlas-block { margin-bottom:14px;text-align:left; }
.wc-atlas-header { font-size:13px;font-weight:700;color:rgba(255,255,255,.8);margin-bottom:3px; }
.wc-atlas-status { font-size:12px;color:rgba(255,255,255,.4);font-style:italic; }
.wc-steps { display:flex;flex-direction:column;gap:2px;margin-bottom:18px;text-align:left; }
.wc-step {
  font-size:12.5px;color:rgba(255,255,255,.22);padding:5px 0;
  display:flex;align-items:center;gap:8px;
  transform:translateX(-4px);transition:color .4s ease,transform .35s ease;
}
.wc-step::before { content:'\25CB';font-size:10px;flex-shrink:0; }
.wc-step.done { color:#4ade80;transform:translateX(0); }
.wc-step.done::before { content:'\2713'; }
.wc-final {
  font-size:14px;font-weight:600;color:transparent;
  margin-bottom:22px;letter-spacing:.01em;text-align:left;
  transition:color .8s ease;
}
.wc-final.show { color:rgba(255,255,255,.8); }
.wc-skip {
  background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
  color:rgba(255,255,255,.85);padding:10px 28px;border-radius:10px;font-size:13px;
  font-weight:600;cursor:pointer;backdrop-filter:blur(8px);
  transition:background .2s;font-family:inherit;
}
.wc-skip:hover { background:rgba(255,255,255,.2); }
</style>
<div class="wc-grid"></div>
<div class="wc-glow1"></div>
<div class="wc-glow2"></div>
<div class="wc-card">
  <div class="wc-badge"><div class="wc-badge-dot"></div>AgentHub Platform</div>
  <div class="wc-tagline">Enterprise AI Workspace</div>

  <div class="wc-identity">
    <div class="wc-identity-org">&#x1F3E2; ${orgName}</div>
    ${userName ? `<div class="wc-identity-user">&#x1F464; ${userName}</div>` : ''}
    <div class="wc-identity-role">${roleLabel}</div>
  </div>

  <div class="wc-atlas-block">
    <div class="wc-atlas-header">&#x1F916; ATLAS</div>
    <div class="wc-atlas-status">Préparation de votre environnement intelligent...</div>
  </div>

  <div class="wc-steps">
    <div class="wc-step" data-step="0">Chargement de votre organisation</div>
    <div class="wc-step" data-step="1">Initialisation des agents IA</div>
    <div class="wc-step" data-step="2">Vérification des connecteurs</div>
    <div class="wc-step" data-step="3">Analyse des indicateurs</div>
    <div class="wc-step" data-step="4">Sécurisation de votre session</div>
  </div>

  <div class="wc-final" id="wc-final">Bienvenue dans AgentHub.</div>
  <button class="wc-skip" id="wc-skip">Accéder au tableau de bord →</button>
</div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('in'));

    // Steps appear progressively
    [900, 2000, 3200, 4600, 6000].forEach((ms, i) => {
      setTimeout(() => overlay.querySelector(`[data-step="${i}"]`)?.classList.add('done'), ms);
    });

    // Final message
    setTimeout(() => document.getElementById('wc-final')?.classList.add('show'), 7000);

    const dismiss = () => {
      clearTimeout(timer);
      overlay.classList.remove('in');
      overlay.classList.add('out');
      setTimeout(() => { overlay.remove(); resolve(); }, 500);
    };

    const timer = setTimeout(dismiss, DURATION);
    document.getElementById('wc-skip')?.addEventListener('click', dismiss);
  });
}

// ── User info ─────────────────────────────────────────────────────────────────
function _applyUserInfo(profile) {
  if (!profile) return;

  const fullName = profile.full_name || '';
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
const CORE_APPS = new Set([
  'diagnostic-ia', 'gouvernance', 'observatoire', 'reports', 'settings', 'security',
  'ms365', 'integrations', 'enterprise-intel', 'identity', 'executive', 'departments',
  'knowledge', 'billing', 'service-accounts', 'help',
  'sales-intelligence', 'marketplace', 'assets', 'budget', 'contracts',
  'sso-mfa', 'automation', 'recommandations', 'dashboard',
]);

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
      const badge = r.soon ? `<span class="ws-nav-badge ws-badge-soon">Bientôt</span>` : '';
      html += `
        <button class="ws-nav-item${r.soon ? ' soon' : ''}" data-id="${item.id}" aria-label="${item.label}">
          ${icon(item.iconKey)}
          <span class="ws-nav-name">${item.label}</span>
          ${badge}
        </button>`;
    }

    html += `</div>`;
  }

  nav.innerHTML = html;

  nav.querySelectorAll('.ws-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = _resolveNavItems().find(n => n.id === btn.dataset.id);
      if (!r) return;
      if (r.soon) {
        _setActiveNav(r.id);
        _setBreadcrumb(r.label);
        _showComingSoon(r.label);
      } else {
        _navigateTo(r);
      }
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
// ── ATLAS First-Visit Onboarding ──────────────────────────────────────────────
const ATLAS_ONBOARD = {
  'sales-intelligence': {
    icon: '🎯', color: '#6d28d9',
    title: 'Sales Intelligence',
    desc: 'Votre centre de commande IA pour automatiser la prospection, piloter les campagnes et fermer plus de deals.',
    benefits: [
      'ATLAS identifie vos meilleurs leads et les classe automatiquement par potentiel',
      'Vos agents IA prospectent et qualifient 24h/24 pendant que vous dormez',
      'Pipeline commercial en temps réel avec prédictions de closing par IA',
    ],
    actions: [
      { label: 'Configurer', sub: 'Connecter votre CRM', icon: '⚙️', tab: 'settings' },
      { label: 'Importer', sub: 'Charger vos prospects', icon: '📥', tab: 'prospects' },
      { label: 'Commencer', sub: 'Voir le tableau de bord', icon: '🚀', tab: null },
    ],
  },
  'recommandations': {
    icon: '⚡', color: '#7c3aed',
    title: 'Recommandations IA',
    desc: 'ATLAS analyse votre score IMAI et vous propose un plan d\'adoption IA prioritisé sur 12 semaines.',
    benefits: [
      'Score IMAI calculé sur 8 dimensions avec comparaison sectorielle',
      'Plan d\'adoption en 3 phases avec jalons clairs et actions concrètes',
      'Suivi de progression et recalcul automatique à chaque action complétée',
    ],
    actions: [
      { label: 'Voir mon score', sub: 'Score IMAI actuel', icon: '📊', tab: null },
      { label: 'Mon plan', sub: 'Plan 12 semaines', icon: '📅', tab: null },
      { label: 'Commencer', sub: 'Première recommandation', icon: '🚀', tab: null },
    ],
  },
  'automation': {
    icon: '⚡', color: '#6d28d9',
    title: 'Automatisation',
    desc: 'Connectez vos processus métier à vos outils et laissez vos agents IA travailler à votre place.',
    benefits: [
      'Déclenchez des workflows automatiques à partir d\'événements AgentHub ou planifiés',
      '9 modèles prêts à l\'emploi pour les cas d\'usage les plus fréquents',
      'Connecteurs natifs Teams, Outlook, HubSpot, ServiceNow et 50+ autres',
    ],
    actions: [
      { label: 'Explorer', sub: 'Bibliothèque de modèles', icon: '📚', tab: 'templates' },
      { label: 'Configurer', sub: 'Activer les déclencheurs', icon: '⚙️', tab: 'triggers' },
      { label: 'Créer', sub: 'Nouveau workflow', icon: '✨', tab: 'new' },
    ],
  },
  'marketplace': {
    icon: '🏪', color: '#0ea5e9',
    title: 'Workspace Marketplace',
    desc: 'Découvrez et installez des espaces de travail préconfigurés, des agents IA et des connecteurs pour votre secteur.',
    benefits: [
      'Plus de 30 workspaces préconfigurés par secteur : entreprise, santé, éducation',
      '9 agents IA spécialisés déployables en un clic',
      '12 connecteurs certifiés pour vos outils existants',
    ],
    actions: [
      { label: 'Workspaces', sub: 'Catalogue par secteur', icon: '🏪', tab: null },
      { label: 'Agents IA', sub: 'Explorer les agents', icon: '🤖', tab: 'agents' },
      { label: 'Connecteurs', sub: 'Intégrations disponibles', icon: '🔌', tab: 'connecteurs' },
    ],
  },
  'assets': {
    icon: '🖥', color: '#7c3aed',
    title: 'Parc TI',
    desc: 'Inventaire centralisé de tous vos équipements informatiques avec suivi des garanties et des coûts.',
    benefits: [
      'Vue unifiée de tous vos actifs : serveurs, postes, réseau et imprimantes',
      'Alertes automatiques avant l\'expiration des garanties pour éviter les surprises',
      'Coûts mensuels par actif et département pour optimiser votre budget TI',
    ],
    actions: [
      { label: 'Inventaire', sub: 'Voir tous les actifs', icon: '📋', tab: null },
      { label: 'Ajouter', sub: 'Enregistrer un actif', icon: '➕', tab: null },
      { label: 'Commencer', sub: 'Importer depuis CSV', icon: '📥', tab: null },
    ],
  },
  'budget': {
    icon: '💰', color: '#059669',
    title: 'Budget & Finances',
    desc: 'Pilotez votre budget par catégorie et département avec un suivi alloué vs réel en temps réel.',
    benefits: [
      'Tableau de bord financier avec alertes de dépassement budgétaire automatiques',
      'Prévisions IA basées sur les tendances historiques pour anticiper les besoins',
      'Module Coûts IA pour quantifier et optimiser votre investissement en intelligence artificielle',
    ],
    actions: [
      { label: 'Dashboard', sub: 'Vue consolidée', icon: '📊', tab: null },
      { label: 'Saisir', sub: 'Ajouter une entrée', icon: '✏️', tab: null },
      { label: 'Prévisions', sub: 'Projections N+1', icon: '📈', tab: 'previsions' },
    ],
  },
  'contracts': {
    icon: '📄', color: '#0284c7',
    title: 'Gestion des contrats',
    desc: 'Centralisez vos contrats fournisseurs et ne manquez plus aucun renouvellement critique.',
    benefits: [
      'Alertes proactives 90j, 30j et 7j avant chaque renouvellement important',
      'ATLAS identifie les opportunités de négociation et les économies potentielles',
      'Vue Fournisseurs consolidée pour maximiser votre levier de négociation',
    ],
    actions: [
      { label: 'Mes contrats', sub: 'Voir la liste', icon: '📋', tab: null },
      { label: 'Ajouter', sub: 'Nouveau contrat', icon: '➕', tab: null },
      { label: 'Alertes', sub: 'Renouvellements urgents', icon: '⚠️', tab: 'alertes' },
    ],
  },
  'sso-mfa': {
    icon: '🔐', color: '#1d4ed8',
    title: 'SSO & MFA',
    desc: 'Sécurisez l\'accès à votre organisation avec la connexion unique et l\'authentification multifacteur.',
    benefits: [
      'Connectez Microsoft Entra ID, Google Workspace, Okta ou Auth0 en 3 minutes',
      'Activez le MFA pour toute l\'organisation d\'un seul clic — réduit les risques de 99,9%',
      'Surveillance complète : sessions actives, journal des connexions, alertes en temps réel',
    ],
    actions: [
      { label: 'Configurer SSO', sub: 'Choisir un fournisseur', icon: '🔐', tab: 'providers' },
      { label: 'Activer MFA', sub: 'Protéger les comptes', icon: '📱', tab: 'mfa' },
      { label: 'Sessions', sub: 'Voir les connexions', icon: '👥', tab: 'sessions' },
    ],
  },
};

function _atlasOnboardCSS() {
  if (document.getElementById('ws-ob-css')) return;
  const s = document.createElement('style');
  s.id = 'ws-ob-css';
  s.textContent = `
.ws-ob{display:flex;align-items:center;justify-content:center;min-height:100%;padding:40px 20px;background:var(--bg-2,#f8fafc);animation:ws-ob-in .35s cubic-bezier(.16,1,.3,1)}
@keyframes ws-ob-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.ws-ob-card{background:#fff;border-radius:20px;padding:40px 44px;max-width:580px;width:100%;box-shadow:0 8px 40px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.05);position:relative}
.ws-ob-header{display:flex;align-items:center;gap:14px;margin-bottom:24px}
.ws-ob-atlas{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#1e1b4b,#4c1d95);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.ws-ob-atlas-label{font-size:12px;font-weight:700;color:#6d28d9;letter-spacing:.06em;text-transform:uppercase;margin-bottom:1px}
.ws-ob-atlas-sub{font-size:11px;color:#94a3b8}
.ws-ob-module{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.ws-ob-mod-icon{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}
.ws-ob-mod-name{font-size:22px;font-weight:800;color:#0f172a;line-height:1.1}
.ws-ob-mod-tag{font-size:11px;font-weight:600;padding:2px 10px;border-radius:99px;margin-top:4px;display:inline-block}
.ws-ob-desc{font-size:14px;color:#475569;line-height:1.65;margin-bottom:22px}
.ws-ob-benefits{display:flex;flex-direction:column;gap:10px;margin-bottom:28px;padding:18px 20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0}
.ws-ob-benefit{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#334155;line-height:1.5}
.ws-ob-check{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;margin-top:1px;color:#fff}
.ws-ob-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}
.ws-ob-action{border:1.5px solid #e2e8f0;border-radius:12px;padding:14px 12px;background:#fff;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:inherit}
.ws-ob-action:hover{border-color:currentColor;box-shadow:0 2px 12px rgba(0,0,0,.08);transform:translateY(-2px)}
.ws-ob-action-icon{font-size:22px}
.ws-ob-action-label{font-size:13px;font-weight:700;color:#0f172a}
.ws-ob-action-sub{font-size:11px;color:#94a3b8;text-align:center}
.ws-ob-skip{display:block;text-align:center;font-size:12px;color:#94a3b8;cursor:pointer;text-decoration:none;background:none;border:none;font-family:inherit;width:100%;padding:4px}
.ws-ob-skip:hover{color:#64748b;text-decoration:underline}
@media(max-width:540px){.ws-ob-card{padding:28px 20px}.ws-ob-actions{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

function _showAtlasOnboard(container, navItem, ctx, onDismiss) {
  _atlasOnboardCSS();
  const cfg = ATLAS_ONBOARD[navItem.appSlug];
  if (!cfg) { onDismiss(null); return; }

  container.innerHTML = `
<div class="ws-ob">
  <div class="ws-ob-card">
    <div class="ws-ob-header">
      <div class="ws-ob-atlas">🤖</div>
      <div>
        <div class="ws-ob-atlas-label">ATLAS vous accueille</div>
        <div class="ws-ob-atlas-sub">Votre assistant IA personnel</div>
      </div>
    </div>

    <div class="ws-ob-module">
      <div class="ws-ob-mod-icon" style="background:${cfg.color}18;color:${cfg.color}">${cfg.icon}</div>
      <div>
        <div class="ws-ob-mod-name">Bienvenue dans<br>${cfg.title}</div>
      </div>
    </div>

    <div class="ws-ob-desc">${cfg.desc}</div>

    <div class="ws-ob-benefits">
      ${cfg.benefits.map(b => `
      <div class="ws-ob-benefit">
        <div class="ws-ob-check" style="background:${cfg.color}">✓</div>
        <span>${b}</span>
      </div>`).join('')}
    </div>

    <div class="ws-ob-actions">
      ${cfg.actions.map(a => `
      <button class="ws-ob-action" data-tab="${a.tab || ''}" style="color:${cfg.color}">
        <div class="ws-ob-action-icon">${a.icon}</div>
        <div class="ws-ob-action-label">${a.label}</div>
        <div class="ws-ob-action-sub">${a.sub}</div>
      </button>`).join('')}
    </div>

    <button class="ws-ob-skip" data-tab="">Je connais déjà ce module →</button>
  </div>
</div>`;

  container.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab || null;
      onDismiss(tab);
    });
  });
}

async function _navigateTo(navItem) {
  if (_state.module?.unmount) _state.module.unmount($('ws-app-container'));
  _state.module = null; _state.activeApp = null;

  _state.activeNavItem = navItem;
  _saveLastRoute(navItem);

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

    } else if (navItem.route === '__decisions__') {
      const mod = await import('/static/workspace/decisions/main.js');
      _state.module = mod.default;
      const newPath = `/workspace/${_slug()}/decisions`;
      if (location.pathname !== newPath) history.pushState({ id: 'decisions' }, '', newPath);

    } else if (navItem.route === '__playbooks__') {
      const mod = await import('/static/workspace/playbooks/main.js');
      _state.module = mod.default;
      const newPath = `/workspace/${_slug()}/playbooks`;
      if (location.pathname !== newPath) history.pushState({ id: 'playbooks' }, '', newPath);

    } else if (navItem.route === '__orchestrations__') {
      const mod = await import('/static/workspace/orchestrations/main.js');
      _state.module = mod.default;
      const newPath = `/workspace/${_slug()}/orchestrations`;
      if (location.pathname !== newPath) history.pushState({ id: 'orchestrations' }, '', newPath);

    } else if (navItem.route === '__initiatives__') {
      const mod = await import('/static/workspace/initiatives/main.js');
      _state.module = mod.default;
      const newPath = `/workspace/${_slug()}/initiatives`;
      if (location.pathname !== newPath) history.pushState({ id: 'initiatives' }, '', newPath);

    } else if (navItem.route === '__politiques__') {
      const mod = await import('/static/workspace/politiques/main.js');
      _state.module = mod.default;
      const newPath = `/workspace/${_slug()}/politiques`;
      if (location.pathname !== newPath) history.pushState({ id: 'politiques' }, '', newPath);

    } else if (navItem.route === '__conformite__') {
      const mod = await import('/static/workspace/conformite/main.js');
      _state.module = mod.default;
      const newPath = `/workspace/${_slug()}/conformite`;
      if (location.pathname !== newPath) history.pushState({ id: 'conformite' }, '', newPath);

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

    const _doMount = (tab) => {
      $('ws-app-container').innerHTML = '';
      _state.module.mount($('ws-app-container'), ctx);
      if (tab) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const btn = $('ws-app-container').querySelector(`[data-tab="${tab}"]`) ||
                        $('ws-app-container').querySelector(`[data-ct-tab="${tab}"]`) ||
                        $('ws-app-container').querySelector(`[data-bg-tab="${tab}"]`) ||
                        $('ws-app-container').querySelector(`[data-as-tab="${tab}"]`) ||
                        $('ws-app-container').querySelector(`[data-mkt-tab="${tab}"]`);
            btn?.click();
          }, 80);
        });
      }
    };

    const _visitKey = `agenthub_onboard_${navItem.appSlug}`;
    if (navItem.appSlug && ATLAS_ONBOARD[navItem.appSlug] && !localStorage.getItem(_visitKey)) {
      $('ws-app-container').innerHTML = '';
      _showAtlasOnboard($('ws-app-container'), navItem, ctx, (tab) => {
        localStorage.setItem(_visitKey, new Date().toISOString());
        _doMount(tab);
      });
    } else {
      _doMount(null);
    }

  } catch (err) {
    const isNotFound = err?.name === 'TypeError' || err?.message?.includes('Failed to fetch') || err?.message?.includes('404') || err?.message?.includes('NetworkError');
    if (isNotFound) _showComingSoon(navItem.label);
    else _showAppError(navItem.label, err.message);
  }
}

window.addEventListener('ws:navigate', (e) => {
  const r = _resolveNavItems().find(n => n.id === e.detail?.id);
  if (r) _navigateTo(r);
});

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

  // Help → Centre d'aide (FAQ & support ticket)
  function _gotoHelp() {
    _closeAllPanels();
    const r = _resolveNavItems().find(n => n.id === 'help');
    if (r) _navigateTo(r);
  }

  // Wire topbar FAQ and "Contacter le support" buttons by text content
  $('ws-help-panel')?.querySelectorAll('.ws-menu-item').forEach(btn => {
    const title = btn.querySelector('.ws-menu-item-title')?.textContent?.trim();
    if (title === 'FAQ' || title === 'Contacter le support') {
      btn.addEventListener('click', _gotoHelp);
    }
  });

  // Logout
  $('ws-logout-btn')?.addEventListener('click', () => {
    _clearLastRoute(); // déconnexion volontaire → pas de restauration
    localStorage.removeItem('nexhire_token');
    localStorage.removeItem('nexhire_refresh_token');
    const slug = _slug();
    const isPartner = _state.partner && _state.partner.partner_type !== 'direct';
    window.location.href = (slug && isPartner) ? `/inscription?partenaire=${slug}` : '/inscription';
  });

  // User menu — navigation items
  const _userNavMap = {
    'Mon profil':                'settings',
    'Mon organisation':          'settings',
    'Préférences notifications': 'settings',
    'Inviter un utilisateur':    'identity',
    'Support':                   'help',
  };
  $('ws-user-panel')?.querySelectorAll('.ws-menu-item').forEach(btn => {
    if (btn.id === 'ws-logout-btn') return;
    const title = btn.querySelector('.ws-menu-item-title')?.textContent?.trim();
    const navId = _userNavMap[title];
    if (!navId) return;
    btn.addEventListener('click', () => {
      _closeAllPanels();
      const r = _resolveNavItems().find(n => n.id === navId);
      if (r && r.enabled) _navigateTo(r);
      else if (r) _toast(`${r.label} — module en cours de déploiement`, 'info');
    });
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
