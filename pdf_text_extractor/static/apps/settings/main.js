/**
 * AgentHub Platform — App: Paramètres
 * Profil partenaire · Apparence · Apps installées
 */

let _st = null;

function _render(el) {
  const p = _st.partner || {};
  const apps = _st.apps || [];

  el.innerHTML = `
<div class="set-wrap">
  <div class="set-header">
    <h1 class="set-h1">Paramètres</h1>
    <p class="set-sub">Configuration de votre espace AgentHub.</p>
  </div>

  <div class="set-tabs">
    <button class="set-tab${_st.tab==='profil'?' set-tab-a':''}" data-tab="profil">🏢 Profil</button>
    <button class="set-tab${_st.tab==='apparence'?' set-tab-a':''}" data-tab="apparence">🎨 Apparence</button>
    <button class="set-tab${_st.tab==='apps'?' set-tab-a':''}" data-tab="apps">📦 Apps installées</button>
    <button class="set-tab${_st.tab==='securite'?' set-tab-a':''}" data-tab="securite">🔒 Sécurité & Accès</button>
  </div>

  <div class="set-panel">
    ${_st.tab === 'profil'    ? _renderProfil(p)    : ''}
    ${_st.tab === 'apparence' ? _renderApparence(p) : ''}
    ${_st.tab === 'apps'      ? _renderApps(apps)   : ''}
    ${_st.tab === 'securite'  ? _renderSecurite(p)  : ''}
  </div>
</div>`;

  el.querySelectorAll('.set-tab').forEach(b => b.addEventListener('click', () => { _st.tab = b.dataset.tab; _render(el); }));
}

function _renderProfil(p) {
  return `
<div class="set-section">
  <h2 class="set-section-title">Informations de l'organisation</h2>
  <div class="set-info-grid">
    ${_row('Nom', p.name || '—')}
    ${_row('Identifiant (slug)', p.slug || '—', true)}
    ${_row('Plan', p.plan ? `<span class="set-plan-badge">${p.plan}</span>` : '—')}
    ${_row('Titre du programme', p.hero_title || p.name || '—')}
    ${_row('Sous-titre', p.hero_subtitle || '—')}
    ${_row('Domaine personnalisé', p.custom_domain || 'Non configuré')}
  </div>
  <div class="set-note">
    <span>ℹ️</span>
    Pour modifier ces informations, contactez <a href="mailto:contact@civicainc.ca">contact@civicainc.ca</a>
  </div>
</div>

<div class="set-section">
  <h2 class="set-section-title">Informations du compte</h2>
  <div class="set-info-grid">
    ${_row('URL du workspace', `<a href="/workspace/${p.slug}" class="set-link">/workspace/${p.slug}</a>`)}
    ${_row('Rapport régional', `<a href="/rapport/regional/${p.slug}" target="_blank" class="set-link">Voir →</a>`)}
  </div>
</div>`;
}

function _renderApparence(p) {
  const color = p.primary_color || '#7c3aed';
  return `
<div class="set-section">
  <h2 class="set-section-title">Identité visuelle</h2>
  <div class="set-info-grid">
    ${_row('Couleur principale',
      `<div style="display:flex;align-items:center;gap:10px">
         <div style="width:28px;height:28px;border-radius:6px;background:${color};border:1px solid rgba(0,0,0,.1)"></div>
         <span style="font-family:monospace;font-size:13px">${color}</span>
       </div>`)}
    ${_row('Logo partenaire', p.logo_url
      ? `<img src="${p.logo_url}" alt="${p.name}" style="max-height:40px;max-width:160px;object-fit:contain;border-radius:4px"/>`
      : 'Aucun logo configuré')}
    ${_row('Favicon', p.favicon_url
      ? `<img src="${p.favicon_url}" style="width:24px;height:24px;object-fit:contain;border-radius:4px"/>`
      : 'Favicon par défaut')}
  </div>

  <div class="set-preview-box" style="border-left:4px solid ${color}">
    <div class="set-preview-label">Aperçu couleur</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <div style="background:${color};color:white;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600">Bouton principal</div>
      <div style="border:1.5px solid ${color};color:${color};padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600">Bouton secondaire</div>
      <div style="background:${color}15;color:${color};padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600">Accent</div>
    </div>
  </div>

  <div class="set-note"><span>ℹ️</span>Pour modifier l'identité visuelle, contactez <a href="mailto:contact@civicainc.ca">contact@civicainc.ca</a></div>
</div>`;
}

function _renderApps(apps) {
  const installed = apps.filter(a => a.is_installed);
  const icons = { 'diagnostic-ia':'🎯', 'observatoire':'👁️', 'gouvernance':'⚖️', 'reports':'📊', 'automation':'⚡', 'knowledge':'📚', 'ms365':'🪟', 'settings':'⚙️' };
  return `
<div class="set-section">
  <h2 class="set-section-title">Applications installées (${installed.length})</h2>
  ${installed.length === 0 ? '<p style="color:#94a3b8;font-size:13px">Aucune application installée.</p>' : `
  <div class="set-apps-list">
    ${installed.map(a => `
    <div class="set-app-row">
      <span class="set-app-icon">${icons[a.slug] || '🔧'}</span>
      <div class="set-app-info">
        <div class="set-app-name">${a.name || a.slug}</div>
        <div class="set-app-slug">/${a.slug}</div>
      </div>
      <span class="set-app-status">${a.is_installed ? '<span class="set-badge-ok">Actif</span>' : '<span class="set-badge-off">Inactif</span>'}</span>
    </div>`).join('')}
  </div>`}
  <div class="set-note"><span>ℹ️</span>Pour activer ou désactiver des modules, contactez <a href="mailto:contact@civicainc.ca">contact@civicainc.ca</a></div>
</div>`;
}

