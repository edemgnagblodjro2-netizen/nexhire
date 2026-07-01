/**
 * Dashboard Exécutif
 * GET /api/dashboard/executive — score org, KPIs, départements, gouvernance, finances
 * Réservé aux admins / owners
 */

const CSS = `<style>
.exec-root {
  padding: 28px 32px;
  max-width: 1100px;
  margin: 0 auto;
}

.exec-header {
  margin-bottom: 24px;
}

.exec-header h1 {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}

.exec-header p {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.exec-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 28px;
}

.exec-tab {
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

.exec-tab:hover { color: #334155; }
.exec-tab.active { color: #6366f1; border-bottom-color: #6366f1; font-weight: 600; }

.exec-panel { display: none; }
.exec-panel.active { display: block; }

/* Score global */
.exec-score-wrap {
  display: flex;
  align-items: center;
  gap: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}

.exec-score-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.exec-score-name {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 2px 0;
}

.exec-score-sub {
  font-size: 12px;
  color: #94a3b8;
}

/* KPI grid */
.exec-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}

.exec-kpi {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.exec-kpi-val {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
}

.exec-kpi-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.exec-kpi-bar-track {
  height: 4px;
  background: #f1f5f9;
  border-radius: 99px;
  overflow: hidden;
  margin-bottom: 4px;
}

.exec-kpi-bar-fill {
  height: 100%;
  border-radius: 99px;
  transition: width .4s;
}

.exec-kpi-sub {
  font-size: 11px;
  color: #94a3b8;
}

/* Section titles */
.exec-section {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: .05em;
  margin: 24px 0 12px;
}

/* Module cards */
.exec-mod-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}

.exec-mod-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
  border-top: 3px solid #e2e8f0;
}

.exec-mod-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 8px;
}

.exec-mod-items {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 12px;
  color: #475569;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exec-mod-empty {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

/* Dept rows */
.exec-dept-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.exec-dept-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 16px;
  transition: border-color .12s;
}

.exec-dept-row:hover { border-color: #6366f1; }

.exec-dept-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}

.exec-dept-info {
  flex: 1;
  min-width: 0;
}

.exec-dept-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
}

.exec-dept-meta {
  font-size: 11.5px;
  color: #94a3b8;
  margin-top: 2px;
}

.exec-dept-score {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
}

.exec-dept-score-val {
  font-size: 18px;
  font-weight: 700;
}

.exec-dept-score-label {
  font-size: 11px;
  color: #94a3b8;
}

.exec-dept-badge {
  font-size: 12px;
  color: #475569;
  flex-shrink: 0;
  width: 120px;
  text-align: right;
}

/* Governance / data cards */
.exec-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.exec-data-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.exec-data-card.warn { border-top: 3px solid #f59e0b; }
.exec-data-card.danger { border-top: 3px solid #ef4444; }
.exec-data-card.ok { border-top: 3px solid #10b981; }

.exec-data-icon { font-size: 18px; margin-bottom: 6px; }

.exec-data-val {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
}

.exec-data-label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 4px;
}

.exec-data-sub {
  font-size: 11.5px;
  color: #94a3b8;
}

/* Ring SVG */
.exec-score-ring svg text {
  font-family: inherit;
  font-weight: 700;
}

/* Empty / error states */
.exec-empty {
  text-align: center;
  padding: 32px 24px;
  color: #94a3b8;
  font-size: 13.5px;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 16px;
}

.exec-access-denied {
  text-align: center;
  padding: 60px 24px;
  color: #94a3b8;
  font-size: 14px;
}

.exec-access-denied .icon { font-size: 36px; margin-bottom: 12px; }
.exec-access-denied strong { display: block; color: #334155; font-size: 16px; margin-bottom: 6px; }

@media (max-width: 680px) {
  .exec-root { padding: 16px; }
  .exec-dept-badge { display: none; }
  .exec-kpi-grid, .exec-mod-grid, .exec-data-grid { grid-template-columns: 1fr 1fr; }
}
</style>`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _hdrs()  { return { Authorization: `Bearer ${_token()}` }; }

function _cur(n) {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
  }).format(n || 0);
}

