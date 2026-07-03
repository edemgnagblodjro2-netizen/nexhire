// Conformité Causale — pilier 7
// Score → Pourquoi → Preuves → Coût de l'inaction → Plan d'action → Remédiation → Nouveau score

const SEVERITY_META = {
  critical: { label: 'Critique',  color: '#D83B01', bg: '#FDE7E9' },
  high:     { label: 'Élevée',   color: '#CA5010', bg: '#FFF4CE' },
  medium:   { label: 'Moyenne',  color: '#986F0B', bg: '#FFF8F0' },
  low:      { label: 'Faible',   color: '#107C10', bg: '#DFF6DD' },
};

const STATUS_NC = {
  open:        { label: 'Ouverte',    color: '#D83B01' },
  in_progress: { label: 'En cours',   color: '#CA5010' },
  resolved:    { label: 'Résolue',    color: '#107C10' },
};

const FW_ICONS = { 'fw-iso27001': '🔒', 'fw-loi25': '🇨🇦', 'fw-iso42001': '🤖' };

let _container = null;
let _state = {
  token: null,
  summary: null,
  frameworks: [],
  activeFw: null,
  nonconformites: [],
  expandedNc: null,
  loading: false,
  is_demo: false,
};

async function _fetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_state.token) headers['Authorization'] = `Bearer ${_state.token}`;
  const res = await fetch(path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function _load() {
  _state.loading = true;
  try {
    const [sum, fwList] = await Promise.all([
      _fetch('/api/conformite/summary'),
      _fetch('/api/conformite/frameworks'),
    ]);
    _state.summary = sum;
    _state.frameworks = fwList.frameworks || [];
    _state.is_demo = !!(sum.is_demo || fwList.is_demo);
    if (!_state.activeFw && _state.frameworks.length > 0) {
      _state.activeFw = _state.frameworks[0].id;
    }
  } catch {
    _state.summary = _DEMO_SUMMARY;
    _state.frameworks = _DEMO_FRAMEWORKS;
    _state.activeFw = _state.frameworks[0]?.id || null;
    _state.is_demo = true;
  }
  await _loadNc();
}

async function _loadNc() {
  if (!_state.activeFw) { _state.loading = false; _render(); return; }
  try {
    const data = await _fetch(`/api/conformite/frameworks/${_state.activeFw}/nonconformites`);
    _state.nonconformites = data.nonconformites || [];
  } catch {
    _state.nonconformites = _DEMO_NC[_state.activeFw] || [];
  }
  _state.loading = false;
  _render();
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const _DEMO_SUMMARY = {
  overall_score: 72, score_trend: 3,
  frameworks_count: 3, controls_total: 114, controls_compliant: 82,
  nonconformites_open: 14, nonconformites_critical: 4,
  cost_of_inaction_total: 187000,
};

const _DEMO_FRAMEWORKS = [
  { id: 'fw-iso27001', name: 'ISO 27001:2022', icon: '🔒', score: 68, score_trend: 2, status: 'in_progress', controls_total: 93, controls_compliant: 63, nonconformites: 8, last_assessed_at: '2026-06-15T00:00:00',
    domains: [
      { name: "Contrôle d'accès",       score: 55, controls: 12, gaps: 5 },
      { name: 'Cryptographie',           score: 80, controls: 6,  gaps: 1 },
      { name: 'Sécurité physique',       score: 90, controls: 8,  gaps: 1 },
      { name: 'Gestion des opérations', score: 65, controls: 14, gaps: 5 },
      { name: 'Gestion des incidents',  score: 50, controls: 7,  gaps: 4 },
      { name: 'Conformité',             score: 75, controls: 10, gaps: 2 },
    ] },
  { id: 'fw-loi25', name: 'Loi 25 (Québec)', icon: '🇨🇦', score: 81, score_trend: 5, status: 'compliant', controls_total: 18, controls_compliant: 15, nonconformites: 3, last_assessed_at: '2026-06-20T00:00:00',
    domains: [
      { name: 'Gouvernance des données', score: 85, controls: 5, gaps: 1 },
      { name: 'Droits des personnes',    score: 80, controls: 6, gaps: 1 },
      { name: 'Sécurité des données',    score: 75, controls: 7, gaps: 1 },
    ] },
  { id: 'fw-iso42001', name: 'ISO 42001 (IA)', icon: '🤖', score: 58, score_trend: 0, status: 'in_progress', controls_total: 38, controls_compliant: 22, nonconformites: 6, last_assessed_at: '2026-06-01T00:00:00',
    domains: [
      { name: 'Gouvernance IA',               score: 60, controls: 10, gaps: 4 },
      { name: 'Transparence & Explicabilité', score: 50, controls: 8,  gaps: 4 },
      { name: 'Gestion des risques IA',       score: 65, controls: 10, gaps: 3 },
      { name: 'Droits & Équité',              score: 55, controls: 10, gaps: 5 },
    ] },
];

const _DEMO_NC = {
  'fw-iso27001': [
    { id: 'nc-001', control_ref: 'A.5.15', control_name: "Contrôle d'accès", title: '8 comptes sans MFA activé', severity: 'critical', status: 'open',
      root_cause: "Absence de politique MFA obligatoire et aucun mécanisme d'enforcement automatique via Entra ID.",
      evidence: ['8 utilisateurs actifs sans MFA dans Entra ID', 'Audit du 2026-06-10', 'Logs d\'accès non protégés'],
      cost_of_inaction: 45000, cost_label: 'Exposition annuelle estimée : 45 000 $',
      suggested_playbook: 'Activation MFA global', created_at: '2026-06-10T00:00:00' },
    { id: 'nc-002', control_ref: 'A.5.23', control_name: 'Sécurité des services cloud', title: '2 politiques de sécurité expirées', severity: 'high', status: 'open',
      root_cause: 'Cycle de révision des politiques non automatisé. Dernière révision manuelle il y a 14 mois.',
      evidence: ['Politique MDM expirée depuis 45 jours', 'Politique BYOD non révisée depuis 14 mois'],
      cost_of_inaction: 28000, cost_label: 'Risque d\'audit externe : 28 000 $',
      suggested_playbook: 'Révision des politiques de sécurité', created_at: '2026-05-28T00:00:00' },
    { id: 'nc-003', control_ref: 'A.5.26', control_name: 'Gestion des incidents', title: 'Absence de procédure de réponse aux incidents', severity: 'high', status: 'open',
      root_cause: 'Le Playbook de réponse aux incidents n\'a jamais été formalisé ni testé.',
      evidence: ['Aucun runbook d\'incident en place', 'Dernier test de simulation : jamais'],
      cost_of_inaction: 72000, cost_label: 'Coût moyen d\'un incident non géré : 72 000 $',
      suggested_playbook: 'Incident Sécurité — Réponse', created_at: '2026-06-01T00:00:00' },
    { id: 'nc-004', control_ref: 'A.8.8', control_name: 'Gestion des vulnérabilités', title: '14 licences M365 non utilisées assignées', severity: 'medium', status: 'in_progress',
      root_cause: 'Aucun processus de revue périodique des licences. Les comptes désactivés conservent leurs licences.',
      evidence: ['14 licences E3 assignées à des comptes inactifs > 90 jours', 'Coût mensuel : 560 $'],
      cost_of_inaction: 6720, cost_label: 'Surcoût annuel : 6 720 $',
      suggested_playbook: 'Optimisation licences M365', created_at: '2026-05-15T00:00:00' },
  ],
  'fw-loi25': [
    { id: 'nc-l01', control_ref: 'Art. 3.1', control_name: 'Responsable de la protection', title: 'Coordonnées DPO non publiées sur le site web', severity: 'medium', status: 'open',
      root_cause: 'La page de politique de confidentialité ne mentionne pas le nom et les coordonnées du responsable.',
      evidence: ['Audit site web 2026-06-18', 'Exigence Loi 25 art. 3.1'],
      cost_of_inaction: 5000, cost_label: 'Sanction potentielle Commission d\'accès : 5 000 $',
      suggested_playbook: 'Mise à jour politique de confidentialité', created_at: '2026-06-18T00:00:00' },
    { id: 'nc-l02', control_ref: 'Art. 13', control_name: 'Évaluation des facteurs relatifs à la vie privée', title: 'AIPVP manquante pour 2 nouveaux projets', severity: 'high', status: 'in_progress',
      root_cause: 'Processus d\'évaluation AIPVP non systématisé — déclenché manuellement uniquement pour les grands projets.',
      evidence: ['Projet CRM : AIPVP non réalisée', 'Projet portail RH : AIPVP en cours'],
      cost_of_inaction: 15000, cost_label: 'Risque d\'amende CAI : 15 000 $',
      suggested_playbook: 'Évaluation AIPVP', created_at: '2026-05-20T00:00:00' },
  ],
};

// ── Render ────────────────────────────────────────────────────────────────────

function _render() {
  if (!_container) return;

  // ── Aucune donnée réelle : ne jamais afficher de valeurs fictives ──────────
  if (_state.is_demo) {
    _container.innerHTML = `
      <div style="padding:32px;max-width:720px;margin:0 auto">
        <div role="alert" style="background:#FFF8E1;border:1px solid #F9A825;border-radius:8px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:flex-start;gap:14px">
          <div style="font-size:20px;flex-shrink:0;margin-top:1px">🔬</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:#7B4F00;margin-bottom:4px">Mode démonstration</div>
            <div style="font-size:12px;color:#8B6000;line-height:1.55;max-width:64ch">Aucune donnée de conformité réelle n'a été trouvée pour votre organisation. Configurez vos connecteurs ou importez un référentiel pour commencer l'évaluation.</div>
          </div>
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;background:#F9A825;color:#fff;border-radius:4px;flex-shrink:0;white-space:nowrap">DÉMO</div>
        </div>
        <div style="text-align:center;padding:52px 24px;background:#fff;border:1px solid #EDEBE9;border-radius:8px">
          <div style="font-size:52px;margin-bottom:16px">📋</div>
          <div style="font-size:18px;font-weight:700;color:#201F1E;margin-bottom:8px">Aucune donnée de conformité</div>
          <div style="font-size:13px;color:#605E5C;line-height:1.6;margin-bottom:8px;max-width:480px;margin-left:auto;margin-right:auto">
            Importez un référentiel (ISO 27001, Loi 25, SOC 2, ISO 42001) et configurez vos connecteurs pour calculer votre score de conformité réel.
          </div>
          <div style="font-size:12px;color:#A19F9D;margin-bottom:28px;max-width:420px;margin-left:auto;margin-right:auto">
            Votre score, vos non-conformités et votre coût de l'inaction seront calculés uniquement à partir de données vérifiées.
          </div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button onclick="document.dispatchEvent(new CustomEvent('ws:navigate',{detail:{appSlug:'help'},bubbles:true}))"
              style="padding:9px 18px;font-size:13px;font-weight:600;background:transparent;color:#0078D4;border:1.5px solid #0078D4;border-radius:4px;cursor:pointer;font-family:inherit">
              📋 Comment importer un référentiel
            </button>
            <button onclick="document.dispatchEvent(new CustomEvent('ws:navigate',{detail:{appSlug:'integrations'},bubbles:true}))"
              style="padding:9px 18px;font-size:13px;font-weight:700;background:#0078D4;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:inherit">
              🔌 Configurer les connecteurs →
            </button>
          </div>
        </div>
      </div>`;
    return;
  }

  const s = _state.summary || {};
  const trend = s.score_trend >= 0 ? `+${s.score_trend}` : `${s.score_trend}`;
  const trendColor = s.score_trend >= 0 ? '#107C10' : '#D83B01';
  const scoreColor = s.overall_score >= 80 ? '#107C10' : s.overall_score >= 60 ? '#986F0B' : '#D83B01';

  _container.innerHTML = `
    <div style="display:flex;height:100%;min-height:600px">

      <!-- Left sidebar: framework list -->
      <div style="width:220px;flex-shrink:0;background:#F3F2F1;border-right:1px solid #EDEBE9;padding:16px;overflow-y:auto">
        <div style="font-size:11px;font-weight:700;color:#605E5C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Référentiels</div>
        ${(_state.frameworks).map(_fwSideItem).join('')}
      </div>

      <!-- Main content -->
      <div style="flex:1;overflow-y:auto;padding:24px">

        ${_state.is_demo ? `
        <div role="alert" style="background:#FFF8E1;border:1px solid #F9A825;border-radius:8px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:14px">
          <div style="font-size:20px;flex-shrink:0;margin-top:1px">🔬</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:#7B4F00;margin-bottom:4px">Mode démonstration</div>
            <div style="font-size:12px;color:#8B6000;line-height:1.55;max-width:64ch">Les résultats affichés sont générés à des fins de démonstration et ne reflètent pas les données réelles de votre organisation.</div>
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
              <button onclick="document.dispatchEvent(new CustomEvent('ws:navigate',{detail:{appSlug:'help'},bubbles:true}))"
                style="padding:5px 12px;font-size:11px;font-weight:600;background:transparent;color:#7B4F00;border:1.5px solid #F9A825;border-radius:4px;cursor:pointer;font-family:inherit">
                Comprendre pourquoi
              </button>
              <button onclick="document.dispatchEvent(new CustomEvent('ws:navigate',{detail:{appSlug:'integrations'},bubbles:true}))"
                style="padding:5px 12px;font-size:11px;font-weight:700;background:#0078D4;color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:inherit">
                Configurer les connecteurs →
              </button>
            </div>
          </div>
          <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;background:#F9A825;color:#fff;border-radius:4px;flex-shrink:0;white-space:nowrap">DÉMO</div>
        </div>` : ''}

        <!-- Header KPIs -->
        <div style="display:grid;grid-template-columns:140px 1fr;gap:20px;margin-bottom:28px;align-items:center">
          <div style="text-align:center;background:#fff;border:1px solid #EDEBE9;border-radius:8px;padding:16px">
            <div style="font-size:40px;font-weight:700;color:${scoreColor}">${s.overall_score}</div>
            <div style="font-size:11px;color:#605E5C;margin-top:2px">Score global</div>
            <div style="font-size:13px;font-weight:600;color:${trendColor};margin-top:4px">${trend > 0 ? '▲' : s.score_trend < 0 ? '▼' : '—'} ${trend}pts</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
            ${_mini('Contrôles', s.controls_compliant + '/' + s.controls_total, '#0078D4')}
            ${_mini('NC ouvertes', s.nonconformites_open, '#CA5010')}
            ${_mini('Critiques', s.nonconformites_critical, '#D83B01')}
            ${_mini('Exposition', _fmtMoney(s.cost_of_inaction_total), '#986F0B')}
          </div>
        </div>

        ${_renderActiveFw()}
      </div>
    </div>`;

  _container.querySelectorAll('.fw-side-item').forEach(el => {
    el.addEventListener('click', async () => {
      _state.activeFw = el.dataset.id;
      _state.expandedNc = null;
      _state.loading = true;
      _render();
      await _loadNc();
    });
  });

  _container.querySelectorAll('.nc-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      _state.expandedNc = _state.expandedNc === id ? null : id;
      _render();
    });
  });

  _container.querySelectorAll('.nc-remediate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      _showActionPlanDialog(btn.dataset.id, btn.dataset.title);
    });
  });

  _container.querySelectorAll('.nc-resolve-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await _resolveNc(btn.dataset.id);
    });
  });
}

