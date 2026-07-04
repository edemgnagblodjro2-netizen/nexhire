/**
 * Centre d'Orchestration — bibliothèque d'automatisations par connecteur.
 * Style : Fluent Design / Microsoft Blue #0078D4
 */

const CSS = `<style>
.orch-root {
  display: flex; flex-direction: column;
  height: calc(100vh - var(--topbar-h, 56px));
  background: #f3f4f6; overflow: hidden;
}

/* ── Header ── */
.orch-header {
  flex-shrink: 0;
  padding: 18px 24px 14px;
  background: #fff; border-bottom: 1px solid #e5e7eb;
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.orch-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: linear-gradient(135deg, #7C3AED, #5B21B6);
  color: #fff; font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 99px;
}
.orch-title { font-size: 16px; font-weight: 700; color: #111827; }
.orch-subtitle { font-size: 12px; color: #6b7280; margin-top: 1px; }

.orch-header-kpis { margin-left: auto; display: flex; gap: 24px; }
.orch-kpi { text-align: center; }
.orch-kpi-val { font-size: 20px; font-weight: 800; color: #0078D4; }
.orch-kpi-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }

/* ── Body ── */
.orch-body { flex: 1; overflow: hidden; display: flex; }

/* ── Sidebar connecteurs ── */
.orch-sidebar {
  width: 220px; min-width: 180px;
  background: #fff; border-right: 1px solid #e5e7eb;
  display: flex; flex-direction: column; overflow-y: auto;
}
.orch-sidebar-title {
  padding: 12px 16px 6px;
  font-size: 10px; font-weight: 800; color: #6b7280;
  text-transform: uppercase; letter-spacing: .1em;
}
.orch-conn-item {
  padding: 9px 16px; cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  border-left: 3px solid transparent;
  font-size: 13px; color: #374151; font-weight: 500;
  transition: background .1s;
}
.orch-conn-item:hover { background: #f9fafb; }
.orch-conn-item.active { background: #EFF6FF; border-left-color: #7C3AED; color: #111827; font-weight: 700; }
.orch-conn-icon { font-size: 16px; }
.orch-conn-count { margin-left: auto; font-size: 11px; color: #6b7280; }

.orch-sidebar-sep { height: 1px; background: #f3f4f6; margin: 6px 0; }

/* ── Liste orchestrations ── */
.orch-list {
  flex: 1; overflow-y: auto;
  padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}

.orch-card {
  background: #fff; border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  padding: 14px 16px;
  display: flex; align-items: flex-start; gap: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
  transition: box-shadow .15s, border-color .15s;
  cursor: pointer;
}
.orch-card:hover { box-shadow: 0 3px 12px rgba(124,58,237,.1); border-color: #A78BFA; }
.orch-card.selected { border-color: #7C3AED; }

.orch-card-icon { font-size: 22px; flex-shrink: 0; }
.orch-card-body { flex: 1; min-width: 0; }
.orch-card-name { font-size: 13px; font-weight: 700; color: #111827; }
.orch-card-desc { font-size: 11px; color: #6b7280; margin-top: 2px; }
.orch-card-meta {
  display: flex; gap: 8px; margin-top: 6px; flex-wrap: wrap; align-items: center;
}
.orch-chip {
  font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 99px;
  text-transform: uppercase; letter-spacing: .04em;
}
.orch-chip-conn { background: #F3E8FF; color: #6D28D9; }
.orch-chip-cat  { background: #F0FDF4; color: #065F46; }
.orch-chip-runs { background: #EFF6FF; color: #1D4ED8; }

.orch-card-stats {
  flex-shrink: 0; text-align: right;
}
.orch-card-rate { font-size: 16px; font-weight: 800; color: #059669; }
.orch-card-rate-label { font-size: 9px; color: #6b7280; font-weight: 600; text-transform: uppercase; }

.orch-run-btn {
  flex-shrink: 0;
  padding: 6px 12px; border-radius: 5px;
  background: #7C3AED; color: #fff; border: none;
  font-size: 12px; font-weight: 600; cursor: pointer;
  align-self: center;
  transition: background .15s;
}
.orch-run-btn:hover { background: #5B21B6; }

/* ── Détail panel ── */
.orch-detail-panel {
  width: 360px; min-width: 300px;
  background: #fff; border-left: 1px solid #e5e7eb;
  display: flex; flex-direction: column; overflow-y: auto;
  padding: 18px;
}
.orch-detail-panel.hidden { display: none; }
.orch-detail-title { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
.orch-detail-conn {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #6b7280; margin-bottom: 12px;
}
.orch-detail-section { margin-top: 14px; }
.orch-detail-section-label {
  font-size: 10px; font-weight: 800; color: #6b7280;
  text-transform: uppercase; letter-spacing: .1em;
  margin-bottom: 6px;
}
.orch-stat-row { display: flex; gap: 12px; margin-bottom: 12px; }
.orch-stat-box {
  flex: 1; background: #f9fafb; border-radius: 8px;
  padding: 10px 12px; text-align: center; border: 1px solid #e5e7eb;
}
.orch-stat-box-val { font-size: 18px; font-weight: 800; color: #0078D4; }
.orch-stat-box-label { font-size: 9px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; }
.orch-last-run { font-size: 11px; color: #6b7280; margin-bottom: 10px; }
.orch-run-history-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-top: 1px solid #f3f4f6;
  font-size: 11px; color: #374151;
}
.orch-run-status { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.orch-run-status.completed { background: #059669; }
.orch-run-status.failed    { background: #DC2626; }
.orch-run-status.running   { background: #D97706; }
.orch-detail-run-btn {
  width: 100%; padding: 10px; border-radius: 8px; margin-top: 14px;
  background: #7C3AED; color: #fff; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: background .15s;
}
.orch-detail-run-btn:hover { background: #5B21B6; }

/* ── Loading / vide ── */
.orch-loading { display: flex; align-items: center; justify-content: center; height: 100%; gap: 10px; color: #6b7280; font-size: 14px; }
.orch-spinner { width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #7C3AED; border-radius: 50%; animation: orchspin .7s linear infinite; }
@keyframes orchspin { to { transform: rotate(360deg); } }
.orch-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280; }
.orch-empty-icon { font-size: 48px; margin-bottom: 10px; }

/* ── Toast ── */
.orch-toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: #1f2937; color: #fff; padding: 10px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 600; z-index: 9999;
  opacity: 0; transition: opacity .3s; pointer-events: none;
}
.orch-toast.show { opacity: 1; }
.orch-toast.success { background: #059669; }
.orch-toast.error { background: #DC2626; }
</style>`;

