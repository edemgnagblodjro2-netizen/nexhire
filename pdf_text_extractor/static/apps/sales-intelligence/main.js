/**
 * AgentHub Platform — Sales Intelligence
 * Prospection IA Enterprise : prospects, campagnes, agents, conversations, réunions, CRM
 */

// ── État du module ────────────────────────────────────────────────────────────
let _st = null; // { ctx, view, data, el }
let _abortCtrl = null;

// ── API helpers ───────────────────────────────────────────────────────────────
function _tok() { return localStorage.getItem('nexhire_token') || ''; }
function _h(extra = {}) {
  const t = _tok();
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), 'Content-Type': 'application/json', ...extra };
}
async function _api(path, opts = {}) {
  const r = await fetch(path, { headers: _h(), credentials: 'include', ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || String(r.status)); }
  if (r.status === 204) return null;
  return r.json();
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function _esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _dt(iso) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('fr-CA', { year:'numeric', month:'short', day:'numeric' }); }
function _num(n, dec = 0) { return Number(n ?? 0).toLocaleString('fr-CA', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function _score(s) {
  if (s == null) return '<span class="si-score si-score-na">—</span>';
  const cls = s >= 80 ? 'high' : s >= 50 ? 'med' : 'low';
  return `<span class="si-score si-score-${cls}">${s}</span>`;
}
function _status(s) {
  const MAP = {
    new:'Nouveau', researched:'Enrichi', contacted:'Contacté', replied:'Répondu',
    meeting_set:'RDV planifié', proposal_sent:'Offre envoyée', won:'Gagné', lost:'Perdu',
    disqualified:'Disqualifié', draft:'Brouillon', active:'Actif', paused:'Pausé',
    completed:'Terminé', cancelled:'Annulé', open:'Ouvert', waiting:'En attente',
    closed_won:'Gagné', closed_lost:'Perdu', scheduled:'Planifié', confirmed:'Confirmé',
    'no_show':'Absent',
  };
  const CLS = {
    new:'info', researched:'info', contacted:'warn', replied:'warn',
    meeting_set:'ok', won:'ok', lost:'err', disqualified:'muted',
    draft:'muted', active:'ok', paused:'warn', completed:'ok', cancelled:'err',
    open:'info', waiting:'warn', closed_won:'ok', closed_lost:'err',
    scheduled:'info', confirmed:'ok',
  };
  return `<span class="si-badge si-badge-${CLS[s]||'muted'}">${MAP[s]||_esc(s)}</span>`;
}
function _loading(msg = 'Chargement…') {
  return `<div class="si-loader"><div class="ds-spinner ds-spinner-sm"></div><span>${msg}</span></div>`;
}
function _empty(msg = 'Aucune donnée') {
  return `<div class="si-empty"><div class="si-empty-icon">○</div><p>${msg}</p></div>`;
}
function _err(msg) {
  return `<div class="si-alert si-alert-err">${_esc(msg)}</div>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `<style>
.si-wrap { display:flex; flex-direction:column; height:100%; min-height:0; font-family:var(--font,ui-sans-serif,system-ui,sans-serif); }

/* Tab bar */
.si-tabs { display:flex; gap:2px; background:var(--bg,#F5F5F5); border-bottom:1px solid var(--border,#E0E0E0); padding:0 20px; overflow-x:auto; flex-shrink:0; }
.si-tab { padding:10px 14px; font-size:12px; font-weight:600; color:var(--muted,#888); border:none; background:none; cursor:pointer; white-space:nowrap; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color .1s,border-color .1s; }
.si-tab:hover { color:var(--text,#1B1B1B); }
.si-tab.active { color:var(--primary,#0078D4); border-bottom-color:var(--primary,#0078D4); }

/* Content area */
.si-content { flex:1; overflow-y:auto; padding:24px; min-height:0; }

/* Page header */
.si-ph { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
.si-ph-left {}
.si-ph-title { font-size:18px; font-weight:700; color:var(--text,#1B1B1B); margin-bottom:2px; letter-spacing:-.01em; }
.si-ph-sub { font-size:12px; color:var(--muted,#888); }
.si-ph-right { display:flex; gap:8px; flex-shrink:0; }

/* KPI grid */
.si-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:24px; }
.si-kpi { background:var(--card,#FFF); border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:16px; }
.si-kpi-label { font-size:11px; color:var(--muted,#888); font-weight:600; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
.si-kpi-value { font-size:26px; font-weight:800; color:var(--text,#1B1B1B); letter-spacing:-.02em; line-height:1; }
.si-kpi-sub { font-size:11px; color:var(--muted,#888); margin-top:4px; }
.si-kpi-accent { border-top:3px solid var(--primary,#0078D4); }

/* Cards */
.si-card { background:var(--card,#FFF); border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:20px; margin-bottom:16px; }
.si-card-title { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid var(--border,#E0E0E0); }
.si-two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }

/* Toolbar */
.si-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
.si-input { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:7px 10px; font-size:12px; color:var(--text,#1B1B1B); background:var(--card,#FFF); outline:none; }
.si-input:focus { border-color:var(--primary,#0078D4); }
.si-select { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:7px 10px; font-size:12px; color:var(--text,#1B1B1B); background:var(--card,#FFF); outline:none; cursor:pointer; }
.si-btn { padding:7px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; border:none; transition:opacity .15s; }
.si-btn:hover { opacity:.85; }
.si-btn-primary { background:var(--primary,#0078D4); color:#fff; }
.si-btn-secondary { background:var(--bg,#F5F5F5); color:var(--text,#1B1B1B); border:1px solid var(--border,#E0E0E0); }
.si-btn-sm { padding:4px 10px; font-size:11px; border-radius:4px; }
.si-btn-danger { background:#C50F1F; color:#fff; }
.si-btn-icon { padding:6px; background:var(--bg,#F5F5F5); border:1px solid var(--border,#E0E0E0); border-radius:6px; cursor:pointer; font-size:14px; line-height:1; }
.si-spacer { flex:1; }

/* Table */
.si-tbl-wrap { overflow-x:auto; border:1px solid var(--border,#E0E0E0); border-radius:8px; }
table.si-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.si-tbl thead th { text-align:left; padding:9px 12px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted,#888); background:var(--bg,#F5F5F5); border-bottom:1px solid var(--border,#E0E0E0); white-space:nowrap; }
.si-tbl tbody td { padding:10px 12px; border-bottom:1px solid rgba(0,0,0,.04); color:var(--text,#1B1B1B); vertical-align:middle; }
.si-tbl tbody tr:last-child td { border-bottom:none; }
.si-tbl tbody tr:hover td { background:var(--bg,#F5F5F5); cursor:pointer; }
.si-tbl-company { font-weight:600; color:var(--text,#1B1B1B); }
.si-tbl-sub { font-size:11px; color:var(--muted,#888); }

/* Badges */
.si-badge { display:inline-flex; align-items:center; font-size:10px; font-weight:700; padding:2px 7px; border-radius:999px; white-space:nowrap; }
.si-badge-ok { background:#DFF6DD; color:#107C10; }
.si-badge-warn { background:#FDE7D9; color:#CA5010; }
.si-badge-err { background:#FDE7E9; color:#C50F1F; }
.si-badge-info { background:#EFF6FC; color:#0078D4; }
.si-badge-muted { background:#F3F3F3; color:#888; }

/* Score */
.si-score { display:inline-flex; align-items:center; justify-content:center; width:32px; height:22px; border-radius:4px; font-size:11px; font-weight:700; }
.si-score-high { background:#DFF6DD; color:#107C10; }
.si-score-med { background:#FDE7D9; color:#CA5010; }
.si-score-low { background:#FDE7E9; color:#C50F1F; }
.si-score-na { background:#F3F3F3; color:#888; }

/* Agents grid */
.si-agents-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
.si-agent-card { background:var(--card,#FFF); border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:16px; border-top:3px solid var(--primary,#0078D4); }
.si-agent-name { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); margin-bottom:10px; }
.si-agent-stat { display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; }
.si-agent-stat-label { color:var(--muted,#888); }
.si-agent-stat-val { font-weight:600; color:var(--text,#1B1B1B); }
.si-agent-err { border-top-color:#C50F1F; }

/* Conversation thread */
.si-conv-list { display:flex; flex-direction:column; gap:8px; }
.si-conv-item { background:var(--card,#FFF); border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:14px; cursor:pointer; transition:border-color .1s; }
.si-conv-item:hover,.si-conv-item.active { border-color:var(--primary,#0078D4); }
.si-conv-company { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); }
.si-conv-subject { font-size:11.5px; color:var(--muted,#888); margin-top:2px; }
.si-conv-meta { display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap; }
.si-msg-thread { display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
.si-msg { padding:12px 14px; border-radius:8px; font-size:12.5px; line-height:1.6; max-width:85%; }
.si-msg-ai { background:var(--bg,#F5F5F5); border:1px solid var(--border,#E0E0E0); align-self:flex-start; }
.si-msg-human { background:var(--primary,#0078D4); color:#fff; align-self:flex-end; }
.si-msg-prospect { background:#FFF8ED; border:1px solid #FDE7D9; align-self:flex-start; }
.si-msg-role { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; opacity:.7; }
.si-reply-box { display:flex; gap:8px; margin-top:12px; }
.si-reply-input { flex:1; border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:10px 12px; font-size:12.5px; resize:vertical; min-height:80px; font-family:inherit; }

/* Meetings */
.si-meetings-list { display:flex; flex-direction:column; gap:8px; }
.si-meeting-item { background:var(--card,#FFF); border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:14px 16px; display:grid; grid-template-columns:1fr auto; align-items:center; gap:12px; }
.si-meeting-title { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); margin-bottom:3px; }
.si-meeting-meta { font-size:11.5px; color:var(--muted,#888); display:flex; gap:10px; flex-wrap:wrap; }

/* Analytics */
.si-funnel { display:flex; flex-direction:column; gap:6px; }
.si-funnel-row { display:flex; align-items:center; gap:10px; }
.si-funnel-label { font-size:12px; color:var(--text,#1B1B1B); width:130px; flex-shrink:0; }
.si-funnel-bar-wrap { flex:1; background:var(--bg,#F5F5F5); border-radius:4px; height:20px; overflow:hidden; }
.si-funnel-bar { height:100%; background:var(--primary,#0078D4); border-radius:4px; transition:width .4s ease; }
.si-funnel-count { font-size:12px; font-weight:700; color:var(--text,#1B1B1B); width:40px; text-align:right; }

/* Templates */
.si-tmpl-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
.si-tmpl-card { background:var(--card,#FFF); border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:16px; }
.si-tmpl-name { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); margin-bottom:4px; }
.si-tmpl-meta { display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
.si-tmpl-body { font-size:11.5px; color:var(--muted,#888); line-height:1.5; height:48px; overflow:hidden; }
.si-tmpl-actions { display:flex; gap:6px; margin-top:10px; }

/* Settings form */
.si-form { display:flex; flex-direction:column; gap:14px; }
.si-form-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.si-form-field { display:flex; flex-direction:column; gap:4px; }
.si-form-label { font-size:11.5px; font-weight:600; color:var(--text,#1B1B1B); }
.si-form-hint { font-size:10.5px; color:var(--muted,#888); }
.si-textarea { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:9px 10px; font-size:12.5px; color:var(--text,#1B1B1B); font-family:inherit; resize:vertical; min-height:80px; width:100%; }

/* CRM */
.si-crm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
.si-crm-card { background:var(--card,#FFF); border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:16px; }
.si-crm-name { font-size:14px; font-weight:700; color:var(--text,#1B1B1B); margin-bottom:10px; }

/* Pagination */
.si-pagination { display:flex; align-items:center; gap:8px; margin-top:12px; justify-content:flex-end; font-size:12px; color:var(--muted,#888); }

/* Misc */
.si-loader { display:flex; align-items:center; gap:10px; padding:32px; color:var(--muted,#888); font-size:13px; justify-content:center; }
.si-empty { display:flex; flex-direction:column; align-items:center; padding:48px 20px; color:var(--muted,#888); text-align:center; }
.si-empty-icon { font-size:32px; margin-bottom:10px; opacity:.4; }
.si-alert { padding:10px 14px; border-radius:6px; font-size:12.5px; margin-bottom:12px; }
.si-alert-err { background:#FDE7E9; color:#C50F1F; border:1px solid #FFCCCC; }
.si-alert-ok { background:#DFF6DD; color:#107C10; border:1px solid #A8DFA8; }
.si-section-title { font-size:13px; font-weight:700; color:var(--text,#1B1B1B); margin:20px 0 10px; }
.si-tags { display:flex; gap:4px; flex-wrap:wrap; }
.si-tag { font-size:10px; padding:2px 7px; border-radius:999px; background:var(--bg,#F5F5F5); border:1px solid var(--border,#E0E0E0); color:var(--muted,#888); }
.si-prose { font-size:12.5px; color:var(--text,#1B1B1B); line-height:1.7; }
@media(max-width:640px){.si-two-col,.si-form-row{grid-template-columns:1fr} .si-content{padding:14px}}
</style>`;

// ── Tab configuration ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',      label: 'Tableau de bord' },
  { id: 'prospects',      label: 'Prospects' },
  { id: 'campaigns',      label: 'Campagnes' },
  { id: 'agents',         label: 'Agents IA' },
  { id: 'conversations',  label: 'Conversations' },
  { id: 'pipeline',       label: 'Pipeline commercial' },
  { id: 'meetings',       label: 'Réunions' },
  { id: 'crm',            label: 'CRM' },
  { id: 'analytics',      label: 'Analytics' },
  { id: 'templates',      label: 'Templates' },
  { id: 'settings',       label: 'Paramètres' },
];

const AGENT_NAMES = {
  prospector: 'Prospector AI', research: 'Research AI', qualification: 'Qualification AI',
  sales: 'Sales AI', followup: 'Follow-up AI', meeting: 'Meeting AI',
  proposal: 'Proposal AI', crm_sync: 'CRM Sync AI',
};

// ── Shell ─────────────────────────────────────────────────────────────────────
function _renderShell(el) {
  el.innerHTML = CSS + `
<div class="si-wrap">
  <div class="si-tabs">
    ${TABS.map(t => `<button class="si-tab${t.id === _st.view ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
  </div>
  <div class="si-content" id="si-main"></div>
</div>`;
  el.querySelectorAll('.si-tab').forEach(btn => {
    btn.addEventListener('click', () => _goto(btn.dataset.tab));
  });
}

function _goto(view) {
  _st.view = view;
  // Update active tab
  document.querySelectorAll('.si-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === view));
  _renderView();
}

function _main() { return document.getElementById('si-main'); }

function _renderView() {
  const m = _main(); if (!m) return;
  const VIEWS = {
    dashboard:     _viewDashboard,
    prospects:     _viewProspects,
    campaigns:     _viewCampaigns,
    agents:        _viewAgents,
    conversations: _viewConversations,
    pipeline:      _viewPipeline,
    meetings:      _viewMeetings,
    crm:           _viewCRM,
    analytics:     _viewAnalytics,
    templates:     _viewTemplates,
    settings:      _viewSettings,
  };
  (VIEWS[_st.view] || _viewDashboard)();
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: DASHBOARD
// ──────────────────────────────────────────────────────────────────────────────
async function _viewDashboard() {
  const m = _main();
  m.innerHTML = _loading('Chargement du tableau de bord…');
  try {
    const d = await _api('/api/si/dashboard');
    const k = d.kpis || {};
    const conversion = k.total_prospects > 0 ? ((k.won / k.total_prospects) * 100).toFixed(1) : 0;
    m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left">
    <div class="si-ph-title">Sales Intelligence</div>
    <div class="si-ph-sub">Vue d'ensemble de votre pipeline de prospection IA</div>
  </div>
  <div class="si-ph-right">
    <button class="si-btn si-btn-primary" id="si-dash-new">+ Nouveau prospect</button>
  </div>
</div>
<div class="si-kpi-grid">
  <div class="si-kpi si-kpi-accent">
    <div class="si-kpi-label">Total prospects</div>
    <div class="si-kpi-value">${_num(k.total_prospects)}</div>
  </div>
  <div class="si-kpi">
    <div class="si-kpi-label">Nouveaux</div>
    <div class="si-kpi-value">${_num(k.new_prospects)}</div>
    <div class="si-kpi-sub">à traiter</div>
  </div>
  <div class="si-kpi">
    <div class="si-kpi-label">RDV planifiés</div>
    <div class="si-kpi-value">${_num(k.meetings_set)}</div>
  </div>
  <div class="si-kpi">
    <div class="si-kpi-label">Gagnés</div>
    <div class="si-kpi-value">${_num(k.won)}</div>
    <div class="si-kpi-sub">${conversion}% de conversion</div>
  </div>
  <div class="si-kpi">
    <div class="si-kpi-label">Score moyen</div>
    <div class="si-kpi-value">${k.avg_score ?? '—'}<span style="font-size:14px;font-weight:400;color:var(--muted)">/100</span></div>
  </div>
  <div class="si-kpi">
    <div class="si-kpi-label">Pipeline</div>
    <div class="si-kpi-value" style="font-size:18px">${k.pipeline_value > 0 ? '$' + _num(k.pipeline_value) : '—'}</div>
  </div>
  <div class="si-kpi">
    <div class="si-kpi-label">RDV à venir</div>
    <div class="si-kpi-value">${_num(d.upcoming_meetings)}</div>
  </div>
</div>
<div class="si-two-col">
  <div class="si-card">
    <div class="si-card-title">Campagnes actives</div>
    ${(d.campaigns_by_status || []).length
      ? d.campaigns_by_status.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border,#E0E0E0);font-size:12px">
          <span>${_status(c.status)}</span>
          <strong>${_num(c.total)}</strong>
        </div>`).join('')
      : _empty('Aucune campagne')
    }
    <button class="si-btn si-btn-secondary" style="margin-top:12px;font-size:11px" onclick="document.querySelector('[data-tab=campaigns]').click()">Voir les campagnes →</button>
  </div>
  <div class="si-card">
    <div class="si-card-title">Performance agents IA (7 jours)</div>
    ${(d.agent_stats_7d || []).length
      ? d.agent_stats_7d.map(a => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:12px">
          <span style="color:var(--text)">${AGENT_NAMES[a.agent_type]||a.agent_type}</span>
          <span style="display:flex;gap:8px">
            <span style="color:var(--muted)">${_num(a.total_runs)} runs</span>
            <span style="color:#107C10">${_num(a.success_runs)} ✓</span>
          </span>
        </div>`).join('')
      : _empty('Aucun run d\'agent cette semaine')
    }
  </div>
</div>`;
    m.querySelector('#si-dash-new')?.addEventListener('click', () => _goto('prospects'));
  } catch(e) {
    m.innerHTML = _err(e.message);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: PROSPECTS
// ──────────────────────────────────────────────────────────────────────────────
let _prospectsPage = 1;
let _prospectsFilters = { search: '', status: '', min_score: '' };

async function _viewProspects() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left">
    <div class="si-ph-title">Prospects</div>
    <div class="si-ph-sub">Base de prospects qualifiés par l'IA</div>
  </div>
  <div class="si-ph-right">
    <button class="si-btn si-btn-secondary si-btn-sm" id="si-p-export">Export CSV</button>
    <button class="si-btn si-btn-primary" id="si-p-new">+ Ajouter</button>
  </div>
</div>
<div class="si-toolbar">
  <input class="si-input" id="si-p-search" placeholder="Rechercher…" style="width:220px" value="${_esc(_prospectsFilters.search)}">
  <select class="si-select" id="si-p-status">
    <option value="">Tous les statuts</option>
    <option value="new">Nouveau</option>
    <option value="researched">Enrichi</option>
    <option value="contacted">Contacté</option>
    <option value="replied">Répondu</option>
    <option value="meeting_set">RDV planifié</option>
    <option value="won">Gagné</option>
    <option value="lost">Perdu</option>
  </select>
  <select class="si-select" id="si-p-score">
    <option value="">Tous les scores</option>
    <option value="80">Score ≥ 80</option>
    <option value="60">Score ≥ 60</option>
    <option value="40">Score ≥ 40</option>
  </select>
  <button class="si-btn si-btn-secondary si-btn-sm" id="si-p-reset">Réinitialiser</button>
</div>
<div id="si-prospects-table">${_loading()}</div>`;

  // Restore filter state
  m.querySelector('#si-p-search').value = _prospectsFilters.search;
  m.querySelector('#si-p-status').value = _prospectsFilters.status;
  m.querySelector('#si-p-score').value = _prospectsFilters.min_score;

  const loadProspects = async () => {
    document.getElementById('si-prospects-table').innerHTML = _loading();
    try {
      const params = new URLSearchParams({ page: _prospectsPage, limit: 25 });
      if (_prospectsFilters.search) params.set('search', _prospectsFilters.search);
      if (_prospectsFilters.status) params.set('status', _prospectsFilters.status);
      if (_prospectsFilters.min_score) params.set('min_score', _prospectsFilters.min_score);
      const d = await _api(`/api/si/prospects?${params}`);
      const rows = d.items || [];
      const totalPages = Math.ceil(d.total / 25);
      document.getElementById('si-prospects-table').innerHTML = rows.length ? `
<div class="si-tbl-wrap">
<table class="si-tbl">
<thead><tr>
  <th>Entreprise</th><th>Secteur</th><th>Pays</th><th>Contact</th>
  <th>Score</th><th>Statut</th><th>Ajouté</th><th>Actions</th>
</tr></thead>
<tbody>
${rows.map(p => `<tr data-id="${p.id}">
  <td><div class="si-tbl-company">${_esc(p.company_name)}</div>${p.website?`<div class="si-tbl-sub">${_esc(p.website)}</div>`:''}</td>
  <td>${_esc(p.sector||'—')}</td>
  <td>${_esc(p.country||'—')}</td>
  <td>${_esc(p.contact_name||'—')}<br><span class="si-tbl-sub">${_esc(p.contact_email||'')}</span></td>
  <td>${_score(p.ai_score)}</td>
  <td>${_status(p.status)}</td>
  <td>${_dt(p.created_at)}</td>
  <td style="white-space:nowrap">
    <button class="si-btn si-btn-secondary si-btn-sm si-p-enrich" data-id="${p.id}" title="Enrichir">🔬</button>
    <button class="si-btn si-btn-secondary si-btn-sm si-p-score-btn" data-id="${p.id}" title="Scorer">📊</button>
    <button class="si-btn si-btn-primary si-btn-sm si-p-contact" data-id="${p.id}" title="Contacter">💬</button>
  </td>
</tr>`).join('')}
</tbody>
</table>
</div>
<div class="si-pagination">
  <span>${d.total} prospects</span>
  ${_prospectsPage > 1 ? `<button class="si-btn si-btn-secondary si-btn-sm" id="si-p-prev">← Préc.</button>` : ''}
  <span>Page ${_prospectsPage} / ${totalPages}</span>
  ${_prospectsPage < totalPages ? `<button class="si-btn si-btn-secondary si-btn-sm" id="si-p-next">Suiv. →</button>` : ''}
</div>` : _empty('Aucun prospect trouvé. Ajoutez-en un ou lancez une campagne !');

      // Wire table row click to detail
      document.querySelectorAll('.si-tbl tbody tr[data-id]').forEach(tr => {
        tr.addEventListener('click', e => {
          if (e.target.tagName === 'BUTTON') return;
          _showProspectDetail(tr.dataset.id);
        });
      });
      // Enrich / Score / Contact buttons
      document.querySelectorAll('.si-p-enrich').forEach(btn => btn.addEventListener('click', async e => {
        e.stopPropagation();
        btn.textContent = '⏳'; btn.disabled = true;
        try { await _api(`/api/si/prospects/${btn.dataset.id}/enrich`, { method: 'POST' }); btn.textContent = '✓'; await loadProspects(); }
        catch(err) { btn.textContent = '!'; alert('Erreur : ' + err.message); }
      }));
      document.querySelectorAll('.si-p-score-btn').forEach(btn => btn.addEventListener('click', async e => {
        e.stopPropagation();
        btn.textContent = '⏳'; btn.disabled = true;
        try { const r = await _api(`/api/si/prospects/${btn.dataset.id}/score`, { method: 'POST' }); alert(`Score : ${r.score}/100\n\n${r.explanation}`); await loadProspects(); }
        catch(err) { btn.textContent = '!'; alert('Erreur : ' + err.message); }
      }));
      document.querySelectorAll('.si-p-contact').forEach(btn => btn.addEventListener('click', async e => {
        e.stopPropagation();
        btn.textContent = '⏳'; btn.disabled = true;
        try { const r = await _api(`/api/si/prospects/${btn.dataset.id}/contact`, { method: 'POST' }); alert(`Message envoyé !\n\nAperçu :\n${r.message_preview}`); await loadProspects(); }
        catch(err) { btn.textContent = '!'; alert('Erreur : ' + err.message); }
      }));
      document.getElementById('si-p-prev')?.addEventListener('click', () => { _prospectsPage--; loadProspects(); });
      document.getElementById('si-p-next')?.addEventListener('click', () => { _prospectsPage++; loadProspects(); });
    } catch(e) {
      document.getElementById('si-prospects-table').innerHTML = _err(e.message);
    }
  };

  m.querySelector('#si-p-search').addEventListener('input', e => {
    _prospectsFilters.search = e.target.value; _prospectsPage = 1;
    clearTimeout(_st._searchTimer);
    _st._searchTimer = setTimeout(loadProspects, 400);
  });
  m.querySelector('#si-p-status').addEventListener('change', e => { _prospectsFilters.status = e.target.value; _prospectsPage = 1; loadProspects(); });
  m.querySelector('#si-p-score').addEventListener('change', e => { _prospectsFilters.min_score = e.target.value; _prospectsPage = 1; loadProspects(); });
  m.querySelector('#si-p-reset').addEventListener('click', () => {
    _prospectsFilters = { search: '', status: '', min_score: '' }; _prospectsPage = 1;
    _viewProspects();
  });
  m.querySelector('#si-p-export').addEventListener('click', () => {
    window.open('/api/si/prospects/export/csv', '_blank');
  });
  m.querySelector('#si-p-new').addEventListener('click', () => _showNewProspectModal());
  loadProspects();
}

function _showNewProspectModal() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
<div style="background:var(--card,#FFF);border-radius:10px;padding:24px;width:480px;max-width:95vw;max-height:90vh;overflow-y:auto">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <h2 style="font-size:15px;font-weight:700">Nouveau prospect</h2>
    <button id="si-modal-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted)">✕</button>
  </div>
  <div id="si-modal-err"></div>
  <div class="si-form">
    <div class="si-form-field"><label class="si-form-label">Entreprise *</label><input class="si-input" id="si-np-company" placeholder="Acme Corp" style="width:100%"></div>
    <div class="si-form-row">
      <div class="si-form-field"><label class="si-form-label">Site web</label><input class="si-input" id="si-np-website" placeholder="https://" style="width:100%"></div>
      <div class="si-form-field"><label class="si-form-label">LinkedIn</label><input class="si-input" id="si-np-linkedin" placeholder="linkedin.com/company/…" style="width:100%"></div>
    </div>
    <div class="si-form-row">
      <div class="si-form-field"><label class="si-form-label">Secteur</label><input class="si-input" id="si-np-sector" placeholder="Technologie, Manufacturier…" style="width:100%"></div>
      <div class="si-form-field"><label class="si-form-label">Pays</label><input class="si-input" id="si-np-country" placeholder="CA" style="width:100%"></div>
    </div>
    <div class="si-form-row">
      <div class="si-form-field"><label class="si-form-label">Employés</label><input class="si-input" id="si-np-emp" type="number" placeholder="250" style="width:100%"></div>
      <div class="si-form-field"><label class="si-form-label">Budget estimé ($)</label><input class="si-input" id="si-np-budget" type="number" placeholder="50000" style="width:100%"></div>
    </div>
    <div class="si-form-row">
      <div class="si-form-field"><label class="si-form-label">Nom du contact</label><input class="si-input" id="si-np-cname" placeholder="Marie Dupont" style="width:100%"></div>
      <div class="si-form-field"><label class="si-form-label">Titre</label><input class="si-input" id="si-np-ctitle" placeholder="Directrice TI" style="width:100%"></div>
    </div>
    <div class="si-form-row">
      <div class="si-form-field"><label class="si-form-label">Email</label><input class="si-input" id="si-np-cemail" type="email" placeholder="m.dupont@acme.com" style="width:100%"></div>
      <div class="si-form-field"><label class="si-form-label">Téléphone</label><input class="si-input" id="si-np-cphone" placeholder="+1 514 555 0000" style="width:100%"></div>
    </div>
    <div class="si-form-field"><label class="si-form-label">Notes</label><textarea class="si-textarea" id="si-np-notes" placeholder="Notes internes…"></textarea></div>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px">
    <button class="si-btn si-btn-secondary" id="si-np-cancel">Annuler</button>
    <button class="si-btn si-btn-primary" id="si-np-save">Créer le prospect</button>
  </div>
</div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#si-modal-close').addEventListener('click', close);
  overlay.querySelector('#si-np-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#si-np-save').addEventListener('click', async () => {
    const errEl = document.getElementById('si-modal-err');
    const company = overlay.querySelector('#si-np-company').value.trim();
    if (!company) { errEl.innerHTML = _err('Le nom de l\'entreprise est requis.'); return; }
    const btn = overlay.querySelector('#si-np-save');
    btn.disabled = true; btn.textContent = '⏳ Création…';
    try {
      await _api('/api/si/prospects', { method:'POST', body: JSON.stringify({
        company_name: company,
        website: overlay.querySelector('#si-np-website').value || null,
        linkedin_url: overlay.querySelector('#si-np-linkedin').value || null,
        sector: overlay.querySelector('#si-np-sector').value || null,
        country: overlay.querySelector('#si-np-country').value || null,
        employee_count: parseInt(overlay.querySelector('#si-np-emp').value) || null,
        estimated_budget: parseFloat(overlay.querySelector('#si-np-budget').value) || null,
        contact_name: overlay.querySelector('#si-np-cname').value || null,
        contact_title: overlay.querySelector('#si-np-ctitle').value || null,
        contact_email: overlay.querySelector('#si-np-cemail').value || null,
        contact_phone: overlay.querySelector('#si-np-cphone').value || null,
        notes: overlay.querySelector('#si-np-notes').value || null,
      })});
      close();
      _goto('prospects');
    } catch(err) {
      errEl.innerHTML = _err(err.message);
      btn.disabled = false; btn.textContent = 'Créer le prospect';
    }
  });
}

async function _showProspectDetail(id) {
  const m = _main();
  m.innerHTML = _loading('Chargement du prospect…');
  try {
    const p = await _api(`/api/si/prospects/${id}`);
    m.innerHTML = `
<div style="max-width:760px">
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:18px">
    <button class="si-btn si-btn-secondary si-btn-sm" id="si-pd-back">← Retour</button>
    <h2 style="font-size:16px;font-weight:700;flex:1">${_esc(p.company_name)}</h2>
    ${_status(p.status)}
    ${_score(p.ai_score)}
  </div>
  <div class="si-two-col">
    <div class="si-card">
      <div class="si-card-title">Informations</div>
      <div class="si-prose">
        ${p.website ? `<p><strong>Site :</strong> <a href="${_esc(p.website)}" target="_blank" style="color:var(--primary)">${_esc(p.website)}</a></p>` : ''}
        ${p.sector ? `<p><strong>Secteur :</strong> ${_esc(p.sector)}</p>` : ''}
        ${p.country ? `<p><strong>Pays :</strong> ${_esc(p.country)}${p.city ? `, ${_esc(p.city)}` : ''}</p>` : ''}
        ${p.employee_count ? `<p><strong>Employés :</strong> ${_num(p.employee_count)}</p>` : ''}
        ${p.estimated_budget ? `<p><strong>Budget :</strong> $${_num(p.estimated_budget)}</p>` : ''}
        ${p.enriched_at ? `<p><strong>Enrichi le :</strong> ${_dt(p.enriched_at)}</p>` : ''}
      </div>
    </div>
    <div class="si-card">
      <div class="si-card-title">Contact principal</div>
      <div class="si-prose">
        ${p.contact_name ? `<p><strong>${_esc(p.contact_name)}</strong>${p.contact_title ? ` — ${_esc(p.contact_title)}` : ''}</p>` : '<p>Aucun contact renseigné</p>'}
        ${p.contact_email ? `<p>${_esc(p.contact_email)}</p>` : ''}
        ${p.contact_phone ? `<p>${_esc(p.contact_phone)}</p>` : ''}
      </div>
    </div>
  </div>
  ${p.notes ? `<div class="si-card"><div class="si-card-title">Notes</div><div class="si-prose">${_esc(p.notes)}</div></div>` : ''}
  ${p.score_factors && Object.keys(p.score_factors).length ? `
  <div class="si-card">
    <div class="si-card-title">Facteurs de score IA</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
      ${Object.entries(p.score_factors).filter(([k]) => typeof p.score_factors[k] === 'number' || k !== 'explanation').slice(0,10).map(([k,v]) =>
        typeof v === 'number' ? `<div style="background:var(--bg);border-radius:6px;padding:8px">
          <div style="font-size:10px;color:var(--muted);margin-bottom:2px">${k.replace(/_/g,' ')}</div>
          <div style="font-weight:700">${v}/10</div>
        </div>` : ''
      ).join('')}
    </div>
  </div>` : ''}
  <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
    <button class="si-btn si-btn-secondary" id="si-pd-enrich">🔬 Enrichir</button>
    <button class="si-btn si-btn-secondary" id="si-pd-score">📊 Scorer</button>
    <button class="si-btn si-btn-primary" id="si-pd-contact">💬 Contacter par IA</button>
  </div>
  <div id="si-pd-msg" style="margin-top:12px"></div>
</div>`;
    m.querySelector('#si-pd-back').addEventListener('click', () => _goto('prospects'));
    const action = async (btn, fn) => {
      btn.disabled = true; const orig = btn.textContent; btn.textContent = '⏳';
      try { const r = await fn(); document.getElementById('si-pd-msg').innerHTML = `<div class="si-alert si-alert-ok">${r}</div>`; }
      catch(e) { document.getElementById('si-pd-msg').innerHTML = _err(e.message); }
      finally { btn.disabled = false; btn.textContent = orig; }
    };
    m.querySelector('#si-pd-enrich').addEventListener('click', () => action(m.querySelector('#si-pd-enrich'), async () => {
      const r = await _api(`/api/si/prospects/${id}/enrich`, { method:'POST' });
      return `Enrichissement terminé : ${r.enrichment_summary || 'données mises à jour'}`;
    }));
    m.querySelector('#si-pd-score').addEventListener('click', () => action(m.querySelector('#si-pd-score'), async () => {
      const r = await _api(`/api/si/prospects/${id}/score`, { method:'POST' });
      return `Score calculé : ${r.score}/100 — ${r.explanation}`;
    }));
    m.querySelector('#si-pd-contact').addEventListener('click', () => action(m.querySelector('#si-pd-contact'), async () => {
      const r = await _api(`/api/si/prospects/${id}/contact`, { method:'POST' });
      return `Message généré et envoyé. Aperçu : ${r.message_preview}`;
    }));
  } catch(e) { m.innerHTML = _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: CAMPAIGNS
// ──────────────────────────────────────────────────────────────────────────────
async function _viewCampaigns() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left"><div class="si-ph-title">Campagnes</div><div class="si-ph-sub">Automatisez la prospection avec des agents IA</div></div>
  <div class="si-ph-right"><button class="si-btn si-btn-primary" id="si-c-new">+ Nouvelle campagne</button></div>
</div>
<div id="si-campaigns-list">${_loading()}</div>`;
  try {
    const items = await _api('/api/si/campaigns');
    document.getElementById('si-campaigns-list').innerHTML = items.length ? `
<div class="si-tbl-wrap">
<table class="si-tbl">
<thead><tr><th>Nom</th><th>Objectif</th><th>Prospects</th><th>Statut</th><th>Créée le</th><th>Actions</th></tr></thead>
<tbody>
${items.map(c => `<tr>
  <td><strong>${_esc(c.name)}</strong></td>
  <td>${_esc(c.objective||'—')}</td>
  <td>${_num(c.prospect_count)}</td>
  <td>${_status(c.status)}</td>
  <td>${_dt(c.created_at)}</td>
  <td style="white-space:nowrap">
    ${c.status === 'draft' || c.status === 'paused' ? `<button class="si-btn si-btn-primary si-btn-sm si-c-launch" data-id="${c.id}">▶ Lancer</button>` : ''}
    ${c.status === 'active' ? `<button class="si-btn si-btn-secondary si-btn-sm si-c-pause" data-id="${c.id}">⏸ Pauser</button>` : ''}
  </td>
</tr>`).join('')}
</tbody>
</table>
</div>` : _empty('Aucune campagne. Créez-en une pour automatiser la prospection !');
    document.querySelectorAll('.si-c-launch').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Lancer cette campagne ?')) return;
      btn.disabled = true; btn.textContent = '⏳';
      try { await _api(`/api/si/campaigns/${btn.dataset.id}/launch`, { method:'POST' }); _viewCampaigns(); }
      catch(e) { alert(e.message); btn.disabled = false; btn.textContent = '▶ Lancer'; }
    }));
    document.querySelectorAll('.si-c-pause').forEach(btn => btn.addEventListener('click', async () => {
      btn.disabled = true;
      try { await _api(`/api/si/campaigns/${btn.dataset.id}/pause`, { method:'POST' }); _viewCampaigns(); }
      catch(e) { alert(e.message); btn.disabled = false; }
    }));
  } catch(e) { document.getElementById('si-campaigns-list').innerHTML = _err(e.message); }
  m.querySelector('#si-c-new').addEventListener('click', _showNewCampaignModal);
}

function _showNewCampaignModal() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
<div style="background:var(--card,#FFF);border-radius:10px;padding:24px;width:480px;max-width:95vw">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <h2 style="font-size:15px;font-weight:700">Nouvelle campagne</h2>
    <button id="si-cm-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted)">✕</button>
  </div>
  <div id="si-cm-err"></div>
  <div class="si-form">
    <div class="si-form-field"><label class="si-form-label">Nom de la campagne *</label><input class="si-input" id="si-cm-name" style="width:100%" placeholder="Campagne PME Tech Q3 2026"></div>
    <div class="si-form-field"><label class="si-form-label">Objectif</label><input class="si-input" id="si-cm-obj" style="width:100%" placeholder="100 RDV en 60 jours"></div>
    <div class="si-form-field">
      <label class="si-form-label">Agents IA activés</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px">
        ${['prospector','research','qualification','sales','followup'].map(a => `
        <label style="display:flex;align-items:center;gap:6px;font-size:12px">
          <input type="checkbox" class="si-cm-agent" value="${a}" checked>
          ${AGENT_NAMES[a]}</label>`).join('')}
      </div>
    </div>
    <div class="si-form-field"><label class="si-form-label">Limite quotidienne</label><input class="si-input" id="si-cm-daily" type="number" value="20" style="width:100px"></div>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px">
    <button class="si-btn si-btn-secondary" id="si-cm-cancel">Annuler</button>
    <button class="si-btn si-btn-primary" id="si-cm-save">Créer</button>
  </div>
</div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#si-cm-close').addEventListener('click', close);
  overlay.querySelector('#si-cm-cancel').addEventListener('click', close);
  overlay.querySelector('#si-cm-save').addEventListener('click', async () => {
    const name = overlay.querySelector('#si-cm-name').value.trim();
    if (!name) { overlay.querySelector('#si-cm-err').innerHTML = _err('Nom requis'); return; }
    const agentConfig = {};
    overlay.querySelectorAll('.si-cm-agent').forEach(cb => { agentConfig[cb.value] = cb.checked; });
    const btn = overlay.querySelector('#si-cm-save');
    btn.disabled = true; btn.textContent = '⏳';
    try {
      await _api('/api/si/campaigns', { method:'POST', body: JSON.stringify({
        name, objective: overlay.querySelector('#si-cm-obj').value||null,
        agent_config: agentConfig,
        daily_limit: parseInt(overlay.querySelector('#si-cm-daily').value) || 20,
      })});
      close(); _goto('campaigns');
    } catch(e) { overlay.querySelector('#si-cm-err').innerHTML = _err(e.message); btn.disabled=false; btn.textContent='Créer'; }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: AGENTS
// ──────────────────────────────────────────────────────────────────────────────
async function _viewAgents() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left"><div class="si-ph-title">Agents IA</div><div class="si-ph-sub">Performance et historique des 8 agents IA de prospection</div></div>
</div>
<div id="si-agents-grid">${_loading()}</div>`;
  try {
    const items = await _api('/api/si/agents');
    const byType = {};
    items.forEach(a => { byType[a.agent_type] = a; });
    const ALL_AGENTS = ['prospector','research','qualification','sales','followup','meeting','proposal','crm_sync'];
    document.getElementById('si-agents-grid').innerHTML = `
<div class="si-agents-grid">
${ALL_AGENTS.map(type => {
  const a = byType[type];
  const successRate = a ? Math.round((a.success_runs / a.total_runs) * 100) : null;
  const hasErrors = a && a.errors > 0;
  return `<div class="si-agent-card${hasErrors ? ' si-agent-err' : ''}">
    <div class="si-agent-name">${AGENT_NAMES[type]}</div>
    ${a ? `
    <div class="si-agent-stat"><span class="si-agent-stat-label">Runs (30j)</span><span class="si-agent-stat-val">${_num(a.total_runs)}</span></div>
    <div class="si-agent-stat"><span class="si-agent-stat-label">Succès</span><span class="si-agent-stat-val" style="color:#107C10">${_num(a.success_runs)} (${successRate}%)</span></div>
    <div class="si-agent-stat"><span class="si-agent-stat-label">Erreurs</span><span class="si-agent-stat-val" style="color:${hasErrors?'#C50F1F':'var(--muted)'}">${_num(a.errors)}</span></div>
    <div class="si-agent-stat"><span class="si-agent-stat-label">Durée moy.</span><span class="si-agent-stat-val">${_num(a.avg_duration_ms)} ms</span></div>
    <div class="si-agent-stat"><span class="si-agent-stat-label">Dernier run</span><span class="si-agent-stat-val">${_dt(a.last_run_at)}</span></div>
    <button class="si-btn si-btn-secondary si-btn-sm" style="margin-top:8px;width:100%" data-agent="${type}" id="si-ag-logs-${type}">Voir les logs</button>
    ` : `<div style="color:var(--muted);font-size:12px;padding:12px 0">Aucun run sur 30 jours</div>`}
  </div>`;
}).join('')}
</div>`;
    ALL_AGENTS.forEach(type => {
      document.getElementById(`si-ag-logs-${type}`)?.addEventListener('click', () => _showAgentLogs(type));
    });
  } catch(e) { document.getElementById('si-agents-grid').innerHTML = _err(e.message); }
}

async function _showAgentLogs(type) {
  const m = _main();
  m.innerHTML = `
<div style="display:flex;gap:8px;align-items:center;margin-bottom:18px">
  <button class="si-btn si-btn-secondary si-btn-sm" id="si-ag-back">← Retour agents</button>
  <h2 style="font-size:15px;font-weight:700">Logs — ${AGENT_NAMES[type]}</h2>
</div>
<div id="si-ag-logs-content">${_loading()}</div>`;
  m.querySelector('#si-ag-back').addEventListener('click', () => _goto('agents'));
  try {
    const d = await _api(`/api/si/agents/${type}/logs?limit=50`);
    document.getElementById('si-ag-logs-content').innerHTML = (d.items||[]).length ? `
<div class="si-tbl-wrap">
<table class="si-tbl">
<thead><tr><th>Date</th><th>Prospect</th><th>Statut</th><th>Durée</th><th>Tokens</th><th>Erreur</th></tr></thead>
<tbody>
${d.items.map(r => `<tr>
  <td>${_dt(r.started_at)}</td>
  <td>${_esc(r.prospect_name||'—')}</td>
  <td>${_status(r.status)}</td>
  <td>${r.duration_ms ? _num(r.duration_ms) + ' ms' : '—'}</td>
  <td>${_num(r.tokens_used)}</td>
  <td style="color:#C50F1F;font-size:11px">${_esc(r.error_message||'')}</td>
</tr>`).join('')}
</tbody>
</table>
</div>` : _empty('Aucun log disponible');
  } catch(e) { document.getElementById('si-ag-logs-content').innerHTML = _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: CONVERSATIONS
// ──────────────────────────────────────────────────────────────────────────────
async function _viewConversations() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left"><div class="si-ph-title">Conversations</div><div class="si-ph-sub">Boîte de réception — échanges en cours avec les prospects</div></div>
  <div class="si-ph-right">
    <select class="si-select" id="si-conv-filter">
      <option value="">Toutes</option>
      <option value="open">Ouvertes</option>
      <option value="waiting">En attente</option>
      <option value="replied">Avec réponse</option>
    </select>
  </div>
</div>
<div id="si-conv-list">${_loading()}</div>`;
  const load = async () => {
    const status = m.querySelector('#si-conv-filter')?.value || '';
    document.getElementById('si-conv-list').innerHTML = _loading();
    try {
      const d = await _api(`/api/si/conversations?limit=50${status?'&status='+status:''}`);
      document.getElementById('si-conv-list').innerHTML = (d.items||[]).length ? `
<div class="si-conv-list">
${d.items.map(c => `<div class="si-conv-item" data-id="${c.id}">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div class="si-conv-company">${_esc(c.company_name||'Inconnu')}</div>
    <span style="font-size:11px;color:var(--muted)">${_dt(c.updated_at)}</span>
  </div>
  <div class="si-conv-subject">${_esc(c.subject||'Aucun sujet')}</div>
  <div class="si-conv-meta">${_status(c.status)}${_status(c.sentiment||'neutral')}${c.conversion_prob!=null?`<span class="si-badge si-badge-info">${c.conversion_prob}% conv.</span>`:''}</div>
</div>`).join('')}
</div>` : _empty('Aucune conversation en cours');
      document.querySelectorAll('.si-conv-item').forEach(el => {
        el.addEventListener('click', () => _showConversation(el.dataset.id));
      });
    } catch(e) { document.getElementById('si-conv-list').innerHTML = _err(e.message); }
  };
  m.querySelector('#si-conv-filter').addEventListener('change', load);
  load();
}

async function _showConversation(id) {
  const m = _main();
  m.innerHTML = _loading('Chargement de la conversation…');
  try {
    const c = await _api(`/api/si/conversations/${id}`);
    m.innerHTML = `
<div style="max-width:700px">
  <div style="display:flex;gap:8px;align-items:center;margin-bottom:18px">
    <button class="si-btn si-btn-secondary si-btn-sm" id="si-cv-back">← Retour</button>
    <h2 style="font-size:15px;font-weight:700;flex:1">${_esc(c.company_name||'Inconnu')}</h2>
    ${_status(c.status)}
  </div>
  ${c.ai_summary ? `<div class="si-alert si-alert-ok" style="margin-bottom:12px"><strong>Résumé IA :</strong> ${_esc(c.ai_summary)}</div>` : ''}
  ${c.next_action ? `<div class="si-alert" style="background:var(--bg);border:1px solid var(--border);margin-bottom:12px"><strong>Prochaine action :</strong> ${_esc(c.next_action)}</div>` : ''}
  <div class="si-msg-thread" id="si-msg-thread">
    ${(c.messages||[]).map(msg => `
    <div class="si-msg si-msg-${msg.role}">
      <div class="si-msg-role">${msg.role === 'ai' ? 'Agent IA' : msg.role === 'human' ? 'Moi' : 'Prospect'}</div>
      ${_esc(msg.content)}
    </div>`).join('')}
  </div>
  <div class="si-reply-box">
    <textarea class="si-reply-input" id="si-cv-reply" placeholder="Répondre manuellement…"></textarea>
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="si-btn si-btn-primary" id="si-cv-send">Envoyer</button>
    </div>
  </div>
  <div id="si-cv-msg" style="margin-top:8px"></div>
</div>`;
    m.querySelector('#si-cv-back').addEventListener('click', () => _goto('conversations'));
    m.querySelector('#si-cv-send').addEventListener('click', async () => {
      const content = m.querySelector('#si-cv-reply').value.trim();
      if (!content) return;
      const btn = m.querySelector('#si-cv-send'); btn.disabled=true; btn.textContent='⏳';
      try {
        await _api(`/api/si/conversations/${id}/reply`, { method:'POST', body: JSON.stringify({ content }) });
        _showConversation(id);
      } catch(e) { document.getElementById('si-cv-msg').innerHTML = _err(e.message); btn.disabled=false; btn.textContent='Envoyer'; }
    });
  } catch(e) { m.innerHTML = _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: PIPELINE COMMERCIAL
// ──────────────────────────────────────────────────────────────────────────────
async function _viewPipeline() {
  const m = _main();
  m.innerHTML = _loading('Chargement du pipeline…');

  const STAGES = [
    { id: 'prospect',      label: 'Prospection',       color: '#6366f1', pct: 100 },
    { id: 'qualification', label: 'Qualification',     color: '#3b82f6', pct: 60 },
    { id: 'proposal',      label: 'Proposition',       color: '#f59e0b', pct: 35 },
    { id: 'negotiation',   label: 'Négociation',       color: '#ef4444', pct: 18 },
    { id: 'closed_won',    label: 'Fermé — Gagné',     color: '#22c55e', pct: 8 },
    { id: 'closed_lost',   label: 'Fermé — Perdu',     color: '#94a3b8', pct: 6 },
  ];

  let prospects = [];
  try { const d = await _api('/api/si/prospects?page=1&per_page=50'); prospects = Array.isArray(d) ? d : (d?.items || []); } catch {}

  const byStage = {};
  STAGES.forEach(s => { byStage[s.id] = prospects.filter(p => (p.stage || 'prospect') === s.id); });
  const totalValue = prospects.reduce((s, p) => s + (parseFloat(p.deal_value) || 0), 0);
  const wonValue = (byStage.closed_won || []).reduce((s, p) => s + (parseFloat(p.deal_value) || 0), 0);

  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left">
    <div class="si-ph-title">Pipeline commercial</div>
    <div class="si-ph-sub">Visualisez et gérez votre entonnoir de vente IA en temps réel</div>
  </div>
  <div class="si-ph-actions">
    <button class="si-btn si-btn-secondary" onclick="document.querySelector('[data-tab=prospects]').click()">Voir les prospects →</button>
    <button class="si-btn si-btn-primary" onclick="document.querySelector('[data-tab=campaigns]').click()">+ Nouvelle campagne</button>
  </div>
</div>

<div class="si-kpis" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">
  <div class="si-kpi"><div class="si-kpi-label">Valeur totale pipeline</div><div class="si-kpi-value" style="font-size:17px">${totalValue > 0 ? '$' + _num(totalValue) : '—'}</div><div class="si-kpi-trend si-kpi-up">Tous stages</div></div>
  <div class="si-kpi"><div class="si-kpi-label">Prospects actifs</div><div class="si-kpi-value">${prospects.filter(p=>!['closed_won','closed_lost'].includes(p.stage||'prospect')).length}</div><div class="si-kpi-trend si-kpi-up">En cours</div></div>
  <div class="si-kpi"><div class="si-kpi-label">Valeur gagnée</div><div class="si-kpi-value" style="font-size:17px;color:#22c55e">${wonValue > 0 ? '$' + _num(wonValue) : '—'}</div><div class="si-kpi-trend si-kpi-up">Fermé gagné</div></div>
  <div class="si-kpi"><div class="si-kpi-label">Taux de conversion</div><div class="si-kpi-value">${prospects.length > 0 ? ((byStage.closed_won?.length||0)/prospects.length*100).toFixed(1) : 0}%</div><div class="si-kpi-trend ${(byStage.closed_won?.length||0) > 0 ? 'si-kpi-up' : ''}">Prospect → Gagné</div></div>
</div>

<div style="background:var(--si-card);border:1px solid var(--si-border);border-radius:12px;padding:20px;margin-bottom:24px">
  <div style="font-size:13px;font-weight:700;color:var(--si-text);margin-bottom:16px">Entonnoir de vente</div>
  <div style="display:flex;flex-direction:column;gap:10px">
    ${STAGES.filter(s=>!['closed_lost'].includes(s.id)).map(s => {
      const count = (byStage[s.id]||[]).length;
      const val = (byStage[s.id]||[]).reduce((sum,p)=>sum+(parseFloat(p.deal_value)||0),0);
      return `<div style="display:flex;align-items:center;gap:12px">
        <div style="width:130px;font-size:12px;font-weight:600;color:var(--si-text-sub);flex-shrink:0">${s.label}</div>
        <div style="flex:1;height:24px;background:var(--si-bg);border-radius:6px;overflow:hidden;position:relative">
          <div style="height:100%;width:${s.pct}%;background:${s.color};border-radius:6px;opacity:.85;transition:width .4s ease"></div>
        </div>
        <div style="width:60px;text-align:right;font-size:13px;font-weight:700;color:var(--si-text)">${count}</div>
        <div style="width:90px;text-align:right;font-size:12px;color:var(--si-text-sub)">${val > 0 ? '$'+_num(val) : '—'}</div>
      </div>`;
    }).join('')}
  </div>
</div>

<div style="background:var(--si-card);border:1px solid var(--si-border);border-radius:12px;overflow:hidden">
  <div style="padding:14px 18px;border-bottom:1px solid var(--si-border);display:flex;align-items:center;gap:8px">
    <span style="font-size:13px;font-weight:700;color:var(--si-text);flex:1">Opportunités en cours</span>
    <button class="si-btn si-btn-secondary" style="font-size:11px;padding:5px 12px">Exporter CSV</button>
  </div>
  ${prospects.filter(p=>!['closed_won','closed_lost'].includes(p.stage||'prospect')).length === 0
    ? `<div style="text-align:center;padding:48px;color:var(--si-text-sub)">
         <div style="font-size:40px;margin-bottom:12px">🎯</div>
         <div style="font-size:16px;font-weight:700;color:var(--si-text);margin:0 0 8px">Aucune opportunité active</div>
         <div style="font-size:13px;max-width:320px;margin:0 auto 16px;line-height:1.6">Lancez une campagne de prospection IA pour alimenter votre pipeline automatiquement.</div>
         <button class="si-btn si-btn-primary" onclick="document.querySelector('[data-tab=campaigns]').click()">Lancer une campagne →</button>
       </div>`
    : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="border-bottom:1px solid var(--si-border)">
          ${['Prospect','Entreprise','Stage','Valeur','Prochaine action','Agent IA','Statut'].map(h=>`<th style="text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--si-text-sub);padding:0 14px 10px">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${prospects.filter(p=>!['closed_won','closed_lost'].includes(p.stage||'prospect')).slice(0,15).map(p => {
            const stg = STAGES.find(s=>s.id===(p.stage||'prospect'));
            return `<tr style="border-bottom:1px solid var(--si-border)">
              <td style="padding:11px 14px;font-weight:700;color:var(--si-text)">${p.first_name||''} ${p.last_name||''}</td>
              <td style="padding:11px 14px;color:var(--si-text-sub)">${p.company||'—'}</td>
              <td style="padding:11px 14px"><span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${stg?.color||'#6366f1'}22;color:${stg?.color||'#6366f1'}">${stg?.label||p.stage||'—'}</span></td>
              <td style="padding:11px 14px;font-weight:600;color:var(--si-text)">${p.deal_value ? '$'+_num(p.deal_value) : '—'}</td>
              <td style="padding:11px 14px;color:var(--si-text-sub);font-size:11px">${p.next_action||'À définir'}</td>
              <td style="padding:11px 14px;color:var(--si-text-sub)">${AGENT_NAMES[p.assigned_agent]||p.assigned_agent||'—'}</td>
              <td style="padding:11px 14px"><span class="si-status-${p.status||'new'}">${p.status||'new'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
</div>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: MEETINGS
// ──────────────────────────────────────────────────────────────────────────────
async function _viewMeetings() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left"><div class="si-ph-title">Réunions</div><div class="si-ph-sub">Rendez-vous planifiés avec les prospects</div></div>
  <div class="si-ph-right">
    <button class="si-btn si-btn-secondary" id="si-m-upcoming">À venir seulement</button>
    <button class="si-btn si-btn-primary" id="si-m-new">+ Planifier un RDV</button>
  </div>
</div>
<div id="si-meetings-list">${_loading()}</div>`;
  let upcomingOnly = false;
  const load = async () => {
    document.getElementById('si-meetings-list').innerHTML = _loading();
    try {
      const items = await _api(`/api/si/meetings?upcoming=${upcomingOnly}`);
      document.getElementById('si-meetings-list').innerHTML = items.length ? `
<div class="si-meetings-list">
${items.map(mt => `<div class="si-meeting-item">
  <div>
    <div class="si-meeting-title">${_esc(mt.title)}</div>
    <div class="si-meeting-meta">
      <span>${_esc(mt.company_name||'—')}</span>
      <span>${_dt(mt.scheduled_at)}</span>
      <span>${mt.duration_minutes} min</span>
      ${mt.location ? `<span>${_esc(mt.location)}</span>` : ''}
      ${mt.meeting_url ? `<a href="${_esc(mt.meeting_url)}" target="_blank" style="color:var(--primary)">Lien</a>` : ''}
    </div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
    ${_status(mt.status)}
    ${mt.meeting_url ? `<a class="si-btn si-btn-primary si-btn-sm" href="${_esc(mt.meeting_url)}" target="_blank">Rejoindre</a>` : ''}
  </div>
</div>`).join('')}
</div>` : _empty('Aucune réunion planifiée');
    } catch(e) { document.getElementById('si-meetings-list').innerHTML = _err(e.message); }
  };
  m.querySelector('#si-m-upcoming').addEventListener('click', () => { upcomingOnly = !upcomingOnly; m.querySelector('#si-m-upcoming').textContent = upcomingOnly ? 'Toutes' : 'À venir seulement'; load(); });
  m.querySelector('#si-m-new').addEventListener('click', () => _showNewMeetingModal());
  load();
}

function _showNewMeetingModal() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
<div style="background:var(--card,#FFF);border-radius:10px;padding:24px;width:480px;max-width:95vw">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <h2 style="font-size:15px;font-weight:700">Planifier un rendez-vous</h2>
    <button id="si-mt-close" style="background:none;border:none;font-size:18px;cursor:pointer">✕</button>
  </div>
  <div id="si-mt-err"></div>
  <div class="si-form">
    <div class="si-form-field"><label class="si-form-label">ID Prospect *</label><input class="si-input" id="si-mt-pid" style="width:100%" placeholder="UUID du prospect"></div>
    <div class="si-form-field"><label class="si-form-label">Titre *</label><input class="si-input" id="si-mt-title" style="width:100%" placeholder="Appel de découverte — Acme Corp"></div>
    <div class="si-form-row">
      <div class="si-form-field"><label class="si-form-label">Date et heure</label><input class="si-input" id="si-mt-dt" type="datetime-local" style="width:100%"></div>
      <div class="si-form-field"><label class="si-form-label">Durée (min)</label><input class="si-input" id="si-mt-dur" type="number" value="30" style="width:100%"></div>
    </div>
    <div class="si-form-field"><label class="si-form-label">Lien de réunion</label><input class="si-input" id="si-mt-url" placeholder="https://teams.microsoft.com/…" style="width:100%"></div>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px">
    <button class="si-btn si-btn-secondary" id="si-mt-cancel">Annuler</button>
    <button class="si-btn si-btn-primary" id="si-mt-save">Créer le RDV</button>
  </div>
</div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#si-mt-close').addEventListener('click', close);
  overlay.querySelector('#si-mt-cancel').addEventListener('click', close);
  overlay.querySelector('#si-mt-save').addEventListener('click', async () => {
    const pid = overlay.querySelector('#si-mt-pid').value.trim();
    const title = overlay.querySelector('#si-mt-title').value.trim();
    if (!pid || !title) { overlay.querySelector('#si-mt-err').innerHTML = _err('Prospect ID et titre requis'); return; }
    const btn = overlay.querySelector('#si-mt-save'); btn.disabled=true; btn.textContent='⏳';
    try {
      await _api('/api/si/meetings', { method:'POST', body: JSON.stringify({
        prospect_id: pid, title,
        scheduled_at: overlay.querySelector('#si-mt-dt').value || new Date().toISOString(),
        duration_minutes: parseInt(overlay.querySelector('#si-mt-dur').value)||30,
        meeting_url: overlay.querySelector('#si-mt-url').value||null,
      })});
      close(); _goto('meetings');
    } catch(e) { overlay.querySelector('#si-mt-err').innerHTML = _err(e.message); btn.disabled=false; btn.textContent='Créer le RDV'; }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: CRM
// ──────────────────────────────────────────────────────────────────────────────
async function _viewCRM() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left"><div class="si-ph-title">CRM</div><div class="si-ph-sub">Synchronisation avec vos outils CRM (HubSpot, Salesforce, Pipedrive)</div></div>
</div>
<div id="si-crm-content">${_loading()}</div>`;
  try {
    const items = await _api('/api/si/crm/status');
    const CRM_INFO = { hubspot: { name:'HubSpot', icon:'🟠' }, salesforce: { name:'Salesforce', icon:'🔵' }, pipedrive: { name:'Pipedrive', icon:'🟢' } };
    document.getElementById('si-crm-content').innerHTML = items.length ? `
<div class="si-crm-grid">
${items.map(c => {
  const info = CRM_INFO[c.crm_type] || { name: c.crm_type, icon: '🔗' };
  const rate = c.total > 0 ? Math.round((c.synced / c.total) * 100) : 0;
  return `<div class="si-crm-card">
    <div class="si-crm-name">${info.icon} ${info.name}</div>
    <div class="si-agent-stat"><span class="si-agent-stat-label">Total</span><span class="si-agent-stat-val">${_num(c.total)}</span></div>
    <div class="si-agent-stat"><span class="si-agent-stat-label">Synchronisés</span><span class="si-agent-stat-val" style="color:#107C10">${_num(c.synced)} (${rate}%)</span></div>
    <div class="si-agent-stat"><span class="si-agent-stat-label">Erreurs</span><span class="si-agent-stat-val" style="color:${c.failed>0?'#C50F1F':'var(--muted)'}">${_num(c.failed)}</span></div>
    <div class="si-agent-stat"><span class="si-agent-stat-label">Dernière sync</span><span class="si-agent-stat-val">${_dt(c.last_sync_at)}</span></div>
  </div>`;
}).join('')}
</div>
<div class="si-card" style="margin-top:16px">
  <div class="si-card-title">Synchroniser un prospect</div>
  <div style="display:flex;gap:8px;align-items:flex-end">
    <div class="si-form-field" style="flex:1"><label class="si-form-label">ID Prospect</label><input class="si-input" id="si-crm-pid" placeholder="UUID du prospect" style="width:100%"></div>
    <button class="si-btn si-btn-primary" id="si-crm-sync">Synchroniser →</button>
  </div>
  <div id="si-crm-sync-msg" style="margin-top:8px"></div>
</div>` : `
<div class="si-card">
  <div class="si-card-title">Connecteurs CRM non configurés</div>
  <p style="font-size:12.5px;color:var(--muted)">Configurez un connecteur HubSpot ou Salesforce dans le Centre d'intégrations pour activer la synchronisation automatique des prospects.</p>
  <button class="si-btn si-btn-primary" style="margin-top:12px" onclick="document.querySelector('[data-tab=settings]').click()">Configurer les intégrations →</button>
</div>`;
    document.getElementById('si-crm-sync')?.addEventListener('click', async () => {
      const pid = document.getElementById('si-crm-pid').value.trim();
      if (!pid) { document.getElementById('si-crm-sync-msg').innerHTML = _err('ID prospect requis'); return; }
      const btn = document.getElementById('si-crm-sync'); btn.disabled=true; btn.textContent='⏳';
      try {
        const r = await _api(`/api/si/crm/sync/${pid}`, { method:'POST' });
        document.getElementById('si-crm-sync-msg').innerHTML = `<div class="si-alert si-alert-ok">Sync ${r.status} — Record ID : ${_esc(r.crm_record_id||'—')}</div>`;
      } catch(e) { document.getElementById('si-crm-sync-msg').innerHTML = _err(e.message); }
      finally { btn.disabled=false; btn.textContent='Synchroniser →'; }
    });
  } catch(e) { document.getElementById('si-crm-content').innerHTML = _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: ANALYTICS
// ──────────────────────────────────────────────────────────────────────────────
async function _viewAnalytics() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left"><div class="si-ph-title">Analytics</div><div class="si-ph-sub">Pipeline, conversion et ROI des agents IA</div></div>
  <div class="si-ph-right">
    <select class="si-select" id="si-an-period">
      <option value="30">30 jours</option>
      <option value="60">60 jours</option>
      <option value="90">90 jours</option>
    </select>
  </div>
</div>
<div id="si-analytics-content">${_loading()}</div>`;
  const load = async () => {
    const period = m.querySelector('#si-an-period').value;
    document.getElementById('si-analytics-content').innerHTML = _loading();
    try {
      const d = await _api(`/api/si/analytics?period=${period}`);
      const funnel = d.funnel || [];
      const maxCount = Math.max(...funnel.map(f => f.count), 1);
      const STATUS_LABELS = { new:'Nouveaux', researched:'Enrichis', contacted:'Contactés', replied:'Répondu', meeting_set:'RDV', proposal_sent:'Offre', won:'Gagné', lost:'Perdu', disqualified:'Disqualifié' };
      document.getElementById('si-analytics-content').innerHTML = `
<div class="si-two-col">
  <div class="si-card">
    <div class="si-card-title">Entonnoir de conversion</div>
    <div class="si-funnel">
      ${funnel.map(f => `<div class="si-funnel-row">
        <span class="si-funnel-label">${STATUS_LABELS[f.status]||f.status}</span>
        <div class="si-funnel-bar-wrap"><div class="si-funnel-bar" style="width:${Math.round((f.count/maxCount)*100)}%"></div></div>
        <span class="si-funnel-count">${_num(f.count)}</span>
      </div>`).join('')}
    </div>
  </div>
  <div class="si-card">
    <div class="si-card-title">Top secteurs</div>
    ${(d.top_sectors||[]).length ? `<div style="display:flex;flex-direction:column;gap:6px">
      ${d.top_sectors.map(s => `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.04);font-size:12px">
        <span>${_esc(s.sector)}</span>
        <span><strong>${_num(s.count)}</strong> prospects · score moy. <strong>${_num(s.avg_score)}/100</strong></span>
      </div>`).join('')}
    </div>` : _empty('Pas encore de données')}
  </div>
</div>
<div class="si-card">
  <div class="si-card-title">Coûts des agents IA — ${period} jours</div>
  ${(d.agent_costs||[]).length ? `
  <div class="si-tbl-wrap">
  <table class="si-tbl">
  <thead><tr><th>Agent</th><th>Runs</th><th>Tokens consommés</th><th>Coût moyen / run</th></tr></thead>
  <tbody>
  ${d.agent_costs.map(a => `<tr>
    <td><strong>${AGENT_NAMES[a.agent_type]||a.agent_type}</strong></td>
    <td>${_num(a.runs)}</td>
    <td>${_num(a.total_tokens)}</td>
    <td>$${a.avg_cost_usd ? Number(a.avg_cost_usd).toFixed(4) : '—'}</td>
  </tr>`).join('')}
  </tbody>
  </table>
  </div>` : _empty('Aucune donnée de coût')}
</div>`;
    } catch(e) { document.getElementById('si-analytics-content').innerHTML = _err(e.message); }
  };
  m.querySelector('#si-an-period').addEventListener('change', load);
  load();
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: TEMPLATES
// ──────────────────────────────────────────────────────────────────────────────
async function _viewTemplates() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left"><div class="si-ph-title">Templates</div><div class="si-ph-sub">Modèles d'emails et de messages utilisés par les agents IA</div></div>
  <div class="si-ph-right">
    <select class="si-select" id="si-t-type"><option value="">Tous</option><option value="outreach">Prise de contact</option><option value="followup">Relance</option><option value="proposal">Offre</option><option value="meeting_request">RDV</option><option value="nurture">Nurturing</option></select>
    <button class="si-btn si-btn-primary" id="si-t-new">+ Nouveau</button>
  </div>
</div>
<div id="si-templates-grid">${_loading()}</div>`;
  const TTYPE = { outreach:'Prise de contact', followup:'Relance', proposal:'Offre', meeting_request:'Demande RDV', nurture:'Nurturing' };
  const load = async () => {
    const type = m.querySelector('#si-t-type').value;
    document.getElementById('si-templates-grid').innerHTML = _loading();
    try {
      const items = await _api(`/api/si/templates${type?'?type='+type:''}`);
      document.getElementById('si-templates-grid').innerHTML = items.length ? `
<div class="si-tmpl-grid">
${items.map(t => `<div class="si-tmpl-card">
  <div class="si-tmpl-name">${_esc(t.name)}</div>
  <div class="si-tmpl-meta">
    <span class="si-badge si-badge-info">${TTYPE[t.type]||t.type}</span>
    <span class="si-badge si-badge-muted">${t.language.toUpperCase()}</span>
    ${t.usage_count ? `<span class="si-badge si-badge-muted">${_num(t.usage_count)} utilisations</span>` : ''}
  </div>
  ${t.subject ? `<div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:4px">Objet : ${_esc(t.subject)}</div>` : ''}
  <div class="si-tmpl-body">${_esc(t.body)}</div>
  <div class="si-tmpl-actions">
    <button class="si-btn si-btn-secondary si-btn-sm si-t-edit" data-id="${t.id}">Modifier</button>
    <button class="si-btn si-btn-secondary si-btn-sm si-t-toggle" data-id="${t.id}" data-active="${t.is_active}">${t.is_active ? 'Désactiver' : 'Activer'}</button>
  </div>
</div>`).join('')}
</div>` : _empty('Aucun template. Créez-en un pour personnaliser les messages des agents IA !');
      document.querySelectorAll('.si-t-toggle').forEach(btn => btn.addEventListener('click', async () => {
        const newActive = btn.dataset.active !== 'true';
        try { await _api(`/api/si/templates/${btn.dataset.id}`, { method:'PATCH', body: JSON.stringify({ is_active: newActive }) }); load(); }
        catch(e) { alert(e.message); }
      }));
    } catch(e) { document.getElementById('si-templates-grid').innerHTML = _err(e.message); }
  };
  m.querySelector('#si-t-type').addEventListener('change', load);
  m.querySelector('#si-t-new').addEventListener('click', () => _showTemplateModal(null, load));
  load();
}

function _showTemplateModal(template, onSave) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
<div style="background:var(--card,#FFF);border-radius:10px;padding:24px;width:560px;max-width:95vw;max-height:90vh;overflow-y:auto">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <h2 style="font-size:15px;font-weight:700">${template ? 'Modifier le template' : 'Nouveau template'}</h2>
    <button id="si-tm-close" style="background:none;border:none;font-size:18px;cursor:pointer">✕</button>
  </div>
  <div id="si-tm-err"></div>
  <div class="si-form">
    <div class="si-form-row">
      <div class="si-form-field"><label class="si-form-label">Nom *</label><input class="si-input" id="si-tm-name" value="${_esc(template?.name||'')}" style="width:100%"></div>
      <div class="si-form-field"><label class="si-form-label">Type</label><select class="si-select" id="si-tm-type" style="width:100%">
        ${['outreach','followup','proposal','meeting_request','nurture'].map(t => `<option value="${t}"${template?.type===t?' selected':''}>${t}</option>`).join('')}
      </select></div>
    </div>
    <div class="si-form-row">
      <div class="si-form-field"><label class="si-form-label">Canal</label><select class="si-select" id="si-tm-channel" style="width:100%">
        ${['email','linkedin','chat'].map(c => `<option value="${c}"${template?.channel===c?' selected':''}>${c}</option>`).join('')}
      </select></div>
      <div class="si-form-field"><label class="si-form-label">Langue</label><select class="si-select" id="si-tm-lang" style="width:100%">
        <option value="fr"${template?.language==='fr'?' selected':''}>Français</option>
        <option value="en"${template?.language==='en'?' selected':''}>English</option>
      </select></div>
    </div>
    <div class="si-form-field"><label class="si-form-label">Objet</label><input class="si-input" id="si-tm-subject" value="${_esc(template?.subject||'')}" style="width:100%"></div>
    <div class="si-form-field"><label class="si-form-label">Corps *</label><textarea class="si-textarea" id="si-tm-body" style="min-height:160px">${_esc(template?.body||'')}</textarea>
      <div class="si-form-hint">Variables disponibles : {{company_name}} {{contact_name}} {{contact_title}} {{sector}}</div>
    </div>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px">
    <button class="si-btn si-btn-secondary" id="si-tm-cancel">Annuler</button>
    <button class="si-btn si-btn-primary" id="si-tm-save">${template ? 'Enregistrer' : 'Créer'}</button>
  </div>
</div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#si-tm-close').addEventListener('click', close);
  overlay.querySelector('#si-tm-cancel').addEventListener('click', close);
  overlay.querySelector('#si-tm-save').addEventListener('click', async () => {
    const name = overlay.querySelector('#si-tm-name').value.trim();
    const body = overlay.querySelector('#si-tm-body').value.trim();
    if (!name || !body) { overlay.querySelector('#si-tm-err').innerHTML = _err('Nom et corps requis'); return; }
    const btn = overlay.querySelector('#si-tm-save'); btn.disabled=true; btn.textContent='⏳';
    try {
      const payload = { name, type: overlay.querySelector('#si-tm-type').value, channel: overlay.querySelector('#si-tm-channel').value, language: overlay.querySelector('#si-tm-lang').value, subject: overlay.querySelector('#si-tm-subject').value||null, body };
      if (template) await _api(`/api/si/templates/${template.id}`, { method:'PATCH', body: JSON.stringify(payload) });
      else await _api('/api/si/templates', { method:'POST', body: JSON.stringify(payload) });
      close(); onSave?.();
    } catch(e) { overlay.querySelector('#si-tm-err').innerHTML = _err(e.message); btn.disabled=false; btn.textContent=template?'Enregistrer':'Créer'; }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// VIEW: SETTINGS (ICP)
// ──────────────────────────────────────────────────────────────────────────────
async function _viewSettings() {
  const m = _main();
  m.innerHTML = `
<div class="si-ph">
  <div class="si-ph-left"><div class="si-ph-title">Paramètres</div><div class="si-ph-sub">Profil ICP (Ideal Customer Profile) — définit quels prospects cibler</div></div>
</div>
<div id="si-settings-content">${_loading()}</div>`;
  try {
    const s = await _api('/api/si/settings');
    document.getElementById('si-settings-content').innerHTML = `
<div class="si-card" style="max-width:700px">
  <div class="si-card-title">Profil ICP</div>
  <div id="si-s-err"></div>
  <div class="si-form">
    <div class="si-form-field">
      <label class="si-form-label">Description ICP</label>
      <textarea class="si-textarea" id="si-s-icp">${_esc(s.icp_description||'')}</textarea>
      <div class="si-form-hint">Décrivez en langage naturel votre client idéal — les agents IA l'utilisent pour prospecter.</div>
    </div>
    <div class="si-form-field">
      <label class="si-form-label">Proposition de valeur</label>
      <textarea class="si-textarea" id="si-s-vp" style="min-height:60px">${_esc(s.value_proposition||'')}</textarea>
    </div>
    <div class="si-form-row">
      <div class="si-form-field">
        <label class="si-form-label">Secteurs cibles</label>
        <input class="si-input" id="si-s-sectors" value="${_esc((s.target_sectors||[]).join(', '))}" style="width:100%">
        <div class="si-form-hint">Séparés par des virgules</div>
      </div>
      <div class="si-form-field">
        <label class="si-form-label">Pays cibles</label>
        <input class="si-input" id="si-s-countries" value="${_esc((s.target_countries||['CA']).join(', '))}" style="width:100%">
      </div>
    </div>
    <div class="si-form-row">
      <div class="si-form-field">
        <label class="si-form-label">Employés minimum</label>
        <input class="si-input" id="si-s-empmin" type="number" value="${s.employee_min||10}" style="width:100%">
      </div>
      <div class="si-form-field">
        <label class="si-form-label">Employés maximum</label>
        <input class="si-input" id="si-s-empmax" type="number" value="${s.employee_max||5000}" style="width:100%">
      </div>
    </div>
    <div class="si-form-row">
      <div class="si-form-field">
        <label class="si-form-label">Budget deal moyen ($)</label>
        <input class="si-input" id="si-s-deal" type="number" value="${s.avg_deal_size||''}" style="width:100%">
      </div>
      <div class="si-form-field">
        <label class="si-form-label">Cycle de vente (jours)</label>
        <input class="si-input" id="si-s-cycle" type="number" value="${s.sales_cycle_days||30}" style="width:100%">
      </div>
    </div>
  </div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
    <button class="si-btn si-btn-primary" id="si-s-save">Enregistrer l'ICP</button>
  </div>
  <div id="si-s-msg" style="margin-top:10px"></div>
</div>`;
    m.querySelector('#si-s-save').addEventListener('click', async () => {
      const btn = m.querySelector('#si-s-save'); btn.disabled=true; btn.textContent='⏳ Enregistrement…';
      try {
        await _api('/api/si/settings', { method:'PATCH', body: JSON.stringify({
          icp_description: m.querySelector('#si-s-icp').value||null,
          value_proposition: m.querySelector('#si-s-vp').value||null,
          target_sectors: m.querySelector('#si-s-sectors').value.split(',').map(s=>s.trim()).filter(Boolean),
          target_countries: m.querySelector('#si-s-countries').value.split(',').map(s=>s.trim()).filter(Boolean),
          employee_min: parseInt(m.querySelector('#si-s-empmin').value)||10,
          employee_max: parseInt(m.querySelector('#si-s-empmax').value)||5000,
          avg_deal_size: parseFloat(m.querySelector('#si-s-deal').value)||null,
          sales_cycle_days: parseInt(m.querySelector('#si-s-cycle').value)||30,
        })});
        document.getElementById('si-s-msg').innerHTML = '<div class="si-alert si-alert-ok">ICP enregistré avec succès.</div>';
      } catch(e) { document.getElementById('si-s-msg').innerHTML = _err(e.message); }
      finally { btn.disabled=false; btn.textContent='Enregistrer l\'ICP'; }
    });
  } catch(e) { document.getElementById('si-settings-content').innerHTML = _err(e.message); }
}

// ──────────────────────────────────────────────────────────────────────────────
// MOUNT / UNMOUNT
// ──────────────────────────────────────────────────────────────────────────────
export default {
  mount(container, ctx) {
    _st = { ctx, view: 'dashboard', _searchTimer: null };
    _renderShell(container);
    _renderView();
  },
  unmount(container) {
    _st = null;
    container.innerHTML = '';
  },
};