function _renderSecurite(p) {
  return `
<div class="set-section">
  <h2 class="set-section-title">Accès et sécurité</h2>
  <div class="set-info-grid">
    ${_row('Authentification', '<span class="set-badge-ok">✓ Activée</span>')}
    ${_row('HTTPS / TLS', '<span class="set-badge-ok">✓ Forcé</span>')}
    ${_row('Isolation des données', `<span class="set-badge-ok">✓ Multi-tenant isolé</span>`)}
    ${_row('Hébergement', 'Canada — Infrastructure sécurisée')}
    ${_row('Conformité', 'Loi 25 du Québec')}
  </div>
</div>

<div class="set-section">
  <h2 class="set-section-title">Fonctionnalités à venir</h2>
  <div class="set-coming-list">
    ${[['👥','Gestion des utilisateurs','Invitez des membres de votre équipe avec des rôles (Admin, Éditeur, Lecteur).'],
       ['🔑','SSO / Authentification unique','Connectez votre IdP d\'entreprise (Azure AD, Okta, Google Workspace).'],
       ['📋','Journal d\'audit','Historique complet des actions dans votre workspace.'],
       ['🔗','API & Webhooks','Intégrez AgentHub à vos outils existants.'],
       ['💳','Facturation','Gestion de votre abonnement et factures en ligne.'],
    ].map(([icon, title, desc]) => `
    <div class="set-coming-item">
      <span style="font-size:20px">${icon}</span>
      <div><strong>${title}</strong><p>${desc}</p></div>
      <span class="set-badge-soon">Bientôt</span>
    </div>`).join('')}
  </div>
</div>`;
}

function _row(label, value, mono = false) {
  return `
<div class="set-info-row">
  <span class="set-info-label">${label}</span>
  <span class="set-info-value${mono?' set-mono':''}">${value}</span>
</div>`;
}

function _css() {
  if (document.getElementById('set-css')) return;
  const s = document.createElement('style'); s.id = 'set-css';
  s.textContent = `
.set-wrap{padding:var(--sp-8);max-width:800px;margin:0 auto;font-family:var(--font)}
.set-header{margin-bottom:24px}
.set-h1{font-size:22px;font-weight:700;color:var(--text);margin:0 0 4px}
.set-sub{font-size:13px;color:var(--text-sub);margin:0}
.set-tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:28px;flex-wrap:wrap}
.set-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 16px;font-size:13px;font-weight:500;color:var(--text-sub);cursor:pointer;margin-bottom:-1px;white-space:nowrap}
.set-tab-a{color:var(--primary);border-bottom-color:var(--primary)}
.set-section{margin-bottom:32px}
.set-section-title{font-size:14px;font-weight:700;color:var(--text);margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid var(--border-2)}
.set-info-grid{display:flex;flex-direction:column;gap:0}
.set-info-row{display:flex;align-items:center;gap:16px;padding:10px 0;border-bottom:1px solid var(--border-2)}
.set-info-row:last-child{border-bottom:none}
.set-info-label{font-size:13px;color:var(--text-sub);min-width:180px;flex-shrink:0}
.set-info-value{font-size:13px;color:var(--text);font-weight:500}
.set-mono{font-family:monospace;font-size:12px;background:var(--bg-2);padding:2px 8px;border-radius:var(--r-sm)}
.set-link{color:var(--primary);text-decoration:none;font-weight:600}
.set-link:hover{text-decoration:underline}
.set-plan-badge{background:var(--primary-lt);color:var(--primary-dk);font-size:12px;font-weight:700;padding:2px 10px;border-radius:var(--r-pill);text-transform:uppercase;letter-spacing:.05em}
.set-preview-box{background:var(--bg);border-left:4px solid var(--primary);padding:16px 20px;border-radius:0 var(--r-md) var(--r-md) 0;margin:16px 0}
.set-preview-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.set-note{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin-top:16px}
.set-note a{color:var(--primary);text-decoration:none}
.set-apps-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;margin-bottom:16px}
.set-app-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border-2)}
.set-app-row:last-child{border-bottom:none}
.set-app-icon{font-size:20px}
.set-app-info{flex:1}
.set-app-name{font-size:13px;font-weight:600;color:var(--text)}
.set-app-slug{font-size:11px;color:var(--muted);font-family:monospace}
.set-badge-ok{background:var(--color-ok-bg);color:var(--color-ok-text);font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--r-pill)}
.set-badge-off{background:var(--bg-2);color:var(--muted);font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--r-pill)}
.set-badge-soon{background:var(--bg-2);color:var(--muted);font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--r-pill);white-space:nowrap;flex-shrink:0}
.set-coming-list{display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden}
.set-coming-item{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border-2)}
.set-coming-item:last-child{border-bottom:none}
.set-coming-item div{flex:1}
.set-coming-item strong{font-size:13px;font-weight:600;color:var(--text)}
.set-coming-item p{font-size:12px;color:var(--muted);margin:2px 0 0;line-height:1.4}
@media(max-width:600px){.set-wrap{padding:var(--sp-4)}.set-info-label{min-width:130px}}
`;
  document.head.appendChild(s);
}

export default {
  mount(container, ctx) {
    _css();
    _st = { slug: ctx.partnerSlug, partner: ctx.partner, tab: 'profil', apps: ctx.partner?.apps || [] };

    // Load installed apps from workspace context
    if (ctx.appConfig?.installedApps) _st.apps = ctx.appConfig.installedApps;

    _render(container);
  },
  unmount(container) {
    _st = null;
    container.innerHTML = '';
  },
};
