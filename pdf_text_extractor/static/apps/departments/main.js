/**
 * Gestion des Départements
 * GET/POST/PATCH/DELETE /api/departments
 * GET /api/departments/templates | POST /api/departments/initialize
 */

const CSS = `<style>
.dept-root {
  padding: 28px 32px;
  max-width: 960px;
  margin: 0 auto;
}

.dept-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.dept-header h1 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.dept-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 24px;
}

.dept-tab {
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color .12s, border-color .12s;
  font-family: inherit;
}

.dept-tab:hover { color: #334155; }
.dept-tab.active { color: #6366f1; border-bottom-color: #6366f1; font-weight: 600; }

.dept-panel { display: none; }
.dept-panel.active { display: block; }

/* Toolbar */
.dept-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 10px;
  flex-wrap: wrap;
}

.dept-count {
  font-size: 13px;
  color: #64748b;
}

.dept-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background .12s, transform .1s;
}

.dept-btn:active { transform: scale(.97); }

.dept-btn-primary {
  background: #6366f1;
  color: #fff;
}
.dept-btn-primary:hover { background: #4f46e5; }

.dept-btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}
.dept-btn-secondary:hover { background: #e2e8f0; }

.dept-btn-danger {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}
.dept-btn-danger:hover { background: #fee2e2; }

/* Form */
.dept-form-wrap {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
}

.dept-form-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 16px;
}

.dept-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.dept-form-full { grid-column: 1 / -1; }

.dept-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 5px;
}

.dept-input, .dept-select, .dept-textarea {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  outline: none;
  transition: border-color .12s;
  box-sizing: border-box;
}

.dept-textarea { resize: vertical; min-height: 64px; }
.dept-input:focus, .dept-select:focus, .dept-textarea:focus { border-color: #6366f1; }

.dept-form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  justify-content: flex-end;
}

/* Error */
.dept-err {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #dc2626;
  margin-bottom: 14px;
}

/* Dept list */
.dept-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dept-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
  transition: border-color .12s;
}

.dept-row:hover { border-color: #c7d2fe; }
.dept-row.editing { border-color: #6366f1; }

.dept-row-icon {
  font-size: 22px;
  flex-shrink: 0;
  width: 36px;
  text-align: center;
}

.dept-row-info { flex: 1; min-width: 0; }

.dept-row-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.dept-row-meta {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dept-row-budget {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  flex-shrink: 0;
  text-align: right;
  min-width: 90px;
}

.dept-row-members {
  font-size: 12px;
  color: #64748b;
  flex-shrink: 0;
  text-align: center;
  width: 64px;
}

.dept-row-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.dept-icon-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: border-color .12s, background .12s;
}

.dept-icon-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
.dept-icon-btn.del:hover { background: #fef2f2; border-color: #fca5a5; }

/* Empty state */
.dept-empty {
  text-align: center;
  padding: 48px 24px;
  color: #94a3b8;
  background: #f8fafc;
  border-radius: 12px;
}

.dept-empty .icon { font-size: 32px; margin-bottom: 10px; }
.dept-empty strong { display: block; color: #475569; font-size: 15px; margin-bottom: 6px; }

/* Template tab */
.tmpl-org-select {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tmpl-org-select label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
}

.tmpl-preview {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.tmpl-preview-header {
  padding: 14px 18px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.tmpl-preview-list {
  padding: 8px 0;
  max-height: 340px;
  overflow-y: auto;
}

.tmpl-preview-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.tmpl-preview-item:last-child { border-bottom: none; }

.tmpl-preview-item-name {
  font-weight: 600;
  color: #0f172a;
  min-width: 200px;
}

.tmpl-preview-item-desc {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.tmpl-warn {
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #92400e;
  margin-bottom: 16px;
}

.tmpl-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.tmpl-result {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #166534;
  margin-top: 14px;
}

@media (max-width: 680px) {
  .dept-root { padding: 16px; }
  .dept-form-grid { grid-template-columns: 1fr; }
  .dept-row-budget, .dept-row-members { display: none; }
}
</style>`;

