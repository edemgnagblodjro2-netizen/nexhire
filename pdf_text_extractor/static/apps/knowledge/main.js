/**
 * Knowledge Hub
 * Recherche sémantique (RAG), upload de documents, synchronisation SharePoint
 * GET /api/knowledge/search | POST /api/knowledge/upload
 * GET /api/knowledge/documents | DELETE /api/knowledge/documents
 * POST /api/knowledge/discover-sharepoint-sites
 * GET/PUT /api/knowledge/sharepoint-mappings | POST /api/knowledge/sync-m365
 */

const CSS = `<style>
.kh-root {
  padding: 28px 32px;
  max-width: 960px;
  margin: 0 auto;
}

.kh-header { margin-bottom: 24px; }
.kh-header h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.kh-header p  { font-size: 13px; color: #64748b; margin: 0; }

.kh-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 24px;
}

.kh-tab {
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

.kh-tab:hover { color: #334155; }
.kh-tab.active { color: #6366f1; border-bottom-color: #6366f1; font-weight: 600; }

.kh-panel { display: none; }
.kh-panel.active { display: block; }

.kh-search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.kh-search-input {
  flex: 1;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 11px 16px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  color: #0f172a;
  transition: border-color .12s;
}

.kh-search-input:focus { border-color: #6366f1; }
.kh-search-input::placeholder { color: #94a3b8; }

.kh-btn {
  padding: 10px 20px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background .12s, transform .1s;
  white-space: nowrap;
}

.kh-btn:active { transform: scale(.97); }
.kh-btn:disabled { opacity: .5; cursor: not-allowed; }
.kh-btn-primary { background: #6366f1; color: #fff; }
.kh-btn-primary:hover:not(:disabled) { background: #4f46e5; }
.kh-btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
.kh-btn-secondary:hover:not(:disabled) { background: #e2e8f0; }
.kh-btn-danger { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

.kh-answer-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}

.kh-answer-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #6366f1;
  margin-bottom: 10px;
}

.kh-answer-text {
  font-size: 14px;
  line-height: 1.7;
  color: #0f172a;
}

.kh-answer-text p  { margin: 0 0 8px; }
.kh-answer-text p:last-child { margin: 0; }
.kh-answer-text ul { margin: 6px 0; padding-left: 20px; }
.kh-answer-text li { margin-bottom: 4px; }
.kh-answer-text strong { font-weight: 700; }

.kh-sources {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.kh-sources-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 8px;
}

.kh-source-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 99px;
  font-size: 11.5px;
  color: #475569;
  margin: 3px 4px 3px 0;
}

.kh-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.kh-count { font-size: 13px; color: #64748b; }

.kh-upload-zone {
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  padding: 28px 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color .12s, background .12s;
  margin-bottom: 20px;
}

.kh-upload-zone:hover, .kh-upload-zone.drag { border-color: #6366f1; background: #f5f3ff; }
.kh-upload-zone .icon { font-size: 28px; margin-bottom: 8px; }
.kh-upload-zone p { font-size: 13.5px; color: #475569; margin: 0 0 4px; font-weight: 500; }
.kh-upload-zone small { font-size: 12px; color: #94a3b8; }

.kh-upload-form {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.kh-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 5px;
}

.kh-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  transition: border-color .12s;
}

.kh-input:focus { border-color: #6366f1; }

.kh-upload-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.kh-upload-filename {
  font-size: 12.5px;
  color: #475569;
  background: #e2e8f0;
  padding: 4px 10px;
  border-radius: 6px;
}

.kh-doc-list { display: flex; flex-direction: column; gap: 8px; }

.kh-doc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 16px;
  transition: border-color .12s;
}

.kh-doc-row:hover { border-color: #c7d2fe; }
.kh-doc-icon { font-size: 20px; flex-shrink: 0; }

.kh-doc-info { flex: 1; min-width: 0; }

.kh-doc-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kh-doc-meta { font-size: 11.5px; color: #94a3b8; margin-top: 2px; }

.kh-doc-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.kh-icon-btn {
  width: 30px; height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  transition: background .12s, border-color .12s;
}

.kh-icon-btn.del:hover { background: #fef2f2; border-color: #fca5a5; }

.kh-m365-section { margin-bottom: 24px; }

.kh-section-title {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #334155;
  margin: 0 0 12px;
}

.kh-m365-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }

.kh-mapping-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  font-size: 13px;
}

.kh-mapping-table th {
  padding: 10px 16px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.kh-mapping-table td {
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.kh-mapping-table tr:last-child td { border-bottom: none; }

.kh-mapping-select {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12.5px;
  font-family: inherit;
  background: #fff;
  color: #334155;
  outline: none;
  width: 100%;
}

.kh-mapping-select:focus { border-color: #6366f1; }

.kh-empty {
  text-align: center;
  padding: 40px 24px;
  color: #94a3b8;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 16px;
}

.kh-empty .icon { font-size: 28px; margin-bottom: 8px; }
.kh-empty strong { display: block; color: #475569; font-size: 14px; margin-bottom: 6px; }

.kh-alert {
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
  border: 1px solid;
}

.kh-alert.info { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.kh-alert.err  { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
.kh-alert.ok   { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }

.kh-spin {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: kh-spin .7s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes kh-spin { to { transform: rotate(360deg); } }

@media (max-width: 680px) {
  .kh-root { padding: 16px; }
  .kh-search-bar { flex-direction: column; }
  .kh-m365-actions { flex-direction: column; }
}
</style>`;