function _fwSideItem(fw) {
  const isActive = fw.id === _state.activeFw;
  const scoreColor = fw.score >= 80 ? '#107C10' : fw.score >= 60 ? '#986F0B' : '#D83B01';
  return `
    <div class="fw-side-item" data-id="${fw.id}"
      style="display:flex;align-items:center;gap:8px;padding:10px;border-radius:4px;cursor:pointer;margin-bottom:4px;background:${isActive ? '#E1DFDD' : 'transparent'};border-left:${isActive ? '3px solid #0078D4' : '3px solid transparent'}"
      onmouseenter="this.style.background='${isActive ? '#E1DFDD' : '#E8E6E4'}'"
      onmouseleave="this.style.background='${isActive ? '#E1DFDD' : 'transparent'}'">
      <span style="font-size:16px">${fw.icon || FW_ICONS[fw.id] || '📋'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600;color:#201F1E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${fw.name}</div>
        <div style="font-size:11px;font-weight:700;color:${scoreColor}">${fw.score}%</div>
      </div>
    </div>`;
}

function _renderActiveFw() {
  const fw = _state.frameworks.find(f => f.id === _state.activeFw);
  if (!fw) return '<div style="color:#797775;text-align:center;padding:40px">Sélectionner un référentiel</div>';
  if (_state.loading) return '<div style="color:#797775;text-align:center;padding:40px">Chargement…</div>';

  const nc = _state.nonconformites;
  return `
    <!-- Framework header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <span style="font-size:28px">${fw.icon || '📋'}</span>
      <div>
        <h3 style="margin:0;font-size:18px;font-weight:600">${fw.name}</h3>
        <div style="font-size:12px;color:#605E5C;margin-top:2px">
          ${fw.controls_compliant}/${fw.controls_total} contrôles conformes ·
          ${nc.length} non-conformité${nc.length !== 1 ? 's' : ''} ouverte${nc.length !== 1 ? 's' : ''}
          ${fw.last_assessed_at ? ` · Évalué le ${_fmtDate(fw.last_assessed_at)}` : ''}
        </div>
      </div>
    </div>

    <!-- Domain bars -->
    ${fw.domains ? `
      <div style="background:#fff;border:1px solid #EDEBE9;border-radius:6px;padding:16px;margin-bottom:20px">
        <div style="font-size:12px;font-weight:700;color:#605E5C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px">Domaines</div>
        ${(fw.domains || []).map(_domainBar).join('')}
      </div>` : ''}

    <!-- Causal chain: non-conformités -->
    ${nc.length > 0 ? `
      <div>
        <div style="font-size:12px;font-weight:700;color:#605E5C;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">
          Chaîne causale — ${nc.length} non-conformité${nc.length !== 1 ? 's' : ''}
        </div>
        ${nc.map(_ncCard).join('')}
      </div>
    ` : `<div style="background:#DFF6DD;border:1px solid #107C10;border-radius:6px;padding:20px;text-align:center;color:#107C10;font-weight:600">✅ Aucune non-conformité ouverte pour ce référentiel</div>`}
  `;
}

