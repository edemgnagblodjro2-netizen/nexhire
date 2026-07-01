/**
 * Initiatives — programmes stratégiques multi-modules (ISO 27001, Loi 25, etc.)
 * Style : Fluent Design / Microsoft Blue #0078D4
 */

const CSS = `<style>
.ini-root {
  display: flex; flex-direction: column;
  height: calc(100vh - var(--topbar-h, 56px));
  background: #f3f4f6; overflow: hidden;
}

/* ── Header ── */
.ini-header {
  flex-shrink: 0;
  padding: 18px 24px 14px;
  background: #fff; border-bottom: 1px solid #e5e7eb;
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.ini-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: linear-gradient(135deg, #0078D4, #0057A0);
  color: #fff; font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 99px;
}
.ini-title { font-size: 16px; font-weight: 700; color: #111827; }
.ini-subtitle { font-size: 12px; color: #6b7280; margin-top: 1px; }
.ini-header-actions { margin-left: auto; display: flex; gap: 8px; }
.ini-btn-primary {
  padding: 8px 16px; border-radius: 6px;
  background: #0078D4; color: #fff; border: none;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s;
}
.ini-btn-primary:hover { background: #106EBE; }
.ini-btn-secondary {
  padding: 7px 14px; border-radius: 6px;
  background: #fff; color: #374151;
  border: 1.5px solid #d1d5db; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all .15s;
}
.ini-btn-secondary:hover { border-color: #0078D4; color: #0078D4; }

/* ── Body ── */
.ini-body {
  flex: 1; overflow-y: auto;
  padding: 20px 24px;
  display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  align-content: start;
}

/* ── Carte Initiative ── */
.ini-card {
  background: #fff; border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  overflow: hidden; transition: box-shadow .2s, border-color .2s;
  cursor: pointer;
}
.ini-card:hover { box-shadow: 0 6px 24px rgba(0,120,212,.12); border-color: #93c5fd; }

.ini-card-header {
  padding: 18px 18px 12px;
  display: flex; align-items: flex-start; gap: 12px;
}
.ini-icon { font-size: 32px; flex-shrink: 0; }
.ini-info { flex: 1; min-width: 0; }
.ini-name { font-size: 15px; font-weight: 700; color: #111827; }
.ini-desc { font-size: 12px; color: #6b7280; margin-top: 3px; line-height: 1.4; }
.ini-status-chip {
  flex-shrink: 0;
  font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 99px;
  text-transform: uppercase; letter-spacing: .06em;
}
.ini-status-chip.active    { background: #D1FAE5; color: #065F46; }
.ini-status-chip.draft     { background: #F3F4F6; color: #6B7280; }
.ini-status-chip.paused    { background: #FEF3C7; color: #92400E; }
.ini-status-chip.completed { background: #DBEAFE; color: #1E40AF; }

/* ── Barre de progression ── */
.ini-progress-wrap { padding: 0 18px 14px; }
.ini-progress-label {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 5px;
}
.ini-progress-label-left { font-size: 11px; color: #6b7280; font-weight: 600; }
.ini-progress-label-right {
  font-size: 14px; font-weight: 800;
  color: #0078D4;
}
.ini-progress-bar {
  height: 8px; background: #e5e7eb; border-radius: 99px; overflow: hidden;
}
.ini-progress-fill {
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #0078D4, #00BCF2);
  transition: width .8s ease;
}
.ini-progress-fill.good { background: linear-gradient(90deg, #059669, #10B981); }
.ini-progress-fill.warn { background: linear-gradient(90deg, #D97706, #F59E0B); }

/* ── Métriques ── */
.ini-metrics {
  padding: 12px 18px;
  display: flex; gap: 0;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
}
.ini-metric {
  flex: 1; text-align: center;
  padding: 4px 0;
  border-right: 1px solid #e5e7eb;
}
.ini-metric:last-child { border-right: none; }
.ini-metric-val { font-size: 16px; font-weight: 800; color: #0078D4; }
.ini-metric-label { font-size: 9px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; margin-top: 1px; }

/* ── Footer ── */
.ini-card-footer {
  padding: 10px 18px;
  display: flex; align-items: center; gap: 8px;
  border-top: 1px solid #f3f4f6;
}
.ini-footer-meta { font-size: 11px; color: #6b7280; flex: 1; }
.ini-btn-sm {
  padding: 5px 12px; border-radius: 5px;
  background: #0078D4; color: #fff; border: none;
  font-size: 11px; font-weight: 600; cursor: pointer;
  transition: background .15s;
}
.ini-btn-sm:hover { background: #106EBE; }

/* ── Dialog nouvelle initiative ── */
.ini-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000; padding: 20px;
}
.ini-modal {
  background: #fff; border-radius: 12px; max-width: 560px; width: 100%;
  max-height: 90vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}
.ini-modal-header {
  padding: 18px 20px 12px;
  border-bottom: 1px solid #e5e7eb;
  display: flex; align-items: center; justify-content: space-between;
}
.ini-modal-title { font-size: 15px; font-weight: 700; color: #111827; }
.ini-modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280; }
.ini-modal-body { padding: 18px 20px; }
.ini-templates {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;
}
.ini-tpl {
  border: 1.5px solid #e5e7eb; border-radius: 8px;
  padding: 12px; cursor: pointer; text-align: center;
  transition: all .15s;
}
.ini-tpl:hover { border-color: #0078D4; background: #EFF6FF; }
.ini-tpl.selected { border-color: #0078D4; background: #EFF6FF; }
.ini-tpl-icon { font-size: 24px; margin-bottom: 4px; }
.ini-tpl-name { font-size: 12px; font-weight: 700; color: #111827; }
.ini-tpl-dur { font-size: 10px; color: #6b7280; }
.ini-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #e5e7eb;
  display: flex; gap: 8px; justify-content: flex-end;
}

/* ── Vide ── */
.ini-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280; }
.ini-empty-icon { font-size: 56px; margin-bottom: 14px; }
.ini-empty-msg { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
.ini-empty-sub { font-size: 13px; color: #9ca3af; }

/* ── Loading ── */
.ini-loading { display: flex; align-items: center; justify-content: center; height: 100%; gap: 10px; color: #6b7280; }
.ini-spinner { width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: #0078D4; border-radius: 50%; animation: inispin .7s linear infinite; }
@keyframes inispin { to { transform: rotate(360deg); } }

/* ── Toast ── */
.ini-toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: #1f2937; color: #fff; padding: 10px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 600; z-index: 9999;
  opacity: 0; transition: opacity .3s; pointer-events: none;
}
.ini-toast.show { opacity: 1; }
.ini-toast.success { background: #059669; }
.ini-toast.error { background: #DC2626; }
</style>`;

