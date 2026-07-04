// Politiques Vivantes — pilier 6
// Politiques avec règles auto-vérifiables via connecteurs

const CONNECTOR_ICONS = {
  entra_id: '🔑', ms365: '📦', exchange: '📧', teams: '💬', sharepoint: '📁',
  intune: '📱', custom: '⚙️', manual: '👤', api: '🔗', database: '🗄️',
};

const STATUS_META = {
  active:   { label: 'Active',   color: '#107C10' },
  draft:    { label: 'Brouillon', color: '#797775' },
  violated: { label: 'Violée',   color: '#D83B01' },
  expired:  { label: 'Expirée',  color: '#A80000' },
};

const SEVERITY_COLOR = { critical: '#D83B01', high: '#CA5010', medium: '#986F0B', low: '#107C10' };

function _demoData() {
  return {
    summary: { total: 7, active: 5, draft: 1, violated: 1, auto_verifiable: 4 },
    policies: [
      {
        id: 'pol-001', title: 'Politique MFA obligatoire', category: 'sécurité',
        status: 'violated', owner: 'RSSI', rule_count: 3, violated_rules: 1, auto_rules: 3,
        last_verified_at: '2026-06-25T10:00:00', framework_ref: 'ISO 27001 A.5.15',
        description: 'Tout utilisateur actif doit avoir le MFA activé sur son compte Entra ID.',
        rules: [
          { id: 'r-001', connector_type: 'entra_id', connector_action: 'check_mfa_enabled', condition_description: 'MFA activé pour tous les utilisateurs actifs', expected_value: '100%', last_status: 'violated', current_value: '71%', severity: 'critical' },
          { id: 'r-002', connector_type: 'entra_id', connector_action: 'check_conditional_access', condition_description: 'Politique d\'accès conditionnel MFA active', expected_value: 'enabled', last_status: 'compliant', current_value: 'enabled', severity: 'high' },
          { id: 'r-003', connector_type: 'manual', connector_action: 'verify_training', condition_description: 'Formation MFA complétée par 100% des employés', expected_value: '100%', last_status: 'pending', current_value: null, severity: 'medium' },
        ],
      },
      {
        id: 'pol-002', title: 'Politique de révision des licences', category: 'optimisation',
        status: 'active', owner: 'DSI', rule_count: 2, violated_rules: 0, auto_rules: 2,
        last_verified_at: '2026-06-28T08:00:00', framework_ref: null,
        description: 'Les licences M365 non utilisées depuis 90 jours doivent être désassignées.',
        rules: [
          { id: 'r-004', connector_type: 'ms365', connector_action: 'check_inactive_licenses', condition_description: 'Aucune licence assignée à un compte inactif > 90j', expected_value: '0', last_status: 'compliant', current_value: '0', severity: 'medium' },
          { id: 'r-005', connector_type: 'ms365', connector_action: 'check_license_utilization', condition_description: 'Taux d\'utilisation des licences > 85%', expected_value: '>85%', last_status: 'compliant', current_value: '91%', severity: 'low' },
        ],
      },
      {
        id: 'pol-003', title: 'Politique de gestion des données personnelles (Loi 25)', category: 'conformité',
        status: 'active', owner: 'DPO', rule_count: 4, violated_rules: 0, auto_rules: 1,
        last_verified_at: '2026-06-20T14:00:00', framework_ref: 'Loi 25 art. 8',
        description: 'Gestion conforme des données personnelles selon les exigences de la Loi 25.',
        rules: [
          { id: 'r-006', connector_type: 'database', connector_action: 'check_pii_encryption', condition_description: 'Données personnelles chiffrées en base', expected_value: 'encrypted', last_status: 'compliant', current_value: 'AES-256', severity: 'critical' },
          { id: 'r-007', connector_type: 'manual', connector_action: 'verify_consent_process', condition_description: 'Processus de consentement documenté', expected_value: 'documented', last_status: 'compliant', current_value: 'documented', severity: 'high' },
          { id: 'r-008', connector_type: 'manual', connector_action: 'verify_dpia', condition_description: 'AIPVP réalisée pour les traitements à risque', expected_value: 'completed', last_status: 'compliant', current_value: 'completed', severity: 'high' },
          { id: 'r-009', connector_type: 'manual', connector_action: 'verify_deletion_process', condition_description: 'Procédure de suppression des données documentée', expected_value: 'documented', last_status: 'compliant', current_value: 'documented', severity: 'medium' },
        ],
      },
      {
        id: 'pol-004', title: 'Politique de sécurité des mots de passe', category: 'sécurité',
        status: 'active', owner: 'RSSI', rule_count: 2, violated_rules: 0, auto_rules: 2,
        last_verified_at: '2026-06-22T09:00:00', framework_ref: 'ISO 27001 A.5.17',
        description: 'Complexité minimale requise et rotation des mots de passe compromis.',
        rules: [
          { id: 'r-010', connector_type: 'entra_id', connector_action: 'check_password_policy', condition_description: 'Politique de mot de passe conforme (12 car. min, complexité)', expected_value: 'compliant', last_status: 'compliant', current_value: 'compliant', severity: 'high' },
          { id: 'r-011', connector_type: 'entra_id', connector_action: 'check_smart_lockout', condition_description: 'Smart Lockout activé', expected_value: 'enabled', last_status: 'compliant', current_value: 'enabled', severity: 'medium' },
        ],
      },
      {
        id: 'pol-005', title: 'Politique de gouvernance de l\'IA', category: 'gouvernance-ia',
        status: 'draft', owner: 'DSI', rule_count: 0, violated_rules: 0, auto_rules: 0,
        last_verified_at: null, framework_ref: 'ISO 42001',
        description: 'Cadre d\'utilisation éthique et responsable des outils d\'IA dans l\'organisation.',
        rules: [],
      },
    ],
  };
}

