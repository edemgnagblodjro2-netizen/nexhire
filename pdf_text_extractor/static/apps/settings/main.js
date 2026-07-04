/**
 * AgentHub Platform — App: Paramètres
 * 10 onglets fonctionnels : organisation, branding, utilisateurs, équipes,
 * langue, thème, notifications, sécurité, api, journal
 */

let _st = null;
let _el = null;

function _t(key) { return NH_I18N.t(key); }
function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _h()     { const t = _token(); return t ? { Authorization: `Bearer ${t}` } : {}; }
async function _api(path, opts = {}) {
  const r = await fetch(path, { headers: { ..._h(), 'Content-Type': 'application/json' }, credentials: 'include', ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || r.status); }
  return r.json();
}
async function _upload(path, formData) {
  const r = await fetch(path, { method: 'POST', headers: _h(), credentials: 'include', body: formData });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || r.status); }
  return r.json();
}

const TABS = [
  ['organisation', '🏢', 'st.tab.organisation'],
  ['branding',      '🎨', 'st.tab.branding'],
  ['utilisateurs',  '👥', 'st.tab.utilisateurs'],
  ['equipes',       '🏗️', 'st.tab.equipes'],
  ['langue',        '🌐', 'st.tab.langue'],
  ['theme',         '🌙', 'st.tab.theme'],
  ['notifications', '📧', 'st.tab.notifications'],
  ['securite',      '🔒', 'st.tab.securite'],
  ['api',           '⚙️', 'st.tab.api'],
  ['journal',       '📋', 'st.tab.journal'],
];

function _isAdmin() { return ['admin', 'owner'].includes((_st.profile || {}).role); }

