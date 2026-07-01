/**
 * Décisions IA — dossiers exécutifs avec ROI, coût d'inaction, bouton d'action.
 * Style : Fluent Design / Microsoft Blue #0078D4
 */

const CSS = `<style>
.dec-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--topbar-h, 56px));
  background: #f3f4f6;
  overflow: hidden;
}

/* ── Header ── */
.dec-header {
  flex-shrink: 0;
  padding: 18px 24px 14px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.dec-header-left { display: flex; align-items: center; gap: 12px; }
.dec-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: linear-gradient(135deg, #0078D4, #106EBE);
  color: #fff; font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 99px; letter-spacing: .04em;
}
.dec-title { font-size: 16px; font-weight: 700; color: #111827; }
.dec-subtitle { font-size: 12px; color: #6b7280; margin-top: 1px; }

/* ── KPI bar ── */
.dec-kpis {
  margin-left: auto;
  display: flex; gap: 24px;
}
.dec-kpi { text-align: center; }
.dec-kpi-val { font-size: 20px; font-weight: 800; color: #0078D4; }
.dec-kpi-val.red { color: #DC2626; }
.dec-kpi-val.green { color: #059669; }
.dec-kpi-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }

/* ── Filtres ── */
.dec-filters {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}
.dec-filter-btn {
  padding: 5px 12px; border-radius: 20px;
  border: 1.5px solid #d1d5db;
  background: #fff; color: #374151;
  font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: all .15s;
}
.dec-filter-btn:hover { border-color: #0078D4; color: #0078D4; }
.dec-filter-btn.active { background: #0078D4; border-color: #0078D4; color: #fff; }

/* ── Body scroll ── */
.dec-body {
  flex: 1; overflow-y: auto;
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 14px;
}

/* ── Carte décision ── */
.dec-card {
  background: #fff;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  overflow: hidden;
  transition: box-shadow .2s;
  cursor: pointer;
}
.dec-card:hover { box-shadow: 0 4px 16px rgba(0,120,212,.12); border-color: #93c5fd; }
.dec-card.expanded { border-color: #0078D4; }

.dec-card-header {
  padding: 16px 20px;
  display: flex; align-items: flex-start; gap: 14px;
}

.dec-priority-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  margin-top: 5px; flex-shrink: 0;
}
.dec-priority-dot.critical { background: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,.2); }
.dec-priority-dot.high     { background: #D97706; }
.dec-priority-dot.medium   { background: #2563EB; }
.dec-priority-dot.low      { background: #6B7280; }

.dec-card-main { flex: 1; min-width: 0; }
.dec-card-meta {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 5px; flex-wrap: wrap;
}
.dec-priority-badge {
  font-size: 10px; font-weight: 700;
  padding: 2px 8px; border-radius: 99px;
  text-transform: uppercase; letter-spacing: .06em;
}
.dec-priority-badge.critical { background: #FEE2E2; color: #991B1B; }
.dec-priority-badge.high     { background: #FEF3C7; color: #92400E; }
.dec-priority-badge.medium   { background: #DBEAFE; color: #1E40AF; }
.dec-priority-badge.low      { background: #F3F4F6; color: #4B5563; }

.dec-category-tag {
  font-size: 10px; color: #6b7280; font-weight: 600;
  text-transform: capitalize;
}
.dec-confidence { font-size: 10px; color: #059669; font-weight: 700; }
.dec-card-title { font-size: 15px; font-weight: 700; color: #111827; }

.dec-card-metrics {
  display: flex; gap: 20px; margin-top: 10px; flex-wrap: wrap;
}
.dec-metric { text-align: center; }
.dec-metric-val {
  font-size: 16px; font-weight: 800;
  color: #DC2626;
}
.dec-metric-val.good  { color: #059669; }
.dec-metric-val.blue  { color: #0078D4; }
.dec-metric-val.amber { color: #D97706; }
.dec-metric-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }

.dec-card-actions {
  flex-shrink: 0;
  display: flex; gap: 8px; align-items: flex-start;
}
.dec-btn-primary {
  padding: 8px 16px; border-radius: 6px;
  background: #0078D4; color: #fff;
  border: none; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: background .15s;
}
.dec-btn-primary:hover { background: #106EBE; }
.dec-btn-primary:disabled { background: #9CA3AF; cursor: default; }
.dec-btn-secondary {
  padding: 7px 14px; border-radius: 6px;
  background: #fff; color: #374151;
  border: 1.5px solid #d1d5db; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: all .15s;
}
.dec-btn-secondary:hover { border-color: #0078D4; color: #0078D4; }
.dec-btn-more {
  padding: 7px 10px; border-radius: 6px;
  background: #fff; color: #6b7280;
  border: 1.5px solid #d1d5db; font-size: 13px;
  cursor: pointer; line-height: 1;
  transition: all .15s;
}
.dec-btn-more:hover { border-color: #0078D4; color: #0078D4; }

/* ── Détail (expanded) ── */
.dec-detail {
  display: none;
  padding: 0 20px 18px;
  border-top: 1px solid #f3f4f6;
}
.dec-card.expanded .dec-detail { display: block; }

.dec-detail-section { margin-top: 14px; }
.dec-detail-section-title {
  font-size: 10px; font-weight: 800; color: #6b7280;
  text-transform: uppercase; letter-spacing: .1em;
  margin-bottom: 5px;
}
.dec-detail-text {
  font-size: 13px; color: #374151; line-height: 1.6;
}
.dec-evidence-item {
  display: flex; gap: 6px;
  font-size: 12px; color: #4b5563;
  padding: 4px 0;
}
.dec-evidence-item::before { content: '•'; color: #0078D4; font-weight: 700; }

.dec-metrics-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
  margin-top: 8px;
}
.dec-metric-card {
  background: #f9fafb; border-radius: 8px;
  padding: 10px 12px; text-align: center;
  border: 1px solid #e5e7eb;
}
.dec-metric-card-val { font-size: 18px; font-weight: 800; color: #0078D4; }
.dec-metric-card-val.danger { color: #DC2626; }
.dec-metric-card-label { font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; }

.dec-inaction-alert {
  margin-top: 10px;
  background: #FEF2F2; border: 1px solid #FECACA;
  border-radius: 8px; padding: 10px 14px;
  font-size: 12px; color: #991B1B; font-weight: 600;
}

.dec-detail-actions {
  display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;
}

/* ── Status chip ── */
.dec-status-chip {
  display: inline-block;
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 99px;
  text-transform: uppercase; letter-spacing: .04em;
}
.dec-status-chip.applied   { background: #D1FAE5; color: #065F46; }
.dec-status-chip.accepted  { background: #DBEAFE; color: #1E40AF; }
.dec-status-chip.ignored   { background: #F3F4F6; color: #6B7280; }
.dec-status-chip.delegated { background: #FEF3C7; color: #92400E; }
.dec-status-chip.new       { background: #F0FDF4; color: #166534; }

/* ── Loading / vide ── */
.dec-loading { display: flex; align-items: center; justify-content: center; height: 200px; color: #6b7280; gap: 10px; font-size: 14px; }
.dec-spinner { width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top-color: #0078D4; border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.dec-empty { text-align: center; padding: 60px 24px; color: #6b7280; }
.dec-empty-icon { font-size: 48px; margin-bottom: 12px; }
.dec-empty-msg { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
.dec-empty-sub { font-size: 13px; color: #9ca3af; }

/* ── Toast ── */
.dec-toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: #1f2937; color: #fff;
  padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
  z-index: 9999; opacity: 0; transition: opacity .3s;
  white-space: nowrap; pointer-events: none;
}
.dec-toast.show { opacity: 1; }
.dec-toast.success { background: #059669; }
.dec-toast.error   { background: #DC2626; }
</style>`;