const CONN_GROUPS = {
  'Microsoft':    ['microsoft_graph','exchange','sharepoint','teams','power_automate','azure_automation','entra_id','intune','sentinel'],
  'Scripts':      ['powershell','python','bash'],
  'ITSM':         ['servicenow','jira'],
  'ERP / SIRH':   ['sap','workday'],
  'Communication':['email','slack','webhook'],
  'Générique':    ['rest_api','graphql','soap'],
  'Interne':      ['internal'],
};

const CONN_META = {
  microsoft_graph: {label:'Microsoft Graph',icon:'🔷'},
  exchange:        {label:'Exchange Online',icon:'📧'},
  sharepoint:      {label:'SharePoint',icon:'📂'},
  teams:           {label:'Microsoft Teams',icon:'💬'},
  power_automate:  {label:'Power Automate',icon:'⚡'},
  azure_automation:{label:'Azure Automation',icon:'🔵'},
  entra_id:        {label:'Entra ID',icon:'🆔'},
  intune:          {label:'Intune',icon:'📱'},
  sentinel:        {label:'Sentinel',icon:'🛡️'},
  powershell:      {label:'PowerShell',icon:'🖥️'},
  python:          {label:'Python',icon:'🐍'},
  bash:            {label:'Bash',icon:'⚙️'},
  servicenow:      {label:'ServiceNow',icon:'🎫'},
  jira:            {label:'Jira',icon:'📌'},
  sap:             {label:'SAP',icon:'🏭'},
  workday:         {label:'Workday',icon:'👤'},
  email:           {label:'Email',icon:'✉️'},
  slack:           {label:'Slack',icon:'💬'},
  webhook:         {label:'Webhook',icon:'🔗'},
  rest_api:        {label:'REST API',icon:'🌐'},
  graphql:         {label:'GraphQL',icon:'◈'},
  soap:            {label:'SOAP',icon:'📨'},
  internal:        {label:'MyPortal',icon:'🏠'},
};

const CAT_LABELS = {finance:'Finances',hr:'RH',it:'TI',compliance:'Conformité',security:'Sécurité',operations:'Opérations'};

let _state = { orchs: [], activeConn: null, selectedId: null, loading: true };
let _container = null;
let _token = null;

function _rate(o) {
  if (!o.run_count) return 100;
  return Math.round((o.success_count / o.run_count) * 100);
}

