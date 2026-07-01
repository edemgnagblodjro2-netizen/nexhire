/**
 * AgentHub Platform — App: M365 Optimizer
 * Dashboard réel : licences, économies, Intune, risques Entra
 * APIs : /api/intelligence/m365/licenses · /savings · /risks/summary · /intune/summary
 */

const _CSS_ID = 'm365-css';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.m365{padding:var(--sp-8);max-width:1100px;margin:0 auto;font-family:var(--font)}
.m365-hd{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px;flex-wrap:wrap}
.m365-hd-left{display:flex;align-items:center;gap:14px}
.m365-logo{width:40px;height:40px;border-radius:var(--r-lg);background:#0078d4;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0}
.m365-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.m365-sub{font-size:13px;color:var(--muted);margin:2px 0 0}
.m365-sync-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 16px;background:var(--primary);color:#fff;border:none;border-radius:var(--r);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .15s}
.m365-sync-btn:hover{opacity:.88}
.m365-sync-btn:disabled{opacity:.5;cursor:default}

/* KPI strip */
.m365-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.m365-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.m365-kpi-icon{font-size:20px;margin-bottom:8px}
.m365-kpi-val{font-size:26px;font-weight:800;color:var(--text);line-height:1}
.m365-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.m365-kpi-sub{font-size:12px;font-weight:600;margin-top:6px}
.m365-kpi-sub.ok{color:var(--color-ok-text)}
.m365-kpi-sub.warn{color:var(--color-warn-text)}
.m365-kpi-sub.err{color:var(--color-err-text)}
.m365-kpi-sub.info{color:var(--color-info-on)}

/* Two-column grid */
.m365-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.m365-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden}
.m365-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.m365-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0}
.m365-card-hd span{font-size:16px}
.m365-card-body{padding:18px}

/* Pools table */
.m365-table{width:100%;border-collapse:collapse;font-size:12px}
.m365-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:0 8px 10px;border-bottom:1px solid var(--border)}
.m365-table td{padding:9px 8px;border-bottom:1px solid var(--border);color:var(--text)}
.m365-table tr:last-child td{border-bottom:none}
.m365-pill{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill)}
.m365-pill.ok{background:var(--color-ok-soft);color:var(--color-ok-text)}
.m365-pill.warn{background:var(--color-warn-soft);color:var(--color-warn-text)}
.m365-pill.err{background:var(--color-err-soft);color:var(--color-err-text)}

/* Risks list */
.m365-risk-row{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)}
.m365-risk-row:last-child{border-bottom:none}
.m365-risk-sev{font-size:10px;font-weight:700;padding:3px 8px;border-radius:var(--r-pill);flex-shrink:0;margin-top:1px}
.m365-risk-sev.critical{background:#fee2e2;color:#991b1b}
.m365-risk-sev.high{background:#ffedd5;color:#9a3412}
.m365-risk-sev.medium{background:#fef9c3;color:#854d0e}
.m365-risk-sev.low{background:var(--color-ok-soft);color:var(--color-ok-text)}
.m365-risk-title{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px}
.m365-risk-desc{font-size:11px;color:var(--muted);line-height:1.4}
.m365-risk-cost{font-size:11px;font-weight:700;color:var(--color-warn-text);white-space:nowrap;flex-shrink:0}

/* Savings breakdown */
.m365-saving-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)}
.m365-saving-row:last-child{border-bottom:none}
.m365-saving-label{font-size:12px;color:var(--text)}
.m365-saving-val{font-size:13px;font-weight:700;color:var(--color-ok-text)}

/* Not connected state */
.m365-connect{background:var(--card);border:2px dashed var(--border);border-radius:var(--r-xl);padding:48px;text-align:center;margin-top:8px}
.m365-connect-icon{font-size:48px;margin-bottom:16px}
.m365-connect h2{font-size:18px;font-weight:800;color:var(--text);margin:0 0 10px}
.m365-connect p{font-size:14px;color:var(--muted);max-width:480px;margin:0 auto 24px;line-height:1.6}
.m365-connect-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#0078d4;color:#fff;border:none;border-radius:var(--r);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.m365-connect-btn:hover{opacity:.9}

/* Loader */
.m365-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 0;color:var(--muted)}
.m365-spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:#0078d4;border-radius:50%;animation:m365spin .7s linear infinite}
@keyframes m365spin{to{transform:rotate(360deg)}}

