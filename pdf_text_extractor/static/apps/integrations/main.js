/**
 * AgentHub Platform — App: Centre d'intégrations
 * Catalogue unifié des 24 connecteurs Enterprise.
 * API : GET /api/connectors → statuts connectés/déconnectés de l'org
 *       POST /api/oauth/{type}/oauth/start → démarre le flux OAuth
 *       POST /api/connectors/{type}/credentials → sauvegarde les credentials API Key
 *       POST /api/connectors/{type}/ping → teste la connexion
 *       POST /api/connectors/{type}/disconnect → déconnecte
 */

const _CSS_ID = 'int-css';

// ── Catalogue connecteurs ─────────────────────────────────────────────────────
const CONNECTORS = [
  // ── Microsoft Ecosystem
  { type: 'microsoft_365', name: 'Microsoft 365', icon: '🪟', color: '#0078d4',
    category: 'Microsoft', desc: 'Licences M365, Entra ID, Teams, OneDrive, Exchange',
    authType: 'oauth', features: ['Licences E1/E3/E5', 'Entra ID', 'Teams', 'Intune', 'OneDrive'] },
  { type: 'intune', name: 'Microsoft Intune', icon: '📱', color: '#0078d4',
    category: 'Microsoft', desc: 'Gestion des appareils mobiles et postes de travail',
    authType: 'credentials', features: ['Appareils', 'Conformité', 'Applications', 'Politiques'] },

  // ── ERP / Finance
  { type: 'sap', name: 'SAP', icon: '🏭', color: '#0070f2',
    category: 'ERP & Finance', desc: 'Centres de coûts, comptes GL, budgets SAP S/4HANA',
    authType: 'credentials', features: ['Centres de coûts', 'Comptes GL', 'Budget', 'Fournisseurs'] },
  { type: 'netsuite', name: 'NetSuite', icon: '📊', color: '#F26322',
    category: 'ERP & Finance', desc: 'ERP financier et inventaire Oracle NetSuite',
    authType: 'credentials', features: ['Finances', 'Inventaire', 'Clients', 'Rapports'] },
  { type: 'quickbooks', name: 'QuickBooks', icon: '💚', color: '#2CA01C',
    category: 'ERP & Finance', desc: 'Comptabilité et finances PME',
    authType: 'oauth', features: ['Factures', 'Dépenses', 'Clients', 'Rapports financiers'] },
  { type: 'epicor', name: 'Epicor', icon: '🔧', color: '#E31837',
    category: 'ERP & Finance', desc: 'ERP manufacturier Epicor Kinetic',
    authType: 'credentials', features: ['Production', 'Inventaire', 'Achats', 'Qualité'] },

  // ── CRM
  { type: 'salesforce', name: 'Salesforce', icon: '☁️', color: '#00A1E0',
    category: 'CRM & Ventes', desc: 'CRM, pipelines opportunités, comptes clients',
    authType: 'oauth', features: ['Comptes', 'Opportunités', 'Contacts', 'Rapports', 'Tableau de bord'] },
  { type: 'hubspot', name: 'HubSpot', icon: '🟠', color: '#FF7A59',
    category: 'CRM & Ventes', desc: 'CRM marketing & ventes, emailing, automatisation',
    authType: 'oauth', features: ['Contacts', 'Pipelines', 'Emails', 'Workflows'] },

  // ── ITSM / Gestion de projet
  { type: 'jira', name: 'Jira', icon: '🔷', color: '#0052CC',
    category: 'ITSM & Projets', desc: 'Tickets, sprints, projets Jira Software & Service Management',
    authType: 'oauth', features: ['Projets', 'Tickets', 'Sprints', 'Releases', 'Équipes'] },
  { type: 'servicenow', name: 'ServiceNow', icon: '🟢', color: '#62D84E',
    category: 'ITSM & Projets', desc: 'ITSM, CMDB, gestion des incidents et demandes',
    authType: 'oauth', features: ['Incidents', 'Demandes', 'CMDB', 'Changements'] },
  { type: 'autotask', name: 'Autotask', icon: '🔩', color: '#F04E23',
    category: 'ITSM & Projets', desc: 'PSA Autotask — tickets, projets, facturation MSP',
    authType: 'credentials', features: ['Tickets', 'Projets', 'Contrats', 'Facturation'] },

  // ── Gestion des tâches
  { type: 'asana', name: 'Asana', icon: '🎯', color: '#F06A6A',
    category: 'Gestion des tâches', desc: 'Gestion de projets et tâches en équipe',
    authType: 'credentials', features: ['Projets', 'Tâches', 'Jalons', 'Équipes'] },
  { type: 'monday', name: 'Monday.com', icon: '📅', color: '#F02E65',
    category: 'Gestion des tâches', desc: 'Work OS — tableaux, automatisations, intégrations',
    authType: 'credentials', features: ['Tableaux', 'Automatisations', 'Rapports', 'Dashboards'] },
  { type: 'clickup', name: 'ClickUp', icon: '✅', color: '#7B68EE',
    category: 'Gestion des tâches', desc: 'Productivité tout-en-un, tâches, docs, objectifs',
    authType: 'credentials', features: ['Espaces', 'Tâches', 'Documents', 'Objectifs'] },

  // ── RH & Paie
  { type: 'workday', name: 'Workday', icon: '👥', color: '#E37B26',
    category: 'RH & Paie', desc: 'HCM Workday — RH, paie, talents, budgets',
    authType: 'credentials', features: ['Employés', 'Paie', 'Recrutement', 'Formation'] },
  { type: 'bamboohr', name: 'BambooHR', icon: '🌿', color: '#6ab04c',
    category: 'RH & Paie', desc: 'SIRH PME — employés, congés, onboarding',
    authType: 'credentials', features: ['Employés', 'Congés', 'Onboarding', 'Rapports RH'] },
  { type: 'adp', name: 'ADP', icon: '💼', color: '#D40000',
    category: 'RH & Paie', desc: 'Paie et gestion des ressources humaines ADP',
    authType: 'credentials', features: ['Paie', 'Avantages', 'Temps', 'Conformité'] },

  // ── Collaboration & Support
  { type: 'slack', name: 'Slack', icon: '💬', color: '#4A154B',
    category: 'Collaboration', desc: 'Messagerie d\'équipe, canaux, workflows Slack',
    authType: 'oauth', features: ['Canaux', 'Messages', 'Workflows', 'Applications'] },
  { type: 'zendesk', name: 'Zendesk', icon: '🎧', color: '#03363D',
    category: 'Collaboration', desc: 'Support client, tickets, base de connaissances',
    authType: 'oauth', features: ['Tickets', 'Chat', 'Base KB', 'Rapports'] },
  { type: 'google_workspace', name: 'Google Workspace', icon: '🔵', color: '#4285F4',
    category: 'Collaboration', desc: 'Gmail, Drive, Meet, Calendar, Docs',
    authType: 'oauth', features: ['Gmail', 'Drive', 'Meet', 'Docs', 'Calendar'] },

  // ── Sécurité
  { type: 'crowdstrike', name: 'CrowdStrike', icon: '🦅', color: '#FF0000',
    category: 'Sécurité', desc: 'Endpoint security, EDR, Falcon Intelligence',
    authType: 'credentials', features: ['EDR', 'Threat Intel', 'Vulnérabilités', 'Incidents'] },

  // ── Cloud & Infra
  { type: 'aws', name: 'Amazon Web Services', icon: '☁️', color: '#FF9900',
    category: 'Cloud & Infra', desc: 'Coûts AWS, services actifs, sécurité IAM',
    authType: 'credentials', features: ['Coûts', 'Services', 'IAM', 'Sécurité'] },
];

