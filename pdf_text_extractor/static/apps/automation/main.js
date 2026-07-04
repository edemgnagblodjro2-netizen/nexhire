/**
 * AgentHub Platform — Automatisation
 * Workflows, déclencheurs, exécutions et bibliothèque de modèles.
 * API: GET /api/orchestrations  POST /api/orchestrations  POST /api/orchestrations/{id}/run
 */

const _CSS_ID = 'aut-css';
const _tok = () => localStorage.getItem('nexhire_token') || '';
const _api = async (path, opts = {}) => {
  const r = await fetch(path, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${_tok()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || r.statusText); }
  return r.json();
};
const _fmtDate = (s) => s ? new Date(s).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.aut{padding:28px 32px;max-width:1100px;margin:0 auto;font-family:var(--font);animation:ds-fade-in .25s ease}
.aut-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
.aut-hd-left{display:flex;align-items:center;gap:14px}
.aut-logo{width:42px;height:42px;border-radius:var(--r-lg);background:linear-gradient(135deg,#6d28d9,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0}
.aut-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.aut-sub{font-size:13px;color:var(--muted);margin:2px 0 0}
.aut-hd-actions{display:flex;gap:8px}

.aut-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.aut-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.aut-kpi-icon{font-size:20px;margin-bottom:8px}
.aut-kpi-val{font-size:22px;font-weight:800;color:var(--text);line-height:1}
.aut-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.aut-kpi-sub{font-size:12px;font-weight:600;margin-top:5px}
.aut-kpi-sub.ok{color:#16a34a}.aut-kpi-sub.warn{color:#d97706}.aut-kpi-sub.err{color:#dc2626}

.aut-tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:24px}
.aut-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-sub);cursor:pointer;font-family:inherit;transition:color .15s;margin-bottom:-1px;white-space:nowrap}
.aut-tab:hover:not(.active){color:var(--text-2)}
.aut-tab.active{color:var(--primary);border-bottom-color:var(--primary)}

.aut-toolbar{display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap}
.aut-search{flex:1;min-width:200px;padding:8px 12px;border:1px solid var(--border);border-radius:var(--r);font-size:13px;font-family:inherit;outline:none;background:var(--card);color:var(--text)}
.aut-search:focus{border-color:var(--primary)}
.aut-select{padding:7px 10px;border:1px solid var(--border);border-radius:var(--r);font-size:12px;font-family:inherit;outline:none;background:var(--card);color:var(--text);cursor:pointer}