const PRIORITY_ORDER = { critical: 1, high: 2, medium: 3, low: 4 };
const PRIORITY_LABELS = { critical: 'Urgent', high: 'Élevé', medium: 'Moyen', low: 'Faible' };
const CATEGORY_LABELS = {
  finance: 'Finances', security: 'Sécurité', compliance: 'Conformité',
  hr: 'RH', it: 'TI', operations: 'Opérations', governance: 'Gouvernance', general: 'Général',
};
const ROI_LABELS   = { excellent: 'Excellent', good: 'Bon', neutral: 'Neutre', negative: 'Négatif', unknown: '—' };
const RISK_LABELS  = { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible', none: 'Nul' };
const STATUS_LABELS = { new: 'Nouvelle', reviewing: 'En revue', accepted: 'Acceptée', applied: 'Appliquée', ignored: 'Ignorée', delegated: 'Déléguée' };

let _state = { decisions: [], filter: 'all', summary: {}, loading: true };
let _container = null;
let _token = null;

function _fmt_currency(val) {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val);
}

function _priority_dot(p) {
  return `<span class="dec-priority-dot ${p}"></span>`;
}

function _priority_badge(p) {
  return `<span class="dec-priority-badge ${p}">${PRIORITY_LABELS[p] || p}</span>`;
}

