/**
 * AgentHub Platform — App: Identity & Access
 * Façade UI pure — zéro logique métier.
 * Toute l'intelligence vient du backend :
 *   GET  /api/members · /invitations · /role-requests
 *   GET  /api/mfa/status
 *   POST /api/mfa/require-org
 *   GET  /api/sso/providers · /config
 *   GET  /api/intelligence/entra/groups · /identities
 */

const _CSS_ID = 'id-css';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.id{padding:var(--sp-8);max-width:1200px;margin:0 auto;font-family:var(--font)}
.id-hd{display:flex;align-items:center;gap:14px;margin-bottom:24px}
.id-logo{width:40px;height:40px;border-radius:var(--r-lg);background:linear-gradient(135deg,#0f766e,#0284c7);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}
.id-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.id-sub{font-size:13px;color:var(--muted);margin:2px 0 0}

/* Tabs */
.id-tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:28px;overflow-x:auto}
.id-tab{padding:10px 18px;font-size:13px;font-weight:600;color:var(--muted);background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all .15s}
.id-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
.id-tab:hover:not(.active){color:var(--text)}

/* KPI strip */
.id-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.id-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.id-kpi-icon{font-size:20px;margin-bottom:8px}
.id-kpi-val{font-size:24px;font-weight:800;color:var(--text);line-height:1}
.id-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.id-kpi-sub{font-size:12px;font-weight:600;margin-top:5px}
.id-kpi-sub.ok{color:var(--color-ok-text)}
.id-kpi-sub.warn{color:var(--color-warn-text)}
.id-kpi-sub.err{color:var(--color-err-text)}

/* Card */
.id-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}
.id-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.id-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}
.id-card-hd span{font-size:16px}
.id-card-body{padding:18px}