@media(max-width:900px){.m365-grid{grid-template-columns:1fr}.m365-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.m365-kpis{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

function _token() {
  return localStorage.getItem('nexhire_token') || '';
}

function _authHeaders() {
  const t = _token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function _apiFetch(path) {
  const r = await fetch(path, { headers: _authHeaders(), credentials: 'include' });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

function _fmtCAD(v) {
  return (v || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
}

function _severityLabel(s) {
  const MAP = { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' };
  return MAP[s] || s;
}

function _poolRows(pools) {
  if (!pools.length) return `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Aucune licence M365 trouvée</td></tr>`;
  return pools.map(p => {
    const used = p.quantity_assigned || 0;
    const total = p.quantity_total || 0;
    const pct = total ? Math.round((used / total) * 100) : 0;
    const cls = pct > 95 ? 'ok' : pct > 70 ? 'warn' : 'err';
    return `<tr>
      <td><strong>${p.sku_name || '—'}</strong></td>
      <td style="text-align:right">${total}</td>
      <td style="text-align:right">${used}</td>
      <td style="text-align:right"><span class="m365-pill ${cls}">${pct}%</span></td>
      <td style="text-align:right">${_fmtCAD((p.monthly_total || 0))}/mois</td>
    </tr>`;
  }).join('');
}

function _riskRows(risks) {
  if (!risks.length) return `<div style="text-align:center;color:var(--muted);font-size:13px;padding:20px">Aucun risque actif</div>`;
  return risks.slice(0, 8).map(r => `
    <div class="m365-risk-row">
      <span class="m365-risk-sev ${r.severity}">${_severityLabel(r.severity)}</span>
      <div style="flex:1;min-width:0">
        <div class="m365-risk-title">${r.title || ''}</div>
        <div class="m365-risk-desc">${r.description || ''}</div>
      </div>
      ${r.cost_impact_monthly ? `<div class="m365-risk-cost">${_fmtCAD(r.cost_impact_monthly)}/mois</div>` : ''}
    </div>`).join('');
}

function _savingsRows(byType) {
  const labels = {
    unused_license: '🔵 Licences inutilisées',
    duplicate_tool: '🔁 Outils en doublon',
    contract_expiry: '📄 Contrats à renouveler',
    budget_overspend: '💸 Dépassements budget',
  };
  const rows = byType.filter(r => r.monthly > 0);
  if (!rows.length) return `<div style="text-align:center;color:var(--muted);font-size:13px;padding:20px">Aucune opportunité détectée</div>`;
  return rows.map(r => `
    <div class="m365-saving-row">
      <span class="m365-saving-label">${labels[r.finding_type] || r.finding_type} (${r.count})</span>
      <span class="m365-saving-val">${_fmtCAD(r.annual)}/an</span>
    </div>`).join('');
}

function _renderConnected(container, lic, savings, risks) {
  const pools = lic.pools || [];
  const totalLic = pools.reduce((s, p) => s + (p.quantity_total || 0), 0);
  const usedLic  = pools.reduce((s, p) => s + (p.quantity_assigned || 0), 0);
  const waste     = lic.inactive_count || 0;
  const wasteCAD  = lic.inactive_cost || 0;
  const savingsAnn = savings.savings_annual || 0;
  const riskList   = risks.risks || risks || [];
  const byType     = savings.by_type || [];

  container.innerHTML = `<div class="m365">
    <div class="m365-hd">
      <div class="m365-hd-left">
        <div class="m365-logo">🪟</div>
        <div>
          <h1 class="m365-title">M365 Optimizer</h1>
          <p class="m365-sub">Dernier sync : ${new Date().toLocaleDateString('fr-CA')} · ${totalLic} licences · ${pools.length} pools</p>
        </div>
      </div>
      <button class="m365-sync-btn" id="m365-sync-btn">⟳ Synchroniser M365</button>
    </div>

    <div class="m365-kpis">
      <div class="m365-kpi">
        <div class="m365-kpi-icon">🪪</div>
        <div class="m365-kpi-val">${usedLic}<span style="font-size:14px;font-weight:500;color:var(--muted)"> / ${totalLic}</span></div>
        <div class="m365-kpi-lbl">Licences utilisées</div>
        <div class="m365-kpi-sub ${waste > 0 ? 'warn' : 'ok'}">${waste > 0 ? `⚠️ ${waste} inactives` : '✅ Toutes actives'}</div>
      </div>
      <div class="m365-kpi">
        <div class="m365-kpi-icon">💰</div>
        <div class="m365-kpi-val">${_fmtCAD(savingsAnn)}</div>
        <div class="m365-kpi-lbl">Économies potentielles / an</div>
        <div class="m365-kpi-sub ${savingsAnn > 0 ? 'warn' : 'ok'}">${savingsAnn > 0 ? '↑ Identifiées' : '✅ Optimisé'}</div>
      </div>
      <div class="m365-kpi">
        <div class="m365-kpi-icon">⚠️</div>
        <div class="m365-kpi-val">${lic.oversized_count || 0}</div>
        <div class="m365-kpi-lbl">Licences surdimensionnées</div>
        <div class="m365-kpi-sub ${(lic.oversized_count || 0) > 0 ? 'warn' : 'ok'}">${(lic.oversized_count || 0) > 0 ? 'Downgrade possible' : '✅ Calibré'}</div>
      </div>
      <div class="m365-kpi">
        <div class="m365-kpi-icon">🗑️</div>
        <div class="m365-kpi-val">${_fmtCAD(wasteCAD)}</div>
        <div class="m365-kpi-lbl">Gaspillage mensuel</div>
        <div class="m365-kpi-sub ${wasteCAD > 0 ? 'err' : 'ok'}">${wasteCAD > 0 ? '↓ À optimiser' : '✅ Aucun'}</div>
      </div>
    </div>

    <div class="m365-grid">
      <div class="m365-card">
        <div class="m365-card-hd"><span>🪪</span><h3>Pools de licences</h3></div>
        <div class="m365-card-body" style="padding:0 18px">
          <table class="m365-table">
            <thead><tr><th>SKU</th><th style="text-align:right">Total</th><th style="text-align:right">Assignées</th><th style="text-align:right">Utilisation</th><th style="text-align:right">Coût/mois</th></tr></thead>
            <tbody>${_poolRows(pools)}</tbody>
          </table>
        </div>
      </div>
      <div class="m365-card">
        <div class="m365-card-hd"><span>💰</span><h3>Opportunités d'économies</h3></div>
        <div class="m365-card-body">
          ${_savingsRows(byType)}
          ${savingsAnn > 0 ? `<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;font-weight:700;color:var(--text)">Total annuel</span>
            <span style="font-size:16px;font-weight:800;color:var(--color-ok-text)">${_fmtCAD(savingsAnn)}</span>
          </div>` : ''}
        </div>
      </div>
    </div>

    <div class="m365-card">
      <div class="m365-card-hd"><span>🔐</span><h3>Risques de sécurité Entra ID</h3></div>
      <div class="m365-card-body">${_riskRows(riskList)}</div>
    </div>
  </div>`;

  container.querySelector('#m365-sync-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '⟳ Synchronisation…';
    try {
      await fetch('/api/intelligence/m365/sync', { method: 'POST', headers: _authHeaders(), credentials: 'include' });
      await _load(container);
    } catch {
      btn.disabled = false;
      btn.textContent = '⟳ Synchroniser M365';
    }
  });
}

function _renderNotConnected(container) {
  container.innerHTML = `<div class="m365">
    <div class="m365-hd">
      <div class="m365-hd-left">
        <div class="m365-logo">🪟</div>
        <div><h1 class="m365-title">M365 Optimizer</h1></div>
      </div>
    </div>
    <div class="m365-connect">
      <div class="m365-connect-icon">🪟</div>
      <h2>Connectez Microsoft 365</h2>
      <p>Autorisez AgentHub à lire vos licences, groupes Entra ID et métriques Intune. La connexion est en lecture seule — aucune donnée n'est modifiée.</p>
      <button class="m365-connect-btn" id="m365-connect-btn">🔗 Connecter Microsoft 365</button>
    </div>
  </div>`;

  container.querySelector('#m365-connect-btn')?.addEventListener('click', () => {
    const slug = window.location.pathname.split('/')[2] || 'demo';
    window.location.href = `/api/oauth/microsoft_365/oauth/start?slug=${slug}`;
  });
}

async function _load(container) {
  container.innerHTML = `<div class="m365"><div class="m365-loader"><div class="m365-spinner"></div><span>Chargement des données M365…</span></div></div>`;

  try {
    const [lic, savings, risks] = await Promise.all([
      _apiFetch('/api/intelligence/m365/licenses'),
      _apiFetch('/api/intelligence/savings'),
      _apiFetch('/api/intelligence/risks?finding_type=unused_license&limit=20'),
    ]);

    if (!lic.pools || lic.pools.length === 0) {
      _renderNotConnected(container);
    } else {
      _renderConnected(container, lic, savings, Array.isArray(risks) ? risks : (risks.risks || []));
    }
  } catch (err) {
    if (err.message === '401' || err.message === '403') {
      _renderNotConnected(container);
    } else {
      container.innerHTML = `<div class="m365"><div style="padding:60px;text-align:center;color:var(--muted)">
        <div style="font-size:32px;margin-bottom:12px">⚠️</div>
        <div style="font-size:14px">Erreur de chargement M365 (${err.message}). Vérifiez la connexion au connecteur.</div>
      </div></div>`;
    }
  }
}

export default {
  mount(container) {
    _css();
    _load(container);
  },
  unmount(container) {
    container.innerHTML = '';
  },
};