function _metric_color(roi) {
  const m = { excellent: 'good', good: 'good', neutral: 'blue', negative: 'amber' };
  return m[roi] || 'blue';
}

function _card_html(d, idx) {
  const costFmt    = _fmt_currency(d.cost_of_inaction);
  const savingsFmt = _fmt_currency(d.savings_annual);
  const conf       = d.ai_confidence ? `<span class="dec-confidence">Confiance IA : ${d.ai_confidence} %</span>` : '';
  const statusNonDefault = !['new', 'reviewing'].includes(d.status)
    ? `<span class="dec-status-chip ${d.status}">${STATUS_LABELS[d.status] || d.status}</span>` : '';

  const evidence = (d.evidence || []).slice(0, 3).map(e =>
    `<div class="dec-evidence-item">${typeof e === 'string' ? e : e.text || JSON.stringify(e)}</div>`
  ).join('');

  const metricsRow = `
    <div class="dec-metrics-row">
      <div class="dec-metric-card">
        <div class="dec-metric-card-val danger">${d.cost_of_inaction ? costFmt : '—'}</div>
        <div class="dec-metric-card-label">Coût inaction</div>
      </div>
      <div class="dec-metric-card">
        <div class="dec-metric-card-val ${_metric_color(d.roi_label)}">${ROI_LABELS[d.roi_label] || '—'}</div>
        <div class="dec-metric-card-label">ROI</div>
      </div>
      <div class="dec-metric-card">
        <div class="dec-metric-card-val" style="color:#DC2626">${RISK_LABELS[d.risk_label] || '—'}</div>
        <div class="dec-metric-card-label">Risque</div>
      </div>
      <div class="dec-metric-card">
        <div class="dec-metric-card-val blue">${d.time_label || '—'}</div>
        <div class="dec-metric-card-label">Temps</div>
      </div>
    </div>`;

  const isActive = ['new', 'reviewing', 'accepted'].includes(d.status);

  return `
  <div class="dec-card" data-id="${d.id}" data-idx="${idx}">
    <div class="dec-card-header">
      ${_priority_dot(d.priority)}
      <div class="dec-card-main">
        <div class="dec-card-meta">
          ${_priority_badge(d.priority)}
          <span class="dec-category-tag">${CATEGORY_LABELS[d.category] || d.category}</span>
          ${conf}
          ${statusNonDefault}
        </div>
        <div class="dec-card-title">${d.title}</div>
        <div class="dec-card-metrics">
          ${d.cost_of_inaction ? `<div class="dec-metric"><div class="dec-metric-val">${costFmt}/an</div><div class="dec-metric-label">Exposition</div></div>` : ''}
          ${d.savings_annual ? `<div class="dec-metric"><div class="dec-metric-val good">${savingsFmt}/an</div><div class="dec-metric-label">Économies</div></div>` : ''}
          ${d.time_label ? `<div class="dec-metric"><div class="dec-metric-val blue">${d.time_label}</div><div class="dec-metric-label">Exécution</div></div>` : ''}
        </div>
      </div>
      <div class="dec-card-actions">
        ${isActive ? `<button class="dec-btn-primary" data-action="accept" data-id="${d.id}">▶ Appliquer</button>` : ''}
        ${isActive ? `<button class="dec-btn-secondary" data-action="delegate" data-id="${d.id}">Déléguer</button>` : ''}
        <button class="dec-btn-more" data-action="expand" data-id="${d.id}">···</button>
      </div>
    </div>
    <div class="dec-detail">
      ${d.problem_statement ? `
      <div class="dec-detail-section">
        <div class="dec-detail-section-title">Le problème</div>
        <div class="dec-detail-text">${d.problem_statement}</div>
      </div>` : ''}
      ${d.why_now ? `
      <div class="dec-detail-section">
        <div class="dec-detail-section-title">Pourquoi maintenant</div>
        <div class="dec-detail-text">${d.why_now}</div>
      </div>` : ''}
      ${evidence ? `
      <div class="dec-detail-section">
        <div class="dec-detail-section-title">Preuves</div>
        ${evidence}
      </div>` : ''}
      ${metricsRow}
      ${d.cost_of_inaction ? `
      <div class="dec-inaction-alert">
        ⚠️ Si rien n'est fait : <strong>${costFmt}</strong> ${d.cost_period === 'year' ? 'par an' : ''} — exposition maintenue
      </div>` : ''}
      <div class="dec-detail-actions">
        ${isActive ? `<button class="dec-btn-primary" data-action="accept" data-id="${d.id}">▶ Appliquer maintenant</button>` : ''}
        ${isActive ? `<button class="dec-btn-secondary" data-action="delegate" data-id="${d.id}">Déléguer →</button>` : ''}
        ${isActive ? `<button class="dec-btn-secondary" data-action="ignore" data-id="${d.id}">Ignorer</button>` : ''}
        ${d.responsible_name ? `<span style="font-size:12px;color:#6b7280;margin-left:auto;">Responsable : ${d.responsible_name}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function _kpis_html(s) {
  return `
  <div class="dec-kpis">
    <div class="dec-kpi">
      <div class="dec-kpi-val red">${s.critical || 0}</div>
      <div class="dec-kpi-label">Critiques</div>
    </div>
    <div class="dec-kpi">
      <div class="dec-kpi-val">${s.pending || 0}</div>
      <div class="dec-kpi-label">En attente</div>
    </div>
    <div class="dec-kpi">
      <div class="dec-kpi-val green">${s.applied || 0}</div>
      <div class="dec-kpi-label">Appliquées</div>
    </div>
    <div class="dec-kpi">
      <div class="dec-kpi-val" style="font-size:14px;color:#DC2626">${_fmt_currency(s.total_exposure)}</div>
      <div class="dec-kpi-label">Exposition totale</div>
    </div>
  </div>`;
}

function _render(container) {
  if (!container) return;
  const filtered = _state.filter === 'all'
    ? _state.decisions
    : _state.filter === 'critical'
      ? _state.decisions.filter(d => d.priority === 'critical')
      : _state.decisions.filter(d => d.category === _state.filter);

  const bodyEl = container.querySelector('.dec-body');
  if (!bodyEl) return;

  if (_state.loading) {
    bodyEl.innerHTML = `<div class="dec-loading"><div class="dec-spinner"></div>Chargement des décisions…</div>`;
    return;
  }
  if (!filtered.length) {
    bodyEl.innerHTML = `<div class="dec-empty"><div class="dec-empty-icon">🎯</div><div class="dec-empty-msg">Aucune décision dans cette catégorie</div><div class="dec-empty-sub">ATLAS analysera vos données et proposera des décisions prochainement.</div></div>`;
    return;
  }
  bodyEl.innerHTML = filtered.map((d, i) => _card_html(d, i)).join('');

  // Wire interactions
  bodyEl.querySelectorAll('.dec-card-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const card = header.closest('.dec-card');
      const wasExpanded = card.classList.contains('expanded');
      container.querySelectorAll('.dec-card').forEach(c => c.classList.remove('expanded'));
      if (!wasExpanded) card.classList.add('expanded');
    });
  });

  bodyEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'expand') {
        const card = btn.closest('.dec-card');
        card.classList.toggle('expanded');
      } else if (action === 'accept') {
        _accept(id, container);
      } else if (action === 'delegate') {
        _toast('Fonctionnalité de délégation disponible prochainement.', 'info', container);
      } else if (action === 'ignore') {
        _ignore(id, container);
      }
    });
  });

  // Update KPIs
  container.querySelector('.dec-kpis-wrap').innerHTML = _kpis_html(_state.summary);
}