function _domainBar(domain) {
  const color = domain.score >= 80 ? '#107C10' : domain.score >= 60 ? '#986F0B' : '#D83B01';
  return `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:#201F1E">${domain.name}</span>
        <span style="display:flex;gap:10px;color:#605E5C">
          <span>${domain.controls} contrôles</span>
          ${domain.gaps > 0 ? `<span style="color:#D83B01">${domain.gaps} écart${domain.gaps > 1 ? 's' : ''}</span>` : '<span style="color:#107C10">✓ conforme</span>'}
          <b style="color:${color}">${domain.score}%</b>
        </span>
      </div>
      <div style="height:6px;background:#EDEBE9;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${domain.score}%;background:${color};border-radius:3px;transition:width 0.6s ease"></div>
      </div>
    </div>`;
}

function _ncCard(nc) {
  const sm = SEVERITY_META[nc.severity] || SEVERITY_META.medium;
  const st = STATUS_NC[nc.status] || STATUS_NC.open;
  const isExpanded = _state.expandedNc === nc.id;

  return `
    <div class="nc-card" data-id="${nc.id}"
      style="background:#fff;border:1px solid ${sm.color};border-radius:6px;margin-bottom:10px;cursor:pointer;overflow:hidden">

      <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px">
        <div style="width:8px;height:8px;border-radius:50%;background:${sm.color};flex-shrink:0;margin-top:5px"></div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-size:11px;font-weight:700;color:#605E5C">${nc.control_ref}</span>
            <span style="font-size:11px;color:#605E5C">${nc.control_name}</span>
            <span style="background:${sm.bg};color:${sm.color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px">${sm.label}</span>
            <span style="background:${st.color}22;color:${st.color};font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px">${st.label}</span>
          </div>
          <div style="font-size:14px;font-weight:600;color:#201F1E;margin-bottom:6px">${nc.title}</div>
          <div style="display:flex;gap:16px;font-size:12px;color:#605E5C">
            ${nc.cost_of_inaction ? `<span style="color:#D83B01;font-weight:600">⚠ ${_fmtMoney(nc.cost_of_inaction)}</span>` : ''}
            ${nc.suggested_playbook ? `<span>📋 ${nc.suggested_playbook}</span>` : ''}
          </div>
        </div>
        <span style="color:#A19F9D;font-size:16px;flex-shrink:0">${isExpanded ? '▲' : '▼'}</span>
      </div>

      ${isExpanded ? _ncExpanded(nc) : ''}
    </div>`;
}