function _filtered() {
  if (!_state.activeConn) return _state.orchs;
  return _state.orchs.filter(o => o.connector_type === _state.activeConn);
}

function _conn_counts() {
  const c = {};
  for (const o of _state.orchs) c[o.connector_type] = (c[o.connector_type] || 0) + 1;
  return c;
}

function _sidebar_html() {
  const counts = _conn_counts();
  return Object.entries(CONN_GROUPS).map(([group, types]) => {
    const grouped = types.filter(t => counts[t] > 0);
    if (!grouped.length) return '';
    return `
      <div class="orch-sidebar-title">${group}</div>
      ${grouped.map(t => {
        const meta = CONN_META[t] || {label: t, icon: '⚙️'};
        return `<div class="orch-conn-item${_state.activeConn === t ? ' active' : ''}" data-conn="${t}">
          <span class="orch-conn-icon">${meta.icon}</span>
          ${meta.label}
          <span class="orch-conn-count">${counts[t]}</span>
        </div>`;
      }).join('')}
      <div class="orch-sidebar-sep"></div>`;
  }).join('');
}

function _list_html() {
  const items = _filtered();
  if (!items.length) return `
    <div class="orch-empty">
      <div class="orch-empty-icon">⚙️</div>
      <div style="font-size:14px;font-weight:600;color:#6b7280;">Aucune orchestration pour ce connecteur.</div>
    </div>`;
  return items.map(o => {
    const meta = CONN_META[o.connector_type] || {label: o.connector_type, icon: '⚙️'};
    const rate = _rate(o);
    return `
    <div class="orch-card${_state.selectedId === o.id ? ' selected' : ''}" data-id="${o.id}">
      <div class="orch-card-icon">${meta.icon}</div>
      <div class="orch-card-body">
        <div class="orch-card-name">${o.name}</div>
        <div class="orch-card-desc">${o.description || ''}</div>
        <div class="orch-card-meta">
          <span class="orch-chip orch-chip-conn">${meta.label}</span>
          ${o.category ? `<span class="orch-chip orch-chip-cat">${CAT_LABELS[o.category] || o.category}</span>` : ''}
          ${o.run_count > 0 ? `<span class="orch-chip orch-chip-runs">${o.run_count} runs</span>` : ''}
        </div>
      </div>
      <div class="orch-card-stats">
        <div class="orch-card-rate" style="color:${rate >= 95 ? '#059669' : rate >= 80 ? '#D97706' : '#DC2626'}">${rate} %</div>
        <div class="orch-card-rate-label">Succès</div>
      </div>
      <button class="orch-run-btn" data-run="${o.id}">▶ Lancer</button>
    </div>`;
  }).join('');
}

