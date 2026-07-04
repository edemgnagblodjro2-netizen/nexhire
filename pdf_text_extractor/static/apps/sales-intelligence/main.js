/**
 * AgentHub — Sales Intelligence
 * Connecté à /api/si/* — Aucune donnée fictive.
 * Prospects, campagnes, agents IA, conversations, pipeline, analytics.
 */

const _CSS_ID = 'si2-css';

// ── API ───────────────────────────────────────────────────────────────────────
function _tok() { return localStorage.getItem('nexhire_token') || ''; }
function _h() {
  const t = _tok();
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), 'Content-Type': 'application/json' };
}
async function _api(path, opts = {}) {
  const r = await fetch(path, { headers: _h(), credentials: 'include', ...opts });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Erreur ${r.status}`);
  }
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
function _num(n, dec = 0) {
  return Number(n ?? 0).toLocaleString('fr-CA', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function _scoreChip(s) {
  if (s == null) return '<span class="si-chip si-chip-muted">—</span>';
  const cls = s >= 80 ? 'ok' : s >= 50 ? 'warn' : 'err';
  return `<span class="si-chip si-chip-${cls}">${s}%</span>`;
}
function _statusChip(s) {
  const MAP = {
    new: ['Nouveau', 'info'], researched: ['Enrichi', 'info'], contacted: ['Contacté', 'warn'],
    replied: ['Répondu', 'warn'], meeting_set: ['RDV fixé', 'ok'], proposal_sent: ['Offre envoyée', 'ok'],
    won: ['Gagné', 'green'], lost: ['Perdu', 'err'], disqualified: ['Disqualifié', 'muted'],
    open: ['Ouvert', 'info'], active: ['Actif', 'ok'], paused: ['Pausé', 'warn'],
    closed: ['Clôturé', 'muted'], draft: ['Brouillon', 'muted'],
  };
  const [lbl, cls] = MAP[s] || [_esc(s), 'muted'];
  return `<span class="si-chip si-chip-${cls}">${lbl}</span>`;
}
function _loader() {
  return '<div class="si-loader"><div class="si-spin"></div><span>Chargement…</span></div>';
}
function _empty(icon, title, sub, btn = '') {
  return `<div class="si-empty"><div class="si-empty-icon">${icon}</div><div class="si-empty-title">${title}</div><p class="si-empty-sub">${sub}</p>${btn}</div>`;
}
function _errBox(msg) {
  return `<div class="si-alert si-alert-err">${_esc(msg)}</div>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const _CSS = `
.si-wrap { display:flex; flex-direction:column; height:100%; min-height:0; font-family:var(--font,ui-sans-serif,system-ui,sans-serif); }
.si-tabs { display:flex; background:#fff; border-bottom:1px solid var(--border,#E0E0E0); padding:0 20px; overflow-x:auto; flex-shrink:0; }
.si-tab  { padding:11px 16px; font-size:12px; font-weight:600; color:#757575; border:none; background:none; cursor:pointer; white-space:nowrap; border-bottom:2px solid transparent; margin-bottom:-1px; transition:color .15s,border-color .15s; }
.si-tab:hover  { color:#1B1B1B; }
.si-tab.active { color:var(--primary,#0078D4); border-bottom-color:var(--primary,#0078D4); }

.si-body { flex:1; overflow-y:auto; padding:24px; min-height:0; }

.si-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:24px; }
.si-kpi  { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:16px 18px; }
.si-kpi-label { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#757575; margin-bottom:6px; }
.si-kpi-value { font-size:28px; font-weight:800; color:#1B1B1B; letter-spacing:-.02em; line-height:1; }
.si-kpi-sub   { font-size:11px; color:#757575; margin-top:4px; }
.si-kpi-blue   { border-top:3px solid #0078D4; }
.si-kpi-green  { border-top:3px solid #107C10; }
.si-kpi-orange { border-top:3px solid #CA5010; }
.si-kpi-purple { border-top:3px solid #5C2D91; }

.si-sh { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; gap:10px; flex-wrap:wrap; }
.si-sh-title { font-size:13px; font-weight:700; color:#1B1B1B; }

.si-chip { display:inline-flex; align-items:center; font-size:10px; font-weight:700; padding:2px 8px; border-radius:999px; white-space:nowrap; }
.si-chip-ok     { background:#DFF6DD; color:#107C10; }
.si-chip-green  { background:#DFF6DD; color:#107C10; }
.si-chip-warn   { background:#FDE7D9; color:#CA5010; }
.si-chip-err    { background:#FDE7E9; color:#C50F1F; }
.si-chip-info   { background:#EFF6FC; color:#0078D4; }
.si-chip-muted  { background:#F3F3F3; color:#757575; }

.si-btn { padding:7px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; border:none; transition:opacity .15s; }
.si-btn:hover { opacity:.85; }
.si-btn-primary   { background:var(--primary,#0078D4); color:#fff; }
.si-btn-secondary { background:#F5F5F5; color:#1B1B1B; border:1px solid var(--border,#E0E0E0); }
.si-btn-danger    { background:#C50F1F; color:#fff; }
.si-btn-sm { padding:5px 10px; font-size:11px; }

.si-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:14px; flex-wrap:wrap; }
.si-input  { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:7px 10px; font-size:12px; color:#1B1B1B; background:#fff; outline:none; }
.si-input:focus { border-color:var(--primary,#0078D4); box-shadow:0 0 0 2px rgba(0,120,212,.12); }
.si-select { border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:7px 10px; font-size:12px; color:#1B1B1B; background:#fff; outline:none; cursor:pointer; }
.si-spacer { flex:1; }

.si-tbl-wrap { overflow-x:auto; border:1px solid var(--border,#E0E0E0); border-radius:8px; }
table.si-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.si-tbl thead th { text-align:left; padding:9px 12px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#757575; background:#F8F8F8; border-bottom:1px solid var(--border,#E0E0E0); white-space:nowrap; }
.si-tbl tbody td { padding:11px 12px; border-bottom:1px solid rgba(0,0,0,.04); vertical-align:middle; }
.si-tbl tbody tr:last-child td { border-bottom:none; }
.si-tbl tbody tr:hover td { background:#F5F5F5; }
.si-company { font-weight:600; color:#1B1B1B; }
.si-sub     { font-size:11px; color:#757575; margin-top:1px; }

.si-card { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:18px; }
.si-two { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.si-three { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }

.si-agent-card { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:10px; padding:16px; }
.si-agent-name { font-size:13px; font-weight:700; color:#1B1B1B; margin-bottom:4px; }
.si-agent-sub  { font-size:11px; color:#757575; margin-bottom:12px; }
.si-agent-stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
.si-astat { text-align:center; padding:8px; background:#F8F8F8; border-radius:6px; }
.si-astat-val { font-size:18px; font-weight:800; color:#1B1B1B; }
.si-astat-lbl { font-size:9.5px; color:#757575; text-transform:uppercase; letter-spacing:.05em; }

.si-conv-grid { display:grid; grid-template-columns:280px 1fr; gap:14px; height:calc(100vh - 220px); min-height:400px; }
.si-conv-list { overflow-y:auto; display:flex; flex-direction:column; gap:6px; }
.si-conv-item { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; padding:12px 14px; cursor:pointer; transition:border-color .15s; }
.si-conv-item:hover,.si-conv-item.active { border-color:var(--primary,#0078D4); }
.si-conv-company { font-size:12px; font-weight:700; color:#1B1B1B; }
.si-conv-sub { font-size:11px; color:#757575; margin-top:2px; }
.si-conv-preview { font-size:11px; color:#555; margin-top:6px; line-height:1.4; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.si-conv-meta { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; align-items:center; }

.si-thread-pane { background:#fff; border:1px solid var(--border,#E0E0E0); border-radius:8px; display:flex; flex-direction:column; overflow:hidden; }
.si-thread-header { padding:14px 18px; border-bottom:1px solid var(--border,#E0E0E0); background:#F8F8F8; flex-shrink:0; }
.si-thread-title { font-size:13px; font-weight:700; color:#1B1B1B; }
.si-thread-sub   { font-size:11px; color:#757575; margin-top:2px; }
.si-thread-msgs { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; }
.si-msg { max-width:78%; padding:12px 14px; border-radius:10px; font-size:12.5px; line-height:1.6; }
.si-msg-ai       { background:#F0F6FF; border:1px solid #C7E0F4; align-self:flex-start; }
.si-msg-human    { background:var(--primary,#0078D4); color:#fff; align-self:flex-end; }
.si-msg-prospect { background:#FFF8ED; border:1px solid #FDE7D9; align-self:flex-start; }
.si-msg-role { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; opacity:.65; }
.si-msg-time { font-size:10px; color:#888; margin-top:4px; text-align:right; }
.si-thread-footer { padding:12px 16px; border-top:1px solid var(--border,#E0E0E0); background:#F8F8F8; flex-shrink:0; }
.si-thread-empty { flex:1; display:flex; align-items:center; justify-content:center; color:#757575; font-size:13px; }

.si-funnel-row { display:grid; grid-template-columns:140px 1fr 70px 110px; gap:12px; align-items:center; margin-bottom:8px; }
.si-funnel-lbl { font-size:11.5px; font-weight:600; color:#1B1B1B; text-align:right; }
.si-funnel-bg  { height:28px; background:#F3F3F3; border-radius:5px; overflow:hidden; }
.si-funnel-bar { height:100%; border-radius:5px; }
.si-funnel-cnt { font-size:13px; font-weight:700; color:#1B1B1B; text-align:center; }
.si-funnel-val { font-size:11.5px; font-weight:600; color:#757575; text-align:right; }

.si-bar-row { display:grid; grid-template-columns:120px 1fr 50px; gap:8px; align-items:center; margin-bottom:6px; }
.si-bar-lbl { font-size:11px; color:#1B1B1B; text-align:right; }
.si-bar-bg  { height:12px; background:#F3F3F3; border-radius:3px; overflow:hidden; }
.si-bar-fill { height:100%; border-radius:3px; }
.si-bar-val { font-size:11px; font-weight:700; color:#1B1B1B; }

.si-loader { display:flex; gap:10px; align-items:center; justify-content:center; padding:48px; color:#757575; font-size:13px; }
.si-spin { width:20px; height:20px; border:2px solid #E0E0E0; border-top-color:var(--primary,#0078D4); border-radius:50%; animation:si-spin .7s linear infinite; }
@keyframes si-spin { to { transform:rotate(360deg); } }
.si-empty { padding:56px 24px; text-align:center; color:#757575; }
.si-empty-icon  { font-size:36px; margin-bottom:12px; opacity:.4; }
.si-empty-title { font-size:14px; font-weight:700; color:#1B1B1B; margin-bottom:6px; }
.si-empty-sub   { font-size:12px; color:#757575; margin-bottom:16px; }
.si-alert { padding:10px 14px; border-radius:6px; font-size:12px; margin-bottom:12px; }
.si-alert-err { background:#FDE7E9; color:#C50F1F; border:1px solid #FCCCD5; }

/* Modal */
.si-overlay { position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
.si-modal { background:#fff; border-radius:10px; width:100%; max-width:560px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.2); }
.si-modal-header { padding:20px 24px 16px; border-bottom:1px solid var(--border,#E0E0E0); display:flex; justify-content:space-between; align-items:center; }
.si-modal-title  { font-size:16px; font-weight:700; color:#1B1B1B; }
.si-modal-close  { background:none; border:none; font-size:20px; cursor:pointer; color:#757575; line-height:1; padding:4px; }
.si-modal-body   { padding:20px 24px; }
.si-modal-footer { padding:16px 24px; border-top:1px solid var(--border,#E0E0E0); display:flex; justify-content:flex-end; gap:8px; }
.si-form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.si-field { margin-bottom:14px; }
.si-label { display:block; font-size:11.5px; font-weight:600; color:#1B1B1B; margin-bottom:5px; }
.si-field-input { width:100%; border:1px solid var(--border,#E0E0E0); border-radius:6px; padding:8px 10px; font-size:12.5px; color:#1B1B1B; background:#fff; outline:none; box-sizing:border-box; }
.si-field-input:focus { border-color:var(--primary,#0078D4); box-shadow:0 0 0 2px rgba(0,120,212,.12); }
select.si-field-input { cursor:pointer; }
`;

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',     label: 'Tableau de bord' },
  { id: 'prospects',     label: 'Prospects' },
  { id: 'agents',        label: 'Agents IA' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'pipeline',      label: 'Pipeline' },
  { id: 'analytics',     label: 'Analytique' },
];