.aut-btn{padding:7px 16px;border-radius:var(--r);font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
.aut-btn-primary{background:var(--primary);color:#fff}.aut-btn-primary:hover{opacity:.85}
.aut-btn-outline{background:var(--card);color:var(--text-2);border:1px solid var(--border)}.aut-btn-outline:hover{border-color:var(--primary);color:var(--primary)}
.aut-btn-ok{background:#dcfce7;color:#16a34a}.aut-btn-ok:hover{background:#bbf7d0}
.aut-btn-ghost{background:transparent;color:var(--text-2);border:none;padding:6px 10px}.aut-btn-ghost:hover{background:var(--bg-2)}

/* Workflow cards */
.aut-wf-grid{display:flex;flex-direction:column;gap:10px}
.aut-wf-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 20px;display:flex;align-items:center;gap:16px;transition:box-shadow .15s}
.aut-wf-card:hover{box-shadow:var(--shadow)}
.aut-wf-icon{width:40px;height:40px;border-radius:var(--r-lg);background:linear-gradient(135deg,#ede9fe,#ddd6fe);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.aut-wf-body{flex:1;min-width:0}
.aut-wf-name{font-size:14px;font-weight:700;color:var(--text);margin:0 0 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aut-wf-meta{font-size:12px;color:var(--muted);display:flex;gap:12px;flex-wrap:wrap}
.aut-wf-status{flex-shrink:0;display:flex;align-items:center;gap:8px}
.aut-status{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:var(--r-pill)}
.aut-status.active{background:#dcfce7;color:#16a34a}
.aut-status.paused{background:#fef9c3;color:#a16207}
.aut-status.draft{background:var(--bg-2);color:var(--muted)}
.aut-status.error{background:#fee2e2;color:#dc2626}

/* Table */
.aut-table-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}
.aut-table-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.aut-table-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}
.aut-table{width:100%;border-collapse:collapse;font-size:12px}
.aut-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:0 14px 10px;border-bottom:1px solid var(--border)}
.aut-table td{padding:11px 14px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.aut-table tr:last-child td{border-bottom:none}
.aut-table tr:hover td{background:var(--bg-2)}

/* Templates */
.aut-tmpl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.aut-tmpl{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;display:flex;flex-direction:column;gap:10px;cursor:pointer;transition:box-shadow .15s,border-color .15s}
.aut-tmpl:hover{box-shadow:var(--shadow);border-color:var(--primary)}
.aut-tmpl-icon{font-size:28px}
.aut-tmpl-name{font-size:13px;font-weight:700;color:var(--text)}
.aut-tmpl-desc{font-size:12px;color:var(--muted);line-height:1.45;flex:1}
.aut-tmpl-tag{align-self:flex-start;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill);background:var(--bg-2);color:var(--muted)}

/* Atlas */
.aut-atlas{background:linear-gradient(135deg,var(--primary-lt),#fff);border:1px solid var(--primary-a20);border-radius:var(--r-xl);padding:20px 24px;margin-bottom:24px}
.aut-atlas-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.aut-atlas-icon{font-size:22px}
.aut-atlas-title{font-size:14px;font-weight:700;color:var(--text)}
.aut-atlas-list{display:flex;flex-direction:column;gap:7px}
.aut-atlas-item{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--text-body);line-height:1.45}
.aut-atlas-dot{width:6px;height:6px;border-radius:50%;background:var(--primary);margin-top:5px;flex-shrink:0}

/* New workflow form */
.aut-new-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden}
.aut-new-card-hd{padding:16px 20px;border-bottom:1px solid var(--border);font-size:14px;font-weight:700;color:var(--text)}
.aut-new-card-body{padding:24px}
.aut-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.aut-form-full{grid-column:1/-1}
.aut-form-field{display:flex;flex-direction:column;gap:5px}
.aut-form-label{font-size:12px;font-weight:600;color:var(--text-2)}
.aut-form-input,.aut-form-select,.aut-form-textarea{border:1px solid var(--border);border-radius:var(--r);padding:8px 12px;font-size:13px;color:var(--text);font-family:inherit;background:var(--card);outline:none;transition:border-color .15s;width:100%;box-sizing:border-box}
.aut-form-input:focus,.aut-form-select:focus,.aut-form-textarea:focus{border-color:var(--primary)}
.aut-form-textarea{resize:vertical;min-height:72px}
.aut-form-actions{display:flex;gap:8px;margin-top:20px}

/* Empty */
.aut-empty{text-align:center;padding:56px 20px}
.aut-empty-icon{font-size:52px;margin-bottom:14px}
.aut-empty-title{font-size:17px;font-weight:700;color:var(--text);margin:0 0 8px}
.aut-empty-desc{font-size:13px;color:var(--muted);max-width:380px;margin:0 auto 20px;line-height:1.6}
.aut-empty-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}

@media(max-width:768px){
  .aut{padding:16px}
  .aut-kpis{grid-template-columns:repeat(2,1fr)}
  .aut-tmpl-grid{grid-template-columns:1fr}
  .aut-form-grid{grid-template-columns:1fr}
}
`;
  document.head.appendChild(s);
}

let _st = null;

const TEMPLATES = [
  { icon: '📧', name: 'Notification après diagnostic', desc: 'Envoie automatiquement le rapport PDF à l\'entreprise dès que le diagnostic est complété.', tag: 'Diagnostic', trigger: 'diagnostic.completed' },
  { icon: '📅', name: 'Rappel relance cohorte', desc: 'Rappelle aux entreprises non complétées de finir leur diagnostic 7 jours avant la clôture de la cohorte.', tag: 'Cohorte', trigger: 'schedule.weekly' },
  { icon: '📊', name: 'Synchronisation CRM', desc: 'Crée une fiche dans HubSpot / Salesforce dès qu\'un membre complète le diagnostic.', tag: 'CRM', trigger: 'diagnostic.completed' },
  { icon: '✅', name: 'Approbation gouvernance', desc: 'Déclenche un flux d\'approbation Teams quand une politique IA est générée et soumise pour révision.', tag: 'Gouvernance', trigger: 'policy.submitted' },
  { icon: '🔔', name: 'Alerte anomalie score IMAI', desc: 'Alerte l\'équipe si un score IMAI passe sous le seuil critique (< 20) pour intervention rapide.', tag: 'Risque', trigger: 'score.threshold' },
  { icon: '🔄', name: 'Export hebdomadaire cohorte', desc: 'Génère et envoie chaque lundi un rapport CSV consolidé de la cohorte avec les indicateurs clés.', tag: 'Rapport', trigger: 'schedule.weekly' },
  { icon: '👋', name: 'Accueil nouveau membre', desc: 'Envoie un courriel de bienvenue personnalisé et crée le workspace dès qu\'un nouveau membre s\'inscrit.', tag: 'Onboarding', trigger: 'user.created' },
  { icon: '📝', name: 'Résumé hebdomadaire', desc: 'Génère et distribue chaque vendredi un résumé IA des décisions, actions et alertes de la semaine.', tag: 'IA', trigger: 'schedule.weekly' },
  { icon: '🛡️', name: 'Alerte sécurité', desc: 'Notifie l\'administrateur et ouvre un ticket ServiceNow lors de la détection d\'un incident de sécurité.', tag: 'Sécurité', trigger: 'security.incident' },
];

// Pas de données fictives — les exécutions viennent de /api/orchestrations/{id}/runs

const TRIGGERS = [
  { id: 'diagnostic.completed', label: 'Diagnostic complété', icon: '📋', category: 'AgentHub', active: false },
  { id: 'schedule.weekly', label: 'Planification hebdomadaire', icon: '📅', category: 'Planification', active: false },
  { id: 'user.created', label: 'Nouveau membre inscrit', icon: '👤', category: 'AgentHub', active: false },
  { id: 'policy.submitted', label: 'Politique soumise pour révision', icon: '📝', category: 'Gouvernance', active: false },
  { id: 'score.threshold', label: 'Score sous le seuil critique', icon: '⚠️', category: 'Alertes', active: false },
  { id: 'security.incident', label: 'Incident de sécurité détecté', icon: '🛡️', category: 'Sécurité', active: false },
  { id: 'budget.overrun', label: 'Dépassement budgétaire', icon: '💰', category: 'Finance', active: false },
  { id: 'contract.expiring', label: 'Contrat expirant bientôt', icon: '📜', category: 'Contrats', active: false },
];

function _renderAtlas() {
  return `<div class="aut-atlas">
  <div class="aut-atlas-hd"><span class="aut-atlas-icon">🤖</span><div class="aut-atlas-title">ATLAS recommande</div></div>
  <div class="aut-atlas-list">
    <div class="aut-atlas-item"><span class="aut-atlas-dot"></span>Commencez par le workflow <strong>Notification après diagnostic</strong> — il élimine la communication manuelle la plus fréquente et prend moins de 3 minutes à configurer.</div>
    <div class="aut-atlas-item"><span class="aut-atlas-dot"></span>Activez l'export hebdomadaire pour la direction — les données cohorte livrées automatiquement chaque lundi augmentent l'engagement des parties prenantes.</div>
    <div class="aut-atlas-item"><span class="aut-atlas-dot"></span>Configurez l'alerte de score IMAI pour détecter les PME en difficulté avant qu'elles abandonnent leur parcours d'adoption IA.</div>
  </div>
</div>`;
}

async function _loadWorkflows() {
  try {
    const data = await _api('/api/orchestrations');
    return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
  } catch { return []; }
}

function _wfCard(wf) {
  const statusMap = { active: 'Actif', paused: 'En pause', draft: 'Brouillon', error: 'Erreur' };
  const st = wf.status || 'draft';
  return `<div class="aut-wf-card">
    <div class="aut-wf-icon">⚡</div>
    <div class="aut-wf-body">
      <div class="aut-wf-name">${wf.name || wf.title || 'Workflow sans titre'}</div>
      <div class="aut-wf-meta">
        <span>Déclencheur : ${wf.trigger_type || wf.trigger || '—'}</span>
        <span>Dernière exécution : ${_fmtDate(wf.last_run_at || wf.updated_at)}</span>
      </div>
    </div>
    <div class="aut-wf-status">
      <span class="aut-status ${st}">${statusMap[st] || st}</span>
      <button class="aut-btn aut-btn-ghost" title="Exécuter maintenant" onclick="window._autRun('${wf.id}')">▶</button>
    </div>
  </div>`;
}

function _renderWorkflows(container, workflows) {
  if (!workflows.length) {
    container.innerHTML = `${_renderAtlas()}
<div class="aut-toolbar">
  <input class="aut-search" placeholder="Rechercher un workflow..." type="text">
  <button class="aut-btn aut-btn-primary" onclick="document.querySelector('[data-tab=new]')?.click()">+ Nouveau workflow</button>
</div>
<div class="aut-empty">
  <div class="aut-empty-icon">⚡</div>
  <div class="aut-empty-title">Aucun workflow configuré</div>
  <div class="aut-empty-desc">Automatisez vos processus répétitifs pour gagner du temps et réduire les erreurs. Commencez avec un modèle ou créez votre propre workflow.</div>
  <div class="aut-empty-btns">
    <button class="aut-btn aut-btn-primary" onclick="document.querySelector('[data-tab=templates]')?.click()">Parcourir les modèles</button>
    <button class="aut-btn aut-btn-outline" onclick="document.querySelector('[data-tab=new]')?.click()">Créer un workflow</button>
  </div>
</div>`;
    return;
  }
  container.innerHTML = `${_renderAtlas()}
<div class="aut-toolbar">
  <input class="aut-search" placeholder="Rechercher un workflow..." type="text" id="aut-wf-search">
  <select class="aut-select">
    <option value="">Tous les états</option>
    <option value="active">Actif</option>
    <option value="paused">En pause</option>
    <option value="draft">Brouillon</option>
    <option value="error">Erreur</option>
  </select>
  <button class="aut-btn aut-btn-outline">Exporter</button>
  <button class="aut-btn aut-btn-primary" onclick="document.querySelector('[data-tab=new]')?.click()">+ Nouveau workflow</button>
</div>
<div class="aut-wf-grid" id="aut-wf-list">
  ${workflows.map(_wfCard).join('')}
</div>`;
}

function _renderTriggers(container) {
  container.innerHTML = `${_renderAtlas()}
<p style="font-size:13px;color:var(--muted);margin:0 0 20px;line-height:1.6">
  Les déclencheurs définissent quand un workflow s'exécute automatiquement. Activez ceux dont vous avez besoin.
</p>
<div style="display:flex;flex-direction:column;gap:10px">
  ${TRIGGERS.map(t => `
  <div class="aut-wf-card">
    <div class="aut-wf-icon">${t.icon}</div>
    <div class="aut-wf-body">
      <div class="aut-wf-name">${t.label}</div>
      <div class="aut-wf-meta"><span>Catégorie : ${t.category}</span><span>ID : <code style="font-size:11px;color:var(--muted)">${t.id}</code></span></div>
    </div>
    <div class="aut-wf-status">
      <div class="sso-toggle-track ${t.active ? 'on' : ''}" style="width:36px;height:20px;border-radius:99px;background:${t.active ? 'var(--primary)' : 'var(--bg-2)'};cursor:pointer;position:relative;border:1px solid var(--border)" onclick="this.classList.toggle('on');this.style.background=this.classList.contains('on')?'var(--primary)':'var(--bg-2)'">
        <div style="width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);transform:${t.active ? 'translateX(16px)' : 'none'}"></div>
      </div>
    </div>
  </div>`).join('')}
</div>`;
}

async function _renderRuns(container) {
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)"><div class="ds-spinner"></div><div style="margin-top:10px;font-size:13px">Chargement des workflows…</div></div>';

  let workflows = _st._wfCache;
  if (!workflows) { workflows = await _loadWorkflows(); _st._wfCache = workflows; }

  if (!workflows.length) {
    container.innerHTML = `<div class="aut-empty">
      <div class="aut-empty-icon">⚡</div>
      <div class="aut-empty-title">Aucun workflow à afficher</div>
      <div class="aut-empty-desc">Créez un workflow pour commencer à voir son historique d'exécutions ici.</div>
      <div class="aut-empty-btns"><button class="aut-btn aut-btn-primary" onclick="document.querySelector('[data-tab=new]')?.click()">+ Nouveau workflow</button></div>
    </div>`;
    return;
  }

  const firstId = workflows[0].id;
  const firstName = workflows[0].name || workflows[0].title || 'Workflow';

  const _loadRuns = async (wfId, wfName) => {
    const tbody = document.getElementById('aut-runs-tbody');
    const title = document.getElementById('aut-runs-title');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--muted)">Chargement…</td></tr>';
    try {
      const data = await _api(`/api/orchestrations/${wfId}/runs`);
      const runs = data.runs || [];
      if (title) title.textContent = `Exécutions — ${wfName} (${runs.length})`;
      if (!runs.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--muted)">Aucune exécution enregistrée pour ce workflow.</td></tr>';
        return;
      }
      tbody.innerHTML = runs.map(r => {
        const isOk = r.status === 'success' || r.status === 'ok';
        const dur = (r.duration_ms != null) ? (r.duration_ms / 1000).toFixed(1) + 's' : '—';
        return `<tr>
          <td style="color:var(--muted);white-space:nowrap">${_fmtDate(r.created_at || r.started_at)}</td>
          <td style="color:var(--muted);font-family:monospace;font-size:11px">${r.trigger_type || '—'}</td>
          <td style="color:var(--muted)">${dur}</td>
          <td><span style="display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:${isOk ? '#dcfce7' : '#fee2e2'};color:${isOk ? '#16a34a' : '#dc2626'}">${isOk ? '✓ Succès' : '✕ Erreur'}</span></td>
          <td style="color:var(--muted);font-size:11px">${r.error_message ? r.error_message.slice(0,60) : '—'}</td>
        </tr>`;
      }).join('');
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="padding:16px;color:#dc2626">${e.message}</td></tr>`;
    }
  };

  container.innerHTML = `
<div class="aut-toolbar" style="margin-bottom:18px">
  <select class="aut-select" id="aut-runs-wf-select" style="flex:1;max-width:340px">
    ${workflows.map(w => `<option value="${w.id}">${w.name || w.title || 'Workflow'}</option>`).join('')}
  </select>
</div>
<div class="aut-table-card">
  <div class="aut-table-card-hd"><h3 id="aut-runs-title">Exécutions</h3></div>
  <div style="overflow-x:auto">
    <table class="aut-table">
      <thead><tr><th>Date</th><th>Déclencheur</th><th>Durée</th><th>Résultat</th><th>Détail</th></tr></thead>
      <tbody id="aut-runs-tbody"><tr><td colspan="5" style="padding:24px;text-align:center;color:var(--muted)">Chargement…</td></tr></tbody>
    </table>
  </div>
</div>`;

  const sel = document.getElementById('aut-runs-wf-select');
  sel?.addEventListener('change', () => {
    const wf = workflows.find(w => w.id === sel.value);
    _loadRuns(sel.value, wf?.name || sel.value);
  });

  _loadRuns(firstId, firstName);
}

function _renderTemplates(container) {
  container.innerHTML = `${_renderAtlas()}
<div class="aut-toolbar" style="margin-bottom:18px">
  <input class="aut-search" placeholder="Rechercher un modèle..." type="text" style="flex:1">
  <select class="aut-select">
    <option value="">Toutes les catégories</option>
    <option>Diagnostic</option>
    <option>Cohorte</option>
    <option>CRM</option>
    <option>Gouvernance</option>
    <option>Risque</option>
    <option>Rapport</option>
    <option>Onboarding</option>
    <option>Sécurité</option>
    <option>IA</option>
  </select>
</div>
<div class="aut-tmpl-grid">
  ${TEMPLATES.map(t => `
  <div class="aut-tmpl" onclick="window._autUseTemplate('${t.trigger}','${t.name.replace(/'/g,"\\'")}')">
    <div class="aut-tmpl-icon">${t.icon}</div>
    <div class="aut-tmpl-name">${t.name}</div>
    <div class="aut-tmpl-desc">${t.desc}</div>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <span class="aut-tmpl-tag">${t.tag}</span>
      <button class="aut-btn aut-btn-primary" style="font-size:11px;padding:5px 12px">Utiliser ce modèle →</button>
    </div>
  </div>`).join('')}
</div>`;

  window._autUseTemplate = (trigger, name) => {
    _st.view = 'new';
    _renderView();
    requestAnimationFrame(() => {
      const ni = document.getElementById('aut-new-name');
      const ti = document.getElementById('aut-new-trigger');
      if (ni) ni.value = name;
      if (ti) ti.value = trigger;
    });
  };
}