function _ring(score, badge) {
  const colors = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
  const c = colors[badge] || '#e2e8f0';
  const r = 32;
  const circum = 2 * Math.PI * r;
  const offset = circum - (circum * Math.min(score, 100) / 100);
  return `<svg width="80" height="80" viewBox="0 0 80 80" class="exec-score-ring">
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="7"/>
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="${c}" stroke-width="7"
      stroke-dasharray="${circum}" stroke-dashoffset="${offset}"
      stroke-linecap="round" transform="rotate(-90 40 40)"/>
    <text x="40" y="45" text-anchor="middle" font-size="16" font-weight="700" fill="${c}">${score}</text>
  </svg>`;
}

function _dot(badge) {
  const c = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' }[badge] || '#94a3b8';
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};flex-shrink:0"></span>`;
}

function _badgeLabel(badge) {
  return badge === 'green' ? 'Bon' : badge === 'yellow' ? 'À surveiller' : 'Critique';
}

function _badgeColor(badge) {
  return { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' }[badge] || '#94a3b8';
}

function _modCard(title, healthBadge, items) {
  const color = _badgeColor(healthBadge);
  return `
    <div class="exec-mod-card" style="border-top-color:${color}">
      <div class="exec-mod-name">${title}</div>
      <ul class="exec-mod-items">
        ${items.filter(Boolean).map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>`;
}

// ── Tab renderers ─────────────────────────────────────────────────────────────

function _renderOverview(panel, data) {
  const { org_score, org_badge, kpis, departments, governance: gov, assets, finance: fin } = data;
  const bp = kpis.budget_pct;
  const bColor = bp <= 75 ? '#10b981' : bp <= 90 ? '#f59e0b' : '#ef4444';

  const govItems = gov && Object.keys(gov).length ? [
    gov.lic_rate != null ? `Licences : ${gov.lic_rate}% utilisées` : null,
    gov.entra_total ? `${gov.entra_total} risque(s) Entra ID` : '✓ Aucun risque Entra',
    gov.m365_savings_annual > 0 ? `${_cur(gov.m365_savings_annual)}/an économisable` : null,
  ] : ['Connecteur M365 non configuré'];

  const assetsItems = assets && assets.total > 0 ? [
    assets.compliance_rate != null ? `Conformité : ${assets.compliance_rate}%` : null,
    assets.noncompliant ? `${assets.noncompliant} appareil(s) non conforme(s)` : '✓ Tous conformes',
    assets.unencrypted ? `⚠️ ${assets.unencrypted} non chiffré(s)` : null,
  ] : ['Connecteur Intune non configuré'];

  const finItems = fin && fin.this_month ? [
    `Ce mois : ${_cur(fin.this_month)}`,
    fin.mom_change != null ? `${fin.mom_change > 0 ? '+' : ''}${fin.mom_change}% vs mois préc.` : null,
    fin.flagged ? `⚠️ ${fin.flagged} transaction(s) flaggée(s)` : '✓ Aucune anomalie',
  ] : ['Aucune transaction ce mois'];

  panel.innerHTML = `
    <div class="exec-score-wrap">
      ${_ring(org_score, org_badge)}
      <div>
        <div class="exec-score-label">Score organisationnel global</div>
        <div class="exec-score-name" style="color:${_badgeColor(org_badge)}">${_badgeLabel(org_badge)}</div>
        <div class="exec-score-sub">${kpis.depts_total} département(s) · ${kpis.depts_at_risk} à risque</div>
      </div>
    </div>

    <div class="exec-kpi-grid">
      <div class="exec-kpi">
        <div class="exec-kpi-val">${_cur(kpis.budget_spent)}</div>
        <div class="exec-kpi-label">Budget consommé</div>
        <div class="exec-kpi-bar-track">
          <div class="exec-kpi-bar-fill" style="width:${Math.min(100,bp)}%;background:${bColor}"></div>
        </div>
        <div class="exec-kpi-sub">${bp}% de ${_cur(kpis.budget_total)}</div>
      </div>
      <div class="exec-kpi">
        <div class="exec-kpi-val">${_cur(kpis.savings_potential)}</div>
        <div class="exec-kpi-label">Économies potentielles</div>
        <div class="exec-kpi-sub">Licences + processus annualisé</div>
      </div>
      <div class="exec-kpi">
        <div class="exec-kpi-val" style="color:${kpis.contracts_due > 0 ? '#f59e0b' : '#10b981'}">${kpis.contracts_due}</div>
        <div class="exec-kpi-label">Contrats à renouveler</div>
        <div class="exec-kpi-sub">Dans les 90 prochains jours</div>
      </div>
      <div class="exec-kpi">
        <div class="exec-kpi-val" style="color:${kpis.depts_at_risk > 0 ? '#ef4444' : '#10b981'}">${kpis.depts_at_risk}</div>
        <div class="exec-kpi-label">Département(s) à risque</div>
        <div class="exec-kpi-sub">Score &lt; 70/100</div>
      </div>
    </div>

    <div class="exec-section">Modules</div>
    <div class="exec-mod-grid">
      ${_modCard('Gouvernance IT', gov?.health || 'grey', govItems)}
      ${_modCard('Actifs & Conformité', assets?.health || 'grey', assetsItems)}
      ${_modCard('Finances', fin?.health || 'grey', finItems)}
    </div>

    <div class="exec-section">Santé par département</div>
    <div class="exec-dept-list">
      ${departments.length === 0
        ? `<div class="exec-empty">Aucun département configuré — utilisez le module Équipe pour créer votre structure organisationnelle.</div>`
        : departments.map(d => `
          <div class="exec-dept-row">
            <div class="exec-dept-icon">${d.icon}</div>
            <div class="exec-dept-info">
              <div class="exec-dept-name">${d.name}</div>
              <div class="exec-dept-meta">${d.members} membre(s) · ${d.apps} app(s)${d.budget_pct != null ? ` · Budget ${d.budget_pct}%` : ''}</div>
            </div>
            <div class="exec-dept-score">
              <div class="exec-dept-score-val" style="color:${_badgeColor(d.badge)}">${d.score}</div>
              <div class="exec-dept-score-label">/100</div>
            </div>
            <div class="exec-dept-badge">
              <span style="display:flex;align-items:center;gap:5px;justify-content:flex-end">
                ${_dot(d.badge)} ${_badgeLabel(d.badge)}
              </span>
            </div>
          </div>`).join('')}
    </div>`;
}

function _renderGovernance(panel, data) {
  const { governance: gov, assets, finance: fin } = data;

  const govCards = gov && Object.keys(gov).length ? `
    <div class="exec-data-grid">
      <div class="exec-data-card ${gov.lic_rate != null && gov.lic_rate < 70 ? 'warn' : 'ok'}">
        <div class="exec-data-icon">🪪</div>
        <div class="exec-data-val">${gov.lic_rate != null ? gov.lic_rate + '%' : '—'}</div>
        <div class="exec-data-label">Licences utilisées</div>
        <div class="exec-data-sub">${gov.lic_assigned} / ${gov.lic_total} attribuées</div>
      </div>
      <div class="exec-data-card ok">
        <div class="exec-data-icon">💰</div>
        <div class="exec-data-val">${_cur(gov.m365_savings_annual)}</div>
        <div class="exec-data-label">Économies M365 / an</div>
        <div class="exec-data-sub">${_cur(gov.m365_savings_monthly)} / mois de licences sous-utilisées</div>
      </div>
      <div class="exec-data-card ${gov.entra_critical > 0 ? 'danger' : gov.entra_high > 0 ? 'warn' : 'ok'}">
        <div class="exec-data-icon">🔐</div>
        <div class="exec-data-val">${gov.entra_total}</div>
        <div class="exec-data-label">Risques Entra ID</div>
        <div class="exec-data-sub">${gov.entra_critical} critique(s) · ${gov.entra_high} élevé(s) · ${gov.entra_medium} moyen(s)</div>
      </div>
    </div>` : `<div class="exec-empty">Connecteur Microsoft 365 non configuré — activez-le dans le module Intégrations.</div>`;

  const assetsCards = assets && assets.total > 0 ? `
    <div class="exec-data-grid">
      <div class="exec-data-card ${(assets.compliance_rate || 0) >= 90 ? 'ok' : (assets.compliance_rate || 0) >= 70 ? 'warn' : 'danger'}">
        <div class="exec-data-icon">✅</div>
        <div class="exec-data-val">${assets.compliance_rate != null ? assets.compliance_rate + '%' : '—'}</div>
        <div class="exec-data-label">Conformité Intune</div>
        <div class="exec-data-sub">${assets.compliant} / ${assets.total} appareils</div>
      </div>
      <div class="exec-data-card ${assets.noncompliant > 0 ? 'warn' : 'ok'}">
        <div class="exec-data-icon">⚠️</div>
        <div class="exec-data-val">${assets.noncompliant}</div>
        <div class="exec-data-label">Non conformes</div>
        <div class="exec-data-sub">Politique de conformité non respectée</div>
      </div>
      <div class="exec-data-card ${assets.unencrypted > 0 ? 'danger' : 'ok'}">
        <div class="exec-data-icon">🔓</div>
        <div class="exec-data-val">${assets.unencrypted}</div>
        <div class="exec-data-label">Non chiffrés</div>
        <div class="exec-data-sub">BitLocker / FileVault inactif</div>
      </div>
    </div>` : `<div class="exec-empty">Connecteur Intune non configuré.</div>`;

  const finCards = fin && (fin.this_month || fin.last_month) ? `
    <div class="exec-data-grid">
      <div class="exec-data-card ok">
        <div class="exec-data-icon">📊</div>
        <div class="exec-data-val">${_cur(fin.this_month)}</div>
        <div class="exec-data-label">Dépenses ce mois</div>
        <div class="exec-data-sub">${fin.mom_change != null ? `${fin.mom_change > 0 ? '+' : ''}${fin.mom_change}% vs mois précédent` : `Précédent : ${_cur(fin.last_month)}`}</div>
      </div>
      <div class="exec-data-card ${fin.flagged > 0 ? 'danger' : 'ok'}">
        <div class="exec-data-icon">${fin.flagged > 0 ? '🚩' : '✅'}</div>
        <div class="exec-data-val">${fin.flagged}</div>
        <div class="exec-data-label">Transaction(s) flaggée(s)</div>
        <div class="exec-data-sub">${fin.flagged ? 'Vérification requise' : 'Aucune anomalie détectée'}</div>
      </div>
      <div class="exec-data-card ok">
        <div class="exec-data-icon">🏢</div>
        <div class="exec-data-val">${fin.vendor_count}</div>
        <div class="exec-data-label">Fournisseurs actifs</div>
        ${fin.top_vendor ? `<div class="exec-data-sub">Principal : ${fin.top_vendor}</div>` : ''}
      </div>
    </div>` : `<div class="exec-empty">Aucune transaction financière enregistrée.</div>`;

  panel.innerHTML = `
    <div class="exec-section">Gouvernance IT — Microsoft 365 & Entra ID</div>
    ${govCards}

    <div class="exec-section">Actifs & Conformité (Intune)</div>
    ${assetsCards}

    <div class="exec-section">Transactions financières</div>
    ${finCards}`;
}

// ── Load & render ─────────────────────────────────────────────────────────────

async function _load(container) {
  const panels = {
    overview: container.querySelector('#exec-panel-overview'),
    governance: container.querySelector('#exec-panel-governance'),
  };

  // Loading state in first panel
  panels.overview.innerHTML = `
    <div class="exec-empty">Chargement du tableau de bord…</div>`;

  let data;
  try {
    const r = await fetch('/api/dashboard/executive', {
      headers: _hdrs(), credentials: 'include',
    });

    if (r.status === 403) {
      container.querySelector('.exec-tabs').style.display = 'none';
      panels.overview.innerHTML = `
        <div class="exec-access-denied">
          <div class="icon">🔒</div>
          <strong>Accès réservé aux administrateurs</strong>
          Contactez votre administrateur pour accéder au tableau de bord exécutif.
        </div>`;
      panels.overview.classList.add('active');
      return;
    }

    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch (e) {
    panels.overview.innerHTML = `
      <div class="exec-empty">Impossible de charger le tableau de bord. Vérifiez votre connexion et réessayez.</div>`;
    return;
  }

  _renderOverview(panels.overview, data);
  _renderGovernance(panels.governance, data);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

function _mount(container) {
  container.innerHTML = CSS + `
  <div class="exec-root">
    <div class="exec-header">
      <h1>Dashboard Exécutif</h1>
      <p>Vue de direction — santé organisationnelle, gouvernance IT et indicateurs financiers</p>
    </div>

    <div class="exec-tabs">
      <button class="exec-tab active" data-tab="overview">Vue d'ensemble</button>
      <button class="exec-tab" data-tab="governance">Gouvernance & Finances</button>
    </div>

    <div id="exec-panel-overview" class="exec-panel active"></div>
    <div id="exec-panel-governance" class="exec-panel"></div>
  </div>`;

  // Tab switching
  container.querySelectorAll('.exec-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.exec-tab').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.exec-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`#exec-panel-${btn.dataset.tab}`).classList.add('active');
    });
  });

  _load(container);
}

export default {
  mount(container)   { _mount(container); },
  unmount(container) { container.innerHTML = ''; },
};
