/**
 * Comptes de service & API Keys
 * GET    /api/service-accounts          → liste (admin+)
 * POST   /api/service-accounts          → créer (admin+) — token affiché UNE seule fois
 * PATCH  /api/service-accounts/{id}     → modifier nom/desc/is_active (admin+)
 * DELETE /api/service-accounts/{id}     → supprimer (owner only)
 */

const CSS = `<style>
.sa-root {
  padding: 28px 32px;
  max-width: 900px;
  margin: 0 auto;
}

.sa-header { margin-bottom: 24px; }
.sa-header h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.sa-header p  { font-size: 13px; color: #64748b; margin: 0; }

.sa-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 10px;
}

.sa-count { font-size: 13px; color: #64748b; }

.sa-btn {
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background .12s, transform .1s;
  white-space: nowrap;
}

.sa-btn:active { transform: scale(.97); }
.sa-btn:disabled { opacity: .5; cursor: not-allowed; }
.sa-btn-primary   { background: #6366f1; color: #fff; }
.sa-btn-primary:hover:not(:disabled) { background: #4f46e5; }
.sa-btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
.sa-btn-secondary:hover:not(:disabled) { background: #e2e8f0; }
.sa-btn-sm {
  padding: 5px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: background .1s;
}
.sa-btn-sm:hover:not(:disabled) { background: #e2e8f0; }
.sa-btn-sm.del:hover:not(:disabled) { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }
.sa-btn-sm:disabled { opacity: .4; cursor: not-allowed; }

/* Form modal */
.sa-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.sa-modal {
  background: #fff;
  border-radius: 14px;
  padding: 28px 28px 24px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
}

.sa-modal h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 20px; }

.sa-field { margin-bottom: 14px; }
.sa-field label { display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 5px; }

.sa-input, .sa-select, .sa-textarea {
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

.sa-input:focus, .sa-select:focus, .sa-textarea:focus { border-color: #6366f1; }
.sa-textarea { resize: vertical; min-height: 70px; }

.sa-modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Token reveal */
.sa-token-box {
  background: #0f172a;
  border-radius: 10px;
  padding: 16px 18px;
  margin: 16px 0;
}

.sa-token-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #94a3b8;
  margin-bottom: 10px;
}

.sa-token-value {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #a5f3fc;
  word-break: break-all;
  line-height: 1.6;
  margin-bottom: 10px;
}

.sa-copy-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: background .1s, color .1s;
}

.sa-copy-btn:hover { background: #334155; color: #e2e8f0; }
.sa-copy-btn.copied { border-color: #10b981; color: #10b981; }

/* Table */
.sa-table-wrap {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.sa-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.sa-table th {
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

.sa-table td {
  padding: 11px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}

.sa-table tr:last-child td { border-bottom: none; }

.sa-table tr.inactive td { opacity: .55; }

.sa-badge-role {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
  white-space: nowrap;
}

.sa-badge-role.user    { background: #f1f5f9; color: #475569; }
.sa-badge-role.manager { background: #eff6ff; color: #1d4ed8; }
.sa-badge-role.admin   { background: #f5f3ff; color: #6d28d9; }

.sa-badge-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
}

.sa-badge-status.active   { background: #f0fdf4; color: #166534; }
.sa-badge-status.inactive { background: #fef2f2; color: #dc2626; }

.sa-prefix {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: #f1f5f9;
  padding: 2px 7px;
  border-radius: 5px;
  color: #475569;
  letter-spacing: .02em;
}

.sa-meta { font-size: 11.5px; color: #94a3b8; }

.sa-actions { display: flex; gap: 6px; align-items: center; }

.sa-empty {
  text-align: center;
  padding: 40px 24px;
  color: #94a3b8;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 16px;
}

.sa-empty .icon { font-size: 28px; margin-bottom: 8px; }
.sa-empty strong { display: block; color: #475569; font-size: 14px; margin-bottom: 6px; }

.sa-alert {
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
  border: 1px solid;
}

.sa-alert.info { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.sa-alert.err  { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

.sa-spin {
  display: inline-block;
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: sa-spin .7s linear infinite;
  vertical-align: middle;
  margin-right: 5px;
}

@keyframes sa-spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) {
  .sa-root { padding: 16px; }
  .sa-table th:nth-child(3),
  .sa-table td:nth-child(3) { display: none; }
}
</style>`;