// ── State ─────────────────────────────────────────────────────────────────────

let _docs       = [];
let _container  = null;
let _uploadFile = null;

// ── API ────────────────────────────────────────────────────────────────────────

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _hdrs(json = false) {
  const h = { Authorization: `Bearer ${_token()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function _apiFetch(url, opts = {}) {
  const r = await fetch(url, { credentials: 'include', ...opts });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Erreur ${r.status}`);
  }
  return r.status === 204 ? null : r.json();
}

async function _loadDocs() {
  try { _docs = await _apiFetch('/api/knowledge/documents', { headers: _hdrs() }); }
  catch (_) { _docs = []; }
}

// ── Markdown ──────────────────────────────────────────────────────────────────

function _md(raw) {
  let s = raw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^#{1,3}\s+(.+)$/gm,'<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  return s.split(/\n\n+/).map(block => {
    block = block.trim();
    if (!block) return '';
    const lines = block.split('\n');
    if (lines.every(l => /^[-•*]\s/.test(l) || /^\d+\.\s/.test(l)))
      return '<ul>' + lines.map(l => `<li>${l.replace(/^[-•*\d.]+\s+/,'')}</li>`).join('') + '</ul>';
    return `<p>${block.replace(/\n/g,'<br>')}</p>`;
  }).join('');
}

function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-CA', { year:'numeric', month:'short', day:'numeric' }); }
  catch (_) { return iso; }
}

function _srcIcon(t)  { return { pdf_upload:'📄', onedrive:'☁️', sharepoint:'🔗' }[t] || '📁'; }
function _srcLabel(t) { return { pdf_upload:'Upload', onedrive:'OneDrive', sharepoint:'SharePoint' }[t] || t; }

// ── Tab 1: Recherche ─────────────────────────────────────────────────────────