let _container = null;
let _state = { summary: null, policies: [], expanded: null, verifying: null, token: null };

async function _fetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_state.token) headers['Authorization'] = `Bearer ${_state.token}`;
  const res = await fetch(path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function _load() {
  try {
    const [sumData, listData] = await Promise.all([
      _fetch('/api/politiques/summary'),
      _fetch('/api/politiques'),
    ]);
    _state.summary = sumData;
    _state.policies = listData.policies || [];
  } catch {
    const demo = _demoData();
    _state.summary = demo.summary;
    _state.policies = demo.policies;
  }
  _render();
}

function _render() {
  if (!_container) return;
  const s = _state.summary || {};
  _container.innerHTML = `
    <div style="padding:24px;max-width:1100px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div>
          <h2 style="margin:0;font-size:22px;font-weight:600;color:#201F1E">Politiques Vivantes</h2>
          <p style="margin:4px 0 0;color:#605E5C;font-size:13px">Règles auto-vérifiables via connecteurs</p>
        </div>
        <button id="pol-new-btn" style="background:#0078D4;color:#fff;border:none;border-radius:4px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">+ Nouvelle politique</button>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px">
        ${_kpi('Total', s.total ?? 0, '#605E5C')}
        ${_kpi('Actives', s.active ?? 0, '#107C10')}
        ${_kpi('Brouillons', s.draft ?? 0, '#797775')}
        ${_kpi('Violées', s.violated ?? 0, '#D83B01')}
        ${_kpi('Auto-vérif.', s.auto_verifiable ?? 0, '#0078D4')}
      </div>

      <!-- Politique cards -->
      <div id="pol-list">
        ${(_state.policies || []).map(_policyCard).join('')}
      </div>
    </div>
  `;

  _container.querySelector('#pol-new-btn')?.addEventListener('click', _showNewDialog);
  _container.querySelectorAll('.pol-card-header').forEach(h => {
    h.addEventListener('click', () => {
      const id = h.dataset.id;
      _state.expanded = _state.expanded === id ? null : id;
      _render();
    });
  });
  _container.querySelectorAll('.pol-verify-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = '⟳ Vérification…';
      await _verify(id);
    });
  });
}