async function _accept(id, container) {
  const btn = container.querySelector(`[data-action="accept"][data-id="${id}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Traitement…'; }
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const res = await fetch(`/api/decisions/${id}/accept`, {
      method: 'POST', credentials: 'include',
      headers, body: JSON.stringify({ trigger_playbook: true }),
    });
    if (res.ok) {
      _state.decisions = _state.decisions.map(d => d.id === id ? { ...d, status: 'accepted' } : d);
      _state.summary.pending = Math.max(0, (_state.summary.pending || 0) - 1);
      _state.summary.applied = (_state.summary.applied || 0) + 1;
      _render(container);
      _toast('Décision acceptée et action déclenchée.', 'success', container);
    } else {
      const err = await res.json();
      _toast(err.detail || 'Erreur lors de l\'acceptation.', 'error', container);
      if (btn) { btn.disabled = false; btn.textContent = '▶ Appliquer'; }
    }
  } catch {
    _toast('Erreur réseau.', 'error', container);
    if (btn) { btn.disabled = false; btn.textContent = '▶ Appliquer'; }
  }
}

async function _ignore(id, container) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const res = await fetch(`/api/decisions/${id}/ignore`, {
      method: 'POST', credentials: 'include',
      headers, body: JSON.stringify({ reason: 'Ignorée via tableau de bord' }),
    });
    if (res.ok) {
      _state.decisions = _state.decisions.map(d => d.id === id ? { ...d, status: 'ignored' } : d);
      _render(container);
      _toast('Décision ignorée.', 'info', container);
    }
  } catch { _toast('Erreur réseau.', 'error', container); }
}

function _toast(msg, type = 'info', container) {
  let el = container?.querySelector('.dec-toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `dec-toast ${type}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3500);
}