function _mountSearch(panel) {
  panel.innerHTML = `
    <div class="kh-search-bar">
      <input class="kh-search-input" id="kh-q"
        placeholder="Ex. : Quelle est notre politique de télétravail ?" maxlength="500">
      <button class="kh-btn kh-btn-primary" id="kh-search-btn">Rechercher</button>
    </div>
    <div id="kh-result"></div>`;

  const input  = panel.querySelector('#kh-q');
  const btn    = panel.querySelector('#kh-search-btn');
  const result = panel.querySelector('#kh-result');

  async function _doSearch() {
    const q = input.value.trim();
    if (!q) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="kh-spin"></span>Recherche…';
    result.innerHTML = '';

    try {
      const data = await _apiFetch(
        `/api/knowledge/search?q=${encodeURIComponent(q)}&k=5`,
        { headers: _hdrs() },
      );
      const srcHtml = data.sources?.length
        ? `<div class="kh-sources">
            <div class="kh-sources-label">Sources utilisées</div>
            ${[...new Set(data.sources.map(s => s.title))].map(t =>
              `<span class="kh-source-chip">${_srcIcon(data.sources.find(s=>s.title===t)?.source_type)} ${_esc(t)}</span>`
            ).join('')}
          </div>`
        : '';
      result.innerHTML = `
        <div class="kh-answer-card">
          <div class="kh-answer-label">✨ Réponse ATLAS Knowledge</div>
          <div class="kh-answer-text">${_md(data.answer)}</div>
          ${srcHtml}
        </div>`;
    } catch (e) {
      result.innerHTML = `<div class="kh-alert err">${_esc(e.message)}</div>`;
    }

    btn.disabled = false;
    btn.textContent = 'Rechercher';
  }

  btn.addEventListener('click', _doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') _doSearch(); });
}

// ── Tab 2: Documents ──────────────────────────────────────────────────────────

function _renderDocPanel(panel) {
  const formHtml = _uploadFile
    ? `<div class="kh-upload-form">
        <div class="kh-field" style="margin-bottom:10px">
          <label>Fichier sélectionné</label>
          <div class="kh-upload-filename">📎 ${_esc(_uploadFile.name)} (${((_uploadFile.size)/1024).toFixed(0)} Ko)</div>
        </div>
        <div class="kh-field">
          <label>Titre (optionnel)</label>
          <input class="kh-input" id="kh-up-title" placeholder="Laisser vide pour utiliser le nom du fichier">
        </div>
        <div class="kh-upload-actions">
          <button class="kh-btn kh-btn-primary"    id="kh-up-confirm">Indexer le document</button>
          <button class="kh-btn kh-btn-secondary"  id="kh-up-cancel">Annuler</button>
          <span id="kh-up-status"></span>
        </div>
      </div>`
    : `<div class="kh-upload-zone" id="kh-drop">
        <div class="icon">📤</div>
        <p>Glissez un fichier ici ou cliquez pour sélectionner</p>
        <small>Formats supportés : PDF, TXT, MD</small>
      </div>`;

  panel.innerHTML = `
    ${formHtml}
    <div class="kh-toolbar">
      <span class="kh-count">${_docs.length} document(s) indexé(s)</span>
    </div>
    <div class="kh-doc-list">
      ${_docs.length === 0
        ? `<div class="kh-empty">
            <div class="icon">📂</div>
            <strong>Aucun document indexé</strong>
            Uploadez des PDF ou synchronisez SharePoint pour alimenter la base de connaissance.
          </div>`
        : _docs.map(d => `
          <div class="kh-doc-row">
            <div class="kh-doc-icon">${_srcIcon(d.source_type)}</div>
            <div class="kh-doc-info">
              <div class="kh-doc-name" title="${_esc(d.title)}">${_esc(d.title)}</div>
              <div class="kh-doc-meta">${d.chunk_count} fragment(s) · ${_fmtDate(d.synced_at)}</div>
            </div>
            <span class="kh-doc-badge">${_srcLabel(d.source_type)}</span>
            <button class="kh-icon-btn del"
              data-title="${_esc(d.title)}" data-type="${_esc(d.source_type)}"
              title="Supprimer">🗑️</button>
          </div>`).join('')}
    </div>`;

  if (!_uploadFile) {
    const zone = panel.querySelector('#kh-drop');
    const fi = document.createElement('input');
    fi.type = 'file'; fi.accept = '.pdf,.txt,.md'; fi.style.display = 'none';
    panel.appendChild(fi);

    zone.addEventListener('click', () => fi.click());
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag');
      const f = e.dataTransfer.files[0];
      if (f) { _uploadFile = f; _renderDocPanel(panel); }
    });
    fi.addEventListener('change', () => {
      if (fi.files[0]) { _uploadFile = fi.files[0]; _renderDocPanel(panel); }
    });
  } else {
    panel.querySelector('#kh-up-cancel')?.addEventListener('click', () => {
      _uploadFile = null; _renderDocPanel(panel);
    });

    panel.querySelector('#kh-up-confirm')?.addEventListener('click', async () => {
      const confirmBtn = panel.querySelector('#kh-up-confirm');
      const status     = panel.querySelector('#kh-up-status');
      const title      = panel.querySelector('#kh-up-title')?.value.trim() || '';
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="kh-spin"></span>Indexation…';

      const fd = new FormData();
      fd.append('file', _uploadFile);
      if (title) fd.append('title', title);

      try {
        const res = await _apiFetch('/api/knowledge/upload', {
          method: 'POST', headers: _hdrs(), body: fd,
        });
        _uploadFile = null;
        await _loadDocs();
        _renderDocPanel(panel);
        panel.insertAdjacentHTML('afterbegin',
          `<div class="kh-alert ok">✅ « ${_esc(res.title)} » indexé — ${res.chunks} fragment(s).</div>`);
      } catch (e) {
        status.innerHTML = `<span style="font-size:12px;color:#dc2626">${_esc(e.message)}</span>`;
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Indexer le document';
      }
    });
  }

  panel.querySelectorAll('.kh-icon-btn.del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const t = btn.dataset.title;
      const tp = btn.dataset.type;
      if (!confirm(`Supprimer « ${t} » de la base de connaissance ?`)) return;
      try {
        await _apiFetch(
          `/api/knowledge/documents?title=${encodeURIComponent(t)}&source_type=${encodeURIComponent(tp)}`,
          { method: 'DELETE', headers: _hdrs() },
        );
        await _loadDocs();
        _renderDocPanel(panel);
      } catch (e) { alert(e.message); }
    });
  });
}