function _showMsg(text, error = false) {
  const el = _el?.querySelector('#set-msg');
  if (!el) return;
  el.textContent = text;
  el.style.background = error ? '#fef2f2' : '#f0fdf4';
  el.style.borderColor = error ? '#fecaca' : '#bbf7d0';
  el.style.color = error ? '#dc2626' : '#16a34a';
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function _render() {
  if (!_el) return;
  const admin = _isAdmin();
  const adminOnly = ['branding', 'utilisateurs', 'equipes', 'api'];
  const visibleTabs = TABS.filter(([id]) => admin || !adminOnly.includes(id));

  _el.innerHTML = `
<div class="set-wrap">
  <div class="set-header">
    <h1 class="set-h1">${_t('st.title')}</h1>
    <p class="set-sub">${_t('st.sub')}</p>
  </div>
  <div id="set-msg" style="display:none;font-size:13px;font-weight:600;padding:10px 14px;border-radius:8px;border:1px solid;margin-bottom:16px"></div>
  <div class="set-layout">
    <nav class="set-nav">
      ${visibleTabs.map(([id, icon, i18nKey]) => `
        <button class="set-nav-item${_st.tab === id ? ' set-nav-active' : ''}" data-tab="${id}">
          <span class="set-nav-icon">${icon}</span>
          <span>${_t(i18nKey)}</span>
        </button>`).join('')}
    </nav>
    <div class="set-panel" id="set-panel">
      ${_renderTab()}
    </div>
  </div>
</div>`;

  _el.querySelectorAll('[data-tab]').forEach(b => {
    b.addEventListener('click', async () => {
      _st.tab = b.dataset.tab;
      await _loadTabData();
      _rerender();
    });
  });
  _bindTab();
}

function _rerender() {
  const panel = _el?.querySelector('#set-panel');
  if (panel) { panel.innerHTML = _renderTab(); _bindTab(); }
}

async function _loadTabData() {
  if (_st.tab === 'utilisateurs' && _st.members === null) {
    try {
      const r = await _api('/api/members?limit=200');
      _st.members = r.items || r.members || [];
    } catch { _st.members = []; }
  }
  if (_st.tab === 'equipes' && _st.departments === null) {
    try {
      const r = await _api('/api/departments');
      _st.departments = Array.isArray(r) ? r : (r.items || r.departments || []);
    } catch { _st.departments = []; }
  }
}

function _renderTab() {
  switch (_st.tab) {
    case 'organisation':  return _tabOrganisation();
    case 'branding':      return _tabBranding();
    case 'utilisateurs':  return _tabUtilisateurs();
    case 'equipes':       return _tabEquipes();
    case 'langue':        return _tabLangue();
    case 'theme':         return _tabTheme();
    case 'notifications': return _tabNotifications();
    case 'securite':      return _tabSecurite();
    case 'api':           return _tabApi();
    case 'journal':       return _tabJournal();
    default:              return _tabOrganisation();
  }
}

// ── Tab: Organisation ────────────────────────────────────────────────────────

function _tabOrganisation() {
  const p = _st.profile || {};
  const admin = _isAdmin();
  const orgTypes = [
    ['entreprise',    'st.org.type.entreprise'],
    ['entrepreneur',  'st.org.type.entrepreneur'],
    ['hopital',       'st.org.type.hopital'],
    ['municipalite',  'st.org.type.municipalite'],
    ['universite',    'st.org.type.universite'],
  ];
  return `
<div class="set-section">
  <h2 class="set-section-title">${_t('st.org.title')}</h2>
  ${admin ? `
  <form id="set-org-form" class="set-form">
    <div class="set-field">
      <label class="set-label" for="set-org-name">${_t('st.org.name.label')}</label>
      <input type="text" id="set-org-name" class="set-input" value="${_esc(p.organization_name)}" maxlength="255" required />
    </div>
    <div class="set-field">
      <label class="set-label" for="set-org-type">${_t('st.org.type.label')}</label>
      <select id="set-org-type" class="set-input">
        ${orgTypes.map(([v, k]) => `<option value="${v}"${p.org_type === v ? ' selected' : ''}>${_t(k)}</option>`).join('')}
      </select>
    </div>
    <div class="set-field">
      <label class="set-label">${_t('st.org.slug.label')}</label>
      <input type="text" class="set-input set-input-ro" value="${_esc(p.organization_slug)}" readonly />
    </div>
    <div class="set-field">
      <label class="set-label">${_t('st.org.plan.label')}</label>
      <input type="text" class="set-input set-input-ro" value="${_esc(p.subscription_status || 'starter')}" readonly />
    </div>
    <button type="submit" class="set-btn set-btn-primary">${_t('st.org.save')}</button>
  </form>` : `
  <div class="set-info-grid">
    ${_infoRow(_t('st.org.info.name'), p.organization_name || '—')}
    ${_infoRow(_t('st.org.info.slug'), p.organization_slug || '—', true)}
    ${_infoRow(_t('st.org.info.plan'), p.subscription_status || '—')}
  </div>`}
</div>

<div class="set-section">
  <h2 class="set-section-title">${_t('st.profile.title')}</h2>
  <form id="set-profile-form" class="set-form">
    <div class="set-field">
      <label class="set-label" for="set-full-name">${_t('st.profile.name.label')}</label>
      <input type="text" id="set-full-name" class="set-input" value="${_esc(p.full_name)}" maxlength="255" required />
    </div>
    <div class="set-field">
      <label class="set-label">${_t('st.profile.email.label')}</label>
      <input type="email" class="set-input set-input-ro" value="${_esc(p.email)}" readonly />
    </div>
    <div class="set-field">
      <label class="set-label">${_t('st.profile.role.label')}</label>
      <input type="text" class="set-input set-input-ro" value="${_esc(p.role || '—')}" readonly />
    </div>
    <div class="set-field">
      <label class="set-label">${_t('st.profile.since.label')}</label>
      <input type="text" class="set-input set-input-ro" value="${_esc(p.member_since || '—')}" readonly />
    </div>
    <button type="submit" class="set-btn set-btn-primary">${_t('st.profile.save')}</button>
  </form>
</div>`;
}

// ── Tab: Branding ────────────────────────────────────────────────────────────

function _tabBranding() {
  const p = _st.profile || {};
  const color = p.brand_color || '#818CF8';
  return `
<div class="set-section">
  <h2 class="set-section-title">${_t('st.brand.logo.title')}</h2>
  <div class="set-logo-area">
    ${p.logo_url
      ? `<img src="${_esc(p.logo_url)}" alt="Logo" class="set-logo-preview" />`
      : `<div class="set-logo-placeholder">${_t('st.brand.logo.none')}</div>`}
    <div class="set-logo-upload">
      <label class="set-btn set-btn-secondary" for="set-logo-file" style="cursor:pointer">${_t('st.brand.logo.choose')}</label>
      <input type="file" id="set-logo-file" accept="image/png,image/jpeg,image/svg+xml" style="position:absolute;opacity:0;width:1px;height:1px" />
      <span class="set-logo-hint">${_t('st.brand.logo.hint')}</span>
    </div>
  </div>
</div>

<div class="set-section">
  <h2 class="set-section-title">${_t('st.brand.color.title')}</h2>
  <form id="set-color-form" class="set-form">
    <div class="set-color-row">
      <input type="color" id="set-color-input" class="set-color-picker" value="${color}" />
      <input type="text" id="set-color-text" class="set-input" value="${color}" style="max-width:110px;font-family:monospace;font-size:13px" maxlength="7" />
      <div id="set-color-preview" style="width:36px;height:36px;border-radius:8px;background:${color};border:1px solid rgba(0,0,0,.12);flex-shrink:0"></div>
      <button type="submit" class="set-btn set-btn-primary">${_t('st.brand.color.apply')}</button>
    </div>
    <p class="set-hint">${_t('st.brand.color.hint')}</p>
  </form>
</div>`;
}

// ── Tab: Utilisateurs ────────────────────────────────────────────────────────

function _tabUtilisateurs() {
  const members = _st.members;
  if (members === null) return `<div class="set-loading">${_t('st.users.loading')}</div>`;
  const p = _st.profile || {};

  return `
<div class="set-section">
  <div class="set-section-header">
    <h2 class="set-section-title" style="margin:0;border:none;padding:0">${members.length} ${_t(members.length !== 1 ? 'st.users.member.many' : 'st.users.member.one')}</h2>
    <button class="set-btn set-btn-primary" id="set-invite-btn">${_t('st.users.invite.btn')}</button>
  </div>

  <div class="set-members-list">
    <div class="set-members-header">
      <span>${_t('st.users.col.member')}</span><span>${_t('st.users.col.role')}</span><span>${_t('st.users.col.status')}</span><span>${_t('st.users.col.actions')}</span>
    </div>
    ${members.map(m => {
      const isSelf   = m.id === p.id;
      const isOwner  = m.role === 'owner';
      const isActive = m.is_active !== false;
      const canEdit  = !isSelf && !isOwner;
      return `
    <div class="set-member-row">
      <div class="set-member-info">
        <div class="set-member-avatar">${(m.full_name || m.email || '?')[0].toUpperCase()}</div>
        <div>
          <div class="set-member-name">${_esc(m.full_name || '—')}</div>
          <div class="set-member-email">${_esc(m.email)}</div>
        </div>
      </div>
      <div>
        ${canEdit ? `
        <select class="set-role-select" data-member="${m.id}" data-current="${m.role}">
          <option value="admin"${m.role === 'admin' ? ' selected' : ''}>${_t('st.users.role.admin')}</option>
          <option value="manager"${m.role === 'manager' ? ' selected' : ''}>${_t('st.users.role.manager')}</option>
          <option value="user"${m.role === 'user' ? ' selected' : ''}>${_t('st.users.role.user')}</option>
        </select>` : `<span class="set-role-badge">${_esc(m.role)}</span>`}
      </div>
      <div><span class="set-badge-${isActive ? 'ok' : 'off'}">${isActive ? _t('st.users.active') : _t('st.users.inactive')}</span></div>
      <div class="set-member-actions">
        ${canEdit ? `
        <button class="set-btn-icon" title="${isActive ? _t('st.users.deactivate') : _t('st.users.reactivate')}" data-action="toggle-active" data-member="${m.id}">
          ${isActive ? '⏸️' : '▶️'}
        </button>
        <button class="set-btn-icon set-btn-danger" title="${_t('st.users.delete')}" data-action="delete" data-member="${m.id}">🗑️</button>
        ` : '—'}
      </div>
    </div>`;
    }).join('')}
  </div>
</div>

<div id="set-invite-modal" class="set-modal" style="display:none">
  <div class="set-modal-box">
    <div class="set-modal-header">
      <h3 style="margin:0;font-size:16px;font-weight:700">${_t('st.users.modal.title')}</h3>
      <button class="set-modal-close" id="set-modal-close">✕</button>
    </div>
    <form id="set-invite-form" class="set-form" style="margin-top:16px">
      <div class="set-field">
        <label class="set-label" for="set-invite-email">${_t('st.users.email.label')}</label>
        <input type="email" id="set-invite-email" class="set-input" placeholder="prenom.nom@entreprise.com" required />
      </div>
      <div class="set-field">
        <label class="set-label" for="set-invite-role">${_t('st.users.role.label')}</label>
        <select id="set-invite-role" class="set-input">
          <option value="user">${_t('st.users.role.user')}</option>
          <option value="manager">${_t('st.users.role.manager')}</option>
          <option value="admin">${_t('st.users.role.admin')}</option>
        </select>
      </div>
      <div id="set-invite-msg" style="display:none;font-size:12px;padding:8px 10px;border-radius:6px;border:1px solid;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px">
        <button type="submit" class="set-btn set-btn-primary">${_t('st.users.invite.send')}</button>
        <button type="button" class="set-btn set-btn-secondary" id="set-modal-cancel">${_t('st.cancel')}</button>
      </div>
    </form>
  </div>
</div>`;
}

// ── Tab: Équipes ─────────────────────────────────────────────────────────────

function _tabEquipes() {
  const depts = _st.departments;
  if (depts === null) return `<div class="set-loading">${_t('st.teams.loading')}</div>`;

  return `
<div class="set-section">
  <div class="set-section-header">
    <h2 class="set-section-title" style="margin:0;border:none;padding:0">${depts.length} ${_t(depts.length !== 1 ? 'st.teams.team.many' : 'st.teams.team.one')}</h2>
    <button class="set-btn set-btn-primary" id="set-dept-create-btn">${_t('st.teams.create.btn')}</button>
  </div>

  ${depts.length === 0
    ? `<p style="color:var(--muted);font-size:13px;margin-top:8px">${_t('st.teams.empty')}</p>`
    : `<div class="set-list-card">
      ${depts.map(d => `
      <div class="set-list-row">
        <span style="font-size:20px">🏗️</span>
        <div class="set-list-info">
          <div class="set-list-name">${_esc(d.name)}</div>
          <div class="set-list-meta">${d.member_count ?? 0} ${_t((d.member_count ?? 0) !== 1 ? 'st.teams.member.many' : 'st.teams.member.one')}</div>
        </div>
      </div>`).join('')}
    </div>`}

  <div id="set-dept-form" class="set-form" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-2)">
    <div class="set-field">
      <label class="set-label" for="set-dept-name">${_t('st.teams.name.label')}</label>
      <input type="text" id="set-dept-name" class="set-input" placeholder="${_t('st.teams.name.ph')}" maxlength="100" />
    </div>
    <div style="display:flex;gap:8px">
      <button class="set-btn set-btn-primary" id="set-dept-save">${_t('st.teams.create.save')}</button>
      <button class="set-btn set-btn-secondary" id="set-dept-cancel">${_t('st.cancel')}</button>
    </div>
  </div>
</div>`;
}

// ── Tab: Langue ──────────────────────────────────────────────────────────────

function _tabLangue() {
  const p = _st.profile || {};
  const lang = p.language || 'fr';
  const tz   = p.timezone || 'America/Toronto';
  const tzOpts = [
    ['America/Toronto',   'st.tz.toronto'],
    ['America/Winnipeg',  'st.tz.winnipeg'],
    ['America/Edmonton',  'st.tz.edmonton'],
    ['America/Vancouver', 'st.tz.vancouver'],
    ['America/Halifax',   'st.tz.halifax'],
    ['America/St_Johns',  'st.tz.stjohns'],
    ['UTC',               'st.tz.utc'],
    ['Europe/Paris',      'st.tz.paris'],
  ];
  return `
<div class="set-section">
  <h2 class="set-section-title">${_t('st.lang.title')}</h2>
  <form id="set-lang-form" class="set-form">
    <div class="set-field">
      <label class="set-label" for="set-lang-select">${_t('st.lang.lang.label')}</label>
      <select id="set-lang-select" class="set-input" style="max-width:280px">
        <option value="fr"${lang === 'fr' ? ' selected' : ''}>🇫🇷 Français (Canada)</option>
        <option value="en"${lang === 'en' ? ' selected' : ''}>🇬🇧 English</option>
      </select>
    </div>
    <div class="set-field">
      <label class="set-label" for="set-tz-select">${_t('st.lang.tz.label')}</label>
      <select id="set-tz-select" class="set-input" style="max-width:440px">
        ${tzOpts.map(([v, k]) => `<option value="${v}"${tz === v ? ' selected' : ''}>${_t(k)}</option>`).join('')}
      </select>
    </div>
    <button type="submit" class="set-btn set-btn-primary">${_t('st.lang.save')}</button>
    <p class="set-hint">${_t('st.lang.hint')}</p>
  </form>
</div>`;
}

// ── Tab: Thème ───────────────────────────────────────────────────────────────

function _tabTheme() {
  const current = localStorage.getItem('agenthub-theme') || 'system';
  const opts = [['light','☀️','st.theme.light'], ['dark','🌙','st.theme.dark'], ['system','🖥️','st.theme.system']];
  return `
<div class="set-section">
  <h2 class="set-section-title">${_t('st.theme.title')}</h2>
  <div class="set-theme-options">
    ${opts.map(([val, icon, key]) => `
    <button class="set-theme-option${current === val ? ' set-theme-active' : ''}" data-theme="${val}">
      <span style="font-size:24px">${icon}</span>
      <span class="set-theme-label">${_t(key)}</span>
      ${current === val ? '<span class="set-theme-check">✓</span>' : ''}
    </button>`).join('')}
  </div>
  <p class="set-hint">${_t('st.theme.hint')}</p>
</div>`;
}

// ── Tab: Notifications ───────────────────────────────────────────────────────

function _tabNotifications() {
  const enabled = (_st.profile || {}).monthly_report_enabled !== false;
  return `
<div class="set-section">
  <h2 class="set-section-title">${_t('st.notif.title')}</h2>
  <div class="set-notif-list">
    <div class="set-notif-row">
      <div class="set-notif-info">
        <div class="set-notif-title">${_t('st.notif.monthly.title')}</div>
        <div class="set-notif-desc">${_t('st.notif.monthly.desc')}</div>
      </div>
      <label class="set-toggle">
        <input type="checkbox" id="set-monthly-toggle" ${enabled ? 'checked' : ''} />
        <span class="set-toggle-slider"></span>
      </label>
    </div>
    <div class="set-notif-row">
      <div class="set-notif-info">
        <div class="set-notif-title">${_t('st.notif.weekly.title')}</div>
        <div class="set-notif-desc">${_t('st.notif.weekly.desc')}</div>
      </div>
      <span class="set-badge-ok" style="font-size:11px">${_t('st.notif.always')}</span>
    </div>
    <div class="set-notif-row">
      <div class="set-notif-info">
        <div class="set-notif-title">${_t('st.notif.contracts.title')}</div>
        <div class="set-notif-desc">${_t('st.notif.contracts.desc')}</div>
      </div>
      <span class="set-badge-ok" style="font-size:11px">${_t('st.notif.always')}</span>
    </div>
  </div>
  <div id="set-notif-msg" style="display:none;font-size:12px;margin-top:10px"></div>
</div>`;
}

// ── Tab: Sécurité ────────────────────────────────────────────────────────────

function _tabSecurite() {
  const p = _st.profile || {};
  return `
<div class="set-section">
  <h2 class="set-section-title">${_t('st.sec.title')}</h2>
  <div class="set-info-grid">
    ${_infoRow(_t('st.sec.auth'),      `<span class="set-badge-ok">${_t('st.sec.auth.val')}</span>`)}
    ${_infoRow(_t('st.sec.tls'),       `<span class="set-badge-ok">${_t('st.sec.tls.val')}</span>`)}
    ${_infoRow(_t('st.sec.isolation'), `<span class="set-badge-ok">${_t('st.sec.isolation.val')}</span>`)}
    ${_infoRow(_t('st.sec.host'),       _t('st.sec.host.val'))}
    ${_infoRow(_t('st.sec.compliance'), _t('st.sec.compliance.val'))}
    ${_infoRow(_t('st.sec.sso'),        p.sso_enabled
        ? `<span class="set-badge-ok">${_t('st.sec.sso.ok')}</span>`
        : `<span class="set-badge-off">${_t('st.sec.sso.off')}</span>`)}
  </div>
</div>

<div class="set-section">
  <h2 class="set-section-title">${_t('st.sec.pwd.title')}</h2>
  <form id="set-pwd-form" class="set-form" style="max-width:400px">
    <div class="set-field">
      <label class="set-label" for="set-pwd-current">${_t('st.sec.pwd.current')}</label>
      <input type="password" id="set-pwd-current" class="set-input" autocomplete="current-password" required />
    </div>
    <div class="set-field">
      <label class="set-label" for="set-pwd-new">${_t('st.sec.pwd.new')}</label>
      <input type="password" id="set-pwd-new" class="set-input" autocomplete="new-password" minlength="8" required />
    </div>
    <div class="set-field">
      <label class="set-label" for="set-pwd-confirm">${_t('st.sec.pwd.confirm')}</label>
      <input type="password" id="set-pwd-confirm" class="set-input" autocomplete="new-password" minlength="8" required />
    </div>
    <div id="set-pwd-msg" style="display:none;font-size:12px;padding:8px 10px;border-radius:6px;border:1px solid;margin-bottom:8px"></div>
    <button type="submit" class="set-btn set-btn-primary">${_t('st.sec.pwd.save')}</button>
  </form>
</div>`;
}

// ── Tab: API ─────────────────────────────────────────────────────────────────

function _tabApi() {
  return `
<div class="set-section">
  <h2 class="set-section-title">${_t('st.api.title')}</h2>
  <p style="font-size:13px;color:var(--text-sub);margin-bottom:20px">${_t('st.api.desc')}</p>
  <div style="text-align:center;padding:32px 24px;border:1px dashed var(--border);border-radius:12px">
    <div style="font-size:36px;margin-bottom:12px">⚙️</div>
    <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px">${_t('st.api.sa.title')}</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">${_t('st.api.sa.desc')}</div>
    <button class="set-btn set-btn-primary" data-navigate="service-accounts">${_t('st.api.sa.btn')}</button>
  </div>
</div>`;
}

// ── Tab: Journal ─────────────────────────────────────────────────────────────

function _tabJournal() {
  return `
<div class="set-section">
  <h2 class="set-section-title">${_t('st.journal.title')}</h2>
  <p style="font-size:13px;color:var(--text-sub);margin-bottom:20px">${_t('st.journal.desc')}</p>
  <div style="text-align:center;padding:32px 24px;border:1px dashed var(--border);border-radius:12px">
    <div style="font-size:36px;margin-bottom:12px">📋</div>
    <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px">${_t('st.journal.full.title')}</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px">${_t('st.journal.full.desc')}</div>
    <button class="set-btn set-btn-primary" data-navigate="audit">${_t('st.journal.full.btn')}</button>
  </div>
</div>`;
}

// ── Event binding per tab ────────────────────────────────────────────────────

function _bindTab() {
  if (!_el) return;
  const panel = _el.querySelector('#set-panel') || _el;

  // Navigation CTAs (api, journal tabs)
  panel.querySelectorAll('[data-navigate]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('ws:navigate', { detail: { appSlug: btn.dataset.navigate } }));
    });
  });

  switch (_st.tab) {
    case 'organisation':  _bindOrganisation(panel); break;
    case 'branding':      _bindBranding(panel);      break;
    case 'utilisateurs':  _bindUtilisateurs(panel);  break;
    case 'equipes':       _bindEquipes(panel);        break;
    case 'langue':        _bindLangue(panel);         break;
    case 'theme':         _bindTheme(panel);          break;
    case 'notifications': _bindNotifications(panel);  break;
    case 'securite':      _bindSecurite(panel);       break;
  }
}