async function _load(container) {
  _state.loading = true;
  _render(container);

  try {
    const headers = {};
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    const [decRes, sumRes] = await Promise.all([
      fetch('/api/decisions?status=new,reviewing,accepted,applied&limit=100', { credentials: 'include', headers }),
      fetch('/api/decisions/summary', { credentials: 'include', headers }),
    ]);
    if (decRes.ok) _state.decisions = (await decRes.json()).decisions || [];
    if (sumRes.ok) _state.summary = await sumRes.json();
  } catch {
    _state.decisions = _getDemoData();
    _state.summary = { pending: 3, critical: 2, applied: 1, savings_realized: 4760, total_exposure: 248760 };
  }
  _state.loading = false;
  _render(container);
}

function _getDemoData() {
  return [
    {
      id: 'demo-1', title: '14 licences Microsoft 365 E3 inutilisées', category: 'finance',
      priority: 'critical', status: 'new', ai_confidence: 96,
      problem_statement: '14 licences E3 à 28 $/mois n\'ont enregistré aucune connexion depuis plus de 90 jours.',
      why_now: 'Renouvellement Microsoft au 15 août. Agir maintenant évite 12 mois de facturation supplémentaire.',
      evidence: ['14 comptes sans connexion depuis 91 à 247 jours', 'Source : Microsoft Graph — analysé le 1er juil. 2026'],
      cost_of_inaction: 4760, cost_period: 'year', savings_annual: 4760,
      roi_label: 'excellent', risk_label: 'low', time_label: '2 minutes', time_to_apply_min: 2,
    },
    {
      id: 'demo-2', title: '8 comptes administrateurs sans MFA', category: 'security',
      priority: 'critical', status: 'new', ai_confidence: 98,
      problem_statement: '8 sur 23 comptes administrateurs n\'ont pas l\'authentification multifacteur activée.',
      why_now: 'Exposition critique : un compte admin compromis donne un accès total au tenant Microsoft 365.',
      evidence: ['8 admins identifiés sans Microsoft Authenticator', 'Conformité actuelle : 65 % (cible : 100 %)'],
      cost_of_inaction: 89000, cost_period: 'year',
      roi_label: 'excellent', risk_label: 'critical', time_label: '12 secondes', time_to_apply_min: 1,
    },
    {
      id: 'demo-3', title: 'Politique IA absente — ISO 42001 §6.1', category: 'compliance',
      priority: 'high', status: 'new', ai_confidence: 87,
      problem_statement: 'Aucune politique d\'utilisation de l\'IA n\'est documentée dans l\'organisation.',
      why_now: 'Appel d\'offres public exigeant une politique IA prévu en septembre 2026.',
      evidence: ['0 / 1 politique IA existante', 'ISO 42001 §6.1 non conforme'],
      cost_of_inaction: 150000, cost_period: 'year',
      roi_label: 'good', risk_label: 'high', time_label: '4 heures', time_to_apply_min: 240,
    },
  ];
}

const FILTERS = [
  { id: 'all',        label: 'Toutes' },
  { id: 'critical',   label: '🔴 Urgentes' },
  { id: 'finance',    label: 'Finances' },
  { id: 'security',   label: 'Sécurité' },
  { id: 'compliance', label: 'Conformité' },
  { id: 'it',         label: 'TI' },
];

export default {
  mount(container, ctx) {
    _container = container;
    _token = localStorage.getItem('nexhire_token');
    _state = { decisions: [], filter: 'all', summary: {}, loading: true };

    container.innerHTML = CSS + `
      <div class="dec-root">
        <div class="dec-header">
          <div class="dec-header-left">
            <span class="dec-badge">🎯 ATLAS</span>
            <div>
              <div class="dec-title">Décisions IA</div>
              <div class="dec-subtitle">Dossiers exécutifs — ROI, coût d'inaction, action immédiate</div>
            </div>
          </div>
          <div class="dec-kpis-wrap"></div>
        </div>
        <div class="dec-filters">
          ${FILTERS.map(f => `<button class="dec-filter-btn${f.id === 'all' ? ' active' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}
        </div>
        <div class="dec-body">
          <div class="dec-loading"><div class="dec-spinner"></div>Chargement…</div>
        </div>
        <div class="dec-toast"></div>
      </div>`;

    container.querySelectorAll('.dec-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.dec-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _state.filter = btn.dataset.filter;
        _render(container);
      });
    });

    _load(container);
  },

  unmount(container) {
    _container = null;
  },
};
