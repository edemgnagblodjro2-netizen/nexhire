/**
 * AgentHub — Dashboard (Centre de pilotage)
 * Source unique : GET /api/dashboard/summary
 * Toutes les métriques proviennent de la base de données — aucune donnée simulée.
 */

const _CSS_ID = 'dash-css';

function _tok() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _tok(); return t ? { Authorization: `Bearer ${t}` } : {}; }
async function _api(path) {
  const r = await fetch(path, { headers: { ..._h(), 'Content-Type': 'application/json' }, credentials: 'include' });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Erreur ${r.status}`); }
  return r.json();
}

function _n(v) { return v ?? '—'; }
function _pct(num, den) { return den > 0 ? Math.round(num / den * 100) : 0; }
function _money(v) {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(v);
}

const _CSS = `
.dash{padding:28px 32px;max-width:1200px;margin:0 auto;font-family:var(--font,ui-sans-serif,system-ui,sans-serif)}
.dash-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
.dash-hd-left{display:flex;align-items:center;gap:14px}
.dash-logo{width:42px;height:42px;border-radius:var(--r-lg,10px);background:linear-gradient(135deg,#0078D4,#00BCF2);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0}
.dash-title{font-size:20px;font-weight:800;color:var(--text,#1B1B1B);margin:0}
.dash-sub{font-size:13px;color:var(--muted,#757575);margin:2px 0 0}
.dash-refresh{padding:7px 14px;border:1px solid var(--border,#E0E0E0);border-radius:var(--r,6px);font-size:12px;font-weight:600;background:var(--card,#fff);color:var(--text,#1B1B1B);cursor:pointer;font-family:inherit}
.dash-refresh:hover{border-color:var(--primary,#0078D4);color:var(--primary,#0078D4)}

.dash-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.dash-kpi{background:var(--card,#fff);border:1px solid var(--border,#E0E0E0);border-radius:var(--r-lg,10px);padding:18px 20px;cursor:default;transition:box-shadow .15s}
.dash-kpi:hover{box-shadow:0 2px 12px rgba(0,0,0,.06)}
.dash-kpi-icon{font-size:22px;margin-bottom:10px}
.dash-kpi-val{font-size:24px;font-weight:800;color:var(--text,#1B1B1B);line-height:1}
.dash-kpi-lbl{font-size:11px;color:var(--muted,#757575);margin:5px 0 0;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.dash-kpi-sub{font-size:12px;font-weight:600;margin-top:5px}
.dash-kpi-sub.ok{color:#107C10}.dash-kpi-sub.warn{color:#CA5010}.dash-kpi-sub.err{color:#C50F1F}.dash-kpi-sub.info{color:#0078D4}

.dash-cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.dash-col{display:flex;flex-direction:column;gap:14px}
.dash-card{background:var(--card,#fff);border:1px solid var(--border,#E0E0E0);border-radius:var(--r-lg,10px);overflow:hidden}
.dash-card-hd{padding:14px 18px;border-bottom:1px solid var(--border,#E0E0E0);display:flex;align-items:center;gap:8px}
.dash-card-hd h3{font-size:13px;font-weight:700;color:var(--text,#1B1B1B);margin:0;flex:1}
.dash-card-body{padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.dash-card-action{font-size:12px;color:var(--primary,#0078D4);font-weight:600;border:none;background:none;cursor:pointer;padding:0}
.dash-card-action:hover{text-decoration:underline}

.dash-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border,#E0E0E0)}
.dash-row:last-child{border-bottom:none}
.dash-row-icon{font-size:18px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:var(--bg-2,#F5F5F5);border-radius:8px;flex-shrink:0}
.dash-row-body{flex:1;min-width:0}
.dash-row-label{font-size:13px;font-weight:600;color:var(--text,#1B1B1B)}
.dash-row-sub{font-size:11px;color:var(--muted,#757575);margin-top:2px}
.dash-row-val{font-size:13px;font-weight:700;color:var(--text,#1B1B1B);white-space:nowrap}

.dash-health{background:var(--card,#fff);border:1px solid var(--border,#E0E0E0);border-radius:var(--r-lg,10px);padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:20px}
.dash-health-ring{position:relative;width:80px;height:80px;flex-shrink:0}
.dash-health-score{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.dash-health-val{font-size:20px;font-weight:800;color:var(--text,#1B1B1B);line-height:1}
.dash-health-unit{font-size:9px;color:var(--muted,#757575);text-transform:uppercase;letter-spacing:.05em}
.dash-health-info{flex:1}
.dash-health-title{font-size:14px;font-weight:700;color:var(--text,#1B1B1B);margin-bottom:6px}
.dash-health-checks{display:flex;flex-wrap:wrap;gap:8px}
.dash-check{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600}
.dash-check.ok{color:#107C10}.dash-check.warn{color:#CA5010}.dash-check.off{color:#757575}

.dash-empty{text-align:center;padding:40px 20px;color:var(--muted,#757575)}
.dash-empty-icon{font-size:36px;opacity:.35;margin-bottom:10px}
.dash-empty-text{font-size:13px}

.dash-alert-bar{padding:8px 18px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:8px;cursor:pointer}
.dash-alert-bar.crit{background:#FDE7E9;color:#C50F1F;border-top:1px solid #FCC}
.dash-alert-bar.warn{background:#FDE7D9;color:#CA5010;border-top:1px solid #FDCBA8}

.dash-progress{height:6px;background:var(--border,#E0E0E0);border-radius:99px;overflow:hidden;margin-top:6px}
.dash-progress-fill{height:100%;border-radius:99px;transition:width .4s}

.dash-btn-nav{padding:6px 12px;border:1px solid var(--border,#E0E0E0);border-radius:var(--r,6px);font-size:11px;font-weight:600;background:var(--card,#fff);color:var(--text,#1B1B1B);cursor:pointer;font-family:inherit;white-space:nowrap}
.dash-btn-nav:hover{border-color:var(--primary,#0078D4);color:var(--primary,#0078D4)}

.dash-loader{display:flex;gap:12px;align-items:center;justify-content:center;padding:80px;color:var(--muted,#757575);font-size:13px}
.dash-spin{width:22px;height:22px;border:2px solid var(--border,#E0E0E0);border-top-color:var(--primary,#0078D4);border-radius:50%;animation:dash-spin .7s linear infinite;flex-shrink:0}
@keyframes dash-spin{to{transform:rotate(360deg)}}

@media(max-width:900px){.dash-grid{grid-template-columns:repeat(2,1fr)}.dash-cols{grid-template-columns:1fr}}
@media(max-width:540px){.dash-grid{grid-template-columns:1fr}}
`;

function _healthColor(score) {
  if (score === null) return '#757575';
  if (score >= 75) return '#107C10';
  if (score >= 50) return '#CA5010';
  return '#C50F1F';
}

function _healthRing(score) {
  const c = _healthColor(score);
  const s = score ?? 0;
  return `<svg width="80" height="80" viewBox="0 0 80 80">
    <circle cx="40" cy="40" r="32" fill="none" stroke="#E0E0E0" stroke-width="7"/>
    <circle cx="40" cy="40" r="32" fill="none" stroke="${c}" stroke-width="7"
      stroke-dasharray="${2 * Math.PI * 32}" stroke-dashoffset="${2 * Math.PI * 32 * (1 - s / 100)}"
      stroke-linecap="round" transform="rotate(-90 40 40)"/>
  </svg>
  <div class="dash-health-score">
    <div class="dash-health-val" style="color:${c}">${score ?? '—'}</div>
    <div class="dash-health-unit">/100</div>
  </div>`;
}

function _nav(slug) {
  document.dispatchEvent(new CustomEvent('ws:navigate', { detail: { appSlug: slug } }));
}

function _renderDashboard(d) {
  const budgetPct = _pct(d.budget_spent_month, d.budget_alloc_month);
  const budgetColor = budgetPct > 100 ? '#C50F1F' : budgetPct > 85 ? '#CA5010' : '#107C10';

  const connPct = d.connectors_total > 0 ? _pct(d.connectors_active, d.connectors_total) : null;

  const checks = [
    { ok: d.workflows_active > 0, label: 'Workflows actifs' },
    { ok: d.connectors_active > 0, label: 'Connecteurs actifs' },
    { ok: d.alerts_open === 0, label: 'Aucune alerte' },
    { ok: budgetPct <= 100 && d.budget_alloc_month > 0, label: 'Budget sous contrôle' },
  ];

  const el = document.createElement('div');
  el.className = 'dash';
  el.innerHTML = `
<div class="dash-hd">
  <div class="dash-hd-left">
    <div class="dash-logo">📊</div>
    <div>
      <h1 class="dash-title">Dashboard</h1>
      <p class="dash-sub">Centre de pilotage — données en temps réel</p>
    </div>
  </div>
  <button class="dash-refresh" id="dash-refresh-btn">↻ Actualiser</button>
</div>

${d.alerts_open > 0 ? `<div class="dash-alert-bar ${d.alerts_open > 5 ? 'crit' : 'warn'}" onclick="_nav('security')">
  ⚠️ ${d.alerts_open} alerte${d.alerts_open > 1 ? 's' : ''} de sécurité non résolue${d.alerts_open > 1 ? 's' : ''} — Cliquez pour traiter →
</div>` : ''}

${d.contracts_renewing > 0 ? `<div class="dash-alert-bar warn" onclick="_nav('contracts')" style="margin-top:2px">
  📅 ${d.contracts_renewing} contrat${d.contracts_renewing > 1 ? 's' : ''} à renouveler dans les 90 prochains jours →
</div>` : ''}

<div class="dash-grid">
  <div class="dash-kpi" onclick="_nav('identity')">
    <div class="dash-kpi-icon">👤</div>
    <div class="dash-kpi-val">${_n(d.users_active)}</div>
    <div class="dash-kpi-lbl">Utilisateurs actifs</div>
    <div class="dash-kpi-sub ok">Comptes vérifiés</div>
  </div>
  <div class="dash-kpi" onclick="_nav('integrations')">
    <div class="dash-kpi-icon">🔌</div>
    <div class="dash-kpi-val">${_n(d.connectors_active)}<span style="font-size:14px;font-weight:500;color:var(--muted)">/${_n(d.connectors_total)}</span></div>
    <div class="dash-kpi-lbl">Connecteurs actifs</div>
    <div class="dash-kpi-sub ${d.connectors_active > 0 ? 'ok' : 'warn'}">${connPct !== null ? connPct + '% connectés' : 'Aucun configuré'}</div>
  </div>
  <div class="dash-kpi" onclick="_nav('automation')">
    <div class="dash-kpi-icon">⚡</div>
    <div class="dash-kpi-val">${_n(d.workflows_active)}</div>
    <div class="dash-kpi-lbl">Workflows actifs</div>
    <div class="dash-kpi-sub info">${_n(d.workflow_runs_total)} exécutions total</div>
  </div>
  <div class="dash-kpi" onclick="_nav('sales-intelligence')">
    <div class="dash-kpi-icon">🤖</div>
    <div class="dash-kpi-val">${_n(d.ai_agent_runs_month)}</div>
    <div class="dash-kpi-lbl">Runs agents IA</div>
    <div class="dash-kpi-sub info">Ce mois-ci</div>
  </div>
</div>

<div class="dash-health">
  <div class="dash-health-ring">${_healthRing(d.platform_health)}</div>
  <div class="dash-health-info">
    <div class="dash-health-title">Santé de la plateforme</div>
    <div class="dash-health-checks">
      ${checks.map(c => `<span class="dash-check ${c.ok ? 'ok' : 'warn'}">${c.ok ? '✓' : '○'} ${c.label}</span>`).join('')}
    </div>
  </div>
</div>

<div class="dash-cols">
  <div class="dash-col">

    <div class="dash-card">
      <div class="dash-card-hd">
        <span>💰</span>
        <h3>Budget — ${new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}</h3>
        <button class="dash-btn-nav" onclick="_nav('budget')">Ouvrir →</button>
      </div>
      <div class="dash-card-body">
        ${d.budget_alloc_month === 0
          ? `<div class="dash-empty"><div class="dash-empty-icon">💰</div><div class="dash-empty-text">Aucune entrée budgétaire ce mois-ci.<br><button class="dash-btn-nav" onclick="_nav('budget')">Créer un budget →</button></div></div>`
          : `<div style="display:flex;justify-content:space-between;align-items:baseline">
              <div>
                <div style="font-size:22px;font-weight:800;color:${budgetColor}">${_money(d.budget_spent_month)}</div>
                <div style="font-size:11px;color:var(--muted)">dépensé sur ${_money(d.budget_alloc_month)} alloué</div>
              </div>
              <div style="font-size:20px;font-weight:800;color:${budgetColor}">${budgetPct}%</div>
            </div>
            <div class="dash-progress"><div class="dash-progress-fill" style="width:${Math.min(budgetPct,100)}%;background:${budgetColor}"></div></div>`}
      </div>
    </div>

    <div class="dash-card">
      <div class="dash-card-hd">
        <span>🖥</span>
        <h3>Parc TI</h3>
        <button class="dash-btn-nav" onclick="_nav('assets')">Ouvrir →</button>
      </div>
      <div class="dash-card-body">
        ${d.assets_active === 0
          ? `<div class="dash-empty"><div class="dash-empty-icon">🖥</div><div class="dash-empty-text">Aucun actif enregistré.<br><button class="dash-btn-nav" onclick="_nav('assets')">Ajouter un actif →</button></div></div>`
          : `<div class="dash-row">
              <div class="dash-row-icon">🖥</div>
              <div class="dash-row-body"><div class="dash-row-label">Actifs actifs</div><div class="dash-row-sub">Hors équipements retraités</div></div>
              <div class="dash-row-val">${d.assets_active}</div>
            </div>`}
      </div>
    </div>

  </div>
  <div class="dash-col">

    <div class="dash-card">
      <div class="dash-card-hd">
        <span>📄</span>
        <h3>Contrats</h3>
        <button class="dash-btn-nav" onclick="_nav('contracts')">Ouvrir →</button>
      </div>
      <div class="dash-card-body">
        ${d.contracts_renewing === 0
          ? `<div class="dash-row">
              <div class="dash-row-icon">✅</div>
              <div class="dash-row-body"><div class="dash-row-label">Aucun renouvellement urgent</div><div class="dash-row-sub">Tous les contrats actifs sont sous contrôle (90j)</div></div>
            </div>`
          : `<div class="dash-row" style="cursor:pointer" onclick="_nav('contracts')">
              <div class="dash-row-icon">⏰</div>
              <div class="dash-row-body">
                <div class="dash-row-label" style="color:#CA5010">${d.contracts_renewing} à renouveler</div>
                <div class="dash-row-sub">Dans les 90 prochains jours</div>
              </div>
              <div class="dash-row-val" style="color:#CA5010">Traiter →</div>
            </div>`}
      </div>
    </div>

    <div class="dash-card">
      <div class="dash-card-hd">
        <span>🔌</span>
        <h3>Connecteurs</h3>
        <button class="dash-btn-nav" onclick="_nav('integrations')">Configurer →</button>
      </div>
      <div class="dash-card-body">
        ${d.connectors_total === 0
          ? `<div class="dash-empty"><div class="dash-empty-icon">🔌</div><div class="dash-empty-text">Aucun connecteur configuré.<br><button class="dash-btn-nav" onclick="_nav('integrations')">Connecter un outil →</button></div></div>`
          : `<div class="dash-row">
              <div class="dash-row-icon">✅</div>
              <div class="dash-row-body"><div class="dash-row-label">Actifs</div></div>
              <div class="dash-row-val" style="color:#107C10">${d.connectors_active}</div>
            </div>
            <div class="dash-row">
              <div class="dash-row-icon">⭕</div>
              <div class="dash-row-body"><div class="dash-row-label">Non connectés</div></div>
              <div class="dash-row-val">${d.connectors_total - d.connectors_active}</div>
            </div>`}
      </div>
    </div>

  </div>
</div>`;

  el.querySelector('#dash-refresh-btn')?.addEventListener('click', () => {
    _mount._reload();
  });

  return el;
}

const _mount = {
  _container: null,
  _reload: null,
};

export default {
  async mount(container) {
    if (!document.getElementById(_CSS_ID)) {
      const s = document.createElement('style');
      s.id = _CSS_ID;
      s.textContent = _CSS;
      document.head.appendChild(s);
    }

    _mount._container = container;
    _mount._reload = async () => {
      container.innerHTML = `<div class="dash-loader"><div class="dash-spin"></div>Chargement du tableau de bord…</div>`;
      try {
        const [summary, optScore] = await Promise.all([
          _api('/api/dashboard/summary'),
          _api('/api/optimization/efficiency-score').catch(() => null),
        ]);

        if (optScore) {
          summary.platform_health = Math.round(optScore.overall ?? summary.platform_health ?? 0);
        }

        container.innerHTML = '';
        container.appendChild(_renderDashboard(summary));
      } catch (e) {
        container.innerHTML = `<div class="dash-loader" style="flex-direction:column;gap:8px;color:#C50F1F">
          <div style="font-size:32px">⚠️</div>
          <div style="font-size:14px;font-weight:700">Impossible de charger le tableau de bord</div>
          <div style="font-size:12px;color:#757575">${e.message}</div>
          <button class="dash-refresh" onclick="this.closest('.dash').dispatchEvent(new Event('retry'))">Réessayer</button>
        </div>`;
      }
    };

    await _mount._reload();
  },

  unmount(container) {
    _mount._container = null;
    _mount._reload = null;
    container.innerHTML = '';
  },
};