// ── Constants ─────────────────────────────────────────────────────────────────

const DEPT_TYPE_ICONS = {
  finance: '💰', hr: '👥', it: '💻', legal: '⚖️', operations: '⚙️',
  approvisionnement: '🛒', direction: '🏛️', comptabilite: '🧾',
  sales: '💼', support: '🎧', rd: '🔬', qualite: '✅',
  digitalisation: '⚡', logistique: '🚚', audit: '🔍', compliance: '🛡️',
  communication: '📢', manufacturing: '🏭', marketing: '📣', general: '📊',
};

const DEPT_TYPES = [
  { value: 'general',           label: 'Général' },
  { value: 'direction',         label: 'Direction Générale' },
  { value: 'finance',           label: 'Finance / Comptabilité' },
  { value: 'hr',                label: 'Ressources Humaines' },
  { value: 'it',                label: 'Technologies de l\'information' },
  { value: 'legal',             label: 'Juridique / Conformité' },
  { value: 'operations',        label: 'Opérations' },
  { value: 'approvisionnement', label: 'Approvisionnement / Achats' },
  { value: 'sales',             label: 'Ventes / Commercial' },
  { value: 'marketing',         label: 'Marketing / Communications' },
  { value: 'support',           label: 'Support client' },
  { value: 'rd',                label: 'R&D / Innovation' },
  { value: 'qualite',           label: 'Assurance qualité' },
  { value: 'logistique',        label: 'Logistique' },
  { value: 'audit',             label: 'Audit' },
  { value: 'compliance',        label: 'Conformité' },
  { value: 'digitalisation',    label: 'Digitalisation / IA' },
  { value: 'manufacturing',     label: 'Production / Fabrication' },
];

const ORG_TYPES = [
  { value: 'pme',          label: 'PME — Petite et Moyenne Entreprise' },
  { value: 'entreprise',   label: 'Entreprise privée' },
  { value: 'pmi',          label: 'PMI — Petite et Moyenne Industrie' },
  { value: 'entrepreneur', label: 'Entrepreneur / Micro-entreprise' },
  { value: 'municipalite', label: 'Municipalité' },
  { value: 'hopital',      label: 'Hôpital / Centre de santé' },
  { value: 'universite',   label: 'Université / Établissement' },
];

// ── State ──────────────────────────────────────────────────────────────────────

let _depts    = [];
let _form     = null; // { mode: 'create'|'edit', id?, data: {name,description,annual_budget,currency,dept_type} }
let _formErr  = null;
let _container = null;

// ── API ────────────────────────────────────────────────────────────────────────

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _hdrs(json = true) {
  const h = { Authorization: `Bearer ${_token()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function _loadDepts() {
  try {
    const r = await fetch('/api/departments', { headers: _hdrs(false), credentials: 'include' });
    if (!r.ok) throw new Error();
    _depts = await r.json();
  } catch (_) { _depts = []; }
}

async function _createDept(data) {
  const r = await fetch('/api/departments', {
    method: 'POST', headers: _hdrs(), credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Erreur ${r.status}`);
  }
  return r.json();
}

async function _updateDept(id, data) {
  const r = await fetch(`/api/departments/${id}`, {
    method: 'PATCH', headers: _hdrs(), credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Erreur ${r.status}`);
  }
  return r.json();
}

async function _deleteDept(id) {
  const r = await fetch(`/api/departments/${id}`, {
    method: 'DELETE', headers: _hdrs(false), credentials: 'include',
  });
  if (r.status === 403) throw new Error('Seul le propriétaire du compte peut supprimer un département.');
  if (!r.ok) throw new Error(`Erreur ${r.status}`);
}

async function _loadTemplate(orgType) {
  const r = await fetch(`/api/departments/templates?org_type=${orgType}`, {
    headers: _hdrs(false), credentials: 'include',
  });
  if (!r.ok) return null;
  return r.json();
}

async function _initializeDepts(orgType) {
  const r = await fetch(`/api/departments/initialize?org_type=${orgType}`, {
    method: 'POST', headers: _hdrs(false), credentials: 'include',
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Erreur ${r.status}`);
  }
  return r.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _deptIcon(type) { return DEPT_TYPE_ICONS[type] || '📊'; }

function _cur(n) {
  if (!n || n === 0) return '—';
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
  }).format(n);
}