function _kpi(label, value, color) {
  return `
    <div style="background:#fff;border:1px solid #EDEBE9;border-radius:6px;padding:14px 16px">
      <div style="font-size:22px;font-weight:700;color:${color}">${value}</div>
      <div style="font-size:12px;color:#605E5C;margin-top:2px">${label}</div>
    </div>`;
}

function _policyCard(p) {
  const sm = STATUS_META[p.status] || STATUS_META.draft;
  const isExpanded = _state.expanded === p.id;
  const isVerifying = _state.verifying === p.id;
  const hasViolation = p.violated_rules > 0;
  const canVerify = p.auto_rules > 0;

  return `
    <div style="background:#fff;border:1px solid ${hasViolation ? '#D83B01' : '#EDEBE9'};border-radius:6px;margin-bottom:8px;overflow:hidden;${hasViolation ? 'box-shadow:0 0 0 1px rgba(216,59,1,0.2)' : ''}">
      <div class="pol-card-header" data-id="${p.id}"
           style="display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;user-select:none;transition:background 0.15s"
           onmouseenter="this.style.background='#F3F2F1'" onmouseleave="this.style.background=''">

        <div style="width:8px;height:8px;border-radius:50%;background:${sm.color};flex-shrink:0"></div>

        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:14px;font-weight:600;color:#201F1E">${p.title}</span>
            <span style="background:${sm.color}22;color:${sm.color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px">${sm.label}</span>
            ${p.framework_ref ? `<span style="background:#EFF6FC;color:#0078D4;font-size:11px;padding:2px 8px;border-radius:10px">${p.framework_ref}</span>` : ''}
          </div>
          <div style="font-size:12px;color:#605E5C;margin-top:3px;display:flex;gap:16px;flex-wrap:wrap">
            <span>📋 ${p.rule_count} règle${p.rule_count !== 1 ? 's' : ''}</span>
            ${p.auto_rules > 0 ? `<span>⚡ ${p.auto_rules} auto-vérif.</span>` : ''}
            ${p.violated_rules > 0 ? `<span style="color:#D83B01;font-weight:600">🚨 ${p.violated_rules} violation${p.violated_rules > 1 ? 's' : ''}</span>` : ''}
            ${p.owner ? `<span>👤 ${p.owner}</span>` : ''}
            ${p.last_verified_at ? `<span>✅ Vérifié ${_ago(p.last_verified_at)}</span>` : '<span style="color:#CA5010">Jamais vérifié</span>'}
          </div>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
          ${canVerify ? `<button class="pol-verify-btn" data-id="${p.id}"
            style="background:#EFF6FC;color:#0078D4;border:1px solid #0078D4;border-radius:4px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer"
            ${isVerifying ? 'disabled' : ''}>
            ${isVerifying ? '⟳ Vérification…' : '▶ Vérifier'}
          </button>` : ''}
          <span style="color:#A19F9D;font-size:16px">${isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      ${isExpanded ? _expandedPolicy(p) : ''}
    </div>`;
}

function _expandedPolicy(p) {
  return `
    <div style="border-top:1px solid #EDEBE9;padding:16px">
      ${p.description ? `<p style="margin:0 0 16px;color:#3B3A39;font-size:13px;line-height:1.5">${p.description}</p>` : ''}

      ${p.rules && p.rules.length > 0 ? `
        <div style="font-size:12px;font-weight:600;color:#605E5C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Règles</div>
        ${p.rules.map(_ruleRow).join('')}
      ` : `<div style="color:#797775;font-size:13px;text-align:center;padding:16px">Aucune règle définie. <a href="#" style="color:#0078D4">Ajouter une règle</a></div>`}
    </div>`;
}