// ── Tab 3: Microsoft 365 ──────────────────────────────────────────────────────

function _mountM365Panel(panel) {
  let _mappings = [];
  let _depts    = [];

  panel.innerHTML = `
    <div class="kh-m365-section">
      <div class="kh-section-title">Sites SharePoint</div>
      <div class="kh-m365-actions">
        <button class="kh-btn kh-btn-secondary" id="kh-discover">🔍 Découvrir les sites</button>
        <button class="kh-btn kh-btn-primary"   id="kh-sync">🔄 Synchroniser M365</button>
        <button class="kh-btn kh-btn-secondary" id="kh-save" style="display:none">💾 Sauvegarder</button>
      </div>
      <div id="kh-m365-status"></div>
      <div id="kh-m365-table">
        <div class="kh-empty">
          <div class="icon">☁️</div>
          <strong>Mappages SharePoint</strong>
          Cliquez sur "Découvrir les sites" pour détecter vos bibliothèques et les associer aux départements.
        </div>
      </div>
    </div>`;

  const statusEl = panel.querySelector('#kh-m365-status');
  const tableEl  = panel.querySelector('#kh-m365-table');
  const saveBtn  = panel.querySelector('#kh-save');

  function _showStatus(msg, type = 'info') {
    statusEl.innerHTML = `<div class="kh-alert ${type}">${msg}</div>`;
  }

  function _renderTable() {
    if (!_mappings.length) {
      tableEl.innerHTML = `<div class="kh-empty"><div class="icon">☁️</div><strong>Aucun site détecté.</strong>Vérifiez que votre connecteur M365 est actif dans le module Intégrations.</div>`;
      saveBtn.style.display = 'none';
      return;
    }
    tableEl.innerHTML = `
      <table class="kh-mapping-table">
        <thead><tr><th>Site SharePoint</th><th>Département associé</th></tr></thead>
        <tbody>
          ${_mappings.map(m => `
            <tr>
              <td>${_esc(m.site_name || m.site_id)}</td>
              <td>
                <select class="kh-mapping-select" data-site="${_esc(m.site_id)}">
                  <option value="">— Organisation entière —</option>
                  ${_depts.map(d =>
                    `<option value="${_esc(d.id)}" ${m.dept_id === d.id ? 'selected' : ''}>${_esc(d.name)}</option>`
                  ).join('')}
                </select>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    saveBtn.style.display = 'inline-flex';
  }

  // Load existing mappings
  (async () => {
    try {
      const d = await _apiFetch('/api/knowledge/sharepoint-mappings', { headers: _hdrs() });
      _mappings = d.mappings || []; _depts = d.departments || [];
      if (_mappings.length) _renderTable();
    } catch (_) {}
  })();

  panel.querySelector('#kh-discover')?.addEventListener('click', async () => {
    const btn = panel.querySelector('#kh-discover');
    btn.disabled = true; btn.innerHTML = '<span class="kh-spin"></span>Détection…';
    statusEl.innerHTML = '';
    try {
      await _apiFetch('/api/knowledge/discover-sharepoint-sites', { method: 'POST', headers: _hdrs() });
      const d = await _apiFetch('/api/knowledge/sharepoint-mappings', { headers: _hdrs() });
      _mappings = d.mappings || []; _depts = d.departments || [];
      _renderTable();
      _showStatus(`✅ ${_mappings.length} site(s) détecté(s).`, 'ok');
    } catch (e) { _showStatus(e.message, 'err'); }
    btn.disabled = false; btn.textContent = '🔍 Découvrir les sites';
  });

  saveBtn.addEventListener('click', async () => {
    const payload = Array.from(tableEl.querySelectorAll('.kh-mapping-select')).map(s => ({
      site_id: s.dataset.site, dept_id: s.value || null,
    }));
    try {
      await _apiFetch('/api/knowledge/sharepoint-mappings', {
        method: 'PUT', headers: _hdrs(true), body: JSON.stringify(payload),
      });
      _showStatus('✅ Mappages enregistrés.', 'ok');
    } catch (e) { _showStatus(e.message, 'err'); }
  });

  panel.querySelector('#kh-sync')?.addEventListener('click', async () => {
    const btn = panel.querySelector('#kh-sync');
    if (!confirm('Lancer la synchronisation M365 ? Les documents SharePoint seront ré-indexés.')) return;
    btn.disabled = true; btn.innerHTML = '<span class="kh-spin"></span>Synchronisation…';
    statusEl.innerHTML = '';
    try {
      const res = await _apiFetch('/api/knowledge/sync-m365', { method: 'POST', headers: _hdrs() });
      _showStatus(`✅ Terminé — ${res.indexed ?? 0} document(s) indexé(s).`, 'ok');
      await _loadDocs();
    } catch (e) { _showStatus(e.message, 'err'); }
    btn.disabled = false; btn.textContent = '🔄 Synchroniser M365';
  });
}

