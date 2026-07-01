/**
 * AgentHub Platform — App: Enterprise Intelligence
 * Façade UI pure — zéro logique métier.
 * Toute l'intelligence vient du backend :
 *   GET /api/optimization/overview · /recommendations · /predictions
 *   GET /api/licenses
 *   GET /api/transactions/summary · /vendors
 *   GET /api/budget/summary
 *   GET /api/contracts
 */

const _CSS_ID = 'ei-css';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.ei{padding:var(--sp-8);max-width:1200px;margin:0 auto;font-family:var(--font)}
.ei-hd{display:flex;align-items:center;gap:14px;margin-bottom:24px}
.ei-logo{width:40px;height:40px;border-radius:var(--r-lg);background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}
.ei-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.ei-sub{font-size:13px;color:var(--muted);margin:2px 0 0}

/* Tabs */
.ei-tabs{display:flex;gap:2px;border-bottom:1px solid var(--border);margin-bottom:28px;overflow-x:auto}
.ei-tab{padding:10px 18px;font-size:13px;font-weight:600;color:var(--muted);background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all .15s}
.ei-tab.active{color:var(--primary);border-bottom-color:var(--primary)}
.ei-tab:hover:not(.active){color:var(--text)}

/* KPI strip */
.ei-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.ei-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.ei-kpi-icon{font-size:20px;margin-bottom:8px}
.ei-kpi-val{font-size:24px;font-weight:800;color:var(--text);line-height:1}
.ei-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.ei-kpi-sub{font-size:12px;font-weight:600;margin-top:5px}
.ei-kpi-sub.ok{color:var(--color-ok-text)}
.ei-kpi-sub.warn{color:var(--color-warn-text)}
.ei-kpi-sub.err{color:var(--color-err-text)}

/* Score ring */
.ei-score-wrap{display:flex;align-items:center;gap:20px;background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 24px;margin-bottom:24px}
.ei-score-ring{position:relative;width:72px;height:72px;flex-shrink:0}
.ei-score-ring svg{transform:rotate(-90deg)}
.ei-score-val{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:var(--text)}
.ei-score-details{flex:1}
.ei-score-label{font-size:15px;font-weight:700;color:var(--text);margin-bottom:10px}
.ei-score-bars{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.ei-score-bar-row{display:flex;flex-direction:column;gap:3px}
.ei-score-bar-name{font-size:11px;color:var(--muted)}
.ei-score-bar-track{height:6px;background:var(--bg-2);border-radius:3px;overflow:hidden}
.ei-score-bar-fill{height:100%;border-radius:3px}

/* Cards */
.ei-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px}
.ei-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.ei-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}
.ei-card-hd span{font-size:16px}
.ei-card-hd .ei-badge{font-size:11px;font-weight:700;background:var(--color-warn-soft);color:var(--color-warn-text);padding:3px 10px;border-radius:var(--r-pill)}
.ei-card-body{padding:18px}

/* Table */
.ei-table{width:100%;border-collapse:collapse;font-size:12px}
.ei-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:0 10px 10px;border-bottom:1px solid var(--border)}
.ei-table td{padding:10px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
.ei-table tr:last-child td{border-bottom:none}
.ei-pill{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill)}
.ei-pill.active{background:var(--color-ok-soft);color:var(--color-ok-text)}
.ei-pill.inactive{background:var(--color-warn-soft);color:var(--color-warn-text)}
.ei-pill.expired{background:var(--color-err-soft);color:var(--color-err-text)}
.ei-pill.renewing{background:var(--color-info-soft);color:var(--color-info-on)}

/* Opp rows */
.ei-opp{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)}
.ei-opp:last-child{border-bottom:none}
.ei-opp-icon{font-size:20px;flex-shrink:0;width:36px;height:36px;border-radius:var(--r);background:var(--bg-2);display:flex;align-items:center;justify-content:center}
.ei-opp-title{font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px}
.ei-opp-desc{font-size:11px;color:var(--muted);line-height:1.4}
.ei-opp-savings{font-size:13px;font-weight:800;color:var(--color-ok-text);white-space:nowrap;flex-shrink:0}

