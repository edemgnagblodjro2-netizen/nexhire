/**
 * AgentHub Platform — App: Sécurité & Audit
 * APIs : GET /api/security/dashboard · GET /api/audit
 */

const _CSS_ID = 'sec-css';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.sec{padding:var(--sp-8);max-width:1100px;margin:0 auto;font-family:var(--font)}
.sec-hd{display:flex;align-items:center;gap:14px;margin-bottom:28px}
.sec-hd-icon{width:40px;height:40px;border-radius:var(--r-lg);background:var(--color-err);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}
.sec-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.sec-sub{font-size:13px;color:var(--muted);margin:2px 0 0}

/* KPI strip */
.sec-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.sec-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px;position:relative}
.sec-kpi-icon{font-size:20px;margin-bottom:8px}
.sec-kpi-val{font-size:26px;font-weight:800;color:var(--text);line-height:1}
.sec-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
.sec-kpi-sub{font-size:12px;font-weight:600;margin-top:6px}
.sec-kpi-sub.ok{color:var(--color-ok-text)}
.sec-kpi-sub.warn{color:var(--color-warn-text)}
.sec-kpi-sub.err{color:var(--color-err-text)}

/* MFA progress */
.sec-mfa-bar{height:6px;background:var(--bg-2);border-radius:3px;margin-top:10px;overflow:hidden}
.sec-mfa-fill{height:100%;border-radius:3px;transition:width .4s ease}

/* Two-column grid */
.sec-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.sec-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden}
.sec-card-hd{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.sec-card-hd h3{font-size:13px;font-weight:700;color:var(--text);margin:0;flex:1}
.sec-card-hd span{font-size:16px}
.sec-card-body{padding:18px}

/* Alert rows */
.sec-alert-row{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.sec-alert-row:last-child{border-bottom:none}
.sec-sev{font-size:10px;font-weight:700;padding:3px 8px;border-radius:var(--r-pill);flex-shrink:0;text-transform:uppercase}
.sec-sev.critical{background:#fee2e2;color:#991b1b}
.sec-sev.high{background:#ffedd5;color:#9a3412}
.sec-sev.medium{background:#fef9c3;color:#854d0e}
.sec-sev.low{background:var(--color-ok-soft);color:var(--color-ok-text)}
.sec-alert-title{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px}
.sec-alert-detail{font-size:11px;color:var(--muted)}

/* Login activity bars */
.sec-activity-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.sec-activity-date{font-size:11px;color:var(--muted);width:60px;flex-shrink:0}
.sec-activity-bars{flex:1;display:flex;gap:4px;height:18px;align-items:flex-end}
.sec-bar-ok{background:var(--color-ok);border-radius:2px 2px 0 0;min-width:4px}
.sec-bar-fail{background:var(--color-err);border-radius:2px 2px 0 0;min-width:4px}
.sec-activity-counts{font-size:10px;color:var(--muted);width:60px;text-align:right;flex-shrink:0}

/* Audit table */
.sec-table{width:100%;border-collapse:collapse;font-size:12px}
.sec-table th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:0 10px 10px;border-bottom:1px solid var(--border)}
.sec-table td{padding:9px 10px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:top}
.sec-table tr:last-child td{border-bottom:none}
.sec-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:middle}
.sec-dot.ok{background:var(--color-ok)}
.sec-dot.err{background:var(--color-err)}
.sec-tag{font-size:10px;background:var(--bg-2);color:var(--muted);padding:2px 7px;border-radius:var(--r-pill)}

/* Audit filters */
.sec-filters{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.sec-filter-btn{padding:5px 12px;border:1px solid var(--border);border-radius:var(--r-pill);font-size:11px;font-weight:600;background:var(--bg);color:var(--muted);cursor:pointer;transition:all .15s;font-family:inherit}
.sec-filter-btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}

/* Loader */
.sec-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 0;color:var(--muted)}
.sec-spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--color-err);border-radius:50%;animation:secspin .7s linear infinite}
@keyframes secspin{to{transform:rotate(360deg)}}