// Catégories pour le filtre
const CATEGORIES = ['Tous', 'Microsoft', 'ERP & Finance', 'CRM & Ventes', 'ITSM & Projets',
  'Gestion des tâches', 'RH & Paie', 'Collaboration', 'Sécurité', 'Cloud & Infra'];

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.int{padding:var(--sp-8);max-width:1200px;margin:0 auto;font-family:var(--font)}
.int-hd{margin-bottom:28px}
.int-hd-top{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.int-hd-left{display:flex;align-items:center;gap:14px}
.int-logo{width:40px;height:40px;border-radius:var(--r-lg);background:linear-gradient(135deg,var(--primary),#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}
.int-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.int-sub{font-size:13px;color:var(--muted);margin:2px 0 0}
.int-summary{display:flex;gap:24px;flex-wrap:wrap}
.int-sum-item{display:flex;align-items:center;gap:8px;font-size:13px}
.int-sum-dot{width:10px;height:10px;border-radius:50%}
.int-sum-dot.connected{background:var(--color-ok)}
.int-sum-dot.disconnected{background:var(--bg-2);border:2px solid var(--border)}

/* Filters */
.int-cats{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px}
.int-cat-btn{padding:6px 14px;border:1px solid var(--border);border-radius:var(--r-pill);font-size:12px;font-weight:600;background:var(--bg);color:var(--muted);cursor:pointer;font-family:inherit;transition:all .15s}
.int-cat-btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}
.int-cat-btn:hover:not(.active){background:var(--bg-2)}

/* Grid */
.int-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.int-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;transition:box-shadow .15s}
.int-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.08)}
.int-card.connected{border-color:var(--color-ok-border)}
.int-card-hd{padding:16px 18px;display:flex;align-items:flex-start;gap:12px}
.int-conn-icon{font-size:28px;flex-shrink:0;width:44px;height:44px;border-radius:var(--r);display:flex;align-items:center;justify-content:center;background:var(--bg)}
.int-conn-name{font-size:14px;font-weight:700;color:var(--text);margin:0 0 2px}
.int-conn-cat{font-size:11px;color:var(--muted)}
.int-status{margin-left:auto;flex-shrink:0}
.int-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:var(--r-pill);text-transform:uppercase;letter-spacing:.04em}
.int-badge.connected{background:var(--color-ok-soft);color:var(--color-ok-text)}
.int-badge.disconnected{background:var(--bg-2);color:var(--muted)}
.int-card-body{padding:0 18px 18px}
.int-conn-desc{font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:12px}
.int-features{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px}
.int-feat-tag{font-size:10px;background:var(--bg-2);color:var(--muted);padding:2px 8px;border-radius:var(--r-pill)}
.int-card-footer{display:flex;gap:8px}
.int-btn{flex:1;padding:8px 12px;border-radius:var(--r);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;border:none;transition:all .15s;text-align:center}
.int-btn.primary{background:var(--primary);color:#fff}
.int-btn.primary:hover{opacity:.88}
.int-btn.secondary{background:var(--bg-2);color:var(--text);border:1px solid var(--border)}
.int-btn.secondary:hover{background:var(--border)}
.int-btn.danger{background:var(--color-err-soft);color:var(--color-err-text)}
.int-btn.danger:hover{background:var(--color-err);color:#fff}
.int-btn:disabled{opacity:.5;cursor:default}

/* Modal overlay */
.int-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.int-modal{background:var(--card);border-radius:var(--r-xl);padding:28px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.int-modal h2{font-size:16px;font-weight:800;color:var(--text);margin:0 0 6px}
.int-modal-sub{font-size:13px;color:var(--muted);margin-bottom:20px}
.int-field{margin-bottom:14px}
.int-label{display:block;font-size:12px;font-weight:600;color:var(--text);margin-bottom:5px}
.int-input{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:inherit;background:var(--bg);color:var(--text);box-sizing:border-box}
.int-input:focus{outline:none;border-color:var(--primary)}
.int-modal-btns{display:flex;gap:10px;margin-top:20px}
.int-modal-err{font-size:12px;color:var(--color-err-text);margin-top:8px;display:none}

/* Loader */
.int-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 0;color:var(--muted)}
.int-spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:intspin .7s linear infinite}
@keyframes intspin{to{transform:rotate(360deg)}}

/* Connected info */
.int-conn-info{font-size:11px;color:var(--color-ok-text);margin-top:6px}

@media(max-width:640px){.int-grid{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _token(); return t ? { Authorization: `Bearer ${t}` } : {}; }
async function _api(path, opts = {}) {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json', ..._h() }, credentials: 'include', ...opts });
  if (!r.ok) throw new Error(r.status);
  return r.status === 204 ? null : r.json();
}

function _fmtDate(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return null; }
}

// ── Modal credentials ─────────────────────────────────────────────────────────
function _credentialsFields(type) {
  const fields = {
    sap:       [{ key: 'base_url', label: 'URL SAP (ex: https://sap.corp)' }, { key: 'username', label: 'Utilisateur' }, { key: 'password', label: 'Mot de passe', type: 'password' }, { key: 'client', label: 'Client (Mandant)' }],
    workday:   [{ key: 'tenant', label: 'Tenant Workday' }, { key: 'client_id', label: 'Client ID' }, { key: 'client_secret', label: 'Client Secret', type: 'password' }],
    intune:    [{ key: 'tenant_id', label: 'Tenant ID Azure' }, { key: 'client_id', label: 'Client ID' }, { key: 'client_secret', label: 'Client Secret', type: 'password' }],
    aws:       [{ key: 'access_key_id', label: 'Access Key ID' }, { key: 'secret_access_key', label: 'Secret Access Key', type: 'password' }, { key: 'region', label: 'Région (ex: ca-central-1)' }],
    crowdstrike: [{ key: 'client_id', label: 'Client ID' }, { key: 'client_secret', label: 'Client Secret', type: 'password' }, { key: 'cloud', label: 'Cloud (us-1, us-2, eu-1)' }],
    bamboohr:  [{ key: 'subdomain', label: 'Sous-domaine BambooHR' }, { key: 'api_key', label: 'Clé API', type: 'password' }],
    adp:       [{ key: 'client_id', label: 'Client ID' }, { key: 'client_secret', label: 'Client Secret', type: 'password' }],
    autotask:  [{ key: 'username', label: 'Courriel Autotask' }, { key: 'api_key', label: 'Clé API', type: 'password' }, { key: 'zone_info_url', label: 'Zone Info URL (optionnel)' }],
    netsuite:  [{ key: 'account_id', label: 'Account ID' }, { key: 'client_id', label: 'Consumer Key' }, { key: 'client_secret', label: 'Consumer Secret', type: 'password' }],
    epicor:    [{ key: 'base_url', label: 'URL Epicor' }, { key: 'username', label: 'Utilisateur' }, { key: 'password', label: 'Mot de passe', type: 'password' }],
    asana:     [{ key: 'api_key', label: 'Personal Access Token', type: 'password' }],
    monday:    [{ key: 'api_key', label: 'Clé API Monday.com', type: 'password' }],
    clickup:   [{ key: 'api_key', label: 'Clé API ClickUp', type: 'password' }],
  };
  return fields[type] || [{ key: 'api_key', label: 'Clé API', type: 'password' }];
}

function _showCredentialsModal(container, meta, onSuccess) {
  const fields = _credentialsFields(meta.type);
  const overlay = document.createElement('div');
  overlay.className = 'int-modal-overlay';
  overlay.innerHTML = `<div class="int-modal">
    <h2>${meta.icon} Connecter ${meta.name}</h2>
    <p class="int-modal-sub">Entrez vos identifiants ${meta.name}. Ils sont chiffrés et stockés de façon sécurisée.</p>
    ${fields.map(f => `<div class="int-field">
      <label class="int-label">${f.label}</label>
      <input class="int-input" data-key="${f.key}" type="${f.type || 'text'}" placeholder="${f.label}">
    </div>`).join('')}
    <div class="int-modal-err" id="int-modal-err">Erreur de connexion. Vérifiez vos identifiants.</div>
    <div class="int-modal-btns">
      <button class="int-btn secondary" id="int-modal-cancel" style="flex:none;padding:8px 18px">Annuler</button>
      <button class="int-btn primary" id="int-modal-save">Connecter →</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#int-modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  overlay.querySelector('#int-modal-save').addEventListener('click', async () => {
    const btn = overlay.querySelector('#int-modal-save');
    const errEl = overlay.querySelector('#int-modal-err');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Connexion…';

    const body = {};
    overlay.querySelectorAll('.int-input[data-key]').forEach(inp => {
      if (inp.value.trim()) body[inp.dataset.key] = inp.value.trim();
    });

    try {
      await _api(`/api/connectors/${meta.type}/credentials`, { method: 'POST', body: JSON.stringify(body) });
      await _api(`/api/connectors/${meta.type}/ping`, { method: 'POST' });
      overlay.remove();
      onSuccess();
    } catch {
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Connecter →';
    }
  });
}

// ── Render cards ──────────────────────────────────────────────────────────────
function _renderCards(container, allConnectors, filter, connected) {
  const grid = container.querySelector('#int-grid');
  if (!grid) return;

  const filtered = filter === 'Tous' ? allConnectors : allConnectors.filter(c => c.category === filter);
  const slug = window.location.pathname.split('/')[2] || 'demo';

  grid.innerHTML = filtered.map(meta => {
    const live = connected.find(c => c.connector_type === meta.type);
    const isConnected = live && live.status === 'active';
    const connectedAt = live ? _fmtDate(live.connected_at) : null;

    return `<div class="int-card ${isConnected ? 'connected' : ''}" data-type="${meta.type}">
      <div class="int-card-hd">
        <div class="int-conn-icon">${meta.icon}</div>
        <div style="flex:1;min-width:0">
          <div class="int-conn-name">${meta.name}</div>
          <div class="int-conn-cat">${meta.category}</div>
          ${isConnected && connectedAt ? `<div class="int-conn-info">✅ Connecté le ${connectedAt}</div>` : ''}
        </div>
        <div class="int-status">
          <span class="int-badge ${isConnected ? 'connected' : 'disconnected'}">${isConnected ? 'Connecté' : 'Non connecté'}</span>
        </div>
      </div>
      <div class="int-card-body">
        <div class="int-conn-desc">${meta.desc}</div>
        <div class="int-features">${meta.features.map(f => `<span class="int-feat-tag">${f}</span>`).join('')}</div>
        <div class="int-card-footer">
          ${isConnected
            ? `<button class="int-btn secondary" data-action="ping" data-type="${meta.type}">⚡ Tester</button>
               <button class="int-btn danger" data-action="disconnect" data-type="${meta.type}">Déconnecter</button>`
            : meta.authType === 'oauth'
              ? `<button class="int-btn primary" data-action="oauth" data-type="${meta.type}" data-slug="${slug}">🔗 Connecter via OAuth</button>`
              : `<button class="int-btn primary" data-action="credentials" data-type="${meta.type}">🔑 Entrer les identifiants</button>`
          }
        </div>
      </div>
    </div>`;
  }).join('');

  // Wire actions
  grid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { action, type, slug: btnSlug } = btn.dataset;
      const meta = CONNECTORS.find(c => c.type === type);
      if (!meta) return;

      if (action === 'oauth') {
        try {
          btn.disabled = true; btn.textContent = '⏳ Connexion…';
          const slug = location.pathname.split('/')[2] || '';
          const res = await _api(`/api/connectors/${type}/oauth/start`, { method: 'POST', body: JSON.stringify({ partner_slug: slug }) });
          if (res?.authorization_url) {
            window.location.href = res.authorization_url;
          } else {
            throw new Error('URL manquante');
          }
        } catch (e) {
          btn.disabled = false; btn.textContent = '🔗 Connecter';
          alert(`Erreur OAuth : ${e.message}`);
        }
        return;
      }
      if (action === 'credentials') {
        _showCredentialsModal(container, meta, () => _reload(container));
        return;
      }
      if (action === 'ping') {
        btn.disabled = true; btn.textContent = '⏳ Test…';
        try {
          const r = await _api(`/api/connectors/${type}/ping`, { method: 'POST' });
          btn.textContent = r?.ok ? '✅ OK' : '❌ Échec';
        } catch { btn.textContent = '❌ Erreur'; }
        setTimeout(() => { btn.disabled = false; btn.textContent = '⚡ Tester'; }, 2000);
        return;
      }
      if (action === 'disconnect') {
        if (!confirm(`Déconnecter ${meta.name} ?`)) return;
        btn.disabled = true; btn.textContent = '…';
        try {
          await _api(`/api/connectors/${type}/disconnect`, { method: 'POST' });
          _reload(container);
        } catch { btn.disabled = false; btn.textContent = 'Déconnecter'; }
      }
    });
  });
}

async function _reload(container) {
  await _load(container);
}

async function _load(container) {
  container.innerHTML = `<div class="int"><div class="int-loader"><div class="int-spinner"></div><span>Chargement des connecteurs…</span></div></div>`;

  let connected = [];
  try { connected = await _api('/api/connectors') || []; } catch {}

  const connectedCount = CONNECTORS.filter(c => connected.find(l => l.connector_type === c.type && l.status === 'active')).length;
  let activeFilter = 'Tous';

  container.innerHTML = `<div class="int">
    <div class="int-hd">
      <div class="int-hd-top">
        <div class="int-hd-left">
          <div class="int-logo">🔌</div>
          <div>
            <h1 class="int-title">Centre d'intégrations</h1>
            <p class="int-sub">${CONNECTORS.length} connecteurs disponibles · ${connectedCount} connecté${connectedCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div class="int-summary">
          <div class="int-sum-item"><div class="int-sum-dot connected"></div><span style="color:var(--color-ok-text);font-weight:600">${connectedCount} connecté${connectedCount !== 1 ? 's' : ''}</span></div>
          <div class="int-sum-item"><div class="int-sum-dot disconnected"></div><span style="color:var(--muted)">${CONNECTORS.length - connectedCount} disponible${CONNECTORS.length - connectedCount !== 1 ? 's' : ''}</span></div>
        </div>
      </div>
      <div class="int-cats" id="int-cats">
        ${CATEGORIES.map(c => `<button class="int-cat-btn ${c === 'Tous' ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
      </div>
    </div>
    <div class="int-grid" id="int-grid"></div>
  </div>`;

  _renderCards(container, CONNECTORS, 'Tous', connected);

  container.querySelector('#int-cats').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]');
    if (!btn) return;
    activeFilter = btn.dataset.cat;
    container.querySelectorAll('.int-cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _renderCards(container, CONNECTORS, activeFilter, connected);
  });
}

export default {
  mount(container) {
    _css();
    _load(container);
  },
  unmount(container) {
    container.innerHTML = '';
  },
  refresh(ctx) {},
};
