/**
 * Playbooks — bibliothèque de processus métier multi-étapes.
 * Style : Fluent Design / Microsoft Blue #0078D4
 */

const CSS = `<style>
.pb-root {
  display: flex; flex-direction: column;
  height: calc(100vh - var(--topbar-h, 56px));
  background: #f3f4f6; overflow: hidden;
}

/* ── Header ── */
.pb-header {
  flex-shrink: 0;
  padding: 18px 24px 14px;
  background: #fff; border-bottom: 1px solid #e5e7eb;
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.pb-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: linear-gradient(135deg, #059669, #047857);
  color: #fff; font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 99px;
}
.pb-title { font-size: 16px; font-weight: 700; color: #111827; }
.pb-subtitle { font-size: 12px; color: #6b7280; margin-top: 1px; }

.pb-header-actions { margin-left: auto; display: flex; gap: 8px; }
.pb-btn-primary {
  padding: 8px 16px; border-radius: 6px;
  background: #0078D4; color: #fff; border: none;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s;
}
.pb-btn-primary:hover { background: #106EBE; }
.pb-btn-secondary {
  padding: 7px 14px; border-radius: 6px;
  background: #fff; color: #374151;
  border: 1.5px solid #d1d5db; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all .15s;
}
.pb-btn-secondary:hover { border-color: #0078D4; color: #0078D4; }

/* ── Layout ── */
.pb-body {
  flex: 1; overflow: hidden;
  display: flex; gap: 0;
}

/* ── Sidebar bibliothèque ── */
.pb-sidebar {
  width: 320px; min-width: 280px;
  background: #fff; border-right: 1px solid #e5e7eb;
  display: flex; flex-direction: column; overflow: hidden;
}
.pb-sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex; gap: 6px; align-items: center;
}
.pb-search {
  flex: 1; padding: 6px 10px; border-radius: 6px;
  border: 1.5px solid #d1d5db; font-size: 13px;
  outline: none; background: #f9fafb; color: #111827;
  transition: border-color .15s;
}
.pb-search:focus { border-color: #0078D4; background: #fff; }
.pb-sidebar-list { flex: 1; overflow-y: auto; }

.pb-cat-label {
  padding: 10px 16px 4px;
  font-size: 10px; font-weight: 800; color: #6b7280;
  text-transform: uppercase; letter-spacing: .1em;
}
.pb-item {
  padding: 10px 16px; cursor: pointer;
  border-left: 3px solid transparent;
  display: flex; align-items: flex-start; gap: 10px;
  transition: background .1s;
}
.pb-item:hover { background: #f9fafb; }
.pb-item.active { background: #EFF6FF; border-left-color: #0078D4; }
.pb-item-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }
.pb-item-body { flex: 1; min-width: 0; }
.pb-item-name { font-size: 13px; font-weight: 600; color: #111827; }
.pb-item-meta { font-size: 11px; color: #6b7280; margin-top: 1px; }
.pb-item-chips { display: flex; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
.pb-chip {
  font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 99px;
  text-transform: uppercase; letter-spacing: .04em;
}
.pb-chip.active   { background: #D1FAE5; color: #065F46; }
.pb-chip.inactive { background: #F3F4F6; color: #6B7280; }
.pb-chip-stat     { background: #DBEAFE; color: #1E40AF; }

/* ── Détail ── */
.pb-detail {
  flex: 1; overflow-y: auto;
  padding: 24px;
  background: #f3f4f6;
}
.pb-detail-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100%;
  color: #6b7280; gap: 10px;
}
.pb-detail-empty-icon { font-size: 56px; }
.pb-detail-empty-msg { font-size: 15px; font-weight: 600; }
.pb-detail-empty-sub { font-size: 13px; color: #9ca3af; }

.pb-detail-card {
  background: #fff; border-radius: 10px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  overflow: hidden; margin-bottom: 14px;
}
.pb-detail-card-header {
  padding: 18px 20px 14px;
  border-bottom: 1px solid #f3f4f6;
  display: flex; align-items: flex-start; gap: 14px;
}
.pb-detail-icon { font-size: 36px; }
.pb-detail-info { flex: 1; }
.pb-detail-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px; }
.pb-detail-desc  { font-size: 13px; color: #6b7280; line-height: 1.5; }
.pb-detail-stats {
  display: flex; gap: 20px; margin-top: 10px;
}
.pb-stat { text-align: center; }
.pb-stat-val { font-size: 20px; font-weight: 800; color: #0078D4; }
.pb-stat-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }

.pb-detail-actions { padding: 14px 20px; display: flex; gap: 8px; border-top: 1px solid #f3f4f6; }

/* ── Steps ── */
.pb-steps-title {
  font-size: 12px; font-weight: 800; color: #374151;
  text-transform: uppercase; letter-spacing: .08em;
  padding: 14px 20px 8px; background: #f9fafb;
}
.pb-step {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 20px; border-top: 1px solid #f3f4f6;
}
.pb-step-num {
  width: 24px; height: 24px; border-radius: 50%;
  background: #0078D4; color: #fff;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pb-step.human .pb-step-num { background: #D97706; }
.pb-step.notification .pb-step-num { background: #059669; }
.pb-step-name { font-size: 13px; font-weight: 600; color: #111827; }
.pb-step-type {
  font-size: 10px; color: #6b7280; font-weight: 600;
  text-transform: capitalize; margin-top: 1px;
}
.pb-step-est { margin-left: auto; font-size: 11px; color: #6b7280; flex-shrink: 0; }

/* ── Run en cours ── */
.pb-run-card {
  background: #EFF6FF; border: 1.5px solid #BFDBFE;
  border-radius: 10px; padding: 16px 18px; margin-bottom: 14px;
}
.pb-run-title { font-size: 13px; font-weight: 700; color: #1E40AF; margin-bottom: 10px; }
.pb-run-step {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 0; font-size: 12px; color: #374151;
}
.pb-run-step-icon { width: 18px; text-align: center; flex-shrink: 0; }
.pb-run-step.done   { color: #059669; }
.pb-run-step.active { color: #1E40AF; font-weight: 700; }
.pb-run-step.pending { color: #9CA3AF; }
.pb-run-step.waiting { color: #D97706; font-weight: 700; }

/* ── Loading ── */
.pb-loading { display: flex; align-items: center; justify-content: center; height: 100%; gap: 10px; color: #6b7280; font-size: 14px; }
.pb-spinner { width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #0078D4; border-radius: 50%; animation: pbspin .7s linear infinite; }
@keyframes pbspin { to { transform: rotate(360deg); } }

/* ── Toast ── */
.pb-toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: #1f2937; color: #fff; padding: 10px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 600; z-index: 9999;
  opacity: 0; transition: opacity .3s; pointer-events: none;
}
.pb-toast.show { opacity: 1; }
.pb-toast.success { background: #059669; }
.pb-toast.error   { background: #DC2626; }
</style>`;