const TEMPLATES = [
  {id:'iso27001',name:'Certification ISO 27001',icon:'🏆',category:'certification',duration:'90 jours',decisions:25,playbooks:18},
  {id:'loi25',name:'Conformité Loi 25',icon:'⚖️',category:'compliance',duration:'60 jours',decisions:12,playbooks:8},
  {id:'iso42001',name:'Certification ISO 42001',icon:'🤖',category:'certification',duration:'120 jours',decisions:15,playbooks:10},
  {id:'m365_migration',name:'Migration Microsoft 365',icon:'🔷',category:'migration',duration:'45 jours',decisions:8,playbooks:6},
  {id:'ai_adoption',name:'Adoption IA',icon:'✨',category:'ai_adoption',duration:'90 jours',decisions:10,playbooks:5},
  {id:'cost_reduction',name:'Réduction coûts TI',icon:'💰',category:'cost_reduction',duration:'60 jours',decisions:15,playbooks:7},
  {id:'cybersecurity',name:'Programme Cybersécurité',icon:'🛡️',category:'security',duration:'120 jours',decisions:20,playbooks:12},
  {id:'merger',name:'Fusion / Intégration SI',icon:'🤝',category:'transformation',duration:'180 jours',decisions:30,playbooks:20},
];

const STATUS_LABELS = {active:'Active',draft:'Brouillon',paused:'En pause',completed:'Terminée',cancelled:'Annulée'};
const fmt_currency = val => val ? new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(val) : '—';

let _state = { initiatives: [], loading: true };
let _container = null;
let _token = null;

function _progress_pct(init) {
  const total = init.total_decisions || 0;
  const done  = init.done_decisions || 0;
  return total > 0 ? Math.round((done / total) * 100) : (init.current_score || 0);
}

function _progress_color(pct) {
  if (pct >= 80) return 'good';
  if (pct >= 50) return '';
  return 'warn';
}