// ── Module state ──────────────────────────────────────────────────────────────
let _wrap = null;
let _ctx  = null;
let _tab  = 'dashboard';

// ── Tab bar ───────────────────────────────────────────────────────────────────
function _tabBar() {
  return `<div class="si-tabs">${TABS.map(t =>
    `<button class="si-tab${t.id === _tab ? ' active' : ''}" data-tab="${t.id}">${_esc(t.label)}</button>`
  ).join('')}</div>`;
}

// ── Render dispatcher ─────────────────────────────────────────────────────────
function _render(tab) {
  _tab = tab || _tab;
  if (!_wrap) return;
  _wrap.innerHTML = _tabBar();
  const body = document.createElement('div');
  body.className = 'si-body';
  _wrap.appendChild(body);

  _wrap.querySelectorAll('.si-tab').forEach(btn => {
    btn.addEventListener('click', () => _render(btn.dataset.tab));
  });

  switch (_tab) {
    case 'dashboard':     return _viewDashboard(body);
    case 'prospects':     return _viewProspects(body);
    case 'agents':        return _viewAgents(body);
    case 'conversations': return _viewConversations(body);
    case 'pipeline':      return _viewPipeline(body);
    case 'analytics':     return _viewAnalytics(body);
  }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function _viewDashboard(el) {
  el.innerHTML = _loader();
  try {
    const data = await _api('/api/si/dashboard');
    const k = data.kpis || {};
    const agents = data.agent_stats_7d || [];
    const daily  = data.daily_prospects_30d || [];

    const winRate = k.total_prospects > 0
      ? Math.round((k.won || 0) / k.total_prospects * 100) : 0;

    el.innerHTML = `
<div class="si-kpis">
  <div class="si-kpi si-kpi-blue">
    <div class="si-kpi-label">Prospects total</div>
    <div class="si-kpi-value">${_num(k.total_prospects)}</div>
    <div class="si-kpi-sub">${_num(k.new_prospects)} nouveaux</div>
  </div>
  <div class="si-kpi si-kpi-orange">
    <div class="si-kpi-label">Contactés</div>
    <div class="si-kpi-value">${_num(k.contacted)}</div>
    <div class="si-kpi-sub">Conversations actives</div>
  </div>
  <div class="si-kpi si-kpi-purple">
    <div class="si-kpi-label">RDV planifiés</div>
    <div class="si-kpi-value">${_num(data.upcoming_meetings)}</div>
    <div class="si-kpi-sub">À venir</div>
  </div>
  <div class="si-kpi si-kpi-green">
    <div class="si-kpi-label">Gagnés</div>
    <div class="si-kpi-value">${_num(k.won)}</div>
    <div class="si-kpi-sub">Taux ${winRate}%</div>
  </div>
  <div class="si-kpi">
    <div class="si-kpi-label">Score IA moyen</div>
    <div class="si-kpi-value">${k.avg_score != null ? Math.round(k.avg_score) : '—'}</div>
    <div class="si-kpi-sub">Score de qualification</div>
  </div>
  <div class="si-kpi">
    <div class="si-kpi-label">Pipeline</div>
    <div class="si-kpi-value">${k.pipeline_value > 0 ? _num(k.pipeline_value / 1000, 0) + 'k$' : '—'}</div>
    <div class="si-kpi-sub">Valeur estimée</div>
  </div>
</div>

<div class="si-two" style="margin-bottom:20px">
  <div>
    <div class="si-sh"><span class="si-sh-title">Performance agents IA — 7 derniers jours</span></div>
    ${agents.length === 0
      ? _empty('🤖', 'Aucune activité agent', 'Les agents IA démarrent lorsqu\'une campagne est lancée.')
      : `<div class="si-tbl-wrap"><table class="si-tbl">
          <thead><tr><th>Agent</th><th>Exécutions</th><th>Succès</th><th>Erreurs</th><th>Durée moy.</th></tr></thead>
          <tbody>${agents.map(a => `
          <tr>
            <td><span class="si-company">${_esc(a.agent_type)}</span></td>
            <td>${_num(a.total_runs)}</td>
            <td><span class="si-chip si-chip-ok">${_num(a.successes)}</span></td>
            <td>${a.errors > 0 ? `<span class="si-chip si-chip-err">${_num(a.errors)}</span>` : '<span class="si-chip si-chip-muted">0</span>'}</td>
            <td>${a.avg_duration_ms != null ? Math.round(a.avg_duration_ms / 1000) + 's' : '—'}</td>
          </tr>`).join('')}</tbody>
        </table></div>`}
  </div>
  <div>
    <div class="si-sh"><span class="si-sh-title">Nouveaux prospects — 30 jours</span></div>
    ${daily.length === 0
      ? _empty('📈', 'Aucun prospect encore', 'Créez votre premier prospect ou lancez une campagne IA.', `<button class="si-btn si-btn-primary" onclick="document.querySelector('[data-tab=prospects]')?.click()">Voir les prospects</button>`)
      : `<div class="si-card" style="padding:14px">
          ${daily.map(d => {
            const dt = new Date(d.day).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
            return `<div class="si-bar-row"><div class="si-bar-lbl">${dt}</div><div class="si-bar-bg"><div class="si-bar-fill" style="width:${Math.min(100, d.count / Math.max(...daily.map(x=>x.count)) * 100)}%;background:#0078D4"></div></div><div class="si-bar-val">${d.count}</div></div>`;
          }).join('')}
        </div>`}
  </div>
</div>`;
  } catch (e) {
    el.innerHTML = _errBox(e.message);
  }
}

// ── PROSPECTS ─────────────────────────────────────────────────────────────────
let _prosPage = 1;
let _prosFilter = { status: '', search: '', sort: 'created_at', order: 'desc' };

async function _viewProspects(el) {
  el.innerHTML = `
<div class="si-sh">
  <span class="si-sh-title">Prospects</span>
  <button class="si-btn si-btn-primary si-btn-sm" id="si-new-prospect">+ Nouveau prospect</button>
</div>
<div class="si-toolbar">
  <input class="si-input" placeholder="Rechercher…" id="si-ps" value="${_esc(_prosFilter.search)}" style="flex:1;max-width:280px">
  <select class="si-select" id="si-ss">
    <option value="">Tous les statuts</option>
    <option value="new">Nouveau</option>
    <option value="researched">Enrichi</option>
    <option value="contacted">Contacté</option>
    <option value="replied">Répondu</option>
    <option value="meeting_set">RDV fixé</option>
    <option value="proposal_sent">Offre envoyée</option>
    <option value="won">Gagné</option>
    <option value="lost">Perdu</option>
  </select>
  <select class="si-select" id="si-so">
    <option value="created_at">Date de création</option>
    <option value="ai_score">Score IA</option>
    <option value="company_name">Entreprise</option>
    <option value="last_contacted_at">Dernier contact</option>
  </select>
  <button class="si-btn si-btn-secondary si-btn-sm" id="si-export-csv">↓ Exporter CSV</button>
</div>
<div id="si-pros-table">${_loader()}</div>`;

  el.querySelector('#si-new-prospect').addEventListener('click', () => _openProspectModal(el));
  el.querySelector('#si-ps').addEventListener('input', e => { _prosFilter.search = e.target.value; _prosPage = 1; _loadProspects(el); });
  el.querySelector('#si-ss').addEventListener('change', e => { _prosFilter.status = e.target.value; _prosPage = 1; _loadProspects(el); });
  el.querySelector('#si-so').addEventListener('change', e => { _prosFilter.sort = e.target.value; _loadProspects(el); });
  el.querySelector('#si-export-csv').addEventListener('click', () => _exportCSV());
  el.querySelector('#si-ss').value = _prosFilter.status;
  el.querySelector('#si-so').value = _prosFilter.sort;

  _loadProspects(el);
}

async function _loadProspects(el) {
  const tbl = el.querySelector('#si-pros-table');
  if (!tbl) return;
  tbl.innerHTML = _loader();
  try {
    const p = new URLSearchParams({ page: _prosPage, limit: 25, sort: _prosFilter.sort, order: _prosFilter.order });
    if (_prosFilter.status) p.set('status', _prosFilter.status);
    if (_prosFilter.search) p.set('search', _prosFilter.search);
    const data = await _api(`/api/si/prospects?${p}`);
    const items = data.items || [];
    const total = data.total || 0;
    const pages = Math.ceil(total / 25);

    if (items.length === 0) {
      tbl.innerHTML = _empty('🔍', 'Aucun prospect', 'Créez votre premier prospect ou lancez une campagne IA pour en identifier automatiquement.',
        `<button class="si-btn si-btn-primary" id="si-np2">+ Créer un prospect</button>`);
      tbl.querySelector('#si-np2')?.addEventListener('click', () => _openProspectModal(el));
      return;
    }

    tbl.innerHTML = `
<div class="si-tbl-wrap">
  <table class="si-tbl">
    <thead><tr>
      <th>Entreprise</th><th>Contact</th><th>Secteur</th><th>Score IA</th><th>Budget est.</th><th>Statut</th><th>Créé le</th><th></th>
    </tr></thead>
    <tbody>
      ${items.map(p => `<tr>
        <td><div class="si-company">${_esc(p.company_name)}</div>${p.website ? `<div class="si-sub">${_esc(p.website)}</div>` : ''}</td>
        <td><div>${_esc(p.contact_name || '—')}</div>${p.contact_email ? `<div class="si-sub">${_esc(p.contact_email)}</div>` : ''}</td>
        <td><span style="font-size:11px;color:#555">${_esc(p.sector || '—')}</span></td>
        <td>${_scoreChip(p.ai_score)}</td>
        <td style="font-size:12px">${p.estimated_budget ? _num(p.estimated_budget) + ' $' : '—'}</td>
        <td>${_statusChip(p.status)}</td>
        <td><span class="si-sub">${_dt(p.created_at)}</span></td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="si-btn si-btn-secondary si-btn-sm" data-edit="${_esc(p.id)}">Modifier</button>
            <button class="si-btn si-btn-danger si-btn-sm" data-del="${_esc(p.id)}" data-name="${_esc(p.company_name)}">×</button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>
${pages > 1 ? `<div style="display:flex;justify-content:center;gap:8px;margin-top:12px;align-items:center">
  <button class="si-btn si-btn-secondary si-btn-sm" id="si-prev" ${_prosPage <= 1 ? 'disabled' : ''}>← Précédent</button>
  <span style="font-size:12px;color:#757575">Page ${_prosPage} / ${pages} — ${_num(total)} prospects</span>
  <button class="si-btn si-btn-secondary si-btn-sm" id="si-next" ${_prosPage >= pages ? 'disabled' : ''}>Suivant →</button>
</div>` : `<div style="text-align:right;font-size:11px;color:#757575;margin-top:8px">${_num(total)} prospects</div>`}`;

    tbl.querySelector('#si-prev')?.addEventListener('click', () => { _prosPage--; _loadProspects(el); });
    tbl.querySelector('#si-next')?.addEventListener('click', () => { _prosPage++; _loadProspects(el); });
    tbl.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const p = await _api(`/api/si/prospects/${btn.dataset.edit}`);
          _openProspectModal(el, p);
        } catch (e) { alert(e.message); }
      });
    });
    tbl.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Supprimer le prospect "${btn.dataset.name}" ?`)) return;
        try {
          await _api(`/api/si/prospects/${btn.dataset.del}`, { method: 'DELETE' });
          _loadProspects(el);
        } catch (e) { alert(e.message); }
      });
    });
  } catch (e) {
    tbl.innerHTML = _errBox(e.message);
  }
}