const CAT_LABELS = {
  hr: 'RH', security: 'Sécurité', compliance: 'Conformité',
  it: 'TI', finance: 'Finances', operations: 'Opérations', general: 'Général',
};

const STEP_TYPE_LABELS = {
  automation: 'Orchestration automatique',
  human_approval: 'Approbation humaine',
  human_task: 'Tâche humaine',
  condition: 'Condition',
  parallel: 'Étapes parallèles',
  notification: 'Notification',
  sub_playbook: 'Sous-playbook',
  wait: 'Attente planifiée',
};

const STEP_TYPE_COLOR = {
  automation: '', human_approval: 'human', human_task: 'human',
  notification: 'notification',
};

let _state = { playbooks: [], activeId: null, activeRun: null, loading: true };
let _container = null;
let _token = null;

function _est_label(s) {
  if (!s.est_seconds) return '';
  const sec = s.est_seconds;
  return sec >= 60 ? `~${Math.round(sec / 60)} min` : `~${sec} s`;
}

function _steps_html(steps) {
  if (!steps || !steps.length) return '<div style="padding:16px 20px;color:#6b7280;font-size:13px;">Aucune étape définie.</div>';
  return steps.map(s => {
    const typeClass = STEP_TYPE_COLOR[s.type] || '';
    const est = _est_label(s);
    return `
    <div class="pb-step ${typeClass}">
      <div class="pb-step-num">${s.index}</div>
      <div style="flex:1;">
        <div class="pb-step-name">${s.name}</div>
        <div class="pb-step-type">${STEP_TYPE_LABELS[s.type] || s.type}${s.connector ? ` · ${s.connector}` : ''}${s.timeout_minutes ? ` · Timeout ${s.timeout_minutes} min` : ''}</div>
      </div>
      ${est ? `<div class="pb-step-est">${est}</div>` : ''}
    </div>`;
  }).join('');
}