/* Rec rows */
.ei-rec{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)}
.ei-rec:last-child{border-bottom:none}
.ei-rec-rank{width:24px;height:24px;border-radius:50%;background:var(--primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ei-rec-action{flex:1;font-size:12px;font-weight:600;color:var(--text)}
.ei-rec-timeline{font-size:11px;color:var(--muted);white-space:nowrap}
.ei-rec-savings{font-size:12px;font-weight:700;color:var(--color-ok-text);white-space:nowrap}

/* Budget bars */
.ei-budget-row{margin-bottom:16px}
.ei-budget-hd{display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px}
.ei-budget-cat{font-weight:600;color:var(--text)}
.ei-budget-amts{color:var(--muted)}
.ei-budget-track{height:8px;background:var(--bg-2);border-radius:4px;overflow:hidden}
.ei-budget-fill{height:100%;border-radius:4px;transition:width .4s ease}

/* Empty */
.ei-empty{text-align:center;padding:40px;color:var(--muted);font-size:13px}

/* Loader */
.ei-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 0;color:var(--muted)}
.ei-spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:#7c3aed;border-radius:50%;animation:eispin .7s linear infinite}
@keyframes eispin{to{transform:rotate(360deg)}}

@media(max-width:900px){.ei-kpis{grid-template-columns:repeat(2,1fr)}.ei-score-bars{grid-template-columns:1fr}}
@media(max-width:540px){.ei-kpis{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

const _TABS = [
  { id: 'overview',   label: '📊 Vue d\'ensemble' },
  { id: 'licences',   label: '🔑 Licences & Shadow IT' },
  { id: 'depenses',   label: '💳 Dépenses & Budget' },
  { id: 'contrats',   label: '📄 Contrats' },
  { id: 'recs',       label: '💡 Recommandations' },
];

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _token(); return t ? { Authorization: `Bearer ${t}` } : {}; }
async function _get(path) {
  const r = await fetch(path, { headers: _h(), credentials: 'include' });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function _fmtCAD(v, cur = 'CAD') {
  return (v || 0).toLocaleString('fr-CA', { style: 'currency', currency: cur, maximumFractionDigits: 0 });
}
function _fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}
function _scoreColor(s) {
  return s >= 75 ? 'var(--color-ok)' : s >= 50 ? 'var(--color-warn)' : 'var(--color-err)';
}
function _empty(msg = 'Aucune donnée') {
  return `<div class="ei-empty">${msg}</div>`;
}

// ── Tab renderers ─────────────────────────────────────────────────────────────

function _renderOverview(data) {
  const savings = data.savings || {};
  const score   = data.efficiency_score || {};
  const opps    = data.top_opportunities || [];
  const overall = Math.round(score.overall || 0);

  const circum = 2 * Math.PI * 28;
  const dash   = circum - (circum * overall / 100);

  return `
    <div class="ei-kpis">
      <div class="ei-kpi">
        <div class="ei-kpi-icon">💰</div>
        <div class="ei-kpi-val">${_fmtCAD(savings.total || 0)}</div>
        <div class="ei-kpi-lbl">Économies potentielles</div>
        <div class="ei-kpi-sub ${(savings.total || 0) > 0 ? 'warn' : 'ok'}">${(savings.total || 0) > 0 ? '↑ Identifiées' : '✅ Optimisé'}</div>
      </div>
      <div class="ei-kpi">
        <div class="ei-kpi-icon">🔑</div>
        <div class="ei-kpi-val">${_fmtCAD(savings.licenses || 0)}</div>
        <div class="ei-kpi-lbl">Licences inutilisées</div>
        <div class="ei-kpi-sub ${(savings.licenses || 0) > 0 ? 'warn' : 'ok'}">${(data.unused_licenses || []).length} licences</div>
      </div>
      <div class="ei-kpi">
        <div class="ei-kpi-icon">🔁</div>
        <div class="ei-kpi-val">${_fmtCAD(savings.software || 0)}</div>
        <div class="ei-kpi-lbl">Shadow IT (doublons)</div>
        <div class="ei-kpi-sub ${(savings.software || 0) > 0 ? 'warn' : 'ok'}">${(data.duplicate_tools || []).length} outils</div>
      </div>
      <div class="ei-kpi">
        <div class="ei-kpi-icon">📄</div>
        <div class="ei-kpi-val">${_fmtCAD(savings.contracts || 0)}</div>
        <div class="ei-kpi-lbl">Contrats à risque</div>
        <div class="ei-kpi-sub ${(savings.contracts || 0) > 0 ? 'warn' : 'ok'}">${(data.contracts_at_risk || []).length} contrats</div>
      </div>
    </div>

    <div class="ei-score-wrap">
      <div class="ei-score-ring">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="28" fill="none" stroke="var(--bg-2)" stroke-width="8"/>
          <circle cx="36" cy="36" r="28" fill="none" stroke="${_scoreColor(overall)}" stroke-width="8"
            stroke-dasharray="${circum}" stroke-dashoffset="${dash}" stroke-linecap="round"/>
        </svg>
        <div class="ei-score-val">${overall}</div>
      </div>
      <div class="ei-score-details">
        <div class="ei-score-label">Score d'efficacité opérationnelle</div>
        <div class="ei-score-bars">
          ${[['Logiciels', score.software || 0], ['Licences', score.licenses || 0],
             ['Infrastructure', score.infrastructure || 0], ['Processus', score.process || 0]].map(([lbl, v]) => `
            <div class="ei-score-bar-row">
              <div class="ei-score-bar-name">${lbl} — ${Math.round(v)}/100</div>
              <div class="ei-score-bar-track"><div class="ei-score-bar-fill" style="width:${Math.round(v)}%;background:${_scoreColor(v)}"></div></div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="ei-card">
      <div class="ei-card-hd"><span>🎯</span><h3>Meilleures opportunités d'économies</h3>${opps.length > 0 ? `<span class="ei-badge">${opps.length} identifiées</span>` : ''}</div>
      <div class="ei-card-body">
        ${opps.length === 0 ? _empty('Aucune opportunité détectée — vous êtes bien optimisé') :
          opps.map(o => `<div class="ei-opp">
            <div class="ei-opp-icon">${o.type === 'license' ? '🔑' : o.type === 'duplicate' ? '🔁' : o.type === 'contract' ? '📄' : '⚙️'}</div>
            <div style="flex:1">
              <div class="ei-opp-title">${o.title || o.app_name || ''}</div>
              <div class="ei-opp-desc">${o.description || o.vendor_name || ''}</div>
            </div>
            <div class="ei-opp-savings">${_fmtCAD(o.annual_savings_potential || 0)}/an</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function _renderLicences(licenses, overview) {
  const unused = overview.unused_licenses || [];
  const dups   = overview.duplicate_tools || [];
  const lics   = Array.isArray(licenses) ? licenses : (licenses.licenses || licenses || []);

  return `
    <div class="ei-card">
      <div class="ei-card-hd"><span>🔑</span><h3>Inventaire des licences logicielles</h3></div>
      <div class="ei-card-body" style="padding:0 18px">
        ${lics.length === 0 ? _empty('Aucune licence enregistrée') : `
        <table class="ei-table">
          <thead><tr><th>Logiciel</th><th>Catégorie</th><th>Statut</th><th>Utilisateurs</th><th style="text-align:right">Coût/mois</th><th>Renouvellement</th></tr></thead>
          <tbody>
            ${lics.map(l => `<tr>
              <td><strong>${l.software_name || '—'}</strong>${l.vendor ? `<br><span style="font-size:11px;color:var(--muted)">${l.vendor}</span>` : ''}</td>
              <td><span style="font-size:11px;color:var(--muted)">${l.category || '—'}</span></td>
              <td><span class="ei-pill ${l.status || 'active'}">${{ active: 'Actif', inactive: 'Inactif', expired: 'Expiré' }[l.status] || l.status || 'Actif'}</span></td>
              <td>${l.seats_used != null ? `${l.seats_used} / ${l.seats_total || '?'}` : l.seats_total || '—'}</td>
              <td style="text-align:right;font-weight:600">${l.cost_monthly != null ? _fmtCAD(l.cost_monthly, l.currency || 'CAD') : '—'}</td>
              <td style="color:var(--muted)">${_fmtDate(l.renewal_date)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`}
      </div>
    </div>

    <div class="ei-card">
      <div class="ei-card-hd"><span>🔁</span><h3>Shadow IT — Outils en doublon</h3>${dups.length > 0 ? `<span class="ei-badge">${dups.length} doublons</span>` : ''}</div>
      <div class="ei-card-body">
        ${dups.length === 0 ? _empty('Aucun doublon détecté') :
          dups.map(d => `<div class="ei-opp">
            <div class="ei-opp-icon">🔁</div>
            <div style="flex:1">
              <div class="ei-opp-title">${d.app_name || d.tool_name || '—'}</div>
              <div class="ei-opp-desc">${d.description || ''}</div>
            </div>
            <div class="ei-opp-savings">${_fmtCAD(d.annual_savings_potential || 0)}/an</div>
          </div>`).join('')}
      </div>
    </div>

    ${unused.length > 0 ? `
    <div class="ei-card">
      <div class="ei-card-hd"><span>⚠️</span><h3>Licences inutilisées</h3><span class="ei-badge">${unused.length}</span></div>
      <div class="ei-card-body">
        ${unused.map(u => `<div class="ei-opp">
          <div class="ei-opp-icon">🔑</div>
          <div style="flex:1">
            <div class="ei-opp-title">${u.app_name || u.software_name || '—'}</div>
            <div class="ei-opp-desc">${u.reason || ''}</div>
          </div>
          <div class="ei-opp-savings">${_fmtCAD(u.annual_savings_potential || 0)}/an</div>
        </div>`).join('')}
      </div>
    </div>` : ''}`;
}

function _renderDepenses(summary, budgetSummary) {
  const cats  = (budgetSummary.by_category || []).slice(0, 8);
  const txSum = summary;
  const totalAllocated = cats.reduce((s, c) => s + (c.allocated || 0), 0);
  const totalActual    = cats.reduce((s, c) => s + (c.actual    || 0), 0);
  const budgetPct      = totalAllocated > 0 ? Math.round((totalActual / totalAllocated) * 100) : 0;

  return `
    <div class="ei-kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="ei-kpi">
        <div class="ei-kpi-icon">📊</div>
        <div class="ei-kpi-val">${_fmtCAD(totalAllocated)}</div>
        <div class="ei-kpi-lbl">Budget total alloué</div>
        <div class="ei-kpi-sub ok">Année ${new Date().getFullYear()}</div>
      </div>
      <div class="ei-kpi">
        <div class="ei-kpi-icon">💳</div>
        <div class="ei-kpi-val">${_fmtCAD(totalActual)}</div>
        <div class="ei-kpi-lbl">Dépenses réelles</div>
        <div class="ei-kpi-sub ${budgetPct > 90 ? 'err' : budgetPct > 75 ? 'warn' : 'ok'}">${budgetPct}% du budget</div>
      </div>
      <div class="ei-kpi">
        <div class="ei-kpi-icon">${totalActual > totalAllocated ? '🔴' : '🟢'}</div>
        <div class="ei-kpi-val">${_fmtCAD(Math.abs(totalAllocated - totalActual))}</div>
        <div class="ei-kpi-lbl">${totalActual > totalAllocated ? 'Dépassement' : 'Marge disponible'}</div>
        <div class="ei-kpi-sub ${totalActual > totalAllocated ? 'err' : 'ok'}">${totalActual > totalAllocated ? '⚠️ Au-dessus du budget' : '✅ Dans les limites'}</div>
      </div>
    </div>

    <div class="ei-card">
      <div class="ei-card-hd"><span>📊</span><h3>Budget vs Réel par catégorie</h3></div>
      <div class="ei-card-body">
        ${cats.length === 0 ? _empty('Aucun budget enregistré') : cats.map(c => {
          const pct  = c.allocated > 0 ? Math.min(100, Math.round((c.actual / c.allocated) * 100)) : 0;
          const color = pct > 95 ? 'var(--color-err)' : pct > 80 ? 'var(--color-warn)' : 'var(--color-ok)';
          return `<div class="ei-budget-row">
            <div class="ei-budget-hd">
              <span class="ei-budget-cat">${c.category}</span>
              <span class="ei-budget-amts">${_fmtCAD(c.actual)} / ${_fmtCAD(c.allocated)} — ${pct}%</span>
            </div>
            <div class="ei-budget-track"><div class="ei-budget-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function _renderContrats(contracts) {
  const list = Array.isArray(contracts) ? contracts : [];
  const statusFr = { active: 'Actif', renewing: 'Renouvellement', expired: 'Expiré', cancelled: 'Annulé' };

  return `<div class="ei-card">
    <div class="ei-card-hd"><span>📄</span><h3>Contrats fournisseurs</h3><span style="font-size:13px;color:var(--muted);font-weight:500">${list.length} contrat${list.length !== 1 ? 's' : ''}</span></div>
    <div class="ei-card-body" style="padding:0 18px">
      ${list.length === 0 ? _empty('Aucun contrat enregistré') : `
      <table class="ei-table">
        <thead><tr><th>Fournisseur</th><th>Catégorie</th><th>Statut</th><th style="text-align:right">Valeur/an</th><th>Renouvellement</th></tr></thead>
        <tbody>
          ${list.map(c => {
            const cls = c.status === 'expired' ? 'expired' : c.status === 'renewing' ? 'renewing' : c.status === 'active' ? 'active' : 'inactive';
            return `<tr>
              <td><strong>${c.vendor || '—'}</strong>${c.description ? `<br><span style="font-size:11px;color:var(--muted)">${c.description}</span>` : ''}</td>
              <td><span style="font-size:11px;color:var(--muted)">${c.category || '—'}</span></td>
              <td><span class="ei-pill ${cls}">${statusFr[c.status] || c.status || 'Actif'}</span></td>
              <td style="text-align:right;font-weight:600">${c.annual_value != null ? _fmtCAD(c.annual_value, c.currency) : '—'}</td>
              <td style="color:var(--muted)">${_fmtDate(c.renewal_date)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>
  </div>`;
}

function _renderRecs(recs) {
  const list = recs.recommendations || [];
  const total = recs.total_savings || 0;
  const impactIcon = { high: '🔴', medium: '🟡', low: '🟢' };

  return `
    ${total > 0 ? `<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid var(--color-ok-border);border-radius:var(--r-lg);padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:15px;font-weight:800;color:var(--color-ok-text)">Potentiel d'économies identifié</div>
      <div style="font-size:12px;color:var(--muted);margin-top:2px">${list.length} recommandation${list.length !== 1 ? 's' : ''} ATLAS</div></div>
      <div style="font-size:22px;font-weight:800;color:var(--color-ok-text)">${_fmtCAD(total)}/an</div>
    </div>` : ''}

    <div class="ei-card">
      <div class="ei-card-hd"><span>💡</span><h3>Recommandations ATLAS</h3></div>
      <div class="ei-card-body">
        ${list.length === 0 ? _empty('Aucune recommandation — analyse en attente de données') :
          list.map(r => `<div class="ei-rec">
            <div class="ei-rec-rank">${r.rank || '—'}</div>
            <div style="flex:1">
              <div class="ei-rec-action">${impactIcon[r.impact] || '•'} ${r.action}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">⏱ ${r.timeline || '—'}</div>
            </div>
            <div class="ei-rec-savings">${r.savings > 0 ? _fmtCAD(r.savings) + '/an' : ''}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

// ── Main load ─────────────────────────────────────────────────────────────────
async function _renderTab(panel, tabId, cache) {
  panel.innerHTML = `<div class="ei-loader"><div class="ei-spinner"></div><span>Chargement…</span></div>`;
  try {
    if (tabId === 'overview') {
      const data = cache.overview || (cache.overview = await _get('/api/optimization/overview'));
      panel.innerHTML = _renderOverview(data);
    } else if (tabId === 'licences') {
      const [licenses, overview] = await Promise.all([
        cache.licenses || (cache.licenses = _get('/api/licenses').catch(() => [])),
        cache.overview || (cache.overview = _get('/api/optimization/overview')),
      ]);
      panel.innerHTML = _renderLicences(licenses, overview);
    } else if (tabId === 'depenses') {
      const [txSummary, budgetSummary] = await Promise.all([
        cache.txSummary || (cache.txSummary = _get('/api/transactions/summary').catch(() => ({}))),
        cache.budget    || (cache.budget    = _get('/api/budget/summary').catch(() => ({}))),
      ]);
      panel.innerHTML = _renderDepenses(txSummary, budgetSummary);
    } else if (tabId === 'contrats') {
      const contracts = cache.contracts || (cache.contracts = await _get('/api/contracts').catch(() => []));
      panel.innerHTML = _renderContrats(contracts);
    } else if (tabId === 'recs') {
      const recs = cache.recs || (cache.recs = await _get('/api/optimization/recommendations').catch(() => ({})));
      panel.innerHTML = _renderRecs(recs);
    }
  } catch (err) {
    panel.innerHTML = `<div class="ei-empty">Erreur de chargement (${err.message})</div>`;
  }
}

async function _load(container) {
  container.innerHTML = `<div class="ei"><div class="ei-loader"><div class="ei-spinner"></div><span>Chargement de Enterprise Intelligence…</span></div></div>`;

  const cache = {};
  let activeTab = 'overview';

  container.innerHTML = `<div class="ei">
    <div class="ei-hd">
      <div class="ei-logo">📈</div>
      <div>
        <h1 class="ei-title">Enterprise Intelligence</h1>
        <p class="ei-sub">Coûts · Licences · Shadow IT · Budgets · Contrats · Recommandations ATLAS</p>
      </div>
    </div>
    <div class="ei-tabs" id="ei-tabs">
      ${_TABS.map(t => `<button class="ei-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div id="ei-panel"></div>
  </div>`;

  const panel = container.querySelector('#ei-panel');
  await _renderTab(panel, activeTab, cache);

  container.querySelector('#ei-tabs').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    container.querySelectorAll('.ei-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    await _renderTab(panel, activeTab, cache);
  });
}

export default {
  mount(container) { _css(); _load(container); },
  unmount(container) { container.innerHTML = ''; },
};