function _openProspectModal(el, existing = null) {
  const isEdit = !!existing;
  const overlay = document.createElement('div');
  overlay.className = 'si-overlay';
  overlay.innerHTML = `
<div class="si-modal">
  <div class="si-modal-header">
    <span class="si-modal-title">${isEdit ? 'Modifier le prospect' : 'Nouveau prospect'}</span>
    <button class="si-modal-close" id="si-m-close">×</button>
  </div>
  <div class="si-modal-body">
    <div id="si-modal-err"></div>
    <div class="si-form-row">
      <div class="si-field">
        <label class="si-label">Entreprise *</label>
        <input class="si-field-input" id="si-f-company" value="${_esc(existing?.company_name || '')}" required>
      </div>
      <div class="si-field">
        <label class="si-label">Secteur</label>
        <input class="si-field-input" id="si-f-sector" value="${_esc(existing?.sector || '')}" placeholder="ex: Manufacture, Santé">
      </div>
    </div>
    <div class="si-form-row">
      <div class="si-field">
        <label class="si-label">Nom du contact</label>
        <input class="si-field-input" id="si-f-contact" value="${_esc(existing?.contact_name || '')}">
      </div>
      <div class="si-field">
        <label class="si-label">Titre</label>
        <input class="si-field-input" id="si-f-title" value="${_esc(existing?.contact_title || '')}" placeholder="ex: Directeur général">
      </div>
    </div>
    <div class="si-form-row">
      <div class="si-field">
        <label class="si-label">Courriel</label>
        <input class="si-field-input" type="email" id="si-f-email" value="${_esc(existing?.contact_email || '')}">
      </div>
      <div class="si-field">
        <label class="si-label">Téléphone</label>
        <input class="si-field-input" id="si-f-phone" value="${_esc(existing?.contact_phone || '')}">
      </div>
    </div>
    <div class="si-form-row">
      <div class="si-field">
        <label class="si-label">Site web</label>
        <input class="si-field-input" id="si-f-web" value="${_esc(existing?.website || '')}" placeholder="https://…">
      </div>
      <div class="si-field">
        <label class="si-label">Budget estimé ($)</label>
        <input class="si-field-input" type="number" id="si-f-budget" value="${existing?.estimated_budget || ''}">
      </div>
    </div>
    ${isEdit ? `<div class="si-field">
      <label class="si-label">Statut</label>
      <select class="si-field-input" id="si-f-status">
        <option value="new" ${existing?.status==='new'?'selected':''}>Nouveau</option>
        <option value="researched" ${existing?.status==='researched'?'selected':''}>Enrichi</option>
        <option value="contacted" ${existing?.status==='contacted'?'selected':''}>Contacté</option>
        <option value="replied" ${existing?.status==='replied'?'selected':''}>Répondu</option>
        <option value="meeting_set" ${existing?.status==='meeting_set'?'selected':''}>RDV fixé</option>
        <option value="proposal_sent" ${existing?.status==='proposal_sent'?'selected':''}>Offre envoyée</option>
        <option value="won" ${existing?.status==='won'?'selected':''}>Gagné</option>
        <option value="lost" ${existing?.status==='lost'?'selected':''}>Perdu</option>
      </select>
    </div>` : ''}
    <div class="si-field">
      <label class="si-label">Notes</label>
      <textarea class="si-field-input" id="si-f-notes" rows="3" style="resize:vertical">${_esc(existing?.notes || '')}</textarea>
    </div>
  </div>
  <div class="si-modal-footer">
    <button class="si-btn si-btn-secondary" id="si-m-cancel">Annuler</button>
    <button class="si-btn si-btn-primary" id="si-m-save">${isEdit ? 'Enregistrer' : 'Créer le prospect'}</button>
  </div>
</div>`;
  document.body.appendChild(overlay);

  const close = () => document.body.removeChild(overlay);
  overlay.querySelector('#si-m-close').addEventListener('click', close);
  overlay.querySelector('#si-m-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#si-m-save').addEventListener('click', async () => {
    const errEl = overlay.querySelector('#si-modal-err');
    errEl.innerHTML = '';
    const company = overlay.querySelector('#si-f-company').value.trim();
    if (!company) { errEl.innerHTML = _errBox('Le nom de l\'entreprise est obligatoire.'); return; }

    const payload = {
      company_name: company,
      sector: overlay.querySelector('#si-f-sector').value.trim() || null,
      contact_name: overlay.querySelector('#si-f-contact').value.trim() || null,
      contact_title: overlay.querySelector('#si-f-title').value.trim() || null,
      contact_email: overlay.querySelector('#si-f-email').value.trim() || null,
      contact_phone: overlay.querySelector('#si-f-phone').value.trim() || null,
      website: overlay.querySelector('#si-f-web').value.trim() || null,
      estimated_budget: parseFloat(overlay.querySelector('#si-f-budget').value) || null,
      notes: overlay.querySelector('#si-f-notes').value.trim() || null,
    };
    if (isEdit) {
      const statusEl = overlay.querySelector('#si-f-status');
      if (statusEl) payload.status = statusEl.value;
    }

    const btn = overlay.querySelector('#si-m-save');
    btn.disabled = true; btn.textContent = '…';
    try {
      if (isEdit) {
        await _api(`/api/si/prospects/${existing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await _api('/api/si/prospects', { method: 'POST', body: JSON.stringify(payload) });
      }
      close();
      _loadProspects(el);
    } catch (e) {
      errEl.innerHTML = _errBox(e.message);
      btn.disabled = false; btn.textContent = isEdit ? 'Enregistrer' : 'Créer le prospect';
    }
  });
}

async function _exportCSV() {
  const p = new URLSearchParams({ sort: _prosFilter.sort, order: _prosFilter.order });
  if (_prosFilter.status) p.set('status', _prosFilter.status);
  if (_prosFilter.search) p.set('search', _prosFilter.search);
  const url = `/api/si/prospects/export/csv?${p}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prospects.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── AGENTS ────────────────────────────────────────────────────────────────────
const AGENT_LABELS = {
  prospector:    { label: 'Prospecteur',        icon: '🔍', color: '#0078D4', desc: 'Identifie automatiquement de nouveaux prospects qualifiés selon vos critères.' },
  research:      { label: 'Recherche',           icon: '📊', color: '#5C2D91', desc: 'Enrichit les profils de prospects avec des données publiques et sectorielles.' },
  qualification: { label: 'Qualification',       icon: '✅', color: '#107C10', desc: 'Évalue l\'adéquation prospect/offre et calcule un score IA de 0 à 100.' },
  sales:         { label: 'Vente',               icon: '💬', color: '#CA5010', desc: 'Engage la conversation, répond aux questions et lève les objections.' },
  followup:      { label: 'Suivi',               icon: '📩', color: '#00BCF2', desc: 'Relance automatiquement les prospects inactifs au bon moment.' },
  meeting:       { label: 'Planification RDV',   icon: '📅', color: '#217346', desc: 'Propose et confirme des créneaux de rencontre avec les prospects qualifiés.' },
  proposal:      { label: 'Propositions',        icon: '📄', color: '#E81123', desc: 'Génère et envoie des propositions commerciales personnalisées.' },
  crm_sync:      { label: 'Synchronisation CRM', icon: '🔄', color: '#00B4D8', desc: 'Synchronise les données prospects avec votre CRM externe.' },
};

async function _viewAgents(el) {
  el.innerHTML = _loader();
  try {
    const agents = await _api('/api/si/agents');

    if (!agents || agents.length === 0) {
      el.innerHTML = _empty('🤖', 'Aucune activité agent — 30 derniers jours',
        'Les agents IA sont activés lors du lancement d\'une campagne. Créez votre première campagne pour démarrer la prospection automatique.',
        `<button class="si-btn si-btn-primary" onclick="document.querySelector('[data-tab=prospects]')?.click()">Voir les prospects</button>`);
      return;
    }

    el.innerHTML = `
<div class="si-sh">
  <span class="si-sh-title">Agents IA — Activité des 30 derniers jours</span>
</div>
<div class="si-three">
  ${agents.map(a => {
    const meta = AGENT_LABELS[a.agent_type] || { label: a.agent_type, icon: '⚙️', color: '#0078D4', desc: '' };
    const rate = a.total_runs > 0 ? Math.round(a.successes / a.total_runs * 100) : 0;
    return `<div class="si-agent-card" style="border-top:3px solid ${_esc(meta.color)}">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:22px">${meta.icon}</span>
        <div>
          <div class="si-agent-name">${_esc(meta.label)}</div>
          <div class="si-agent-sub">${_esc(a.agent_type)}</div>
        </div>
      </div>
      <div style="font-size:11.5px;color:#555;margin-bottom:14px;line-height:1.5">${_esc(meta.desc)}</div>
      <div class="si-agent-stats">
        <div class="si-astat"><div class="si-astat-val">${_num(a.total_runs)}</div><div class="si-astat-lbl">Exécutions</div></div>
        <div class="si-astat"><div class="si-astat-val">${_num(a.successes)}</div><div class="si-astat-lbl">Succès</div></div>
        <div class="si-astat"><div class="si-astat-val">${rate}%</div><div class="si-astat-lbl">Taux</div></div>
      </div>
      <div style="margin-top:10px;font-size:10.5px;color:#757575">
        Durée moy. : ${a.avg_duration_ms != null ? (a.avg_duration_ms/1000).toFixed(1)+'s' : '—'} ·
        Dernier : ${_dt(a.last_run_at)}
        ${a.errors > 0 ? `<br><span style="color:#C50F1F">${a.errors} erreur(s)</span>` : ''}
      </div>
    </div>`;
  }).join('')}
</div>`;
  } catch (e) {
    el.innerHTML = _errBox(e.message);
  }
}

// ── CONVERSATIONS ─────────────────────────────────────────────────────────────
let _convActive = null;

async function _viewConversations(el) {
  el.innerHTML = _loader();
  try {
    const data = await _api('/api/si/conversations?limit=50');
    const convs = data.items || [];

    if (convs.length === 0) {
      el.innerHTML = _empty('💬', 'Aucune conversation', 'Les conversations sont créées lorsqu\'un agent IA contacte un prospect. Ajoutez des prospects et lancez une campagne pour démarrer.');
      return;
    }

    const first = _convActive ? convs.find(c => c.id === _convActive) || convs[0] : convs[0];
    _convActive = first?.id || null;

    el.innerHTML = `
<div class="si-sh">
  <span class="si-sh-title">${_num(data.total)} conversation(s)</span>
</div>
<div class="si-conv-grid">
  <div class="si-conv-list" id="si-conv-list">
    ${convs.map(c => `
    <div class="si-conv-item${c.id === _convActive ? ' active' : ''}" data-cid="${_esc(c.id)}">
      <div class="si-conv-company">${_esc(c.prospect_name || c.company_name || '—')}</div>
      <div class="si-conv-sub">${_esc(c.channel || 'email')} · ${_esc(c.subject || '—')}</div>
      <div class="si-conv-meta">
        ${_statusChip(c.status)}
        <span style="font-size:10px;color:#757575">${_dt(c.updated_at)}</span>
      </div>
    </div>`).join('')}
  </div>
  <div id="si-thread-pane">
    ${first ? '<div class="si-thread-pane"><div class="si-thread-empty">Chargement…</div></div>' : '<div class="si-thread-pane"><div class="si-thread-empty">Sélectionnez une conversation</div></div>'}
  </div>
</div>`;

    if (first) _loadThread(el, first.id);

    el.querySelector('#si-conv-list').addEventListener('click', e => {
      const item = e.target.closest('[data-cid]');
      if (!item) return;
      el.querySelectorAll('.si-conv-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      _convActive = item.dataset.cid;
      _loadThread(el, _convActive);
    });
  } catch (e) {
    el.innerHTML = _errBox(e.message);
  }
}

async function _loadThread(el, id) {
  const pane = el.querySelector('#si-thread-pane');
  pane.innerHTML = '<div class="si-thread-pane"><div class="si-thread-empty">Chargement…</div></div>';
  try {
    const conv = await _api(`/api/si/conversations/${id}`);
    const msgs = conv.messages || [];
    pane.innerHTML = `
<div class="si-thread-pane">
  <div class="si-thread-header">
    <div class="si-thread-title">${_esc(conv.company_name || conv.prospect_name || '—')}</div>
    <div class="si-thread-sub">${_esc(conv.contact_name || '')} · Canal : ${_esc(conv.channel || 'email')} · ${_statusChip(conv.status)}</div>
  </div>
  <div class="si-thread-msgs">
    ${msgs.length === 0
      ? '<div style="text-align:center;padding:24px;color:#757575;font-size:12px">Aucun message dans cette conversation.</div>'
      : msgs.map(m => {
          const isAI = m.role === 'ai' || m.role === 'agent';
          const isHuman = m.role === 'human';
          const cls = isAI ? 'si-msg-ai' : isHuman ? 'si-msg-human' : 'si-msg-prospect';
          const role = isAI ? 'Agent IA' : isHuman ? 'Vous' : 'Prospect';
          return `<div class="si-msg ${cls}">
            <div class="si-msg-role">${_esc(role)}</div>
            ${_esc(m.content || m.body || '')}
            <div class="si-msg-time">${_dt(m.sent_at || m.created_at)}</div>
          </div>`;
        }).join('')}
  </div>
  <div class="si-thread-footer">
    <div style="display:flex;gap:8px">
      <input class="si-input" id="si-reply-input" placeholder="Envoyer un message au prospect…" style="flex:1;font-size:12px">
      <button class="si-btn si-btn-primary si-btn-sm" id="si-reply-send">Envoyer</button>
    </div>
  </div>
</div>`;

    pane.querySelector('#si-reply-send').addEventListener('click', async () => {
      const input = pane.querySelector('#si-reply-input');
      const content = input.value.trim();
      if (!content) return;
      try {
        await _api(`/api/si/conversations/${id}/reply`, { method: 'POST', body: JSON.stringify({ content }) });
        input.value = '';
        _loadThread(el, id);
      } catch (e) { alert(e.message); }
    });
  } catch (e) {
    pane.innerHTML = `<div class="si-thread-pane"><div class="si-thread-empty">${_esc(e.message)}</div></div>`;
  }
}

// ── PIPELINE ──────────────────────────────────────────────────────────────────
async function _viewPipeline(el) {
  el.innerHTML = _loader();
  try {
    const analytics = await _api('/api/si/analytics?period=30');
    const funnel = analytics.funnel_by_status || [];
    const bySector = analytics.by_sector || [];

    const STATUS_ORDER = ['new', 'researched', 'contacted', 'replied', 'meeting_set', 'proposal_sent', 'won', 'lost'];
    const STATUS_LABELS = { new: 'Nouveau', researched: 'Enrichi', contacted: 'Contacté', replied: 'Répondu', meeting_set: 'RDV fixé', proposal_sent: 'Offre envoyée', won: 'Gagné', lost: 'Perdu' };
    const COLORS = ['#00BCF2', '#0078D4', '#CA5010', '#F7A700', '#5C2D91', '#107C10', '#107C10', '#C50F1F'];

    const activeFunnel = funnel.filter(f => f.status !== 'disqualified' && f.status !== 'lost');
    const maxCount = Math.max(1, ...activeFunnel.map(f => f.count));
    const totalPipeline = funnel.reduce((s, f) => s + (f.count || 0), 0);

    if (totalPipeline === 0) {
      el.innerHTML = _empty('📊', 'Pipeline vide', 'Aucun prospect dans le pipeline. Commencez par ajouter des prospects.',
        `<button class="si-btn si-btn-primary" onclick="document.querySelector('[data-tab=prospects]')?.click()">Voir les prospects</button>`);
      return;
    }

    el.innerHTML = `
<div class="si-sh">
  <span class="si-sh-title">Pipeline commercial — ${_num(totalPipeline)} prospects</span>
</div>
<div class="si-card" style="max-width:720px;margin-bottom:24px">
  <div style="display:grid;grid-template-columns:150px 1fr 70px;gap:12px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border,#E0E0E0)">
    <div style="font-size:10px;font-weight:700;color:#757575;text-transform:uppercase;text-align:right">Étape</div>
    <div style="font-size:10px;font-weight:700;color:#757575;text-transform:uppercase">Progression</div>
    <div style="font-size:10px;font-weight:700;color:#757575;text-transform:uppercase;text-align:center">Nb</div>
  </div>
  ${STATUS_ORDER.map((s, i) => {
    const entry = funnel.find(f => f.status === s);
    const count = entry?.count || 0;
    const pct = Math.round(count / maxCount * 100);
    return `<div class="si-funnel-row" style="grid-template-columns:150px 1fr 70px">
      <div class="si-funnel-lbl">${STATUS_LABELS[s] || s}</div>
      <div class="si-funnel-bg"><div class="si-funnel-bar" style="width:${pct}%;background:${COLORS[i]||'#0078D4'}"></div></div>
      <div class="si-funnel-cnt">${count}</div>
    </div>`;
  }).join('')}
</div>

${bySector.length > 0 ? `
<div class="si-sh"><span class="si-sh-title">Prospects par secteur</span></div>
<div class="si-card" style="max-width:480px">
  ${bySector.map(s => `<div class="si-bar-row">
    <div class="si-bar-lbl">${_esc(s.sector)}</div>
    <div class="si-bar-bg"><div class="si-bar-fill" style="width:${Math.round(s.count / Math.max(1,...bySector.map(x=>x.count)) * 100)}%;background:#0078D4"></div></div>
    <div class="si-bar-val">${s.count}</div>
  </div>`).join('')}
</div>` : ''}`;
  } catch (e) {
    el.innerHTML = _errBox(e.message);
  }
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
async function _viewAnalytics(el) {
  el.innerHTML = _loader();
  try {
    const data = await _api('/api/si/analytics?period=30');
    const weekly = data.weekly_conversions || [];
    const bySector = data.by_sector || [];
    const agentPerf = data.agent_performance || [];

    el.innerHTML = `
<div class="si-sh"><span class="si-sh-title">Analytique Sales Intelligence — 30 derniers jours</span></div>
<div class="si-two">
  <div>
    <div class="si-sh"><span class="si-sh-title" style="font-size:12px">Conversions hebdomadaires</span></div>
    <div class="si-card">
      ${weekly.length === 0
        ? '<p style="text-align:center;color:#757575;font-size:12px;padding:16px">Aucune donnée pour la période sélectionnée.</p>'
        : weekly.map(w => {
            const dt = new Date(w.week).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
            const rate = w.total > 0 ? Math.round(w.conversions / w.total * 100) : 0;
            return `<div class="si-bar-row">
              <div class="si-bar-lbl">${dt}</div>
              <div class="si-bar-bg"><div class="si-bar-fill" style="width:${rate}%;background:#107C10"></div></div>
              <div class="si-bar-val">${w.conversions}/${w.total}</div>
            </div>`;
          }).join('')}
    </div>
  </div>
  <div>
    <div class="si-sh"><span class="si-sh-title" style="font-size:12px">Performance des agents</span></div>
    <div class="si-card">
      ${agentPerf.length === 0
        ? '<p style="text-align:center;color:#757575;font-size:12px;padding:16px">Aucune donnée agent disponible.</p>'
        : agentPerf.map(a => {
            const rate = a.total_runs > 0 ? Math.round(a.successes / a.total_runs * 100) : 0;
            const meta = AGENT_LABELS[a.agent_type] || { label: a.agent_type };
            return `<div class="si-bar-row">
              <div class="si-bar-lbl">${_esc(meta.label || a.agent_type)}</div>
              <div class="si-bar-bg"><div class="si-bar-fill" style="width:${rate}%;background:#0078D4"></div></div>
              <div class="si-bar-val">${rate}%</div>
            </div>`;
          }).join('')}
    </div>
  </div>
</div>
${bySector.length > 0 ? `
<div class="si-sh" style="margin-top:20px"><span class="si-sh-title">Score IA moyen par secteur</span></div>
<div class="si-card" style="max-width:480px">
  ${bySector.map(s => `<div class="si-bar-row">
    <div class="si-bar-lbl">${_esc(s.sector)}</div>
    <div class="si-bar-bg"><div class="si-bar-fill" style="width:${Math.min(100, s.avg_score||0)}%;background:#5C2D91"></div></div>
    <div class="si-bar-val">${Math.round(s.avg_score || 0)}</div>
  </div>`).join('')}
</div>` : ''}`;
  } catch (e) {
    el.innerHTML = _errBox(e.message);
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
export default {
  mount(container, ctx) {
    _ctx  = ctx;
    _tab  = 'dashboard';
    _convActive = null;
    _prosPage = 1;
    _prosFilter = { status: '', search: '', sort: 'created_at', order: 'desc' };

    if (!document.getElementById(_CSS_ID)) {
      const s = document.createElement('style');
      s.id = _CSS_ID;
      s.textContent = _CSS;
      document.head.appendChild(s);
    }

    _wrap = document.createElement('div');
    _wrap.className = 'si-wrap';
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