function _active_pb() {
  return _state.playbooks.find(p => p.id === _state.activeId) || null;
}

function _run_step_icon(status) {
  const icons = { completed: '✅', running: '⏳', waiting: '⏸️', failed: '❌', skipped: '⏭️', pending: '○' };
  return icons[status] || '○';
}

function _detail_html(pb, run) {
  if (!pb) return `
    <div class="pb-detail-empty">
      <div class="pb-detail-empty-icon">📋</div>
      <div class="pb-detail-empty-msg">Sélectionnez un Playbook</div>
      <div class="pb-detail-empty-sub">Choisissez un processus dans la bibliothèque.</div>
    </div>`;

  const steps = pb.steps || [];
  const totalEst = steps.reduce((a, s) => a + (s.est_seconds || 0), 0);
  const estLabel = totalEst >= 60 ? `${Math.round(totalEst / 60)} min` : `${totalEst} s`;
  const successRate = pb.run_count > 0 ? Math.round((pb.success_count / pb.run_count) * 100) : 100;

  const runHtml = run ? `
    <div class="pb-run-card">
      <div class="pb-run-title">⚡ Exécution en cours — Étape ${(run.current_step || 0) + 1} / ${run.total_steps || steps.length}</div>
      ${(run.step_runs || []).map(s => `
        <div class="pb-run-step ${s.status === 'completed' ? 'done' : s.status === 'running' ? 'active' : s.status === 'waiting' ? 'waiting' : 'pending'}">
          <span class="pb-run-step-icon">${_run_step_icon(s.status)}</span>
          ${s.step_name}
          ${s.status === 'waiting' ? '<span style="margin-left:auto;font-size:10px;">En attente d\'approbation</span>' : ''}
        </div>`).join('')}
    </div>` : '';

  return `
    ${runHtml}
    <div class="pb-detail-card">
      <div class="pb-detail-card-header">
        <div class="pb-detail-icon">${pb.icon || '📋'}</div>
        <div class="pb-detail-info">
          <div class="pb-detail-title">${pb.name}</div>
          <div class="pb-detail-desc">${pb.description || ''}</div>
          <div class="pb-detail-stats">
            <div class="pb-stat"><div class="pb-stat-val">${steps.length}</div><div class="pb-stat-label">Étapes</div></div>
            <div class="pb-stat"><div class="pb-stat-val">${estLabel}</div><div class="pb-stat-label">Durée est.</div></div>
            <div class="pb-stat"><div class="pb-stat-val">${pb.run_count || 0}</div><div class="pb-stat-label">Exécutions</div></div>
            <div class="pb-stat"><div class="pb-stat-val" style="color:#059669">${successRate} %</div><div class="pb-stat-label">Succès</div></div>
          </div>
        </div>
      </div>
      <div class="pb-detail-actions">
        <button class="pb-btn-primary" id="pb-run-btn">▶ Exécuter maintenant</button>
        <button class="pb-btn-secondary" id="pb-history-btn">Historique</button>
      </div>
      <div class="pb-steps-title">Étapes du Playbook</div>
      ${_steps_html(steps)}
    </div>`;
}