function _renderNew(container) {
  container.innerHTML = `
<div class="aut-new-card">
  <div class="aut-new-card-hd">⚡ Nouveau workflow</div>
  <div class="aut-new-card-body">
    <div class="aut-form-grid">
      <div class="aut-form-field aut-form-full">
        <label class="aut-form-label">Nom du workflow *</label>
        <input class="aut-form-input" id="aut-new-name" placeholder="Ex: Notification après diagnostic">
      </div>
      <div class="aut-form-field">
        <label class="aut-form-label">Déclencheur *</label>
        <select class="aut-form-select" id="aut-new-trigger">
          <option value="">-- Sélectionner --</option>
          ${TRIGGERS.map(t => `<option value="${t.id}">${t.icon} ${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="aut-form-field">
        <label class="aut-form-label">État initial</label>
        <select class="aut-form-select" id="aut-new-status">
          <option value="draft">Brouillon</option>
          <option value="active">Actif</option>
          <option value="paused">En pause</option>
        </select>
      </div>
      <div class="aut-form-field aut-form-full">
        <label class="aut-form-label">Description</label>
        <textarea class="aut-form-textarea" id="aut-new-desc" placeholder="Décrivez ce que fait ce workflow..."></textarea>
      </div>
    </div>
    <div style="margin:20px 0 0;padding:14px;background:var(--bg-2);border-radius:var(--r);font-size:12px;color:var(--muted);line-height:1.5">
      💡 <strong>Prochaine étape :</strong> Après avoir créé le workflow, vous pourrez ajouter des actions (envoyer un courriel, créer un ticket, appeler une API, etc.) via l'éditeur visuel.
    </div>
    <div class="aut-form-actions">
      <button class="aut-btn aut-btn-primary" onclick="window._autCreate()">Créer le workflow</button>
      <button class="aut-btn aut-btn-outline" onclick="_st.view='workflows';_renderView()">Annuler</button>
    </div>
  </div>
</div>`;

  window._autCreate = async () => {
    const name = document.getElementById('aut-new-name')?.value?.trim();
    const trigger = document.getElementById('aut-new-trigger')?.value;
    const status = document.getElementById('aut-new-status')?.value || 'draft';
    const desc = document.getElementById('aut-new-desc')?.value?.trim();
    if (!name || !trigger) { alert('Veuillez remplir le nom et le déclencheur.'); return; }
    try {
      await _api('/api/orchestrations', { method: 'POST', body: JSON.stringify({ name, trigger_type: trigger, status, description: desc }) });
      _st.view = 'workflows';
      _st._wfCache = null;
      _renderView();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };
}

async function _renderView() {
  const area = document.getElementById('aut-content');
  if (!area || !_st) return;
  const view = _st.view;
  document.querySelectorAll('.aut-tab[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === view));

  if (view === 'workflows') {
    area.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)"><div class="ds-spinner"></div><div style="margin-top:10px;font-size:13px">Chargement des workflows…</div></div>';
    if (!_st._wfCache) _st._wfCache = await _loadWorkflows();
    _renderWorkflows(area, _st._wfCache);
  } else if (view === 'triggers') {
    _renderTriggers(area);
  } else if (view === 'runs') {
    await _renderRuns(area);
  } else if (view === 'templates') {
    _renderTemplates(area);
  } else if (view === 'new') {
    _renderNew(area);
  }
}

function _renderShell(container) {
  container.innerHTML = `
<div class="aut">
  <div class="aut-hd">
    <div class="aut-hd-left">
      <div class="aut-logo">⚡</div>
      <div>
        <div class="aut-title">Automatisation</div>
        <div class="aut-sub">Workflows intelligents, déclencheurs et intégrations automatiques</div>
      </div>
    </div>
    <div class="aut-hd-actions">
      <button class="aut-btn aut-btn-outline" onclick="document.querySelector('[data-tab=templates]')?.click()">📚 Bibliothèque</button>
      <button class="aut-btn aut-btn-primary" onclick="document.querySelector('[data-tab=new]')?.click()">+ Nouveau workflow</button>
    </div>
  </div>

  <div class="aut-kpis">
    <div class="aut-kpi"><div class="aut-kpi-icon">⚡</div><div class="aut-kpi-val" id="aut-kpi-total">—</div><div class="aut-kpi-lbl">Workflows</div><div class="aut-kpi-sub" id="aut-kpi-active-sub">Chargement…</div></div>
    <div class="aut-kpi"><div class="aut-kpi-icon">✅</div><div class="aut-kpi-val" id="aut-kpi-success">—</div><div class="aut-kpi-lbl">Exécutions réussies</div><div class="aut-kpi-sub ok" id="aut-kpi-runs-sub">Total</div></div>
    <div class="aut-kpi"><div class="aut-kpi-icon">🔄</div><div class="aut-kpi-val" id="aut-kpi-total-runs">—</div><div class="aut-kpi-lbl">Total exécutions</div><div class="aut-kpi-sub ok">Depuis l'activation</div></div>
    <div class="aut-kpi"><div class="aut-kpi-icon">🕐</div><div class="aut-kpi-val" id="aut-last-run">—</div><div class="aut-kpi-lbl">Dernière exécution</div><div class="aut-kpi-sub ok">Workflow actif</div></div>
  </div>

  <div class="aut-tabs">
    <button class="aut-tab active" data-tab="workflows">Workflows</button>
    <button class="aut-tab" data-tab="runs">Exécutions</button>
    <button class="aut-tab" data-tab="templates">Bibliothèque de modèles</button>
    <button class="aut-tab" data-tab="new">+ Nouveau workflow</button>
  </div>

  <div id="aut-content"></div>
</div>`;

  container.querySelector('.aut-tabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab || !_st) return;
    _st.view = tab.dataset.tab;
    _renderView();
  });

  Promise.all([
    _api('/api/orchestrations/summary').catch(() => null),
    _loadWorkflows(),
  ]).then(([summary, wfs]) => {
    if (wfs.length) _st._wfCache = wfs;
    const s = summary || {};
    const _set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    _set('aut-kpi-total', s.total ?? wfs.length);
    _set('aut-kpi-success', s.total_success ?? '—');
    _set('aut-kpi-total-runs', s.total_runs ?? '—');
    const activeSub = document.getElementById('aut-kpi-active-sub');
    if (activeSub) { activeSub.textContent = `${s.active ?? 0} actif${(s.active ?? 0) > 1 ? 's' : ''}`; activeSub.className = 'aut-kpi-sub ok'; }
    const lastEl = document.getElementById('aut-last-run');
    if (lastEl) { const last = wfs.find(w => w.last_run_at); lastEl.textContent = last ? _fmtDate(last.last_run_at) : 'Aucune'; }
  });
}

window._autRun = async (id) => {
  try {
    await _api(`/api/orchestrations/${id}/run`, { method: 'POST' });
    alert('Workflow lancé avec succès.');
  } catch (err) { alert('Erreur : ' + err.message); }
};

export default {
  mount(container, ctx) {
    _css();
    _st = { ctx, view: 'workflows', _wfCache: null, container };
    _renderShell(container);
    _renderView();
  },
  unmount(container) {
    _st = null;
    container.innerHTML = '';
    ['_autRun', '_autCreate', '_autUseTemplate'].forEach(k => delete window[k]);
  },
  refresh(ctx) { if (_st) { _st.ctx = ctx || _st.ctx; _renderView(); } },
};