function _card_html(init) {
  const pct    = _progress_pct(init);
  const color  = _progress_color(pct);
  const status = init.status || 'draft';

  const deadline = init.deadline
    ? `Échéance : ${new Date(init.deadline).toLocaleDateString('fr-CA', {day:'numeric',month:'long',year:'numeric'})}`
    : (init.responsible_name ? `Responsable : ${init.responsible_name}` : '');

  const scoreLabel = init.target_score
    ? `Score : ${init.current_score || 0} % → Cible ${init.target_score} %`
    : `Progression : ${pct} %`;

  return `
  <div class="ini-card" data-id="${init.id}">
    <div class="ini-card-header">
      <div class="ini-icon">${init.icon || '🎯'}</div>
      <div class="ini-info">
        <div class="ini-name">${init.name}</div>
        ${init.description ? `<div class="ini-desc">${init.description}</div>` : ''}
      </div>
      <span class="ini-status-chip ${status}">${STATUS_LABELS[status] || status}</span>
    </div>
    <div class="ini-progress-wrap">
      <div class="ini-progress-label">
        <span class="ini-progress-label-left">${scoreLabel}</span>
        <span class="ini-progress-label-right">${pct} %</span>
      </div>
      <div class="ini-progress-bar">
        <div class="ini-progress-fill ${color}" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="ini-metrics">
      <div class="ini-metric">
        <div class="ini-metric-val">${init.total_decisions || 0}</div>
        <div class="ini-metric-label">Décisions</div>
      </div>
      <div class="ini-metric">
        <div class="ini-metric-val">${init.total_playbooks || 0}</div>
        <div class="ini-metric-label">Playbooks</div>
      </div>
      <div class="ini-metric">
        <div class="ini-metric-val">${(init.policy_ids || []).length}</div>
        <div class="ini-metric-label">Politiques</div>
      </div>
      ${init.budget_estimate ? `
      <div class="ini-metric">
        <div class="ini-metric-val" style="font-size:12px">${fmt_currency(init.budget_estimate)}</div>
        <div class="ini-metric-label">Budget</div>
      </div>` : ''}
    </div>
    <div class="ini-card-footer">
      <div class="ini-footer-meta">${deadline}</div>
      <button class="ini-btn-sm" data-view="${init.id}">Ouvrir →</button>
    </div>
  </div>`;
}

function _render(container) {
  const bodyEl = container.querySelector('.ini-body');
  if (!bodyEl) return;

  if (_state.loading) {
    bodyEl.innerHTML = `<div class="ini-loading" style="grid-column:1/-1"><div class="ini-spinner"></div>Chargement…</div>`;
    return;
  }
  if (!_state.initiatives.length) {
    bodyEl.innerHTML = `<div class="ini-empty" style="grid-column:1/-1"><div class="ini-empty-icon">🚀</div><div class="ini-empty-msg">Aucune initiative en cours</div><div class="ini-empty-sub">Créez votre première initiative stratégique.</div></div>`;
    return;
  }

  bodyEl.innerHTML = _state.initiatives.map(_card_html).join('');

  bodyEl.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _toast('Détail de l\'initiative disponible prochainement.', 'info', container);
    });
  });
}