// ── Mount ─────────────────────────────────────────────────────────────────────

async function _mount(container) {
  _docs = []; _uploadFile = null; _container = container;

  container.innerHTML = CSS + `
  <div class="kh-root">
    <div class="kh-header">
      <h1>📚 Knowledge Hub</h1>
      <p>Base de connaissance organisationnelle — documents indexés, recherche sémantique, synchronisation M365</p>
    </div>

    <div class="kh-tabs">
      <button class="kh-tab active" data-tab="search">Recherche IA</button>
      <button class="kh-tab" data-tab="docs">Documents</button>
      <button class="kh-tab" data-tab="m365">Microsoft 365</button>
    </div>

    <div id="kh-panel-search" class="kh-panel active"></div>
    <div id="kh-panel-docs"   class="kh-panel"></div>
    <div id="kh-panel-m365"   class="kh-panel"></div>
  </div>`;

  const panels = {
    search: container.querySelector('#kh-panel-search'),
    docs:   container.querySelector('#kh-panel-docs'),
    m365:   container.querySelector('#kh-panel-m365'),
  };

  container.querySelectorAll('.kh-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.kh-tab').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.kh-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      panels[btn.dataset.tab].classList.add('active');
    });
  });

  _mountSearch(panels.search);
  await _loadDocs();
  _renderDocPanel(panels.docs);
  _mountM365Panel(panels.m365);
}

export default {
  mount(container)   { _mount(container); },
  unmount(container) {
    container.innerHTML = '';
    _docs = []; _uploadFile = null; _container = null;
  },
};