function _sidebar_html(playbooks, search = '') {
  const filtered = search
    ? playbooks.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : playbooks;

  const groups = {};
  for (const p of filtered) {
    const cat = p.category || 'general';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  }

  return Object.entries(groups).map(([cat, pbs]) => `
    <div class="pb-cat-label">${CAT_LABELS[cat] || cat}</div>
    ${pbs.map(p => `
      <div class="pb-item${p.id === _state.activeId ? ' active' : ''}" data-id="${p.id}">
        <div class="pb-item-icon">${p.icon || '📋'}</div>
        <div class="pb-item-body">
          <div class="pb-item-name">${p.name}</div>
          <div class="pb-item-meta">${(p.steps || []).length} étapes${p.sla_minutes ? ` · SLA ${p.sla_minutes} min` : ''}</div>
          <div class="pb-item-chips">
            <span class="pb-chip ${p.status}">${p.status === 'active' ? 'Actif' : p.status}</span>
            ${p.run_count > 0 ? `<span class="pb-chip pb-chip-stat">${p.run_count} runs</span>` : ''}
          </div>
        </div>
      </div>`).join('')}
  `).join('');
}

function _render(container) {
  if (!container) return;
  const listEl   = container.querySelector('.pb-sidebar-list');
  const detailEl = container.querySelector('.pb-detail');
  if (!listEl || !detailEl) return;

  listEl.innerHTML = _state.loading
    ? `<div class="pb-loading"><div class="pb-spinner"></div>Chargement…</div>`
    : _sidebar_html(_state.playbooks);

  detailEl.innerHTML = _detail_html(_active_pb(), _state.activeRun);

  if (!_state.loading) {
    listEl.querySelectorAll('.pb-item').forEach(item => {
      item.addEventListener('click', () => {
        _state.activeId  = item.dataset.id;
        _state.activeRun = null;
        _render(container);
      });
    });
  }

  const runBtn = container.querySelector('#pb-run-btn');
  if (runBtn) {
    runBtn.addEventListener('click', () => _run(container));
  }
  const histBtn = container.querySelector('#pb-history-btn');
  if (histBtn) {
    histBtn.addEventListener('click', () => _showHistory(container));
  }
}

async function _run(container) {
  const pb = _active_pb();
  if (!pb) return;
  const btn = container.querySelector('#pb-run-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Démarrage…'; }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const res = await fetch(`/api/playbooks/${pb.id}/run`, {
      method: 'POST', credentials: 'include',
      headers, body: JSON.stringify({ context: {}, trigger_type: 'manual' }),
    });
    if (res.ok) {
      const data = await res.json();
      _toast('Playbook démarré — suivi en cours.', 'success', container);
      // Simuler un run pour la démo
      _state.activeRun = {
        id: data.run_id,
        current_step: 0,
        total_steps: pb.steps?.length || 0,
        step_runs: (pb.steps || []).map((s, i) => ({
          step_index: i,
          step_name: s.name,
          status: i === 0 ? 'running' : 'pending',
        })),
      };
      _render(container);
      // Simulation avancement
      _simulateRun(container, data.run_id);
    } else {
      const err = await res.json();
      _toast(err.detail || 'Erreur lors du démarrage.', 'error', container);
      if (btn) { btn.disabled = false; btn.textContent = '▶ Exécuter maintenant'; }
    }
  } catch {
    // Mode démo sans backend
    _state.activeRun = {
      id: 'demo-run',
      current_step: 0,
      total_steps: pb.steps?.length || 0,
      step_runs: (pb.steps || []).map((s, i) => ({
        step_index: i,
        step_name: s.name,
        status: i === 0 ? 'running' : 'pending',
      })),
    };
    _render(container);
    _simulateRun(container, 'demo');
    _toast('Démo : simulation d\'exécution.', 'success', container);
  }
}