function _bindOrganisation(panel) {
  if (_isAdmin()) {
    panel.querySelector('#set-org-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const org_name = panel.querySelector('#set-org-name').value.trim();
      const org_type = panel.querySelector('#set-org-type').value;
      try {
        await _api('/api/settings/org', { method: 'PATCH', body: JSON.stringify({ org_name, org_type }) });
        _st.profile.organization_name = org_name;
        _st.profile.org_type = org_type;
        _showMsg(_t('st.msg.org.saved'));
      } catch(e) { _showMsg(e.message, true); }
    });
  }
  panel.querySelector('#set-profile-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const full_name = panel.querySelector('#set-full-name').value.trim();
    try {
      await _api('/api/settings/profile', { method: 'PATCH', body: JSON.stringify({ full_name }) });
      _st.profile.full_name = full_name;
      _showMsg(_t('st.msg.profile.saved'));
    } catch(e) { _showMsg(e.message, true); }
  });
}

function _bindBranding(panel) {
  const fileInput = panel.querySelector('#set-logo-file');
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await _upload('/api/settings/org/logo', fd);
      _st.profile.logo_url = res.logo_url;
      _showMsg(_t('st.msg.logo.saved'));
      _rerender();
    } catch(e) { _showMsg(e.message, true); }
  });

  const colorInput = panel.querySelector('#set-color-input');
  const colorText  = panel.querySelector('#set-color-text');
  const colorPrev  = panel.querySelector('#set-color-preview');
  colorInput?.addEventListener('input', () => {
    if (colorText) colorText.value = colorInput.value;
    if (colorPrev) colorPrev.style.background = colorInput.value;
  });
  colorText?.addEventListener('input', () => {
    if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) {
      if (colorInput) colorInput.value = colorText.value;
      if (colorPrev)  colorPrev.style.background = colorText.value;
    }
  });
  panel.querySelector('#set-color-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const brand_color = colorInput.value;
    try {
      await _api('/api/settings/org', { method: 'PATCH', body: JSON.stringify({ brand_color }) });
      _st.profile.brand_color = brand_color;
      document.documentElement.style.setProperty('--primary', brand_color);
      _showMsg(_t('st.msg.color.saved'));
    } catch(e) { _showMsg(e.message, true); }
  });
}