function _detail_html() {
  const o = _state.orchs.find(x => x.id === _state.selectedId);
  if (!o) return '';
  const meta = CONN_META[o.connector_type] || {label: o.connector_type, icon: '⚙️'};
  const rate = _rate(o);
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <div class="orch-detail-title">${o.name}</div>
      <button onclick="this.closest('.orch-detail-panel').classList.add('hidden')" style="background:none;border:none;cursor:pointer;color:#6b7280;font-size:18px;">×</button>
    </div>
    <div class="orch-detail-conn"><span style="font-size:16px;">${meta.icon}</span>${meta.label}</div>
    ${o.description ? `<div style="font-size:12px;color:#6b7280;margin-bottom:12px;line-height:1.5;">${o.description}</div>` : ''}
    <div class="orch-stat-row">
      <div class="orch-stat-box">
        <div class="orch-stat-box-val">${o.run_count || 0}</div>
        <div class="orch-stat-box-label">Exécutions</div>
      </div>
      <div class="orch-stat-box">
        <div class="orch-stat-box-val" style="color:${rate >= 95 ? '#059669' : '#D97706'}">${rate} %</div>
        <div class="orch-stat-box-label">Taux succès</div>
      </div>
      <div class="orch-stat-box">
        <div class="orch-stat-box-val">${o.timeout_seconds || 300} s</div>
        <div class="orch-stat-box-label">Timeout</div>
      </div>
    </div>
    ${o.last_run_at ? `<div class="orch-last-run">Dernier run : ${new Date(o.last_run_at).toLocaleString('fr-CA')}</div>` : ''}
    <button class="orch-detail-run-btn" data-run="${o.id}">▶ Exécuter maintenant</button>
    <div class="orch-detail-section">
      <div class="orch-detail-section-label">Dernières exécutions</div>
      ${[...Array(3)].map((_, i) => `
        <div class="orch-run-history-item">
          <div class="orch-run-status ${i === 0 ? 'running' : 'completed'}"></div>
          <span>${i === 0 ? 'En cours' : `Il y a ${i === 1 ? '2 h' : '1 j'}`}</span>
          <span style="margin-left:auto;">${i === 0 ? '—' : (o.timeout_seconds && o.timeout_seconds < 30 ? `${o.timeout_seconds} s` : '8 s')}</span>
        </div>`).join('')}
    </div>`;
}

function _render(container) {
  if (!container) return;
  const sidebarEl = container.querySelector('.orch-sidebar');
  const listEl    = container.querySelector('.orch-list');
  const detailEl  = container.querySelector('.orch-detail-panel');
  if (!sidebarEl || !listEl) return;

  if (_state.loading) {
    listEl.innerHTML = `<div class="orch-loading"><div class="orch-spinner"></div>Chargement…</div>`;
    return;
  }

  // Header KPIs
  const totalRuns = _state.orchs.reduce((a, o) => a + (o.run_count || 0), 0);
  const totalSuccess = _state.orchs.reduce((a, o) => a + (o.success_count || 0), 0);
  const globalRate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 100;
  const kpisEl = container.querySelector('.orch-header-kpis');
  if (kpisEl) kpisEl.innerHTML = `
    <div class="orch-kpi"><div class="orch-kpi-val">${_state.orchs.length}</div><div class="orch-kpi-label">Orchestrations</div></div>
    <div class="orch-kpi"><div class="orch-kpi-val">${totalRuns}</div><div class="orch-kpi-label">Exécutions</div></div>
    <div class="orch-kpi"><div class="orch-kpi-val" style="color:#059669">${globalRate} %</div><div class="orch-kpi-label">Taux succès</div></div>`;

  // Sidebar all
  const allCounts = _conn_counts();
  const allCount = Object.values(allCounts).reduce((a, b) => a + b, 0);
  sidebarEl.innerHTML = `
    <div class="orch-sidebar-title">Tous les connecteurs</div>
    <div class="orch-conn-item${!_state.activeConn ? ' active' : ''}" data-conn="">
      <span class="orch-conn-icon">⚙️</span> Toutes
      <span class="orch-conn-count">${allCount}</span>
    </div>
    <div class="orch-sidebar-sep"></div>
    ${_sidebar_html()}`;

  listEl.innerHTML = _list_html();

  if (detailEl) {
    detailEl.innerHTML = _state.selectedId ? _detail_html() : '';
    detailEl.classList.toggle('hidden', !_state.selectedId);
  }

  // Wire sidebar
  sidebarEl.querySelectorAll('.orch-conn-item').forEach(item => {
    item.addEventListener('click', () => {
      _state.activeConn = item.dataset.conn || null;
      _render(container);
    });
  });

  // Wire card click
  listEl.querySelectorAll('.orch-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.orch-run-btn')) return;
      _state.selectedId = card.dataset.id;
      _render(container);
    });
  });

  // Wire run buttons
  container.querySelectorAll('[data-run]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _run(btn.dataset.run, container);
    });
  });
}

async function _run(orchId, container) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const res = await fetch(`/api/orchestrations/${orchId}/run`, {
      method: 'POST', credentials: 'include',
      headers, body: JSON.stringify({ input: {}, trigger_type: 'manual' }),
    });
    if (res.ok) {
      const data = await res.json();
      // Mettre à jour les stats locales
      const o = _state.orchs.find(x => x.id === orchId);
      if (o) { o.run_count = (o.run_count || 0) + 1; o.success_count = (o.success_count || 0) + 1; }
      _render(container);
      _toast('Orchestration démarrée avec succès.', 'success', container);
    } else {
      const err = await res.json();
      _toast(err.detail || 'Erreur.', 'error', container);
    }
  } catch {
    // Démo sans backend
    const o = _state.orchs.find(x => x.id === orchId);
    if (o) { o.run_count = (o.run_count || 0) + 1; o.success_count = (o.success_count || 0) + 1; }
    _render(container);
    _toast(`Orchestration simulée : ${o?.name || orchId}`, 'success', container);
  }
}

function _toast(msg, type = 'info', container) {
  const el = container?.querySelector('.orch-toast');
  if (!el) return;
  el.textContent = msg; el.className = `orch-toast ${type}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

async function _load(container) {
  try {
    const headers = {};
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const res = await fetch('/api/orchestrations?status=active,inactive', { credentials: 'include', headers });
    if (res.ok) _state.orchs = (await res.json()).orchestrations || [];
    else _state.orchs = _demoData();
  } catch { _state.orchs = _demoData(); }
  _state.loading = false;
  _render(container);
}

function _demoData() {
  return [
    {id:'o1',name:'Créer utilisateur Microsoft 365',description:'Crée un compte Entra ID + Exchange + assigne une licence.',connector_type:'microsoft_graph',category:'hr',status:'active',run_count:234,success_count:232,timeout_seconds:60},
    {id:'o2',name:'Désactiver licences inactives',description:'Identifie et désactive les licences sans connexion depuis N jours.',connector_type:'microsoft_graph',category:'finance',status:'active',run_count:14,success_count:14,timeout_seconds:120},
    {id:'o3',name:'Activer MFA sur un compte',description:'Force l\'activation du Microsoft Authenticator sur un compte admin.',connector_type:'microsoft_graph',category:'security',status:'active',run_count:8,success_count:8,timeout_seconds:15},
    {id:'o4',name:'Ajouter utilisateur à un groupe',description:'Ajoute un utilisateur à un ou plusieurs groupes M365.',connector_type:'microsoft_graph',category:'hr',status:'active',run_count:156,success_count:155,timeout_seconds:10},
    {id:'o5',name:'Créer incident ServiceNow',description:'Ouvre un incident ou une demande de service.',connector_type:'servicenow',category:'it',status:'active',run_count:89,success_count:87,timeout_seconds:30},
    {id:'o6',name:'Créer ticket Jira',description:'Crée un ticket dans un projet Jira spécifié.',connector_type:'jira',category:'it',status:'active',run_count:67,success_count:66,timeout_seconds:15},
    {id:'o7',name:'Synchroniser employé Workday→M365',description:'Synchronise les données RH de Workday vers Microsoft 365.',connector_type:'workday',category:'hr',status:'active',run_count:156,success_count:154,timeout_seconds:300},
    {id:'o8',name:'Envoyer courriel via Exchange',description:'Envoie un courriel personnalisé via SMTP Exchange Online.',connector_type:'email',category:'hr',status:'active',run_count:312,success_count:312,timeout_seconds:10},
    {id:'o9',name:'Rapport audit Loi 25',description:'Génère un rapport d\'audit de conformité Loi 25.',connector_type:'python',category:'compliance',status:'active',run_count:6,success_count:5,timeout_seconds:300},
    {id:'o10',name:'Exécuter script PowerShell AD',description:'Exécute un script PowerShell sur Active Directory ou Azure.',connector_type:'powershell',category:'it',status:'active',run_count:23,success_count:22,timeout_seconds:120},
    {id:'o11',name:'Alerte Teams — Incident sécurité',description:'Envoie une alerte structurée dans un canal Teams configuré.',connector_type:'teams',category:'security',status:'active',run_count:5,success_count:5,timeout_seconds:10},
    {id:'o12',name:'Appel API REST externe',description:'Appel générique vers n\'importe quelle API REST avec OAuth2.',connector_type:'rest_api',category:'it',status:'active',run_count:34,success_count:33,timeout_seconds:60},
    {id:'o13',name:'Créer enregistrement SAP',description:'Crée ou met à jour un enregistrement dans SAP via BAPI.',connector_type:'sap',category:'operations',status:'active',run_count:12,success_count:12,timeout_seconds:120},
    {id:'o14',name:'Archive SharePoint Document',description:'Archive ou déplace un document SharePoint Online.',connector_type:'sharepoint',category:'compliance',status:'active',run_count:45,success_count:45,timeout_seconds:30},
  ];
}

export default {
  mount(container, ctx) {
    _container = container;
    _token = localStorage.getItem('nexhire_token');
    _state = { orchs: [], activeConn: null, selectedId: null, loading: true };

    container.innerHTML = CSS + `
      <div class="orch-root">
        <div class="orch-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="orch-badge">⚙️ Orchestration</span>
            <div>
              <div class="orch-title">Centre d'Orchestration</div>
              <div class="orch-subtitle">Chef d'orchestre de vos systèmes — 14 connecteurs disponibles</div>
            </div>
          </div>
          <div class="orch-header-kpis"></div>
        </div>
        <div class="orch-body">
          <div class="orch-sidebar"></div>
          <div class="orch-list"><div class="orch-loading"><div class="orch-spinner"></div>Chargement…</div></div>
          <div class="orch-detail-panel hidden"></div>
        </div>
        <div class="orch-toast"></div>
      </div>`;

    _load(container);
  },

  unmount(container) {
    _container = null;
  },
  refresh(ctx) { if (_container) _render(_container); },
};