function _simulateRun(container, runId) {
  let step = 0;
  const pb = _active_pb();
  if (!pb) return;
  const steps = pb.steps || [];

  const advance = () => {
    if (!_state.activeRun || _state.activeId !== pb.id) return;
    if (step >= steps.length) {
      _state.activeRun = null;
      const pbIdx = _state.playbooks.findIndex(p => p.id === pb.id);
      if (pbIdx >= 0) {
        _state.playbooks[pbIdx].run_count = (_state.playbooks[pbIdx].run_count || 0) + 1;
        _state.playbooks[pbIdx].success_count = (_state.playbooks[pbIdx].success_count || 0) + 1;
      }
      _render(container);
      _toast('Playbook complété avec succès !', 'success', container);
      return;
    }
    if (_state.activeRun) {
      _state.activeRun.step_runs[step].status = 'completed';
      _state.activeRun.current_step = step + 1;
      if (step + 1 < steps.length) _state.activeRun.step_runs[step + 1].status = 'running';
    }
    _render(container);
    step++;
    const delay = steps[step - 1]?.type === 'human_approval' ? 2000 : 800;
    setTimeout(advance, delay);
  };
  setTimeout(advance, 600);
}

async function _showHistory(container) {
  const pb = _active_pb();
  if (!pb) return;
  _toast('Historique des exécutions : fonctionnalité complète disponible prochainement.', 'info', container);
}