function _open_create(container) {
  let selectedTpl = null;
  const overlay = document.createElement('div');
  overlay.className = 'ini-modal-overlay';
  overlay.innerHTML = `
    <div class="ini-modal">
      <div class="ini-modal-header">
        <div class="ini-modal-title">Nouvelle Initiative</div>
        <button class="ini-modal-close" id="ini-modal-close">×</button>
      </div>
      <div class="ini-modal-body">
        <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Choisissez un modèle</div>
        <div class="ini-templates">
          ${TEMPLATES.map(t => `
          <div class="ini-tpl" data-tpl="${t.id}">
            <div class="ini-tpl-icon">${t.icon}</div>
            <div class="ini-tpl-name">${t.name}</div>
            <div class="ini-tpl-dur">${t.duration} · ${t.decisions} décisions</div>
          </div>`).join('')}
        </div>
        <div style="margin-top:12px;">
          <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Nom de l'initiative</label>
          <input id="ini-name-input" style="width:100%;padding:8px 10px;border:1.5px solid #d1d5db;border-radius:6px;font-size:13px;outline:none;" placeholder="Ex: Certification ISO 27001 Q4 2026" />
        </div>
      </div>
      <div class="ini-modal-footer">
        <button class="ini-btn-secondary" id="ini-modal-cancel">Annuler</button>
        <button class="ini-btn-primary" id="ini-modal-create">Créer l'initiative</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector('#ini-modal-close')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#ini-modal-cancel')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelectorAll('.ini-tpl').forEach(tpl => {
    tpl.addEventListener('click', () => {
      overlay.querySelectorAll('.ini-tpl').forEach(t => t.classList.remove('selected'));
      tpl.classList.add('selected');
      selectedTpl = TEMPLATES.find(t => t.id === tpl.dataset.tpl);
      const nameInput = overlay.querySelector('#ini-name-input');
      if (nameInput && selectedTpl && !nameInput.value) nameInput.value = selectedTpl.name;
    });
  });

  overlay.querySelector('#ini-modal-create')?.addEventListener('click', async () => {
    const nameInput = overlay.querySelector('#ini-name-input');
    const name = nameInput?.value?.trim();
    if (!name) { nameInput?.focus(); return; }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (_token) headers['Authorization'] = `Bearer ${_token}`;
      const res = await fetch('/api/initiatives', {
        method: 'POST', credentials: 'include',
        headers,
        body: JSON.stringify({
          name,
          icon: selectedTpl?.icon || '🎯',
          category: selectedTpl?.category || 'general',
          template_id: selectedTpl?.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        overlay.remove();
        // Ajouter localement
        _state.initiatives.unshift({
          id: data.id, name, icon: selectedTpl?.icon || '🎯',
          status: 'active', category: selectedTpl?.category || 'general',
          total_decisions: selectedTpl?.decisions || 0,
          total_playbooks: selectedTpl?.playbooks || 0,
          done_decisions: 0, done_playbooks: 0,
          current_score: 0, target_score: selectedTpl ? 85 : null,
        });
        _render(container);
        _toast(`Initiative « ${name} » créée.`, 'success', container);
      } else {
        const err = await res.json();
        _toast(err.detail || 'Erreur.', 'error', container);
      }
    } catch {
      // Démo
      overlay.remove();
      _state.initiatives.unshift({
        id: `demo-${Date.now()}`, name, icon: selectedTpl?.icon || '🎯',
        status: 'active', category: selectedTpl?.category || 'general',
        total_decisions: selectedTpl?.decisions || 0,
        total_playbooks: selectedTpl?.playbooks || 0,
        done_decisions: 0, done_playbooks: 0,
        current_score: 0, target_score: selectedTpl ? 85 : null,
      });
      _render(container);
      _toast(`Initiative « ${name} » créée (démo).`, 'success', container);
    }
  });
}

function _toast(msg, type = 'info', container) {
  const el = container?.querySelector('.ini-toast');
  if (!el) return;
  el.textContent = msg; el.className = `ini-toast ${type}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

async function _load(container) {
  try {
    const headers = {};
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const res = await fetch('/api/initiatives?status=active,draft,paused', { credentials: 'include', headers });
    if (res.ok) _state.initiatives = (await res.json()).initiatives || [];
    else _state.initiatives = _demoData();
  } catch { _state.initiatives = _demoData(); }
  _state.loading = false;
  _render(container);
}

function _demoData() {
  return [
    {
      id:'i1',name:'Certification ISO 27001',icon:'🏆',category:'certification',
      status:'active',description:'Atteindre la certification ISO 27001 d\'ici Q4 2026.',
      target_score:90,current_score:58,budget_estimate:12000,
      total_decisions:5,done_decisions:1,total_playbooks:3,done_playbooks:1,
      policy_ids:['p1','p2'],deadline:'2026-12-31',
    },
    {
      id:'i2',name:'Programme Conformité Loi 25',icon:'⚖️',category:'compliance',
      status:'active',description:'Conformité complète à la Loi 25 avant les audits de la CAI.',
      target_score:95,current_score:82,budget_estimate:8000,
      total_decisions:3,done_decisions:2,total_playbooks:2,done_playbooks:2,
      policy_ids:['p3'],deadline:'2026-09-30',
    },
    {
      id:'i3',name:'Adoption IA — Accélérateur CCI3R',icon:'🤖',category:'ai_adoption',
      status:'active',description:'Programme d\'adoption IA pour les PME membres du programme.',
      target_score:85,current_score:52,budget_estimate:15000,
      total_decisions:3,done_decisions:0,total_playbooks:2,done_playbooks:0,
      policy_ids:[],deadline:'2026-10-31',
    },
  ];
}

export default {
  mount(container, ctx) {
    _container = container;
    _token = localStorage.getItem('nexhire_token');
    _state = { initiatives: [], loading: true };

    container.innerHTML = CSS + `
      <div class="ini-root">
        <div class="ini-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="ini-badge">🚀 Stratégie</span>
            <div>
              <div class="ini-title">Initiatives</div>
              <div class="ini-subtitle">Programmes stratégiques — ISO 27001 · Loi 25 · Migration · Adoption IA</div>
            </div>
          </div>
          <div class="ini-header-actions">
            <button class="ini-btn-secondary" id="ini-templates-btn">Bibliothèque de modèles</button>
            <button class="ini-btn-primary" id="ini-new-btn">+ Nouvelle initiative</button>
          </div>
        </div>
        <div class="ini-body">
          <div class="ini-loading" style="grid-column:1/-1"><div class="ini-spinner"></div>Chargement…</div>
        </div>
        <div class="ini-toast"></div>
      </div>`;

    container.querySelector('#ini-new-btn')?.addEventListener('click', () => _open_create(container));
    container.querySelector('#ini-templates-btn')?.addEventListener('click', () => _open_create(container));

    _load(container);
  },

  unmount(container) {
    _container = null;
    document.querySelectorAll('.ini-modal-overlay').forEach(el => el.remove());
  },
};