function _ncExpanded(nc) {
  return `
    <div style="border-top:1px solid #EDEBE9;padding:16px;background:#FAFAFA">

      <!-- Cause racine -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:#605E5C;text-transform:uppercase;margin-bottom:6px">🔍 Cause racine</div>
        <div style="font-size:13px;color:#3B3A39;line-height:1.5;background:#fff;border-left:3px solid #0078D4;padding:10px 12px;border-radius:0 4px 4px 0">${nc.root_cause}</div>
      </div>

      <!-- Preuves -->
      ${nc.evidence && nc.evidence.length > 0 ? `
        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:#605E5C;text-transform:uppercase;margin-bottom:6px">📎 Preuves</div>
          <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#3B3A39;line-height:1.8">
            ${(nc.evidence || []).map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>` : ''}

      <!-- Coût de l'inaction -->
      ${nc.cost_of_inaction ? `
        <div style="background:#FDE7E9;border-radius:6px;padding:12px 14px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">💸</span>
          <div>
            <div style="font-size:11px;font-weight:700;color:#D83B01;text-transform:uppercase">Coût de l'inaction</div>
            <div style="font-size:14px;font-weight:600;color:#201F1E">${nc.cost_label || _fmtMoney(nc.cost_of_inaction)}</div>
          </div>
        </div>` : ''}

      <!-- Actions -->
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="nc-remediate-btn" data-id="${nc.id}" data-title="${nc.title}"
          style="background:#0078D4;color:#fff;border:none;border-radius:4px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">
          ▶ Lancer la remédiation
        </button>
        ${nc.status !== 'resolved' ? `
          <button class="nc-resolve-btn" data-id="${nc.id}"
            style="background:#DFF6DD;color:#107C10;border:1px solid #107C10;border-radius:4px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer">
            ✓ Marquer résolue
          </button>` : ''}
      </div>
    </div>`;
}

function _showActionPlanDialog(ncId, ncTitle) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center';
  d.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:28px;width:500px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <h3 style="margin:0 0 6px;font-size:18px">Plan d'action</h3>
      <p style="margin:0 0 20px;font-size:13px;color:#605E5C">${ncTitle}</p>
      <div style="margin-bottom:14px">
        <label style="display:block;font-size:12px;font-weight:600;color:#605E5C;margin-bottom:4px">Titre du plan *</label>
        <input id="ap-title" placeholder="Ex: Activer MFA sur tous les comptes" style="width:100%;border:1px solid #EDEBE9;border-radius:4px;padding:8px;font-size:13px;box-sizing:border-box">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#605E5C;margin-bottom:4px">Responsable</label>
          <input id="ap-owner" placeholder="Ex: RSSI" style="width:100%;border:1px solid #EDEBE9;border-radius:4px;padding:8px;font-size:13px;box-sizing:border-box">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#605E5C;margin-bottom:4px">Échéance</label>
          <input id="ap-date" type="date" style="width:100%;border:1px solid #EDEBE9;border-radius:4px;padding:8px;font-size:13px;box-sizing:border-box">
        </div>
      </div>
      <div style="margin-bottom:20px">
        <label style="display:block;font-size:12px;font-weight:600;color:#605E5C;margin-bottom:4px">Description</label>
        <textarea id="ap-desc" rows="3" style="width:100%;border:1px solid #EDEBE9;border-radius:4px;padding:8px;font-size:13px;box-sizing:border-box;resize:vertical"></textarea>
      </div>
      <div id="ap-err" style="display:none;color:#D83B01;font-size:13px;margin-bottom:12px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="ap-cancel" style="background:#F3F2F1;border:none;border-radius:4px;padding:8px 16px;font-size:13px;cursor:pointer">Annuler</button>
        <button id="ap-create" style="background:#0078D4;color:#fff;border:none;border-radius:4px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">Créer le plan</button>
      </div>
    </div>`;
  document.body.appendChild(d);
  d.querySelector('#ap-cancel').onclick = () => document.body.removeChild(d);
  d.querySelector('#ap-create').onclick = async () => {
    const title = d.querySelector('#ap-title').value.trim();
    if (!title) { d.querySelector('#ap-err').textContent = 'Titre requis'; d.querySelector('#ap-err').style.display = 'block'; return; }
    const btn = d.querySelector('#ap-create');
    btn.disabled = true; btn.textContent = 'Création…';
    try {
      await _fetch(`/api/conformite/nonconformites/${ncId}/action-plan`, {
        method: 'POST',
        body: JSON.stringify({ title, owner: d.querySelector('#ap-owner').value, due_date: d.querySelector('#ap-date').value, description: d.querySelector('#ap-desc').value }),
      });
      document.body.removeChild(d);
      _state.expandedNc = null;
      _loadNc();
    } catch {
      d.querySelector('#ap-err').textContent = 'Erreur lors de la création. Veuillez réessayer.';
      d.querySelector('#ap-err').style.display = 'block';
      btn.disabled = false; btn.textContent = 'Créer le plan';
    }
  };
}

async function _resolveNc(ncId) {
  try {
    await _fetch(`/api/conformite/nonconformites/${ncId}/resolve`, { method: 'POST', body: JSON.stringify({ resolution_note: 'Résolution manuelle' }) });
    _state.nonconformites = _state.nonconformites.filter(nc => nc.id !== ncId);
    _state.expandedNc = null;
    _render();
  } catch {
    alert('Erreur lors de la résolution.');
  }
}

function _mini(label, value, color) {
  return `
    <div style="background:#fff;border:1px solid #EDEBE9;border-radius:6px;padding:12px 14px">
      <div style="font-size:18px;font-weight:700;color:${color}">${value}</div>
      <div style="font-size:11px;color:#605E5C;margin-top:2px">${label}</div>
    </div>`;
}

function _fmtMoney(n) {
  if (!n) return '—';
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}

function _fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default {
  mount(container, ctx) {
    _container = container;
    _state.token = ctx?.token || localStorage.getItem('nexhire_token');
    _state.activeFw = null;
    _state.expandedNc = null;
    _state.loading = true;
    _load();
  },
  unmount(container) {
    if (container) container.innerHTML = '';
    _container = null;
  },
};