/* Table */
.id-table{width:100%;border-collapse:collapse;font-size:12px}
.id-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:0 10px 10px;border-bottom:1px solid var(--border)}
.id-table td{padding:10px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.id-table tr:last-child td{border-bottom:none}

/* Pill */
.id-pill{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill)}
.id-pill.active{background:var(--color-ok-soft);color:var(--color-ok-text)}
.id-pill.inactive{background:var(--color-warn-soft);color:var(--color-warn-text)}
.id-pill.pending{background:var(--color-info-soft);color:var(--color-info-on)}
.id-pill.owner{background:#ede9fe;color:#6d28d9}
.id-pill.admin{background:#fce7f3;color:#9d174d}
.id-pill.manager{background:#fef3c7;color:#92400e}
.id-pill.user{background:var(--bg-2);color:var(--muted)}

/* Avatar */
.id-avatar{width:28px;height:28px;border-radius:50%;background:var(--primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}

/* MFA status */
.id-mfa-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border)}
.id-mfa-row:last-child{border-bottom:none}
.id-mfa-label{font-size:13px;font-weight:600;color:var(--text)}
.id-mfa-desc{font-size:11px;color:var(--muted);margin-top:2px}
.id-mfa-val{font-size:13px;font-weight:700}
.id-btn{padding:8px 14px;font-size:12px;font-weight:600;border-radius:var(--r);border:none;cursor:pointer;font-family:inherit;transition:all .15s}
.id-btn-primary{background:var(--primary);color:#fff}
.id-btn-primary:hover{opacity:.85}
.id-btn-danger{background:var(--color-err);color:#fff}
.id-btn-danger:hover{opacity:.85}
.id-btn-ghost{background:var(--bg-2);color:var(--text);border:1px solid var(--border)}
.id-btn-ghost:hover{background:var(--border)}

/* SSO Config */
.id-sso-item{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)}
.id-sso-item:last-child{border-bottom:none}
.id-sso-icon{width:36px;height:36px;border-radius:var(--r);object-fit:contain;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.id-sso-info{flex:1}
.id-sso-name{font-size:13px;font-weight:600;color:var(--text)}
.id-sso-desc{font-size:11px;color:var(--muted)}

/* Group list */
.id-group{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.id-group:last-child{border-bottom:none}
.id-group-icon{font-size:16px}
.id-group-name{font-size:12px;font-weight:600;color:var(--text);flex:1}
.id-group-count{font-size:11px;color:var(--muted)}

/* Loader */
.id-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 0;color:var(--muted)}
.id-spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:#0f766e;border-radius:50%;animation:idspin .7s linear infinite}
@keyframes idspin{to{transform:rotate(360deg)}}
.id-empty{text-align:center;padding:40px;color:var(--muted);font-size:13px}

/* Invite modal */
.id-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center}
.id-modal{background:#fff;border-radius:var(--r-lg);padding:28px;width:min(420px,90vw);box-shadow:0 16px 40px rgba(0,0,0,.18)}
.id-modal h4{font-size:16px;font-weight:700;color:var(--text);margin:0 0 4px}
.id-modal p{font-size:12px;color:var(--muted);margin:0 0 20px}
.id-field{margin-bottom:14px}
.id-field label{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
.id-field input,.id-field select{width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:inherit;box-sizing:border-box;outline:none;transition:border-color .15s}
.id-field input:focus,.id-field select:focus{border-color:var(--primary)}
.id-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}
.id-toast-ok{font-size:12px;color:var(--color-ok-text);font-weight:600;padding:6px 10px;background:var(--color-ok-soft);border-radius:var(--r);display:none}
.id-toast-ok.show{display:block}

@media(max-width:900px){.id-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.id-kpis{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

const _TABS = [
  { id: 'users',   label: '👥 Utilisateurs & Accès' },
  { id: 'invites', label: '✉️ Invitations' },
  { id: 'mfa',     label: '🔐 MFA & Sécurité' },
  { id: 'sso',     label: '🔗 SSO & Entra ID' },
];

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _token(); return t ? { Authorization: `Bearer ${t}` } : {}; }
async function _get(path) {
  const r = await fetch(path, { headers: _h(), credentials: 'include' });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function _post(path, body = {}) {
  const r = await fetch(path, { method: 'POST', headers: { ..._h(), 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function _patch(path, body = {}) {
  const r = await fetch(path, { method: 'PATCH', headers: { ..._h(), 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
async function _del(path) {
  const r = await fetch(path, { method: 'DELETE', headers: _h(), credentials: 'include' });
  if (!r.ok) throw new Error(r.status);
  return r.json().catch(() => ({}));
}

function _fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}
function _initial(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
}
function _roleFr(r) { return { owner: 'Propriétaire', admin: 'Admin', manager: 'Gestionnaire', user: 'Utilisateur' }[r] || r || '—'; }
function _empty(msg = 'Aucune donnée') { return `<div class="id-empty">${msg}</div>`; }

// ── Tab renderers ─────────────────────────────────────────────────────────────

function _renderUsers(data) {
  const members = data.members || [];
  const total   = data.total || members.length;

  const active   = members.filter(m => m.is_active !== false).length;
  const inactive = members.filter(m => m.is_active === false).length;
  const conflict = members.filter(m => m.conflicted).length;
  const byRole   = { owner: 0, admin: 0, manager: 0, user: 0 };
  members.forEach(m => { if (m.role in byRole) byRole[m.role]++; });

  return `
    <div class="id-kpis">
      <div class="id-kpi">
        <div class="id-kpi-icon">👥</div>
        <div class="id-kpi-val">${total}</div>
        <div class="id-kpi-lbl">Membres total</div>
        <div class="id-kpi-sub ok">${active} actifs</div>
      </div>
      <div class="id-kpi">
        <div class="id-kpi-icon">🔴</div>
        <div class="id-kpi-val">${inactive}</div>
        <div class="id-kpi-lbl">Comptes désactivés</div>
        <div class="id-kpi-sub ${inactive > 0 ? 'warn' : 'ok'}">${inactive > 0 ? 'À réviser' : 'Aucun'}</div>
      </div>
      <div class="id-kpi">
        <div class="id-kpi-icon">⚠️</div>
        <div class="id-kpi-val">${conflict}</div>
        <div class="id-kpi-lbl">Conflits de rôles</div>
        <div class="id-kpi-sub ${conflict > 0 ? 'err' : 'ok'}">${conflict > 0 ? 'Action requise' : 'OK'}</div>
      </div>
      <div class="id-kpi">
        <div class="id-kpi-icon">🔑</div>
        <div class="id-kpi-val">${byRole.admin + byRole.owner}</div>
        <div class="id-kpi-lbl">Admins & Propriétaires</div>
        <div class="id-kpi-sub ok">Sur ${total} membres</div>
      </div>
    </div>

    <div class="id-card">
      <div class="id-card-hd"><span>👥</span><h3>Membres de l'organisation</h3></div>
      <div class="id-card-body" style="padding:0 18px">
        ${members.length === 0 ? _empty('Aucun membre') : `
        <table class="id-table">
          <thead><tr><th>Membre</th><th>Rôle</th><th>Statut</th><th>Membre depuis</th><th>Actions</th></tr></thead>
          <tbody>
            ${members.map(m => {
              const isOwner  = m.role === 'owner';
              const isActive = m.is_active !== false;
              return `<tr data-mid="${m.id}">
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="id-avatar">${_initial(m.full_name || m.email)}</div>
                  <div>
                    <div style="font-weight:600">${m.full_name || '—'}</div>
                    <div style="font-size:11px;color:var(--muted)">${m.email}</div>
                  </div>
                </div>
              </td>
              <td>${isOwner
                ? `<span class="id-pill owner">${_roleFr(m.role)}</span>`
                : `<select class="id-role-select" data-member="${m.id}" data-current="${m.role}" style="padding:3px 6px;border:1px solid var(--border);border-radius:6px;font-size:11px;font-family:inherit">
                    <option value="admin"${m.role === 'admin' ? ' selected' : ''}>Admin</option>
                    <option value="manager"${m.role === 'manager' ? ' selected' : ''}>Gestionnaire</option>
                    <option value="user"${m.role === 'user' ? ' selected' : ''}>Utilisateur</option>
                   </select>`}</td>
              <td><span class="id-pill ${isActive ? 'active' : 'inactive'}">${isActive ? 'Actif' : 'Inactif'}</span>${m.conflicted ? ' <span class="id-pill inactive">&#x26A0;&#xFE0F; Conflit</span>' : ''}</td>
              <td style="color:var(--muted)">${_fmtDate(m.created_at)}</td>
              <td>${isOwner ? '&#x2014;' : `<span style="display:inline-flex;gap:4px">
                <button class="id-btn id-btn-ghost id-m-toggle" data-member="${m.id}" style="padding:3px 7px;font-size:11px" title="${isActive ? 'D&#xE9;sactiver' : 'R&#xE9;activer'}">${isActive ? '&#x23F8;&#xFE0F;' : '&#x25B6;&#xFE0F;'}</button>
                <button class="id-btn id-btn-danger id-m-delete" data-member="${m.id}" style="padding:3px 7px;font-size:11px" title="Supprimer">&#x1F5D1;&#xFE0F;</button>
              </span>`}</td>
            </tr>`;
            }).join('')}
          </tbody>
        </table>`}
      </div>
    </div>`;
}

function _renderInvites(invitations, roleRequests) {
  const invites = Array.isArray(invitations) ? invitations : (invitations?.invitations || []);
  const requests = Array.isArray(roleRequests) ? roleRequests : (roleRequests?.requests || []);

  return `
    <div class="id-card">
      <div class="id-card-hd"><span>✉️</span><h3>Invitations en attente</h3><span style="font-size:13px;color:var(--muted);font-weight:500">${invites.length}</span>
        <button class="id-btn id-btn-primary" id="id-invite-open-btn" style="margin-left:auto;padding:6px 14px">✉️ Inviter un utilisateur</button>
      </div>
      <div class="id-card-body" style="padding:0 18px">
        ${invites.length === 0 ? _empty('Aucune invitation en attente') : `
        <table class="id-table">
          <thead><tr><th>Email</th><th>Rôle proposé</th><th>Invité par</th><th>Date</th><th>Statut</th></tr></thead>
          <tbody>
            ${invites.map(i => `<tr>
              <td style="font-weight:600">${i.email || '—'}</td>
              <td><span class="id-pill ${i.role || 'user'}">${_roleFr(i.role)}</span></td>
              <td style="color:var(--muted)">${i.invited_by_email || '—'}</td>
              <td style="color:var(--muted)">${_fmtDate(i.created_at)}</td>
              <td><span class="id-pill pending">En attente</span></td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
    </div>

    ${requests.length > 0 ? `
    <div class="id-card">
      <div class="id-card-hd"><span>🔄</span><h3>Demandes de changement de rôle</h3><span style="font-size:13px;color:var(--muted);font-weight:500">${requests.length}</span></div>
      <div class="id-card-body" style="padding:0 18px">
        <table class="id-table">
          <thead><tr><th>Demandeur</th><th>Rôle actuel</th><th>Rôle demandé</th><th>Date</th></tr></thead>
          <tbody>
            ${requests.map(r => `<tr>
              <td>
                <div style="font-weight:600">${r.full_name || '—'}</div>
                <div style="font-size:11px;color:var(--muted)">${r.email || ''}</div>
              </td>
              <td><span class="id-pill ${r.current_role || 'user'}">${_roleFr(r.current_role)}</span></td>
              <td><span class="id-pill ${r.requested_role || 'user'}">${_roleFr(r.requested_role)}</span></td>
              <td style="color:var(--muted)">${_fmtDate(r.requested_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}`;
}

function _renderMFA(mfa, container) {
  const enabled     = mfa.mfa_enabled === true;
  const factorType  = mfa.factor_type || '—';
  const enrolledAt  = _fmtDate(mfa.enrolled_at);
  const lastUsed    = _fmtDate(mfa.last_used_at);
  const orgRequired = mfa.org_mfa_required === true;

  return `
    <div class="id-kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="id-kpi">
        <div class="id-kpi-icon">${enabled ? '🔐' : '🔓'}</div>
        <div class="id-kpi-val">${enabled ? 'Actif' : 'Inactif'}</div>
        <div class="id-kpi-lbl">MFA votre compte</div>
        <div class="id-kpi-sub ${enabled ? 'ok' : 'err'}">${enabled ? '✅ Protégé' : '⚠️ Non configuré'}</div>
      </div>
      <div class="id-kpi">
        <div class="id-kpi-icon">📅</div>
        <div class="id-kpi-val" style="font-size:15px">${enrolledAt}</div>
        <div class="id-kpi-lbl">Date d'inscription</div>
        <div class="id-kpi-sub ok">${factorType !== '—' ? factorType : 'Non enrôlé'}</div>
      </div>
      <div class="id-kpi">
        <div class="id-kpi-icon">🕐</div>
        <div class="id-kpi-val" style="font-size:15px">${lastUsed}</div>
        <div class="id-kpi-lbl">Dernière utilisation</div>
        <div class="id-kpi-sub ok">${lastUsed === '—' ? 'Jamais utilisé' : 'MFA vérifié'}</div>
      </div>
    </div>

    <div class="id-card">
      <div class="id-card-hd"><span>🏢</span><h3>Politique MFA de l'organisation</h3></div>
      <div class="id-card-body">
        <div class="id-mfa-row">
          <div>
            <div class="id-mfa-label">MFA obligatoire pour tous les membres</div>
            <div class="id-mfa-desc">Tous les utilisateurs devront configurer un 2FA pour accéder à la plateforme</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="id-mfa-val ${orgRequired ? 'ok' : 'warn'}" style="color:${orgRequired ? 'var(--color-ok-text)' : 'var(--color-warn-text)'}">${orgRequired ? 'Activé' : 'Désactivé'}</span>
            <button class="id-btn ${orgRequired ? 'id-btn-danger' : 'id-btn-primary'}" id="id-mfa-toggle">
              ${orgRequired ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

async function _setupMFAToggle(container, cache) {
  const btn = container.querySelector('#id-mfa-toggle');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const isRequired = btn.textContent.trim() === 'Désactiver';
    btn.disabled = true;
    btn.textContent = '…';
    try {
      await _post('/api/mfa/require-org', { required: !isRequired });
      cache.mfa = null; // invalidate
      const mfa = cache.mfa || (cache.mfa = await _get('/api/mfa/status').catch(() => ({})));
      container.querySelector('#id-panel').innerHTML = _renderMFA(mfa, container);
      _setupMFAToggle(container, cache);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = isRequired ? 'Désactiver' : 'Activer';
      alert('Erreur lors de la mise à jour de la politique MFA');
    }
  });
}

function _renderSSO(ssoConfig, entraGroups, entraIdentities) {
  const configured = ssoConfig.configured === true;
  const groups     = Array.isArray(entraGroups) ? entraGroups : (entraGroups?.groups || []);
  const identities = Array.isArray(entraIdentities) ? entraIdentities : (entraIdentities?.identities || []);

  return `
    <div class="id-card">
      <div class="id-card-hd"><span>🔗</span><h3>Configuration SSO</h3></div>
      <div class="id-card-body">
        <div class="id-sso-item">
          <div class="id-sso-icon">🪟</div>
          <div class="id-sso-info">
            <div class="id-sso-name">Microsoft Entra ID (Azure AD)</div>
            <div class="id-sso-desc">${configured
              ? `Fournisseur : ${ssoConfig.provider || 'azure'} · Client ID : ${ssoConfig.client_id ? ssoConfig.client_id.substring(0, 8) + '…' : '—'}`
              : 'Non configuré — connectez votre tenant Microsoft pour activer le SSO'
            }</div>
          </div>
          <span class="id-pill ${configured ? 'active' : 'inactive'}">${configured ? 'Configuré' : 'Non configuré'}</span>
        </div>
        <div class="id-sso-item">
          <div class="id-sso-icon">🔵</div>
          <div class="id-sso-info">
            <div class="id-sso-name">Google Workspace</div>
            <div class="id-sso-desc">SSO via OAuth 2.0 — disponible après configuration admin</div>
          </div>
          <span class="id-pill inactive">Non configuré</span>
        </div>
      </div>
    </div>

    ${configured && groups.length > 0 ? `
    <div class="id-card">
      <div class="id-card-hd"><span>🗂️</span><h3>Groupes Entra ID synchronisés</h3><span style="font-size:13px;color:var(--muted);font-weight:500">${groups.length}</span></div>
      <div class="id-card-body">
        ${groups.map(g => `<div class="id-group">
          <div class="id-group-icon">👥</div>
          <div class="id-group-name">${g.displayName || g.name || '—'}</div>
          <div class="id-group-count">${g.member_count != null ? `${g.member_count} membres` : ''}</div>
        </div>`).join('')}
      </div>
    </div>` : ''}

    ${configured && identities.length > 0 ? `
    <div class="id-card">
      <div class="id-card-hd"><span>🔍</span><h3>Identités Entra ID</h3><span style="font-size:13px;color:var(--muted);font-weight:500">${identities.length}</span></div>
      <div class="id-card-body" style="padding:0 18px">
        <table class="id-table">
          <thead><tr><th>Identité</th><th>Statut</th><th>Dernier connexion</th></tr></thead>
          <tbody>
            ${identities.slice(0, 20).map(i => `<tr>
              <td>
                <div style="font-weight:600">${i.displayName || i.name || '—'}</div>
                <div style="font-size:11px;color:var(--muted)">${i.userPrincipalName || i.email || ''}</div>
              </td>
              <td><span class="id-pill ${i.accountEnabled !== false ? 'active' : 'inactive'}">${i.accountEnabled !== false ? 'Actif' : 'Désactivé'}</span></td>
              <td style="color:var(--muted)">${_fmtDate(i.signInActivity?.lastSignInDateTime || i.last_sign_in)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : configured && identities.length === 0 ? '' : ''}

    ${!configured ? `<div class="id-card"><div class="id-card-body"><div class="id-empty">🔗 Configurez votre connexion SSO dans le Centre d'intégrations → Microsoft 365 pour synchroniser les groupes et identités Entra ID.</div></div></div>` : ''}`;
}

// ── User action bindings ─────────────────────────────────────────────────────

function _setupUserActions(panel, cache) {
  panel.querySelectorAll('.id-role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id   = sel.dataset.member;
      const role = sel.value;
      const prev = sel.dataset.current;
      try {
        await _patch(`/api/members/${id}/role`, { role });
        sel.dataset.current = role;
        if (cache.members) {
          const list = cache.members.members || cache.members.items || [];
          const m = list.find(x => x.id === id);
          if (m) m.role = role;
        }
      } catch(e) { alert(`Erreur : ${e.message}`); sel.value = prev; }
    });
  });

  panel.querySelectorAll('.id-m-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.member;
      try {
        const res = await _patch(`/api/members/${id}/active`);
        delete cache.members;
        const row = panel.querySelector(`tr[data-mid="${id}"]`);
        if (row) {
          const pill = row.querySelector('.id-pill.active, .id-pill.inactive');
          if (pill) {
            pill.className = `id-pill ${res.is_active ? 'active' : 'inactive'}`;
            pill.textContent = res.is_active ? 'Actif' : 'Inactif';
          }
          btn.title = res.is_active ? 'Désactiver' : 'Réactiver';
          btn.innerHTML = res.is_active ? '&#x23F8;&#xFE0F;' : '&#x25B6;&#xFE0F;';
        }
      } catch(e) { alert(`Erreur : ${e.message}`); }
    });
  });

  panel.querySelectorAll('.id-m-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.member;
      if (!confirm('Supprimer définitivement ce membre ? Cette action est irréversible.')) return;
      try {
        await _del(`/api/members/${id}`);
        delete cache.members;
        const row = panel.querySelector(`tr[data-mid="${id}"]`);
        if (row) row.remove();
      } catch(e) { alert(`Erreur : ${e.message}`); }
    });
  });
}

// ── Invite modal ──────────────────────────────────────────────────────────────

async function _setupInviteBtn(panel, cache) {
  const btn = panel.querySelector('#id-invite-open-btn');
  if (!btn) return;
  // Cacher le bouton pour les non-admins (vérification lazy, résultat mis en cache)
  if (cache.canInvite === undefined) {
    try {
      const tok = localStorage.getItem('nexhire_token');
      const r = await fetch('/api/auth/me', tok ? { headers: { Authorization: `Bearer ${tok}` } } : { credentials: 'include' });
      const me = r.ok ? await r.json() : null;
      cache.canInvite = me && ['owner', 'admin'].includes(me.role);
    } catch { cache.canInvite = false; }
  }
  if (!cache.canInvite) { btn.style.display = 'none'; return; }
  btn.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'id-modal-overlay';
    overlay.innerHTML = `
      <div class="id-modal" role="dialog" aria-modal="true">
        <h4>✉️ Inviter un utilisateur</h4>
        <p>Un email d'invitation sera envoyé à l'adresse indiquée.</p>
        <div class="id-field">
          <label>Adresse email</label>
          <input type="email" id="id-inv-email" placeholder="prenom.nom@organisation.ca" autocomplete="off" />
        </div>
        <div class="id-field">
          <label>Rôle</label>
          <select id="id-inv-role">
            <option value="user">Utilisateur</option>
            <option value="manager">Gestionnaire</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
        <div class="id-toast-ok" id="id-inv-ok">✅ Invitation envoyée avec succès.</div>
        <div class="id-modal-actions">
          <button class="id-btn id-btn-ghost" id="id-inv-cancel">Annuler</button>
          <button class="id-btn id-btn-primary" id="id-inv-send">Envoyer l'invitation</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#id-inv-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const sendBtn = overlay.querySelector('#id-inv-send');
    sendBtn.addEventListener('click', async () => {
      const email = overlay.querySelector('#id-inv-email').value.trim();
      const role  = overlay.querySelector('#id-inv-role').value;
      if (!email) { overlay.querySelector('#id-inv-email').focus(); return; }
      sendBtn.disabled = true;
      sendBtn.textContent = '⏳ Envoi…';
      try {
        await _post('/api/members/invite', { email, role });
        overlay.querySelector('#id-inv-ok').classList.add('show');
        delete cache.invites;
        setTimeout(() => overlay.remove(), 1800);
      } catch (err) {
        sendBtn.disabled = false;
        sendBtn.textContent = "Envoyer l'invitation";
        alert(`Erreur : ${err.message}`);
      }
    });
  });
}

// ── Panel render ──────────────────────────────────────────────────────────────

async function _renderTab(panel, container, tabId, cache) {
  panel.innerHTML = `<div class="id-loader"><div class="id-spinner"></div><span>Chargement…</span></div>`;
  try {
    if (tabId === 'users') {
      const data = cache.members || (cache.members = await _get('/api/members'));
      panel.innerHTML = _renderUsers(data);
      _setupUserActions(panel, cache);
    } else if (tabId === 'invites') {
      const [invites, roleReqs] = await Promise.all([
        cache.invites   || (cache.invites   = _get('/api/invitations').catch(() => [])),
        cache.roleReqs  || (cache.roleReqs  = _get('/api/role-requests').catch(() => [])),
      ]);
      panel.innerHTML = _renderInvites(invites, roleReqs);
      _setupInviteBtn(panel, cache);
    } else if (tabId === 'mfa') {
      const mfa = cache.mfa || (cache.mfa = await _get('/api/mfa/status').catch(() => ({})));
      panel.innerHTML = _renderMFA(mfa, container);
      _setupMFAToggle(container, cache);
    } else if (tabId === 'sso') {
      const [ssoConfig, entraGroups, entraIds] = await Promise.all([
        cache.ssoConfig   || (cache.ssoConfig   = _get('/api/sso/config').catch(() => ({ configured: false }))),
        cache.entraGroups || (cache.entraGroups = _get('/api/intelligence/entra/groups').catch(() => [])),
        cache.entraIds    || (cache.entraIds    = _get('/api/intelligence/entra/identities').catch(() => [])),
      ]);
      panel.innerHTML = _renderSSO(ssoConfig, entraGroups, entraIds);
    }
  } catch (err) {
    panel.innerHTML = `<div class="id-empty">Erreur de chargement (${err.message})</div>`;
  }
}

async function _load(container) {
  const cache = {};
  let activeTab = 'users';

  container.innerHTML = `<div class="id">
    <div class="id-hd">
      <div class="id-logo">🔐</div>
      <div>
        <h1 class="id-title">Identity & Access</h1>
        <p class="id-sub">Utilisateurs · Invitations · MFA · SSO · Entra ID</p>
      </div>
    </div>
    <div class="id-tabs" id="id-tabs">
      ${_TABS.map(t => `<button class="id-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div id="id-panel"></div>
  </div>`;

  const panel = container.querySelector('#id-panel');
  await _renderTab(panel, container, activeTab, cache);

  container.querySelector('#id-tabs').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    container.querySelectorAll('.id-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    await _renderTab(panel, container, activeTab, cache);
  });
}

export default {
  mount(container) { _css(); _load(container); },
  unmount(container) { container.innerHTML = ''; },
};