// ── Form ──────────────────────────────────────────────────────────────────────

function _formHtml() {
  if (!_form) return '';
  const d = _form.data || {};
  const title = _form.mode === 'create' ? 'Nouveau département' : 'Modifier le département';
  return `
    <div class="dept-form-wrap">
      <div class="dept-form-title">${title}</div>
      ${_formErr ? `<div class="dept-err">${_formErr}</div>` : ''}
      <div class="dept-form-grid">
        <div class="dept-field">
          <label>Nom *</label>
          <input class="dept-input" id="df-name" value="${_esc(d.name || '')}" placeholder="Ex. Technologies de l'information" maxlength="100">
        </div>
        <div class="dept-field">
          <label>Type de département</label>
          <select class="dept-select" id="df-type">
            ${DEPT_TYPES.map(t => `<option value="${t.value}" ${d.dept_type === t.value ? 'selected' : ''}>${_deptIcon(t.value)} ${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="dept-field dept-form-full">
          <label>Description</label>
          <textarea class="dept-textarea" id="df-desc" placeholder="Rôle et responsabilités du département…">${_esc(d.description || '')}</textarea>
        </div>
        <div class="dept-field">
          <label>Budget annuel</label>
          <input class="dept-input" id="df-budget" type="number" min="0" value="${d.annual_budget || 0}" placeholder="0">
        </div>
        <div class="dept-field">
          <label>Devise</label>
          <select class="dept-select" id="df-currency">
            <option value="CAD" ${(d.currency || 'CAD') === 'CAD' ? 'selected' : ''}>CAD — Dollar canadien</option>
            <option value="USD" ${d.currency === 'USD' ? 'selected' : ''}>USD — Dollar américain</option>
            <option value="EUR" ${d.currency === 'EUR' ? 'selected' : ''}>EUR — Euro</option>
          </select>
        </div>
      </div>
      <div class="dept-form-actions">
        <button class="dept-btn dept-btn-secondary" id="df-cancel">Annuler</button>
        <button class="dept-btn dept-btn-primary" id="df-save">
          ${_form.mode === 'create' ? 'Créer le département' : 'Enregistrer'}
        </button>
      </div>
    </div>`;
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Tab 1: Départements ───────────────────────────────────────────────────────

function _renderDeptPanel(panel) {
  panel.innerHTML = `
    ${_formHtml()}
    <div class="dept-toolbar">
      <span class="dept-count">${_depts.length} département(s)</span>
      <button class="dept-btn dept-btn-primary" id="dept-new-btn">+ Nouveau département</button>
    </div>
    <div class="dept-list" id="dept-list">
      ${_depts.length === 0
        ? `<div class="dept-empty">
            <div class="icon">🏢</div>
            <strong>Aucun département configuré</strong>
            Créez des départements pour structurer votre organisation, ou utilisez l'onglet <em>Configuration rapide</em> pour partir d'un modèle.
          </div>`
        : _depts.map(d => `
          <div class="dept-row ${_form?.id === d.id ? 'editing' : ''}">
            <div class="dept-row-icon">${_deptIcon(d.dept_type)}</div>
            <div class="dept-row-info">
              <div class="dept-row-name">${_esc(d.name)}</div>
              <div class="dept-row-meta">${d.description ? _esc(d.description) : (d.dept_type || 'Général')}</div>
            </div>
            <div class="dept-row-members">
              <div style="font-weight:700;color:#334155">${d.member_count ?? 0}</div>
              <div style="font-size:11px;color:#94a3b8">membre(s)</div>
            </div>
            <div class="dept-row-budget">${_cur(d.annual_budget)}</div>
            <div class="dept-row-actions">
              <button class="dept-icon-btn" data-action="edit" data-id="${d.id}" title="Modifier">✏️</button>
              <button class="dept-icon-btn del" data-action="del" data-id="${d.id}" data-name="${_esc(d.name)}" title="Supprimer">🗑️</button>
            </div>
          </div>`).join('')}
    </div>`;

  // New dept button
  panel.querySelector('#dept-new-btn')?.addEventListener('click', () => {
    _form = { mode: 'create', data: { dept_type: 'general', currency: 'CAD', annual_budget: 0 } };
    _formErr = null;
    _renderDeptPanel(panel);
  });

  // Form events
  if (_form) {
    panel.querySelector('#df-cancel')?.addEventListener('click', () => {
      _form = null; _formErr = null;
      _renderDeptPanel(panel);
    });

    panel.querySelector('#df-save')?.addEventListener('click', async () => {
      const name  = panel.querySelector('#df-name')?.value.trim();
      const type  = panel.querySelector('#df-type')?.value;
      const desc  = panel.querySelector('#df-desc')?.value.trim();
      const budget = parseFloat(panel.querySelector('#df-budget')?.value || '0');
      const curr  = panel.querySelector('#df-currency')?.value;

      if (!name) { _formErr = 'Le nom du département est obligatoire.'; _renderDeptPanel(panel); return; }

      const payload = { name, description: desc || null, annual_budget: budget, currency: curr, dept_type: type };

      try {
        if (_form.mode === 'create') {
          await _createDept(payload);
        } else {
          await _updateDept(_form.id, payload);
        }
        _form = null; _formErr = null;
        await _loadDepts();
        _renderDeptPanel(panel);
      } catch (e) {
        _formErr = e.message;
        _renderDeptPanel(panel);
      }
    });
  }

  // Row action buttons
  panel.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const id     = btn.dataset.id;

      if (action === 'edit') {
        const dept = _depts.find(d => d.id === id);
        if (!dept) return;
        _form = { mode: 'edit', id, data: { ...dept } };
        _formErr = null;
        _renderDeptPanel(panel);

      } else if (action === 'del') {
        const name = btn.dataset.name;
        if (!confirm(`Supprimer le département « ${name} » ? Cette action est irréversible.`)) return;
        try {
          await _deleteDept(id);
          await _loadDepts();
          _renderDeptPanel(panel);
        } catch (e) {
          alert(e.message);
        }
      }
    });
  });
}

// ── Tab 2: Configuration rapide ───────────────────────────────────────────────

function _renderTemplatePanel(panel) {
  const existingCount = _depts.length;

  panel.innerHTML = `
    <div style="margin-bottom:16px">
      <p style="font-size:13.5px;color:#475569;margin:0 0 16px">
        Initialisez rapidement la structure de votre organisation en choisissant un modèle adapté à votre secteur.
        Les départements seront créés automatiquement.
      </p>
      ${existingCount > 0 ? `<div class="tmpl-warn">⚠️ ${existingCount} département(s) existent déjà. L'initialisation ne créera que les départements manquants (pas de doublon).</div>` : ''}
    </div>

    <div class="tmpl-org-select">
      <label>Type d'organisation :</label>
      <select class="dept-select" id="tmpl-org-type" style="max-width:280px">
        ${ORG_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
      </select>
    </div>

    <div id="tmpl-preview-area">
      <div class="dept-empty"><div class="icon">⏳</div><strong>Chargement du modèle…</strong></div>
    </div>

    <div class="tmpl-actions">
      <button class="dept-btn dept-btn-primary" id="tmpl-init-btn" disabled>Initialiser les départements</button>
      <span style="font-size:12px;color:#94a3b8">Réservé aux administrateurs</span>
    </div>
    <div id="tmpl-result"></div>`;

  let _tmplData = null;

  async function _loadPreview(orgType) {
    const preview = panel.querySelector('#tmpl-preview-area');
    const initBtn = panel.querySelector('#tmpl-init-btn');
    preview.innerHTML = `<div class="dept-empty"><div class="icon">⏳</div><strong>Chargement…</strong></div>`;
    initBtn.disabled = true;

    _tmplData = await _loadTemplate(orgType);
    if (!_tmplData || !_tmplData.departments?.length) {
      preview.innerHTML = `<div class="dept-empty"><strong>Aucun modèle disponible pour ce type.</strong></div>`;
      return;
    }

    const depts = _tmplData.departments;
    preview.innerHTML = `
      <div class="tmpl-preview">
        <div class="tmpl-preview-header">${depts.length} département(s) — ${_tmplData.label}</div>
        <div class="tmpl-preview-list">
          ${depts.map(d => `
            <div class="tmpl-preview-item">
              <div class="tmpl-preview-item-name">📂 ${_esc(d.name)}</div>
              <div class="tmpl-preview-item-desc">${_esc(d.description || '')}</div>
            </div>`).join('')}
        </div>
      </div>`;
    initBtn.disabled = false;
  }

  // Load initial preview
  _loadPreview('pme');

  panel.querySelector('#tmpl-org-type')?.addEventListener('change', e => {
    panel.querySelector('#tmpl-result').innerHTML = '';
    _loadPreview(e.target.value);
  });

  panel.querySelector('#tmpl-init-btn')?.addEventListener('click', async () => {
    const orgType = panel.querySelector('#tmpl-org-type')?.value;
    const initBtn = panel.querySelector('#tmpl-init-btn');
    const result  = panel.querySelector('#tmpl-result');
    initBtn.disabled = true;
    initBtn.textContent = 'Initialisation…';
    result.innerHTML = '';

    try {
      const res = await _initializeDepts(orgType);
      result.innerHTML = `
        <div class="tmpl-result">
          ✅ ${res.created} département(s) créé(s)${res.skipped > 0 ? `, ${res.skipped} ignoré(s) (déjà existants)` : ''}.
        </div>`;
      await _loadDepts();
    } catch (e) {
      result.innerHTML = `<div class="dept-err">${e.message}</div>`;
    }

    initBtn.disabled = false;
    initBtn.textContent = 'Initialiser les départements';
  });
}

// ── Mount ─────────────────────────────────────────────────────────────────────

async function _mount(container) {
  _depts    = [];
  _form     = null;
  _formErr  = null;
  _container = container;

  container.innerHTML = CSS + `
  <div class="dept-root">
    <div class="dept-header">
      <h1>🏢 Gestion des départements</h1>
    </div>

    <div class="dept-tabs">
      <button class="dept-tab active" data-tab="depts">Départements</button>
      <button class="dept-tab" data-tab="template">Configuration rapide</button>
    </div>

    <div id="dept-panel-depts"   class="dept-panel active">
      <div class="dept-empty"><div class="icon">⏳</div><strong>Chargement…</strong></div>
    </div>
    <div id="dept-panel-template" class="dept-panel"></div>
  </div>`;

  // Tab switching
  const panels = {
    depts:    container.querySelector('#dept-panel-depts'),
    template: container.querySelector('#dept-panel-template'),
  };

  container.querySelectorAll('.dept-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.dept-tab').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.dept-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      panels[btn.dataset.tab].classList.add('active');

      if (btn.dataset.tab === 'template' && !panels.template.innerHTML.includes('tmpl-org-select')) {
        _renderTemplatePanel(panels.template);
      }
    });
  });

  await _loadDepts();
  _renderDeptPanel(panels.depts);
}

export default {
  mount(container)   { _mount(container); },
  unmount(container) {
    container.innerHTML = '';
    _depts = []; _form = null; _formErr = null; _container = null;
  },
};