function _toast(msg, type = 'info', container) {
  const el = container?.querySelector('.pb-toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `pb-toast ${type}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

async function _load(container) {
  try {
    const headers = {};
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const res = await fetch('/api/playbooks?status=active,draft', { credentials: 'include', headers });
    if (res.ok) {
      _state.playbooks = (await res.json()).playbooks || [];
    } else {
      _state.playbooks = _demoData();
    }
  } catch {
    _state.playbooks = _demoData();
  }
  _state.loading = false;
  if (_state.playbooks.length > 0) _state.activeId = _state.playbooks[0].id;
  _render(container);
}

function _demoData() {
  return [
    {
      id: 'pb-demo-1', name: 'Onboarding Employé', description: 'Intégration complète d\'un nouvel employé.',
      category: 'hr', icon: '👤', status: 'active', sla_minutes: 240, run_count: 47, success_count: 46,
      steps: [
        {index:1,type:'automation',name:'Créer compte Entra ID',connector:'microsoft_graph',est_seconds:8},
        {index:2,type:'automation',name:'Créer Exchange + Licence E3',connector:'exchange',est_seconds:12},
        {index:3,type:'automation',name:'Ajouter aux groupes M365',connector:'microsoft_graph',est_seconds:5},
        {index:4,type:'human_approval',name:'Validation manager',timeout_minutes:120},
        {index:5,type:'automation',name:'Créer Teams + canaux',connector:'teams',est_seconds:4},
        {index:6,type:'automation',name:'Créer ticket Jira',connector:'jira',est_seconds:3},
        {index:7,type:'automation',name:'Créer incident ServiceNow',connector:'servicenow',est_seconds:3},
        {index:8,type:'notification',name:'Envoyer courriel de bienvenue',connector:'email',est_seconds:1},
        {index:9,type:'human_task',name:'RH confirme remise des accès'},
        {index:10,type:'automation',name:'Générer rapport d\'audit',connector:'internal',est_seconds:5},
      ],
    },
    {
      id: 'pb-demo-2', name: 'Offboarding Sécurisé', description: 'Désactivation sécurisée lors d\'un départ.',
      category: 'hr', icon: '🚪', status: 'active', sla_minutes: 120, run_count: 12, success_count: 12,
      steps: [
        {index:1,type:'automation',name:'Désactiver compte Entra ID',connector:'microsoft_graph',est_seconds:5},
        {index:2,type:'automation',name:'Révoquer toutes les sessions',connector:'microsoft_graph',est_seconds:3},
        {index:3,type:'automation',name:'Retirer des groupes M365',connector:'microsoft_graph',est_seconds:4},
        {index:4,type:'automation',name:'Archiver boîte Exchange',connector:'exchange',est_seconds:8},
        {index:5,type:'human_approval',name:'Validation RH — accès révoqués',timeout_minutes:60},
        {index:6,type:'automation',name:'Libérer la licence M365',connector:'microsoft_graph',est_seconds:3},
        {index:7,type:'automation',name:'Clôturer tickets Jira',connector:'jira',est_seconds:5},
        {index:8,type:'automation',name:'Générer rapport audit offboarding',connector:'internal',est_seconds:5},
      ],
    },
    {
      id: 'pb-demo-3', name: 'Réponse Incident Sécurité', description: 'Réponse rapide en cas d\'incident de sécurité.',
      category: 'security', icon: '🔐', status: 'active', sla_minutes: 60, run_count: 3, success_count: 3,
      steps: [
        {index:1,type:'notification',name:'Alerter RSSI et Direction',connector:'teams',est_seconds:2},
        {index:2,type:'automation',name:'Isoler le compte compromis',connector:'microsoft_graph',est_seconds:3},
        {index:3,type:'automation',name:'Révoquer toutes les sessions',connector:'microsoft_graph',est_seconds:3},
        {index:4,type:'automation',name:'Forcer réinitialisation MFA',connector:'microsoft_graph',est_seconds:5},
        {index:5,type:'human_approval',name:'RSSI confirme l\'isolation',timeout_minutes:15},
        {index:6,type:'automation',name:'Créer incident ServiceNow P1',connector:'servicenow',est_seconds:5},
      ],
    },
    {
      id: 'pb-demo-4', name: 'Audit Loi 25 Mensuel', description: 'Vérification mensuelle de la conformité Loi 25.',
      category: 'compliance', icon: '⚖️', status: 'active', sla_minutes: null, run_count: 6, success_count: 5,
      steps: [
        {index:1,type:'automation',name:'Collecter données RHP',connector:'internal',est_seconds:10},
        {index:2,type:'automation',name:'Vérifier droits individus',connector:'internal',est_seconds:8},
        {index:3,type:'automation',name:'Générer rapport conformité',connector:'python',est_seconds:15},
        {index:4,type:'human_approval',name:'RPRP valide le rapport'},
        {index:5,type:'automation',name:'Archiver rapport signé',connector:'sharepoint',est_seconds:3},
      ],
    },
  ];
}

export default {
  mount(container, ctx) {
    _container = container;
    _token = localStorage.getItem('nexhire_token');
    _state = { playbooks: [], activeId: null, activeRun: null, loading: true };

    container.innerHTML = CSS + `
      <div class="pb-root">
        <div class="pb-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="pb-badge">📋 Processus</span>
            <div>
              <div class="pb-title">Playbooks</div>
              <div class="pb-subtitle">Bibliothèque de processus métier multi-étapes</div>
            </div>
          </div>
          <div class="pb-header-actions">
            <button class="pb-btn-secondary" id="pb-new-btn">+ Nouveau Playbook</button>
          </div>
        </div>
        <div class="pb-body">
          <div class="pb-sidebar">
            <div class="pb-sidebar-header">
              <input class="pb-search" placeholder="Rechercher un playbook…" id="pb-search" />
            </div>
            <div class="pb-sidebar-list">
              <div class="pb-loading"><div class="pb-spinner"></div>Chargement…</div>
            </div>
          </div>
          <div class="pb-detail">
            <div class="pb-detail-empty">
              <div class="pb-detail-empty-icon">📋</div>
              <div class="pb-detail-empty-msg">Chargement…</div>
            </div>
          </div>
        </div>
        <div class="pb-toast"></div>
      </div>`;

    container.querySelector('#pb-search')?.addEventListener('input', (e) => {
      const listEl = container.querySelector('.pb-sidebar-list');
      if (listEl) listEl.innerHTML = _sidebar_html(_state.playbooks, e.target.value);
      listEl?.querySelectorAll('.pb-item').forEach(item => {
        item.addEventListener('click', () => {
          _state.activeId = item.dataset.id; _state.activeRun = null; _render(container);
        });
      });
    });

    container.querySelector('#pb-new-btn')?.addEventListener('click', () => {
      _toast('Créateur de Playbook disponible prochainement.', 'info', container);
    });

    _load(container);
  },

  unmount(container) {
    _container = null;
    _state.activeRun = null;
  },
};