function _ruleRow(rule) {
  const statusMeta = {
    compliant: { icon: '✅', color: '#107C10', label: 'Conforme' },
    violated:  { icon: '🚨', color: '#D83B01', label: 'Violée' },
    pending:   { icon: '⏳', color: '#797775', label: 'En attente' },
  };
  const sm = statusMeta[rule.last_status] || statusMeta.pending;
  const connIcon = CONNECTOR_ICONS[rule.connector_type] || '⚙️';
  const sevColor = SEVERITY_COLOR[rule.severity] || '#605E5C';

  return `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#FAFAFA;border-radius:4px;margin-bottom:6px;border-left:3px solid ${sm.color}">
      <span style="font-size:18px">${connIcon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:#201F1E">${rule.condition_description}</div>
        <div style="font-size:11px;color:#605E5C;margin-top:2px;display:flex;gap:12px">
          <span>Type: <b>${rule.connector_type}</b></span>
          ${rule.expected_value ? `<span>Attendu: <b>${rule.expected_value}</b></span>` : ''}
          ${rule.current_value ? `<span>Actuel: <b style="color:${rule.last_status === 'violated' ? '#D83B01' : '#107C10'}">${rule.current_value}</b></span>` : ''}
          <span style="color:${sevColor}">● ${rule.severity}</span>
        </div>
      </div>
      <span style="font-size:12px;font-weight:600;color:${sm.color};white-space:nowrap">${sm.icon} ${sm.label}</span>
    </div>`;
}

function _showNewDialog() {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  d.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:28px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <h3 style="margin:0 0 20px;font-size:18px">Nouvelle politique</h3>
      <div style="margin-bottom:14px">
        <label style="display:block;font-size:12px;font-weight:600;color:#605E5C;margin-bottom:4px">Titre *</label>
        <input id="pol-new-title" placeholder="Ex: Politique MFA obligatoire" style="width:100%;border:1px solid #EDEBE9;border-radius:4px;padding:8px;font-size:13px;box-sizing:border-box">
      </div>
      <div style="margin-bottom:14px">
        <label style="display:block;font-size:12px;font-weight:600;color:#605E5C;margin-bottom:4px">Catégorie</label>
        <select id="pol-new-cat" style="width:100%;border:1px solid #EDEBE9;border-radius:4px;padding:8px;font-size:13px">
          <option value="sécurité">Sécurité</option>
          <option value="conformité">Conformité</option>
          <option value="gouvernance">Gouvernance</option>
          <option value="optimisation">Optimisation</option>
          <option value="gouvernance-ia">Gouvernance IA</option>
        </select>
      </div>
      <div style="margin-bottom:20px">
        <label style="display:block;font-size:12px;font-weight:600;color:#605E5C;margin-bottom:4px">Description</label>
        <textarea id="pol-new-desc" rows="3" style="width:100%;border:1px solid #EDEBE9;border-radius:4px;padding:8px;font-size:13px;box-sizing:border-box;resize:vertical"></textarea>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="pol-cancel" style="background:#F3F2F1;border:none;border-radius:4px;padding:8px 16px;font-size:13px;cursor:pointer">Annuler</button>
        <button id="pol-create" style="background:#0078D4;color:#fff;border:none;border-radius:4px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">Créer</button>
      </div>
    </div>`;
  document.body.appendChild(d);
  d.querySelector('#pol-cancel').onclick = () => document.body.removeChild(d);
  d.querySelector('#pol-create').onclick = async () => {
    const title = d.querySelector('#pol-new-title').value.trim();
    if (!title) return;
    try {
      await _fetch('/api/politiques', { method: 'POST', body: JSON.stringify({ title, category: d.querySelector('#pol-new-cat').value, description: d.querySelector('#pol-new-desc').value }) });
    } catch {}
    document.body.removeChild(d);
    _load();
  };
}

async function _verify(policyId) {
  _state.verifying = policyId;
  try {
    await _fetch(`/api/politiques/${policyId}/verify`, { method: 'POST' });
    await _load();
  } catch {
    _state.verifying = null;
    _render();
  }
}

function _ago(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'il y a moins d\'1h';
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

export default {
  mount(container, ctx) {
    _container = container;
    _state.token = ctx?.token || localStorage.getItem('nexhire_token');
    _state.expanded = null;
    _state.verifying = null;
    _load();
  },
  unmount(container) {
    if (container) container.innerHTML = '';
    _container = null;
  },
  refresh(ctx) { if (_container) _render(); },
};
