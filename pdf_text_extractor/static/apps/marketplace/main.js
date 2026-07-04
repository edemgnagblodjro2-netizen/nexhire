/**
 * AgentHub — Workspace Marketplace
 * Données réelles uniquement :
 *   GET /api/connectors           → connecteurs actifs de l'organisation
 *   GET /api/workspace/{slug}/apps → catalogue d'applications du workspace
 * Aucune donnée fictive.
 */

const _CSS_ID = 'mkt2-css';

// ── API ───────────────────────────────────────────────────────────────────────
function _tok() { return localStorage.getItem('nexhire_token') || ''; }
function _h() {
  const t = _tok();
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), 'Content-Type': 'application/json' };
}
async function _api(path, opts = {}) {
  const r = await fetch(path, { headers: _h(), credentials: 'include', ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Erreur ${r.status}`); }
  return r.status === 204 ? null : r.json();
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function _esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _dt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}
function _loader() {
  return '<div class="mkt-loader"><div class="mkt-spin"></div>Chargement…</div>';
}
function _empty(icon, title, sub, btn = '') {
  return `<div class="mkt-empty"><div class="mkt-empty-icon">${icon}</div><div class="mkt-empty-title">${title}</div><p class="mkt-empty-sub">${sub}</p>${btn}</div>`;
}

// ── Catalogues statiques des types disponibles (métadonnées produit) ──────────
const CONNECTOR_META = {
  microsoft_365:    { icon: '🔷', name: 'Microsoft 365',     cat: 'Collaboration', desc: 'Teams, Outlook, SharePoint, OneDrive, Entra ID — SSO et synchronisation des utilisateurs.' },
  google_workspace: { icon: '🔵', name: 'Google Workspace',  cat: 'Collaboration', desc: 'Gmail, Drive, Calendar, Meet et Directory — synchronisation complète.' },
  salesforce:       { icon: '☁️', name: 'Salesforce CRM',    cat: 'CRM', desc: 'Contacts, opportunités, comptes et activités CRM en temps réel.' },
  hubspot:          { icon: '🟠', name: 'HubSpot',            cat: 'CRM', desc: 'Contacts, pipeline, marketing et suivi des prospects.' },
  jira:             { icon: '🔵', name: 'Jira / Confluence',  cat: 'Projets', desc: 'Issues, sprints, wikis, bases de connaissances.' },
  slack:            { icon: '💬', name: 'Slack',              cat: 'Collaboration', desc: 'Notifications, alertes et intégrations de workflows dans vos canaux.' },
  zendesk:          { icon: '🟢', name: 'Zendesk',            cat: 'Support', desc: 'Tickets, SLA, satisfaction client et helpdesk.' },
  servicenow:       { icon: '🔴', name: 'ServiceNow',         cat: 'ITSM', desc: 'ITSM, gestion des incidents, changements et actifs TI.' },
  quickbooks:       { icon: '🟢', name: 'QuickBooks Online',  cat: 'Finance', desc: 'Comptabilité, facturation, paiements et rapports financiers.' },
  netsuite:         { icon: '🔶', name: 'NetSuite ERP',       cat: 'ERP', desc: 'ERP complet : finance, inventaire, commandes et CRM.' },
  sap:              { icon: '⬛', name: 'SAP',                cat: 'ERP', desc: 'Intégration SAP S/4HANA et modules Finance, Logistique, RH.' },
  workday:          { icon: '🟡', name: 'Workday',            cat: 'RH', desc: 'RH, paie, gestion des talents et planification.' },
  bamboohr:         { icon: '🟢', name: 'BambooHR',           cat: 'RH', desc: 'Dossiers employés, congés, évaluations et onboarding.' },
  adp:              { icon: '🔵', name: 'ADP Workforce Now',  cat: 'Paie', desc: 'Paie, avantages sociaux, conformité et rapports RH.' },
  asana:            { icon: '🟣', name: 'Asana',              cat: 'Projets', desc: 'Tâches, projets, objectifs et portefeuilles de travail.' },
  monday:           { icon: '🔴', name: 'Monday.com',         cat: 'Projets', desc: 'Gestion de projets visuelle, tableaux de bord et automatisations.' },
  clickup:          { icon: '🟣', name: 'ClickUp',            cat: 'Projets', desc: 'Tout-en-un : tâches, docs, buts et tableaux de bord.' },
  aws:              { icon: '🟠', name: 'AWS',                cat: 'Cloud', desc: 'Coûts, instances, S3, Lambda et métriques CloudWatch.' },
  intune:           { icon: '🔷', name: 'Microsoft Intune',   cat: 'MDM', desc: 'Gestion des appareils mobiles, conformité et déploiement d\'apps.' },
  crowdstrike:      { icon: '🔴', name: 'CrowdStrike Falcon', cat: 'Sécurité', desc: 'EDR, détection des menaces et incidents de cybersécurité.' },
  epicor:           { icon: '⬛', name: 'Epicor ERP',         cat: 'ERP', desc: 'ERP manufacturing : production, inventaire et supply chain.' },
  autotask:         { icon: '🔷', name: 'Autotask PSA',       cat: 'PSA', desc: 'Tickets, contrats de service et facturation MSP.' },
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const _CSS = `
.mkt-wrap { display:flex; flex-direction:column; height:100%; min-height:0; font-family:var(--font,ui-sans-serif,system-ui,sans-serif); }
.mkt-tabs { display:flex; background:#fff; border-bottom:1px solid var(--border,#E0E0E0); padding:0 20px; overflow-x:auto; flex-shrink:0; }
.mkt-tab  { padding:11px 16px; font-size:12px; font-weight:600; color:#757575; border:none; background:none; cursor:pointer; white-space:nowrap; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color .15s,border-color .15s; }
.mkt-tab:hover { color:#1B1B1B; }
.mkt-tab.active { color:var(--primary,#0078D4); border-bottom-color:var(--primary,#0078D4); }

.mkt-body { flex:1; overflow-y:auto; padding:24px; min-height:0; }

.mkt-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:10px; flex-wrap:wrap; }
.mkt-sh-title { font-size:13px; font-weight:700; color:#1B1B1B; }

.mkt-chip { display:inline-flex; align-items:center; font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; }
.mkt-chip-ok     { background:#DFF6DD; color:#107C10; }
.mkt-chip-warn   { background:#FDE7D9; color:#CA5010; }
.mkt-chip-err    { background:#FDE7E9; color:#C50F1F; }
.mkt-chip-info   { background:#EFF6FC; color:#0078D4; }
.mkt-chip-muted  { background:#F3F3F3; color:#757575; }

.mkt-btn { padding:7px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; border:none; transition:opacity .15s; }
.mkt-btn:hover { opacity:.85; }
.mkt-btn-primary   { background:var(--primary,#0078D4); color:#fff; }
.mkt-btn-secondary { background:#F5F5F5; color:#1B1B1B; border:1px solid var(--border,#E0E0E0); }
.mkt-btn-sm { padding:5px 10px; font-size:11px; }

.mkt-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
.mkt-search { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:7px 10px; font-size:12px; color:#1B1B1B; background:#fff; outline:none; }
.mkt-search:focus { border-color:var(--primary,#0078D4); box-shadow:0 0 0 2px rgba(0,120,212,.12); }
.mkt-filter { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:7px 10px; font-size:12px; background:#fff; cursor:pointer; outline:none; }

/* Connector cards */
.mkt-conn-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
.mkt-conn-card { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:10px; padding:16px 18px; display:flex; flex-direction:column; gap:10px; transition:border-color .15s,box-shadow .15s; }
.mkt-conn-card:hover { border-color:var(--primary,#0078D4); box-shadow:0 2px 12px rgba(0,120,212,.08); }
.mkt-conn-card.is-connected { border-top:3px solid #107C10; }
.mkt-conn-card.is-error     { border-top:3px solid #C50F1F; }
.mkt-conn-header { display:flex; align-items:flex-start; gap:12px; }
.mkt-conn-icon   { font-size:28px; flex-shrink:0; }
.mkt-conn-name   { font-size:13px; font-weight:700; color:#1B1B1B; }
.mkt-conn-cat    { font-size:10.5px; color:#757575; margin-top:2px; }
.mkt-conn-desc   { font-size:12px; color:#555; line-height:1.5; }
.mkt-conn-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:8px; border-top:1px solid var(--border,#E0E0E0); }
.mkt-conn-since  { font-size:10.5px; color:#757575; }

/* App catalog */
.mkt-app-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
.mkt-app-card { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:10px; padding:16px; display:flex; flex-direction:column; gap:8px; transition:border-color .15s; }
.mkt-app-card.is-installed { border-top:3px solid #0078D4; }
.mkt-app-card:hover { border-color:var(--primary,#0078D4); }
.mkt-app-header { display:flex; align-items:center; gap:10px; }
.mkt-app-icon { font-size:24px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:#F8F8F8; border-radius:8px; flex-shrink:0; }
.mkt-app-name { font-size:13px; font-weight:700; color:#1B1B1B; }
.mkt-app-cat  { font-size:10.5px; color:#757575; margin-top:1px; }
.mkt-app-desc { font-size:12px; color:#555; line-height:1.5; flex:1; }
.mkt-app-footer { display:flex; align-items:center; justify-content:space-between; padding-top:8px; border-top:1px solid var(--border,#E0E0E0); }
.mkt-app-version { font-size:10.5px; color:#757575; }

.mkt-loader { display:flex; gap:10px; align-items:center; justify-content:center; padding:60px; color:#757575; font-size:13px; }
.mkt-spin { width:20px; height:20px; border:2px solid #E0E0E0; border-top-color:var(--primary,#0078D4); border-radius:50%; animation:mkt-spin .7s linear infinite; }
@keyframes mkt-spin { to { transform:rotate(360deg); } }
.mkt-empty { padding:60px 24px; text-align:center; color:#757575; }
.mkt-empty-icon  { font-size:40px; margin-bottom:12px; opacity:.4; }
.mkt-empty-title { font-size:14px; font-weight:700; color:#1B1B1B; margin-bottom:6px; }
.mkt-empty-sub   { font-size:12px; color:#757575; margin-bottom:16px; }
.mkt-alert { padding:10px 14px; border-radius:6px; font-size:12px; margin-bottom:12px; }
.mkt-alert-err { background:#FDE7E9; color:#C50F1F; }

/* Stats bar */
.mkt-stats { display:flex; gap:14px; background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:14px 20px; margin-bottom:20px; flex-wrap:wrap; }
.mkt-stat { display:flex; flex-direction:column; gap:2px; }
.mkt-stat-val { font-size:22px; font-weight:800; color:#1B1B1B; }
.mkt-stat-lbl { font-size:10.5px; color:#757575; text-transform:uppercase; letter-spacing:.05em; }
.mkt-stat-sep { width:1px; background:var(--border,#E0E0E0); margin:0 4px; }
`;

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'connecteurs', label: 'Connecteurs' },
  { id: 'applications', label: 'Applications' },
];

// ── State ─────────────────────────────────────────────────────────────────────
let _wrap = null;
let _ctx  = null;
let _tab  = 'connecteurs';

// ── Render ────────────────────────────────────────────────────────────────────
function _tabBar() {
  return `<div class="mkt-tabs">${TABS.map(t =>
    `<button class="mkt-tab${t.id === _tab ? ' active' : ''}" data-tab="${t.id}">${_esc(t.label)}</button>`
  ).join('')}</div>`;
}

function _render(tab) {
  _tab = tab || _tab;
  if (!_wrap) return;
  _wrap.innerHTML = _tabBar();
  const body = document.createElement('div');
  body.className = 'mkt-body';
  _wrap.appendChild(body);

  _wrap.querySelectorAll('.mkt-tab').forEach(btn => {
    btn.addEventListener('click', () => _render(btn.dataset.tab));
  });

  switch (_tab) {
    case 'connecteurs':   return _viewConnecteurs(body);
    case 'applications':  return _viewApplications(body);
  }
}

// ── CONNECTEURS ───────────────────────────────────────────────────────────────
async function _viewConnecteurs(el) {
  el.innerHTML = _loader();
  try {
    const connected = await _api('/api/connectors');
    const connectedMap = {};
    for (const c of (connected || [])) connectedMap[c.connector_type] = c;

    const allTypes = Object.keys(CONNECTOR_META);
    const cats = [...new Set(Object.values(CONNECTOR_META).map(m => m.cat))].sort();

    let _filter = '';
    let _cat    = '';
    let _search = '';

    const _draw = () => {
      let types = allTypes;
      if (_filter === 'connected') types = types.filter(t => connectedMap[t]);
      if (_filter === 'available') types = types.filter(t => !connectedMap[t]);
      if (_cat) types = types.filter(t => CONNECTOR_META[t].cat === _cat);
      if (_search) types = types.filter(t => (CONNECTOR_META[t].name + ' ' + CONNECTOR_META[t].cat).toLowerCase().includes(_search));

      const nConn = types.filter(t => connectedMap[t]).length;

      const tblEl = el.querySelector('#mkt-conn-body');
      if (!tblEl) return;

      tblEl.innerHTML = types.length === 0
        ? _empty('🔌', 'Aucun connecteur', 'Aucun résultat pour ces filtres.')
        : `<div class="mkt-conn-grid">
          ${types.map(t => {
            const meta = CONNECTOR_META[t];
            const c    = connectedMap[t];
            const isOk = c && c.status === 'connected';
            const isErr = c && c.status === 'error';
            return `<div class="mkt-conn-card${isOk ? ' is-connected' : isErr ? ' is-error' : ''}">
              <div class="mkt-conn-header">
                <div class="mkt-conn-icon">${meta.icon}</div>
                <div>
                  <div class="mkt-conn-name">${_esc(meta.name)}</div>
                  <div class="mkt-conn-cat">${_esc(meta.cat)}</div>
                </div>
                <div style="margin-left:auto;flex-shrink:0">
                  ${isOk  ? '<span class="mkt-chip mkt-chip-ok">Connecté</span>'  :
                    isErr  ? '<span class="mkt-chip mkt-chip-err">Erreur</span>'  :
                    c      ? '<span class="mkt-chip mkt-chip-warn">En cours</span>' :
                             '<span class="mkt-chip mkt-chip-muted">Disponible</span>'}
                </div>
              </div>
              <div class="mkt-conn-desc">${_esc(meta.desc)}</div>
              <div class="mkt-conn-footer">
                <span class="mkt-conn-since">
                  ${isOk ? 'Connecté le ' + _dt(c.connected_at) : c?.last_error ? _esc(c.last_error.slice(0,60)) : ''}
                </span>
                <button class="mkt-btn mkt-btn-${c ? 'secondary' : 'primary'} mkt-btn-sm"
                  onclick="document.dispatchEvent(new CustomEvent('ws:navigate',{detail:{appSlug:'integrations'}}))">
                  ${c ? 'Gérer' : '+ Connecter'}
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    };

    const nConnTotal = allTypes.filter(t => connectedMap[t]).length;

    el.innerHTML = `
<div class="mkt-stats">
  <div class="mkt-stat"><div class="mkt-stat-val">${allTypes.length}</div><div class="mkt-stat-lbl">Connecteurs disponibles</div></div>
  <div class="mkt-stat-sep"></div>
  <div class="mkt-stat"><div class="mkt-stat-val" style="color:#107C10">${nConnTotal}</div><div class="mkt-stat-lbl">Connectés</div></div>
  <div class="mkt-stat-sep"></div>
  <div class="mkt-stat"><div class="mkt-stat-val">${allTypes.length - nConnTotal}</div><div class="mkt-stat-lbl">Disponibles</div></div>
</div>
<div class="mkt-toolbar">
  <input class="mkt-search" placeholder="Rechercher un connecteur…" id="mkt-search" style="flex:1;max-width:280px">
  <select class="mkt-filter" id="mkt-filter">
    <option value="">Tous</option>
    <option value="connected">Connectés</option>
    <option value="available">Disponibles</option>
  </select>
  <select class="mkt-filter" id="mkt-cat">
    <option value="">Toutes catégories</option>
    ${cats.map(c => `<option value="${_esc(c)}">${_esc(c)}</option>`).join('')}
  </select>
</div>
<div id="mkt-conn-body">${_loader()}</div>`;

    _draw();

    el.querySelector('#mkt-search').addEventListener('input', e => { _search = e.target.value.toLowerCase(); _draw(); });
    el.querySelector('#mkt-filter').addEventListener('change', e => { _filter = e.target.value; _draw(); });
    el.querySelector('#mkt-cat').addEventListener('change', e => { _cat = e.target.value; _draw(); });

  } catch (e) {
    el.innerHTML = `<div class="mkt-alert mkt-alert-err">${_esc(e.message)}</div>`;
  }
}

// ── APPLICATIONS ──────────────────────────────────────────────────────────────
async function _viewApplications(el) {
  el.innerHTML = _loader();
  try {
    const slug = _ctx?.partner_slug || _ctx?.partnerSlug || '';
    if (!slug) throw new Error('Slug du workspace introuvable dans le contexte.');

    const data = await _api(`/api/workspace/${slug}/apps`);
    const apps = Array.isArray(data) ? data : (data.apps || data.items || []);

    const installed = apps.filter(a => a.is_installed);
    const available = apps.filter(a => !a.is_installed);

    let _search = '';
    let _filter = '';

    const _draw = () => {
      let list = apps;
      if (_filter === 'installed') list = installed;
      if (_filter === 'available') list = available;
      if (_search) list = list.filter(a => (a.name + ' ' + (a.description||'')).toLowerCase().includes(_search));

      const bodyEl = el.querySelector('#mkt-app-body');
      if (!bodyEl) return;

      if (list.length === 0) {
        bodyEl.innerHTML = _empty('📦', 'Aucune application', 'Aucune application ne correspond à vos filtres.');
        return;
      }

      bodyEl.innerHTML = `<div class="mkt-app-grid">
        ${list.map(a => `
        <div class="mkt-app-card${a.is_installed ? ' is-installed' : ''}">
          <div class="mkt-app-header">
            <div class="mkt-app-icon">${a.icon || '📦'}</div>
            <div>
              <div class="mkt-app-name">${_esc(a.name)}</div>
              <div class="mkt-app-cat">${_esc(a.category || '—')}</div>
            </div>
          </div>
          ${a.description ? `<div class="mkt-app-desc">${_esc(a.description)}</div>` : ''}
          <div class="mkt-app-footer">
            <span class="mkt-app-version">v${_esc(a.version || '1.0')}</span>
            <div style="display:flex;gap:6px;align-items:center">
              ${a.is_installed
                ? `<span class="mkt-chip mkt-chip-ok">Installé</span>
                   <button class="mkt-btn mkt-btn-secondary mkt-btn-sm"
                     onclick="document.dispatchEvent(new CustomEvent('ws:navigate',{detail:{appSlug:'${_esc(a.slug)}'}}))">Ouvrir</button>`
                : `<span class="mkt-chip mkt-chip-muted">${_esc(a.status === 'coming_soon' ? 'Bientôt' : 'Disponible')}</span>`}
            </div>
          </div>
        </div>`).join('')}
      </div>`;
    };

    el.innerHTML = `
<div class="mkt-stats">
  <div class="mkt-stat"><div class="mkt-stat-val">${apps.length}</div><div class="mkt-stat-lbl">Applications</div></div>
  <div class="mkt-stat-sep"></div>
  <div class="mkt-stat"><div class="mkt-stat-val" style="color:#0078D4">${installed.length}</div><div class="mkt-stat-lbl">Installées</div></div>
  <div class="mkt-stat-sep"></div>
  <div class="mkt-stat"><div class="mkt-stat-val">${available.length}</div><div class="mkt-stat-lbl">Disponibles</div></div>
</div>
<div class="mkt-toolbar">
  <input class="mkt-search" placeholder="Rechercher une application…" id="mkt-app-search" style="flex:1;max-width:280px">
  <select class="mkt-filter" id="mkt-app-filter">
    <option value="">Toutes</option>
    <option value="installed">Installées</option>
    <option value="available">Disponibles</option>
  </select>
</div>
<div id="mkt-app-body">${_loader()}</div>`;

    _draw();

    el.querySelector('#mkt-app-search').addEventListener('input', e => { _search = e.target.value.toLowerCase(); _draw(); });
    el.querySelector('#mkt-app-filter').addEventListener('change', e => { _filter = e.target.value; _draw(); });

  } catch (e) {
    el.innerHTML = `<div class="mkt-alert mkt-alert-err">${_esc(e.message)}</div>`;
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
export default {
  mount(container, ctx) {
    _ctx = ctx;
    _tab = 'connecteurs';

    if (!document.getElementById(_CSS_ID)) {
      const s = document.createElement('style');
      s.id = _CSS_ID;
      s.textContent = _CSS;
      document.head.appendChild(s);
    }

    _wrap = document.createElement('div');
    _wrap.className = 'mkt-wrap';
    container.appendChild(_wrap);
    _render(_tab);
  },

  unmount(container) {
    _wrap = null;
    _ctx  = null;
    container.innerHTML = '';
  },
  refresh(ctx) { if (_wrap) _render(_tab); },
};
