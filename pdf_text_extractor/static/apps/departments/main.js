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

/* ── Member modal ── */
.dm-overlay {
  position: fixed; inset: 0; background: rgba(15,23,42,.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9000; padding: 16px;
}
.dm-modal {
  background: #fff; border-radius: 14px; width: 100%; max-width: 640px;
  max-height: 80vh; display: flex; flex-direction: column;
  box-shadow: 0 8px 40px rgba(0,0,0,.22);
}
.dm-modal-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
}
.dm-modal-hd h3 { margin: 0; font-size: 15px; font-weight: 700; color: #0f172a; }
.dm-modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; line-height: 1; padding: 0 4px; }
.dm-modal-body { padding: 18px 22px; overflow-y: auto; flex: 1; }
.dm-member-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13.5px;
}
.dm-member-row:last-child { border-bottom: none; }
.dm-member-avatar {
  width: 34px; height: 34px; border-radius: 50%; background: #eef2ff;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; color: #6366f1; flex-shrink: 0;
}
.dm-member-info { flex: 1; min-width: 0; }
.dm-member-name { font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dm-member-title { font-size: 12px; color: #64748b; }
.dm-member-acts { display: flex; gap: 4px; flex-shrink: 0; }
.dm-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; font-size: 12px; cursor: pointer; color: #475569; white-space: nowrap; }
.dm-btn:hover { background: #f1f5f9; }
.dm-btn.danger { color: #dc2626; border-color: #fecaca; }
.dm-btn.danger:hover { background: #fef2f2; }
.dm-add-bar { margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
.dm-add-bar h4 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #334155; }
.dm-add-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dm-add-grid-full { grid-column: 1/-1; }
.dm-input, .dm-select {
  width: 100%; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 8px 10px; font-size: 13px; color: #0f172a; outline: none;
  font-family: inherit;
}
.dm-input:focus, .dm-select:focus { border-color: #6366f1; }
.dm-err { color: #dc2626; font-size: 12px; margin-top: 6px; }
.dm-empty { text-align: center; color: #94a3b8; font-size: 13px; padding: 18px 0; }
.dm-tf-form { background: #f8fafc; border-radius: 8px; padding: 10px; margin-top: 6px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
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
              <button class="dept-icon-btn" data-action="members" data-id="${d.id}" data-name="${_esc(d.name)}" title="Gérer les membres">👥</button>
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

      if (action === 'members') {
        _openMemberModal(id, btn.dataset.name);

      } else if (action === 'edit') {
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

// ── Member management ─────────────────────────────────────────────────────────

const HIERARCHY_LABELS = ['', 'Direction Générale', 'Direction', 'Gestion', 'Coordination', 'Opérations', 'Support'];

async function _api(method, path, body) {
  const r = await fetch(path, { method, headers: _hdrs(!!body), credentials: 'include', body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Erreur ${r.status}`); }
  return r.status !== 204 ? r.json() : null;
}

function _initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function _openMemberModal(deptId, deptName) {
  const existing = document.getElementById('dm-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dm-modal-overlay';
  overlay.className = 'dm-overlay';
  document.body.appendChild(overlay);

  let _members = [];
  let _orgMembers = [];
  let _err = '';
  let _addOpen = false;

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  async function render() {
    overlay.innerHTML = `
      <div class="dm-modal" onclick="event.stopPropagation()">
        <div class="dm-modal-hd">
          <h3>👥 Membres — ${_esc(deptName)}</h3>
          <button class="dm-modal-close" id="dm-close">✕</button>
        </div>
        <div class="dm-modal-body">
          ${_members.length === 0
            ? `<div class="dm-empty">Aucun membre dans ce département.</div>`
            : _members.map(m => `
              <div class="dm-member-row" data-uid="${m.id}">
                <div class="dm-member-avatar">${_initials(m.full_name)}</div>
                <div class="dm-member-info">
                  <div class="dm-member-name">${_esc(m.full_name || m.email)}</div>
                  <div class="dm-member-title">${_esc(m.title || HIERARCHY_LABELS[m.hierarchy_level] || 'Sans titre')} · ${HIERARCHY_LABELS[m.hierarchy_level] || 'Niveau ' + (m.hierarchy_level || '—')}</div>
                </div>
                <div class="dm-member-acts">
                  <button class="dm-btn" data-act="edit" data-uid="${m.id}" data-title="${_esc(m.title||'')}" data-level="${m.hierarchy_level||6}">✏️ Titre</button>
                  <button class="dm-btn" data-act="transfer" data-uid="${m.id}">↗️ Transférer</button>
                  <button class="dm-btn danger" data-act="remove" data-uid="${m.id}" data-name="${_esc(m.full_name||m.email)}">✕</button>
                </div>
              </div>`).join('')}
          ${_err ? `<div class="dm-err">${_esc(_err)}</div>` : ''}
          <div class="dm-add-bar">
            <h4>+ Ajouter un membre</h4>
            ${!_addOpen ? `<button class="dept-btn dept-btn-primary" id="dm-add-open" style="font-size:13px;padding:7px 16px">Ajouter au département</button>` : `
              <div class="dm-add-grid">
                <div class="dm-add-grid-full">
                  <select class="dm-select" id="dm-user-sel">
                    <option value="">— Choisir un membre de l'organisation —</option>
                    ${_orgMembers.filter(u => !_members.find(m => m.id === u.id)).map(u =>
                      `<option value="${u.id}">${_esc(u.full_name || u.email)} (${u.role})</option>`
                    ).join('')}
                  </select>
                </div>
                <input class="dm-input" id="dm-title-in" placeholder="Titre du poste (ex: Chef de projet)" />
                <select class="dm-select" id="dm-level-sel">
                  ${HIERARCHY_LABELS.slice(1).map((l, i) => `<option value="${i+1}">${i+1} — ${l}</option>`).join('')}
                </select>
                <button class="dept-btn dept-btn-primary dm-add-grid-full" id="dm-add-confirm" style="font-size:13px">Confirmer l'ajout</button>
                <button class="dept-btn dm-add-grid-full" id="dm-add-cancel" style="font-size:13px">Annuler</button>
              </div>`}
          </div>
        </div>
      </div>`;

    overlay.querySelector('#dm-close')?.addEventListener('click', close);

    overlay.querySelector('#dm-add-open')?.addEventListener('click', () => { _addOpen = true; render(); });
    overlay.querySelector('#dm-add-cancel')?.addEventListener('click', () => { _addOpen = false; _err = ''; render(); });
    overlay.querySelector('#dm-add-confirm')?.addEventListener('click', async () => {
      const userId = overlay.querySelector('#dm-user-sel')?.value;
      const title  = overlay.querySelector('#dm-title-in')?.value.trim();
      const level  = parseInt(overlay.querySelector('#dm-level-sel')?.value || '6', 10);
      if (!userId) { _err = 'Veuillez sélectionner un membre.'; render(); return; }
      try {
        await _api('POST', `/api/departments/${deptId}/members`, { user_id: userId, title: title || null, hierarchy_level: level });
        _addOpen = false; _err = '';
        _members = await _api('GET', `/api/departments/${deptId}/members`, null).catch(() => []);
        await _loadDepts(); _renderDeptPanel(_container.querySelector('#dept-panel-depts'));
        render();
      } catch (e) { _err = e.message; render(); }
    });

    overlay.querySelectorAll('[data-act="remove"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Retirer ${btn.dataset.name} du département ?`)) return;
        try {
          await _api('DELETE', `/api/departments/${deptId}/members/${btn.dataset.uid}`, null);
          _members = await _api('GET', `/api/departments/${deptId}/members`, null).catch(() => []);
          await _loadDepts(); _renderDeptPanel(_container.querySelector('#dept-panel-depts'));
          render();
        } catch (e) { _err = e.message; render(); }
      });
    });

    overlay.querySelectorAll('[data-act="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.dm-member-row');
        if (row.querySelector('.dm-tf-form')) { row.querySelector('.dm-tf-form').remove(); return; }
        const form = document.createElement('div');
        form.className = 'dm-tf-form';
        form.innerHTML = `
          <input class="dm-input" id="dm-et-title" style="flex:1;min-width:120px" placeholder="Nouveau titre" value="${_esc(btn.dataset.title)}" />
          <select class="dm-select" id="dm-et-level" style="flex:0 0 auto;width:auto">
            ${HIERARCHY_LABELS.slice(1).map((l, i) => `<option value="${i+1}" ${parseInt(btn.dataset.level)===i+1?'selected':''}>${i+1} — ${l}</option>`).join('')}
          </select>
          <button class="dept-btn dept-btn-primary" id="dm-et-save" style="font-size:12px;padding:6px 12px">Sauvegarder</button>`;
        row.appendChild(form);
        form.querySelector('#dm-et-save').addEventListener('click', async () => {
          const t = form.querySelector('#dm-et-title').value.trim();
          const l = parseInt(form.querySelector('#dm-et-level').value, 10);
          try {
            await _api('PATCH', `/api/departments/${deptId}/members/${btn.dataset.uid}/title`, { title: t || null, hierarchy_level: l });
            _members = await _api('GET', `/api/departments/${deptId}/members`, null).catch(() => []);
            render();
          } catch (e) { _err = e.message; render(); }
        });
      });
    });

    overlay.querySelectorAll('[data-act="transfer"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.dm-member-row');
        if (row.querySelector('.dm-tf-form')) { row.querySelector('.dm-tf-form').remove(); return; }
        const otherDepts = _depts.filter(d => d.id !== deptId);
        if (!otherDepts.length) { _err = 'Aucun autre département disponible.'; render(); return; }
        const form = document.createElement('div');
        form.className = 'dm-tf-form';
        form.innerHTML = `
          <select class="dm-select" id="dm-tf-dest" style="flex:1">
            <option value="">— Département cible —</option>
            ${otherDepts.map(d => `<option value="${d.id}">${_esc(d.name)}</option>`).join('')}
          </select>
          <button class="dept-btn dept-btn-primary" id="dm-tf-go" style="font-size:12px;padding:6px 12px">Transférer</button>`;
        row.appendChild(form);
        form.querySelector('#dm-tf-go').addEventListener('click', async () => {
          const destId = form.querySelector('#dm-tf-dest').value;
          if (!destId) { _err = 'Sélectionnez un département cible.'; render(); return; }
          const mem = _members.find(m => m.id === btn.dataset.uid);
          try {
            await _api('DELETE', `/api/departments/${deptId}/members/${btn.dataset.uid}`, null);
            await _api('POST', `/api/departments/${destId}/members`, { user_id: btn.dataset.uid, title: mem?.title || null, hierarchy_level: mem?.hierarchy_level || 6 });
            _members = await _api('GET', `/api/departments/${deptId}/members`, null).catch(() => []);
            await _loadDepts(); _renderDeptPanel(_container.querySelector('#dept-panel-depts'));
            render();
          } catch (e) { _err = e.message; render(); }
        });
      });
    });
  }

  // Load data then render
  Promise.all([
    _api('GET', `/api/departments/${deptId}/members`, null).catch(() => []),
    fetch('/api/members', { headers: _hdrs(false), credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
  ]).then(([mems, org]) => {
    _members    = Array.isArray(mems) ? mems : (mems?.members || []);
    _orgMembers = Array.isArray(org)  ? org  : (org?.members  || []);
    render();
  });

  // Show loading immediately
  overlay.innerHTML = `<div class="dm-modal" style="padding:40px;text-align:center;color:#94a3b8">Chargement…</div>`;
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
  refresh(ctx) {},
};
