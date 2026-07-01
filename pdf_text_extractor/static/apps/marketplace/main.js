/**
 * AgentHub Platform — Workspace Marketplace
 * Catalogue des espaces de travail préconfigurés par secteur.
 */

const _CSS_ID = 'mkt-css';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.mkt{padding:var(--sp-8);max-width:1200px;margin:0 auto;font-family:var(--font)}
.mkt-hd{margin-bottom:32px}
.mkt-hd h1{font-size:22px;font-weight:800;color:var(--text);margin:0 0 6px}
.mkt-hd p{font-size:14px;color:var(--muted);margin:0}

/* Filters */
.mkt-filters{display:flex;align-items:center;gap:10px;margin-bottom:28px;flex-wrap:wrap}
.mkt-filter-btn{padding:7px 18px;border-radius:var(--r-pill);border:1.5px solid var(--border);background:transparent;color:var(--muted);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit}
.mkt-filter-btn.active{background:var(--primary);border-color:var(--primary);color:#fff}
.mkt-filter-btn:hover:not(.active){border-color:var(--primary);color:var(--primary)}
.mkt-count{margin-left:auto;font-size:12px;color:var(--muted)}

/* Grid */
.mkt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
@media(max-width:1024px){.mkt-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:640px){.mkt-grid{grid-template-columns:1fr}}

/* Card */
.mkt-card{background:var(--card);border:1.5px solid var(--border);border-radius:var(--r-lg);padding:20px;display:flex;flex-direction:column;gap:12px;transition:box-shadow .15s,border-color .15s;position:relative}
.mkt-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);border-color:var(--primary)}
.mkt-card-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.mkt-card-icon{width:44px;height:44px;border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.mkt-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:var(--r-pill);font-size:11px;font-weight:700}
.mkt-badge.installed{background:var(--color-ok-soft);color:var(--color-ok-text)}
.mkt-badge.available{background:var(--surface);color:var(--muted);border:1px solid var(--border)}
.mkt-badge.coming{background:#fef3c7;color:#92400e}
.mkt-card-name{font-size:14px;font-weight:700;color:var(--text);margin:0}
.mkt-card-desc{font-size:12px;color:var(--muted);line-height:1.55;margin:0;flex:1}
.mkt-connectors{display:flex;flex-wrap:wrap;gap:6px}
.mkt-connector{font-size:10px;font-weight:600;padding:2px 9px;border-radius:var(--r-pill);background:var(--surface);color:var(--muted);border:1px solid var(--border)}
.mkt-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px}
.mkt-sector-tag{font-size:10px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.mkt-btn{padding:6px 16px;border-radius:var(--r);font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:opacity .15s}
.mkt-btn.installed{background:var(--surface);color:var(--muted);cursor:default;border:1px solid var(--border)}
.mkt-btn.request{background:var(--primary);color:#fff}
.mkt-btn.request:hover{opacity:.88}

/* Empty */
.mkt-empty{grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--muted)}
.mkt-empty-icon{font-size:48px;margin-bottom:12px}
.mkt-empty-title{font-size:16px;font-weight:700;color:var(--text);margin:0 0 6px}
`;
  document.head.appendChild(s);
}

// ── Workspace catalogue ────────────────────────────────────────────────────────

const WORKSPACES = [
  // ── Entreprise ──────────────────────────────────────────────────────────────
  { id: 'finance',       sector: 'entreprise', icon: '💰', name: 'Finance Workspace',          installed: true,  desc: 'Budgets, prévisions financières, contrats fournisseurs et comptabilité centralisée.',                                                    connectors: ['QuickBooks Online', 'NetSuite ERP', 'Microsoft 365', 'HubSpot'] },
  { id: 'rh',            sector: 'entreprise', icon: '👥', name: 'RH Workspace',               installed: true,  desc: 'Recrutement, absences, performance et conformité RH dans un seul espace.',                                                              connectors: ['BambooHR', 'ADP Workforce Now', 'Microsoft 365', 'Slack'] },
  { id: 'it',            sector: 'entreprise', icon: '💻', name: 'IT Workspace',               installed: true,  desc: 'Incidents, licences, inventaire matériel et cybersécurité — tout sous contrôle.',                                                       connectors: ['ServiceNow', 'Microsoft Intune', 'CrowdStrike Falcon', 'AWS'] },
  { id: 'operations',    sector: 'entreprise', icon: '⚙️', name: 'Operations Workspace',       installed: true,  desc: 'Projets, ticketing, processus opérationnels et suivi de livraison unifiés.',                                                             connectors: ['Asana', 'Monday.com', 'ClickUp', 'Jira / Confluence'] },
  { id: 'juridique',     sector: 'entreprise', icon: '⚖️', name: 'Juridique Workspace',        installed: true,  desc: 'Contrats actifs, conformité, obligations réglementaires et risques légaux.',                                                             connectors: ['Salesforce CRM', 'Microsoft 365', 'ServiceNow'] },
  { id: 'executive-ws',  sector: 'entreprise', icon: '🏛️', name: 'Executive Workspace',        installed: true,  desc: 'Vue consolidée de l\'organisation : performance globale, coûts, projets et ressources humaines.',                                        connectors: ['Microsoft 365', 'Salesforce CRM', 'HubSpot', 'Slack'] },
  { id: 'procurement',   sector: 'entreprise', icon: '🛒', name: 'Procurement Workspace',      installed: true,  desc: 'Appels d\'offres, gestion fournisseurs, contrats d\'achat et suivi des économies.',                                                      connectors: ['NetSuite ERP', 'SAP', 'Workday', 'Microsoft 365'] },
  { id: 'marketing',     sector: 'entreprise', icon: '📣', name: 'Marketing & Communications', installed: true,  desc: 'Campagnes, leads, budget, ROI, communications internes, relations médias et événements.',                                               connectors: ['HubSpot', 'Salesforce CRM', 'Microsoft 365', 'Slack'] },
  { id: 'municipal',     sector: 'entreprise', icon: '🏙️', name: 'Municipal Workspace',        installed: true,  desc: 'Conçu pour les villes et organismes publics : services aux citoyens et finances municipales.',                                           connectors: ['Microsoft 365', 'ServiceNow', 'Zendesk', 'Jira / Confluence'] },
  { id: 'manufacturing', sector: 'entreprise', icon: '🏭', name: 'Manufacturing Workspace',    installed: false, desc: 'Fabrication, stocks, ordres de production et chaîne d\'approvisionnement pour les PME et ETI industrielles canadiennes.',                 connectors: ['Epicor ERP', 'NetSuite ERP', 'SAP', 'Microsoft 365'] },
  { id: 'ventes',        sector: 'entreprise', icon: '💼', name: 'Ventes Workspace',           installed: false, desc: 'Pipeline, quotas, propositions, closing et suivi des comptes clients.',                                                                  connectors: ['Salesforce CRM', 'HubSpot', 'Microsoft 365', 'Slack'] },
  { id: 'support',       sector: 'entreprise', icon: '🎧', name: 'Support Workspace',          installed: false, desc: 'Tickets, SLA, satisfaction client (CSAT), escalades et gestion des grands comptes.',                                                     connectors: ['Zendesk', 'ServiceNow', 'Microsoft 365', 'Slack'] },
  { id: 'rd',            sector: 'entreprise', icon: '🔭', name: 'R&D Workspace',              installed: false, desc: 'Projets de recherche, budgets R&D, jalons, brevets et ressources d\'équipe.',                                                            connectors: ['Jira / Confluence', 'Asana', 'Microsoft 365', 'Slack'] },
  { id: 'qualite',       sector: 'entreprise', icon: '✅', name: 'Qualité Workspace',          installed: false, desc: 'Non-conformités, audits ISO, taux de défauts, certifications et réclamations clients.',                                                  connectors: ['ServiceNow', 'Microsoft 365', 'Jira / Confluence'] },
  { id: 'digital',       sector: 'entreprise', icon: '⚡', name: 'Digitalisation Workspace',   installed: false, desc: 'Projets de transformation numérique, taux d\'adoption, ROI et obstacles à l\'adoption.',                                                 connectors: ['Microsoft 365', 'Jira / Confluence', 'Asana', 'Slack'] },
  { id: 'comptabilite',  sector: 'entreprise', icon: '🧾', name: 'Comptabilité Workspace',     installed: false, desc: 'Rapprochements, clôtures, déclarations fiscales, AR/AP et pièces justificatives.',                                                       connectors: ['QuickBooks Online', 'NetSuite ERP', 'Microsoft 365'] },
  { id: 'compliance-ws', sector: 'entreprise', icon: '🛡️', name: 'Compliance Workspace',       installed: false, desc: 'Exigences réglementaires, politiques internes, contrôles, formations et conformité LPRPDE/SOX.',                                         connectors: ['Microsoft 365', 'ServiceNow', 'Jira / Confluence'] },
  { id: 'audit-ws',      sector: 'entreprise', icon: '🔍', name: 'Audit Workspace',            installed: false, desc: 'Anomalies système, accès suspects, audits internes, fraudes et preuves numériques.',                                                     connectors: ['Microsoft 365', 'CrowdStrike Falcon', 'ServiceNow'] },
  { id: 'logistique',    sector: 'entreprise', icon: '🚚', name: 'Logistique Workspace',       installed: false, desc: 'Livraisons, niveaux de stock, réceptions, transporteurs et gestion du surstock.',                                                        connectors: ['NetSuite ERP', 'SAP', 'Microsoft 365'] },

  // ── Santé ───────────────────────────────────────────────────────────────────
  { id: 'hosp-admin',    sector: 'sante', icon: '🏥', name: 'Administration hospitalière', installed: false, desc: 'Budget hospitalier, occupation des lits, projets d\'infrastructure et conformité gouvernementale.',                          connectors: ['Microsoft 365', 'BambooHR', 'ServiceNow', 'NetSuite ERP'] },
  { id: 'med-dir',       sector: 'sante', icon: '🩺', name: 'Direction médicale',          installed: false, desc: 'Qualité des soins, indicateurs cliniques, incidents et ressources médicales.',                                              connectors: ['Microsoft 365', 'ServiceNow', 'BambooHR'] },
  { id: 'nursing',       sector: 'sante', icon: '💊', name: 'Soins infirmiers',            installed: false, desc: 'Personnel infirmier, gardes, incidents de soins, formations et heures supplémentaires.',                                    connectors: ['Microsoft 365', 'BambooHR', 'ServiceNow'] },
  { id: 'pharmacy',      sector: 'sante', icon: '💉', name: 'Pharmacie',                   installed: false, desc: 'Stocks de médicaments, ordonnances prioritaires, budget pharma et alertes de rappel.',                                     connectors: ['NetSuite ERP', 'Microsoft 365', 'ServiceNow'] },
  { id: 'labs',          sector: 'sante', icon: '🔬', name: 'Laboratoires',                installed: false, desc: 'Analyses en attente, résultats critiques, stocks de réactifs et maintenance équipements.',                                  connectors: ['Microsoft 365', 'ServiceNow'] },
  { id: 'imaging',       sector: 'sante', icon: '🖥️', name: 'Imagerie médicale',           installed: false, desc: 'Délais IRM/scanner/radio, pannes équipements, file d\'attente et coûts de maintenance.',                                  connectors: ['Microsoft 365', 'ServiceNow'] },
  { id: 'patients',      sector: 'sante', icon: '🛏️', name: 'Service aux patients',        installed: false, desc: 'Admissions, durée de séjour, satisfaction patients, plaintes et visites médicales.',                                       connectors: ['Microsoft 365', 'Zendesk', 'ServiceNow'] },
  { id: 'med-supply',    sector: 'sante', icon: '📦', name: 'Approvisionnement médical',   installed: false, desc: 'Stocks de matériel médical, commandes en retard, fournisseurs et budget achats.',                                          connectors: ['NetSuite ERP', 'SAP', 'Microsoft 365'] },
  { id: 'med-archives',  sector: 'sante', icon: '📁', name: 'Archives médicales',          installed: false, desc: 'Dossiers patients, numérisation, conformité LPRPDE, conservation légale et accès sécurisé.',                               connectors: ['Microsoft 365', 'ServiceNow'] },

  // ── Éducation ───────────────────────────────────────────────────────────────
  { id: 'rectorat',      sector: 'education', icon: '🎓', name: 'Rectorat Workspace',        installed: false, desc: 'Planification institutionnelle, gouvernance, indicateurs académiques et projets stratégiques.',                           connectors: ['Microsoft 365', 'Salesforce CRM', 'Slack'] },
  { id: 'academique',    sector: 'education', icon: '📚', name: 'Affaires académiques',       installed: false, desc: 'Programmes, qualité académique, corps professoral, charges d\'enseignement et accréditations.',                          connectors: ['Microsoft 365', 'BambooHR', 'Jira / Confluence'] },
  { id: 'admissions',    sector: 'education', icon: '📝', name: 'Admission & Registraire',    installed: false, desc: 'Dossiers étudiants, admissions, diplomation, transferts et gestion des crédits académiques.',                            connectors: ['Microsoft 365', 'ServiceNow'] },
  { id: 'recherche',     sector: 'education', icon: '🔬', name: 'Recherche & Innovation',     installed: false, desc: 'Subventions CRSH/CRSNG, partenariats industriels, propriété intellectuelle et projets de recherche.',                    connectors: ['Microsoft 365', 'Asana', 'Jira / Confluence'] },
  { id: 'students',      sector: 'education', icon: '🎒', name: 'Services aux étudiants',     installed: false, desc: 'Aide financière, bourses, counseling, logement, vie étudiante et gestion des plaintes.',                                 connectors: ['Microsoft 365', 'Zendesk', 'ServiceNow'] },
  { id: 'library',       sector: 'education', icon: '📖', name: 'Bibliothèques & Archives',   installed: false, desc: 'Collections, ressources numériques, licences d\'édition académique et archives institutionnelles.',                       connectors: ['Microsoft 365', 'NetSuite ERP'] },
];

const SECTOR_LABELS = {
  tous:        'Tous',
  entreprise:  'Entreprise',
  sante:       'Santé',
  education:   'Éducation',
};

// ── State ─────────────────────────────────────────────────────────────────────

let _container = null;
let _activeSector = 'tous';

// ── Render ────────────────────────────────────────────────────────────────────

function _filtered() {
  if (_activeSector === 'tous') return WORKSPACES;
  return WORKSPACES.filter(w => w.sector === _activeSector);
}

function _sectorLabel(sector) {
  return { entreprise: 'Entreprise', sante: 'Santé', education: 'Éducation' }[sector] || sector;
}

function _requestAccess(ws) {
  window.dispatchEvent(new CustomEvent('ws:navigate', { detail: { id: 'help' } }));
}

function _render() {
  if (!_container) return;
  const list = _filtered();
  const installed = list.filter(w => w.installed).length;

  _container.innerHTML = `
    <div class="mkt">
      <div class="mkt-hd">
        <h1>🏪 Workspace Marketplace</h1>
        <p>Installez des espaces de travail préconfigurés adaptés à votre secteur et vos départements.</p>
      </div>

      <div class="mkt-filters">
        ${Object.entries(SECTOR_LABELS).map(([k, label]) => `
          <button class="mkt-filter-btn${_activeSector === k ? ' active' : ''}" data-sector="${k}">${label}</button>
        `).join('')}
        <span class="mkt-count">${list.length} espace${list.length > 1 ? 's' : ''} · ${installed} installé${installed > 1 ? 's' : ''}</span>
      </div>

      <div class="mkt-grid" id="mkt-grid">
        ${list.length === 0
          ? `<div class="mkt-empty"><div class="mkt-empty-icon">🔍</div><div class="mkt-empty-title">Aucun espace trouvé</div></div>`
          : list.map(ws => `
            <div class="mkt-card">
              <div class="mkt-card-hd">
                <div class="mkt-card-icon">${ws.icon}</div>
                <span class="mkt-badge ${ws.installed ? 'installed' : 'available'}">
                  ${ws.installed ? '✓ Installé' : 'Disponible'}
                </span>
              </div>
              <div>
                <p class="mkt-card-name">${ws.name}</p>
                <p class="mkt-card-desc">${ws.desc}</p>
              </div>
              <div class="mkt-connectors">
                ${ws.connectors.map(c => `<span class="mkt-connector">${c}</span>`).join('')}
              </div>
              <div class="mkt-card-footer">
                <span class="mkt-sector-tag">${_sectorLabel(ws.sector)}</span>
                ${ws.installed
                  ? `<button class="mkt-btn installed" disabled>Installé</button>`
                  : `<button class="mkt-btn request" data-ws-id="${ws.id}">Demander l'accès</button>`
                }
              </div>
            </div>
          `).join('')}
      </div>
    </div>`;

  _container.querySelectorAll('.mkt-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeSector = btn.dataset.sector;
      _render();
    });
  });

  _container.querySelectorAll('.mkt-btn.request').forEach(btn => {
    btn.addEventListener('click', () => {
      const ws = WORKSPACES.find(w => w.id === btn.dataset.wsId);
      if (ws) _requestAccess(ws);
    });
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export default {
  mount(container) {
    _css();
    _container = container;
    _activeSector = 'tous';
    _render();
  },
  unmount() {
    if (_container) _container.innerHTML = '';
    _container = null;
  },
};