function _bindUtilisateurs(panel) {
  // Invite modal
  panel.querySelector('#set-invite-btn')?.addEventListener('click', () => {
    panel.querySelector('#set-invite-modal').style.display = 'flex';
  });
  ['#set-modal-close', '#set-modal-cancel'].forEach(sel => {
    panel.querySelector(sel)?.addEventListener('click', () => {
      panel.querySelector('#set-invite-modal').style.display = 'none';
    });
  });
  panel.querySelector('#set-invite-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email   = panel.querySelector('#set-invite-email').value.trim();
    const role    = panel.querySelector('#set-invite-role').value;
    const msgEl   = panel.querySelector('#set-invite-msg');
    try {
      await _api('/api/members/invite', { method: 'POST', body: JSON.stringify({ email, role }) });
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.background = '#f0fdf4'; msgEl.style.borderColor = '#bbf7d0'; msgEl.style.color = '#16a34a';
        msgEl.textContent = `${_t('st.msg.invite.prefix')} ${email}.`;
      }
      panel.querySelector('#set-invite-email').value = '';
      _st.members = null;
      setTimeout(() => { panel.querySelector('#set-invite-modal').style.display = 'none'; }, 1800);
    } catch(e) {
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.background = '#fef2f2'; msgEl.style.borderColor = '#fecaca'; msgEl.style.color = '#dc2626';
        msgEl.textContent = e.message;
      }
    }
  });

  // Role change
  panel.querySelectorAll('.set-role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id   = sel.dataset.member;
      const role = sel.value;
      const prev = sel.dataset.current;
      try {
        await _api(`/api/members/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
        sel.dataset.current = role;
        if (_st.members) _st.members = _st.members.map(m => m.id === id ? { ...m, role } : m);
        _showMsg(_t('st.msg.role.saved'));
      } catch(e) { _showMsg(e.message, true); sel.value = prev; }
    });
  });

  // Deactivate / Delete
  panel.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id     = btn.dataset.member;
      const action = btn.dataset.action;
      if (action === 'delete') {
        if (!confirm(_t('st.msg.confirm.delete'))) return;
        try {
          await _api(`/api/members/${id}`, { method: 'DELETE' });
          if (_st.members) _st.members = _st.members.filter(m => m.id !== id);
          _showMsg(_t('st.msg.member.deleted'));
          _rerender();
        } catch(e) { _showMsg(e.message, true); }
      } else if (action === 'toggle-active') {
        try {
          const res = await _api(`/api/members/${id}/active`, { method: 'PATCH' });
          if (_st.members) _st.members = _st.members.map(m => m.id === id ? { ...m, is_active: res.is_active } : m);
          _showMsg(res.is_active ? _t('st.msg.member.activated') : _t('st.msg.member.deactivated'));
          _rerender();
        } catch(e) { _showMsg(e.message, true); }
      }
    });
  });
}

function _bindEquipes(panel) {
  panel.querySelector('#set-dept-create-btn')?.addEventListener('click', () => {
    const form = panel.querySelector('#set-dept-form');
    if (form) form.style.display = 'block';
  });
  panel.querySelector('#set-dept-cancel')?.addEventListener('click', () => {
    const form = panel.querySelector('#set-dept-form');
    if (form) form.style.display = 'none';
  });
  panel.querySelector('#set-dept-save')?.addEventListener('click', async () => {
    const nameInput = panel.querySelector('#set-dept-name');
    const name = nameInput?.value.trim();
    if (!name) return;
    try {
      const dept = await _api('/api/departments', { method: 'POST', body: JSON.stringify({ name }) });
      _st.departments = [...(_st.departments || []), dept];
      _showMsg(_t('st.msg.team.created'));
      _rerender();
    } catch(e) { _showMsg(e.message, true); }
  });
}

function _bindLangue(panel) {
  panel.querySelector('#set-lang-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const language = panel.querySelector('#set-lang-select').value;
    const timezone = panel.querySelector('#set-tz-select').value;
    try {
      await _api('/api/settings/org', { method: 'PATCH', body: JSON.stringify({ language, timezone }) });
      if (_st.profile) { _st.profile.language = language; _st.profile.timezone = timezone; }
      NH_I18N.setLang(language);
      _showMsg(_t('st.msg.lang.saved'));
    } catch(e) { _showMsg(e.message, true); }
  });
}

function _bindTheme(panel) {
  panel.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      localStorage.setItem('agenthub-theme', theme);
      _applyTheme(theme);
      _rerender();
    });
  });
}

function _applyTheme(theme) {
  const html = document.documentElement;
  html.classList.remove('theme-light', 'theme-dark');
  if (theme === 'light') html.classList.add('theme-light');
  else if (theme === 'dark') html.classList.add('theme-dark');
}

function _bindNotifications(panel) {
  const toggle = panel.querySelector('#set-monthly-toggle');
  const msg    = panel.querySelector('#set-notif-msg');
  if (!toggle) return;
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    try {
      await _api('/api/settings/monthly-report', { method: 'PATCH', body: JSON.stringify({ enabled }) });
      if (_st.profile) _st.profile.monthly_report_enabled = enabled;
      if (msg) {
        msg.style.display = 'block'; msg.style.color = '#16a34a';
        msg.textContent = enabled ? _t('st.msg.report.on') : _t('st.msg.report.off');
        setTimeout(() => { msg.style.display = 'none'; }, 3000);
      }
    } catch(e) {
      toggle.checked = !enabled;
      if (msg) { msg.style.display = 'block'; msg.style.color = '#dc2626'; msg.textContent = `${_t('st.msg.error.prefix')} ${e.message}`; }
    }
  });
}

function _bindSecurite(panel) {
  const form  = panel.querySelector('#set-pwd-form');
  const msgEl = panel.querySelector('#set-pwd-msg');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const current_password = panel.querySelector('#set-pwd-current').value;
    const new_password     = panel.querySelector('#set-pwd-new').value;
    const confirm          = panel.querySelector('#set-pwd-confirm').value;
    if (new_password !== confirm) {
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.background = '#fef2f2'; msgEl.style.borderColor = '#fecaca'; msgEl.style.color = '#dc2626';
        msgEl.textContent = _t('st.msg.pwd.mismatch');
      }
      return;
    }
    try {
      await _api('/api/settings/password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) });
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.background = '#f0fdf4'; msgEl.style.borderColor = '#bbf7d0'; msgEl.style.color = '#16a34a';
        msgEl.textContent = _t('st.msg.pwd.saved');
      }
      form.reset();
    } catch(e) {
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.background = '#fef2f2'; msgEl.style.borderColor = '#fecaca'; msgEl.style.color = '#dc2626';
        msgEl.textContent = e.message;
      }
    }
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _infoRow(label, value, mono = false) {
  return `
<div class="set-info-row">
  <span class="set-info-label">${label}</span>
  <span class="set-info-value${mono ? ' set-mono' : ''}">${value}</span>
</div>`;
}

function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── CSS ──────────────────────────────────────────────────────────────────────

function _css() {
  if (document.getElementById('set-css')) return;
  const s = document.createElement('style');
  s.id = 'set-css';
  s.textContent = `
.set-wrap{padding:var(--sp-8,24px);max-width:900px;margin:0 auto;font-family:var(--font,'Segoe UI',system-ui,sans-serif)}
.set-header{margin-bottom:24px}
.set-h1{font-size:22px;font-weight:700;color:var(--text);margin:0 0 4px}
.set-sub{font-size:13px;color:var(--text-sub);margin:0}
.set-loading{padding:40px;text-align:center;color:var(--muted);font-size:13px}

/* Layout */
.set-layout{display:flex;gap:24px;align-items:flex-start}
.set-nav{flex-shrink:0;width:180px;display:flex;flex-direction:column;gap:2px;position:sticky;top:24px}
.set-nav-item{display:flex;align-items:center;gap:10px;background:none;border:none;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:500;color:var(--text-sub);cursor:pointer;text-align:left;width:100%;transition:background .15s,color .15s}
.set-nav-item:hover{background:var(--bg-2,#f8fafc);color:var(--text)}
.set-nav-active{background:var(--primary-lt,#ede9fe);color:var(--primary,#818CF8);font-weight:700}
.set-nav-icon{font-size:16px;flex-shrink:0;width:20px;text-align:center}
.set-panel{flex:1;min-width:0}

/* Sections */
.set-section{margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid var(--border-2,#f1f5f9)}
.set-section:last-child{border-bottom:none}
.set-section-title{font-size:14px;font-weight:700;color:var(--text);margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid var(--border-2,#f1f5f9)}
.set-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}

/* Info grid */
.set-info-grid{display:flex;flex-direction:column;gap:0;border:1px solid var(--border,#e2e8f0);border-radius:10px;overflow:hidden}
.set-info-row{display:flex;align-items:center;gap:16px;padding:10px 14px;border-bottom:1px solid var(--border-2,#f1f5f9)}
.set-info-row:last-child{border-bottom:none}
.set-info-label{font-size:13px;color:var(--text-sub);min-width:160px;flex-shrink:0}
.set-info-value{font-size:13px;color:var(--text);font-weight:500}
.set-mono{font-family:monospace;font-size:12px;background:var(--bg-2,#f8fafc);padding:2px 8px;border-radius:4px}

/* Forms */
.set-form{display:flex;flex-direction:column;gap:14px}
.set-field{display:flex;flex-direction:column;gap:5px}
.set-label{font-size:12px;font-weight:600;color:var(--text-sub);letter-spacing:.01em}
.set-input{width:100%;max-width:480px;padding:8px 12px;border:1px solid var(--border,#e2e8f0);border-radius:8px;font-size:13px;color:var(--text);background:var(--bg,#fff);font-family:inherit;box-sizing:border-box;transition:border-color .15s;outline:none}
.set-input:focus{border-color:var(--primary,#818CF8);box-shadow:0 0 0 3px rgba(129,140,248,.12)}
.set-input-ro{background:var(--bg-2,#f8fafc);color:var(--muted);cursor:default}
.set-input-ro:focus{border-color:var(--border,#e2e8f0);box-shadow:none}
.set-hint{font-size:12px;color:var(--muted);margin:0;line-height:1.4}

/* Buttons */
.set-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:background .15s,opacity .15s;white-space:nowrap}
.set-btn-primary{background:var(--primary,#818CF8);color:#fff}
.set-btn-primary:hover{opacity:.88}
.set-btn-secondary{background:var(--bg-2,#f1f5f9);color:var(--text);border:1px solid var(--border,#e2e8f0)}
.set-btn-secondary:hover{background:var(--border,#e2e8f0)}
.set-btn-icon{background:none;border:1px solid var(--border,#e2e8f0);border-radius:6px;padding:5px 8px;cursor:pointer;font-size:14px;transition:background .15s}
.set-btn-icon:hover{background:var(--bg-2,#f1f5f9)}
.set-btn-danger{border-color:#fecaca;color:#dc2626}
.set-btn-danger:hover{background:#fef2f2}

/* Badges */
.set-badge-ok{background:var(--color-ok-bg,#dcfce7);color:var(--color-ok-text,#15803d);font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px}
.set-badge-off{background:var(--bg-2,#f1f5f9);color:var(--muted);font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px}
.set-role-badge{font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;background:var(--primary-lt,#ede9fe);color:var(--primary-dk,#4338ca);text-transform:uppercase;letter-spacing:.04em}
.set-plan-badge{background:var(--primary-lt,#ede9fe);color:var(--primary-dk,#4338ca);font-size:12px;font-weight:700;padding:2px 10px;border-radius:99px;text-transform:uppercase;letter-spacing:.05em}

/* Members */
.set-members-list{border:1px solid var(--border,#e2e8f0);border-radius:10px;overflow:hidden}
.set-members-header{display:grid;grid-template-columns:1fr 120px 80px 80px;gap:8px;padding:8px 14px;background:var(--bg-2,#f8fafc);border-bottom:1px solid var(--border,#e2e8f0);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.set-member-row{display:grid;grid-template-columns:1fr 120px 80px 80px;gap:8px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--border-2,#f1f5f9)}
.set-member-row:last-child{border-bottom:none}
.set-member-info{display:flex;align-items:center;gap:10px;min-width:0}
.set-member-avatar{width:32px;height:32px;border-radius:50%;background:var(--primary,#818CF8);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}
.set-member-name{font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.set-member-email{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.set-member-actions{display:flex;gap:4px;align-items:center}
.set-role-select{padding:4px 8px;border:1px solid var(--border,#e2e8f0);border-radius:6px;font-size:12px;background:var(--bg,#fff);cursor:pointer;font-family:inherit}

/* Branding */
.set-logo-area{display:flex;align-items:center;gap:20px;margin-bottom:4px}
.set-logo-preview{max-height:60px;max-width:200px;object-fit:contain;border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:8px;background:var(--bg,#fff)}
.set-logo-placeholder{width:80px;height:60px;border:1px dashed var(--border,#e2e8f0);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--muted);background:var(--bg-2,#f8fafc)}
.set-logo-upload{display:flex;align-items:center;gap:10px;position:relative}
.set-logo-hint{font-size:11px;color:var(--muted)}
.set-color-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.set-color-picker{width:44px;height:38px;padding:2px;border:1px solid var(--border,#e2e8f0);border-radius:8px;cursor:pointer;background:none}

/* Theme */
.set-theme-options{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.set-theme-option{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 24px;border:2px solid var(--border,#e2e8f0);border-radius:12px;background:var(--bg,#fff);cursor:pointer;font-family:inherit;transition:border-color .15s;position:relative}
.set-theme-option:hover{border-color:var(--primary,#818CF8)}
.set-theme-active{border-color:var(--primary,#818CF8);background:var(--primary-lt,#ede9fe)}
.set-theme-label{font-size:13px;font-weight:600;color:var(--text)}
.set-theme-check{position:absolute;top:8px;right:10px;font-size:11px;color:var(--primary,#818CF8);font-weight:700}

/* Notifications */
.set-notif-list{border:1px solid var(--border,#e2e8f0);border-radius:10px;overflow:hidden}
.set-notif-row{display:flex;align-items:center;gap:16px;padding:14px 16px;border-bottom:1px solid var(--border-2,#f1f5f9)}
.set-notif-row:last-child{border-bottom:none}
.set-notif-info{flex:1}
.set-notif-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px}
.set-notif-desc{font-size:12px;color:var(--muted);line-height:1.4}
.set-toggle{position:relative;display:inline-block;width:40px;height:22px;flex-shrink:0}
.set-toggle input{opacity:0;width:0;height:0}
.set-toggle-slider{position:absolute;cursor:pointer;inset:0;background:#cbd5e1;border-radius:99px;transition:.2s}
.set-toggle-slider::before{content:'';position:absolute;width:16px;height:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.set-toggle input:checked+.set-toggle-slider{background:var(--primary,#818CF8)}
.set-toggle input:checked+.set-toggle-slider::before{transform:translateX(18px)}

/* Modal */
.set-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.set-modal-box{background:var(--bg,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:24px;min-width:380px;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,.12)}
.set-modal-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.set-modal-close{background:none;border:none;font-size:16px;cursor:pointer;color:var(--muted);padding:4px;border-radius:4px}
.set-modal-close:hover{background:var(--bg-2,#f8fafc)}

/* List card */
.set-list-card{border:1px solid var(--border,#e2e8f0);border-radius:10px;overflow:hidden;margin-bottom:16px}
.set-list-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border-2,#f1f5f9)}
.set-list-row:last-child{border-bottom:none}
.set-list-info{flex:1}
.set-list-name{font-size:13px;font-weight:600;color:var(--text)}
.set-list-meta{font-size:11px;color:var(--muted);margin-top:1px}

@media(max-width:680px){
  .set-layout{flex-direction:column}
  .set-nav{width:100%;flex-direction:row;flex-wrap:wrap;position:static}
  .set-nav-item{width:auto;flex:0 0 auto}
  .set-members-header,.set-member-row{grid-template-columns:1fr 80px 70px 70px}
}
`;
  document.head.appendChild(s);
}

// ── Module contract ──────────────────────────────────────────────────────────

export default {
  async mount(container, ctx) {
    _css();
    _el = container;
    _st = {
      tab: 'organisation',
      profile: null,
      members: null,
      departments: null,
    };
    _el.innerHTML = `<div class="set-loading">${_t('st.loading')}</div>`;
    try {
      _st.profile = await _api('/api/settings/profile');
    } catch(e) {
      _st.profile = {};
    }
    _render();
  },

  unmount(container) {
    _st = null;
    _el = null;
    container.innerHTML = '';
  },

  refresh(ctx) { if (_el && _st) _render(); },
};