@media(max-width:900px){.sec-grid{grid-template-columns:1fr}.sec-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:540px){.sec-kpis{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

function _token() {
  return localStorage.getItem('nexhire_token') || '';
}
function _h() {
  const t = _token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function _get(path) {
  const r = await fetch(path, { headers: _h(), credentials: 'include' });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function _fmtTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function _severityFr(s) {
  return { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' }[s] || s;
}

function _alertTypeFr(t) {
  return {
    brute_force: 'Attaque par force brute',
    mfa_bypass: 'Contournement MFA',
    impossible_travel: 'Voyage impossible',
    new_device: 'Nouvel appareil',
    privileged_access: 'Accès privilégié',
    data_exfiltration: 'Exfiltration de données',
  }[t] || t?.replace(/_/g, ' ') || '—';
}

function _actionFr(a) {
  return {
    auth_login: 'Connexion',
    auth_logout: 'Déconnexion',
    auth_signup: 'Inscription',
    connector_connect: 'Connecteur ajouté',
    connector_disconnect: 'Connecteur retiré',
    document_upload: 'Document ajouté',
    member_invite: 'Invitation envoyée',
    member_role_change: 'Rôle modifié',
    org_update: 'Organisation mise à jour',
    report_export: 'Rapport exporté',
  }[a] || a?.replace(/_/g, ' ') || '—';
}

let _auditFilter = null;

function _renderAlerts(alerts) {
  if (!alerts.length) return `<div style="text-align:center;color:var(--muted);font-size:13px;padding:24px">Aucune alerte de sécurité active</div>`;
  return alerts.map(a => `
    <div class="sec-alert-row">
      <span class="sec-sev ${a.severity || 'medium'}">${_severityFr(a.severity)}</span>
      <div style="flex:1">
        <div class="sec-alert-title">${_alertTypeFr(a.alert_type)}</div>
        <div class="sec-alert-detail">${a.details || ''} ${a.ip_address ? `· IP ${a.ip_address}` : ''}</div>
      </div>
      <div style="font-size:11px;color:var(--muted);white-space:nowrap">${_fmtTime(a.created_at)}</div>
    </div>`).join('');
}

function _renderActivity(activity) {
  if (!activity.length) return `<div style="text-align:center;color:var(--muted);font-size:13px;padding:24px">Aucune donnée de connexion</div>`;
  const maxVal = Math.max(...activity.flatMap(r => [r.succes || 0, r.echecs || 0]), 1);
  return activity.slice(0, 7).map(r => {
    const hOk   = Math.max(2, Math.round(((r.succes || 0) / maxVal) * 40));
    const hFail = Math.max(2, Math.round(((r.echecs || 0) / maxVal) * 40));
    const date  = r.jour ? new Date(r.jour + 'T00:00:00').toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' }) : '—';
    return `<div class="sec-activity-row">
      <span class="sec-activity-date">${date}</span>
      <div class="sec-activity-bars">
        <div class="sec-bar-ok" style="height:${hOk}px;width:12px" title="${r.succes} connexions réussies"></div>
        ${(r.echecs || 0) > 0 ? `<div class="sec-bar-fail" style="height:${hFail}px;width:12px" title="${r.echecs} échecs"></div>` : ''}
      </div>
      <span class="sec-activity-counts">✅ ${r.succes || 0} / ❌ ${r.echecs || 0}</span>
    </div>`;
  }).join('');
}

function _renderAuditRows(logs) {
  if (!logs.length) return `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Aucun événement trouvé</td></tr>`;
  return logs.map(l => `<tr>
    <td><span class="sec-dot ${l.success ? 'ok' : 'err'}"></span>${_actionFr(l.action)}</td>
    <td>${l.connector ? `<span class="sec-tag">${l.connector}</span>` : '—'}</td>
    <td style="color:var(--muted)">${l.ip_address || '—'}</td>
    <td style="color:var(--muted);font-size:11px">${l.error_detail || (l.success ? 'OK' : 'Échec')}</td>
    <td style="color:var(--muted)">${_fmtTime(l.created_at)}</td>
  </tr>`).join('');
}

async function _loadAudit(tableBody, filter) {
  tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Chargement…</td></tr>`;
  try {
    const params = new URLSearchParams({ limit: 50 });
    if (filter === 'ok')   params.set('success', 'true');
    if (filter === 'fail') params.set('success', 'false');
    const data = await _get(`/api/audit?${params}`);
    const logs = data.logs || data;
    tableBody.innerHTML = _renderAuditRows(Array.isArray(logs) ? logs : []);
  } catch {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:20px">Erreur de chargement</td></tr>`;
  }
}

async function _load(container) {
  container.innerHTML = `<div class="sec"><div class="sec-loader"><div class="sec-spinner"></div><span>Chargement des données de sécurité…</span></div></div>`;

  let dash = { total_users: 0, mfa_enabled: 0, require_mfa: false, alert_summary: [], recent_alerts: [], login_activity: [] };
  try { dash = await _get('/api/security/dashboard'); } catch {}

  const mfaPct    = dash.total_users ? Math.round((dash.mfa_enabled / dash.total_users) * 100) : 0;
  const alertCount = (dash.recent_alerts || []).length;
  const critCount  = (dash.alert_summary || []).filter(a => a.severity === 'critical').reduce((s, a) => s + (a.cnt || 0), 0);
  const loginOk    = (dash.login_activity || []).reduce((s, r) => s + (r.succes || 0), 0);
  const loginFail  = (dash.login_activity || []).reduce((s, r) => s + (r.echecs || 0), 0);

  const mfaColor   = mfaPct >= 90 ? 'var(--color-ok)' : mfaPct >= 60 ? 'var(--color-warn)' : 'var(--color-err)';
  const mfaCls     = mfaPct >= 90 ? 'ok' : mfaPct >= 60 ? 'warn' : 'err';
  const alertCls   = alertCount === 0 ? 'ok' : critCount > 0 ? 'err' : 'warn';

  container.innerHTML = `<div class="sec">
    <div class="sec-hd">
      <div class="sec-hd-icon">🔐</div>
      <div>
        <h1 class="sec-title">Sécurité & Audit</h1>
        <p class="sec-sub">Tableau de bord sécurité · Journal d'audit complet · 7 derniers jours</p>
      </div>
    </div>

    <div class="sec-kpis">
      <div class="sec-kpi">
        <div class="sec-kpi-icon">🛡️</div>
        <div class="sec-kpi-val">${mfaPct}<span style="font-size:14px;font-weight:500;color:var(--muted)">%</span></div>
        <div class="sec-kpi-lbl">Couverture MFA</div>
        <div class="sec-kpi-sub ${mfaCls}">${dash.mfa_enabled} / ${dash.total_users} utilisateurs</div>
        <div class="sec-mfa-bar"><div class="sec-mfa-fill" style="width:${mfaPct}%;background:${mfaColor}"></div></div>
      </div>
      <div class="sec-kpi">
        <div class="sec-kpi-icon">🚨</div>
        <div class="sec-kpi-val">${alertCount}</div>
        <div class="sec-kpi-lbl">Alertes actives</div>
        <div class="sec-kpi-sub ${alertCls}">${alertCount === 0 ? '✅ Aucune alerte' : critCount > 0 ? `${critCount} critiques` : 'En cours d\'analyse'}</div>
      </div>
      <div class="sec-kpi">
        <div class="sec-kpi-icon">✅</div>
        <div class="sec-kpi-val">${loginOk}</div>
        <div class="sec-kpi-lbl">Connexions réussies (7j)</div>
        <div class="sec-kpi-sub ok">7 derniers jours</div>
      </div>
      <div class="sec-kpi">
        <div class="sec-kpi-icon">❌</div>
        <div class="sec-kpi-val">${loginFail}</div>
        <div class="sec-kpi-lbl">Échecs de connexion (7j)</div>
        <div class="sec-kpi-sub ${loginFail > 10 ? 'err' : loginFail > 3 ? 'warn' : 'ok'}">${loginFail === 0 ? '✅ Aucun échec' : loginFail > 10 ? '⚠️ Suspect' : 'Normal'}</div>
      </div>
    </div>

    <div class="sec-grid">
      <div class="sec-card">
        <div class="sec-card-hd"><span>🚨</span><h3>Alertes de sécurité récentes</h3></div>
        <div class="sec-card-body">${_renderAlerts(dash.recent_alerts || [])}</div>
      </div>
      <div class="sec-card">
        <div class="sec-card-hd"><span>📊</span><h3>Activité de connexion (7 jours)</h3></div>
        <div class="sec-card-body">
          <div style="display:flex;gap:16px;margin-bottom:14px;font-size:11px">
            <span><span style="display:inline-block;width:10px;height:10px;background:var(--color-ok);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Réussies</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:var(--color-err);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Échecs</span>
          </div>
          ${_renderActivity(dash.login_activity || [])}
        </div>
      </div>
    </div>

    <div class="sec-card" style="margin-bottom:20px">
      <div class="sec-card-hd"><span>📋</span><h3>Journal d'audit</h3></div>
      <div class="sec-card-body">
        <div class="sec-filters">
          <button class="sec-filter-btn active" data-filter="">Tout</button>
          <button class="sec-filter-btn" data-filter="ok">✅ Succès</button>
          <button class="sec-filter-btn" data-filter="fail">❌ Échecs</button>
        </div>
        <div style="overflow-x:auto">
          <table class="sec-table">
            <thead><tr><th>Action</th><th>Connecteur</th><th>IP</th><th>Détail</th><th>Date</th></tr></thead>
            <tbody id="sec-audit-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;

  const body = container.querySelector('#sec-audit-body');
  _loadAudit(body, null);

  container.querySelectorAll('.sec-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.sec-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _auditFilter = btn.dataset.filter || null;
      _loadAudit(body, _auditFilter === 'ok' ? 'ok' : _auditFilter === 'fail' ? 'fail' : null);
    });
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
};