// ── State ──────────────────────────────────────────────────────────────────────

let _list      = [];
let _container = null;

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
    throw Object.assign(new Error(e.detail || `Erreur ${r.status}`), { status: r.status });
  }
  return r.status === 204 ? null : r.json();
}

async function _loadList() {
  _list = await _apiFetch('/api/service-accounts', { headers: _hdrs() });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-CA', { year:'numeric', month:'short', day:'numeric' }); }
  catch (_) { return iso; }
}

// ── Modal helpers ──────────────────────────────────────────────────────────────

function _closeModal() {
  document.querySelector('.sa-modal-backdrop')?.remove();
}

// ── Token reveal modal ────────────────────────────────────────────────────────

function _showTokenModal(sa, token) {
  _closeModal();
  const el = document.createElement('div');
  el.className = 'sa-modal-backdrop';
  el.innerHTML = `
    <div class="sa-modal">
      <h2>🔑 Compte de service créé</h2>
      <div class="sa-alert info">
        ⚠️ Ce token ne sera affiché <strong>qu'une seule fois</strong>. Copiez-le maintenant et conservez-le en lieu sûr.
      </div>
      <p style="font-size:13px;color:#334155;margin:0 0 8px">
        <strong>${_esc(sa.name)}</strong> — rôle <strong>${_esc(sa.role)}</strong>
      </p>
      <div class="sa-token-box">
        <div class="sa-token-label">Token API</div>
        <div class="sa-token-value" id="sa-tok-val">${_esc(token)}</div>
        <button class="sa-copy-btn" id="sa-tok-copy">📋 Copier</button>
      </div>
      <div class="sa-modal-actions">
        <button class="sa-btn sa-btn-primary" id="sa-tok-ok">Compris, c'est noté</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  document.querySelector('#sa-tok-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(token).then(() => {
      const b = document.querySelector('#sa-tok-copy');
      if (b) { b.textContent = '✅ Copié !'; b.classList.add('copied'); }
    });
  });

  document.querySelector('#sa-tok-ok')?.addEventListener('click', _closeModal);

  const _escHandler = (e) => { if (e.key === 'Escape') { document.removeEventListener('keydown', _escHandler); _closeModal(); } };
  document.addEventListener('keydown', _escHandler);
}

// ── Create modal ──────────────────────────────────────────────────────────────

function _showCreateModal(onCreated) {
  _closeModal();
  const el = document.createElement('div');
  el.className = 'sa-modal-backdrop';
  el.innerHTML = `
    <div class="sa-modal">
      <h2>Nouveau compte de service</h2>
      <div class="sa-field">
        <label>Nom <span style="color:#dc2626">*</span></label>
        <input class="sa-input" id="sa-new-name" placeholder="Ex. : CI/CD Pipeline, Webhook ETL…" maxlength="80">
      </div>
      <div class="sa-field">
        <label>Description</label>
        <textarea class="sa-textarea" id="sa-new-desc" placeholder="Utilisation prévue de ce compte…" maxlength="300"></textarea>
      </div>
      <div class="sa-field">
        <label>Rôle</label>
        <select class="sa-select" id="sa-new-role">
          <option value="user">Utilisateur — lecture seule (rapports, diagnostics)</option>
          <option value="manager">Manager — accès étendu (analyse, export)</option>
          <option value="admin">Admin — accès complet (gestion, configuration)</option>
        </select>
      </div>
      <div id="sa-create-err"></div>
      <div class="sa-modal-actions">
        <button class="sa-btn sa-btn-secondary" id="sa-create-cancel">Annuler</button>
        <button class="sa-btn sa-btn-primary"   id="sa-create-ok">Créer le compte</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  document.querySelector('#sa-create-cancel')?.addEventListener('click', _closeModal);

  document.querySelector('#sa-create-ok')?.addEventListener('click', async () => {
    const name = document.querySelector('#sa-new-name')?.value.trim();
    const desc = document.querySelector('#sa-new-desc')?.value.trim();
    const role = document.querySelector('#sa-new-role')?.value;
    const errEl = document.querySelector('#sa-create-err');
    const btn   = document.querySelector('#sa-create-ok');

    if (!name) { errEl.innerHTML = '<div class="sa-alert err">Le nom est requis.</div>'; return; }

    btn.disabled = true; btn.innerHTML = '<span class="sa-spin"></span>Création…';
    errEl.innerHTML = '';

    try {
      const sa = await _apiFetch('/api/service-accounts', {
        method: 'POST', headers: _hdrs(true),
        body: JSON.stringify({ name, description: desc || null, role }),
      });
      const token = sa.token;
      delete sa.token;
      _closeModal();
      onCreated(sa, token);
    } catch (e) {
      errEl.innerHTML = `<div class="sa-alert err">${_esc(e.message)}</div>`;
      btn.disabled = false; btn.textContent = 'Créer le compte';
    }
  });
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function _showEditModal(sa, onSaved) {
  _closeModal();
  const el = document.createElement('div');
  el.className = 'sa-modal-backdrop';
  el.innerHTML = `
    <div class="sa-modal">
      <h2>Modifier — ${_esc(sa.name)}</h2>
      <div class="sa-field">
        <label>Nom</label>
        <input class="sa-input" id="sa-edit-name" value="${_esc(sa.name)}" maxlength="80">
      </div>
      <div class="sa-field">
        <label>Description</label>
        <textarea class="sa-textarea" id="sa-edit-desc" maxlength="300">${_esc(sa.description || '')}</textarea>
      </div>
      <div class="sa-field" style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="sa-edit-active" ${sa.is_active ? 'checked' : ''} style="width:16px;height:16px;accent-color:#6366f1">
        <label for="sa-edit-active" style="cursor:pointer;font-size:13.5px;color:#334155">Compte actif</label>
      </div>
      <div id="sa-edit-err"></div>
      <div class="sa-modal-actions">
        <button class="sa-btn sa-btn-secondary" id="sa-edit-cancel">Annuler</button>
        <button class="sa-btn sa-btn-primary"   id="sa-edit-ok">Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(el);

  document.querySelector('#sa-edit-cancel')?.addEventListener('click', _closeModal);

  document.querySelector('#sa-edit-ok')?.addEventListener('click', async () => {
    const name   = document.querySelector('#sa-edit-name')?.value.trim();
    const desc   = document.querySelector('#sa-edit-desc')?.value.trim();
    const active = document.querySelector('#sa-edit-active')?.checked;
    const errEl  = document.querySelector('#sa-edit-err');
    const btn    = document.querySelector('#sa-edit-ok');

    if (!name) { errEl.innerHTML = '<div class="sa-alert err">Le nom est requis.</div>'; return; }

    btn.disabled = true; btn.innerHTML = '<span class="sa-spin"></span>Enregistrement…';
    errEl.innerHTML = '';

    try {
      const updated = await _apiFetch(`/api/service-accounts/${sa.id}`, {
        method: 'PATCH', headers: _hdrs(true),
        body: JSON.stringify({ name, description: desc || null, is_active: active }),
      });
      _closeModal();
      onSaved(updated);
    } catch (e) {
      errEl.innerHTML = `<div class="sa-alert err">${_esc(e.message)}</div>`;
      btn.disabled = false; btn.textContent = 'Enregistrer';
    }
  });
}

// ── Main render ───────────────────────────────────────────────────────────────

function _renderList(root, msgEl) {
  const listEl = root.querySelector('#sa-list');

  if (!_list.length) {
    listEl.innerHTML = `
      <div class="sa-empty">
        <div class="icon">🔑</div>
        <strong>Aucun compte de service</strong>
        Créez un compte pour permettre à des systèmes externes (CI/CD, ETL, webhooks) d'accéder à l'API AgentHub.
      </div>`;
    return;
  }

  listEl.innerHTML = `
    <div class="sa-table-wrap">
      <table class="sa-table">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Préfixe token</th>
            <th>Dernière utilisation</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${_list.map(sa => `
            <tr class="${sa.is_active ? '' : 'inactive'}" data-id="${_esc(sa.id)}">
              <td>
                <strong style="font-size:13.5px;color:#0f172a">${_esc(sa.name)}</strong>
                ${sa.description ? `<div class="sa-meta">${_esc(sa.description)}</div>` : ''}
              </td>
              <td><span class="sa-prefix">${_esc(sa.token_prefix)}…</span></td>
              <td class="sa-meta">${_fmtDate(sa.last_used_at)}</td>
              <td><span class="sa-badge-role ${sa.role}">${sa.role}</span></td>
              <td>
                <span class="sa-badge-status ${sa.is_active ? 'active' : 'inactive'}">
                  ${sa.is_active ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td>
                <div class="sa-actions">
                  <button class="sa-btn-sm sa-edit-btn" data-id="${_esc(sa.id)}">Modifier</button>
                  <button class="sa-btn-sm del sa-del-btn" data-id="${_esc(sa.id)}">Supprimer</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  // Edit buttons
  listEl.querySelectorAll('.sa-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sa = _list.find(s => s.id === btn.dataset.id);
      if (!sa) return;
      _showEditModal(sa, updated => {
        const idx = _list.findIndex(s => s.id === updated.id);
        if (idx >= 0) _list[idx] = updated;
        _renderList(root, msgEl);
      });
    });
  });

  // Delete buttons
  listEl.querySelectorAll('.sa-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sa = _list.find(s => s.id === btn.dataset.id);
      if (!sa) return;
      if (!confirm(`Supprimer le compte « ${sa.name} » ? Cette action est irréversible.`)) return;
      btn.disabled = true;
      try {
        await _apiFetch(`/api/service-accounts/${sa.id}`, { method: 'DELETE', headers: _hdrs() });
        _list = _list.filter(s => s.id !== sa.id);
        _renderList(root, msgEl);
      } catch (e) {
        let errMsg = e.message;
        if (e.status === 403) errMsg = 'Seul le propriétaire du compte peut supprimer les comptes de service.';
        msgEl.innerHTML = `<div class="sa-alert err">${_esc(errMsg)}</div>`;
        btn.disabled = false;
      }
    });
  });
}

// ── Mount ─────────────────────────────────────────────────────────────────────

async function _mount(container) {
  _list = []; _container = container;

  container.innerHTML = CSS + `
  <div class="sa-root">
    <div class="sa-header">
      <h1>🔑 Comptes de service & API Keys</h1>
      <p>Accès programmatique sécurisé pour vos intégrations, pipelines et automatisations</p>
    </div>
    <div class="sa-alert info">
      💡 Les comptes de service permettent à des systèmes externes d'appeler l'API AgentHub sans utiliser les identifiants d'un utilisateur. Chaque token n'est affiché qu'une seule fois à la création.
    </div>
    <div id="sa-msg"></div>
    <div class="sa-toolbar">
      <span class="sa-count" id="sa-count">Chargement…</span>
      <button class="sa-btn sa-btn-primary" id="sa-new-btn" disabled>+ Nouveau compte</button>
    </div>
    <div id="sa-list"></div>
  </div>`;

  const root   = container.querySelector('.sa-root');
  const msgEl  = container.querySelector('#sa-msg');
  const countEl = container.querySelector('#sa-count');
  const newBtn  = container.querySelector('#sa-new-btn');

  try {
    await _loadList();
  } catch (e) {
    let msg = e.message;
    if (e.status === 403) msg = 'Accès réservé aux administrateurs.';
    container.querySelector('#sa-list').innerHTML = `<div class="sa-alert err">${_esc(msg)}</div>`;
    return;
  }

  countEl.textContent = `${_list.length} compte(s) de service`;
  newBtn.disabled = false;

  _renderList(root, msgEl);

  newBtn.addEventListener('click', () => {
    msgEl.innerHTML = '';
    _showCreateModal((sa, token) => {
      _list.unshift(sa);
      countEl.textContent = `${_list.length} compte(s) de service`;
      _renderList(root, msgEl);
      _showTokenModal(sa, token);
    });
  });
}

export default {
  mount(container)   { _mount(container); },
  unmount(container) {
    _closeModal();
    container.innerHTML = '';
    _list = []; _container = null;
  },
  refresh(ctx) {},
};
