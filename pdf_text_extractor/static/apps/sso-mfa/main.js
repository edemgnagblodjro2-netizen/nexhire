/**
 * AgentHub Platform — SSO & MFA
 * Gestion centralisée des identités, fournisseurs SSO et authentification multifacteur.
 * API: GET /api/sso/providers  GET /api/sso/config  POST /api/sso/config
 *      GET /api/mfa/status     POST /api/mfa/require-org
 */

const _CSS_ID = 'sso-css';
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
const _fmt = (s) => s ? new Date(s).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.sso{padding:28px 32px;max-width:1100px;margin:0 auto;font-family:var(--font);animation:ds-fade-in .25s ease}
.sso-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
.sso-hd-left{display:flex;align-items:center;gap:14px}
.sso-logo{width:42px;height:42px;border-radius:var(--r-lg);background:linear-gradient(135deg,#1e40af,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0}
.sso-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.sso-sub{font-size:13px;color:var(--muted);margin:2px 0 0}

/* Status bar */
.sso-status-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.sso-stat{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.sso-stat-icon{font-size:20px;margin-bottom:8px}
.sso-stat-val{font-size:22px;font-weight:800;color:var(--text);line-height:1}
.sso-stat-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.sso-stat-sub{font-size:12px;font-weight:600;margin-top:5px}
.sso-stat-sub.ok{color:#16a34a}.sso-stat-sub.warn{color:#d97706}.sso-stat-sub.err{color:#dc2626}

/* Tabs */
.sso-tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:24px}
.sso-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-sub);cursor:pointer;font-family:inherit;transition:color .15s;margin-bottom:-1px;white-space:nowrap}
.sso-tab:hover:not(.active){color:var(--text-2)}
.sso-tab.active{color:var(--primary);border-bottom-color:var(--primary)}

.sso-section-label{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}

/* Provider cards */
.sso-providers-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:28px}
.sso-provider-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;display:flex;align-items:center;gap:16px;position:relative;transition:box-shadow .15s,border-color .15s}
.sso-provider-card:hover{box-shadow:var(--shadow);border-color:var(--primary-a20)}
.sso-provider-card.configured{border-color:var(--color-ok-border)}
.sso-provider-logo{width:52px;height:52px;border-radius:var(--r-lg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;background:var(--bg-2)}
.sso-provider-body{flex:1;min-width:0}
.sso-provider-name{font-size:14px;font-weight:700;color:var(--text);margin:0 0 3px}
.sso-provider-desc{font-size:12px;color:var(--muted);margin:0;line-height:1.4}
.sso-provider-status{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;font-weight:600}
.sso-provider-status.ok{color:var(--color-ok)}
.sso-provider-status.off{color:var(--muted)}
.sso-provider-action{flex-shrink:0}
.sso-btn{padding:7px 16px;border-radius:var(--r);font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
.sso-btn-primary{background:var(--primary);color:#fff}.sso-btn-primary:hover{opacity:.85}
.sso-btn-outline{background:var(--card);color:var(--text-2);border:1px solid var(--border)}.sso-btn-outline:hover{border-color:var(--primary);color:var(--primary)}
.sso-btn-ok{background:var(--color-ok-bg);color:var(--color-ok)}.sso-btn-ok:hover{background:var(--color-ok-soft)}
.sso-btn-danger{background:var(--color-err-bg);color:var(--color-err)}.sso-btn-danger:hover{background:var(--color-err-soft)}

/* Config form */
.sso-config-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}
.sso-config-card-hd{padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.sso-config-card-hd-icon{font-size:20px}
.sso-config-card-hd-title{font-size:14px;font-weight:700;color:var(--text)}
.sso-config-card-hd-sub{font-size:12px;color:var(--muted);margin:1px 0 0}
.sso-config-card-body{padding:20px}
.sso-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sso-form-field{display:flex;flex-direction:column;gap:4px}
.sso-form-label{font-size:12px;font-weight:600;color:var(--text-2)}
.sso-form-input{border:1px solid var(--border);border-radius:var(--r);padding:7px 12px;font-size:13px;color:var(--text);font-family:inherit;background:var(--card);outline:none;transition:border-color .15s}
.sso-form-input:focus{border-color:var(--primary);box-shadow:0 0 0 1px var(--primary)}
.sso-form-full{grid-column:1/-1}
.sso-form-actions{display:flex;gap:8px;margin-top:16px}

/* MFA */
.sso-mfa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
.sso-mfa-method{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;display:flex;flex-direction:column;gap:10px;position:relative}
.sso-mfa-method.enabled{border-color:var(--color-ok-border)}
.sso-mfa-method-icon{font-size:32px}
.sso-mfa-method-title{font-size:14px;font-weight:700;color:var(--text)}
.sso-mfa-method-desc{font-size:12px;color:var(--muted);line-height:1.45;flex:1}
.sso-mfa-toggle{display:flex;align-items:center;gap:8px;margin-top:4px}
.sso-toggle-track{width:36px;height:20px;border-radius:99px;background:var(--bg-2);cursor:pointer;position:relative;transition:background .2s;border:1px solid var(--border)}
.sso-toggle-track.on{background:var(--primary);border-color:var(--primary)}
.sso-toggle-thumb{width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.sso-toggle-track.on .sso-toggle-thumb{transform:translateX(16px)}
.sso-toggle-label{font-size:12px;font-weight:600;color:var(--text-2)}

/* Sessions */
.sso-table-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}
.sso-table-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.sso-table-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}
.sso-table{width:100%;border-collapse:collapse;font-size:12px}
.sso-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:0 14px 10px;border-bottom:1px solid var(--border)}
.sso-table td{padding:11px 14px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.sso-table tr:last-child td{border-bottom:none}
.sso-table tr:hover td{background:var(--bg-2)}
.sso-badge{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill)}
.sso-badge-ok{background:#dcfce7;color:#16a34a}
.sso-badge-warn{background:#fef9c3;color:#a16207}
.sso-badge-info{background:#dbeafe;color:#1d4ed8}
.sso-badge-muted{background:var(--bg-2);color:var(--muted)}

/* Atlas */
.sso-atlas{background:linear-gradient(135deg,var(--primary-lt),#fff);border:1px solid var(--primary-a20);border-radius:var(--r-xl);padding:20px 24px;margin-bottom:24px}
.sso-atlas-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.sso-atlas-icon{font-size:22px}
.sso-atlas-title{font-size:14px;font-weight:700;color:var(--text)}
.sso-atlas-list{display:flex;flex-direction:column;gap:7px}
.sso-atlas-item{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--text-body);line-height:1.45}
.sso-atlas-dot{width:6px;height:6px;border-radius:50%;background:var(--primary);margin-top:5px;flex-shrink:0}

/* Empty */
.sso-empty{text-align:center;padding:48px 20px}
.sso-empty-icon{font-size:48px;margin-bottom:12px}
.sso-empty-title{font-size:17px;font-weight:700;color:var(--text);margin:0 0 8px}
.sso-empty-desc{font-size:13px;color:var(--muted);max-width:360px;margin:0 auto 20px;line-height:1.6}
.sso-empty-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}

@media(max-width:768px){
  .sso{padding:16px}
  .sso-status-bar{grid-template-columns:repeat(2,1fr)}
  .sso-providers-grid{grid-template-columns:1fr}
  .sso-mfa-grid{grid-template-columns:1fr}
  .sso-form-grid{grid-template-columns:1fr}
}
`;
  document.head.appendChild(s);
}

let _st = null;

const PROVIDERS = [
  { id: 'azure', name: 'Microsoft Entra ID', icon: '🔷', desc: 'Authentification SSO avec Azure Active Directory / Microsoft 365. Recommandé pour les organisations Microsoft.', configured: false },
  { id: 'google', name: 'Google Workspace', icon: '🟢', desc: 'Connexion SSO via Google Workspace (anciennement G Suite). Idéal pour les équipes utilisant Gmail et Google Drive.', configured: false },
  { id: 'okta', name: 'Okta', icon: '🔵', desc: 'Leader de la gestion des identités d\'entreprise. Supporte MFA avancé, SCIM et des centaines d\'intégrations.', configured: false },
  { id: 'auth0', name: 'Auth0 / Okta CIC', icon: '⚫', desc: 'Plateforme d\'identité hautement personnalisable pour les applications modernes. Idéal pour une expérience white-label.', configured: false },
];

const MFA_METHODS = [
  { id: 'totp', icon: '📱', title: 'Application d\'authentification', desc: 'Google Authenticator, Microsoft Authenticator, Authy. La méthode la plus sécurisée et recommandée.', enabled: false },
  { id: 'sms', icon: '💬', title: 'SMS / Téléphone', desc: 'Code à usage unique envoyé par SMS. Moins sécurisé que TOTP, mais plus facile à adopter.', enabled: false },
  { id: 'email', icon: '📧', title: 'Code par courriel', desc: 'Code temporaire envoyé à l\'adresse courriel de l\'utilisateur. Option de récupération recommandée.', enabled: false },
];

const MOCK_SESSIONS = [
  { user: 'Ayaovi Edem', email: 'admin@org.ca', device: 'Chrome / Windows 11', location: 'Montréal, QC', last: '2026-07-03T09:14:00Z', status: 'active' },
  { user: 'Marie Tremblay', email: 'marie.t@org.ca', device: 'Safari / iPhone 15', location: 'Québec, QC', last: '2026-07-03T08:51:00Z', status: 'active' },
  { user: 'Jean Bergeron', email: 'j.bergeron@org.ca', device: 'Firefox / macOS', location: 'Ottawa, ON', last: '2026-07-02T17:30:00Z', status: 'idle' },
];

const MOCK_LOG = [
  { user: 'Ayaowi Edem', event: 'Connexion réussie', method: 'Email/MDP', ip: '104.20.x.x', date: '2026-07-03T09:14:00Z', result: 'ok' },
  { user: 'Marie Tremblay', event: 'Connexion réussie', method: 'Email/MDP', ip: '65.45.x.x', date: '2026-07-03T08:51:00Z', result: 'ok' },
  { user: 'Inconnu', event: 'Tentative de connexion échouée', method: 'Email/MDP', ip: '185.220.x.x', date: '2026-07-03T07:22:00Z', result: 'warn' },
  { user: 'Jean Bergeron', event: 'Déconnexion automatique (inactivité)', method: '—', ip: '24.35.x.x', date: '2026-07-02T19:30:00Z', result: 'info' },
  { user: 'Ayaowi Edem', event: 'Mot de passe modifié', method: 'Profil', ip: '104.20.x.x', date: '2026-07-01T14:12:00Z', result: 'ok' },
];

function _renderOverview(container) {
  const hasSso = PROVIDERS.some(p => p.configured);
  const hasMfa = MFA_METHODS.some(m => m.enabled);

  container.innerHTML = `
<div class="sso-atlas">
  <div class="sso-atlas-hd"><span class="sso-atlas-icon">🤖</span><div class="sso-atlas-title">ATLAS recommande</div></div>
  <div class="sso-atlas-list">
    <div class="sso-atlas-item"><span class="sso-atlas-dot"></span>Activez MFA pour tous les utilisateurs maintenant — c'est l'action de sécurité la plus impactante que vous puissiez faire en 5 minutes.</div>
    <div class="sso-atlas-item"><span class="sso-atlas-dot"></span>Configurez Microsoft Entra ID (Azure AD) si votre organisation utilise Microsoft 365 — les utilisateurs pourront se connecter avec leur compte existant.</div>
    <div class="sso-atlas-item"><span class="sso-atlas-dot"></span>Activez le journal des connexions pour détecter les accès non autorisés.</div>
  </div>
</div>

<div class="sso-section-label">État de la sécurité d'identité</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
  <div class="sso-config-card">
    <div class="sso-config-card-hd">
      <span class="sso-config-card-hd-icon">🔐</span>
      <div>
        <div class="sso-config-card-hd-title">Single Sign-On (SSO)</div>
        <div class="sso-config-card-hd-sub">${hasSso ? 'Configuré' : 'Non configuré'}</div>
      </div>
    </div>
    <div class="sso-config-card-body">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="width:10px;height:10px;border-radius:50%;background:${hasSso ? '#22c55e' : '#d97706'}"></div>
        <span style="font-size:13px;color:var(--text-2)">${hasSso ? 'SSO actif' : 'Aucun fournisseur configuré'}</span>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:0 0 14px;line-height:1.5">
        ${hasSso ? 'Les utilisateurs se connectent via votre fournisseur d\'identité.' : 'Connectez votre annuaire d\'entreprise pour permettre la connexion unique (SSO).'}
      </p>
      <button class="sso-btn sso-btn-primary" onclick="document.querySelector('[data-tab=providers]')?.click()">
        ${hasSso ? 'Gérer les fournisseurs' : 'Configurer le SSO'}
      </button>
    </div>
  </div>
  <div class="sso-config-card">
    <div class="sso-config-card-hd">
      <span class="sso-config-card-hd-icon">📱</span>
      <div>
        <div class="sso-config-card-hd-title">Authentification Multifacteur (MFA)</div>
        <div class="sso-config-card-hd-sub">${hasMfa ? 'Activé' : 'Désactivé'}</div>
      </div>
    </div>
    <div class="sso-config-card-body">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="width:10px;height:10px;border-radius:50%;background:${hasMfa ? '#22c55e' : '#ef4444'}"></div>
        <span style="font-size:13px;color:${hasMfa ? 'var(--color-ok)' : 'var(--color-err)'}">
          ${hasMfa ? 'MFA actif pour l\'organisation' : 'MFA non requis — risque élevé'}
        </span>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:0 0 14px;line-height:1.5">
        Le MFA réduit de 99,9% le risque de compromission de comptes. Activez-le dès maintenant.
      </p>
      <button class="sso-btn sso-btn-primary" onclick="document.querySelector('[data-tab=mfa]')?.click()">
        ${hasMfa ? 'Gérer le MFA' : 'Activer le MFA'}
      </button>
    </div>
  </div>
</div>

<div class="sso-section-label" style="margin-bottom:14px">Connexions récentes</div>
<div class="sso-table-card">
  <div class="sso-table-card-hd">
    <h3>Journal des 5 dernières connexions</h3>
    <button class="sso-btn sso-btn-outline" style="font-size:11px;padding:4px 10px" onclick="document.querySelector('[data-tab=journal]')?.click()">Voir tout →</button>
  </div>
  <div style="overflow-x:auto">
    <table class="sso-table">
      <thead><tr><th>Utilisateur</th><th>Événement</th><th>Méthode</th><th>Date</th><th>Résultat</th></tr></thead>
      <tbody>
        ${MOCK_LOG.slice(0,5).map(l => `
        <tr>
          <td><strong>${l.user}</strong></td>
          <td style="color:var(--text-2)">${l.event}</td>
          <td style="color:var(--muted)">${l.method}</td>
          <td style="color:var(--muted);white-space:nowrap">${_fmt(l.date)}</td>
          <td><span class="sso-badge sso-badge-${l.result === 'ok' ? 'ok' : l.result === 'warn' ? 'warn' : 'info'}">${l.result === 'ok' ? 'Succès' : l.result === 'warn' ? 'Échec' : 'Info'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}

function _renderProviders(container) {
  container.innerHTML = `
<div class="sso-atlas">
  <div class="sso-atlas-hd"><span class="sso-atlas-icon">🔐</span><div class="sso-atlas-title">Fournisseurs d'identité disponibles</div></div>
  <div class="sso-atlas-list">
    <div class="sso-atlas-item"><span class="sso-atlas-dot"></span>Un seul fournisseur peut être actif à la fois. Choisissez celui qui correspond à votre annuaire d'entreprise existant.</div>
    <div class="sso-atlas-item"><span class="sso-atlas-dot"></span>Microsoft Entra ID est recommandé pour les organisations utilisant Microsoft 365.</div>
  </div>
</div>
<div class="sso-section-label">Fournisseurs d'identité</div>
<div class="sso-providers-grid">
  ${PROVIDERS.map(p => `
  <div class="sso-provider-card ${p.configured ? 'configured' : ''}">
    <div class="sso-provider-logo">${p.icon}</div>
    <div class="sso-provider-body">
      <div class="sso-provider-name">${p.name}</div>
      <div class="sso-provider-desc">${p.desc}</div>
      <div class="sso-provider-status ${p.configured ? 'ok' : 'off'}">
        <span>${p.configured ? '●' : '○'}</span>
        <span>${p.configured ? 'Connecté' : 'Non configuré'}</span>
      </div>
    </div>
    <div class="sso-provider-action">
      <button class="sso-btn ${p.configured ? 'sso-btn-ok' : 'sso-btn-primary'}" onclick="window._ssoConfigProvider('${p.id}')">
        ${p.configured ? 'Gérer' : 'Configurer'}
      </button>
    </div>
  </div>`).join('')}
</div>

<div id="sso-config-form"></div>`;

  window._ssoConfigProvider = (id) => {
    const p = PROVIDERS.find(x => x.id === id);
    if (!p) return;
    document.getElementById('sso-config-form').innerHTML = `
<div class="sso-config-card">
  <div class="sso-config-card-hd">
    <span class="sso-config-card-hd-icon">${p.icon}</span>
    <div>
      <div class="sso-config-card-hd-title">Configurer ${p.name}</div>
      <div class="sso-config-card-hd-sub">Entrez les informations de votre application ${p.name}</div>
    </div>
  </div>
  <div class="sso-config-card-body">
    <div class="sso-form-grid">
      <div class="sso-form-field">
        <label class="sso-form-label">Client ID *</label>
        <input class="sso-form-input" type="text" placeholder="Ex: 12345678-abcd-..." id="sso-client-id">
      </div>
      <div class="sso-form-field">
        <label class="sso-form-label">Client Secret *</label>
        <input class="sso-form-input" type="password" placeholder="••••••••" id="sso-client-secret">
      </div>
      ${p.id === 'azure' ? `
      <div class="sso-form-field sso-form-full">
        <label class="sso-form-label">Tenant ID (Azure)</label>
        <input class="sso-form-input" type="text" placeholder="Ex: 87654321-wxyz-..." id="sso-tenant-id">
      </div>` : ''}
      <div class="sso-form-field sso-form-full">
        <label class="sso-form-label">URL de callback (à copier dans votre app ${p.name})</label>
        <input class="sso-form-input" type="text" value="${window.location.origin}/api/sso/callback" readonly style="background:var(--bg-2);cursor:copy" onclick="navigator.clipboard?.writeText(this.value).then(()=>{this.style.borderColor='var(--color-ok)';setTimeout(()=>this.style.borderColor='',1500)})">
      </div>
    </div>
    <div class="sso-form-actions">
      <button class="sso-btn sso-btn-primary" onclick="window._ssoSave('${p.id}')">Enregistrer et tester la connexion</button>
      <button class="sso-btn sso-btn-outline" onclick="document.getElementById('sso-config-form').innerHTML=''">Annuler</button>
    </div>
  </div>
</div>`;
    document.getElementById('sso-config-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window._ssoSave = async (id) => {
    const clientId = document.getElementById('sso-client-id')?.value || '';
    const clientSecret = document.getElementById('sso-client-secret')?.value || '';
    if (!clientId || !clientSecret) { alert('Veuillez remplir les champs obligatoires.'); return; }
    try {
      await _api('/api/sso/config', { method: 'POST', body: JSON.stringify({ provider: id, client_id: clientId, client_secret: clientSecret }) });
      const p = PROVIDERS.find(x => x.id === id);
      if (p) p.configured = true;
      _renderProviders(document.getElementById('sso-content'));
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };
}

function _renderMfa(container) {
  container.innerHTML = `
<div class="sso-atlas">
  <div class="sso-atlas-hd"><span class="sso-atlas-icon">🛡️</span><div class="sso-atlas-title">Authentification Multifacteur (MFA)</div></div>
  <div class="sso-atlas-list">
    <div class="sso-atlas-item"><span class="sso-atlas-dot"></span>Activez TOTP (application d'authentification) en priorité — c'est la méthode la plus sécurisée et résistante au phishing.</div>
    <div class="sso-atlas-item"><span class="sso-atlas-dot"></span>Rendez le MFA obligatoire pour toute l'organisation depuis la section "Sécurité organisationnelle" ci-dessous.</div>
  </div>
</div>

<div class="sso-section-label">Méthodes MFA disponibles</div>
<div class="sso-mfa-grid">
  ${MFA_METHODS.map(m => `
  <div class="sso-mfa-method ${m.enabled ? 'enabled' : ''}" id="mfa-method-${m.id}">
    <div class="sso-mfa-method-icon">${m.icon}</div>
    <div class="sso-mfa-method-title">${m.title}</div>
    <div class="sso-mfa-method-desc">${m.desc}</div>
    <div class="sso-mfa-toggle">
      <div class="sso-toggle-track ${m.enabled ? 'on' : ''}" onclick="window._toggleMfa('${m.id}')" style="cursor:pointer">
        <div class="sso-toggle-thumb"></div>
      </div>
      <span class="sso-toggle-label">${m.enabled ? 'Activé' : 'Désactivé'}</span>
    </div>
  </div>`).join('')}
</div>

<div class="sso-config-card">
  <div class="sso-config-card-hd">
    <span class="sso-config-card-hd-icon">🏢</span>
    <div>
      <div class="sso-config-card-hd-title">Sécurité organisationnelle</div>
      <div class="sso-config-card-hd-sub">Règles de MFA pour tous les membres de l'organisation</div>
    </div>
  </div>
  <div class="sso-config-card-body">
    <div style="display:flex;flex-direction:column;gap:14px">
      ${[
        ['Rendre MFA obligatoire pour tous les utilisateurs', 'Aucune connexion ne sera autorisée sans MFA. Recommandé.'],
        ['Rendre MFA obligatoire pour les administrateurs', 'Exige MFA uniquement pour les comptes admin et owner.'],
        ['Autoriser MFA par SMS uniquement comme récupération', 'Le SMS peut être utilisé si l\'app d\'authentification est indisponible.'],
      ].map(([label, sub]) => `
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div class="sso-toggle-track" style="margin-top:2px;cursor:pointer">
          <div class="sso-toggle-thumb"></div>
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">${label}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${sub}</div>
        </div>
      </div>`).join('')}
    </div>
    <div style="margin-top:20px">
      <button class="sso-btn sso-btn-primary" onclick="window._requireMfa()">Appliquer les règles MFA</button>
    </div>
  </div>
</div>`;

  window._toggleMfa = (id) => {
    const m = MFA_METHODS.find(x => x.id === id);
    if (!m) return;
    m.enabled = !m.enabled;
    const card = document.getElementById(`mfa-method-${id}`);
    if (card) {
      card.classList.toggle('enabled', m.enabled);
      const track = card.querySelector('.sso-toggle-track');
      if (track) track.classList.toggle('on', m.enabled);
      const lbl = card.querySelector('.sso-toggle-label');
      if (lbl) lbl.textContent = m.enabled ? 'Activé' : 'Désactivé';
    }
  };

  window._requireMfa = async () => {
    try {
      await _api('/api/mfa/require-org', { method: 'POST', body: JSON.stringify({ require: true }) });
      alert('Règles MFA appliquées pour toute l\'organisation.');
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };
}

function _renderSessions(container) {
  container.innerHTML = `
<div class="sso-section-label" style="margin-bottom:16px">Sessions actives (${MOCK_SESSIONS.length})</div>
<div class="sso-table-card">
  <div class="sso-table-card-hd">
    <h3>Connexions en cours</h3>
    <button class="sso-btn sso-btn-danger" style="font-size:11px;padding:4px 10px">Déconnecter tout le monde</button>
  </div>
  <div style="overflow-x:auto">
    <table class="sso-table">
      <thead><tr><th>Utilisateur</th><th>Appareil</th><th>Localisation</th><th>Dernière activité</th><th>État</th><th>Action</th></tr></thead>
      <tbody>
        ${MOCK_SESSIONS.map(s => `
        <tr>
          <td>
            <strong>${s.user}</strong>
            <div style="font-size:11px;color:var(--muted)">${s.email}</div>
          </td>
          <td style="color:var(--text-2)">${s.device}</td>
          <td style="color:var(--muted)">${s.location}</td>
          <td style="color:var(--muted);white-space:nowrap">${_fmt(s.last)}</td>
          <td><span class="sso-badge sso-badge-${s.status === 'active' ? 'ok' : 'warn'}">${s.status === 'active' ? 'Actif' : 'Inactif'}</span></td>
          <td><button class="sso-btn sso-btn-outline" style="font-size:11px;padding:4px 10px;color:var(--color-err);border-color:var(--color-err)">Révoquer</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}

function _renderJournal(container) {
  container.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
  <div class="sso-section-label" style="margin:0">Journal des connexions</div>
  <div style="display:flex;gap:8px">
    <input class="sso-form-input" type="text" placeholder="Rechercher un utilisateur..." style="width:220px">
    <button class="sso-btn sso-btn-outline">Exporter CSV</button>
  </div>
</div>
<div class="sso-table-card">
  <div style="overflow-x:auto">
    <table class="sso-table">
      <thead><tr><th>Utilisateur</th><th>Événement</th><th>Méthode</th><th>Adresse IP</th><th>Date</th><th>Résultat</th></tr></thead>
      <tbody>
        ${MOCK_LOG.map(l => `
        <tr>
          <td><strong>${l.user}</strong></td>
          <td style="color:var(--text-2)">${l.event}</td>
          <td style="color:var(--muted)">${l.method}</td>
          <td style="color:var(--muted);font-family:monospace;font-size:11px">${l.ip}</td>
          <td style="color:var(--muted);white-space:nowrap">${_fmt(l.date)}</td>
          <td><span class="sso-badge sso-badge-${l.result === 'ok' ? 'ok' : l.result === 'warn' ? 'warn' : 'info'}">${l.result === 'ok' ? 'Succès' : l.result === 'warn' ? 'Échec' : 'Info'}</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}

function _renderView() {
  const area = document.getElementById('sso-content');
  if (!area) return;
  const view = _st.view;
  const map = { overview: _renderOverview, providers: _renderProviders, mfa: _renderMfa, sessions: _renderSessions, journal: _renderJournal };
  (map[view] || _renderOverview)(area);
  document.querySelectorAll('.sso-tab[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === view));
}

function _renderShell(container) {
  container.innerHTML = `
<div class="sso">
  <div class="sso-hd">
    <div class="sso-hd-left">
      <div class="sso-logo">🔐</div>
      <div>
        <div class="sso-title">SSO & MFA</div>
        <div class="sso-sub">Gestion centralisée des identités et de l'authentification</div>
      </div>
    </div>
  </div>

  <div class="sso-status-bar">
    <div class="sso-stat"><div class="sso-stat-icon">👤</div><div class="sso-stat-val" id="sso-users-count">—</div><div class="sso-stat-lbl">Utilisateurs</div><div class="sso-stat-sub warn">MFA non activé</div></div>
    <div class="sso-stat"><div class="sso-stat-icon">🔐</div><div class="sso-stat-val">0</div><div class="sso-stat-lbl">Fournisseurs SSO</div><div class="sso-stat-sub warn">Non configuré</div></div>
    <div class="sso-stat"><div class="sso-stat-icon">📱</div><div class="sso-stat-val">0%</div><div class="sso-stat-lbl">Adoption MFA</div><div class="sso-stat-sub err">Risque élevé</div></div>
    <div class="sso-stat"><div class="sso-stat-icon">⚡</div><div class="sso-stat-val">${MOCK_SESSIONS.length}</div><div class="sso-stat-lbl">Sessions actives</div><div class="sso-stat-sub ok">Tout est normal</div></div>
  </div>

  <div class="sso-tabs">
    <button class="sso-tab active" data-tab="overview">Vue d'ensemble</button>
    <button class="sso-tab" data-tab="providers">Fournisseurs d'identité</button>
    <button class="sso-tab" data-tab="mfa">MFA</button>
    <button class="sso-tab" data-tab="sessions">Sessions actives</button>
    <button class="sso-tab" data-tab="journal">Journal des connexions</button>
  </div>

  <div id="sso-content"></div>
</div>`;

  container.querySelector('.sso-tabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    _st.view = tab.dataset.tab;
    _renderView();
  });

  _api('/api/mfa/status').then(d => {
    const el = document.getElementById('sso-users-count');
    if (el) el.textContent = d?.total_users ?? '—';
  }).catch(() => {});
}

export default {
  mount(container, ctx) {
    _css();
    _st = { ctx, view: 'overview' };
    _renderShell(container);
    _renderView();
  },
  unmount(container) {
    _st = null;
    container.innerHTML = '';
    ['_ssoConfigProvider', '_ssoSave', '_toggleMfa', '_requireMfa'].forEach(k => delete window[k]);
  },
};
