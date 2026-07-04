/**
 * AgentHub Platform — App: Sécurité & Audit
 * Onglet 1 : Tableau de bord sécurité  → GET /api/security/dashboard
 * Onglet 2 : Journal d'audit (timeline) → GET /api/audit
 */

const _CSS_ID = 'sec-css';

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
/* ── Reset & layout ─────────────────────────────────────────────────── */
.sec{padding:var(--sp-8);max-width:1140px;margin:0 auto;font-family:var(--font)}

/* ── Header ─────────────────────────────────────────────────────────── */
.sec-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px}
.sec-hd-left{display:flex;align-items:center;gap:14px}
.sec-hd-icon{width:42px;height:42px;border-radius:var(--r-lg);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.sec-hd-icon.red{background:#fee2e2;color:#b91c1c}
.sec-hd-icon.blue{background:#e0f2fe;color:#0369a1}
.sec-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.sec-sub{font-size:12px;color:var(--muted);margin:3px 0 0}

/* ── Onglets ─────────────────────────────────────────────────────────── */
.sec-tabs{display:flex;border-bottom:2px solid var(--border);margin-bottom:28px;gap:0}
.sec-tab{padding:10px 20px;font-size:13px;font-weight:500;color:var(--muted);border:none;background:none;cursor:pointer;
  border-bottom:2px solid transparent;margin-bottom:-2px;font-family:var(--font);display:flex;align-items:center;gap:6px;
  transition:color .15s}
.sec-tab.active{color:var(--text);font-weight:700;border-bottom-color:var(--primary)}
.sec-tab:hover:not(.active){color:var(--text-2)}

/* ── Score de sécurité ───────────────────────────────────────────────── */
.sec-score-strip{display:flex;align-items:center;gap:20px;background:var(--card);
  border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 24px;margin-bottom:22px}
.sec-score-ring{position:relative;width:72px;height:72px;flex-shrink:0}
.sec-score-ring svg{width:72px;height:72px;transform:rotate(-90deg)}
.sec-score-ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:18px;font-weight:800;color:var(--text)}
.sec-score-info h2{font-size:16px;font-weight:700;color:var(--text);margin:0 0 4px}
.sec-score-info p{font-size:12px;color:var(--muted);margin:0}
.sec-score-checks{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.sec-chk{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;
  border-radius:var(--r-pill)}
.sec-chk.ok{background:var(--color-ok-soft);color:var(--color-ok-text)}
.sec-chk.fail{background:#fee2e2;color:#991b1b}

/* ── KPI grid ───────────────────────────────────────────────────────── */
.sec-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px}
.sec-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.sec-kpi-icon{font-size:22px;margin-bottom:8px}
.sec-kpi-val{font-size:28px;font-weight:800;color:var(--text);line-height:1}
.sec-kpi-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:4px 0 0}
.sec-kpi-sub{font-size:12px;font-weight:600;margin-top:6px}
.sec-kpi-sub.ok{color:var(--color-ok-text)} .sec-kpi-sub.warn{color:var(--color-warn-text)} .sec-kpi-sub.err{color:#b91c1c}
.sec-mfa-bar{height:5px;background:var(--bg-2);border-radius:3px;margin-top:10px;overflow:hidden}
.sec-mfa-fill{height:100%;border-radius:3px;transition:width .5s ease}

/* ── Two-column grid ─────────────────────────────────────────────────── */
.sec-grid2{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}
.sec-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden}
.sec-card-hd{padding:12px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.sec-card-hd h3{font-size:12px;font-weight:700;color:var(--text);margin:0;flex:1}
.sec-card-body{padding:16px}

/* ── Alert rows (security tab) ───────────────────────────────────────── */
.sec-alert-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)}
.sec-alert-row:last-child{border-bottom:none}
.sec-sev{font-size:9px;font-weight:700;padding:2px 7px;border-radius:var(--r-pill);flex-shrink:0;text-transform:uppercase}
.sec-sev.critical{background:#fee2e2;color:#991b1b} .sec-sev.high{background:#ffedd5;color:#9a3412}
.sec-sev.medium{background:#fef9c3;color:#854d0e} .sec-sev.low{background:var(--color-ok-soft);color:var(--color-ok-text)}
.sec-alert-title{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px}
.sec-alert-detail{font-size:11px;color:var(--muted)}

/* ── Activity bars ───────────────────────────────────────────────────── */
.sec-act-row{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.sec-act-date{font-size:10px;color:var(--muted);width:56px;flex-shrink:0}
.sec-act-bars{flex:1;display:flex;gap:3px;height:22px;align-items:flex-end}
.sec-bar-ok{background:var(--color-ok);border-radius:2px 2px 0 0;min-width:4px}
.sec-bar-fail{background:#ef4444;border-radius:2px 2px 0 0;min-width:4px}
.sec-act-nums{font-size:10px;color:var(--muted);width:64px;text-align:right;flex-shrink:0}

/* ── Entra ID findings ───────────────────────────────────────────────── */
.sec-finding{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
.sec-finding:last-child{border-bottom:none}
.sec-finding-title{font-size:12px;font-weight:600;color:var(--text);margin-bottom:2px}
.sec-finding-desc{font-size:11px;color:var(--muted)}
.sec-finding-fix{font-size:10px;color:var(--primary);margin-top:3px;font-weight:600}

/* ════════════════════════════════════════════════════════════════════════
   JOURNAL D'AUDIT — visuel distinct (timeline, palette neutre)
   ════════════════════════════════════════════════════════════════════════ */
.aud{display:flex;flex-direction:column;gap:0}

/* Barre de recherche + filtres */
.aud-toolbar{display:flex;gap:10px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
.aud-search{display:flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--border);
  border-radius:var(--r-lg);padding:8px 14px;flex:1;min-width:200px}
.aud-search input{border:none;background:none;outline:none;font-family:var(--font);font-size:13px;
  color:var(--text);width:100%}
.aud-search input::placeholder{color:var(--muted)}
.aud-date-badge{font-size:11px;color:var(--muted);background:var(--bg-2);border:1px solid var(--border);
  border-radius:var(--r-pill);padding:5px 12px;white-space:nowrap}

/* Chips de filtre */
.aud-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.aud-chip{display:flex;align-items:center;gap:4px;padding:5px 12px;border:1px solid var(--border);
  border-radius:var(--r-pill);font-size:11px;font-weight:600;cursor:pointer;background:var(--bg);
  color:var(--muted);transition:all .15s;font-family:var(--font)}
.aud-chip.active{color:white;border-color:transparent}
.aud-chip[data-cat=""    ].active{background:var(--primary)}
.aud-chip[data-cat="auth"].active{background:#2563eb}
.aud-chip[data-cat="doc" ].active{background:#16a34a}
.aud-chip[data-cat="mbr" ].active{background:#7c3aed}
.aud-chip[data-cat="conn"].active{background:#d97706}
.aud-chip[data-cat="org" ].active{background:#0891b2}
.aud-chip[data-cat="fail"].active{background:#dc2626}
.aud-chip:hover:not(.active){background:var(--bg-2);color:var(--text-2)}

/* Timeline */
.aud-timeline{display:flex;flex-direction:column;gap:0;
  border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;background:var(--card)}
.aud-row{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:0;
  border-bottom:1px solid var(--border);min-height:52px}
.aud-row:last-child{border-bottom:none}
.aud-row:hover{background:var(--bg-2)}

/* Left stripe (catégorie couleur) */
.aud-stripe{width:4px;align-self:stretch;flex-shrink:0}
.aud-stripe.auth{background:#3b82f6} .aud-stripe.doc{background:#22c55e}
.aud-stripe.mbr{background:#a855f7} .aud-stripe.conn{background:#f59e0b}
.aud-stripe.org{background:#06b6d4} .aud-stripe.fail{background:#ef4444}
.aud-stripe.other{background:var(--border)}

/* Colonne principale */
.aud-main{padding:10px 14px;min-width:0}
.aud-action{display:flex;align-items:center;gap:7px;margin-bottom:3px}
.aud-action-icon{font-size:14px;flex-shrink:0}
.aud-action-label{font-size:13px;font-weight:600;color:var(--text)}
.aud-detail{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px}

/* Statut */
.aud-status{padding:10px 12px;text-align:center;flex-shrink:0}
.aud-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.aud-dot.ok{background:var(--color-ok)} .aud-dot.err{background:#ef4444}

/* IP */
.aud-ip{padding:10px 12px;font-size:11px;color:var(--muted);flex-shrink:0;min-width:110px;text-align:right;
  font-family:monospace}

/* Date */
.aud-date{padding:10px 16px 10px 8px;font-size:11px;color:var(--muted);flex-shrink:0;white-space:nowrap;text-align:right}

/* Empty state */
.aud-empty{padding:48px 24px;text-align:center;color:var(--muted);font-size:13px}
.aud-empty-icon{font-size:36px;margin-bottom:12px}

/* Load more */
.aud-more{display:flex;justify-content:center;margin-top:16px}
.aud-more-btn{padding:9px 24px;border:1px solid var(--border);border-radius:var(--r-pill);
  font-size:13px;font-weight:600;background:var(--card);color:var(--text-2);cursor:pointer;
  font-family:var(--font);transition:all .15s}
.aud-more-btn:hover{background:var(--bg-2);border-color:var(--primary);color:var(--primary)}
.aud-more-btn:disabled{opacity:.5;cursor:default}

/* Loader */
.sec-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:14px;padding:80px 0;color:var(--muted)}
.sec-spinner{width:34px;height:34px;border:3px solid var(--border);border-top-color:var(--primary);
  border-radius:50%;animation:secspin .7s linear infinite}
@keyframes secspin{to{transform:rotate(360deg)}}

/* Responsive */
@media(max-width:900px){.sec-grid2{grid-template-columns:1fr}.sec-kpis{grid-template-columns:repeat(2,1fr)}
  .aud-row{grid-template-columns:auto 1fr auto}}
@media(max-width:600px){.sec-kpis{grid-template-columns:1fr}.aud-ip{display:none}}
`;
  document.head.appendChild(s);
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function _h() {
  const t = localStorage.getItem('nexhire_token') || '';
  return t ? { Authorization: `Bearer ${t}` } : {};
}
async function _get(path) {
  const r = await fetch(path, { headers: _h(), credentials: 'include' });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function _fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)    return 'à l\'instant';
    if (diff < 3600)  return `il y a ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff/3600)} h`;
    return d.toLocaleDateString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function _fmtDateShort(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

/* ── Traductions ─────────────────────────────────────────────────────── */

const _ACTION_META = {
  auth_login:           { label: 'Connexion',              icon: '🔑', cat: 'auth' },
  auth_logout:          { label: 'Déconnexion',            icon: '🚪', cat: 'auth' },
  auth_signup:          { label: 'Inscription',            icon: '✨', cat: 'auth' },
  auth_password_reset:  { label: 'Réinit. mot de passe',  icon: '🔒', cat: 'auth' },
  connector_connect:    { label: 'Connecteur ajouté',      icon: '🔗', cat: 'conn' },
  connector_disconnect: { label: 'Connecteur retiré',      icon: '🔌', cat: 'conn' },
  document_upload:      { label: 'Document ajouté',        icon: '📄', cat: 'doc'  },
  document_summary:     { label: 'Résumé document',        icon: '📝', cat: 'doc'  },
  document_chat:        { label: 'Chat document',          icon: '💬', cat: 'doc'  },
  member_invite:        { label: 'Invitation envoyée',     icon: '📨', cat: 'mbr'  },
  member_role_change:   { label: 'Rôle modifié',           icon: '👤', cat: 'mbr'  },
  member_deactivate:    { label: 'Membre désactivé',       icon: '🚫', cat: 'mbr'  },
  org_update:           { label: 'Organisation mise à jour', icon: '🏢', cat: 'org' },
  report_export:        { label: 'Rapport exporté',        icon: '📊', cat: 'org'  },
  agent_query:          { label: 'Requête ATLAS',          icon: '🤖', cat: 'org'  },
  settings_update:      { label: 'Paramètres modifiés',   icon: '⚙️', cat: 'org'  },
};

function _actionMeta(action, success) {
  if (!success) return { label: (_ACTION_META[action]?.label || action?.replace(/_/g,' ') || '—'), icon: '⚠️', cat: 'fail' };
  return _ACTION_META[action] || { label: action?.replace(/_/g,' ') || '—', icon: '🔹', cat: 'other' };
}

function _severityFr(s) { return { critical:'Critique', high:'Élevé', medium:'Moyen', low:'Faible' }[s] || s; }
function _alertTypeFr(t) {
  return { brute_force:'Force brute', mfa_bypass:'Bypass MFA', impossible_travel:'Voyage impossible',
           new_device:'Nouvel appareil', privileged_access:'Accès privilégié', data_exfiltration:'Exfiltration' }[t]
         || t?.replace(/_/g,' ') || '—';
}
function _findingTypeFr(t) {
  return { admin_no_mfa:'Admin sans MFA', privileged_inactive:'Compte privilégié inactif',
           user_no_mfa:'Utilisateur sans MFA', group_no_owner:'Groupe sans propriétaire',
           service_account_risk:'Service account à risque' }[t] || t?.replace(/_/g,' ') || t;
}

/* ══════════════════════════════════════════════════════════════════════════
   ONGLET 1 — TABLEAU DE BORD SÉCURITÉ
   ══════════════════════════════════════════════════════════════════════════ */

function _scoreColor(n) { return n >= 80 ? '#16a34a' : n >= 50 ? '#d97706' : '#dc2626'; }
function _scoreLabel(n) { return n >= 80 ? 'Bonne posture' : n >= 50 ? 'À améliorer' : 'Risque élevé'; }

function _renderChecklist(checklist) {
  const items = {
    mfa_partiel:       'MFA activé (partiel)',
    mfa_complet:       'MFA ≥ 80 % des utilisateurs',
    mfa_requis_org:    'MFA obligatoire (org)',
    alertes_critiques: 'Aucune alerte critique',
    entra_admin_mfa:   'Admins Entra ID avec MFA',
    conformite_loi25:  'Conformité Loi 25',
  };
  return Object.entries(items).map(([k, label]) => {
    const ok = checklist?.[k];
    return `<span class="sec-chk ${ok ? 'ok' : 'fail'}">${ok ? '✅' : '❌'} ${label}</span>`;
  }).join('');
}

function _renderAlerts(alerts) {
  if (!alerts.length) return `<div style="text-align:center;color:var(--muted);font-size:13px;padding:28px 0">✅ Aucune alerte de sécurité active</div>`;
  return alerts.map(a => `
    <div class="sec-alert-row">
      <span class="sec-sev ${a.severity||'medium'}">${_severityFr(a.severity)}</span>
      <div style="flex:1;min-width:0">
        <div class="sec-alert-title">${_alertTypeFr(a.alert_type)}</div>
        <div class="sec-alert-detail">${a.details||''} ${a.ip_address?`· IP ${a.ip_address}`:''}</div>
      </div>
      <div style="font-size:10px;color:var(--muted);white-space:nowrap;padding-left:8px">${_fmtDate(a.created_at)}</div>
    </div>`).join('');
}

function _renderActivity(activity) {
  if (!activity.length) return `<div style="text-align:center;color:var(--muted);font-size:12px;padding:20px 0">Aucune donnée (7 derniers jours)</div>`;
  const maxVal = Math.max(...activity.flatMap(r => [r.succes||0, r.echecs||0]), 1);
  return activity.slice(0,7).reverse().map(r => {
    const hOk   = Math.max(2, Math.round(((r.succes||0) / maxVal) * 36));
    const hFail = Math.max(2, Math.round(((r.echecs||0) / maxVal) * 36));
    return `<div class="sec-act-row">
      <span class="sec-act-date">${_fmtDateShort(r.jour)}</span>
      <div class="sec-act-bars">
        <div class="sec-bar-ok" style="height:${hOk}px;width:14px" title="${r.succes} connexions réussies"></div>
        ${(r.echecs||0)>0?`<div class="sec-bar-fail" style="height:${hFail}px;width:14px" title="${r.echecs} échecs"></div>`:''}
      </div>
      <span class="sec-act-nums" style="font-size:10px;color:var(--muted)">✅ ${r.succes||0} · ❌ ${r.echecs||0}</span>
    </div>`;
  }).join('');
}

function _renderEntraFindings(findings) {
  if (!findings.length) return `<div style="text-align:center;color:var(--muted);font-size:12px;padding:20px 0">✅ Aucune anomalie Entra ID détectée</div>`;
  return findings.slice(0,5).map(f => `
    <div class="sec-finding">
      <span class="sec-sev ${f.severity}">${_severityFr(f.severity)}</span>
      <div style="flex:1">
        <div class="sec-finding-title">${_findingTypeFr(f.finding_type)}</div>
        <div class="sec-finding-desc">${f.description||''}</div>
        ${f.remediation?`<div class="sec-finding-fix">→ ${f.remediation}</div>`:''}
      </div>
    </div>`).join('');
}

function _renderIPs(ips) {
  if (!ips.length) return `<div style="text-align:center;color:var(--muted);font-size:12px;padding:12px 0">Aucune connexion récente</div>`;
  return ips.slice(0,6).map(ip => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-family:monospace;font-size:11px;color:var(--text)">${ip.ip}</span>
      <div style="text-align:right">
        <div style="font-size:11px;font-weight:600;color:var(--text)">${ip.connexions} connexion${ip.connexions>1?'s':''}</div>
        <div style="font-size:10px;color:var(--muted)">${_fmtDate(ip.derniere_vue)}</div>
      </div>
    </div>`).join('');
}

async function _renderSecurity(panel) {
  panel.innerHTML = `<div class="sec-loader"><div class="sec-spinner"></div><span>Chargement des données de sécurité…</span></div>`;
  let dash = {};
  try { dash = await _get('/api/security/dashboard'); } catch {}

  const mfa       = dash.mfa || {};
  const alertes   = dash.alertes || {};
  const entra     = dash.entra_id || {};
  const conform   = dash.conformite || {};
  const loginAct  = dash.activite_login || [];
  const ipsRec    = dash.ips_recentes || [];
  const checklist = dash.checklist || {};

  const score     = dash.score_securite || 0;
  const total     = mfa.utilisateurs_total || 0;
  const actifs    = mfa.mfa_actif || 0;
  const pct       = mfa.pourcentage || 0;
  const alertCnt  = alertes.non_acquittees_total || 0;
  const critHigh  = alertes.critiques_hautes || 0;
  const deletes   = conform.suppressions_en_attente || 0;

  const mfaCls    = pct>=90?'ok':pct>=60?'warn':'err';
  const alertCls  = alertCnt===0?'ok':critHigh>0?'err':'warn';

  // Score ring SVG
  const r=30, circ=2*Math.PI*r;
  const dash_len = (score/100)*circ;
  const col = _scoreColor(score);

  panel.innerHTML = `
    <!-- Score global -->
    <div class="sec-score-strip">
      <div class="sec-score-ring">
        <svg viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="${r}" fill="none" stroke="var(--border)" stroke-width="6"/>
          <circle cx="36" cy="36" r="${r}" fill="none" stroke="${col}" stroke-width="6"
            stroke-dasharray="${dash_len} ${circ}" stroke-linecap="round"/>
        </svg>
        <div class="sec-score-ring-num" style="color:${col}">${score}</div>
      </div>
      <div class="sec-score-info" style="flex:1">
        <h2>Score de sécurité — <span style="color:${col}">${_scoreLabel(score)}</span></h2>
        <p>Évaluation automatique de la posture de sécurité de votre organisation.</p>
        <div class="sec-score-checks">${_renderChecklist(checklist)}</div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="sec-kpis">
      <div class="sec-kpi">
        <div class="sec-kpi-icon">🛡️</div>
        <div class="sec-kpi-val">${pct}<span style="font-size:14px;color:var(--muted);font-weight:400">%</span></div>
        <div class="sec-kpi-lbl">Couverture MFA</div>
        <div class="sec-kpi-sub ${mfaCls}">${actifs} / ${total} utilisateurs</div>
        <div class="sec-mfa-bar"><div class="sec-mfa-fill" style="width:${pct}%;background:${pct>=90?'var(--color-ok)':pct>=60?'var(--color-warn)':'#ef4444'}"></div></div>
      </div>
      <div class="sec-kpi">
        <div class="sec-kpi-icon">🚨</div>
        <div class="sec-kpi-val">${alertCnt}</div>
        <div class="sec-kpi-lbl">Alertes actives</div>
        <div class="sec-kpi-sub ${alertCls}">${alertCnt===0?'✅ Aucune alerte':critHigh>0?`${critHigh} critiques/élevées`:'En cours d\'analyse'}</div>
      </div>
      <div class="sec-kpi">
        <div class="sec-kpi-icon">🔷</div>
        <div class="sec-kpi-val">${entra.total||0}</div>
        <div class="sec-kpi-lbl">Anomalies Entra ID</div>
        <div class="sec-kpi-sub ${entra.critical>0?'err':entra.high>0?'warn':'ok'}">${entra.critical||0} critiques · ${entra.high||0} élevées</div>
      </div>
      <div class="sec-kpi">
        <div class="sec-kpi-icon">⚖️</div>
        <div class="sec-kpi-val">${deletes}</div>
        <div class="sec-kpi-lbl">Suppressions en attente</div>
        <div class="sec-kpi-sub ${deletes===0?'ok':'warn'}">${deletes===0?'✅ Conformité Loi 25':'⚠️ À traiter'}</div>
      </div>
    </div>

    <!-- Grilles -->
    <div class="sec-grid2">
      <div class="sec-card">
        <div class="sec-card-hd"><span>🚨</span><h3>Alertes de sécurité</h3><span style="font-size:10px;color:var(--muted)">${alertCnt} non acquittées</span></div>
        <div class="sec-card-body">${_renderAlerts(alertes.recentes||[])}</div>
      </div>
      <div class="sec-card">
        <div class="sec-card-hd"><span>📊</span><h3>Activité de connexion</h3><span style="font-size:10px;color:var(--muted)">7 derniers jours</span></div>
        <div class="sec-card-body">
          <div style="display:flex;gap:14px;margin-bottom:12px;font-size:10px;color:var(--muted)">
            <span><span style="display:inline-block;width:10px;height:10px;background:var(--color-ok);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Réussies</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:2px;margin-right:4px;vertical-align:middle"></span>Échecs</span>
          </div>
          ${_renderActivity(loginAct)}
        </div>
      </div>
    </div>
    <div class="sec-grid2">
      <div class="sec-card">
        <div class="sec-card-hd"><span>🔷</span><h3>Anomalies Entra ID</h3><span style="font-size:10px;color:var(--muted)">${entra.total||0} trouvées</span></div>
        <div class="sec-card-body">${_renderEntraFindings(entra.findings||[])}</div>
      </div>
      <div class="sec-card">
        <div class="sec-card-hd"><span>🌐</span><h3>Adresses IP récentes</h3><span style="font-size:10px;color:var(--muted)">7 derniers jours</span></div>
        <div class="sec-card-body">${_renderIPs(ipsRec)}
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
            <div style="font-size:11px;color:var(--muted)">Lois couvertes :</div>
            <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
              ${(conform.lois_couvertes||[]).map(l=>`<span style="font-size:10px;font-weight:600;padding:2px 8px;background:var(--color-ok-soft);color:var(--color-ok-text);border-radius:var(--r-pill)">✅ ${l}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   ONGLET 2 — JOURNAL D'AUDIT (timeline)
   ══════════════════════════════════════════════════════════════════════════ */

const _CAT_FILTERS = [
  { cat: '',     label: 'Tout',        icon: '☰' },
  { cat: 'auth', label: 'Connexions',  icon: '🔑' },
  { cat: 'doc',  label: 'Documents',   icon: '📄' },
  { cat: 'mbr',  label: 'Membres',     icon: '👥' },
  { cat: 'conn', label: 'Connecteurs', icon: '🔗' },
  { cat: 'org',  label: 'Organisation',icon: '🏢' },
  { cat: 'fail', label: 'Échecs seul.', icon: '❌' },
];

const _CAT_ACTIONS = {
  auth: ['auth_login','auth_logout','auth_signup','auth_password_reset'],
  doc:  ['document_upload','document_summary','document_chat'],
  mbr:  ['member_invite','member_role_change','member_deactivate'],
  conn: ['connector_connect','connector_disconnect'],
  org:  ['org_update','report_export','agent_query','settings_update'],
};

let _audState = { cat: '', search: '', offset: 0, items: [], total: 0, loading: false };

function _audParams() {
  const p = new URLSearchParams({ limit: 25, offset: _audState.offset });
  if (_audState.cat === 'fail') {
    p.set('success', 'false');
  } else if (_audState.cat && _CAT_ACTIONS[_audState.cat]) {
    // On filtre côté client par catégorie car l'API filtre par action unique
    // On charge sans filtre action et on filtre après
  }
  return p;
}

function _renderAuditRows(items) {
  if (!items.length) return `<div class="aud-empty"><div class="aud-empty-icon">🗒️</div><div>Aucun événement trouvé</div><div style="font-size:12px;margin-top:4px">Essayez un autre filtre ou élargissez la période.</div></div>`;
  return items.map(l => {
    const meta = _actionMeta(l.action, l.success);
    return `<div class="aud-row">
      <div class="aud-stripe ${meta.cat}"></div>
      <div class="aud-main">
        <div class="aud-action">
          <span class="aud-action-icon">${meta.icon}</span>
          <span class="aud-action-label">${meta.label}</span>
          ${l.connector ? `<span style="font-size:10px;background:var(--bg-2);color:var(--muted);padding:1px 7px;border-radius:var(--r-pill)">${l.connector}</span>` : ''}
        </div>
        <div class="aud-detail" title="${l.query||''}">
          ${l.error_detail ? `<span style="color:#dc2626">${l.error_detail}</span>` : (l.query || (l.success ? 'Succès' : 'Échec'))}
        </div>
      </div>
      <div class="aud-status"><span class="aud-dot ${l.success?'ok':'err'}" title="${l.success?'Succès':'Échec'}"></span></div>
      <div class="aud-ip">${l.ip_address||'—'}</div>
      <div class="aud-date" title="${l.created_at||''}">${_fmtDate(l.created_at)}</div>
    </div>`;
  }).join('');
}

async function _loadAudit(panel, append = false) {
  if (_audState.loading) return;
  _audState.loading = true;

  const timeline = panel.querySelector('#aud-timeline');
  const moreBtn  = panel.querySelector('#aud-more-btn');
  if (moreBtn) moreBtn.disabled = true;

  try {
    const p = new URLSearchParams({ limit: 25, offset: _audState.offset });
    if (_audState.cat === 'fail') p.set('success', 'false');
    const data = await _get(`/api/audit?${p}`);
    let items = data.items || data.logs || [];

    // Filtrage catégorie côté client
    if (_audState.cat && _audState.cat !== 'fail' && _CAT_ACTIONS[_audState.cat]) {
      items = items.filter(l => _CAT_ACTIONS[_audState.cat].includes(l.action));
    }

    // Filtrage search côté client
    if (_audState.search) {
      const q = _audState.search.toLowerCase();
      items = items.filter(l =>
        (l.action||'').toLowerCase().includes(q) ||
        (l.query||'').toLowerCase().includes(q) ||
        (l.connector||'').toLowerCase().includes(q) ||
        (l.ip_address||'').toLowerCase().includes(q)
      );
    }

    if (append) {
      _audState.items.push(...items);
    } else {
      _audState.items = items;
    }
    _audState.total = data.total || _audState.items.length;

    if (timeline) timeline.innerHTML = _renderAuditRows(_audState.items);

    const hasMore = (_audState.offset + 25) < _audState.total;
    const moreB   = panel.querySelector('#aud-more-btn');
    if (moreB) {
      moreB.style.display = hasMore ? '' : 'none';
      moreB.disabled = false;
      moreB.textContent = `Charger plus (${_audState.total - _audState.items.length} restants)`;
    }
  } catch (e) {
    if (timeline) timeline.innerHTML = `<div class="aud-empty"><div class="aud-empty-icon">⚠️</div><div>Erreur de chargement</div></div>`;
  } finally {
    _audState.loading = false;
  }
}

function _renderAuditPanel() {
  return `
    <!-- Toolbar -->
    <div class="aud-toolbar">
      <div class="aud-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted);flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="aud-search-input" type="text" placeholder="Rechercher dans les événements…" value="${_audState.search}">
      </div>
      <span class="aud-date-badge">📅 30 derniers jours</span>
    </div>

    <!-- Filtres catégorie -->
    <div class="aud-chips">
      ${_CAT_FILTERS.map(f => `<button class="aud-chip${_audState.cat===f.cat?' active':''}" data-cat="${f.cat}">${f.icon} ${f.label}</button>`).join('')}
    </div>

    <!-- Timeline -->
    <div class="aud-timeline" id="aud-timeline">
      <div class="aud-empty"><div class="aud-empty-icon">⏳</div><div>Chargement…</div></div>
    </div>

    <!-- Load more -->
    <div class="aud-more">
      <button id="aud-more-btn" class="aud-more-btn" style="display:none">Charger plus</button>
    </div>`;
}

async function _renderAudit(panel) {
  _audState = { cat: '', search: '', offset: 0, items: [], total: 0, loading: false };
  panel.innerHTML = _renderAuditPanel();
  await _loadAudit(panel);

  // Filtres chips
  panel.querySelectorAll('.aud-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      panel.querySelectorAll('.aud-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _audState.cat    = btn.dataset.cat;
      _audState.offset = 0;
      await _loadAudit(panel);
    });
  });

  // Search
  let _searchTimer;
  panel.querySelector('#aud-search-input')?.addEventListener('input', e => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(async () => {
      _audState.search = e.target.value.trim();
      _audState.offset = 0;
      await _loadAudit(panel);
    }, 300);
  });

  // Load more
  panel.querySelector('#aud-more-btn')?.addEventListener('click', async () => {
    _audState.offset += 25;
    await _loadAudit(panel, true);
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   SHELL — Onglets + header
   ══════════════════════════════════════════════════════════════════════════ */

let _activeTab = 'security';
let _root = null;

function _switchTab(tab) {
  _activeTab = tab;
  _root?.querySelectorAll('.sec-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const panel = _root?.querySelector('#sec-panel');
  if (!panel) return;
  if (tab === 'security') {
    _renderSecurity(panel);
  } else {
    _renderAudit(panel);
  }
}

export default {
  mount(container) {
    _css();
    _root = container;
    _activeTab = 'security';

    container.innerHTML = `<div class="sec">
      <!-- Header -->
      <div class="sec-hd">
        <div class="sec-hd-left">
          <div class="sec-hd-icon ${_activeTab==='security'?'red':'blue'}">🔐</div>
          <div>
            <h1 class="sec-title">Sécurité &amp; Audit</h1>
            <p class="sec-sub">Supervision de la sécurité et traçabilité des événements</p>
          </div>
        </div>
      </div>

      <!-- Onglets -->
      <div class="sec-tabs">
        <button class="sec-tab active" data-tab="security">🛡️ Tableau de sécurité</button>
        <button class="sec-tab" data-tab="audit">📋 Journal d'audit</button>
      </div>

      <!-- Panel dynamique -->
      <div id="sec-panel"></div>
    </div>`;

    container.querySelectorAll('.sec-tab').forEach(btn => {
      btn.addEventListener('click', () => _switchTab(btn.dataset.tab));
    });

    _renderSecurity(container.querySelector('#sec-panel'));
  },
  unmount(container) {
    _root = null;
    container.innerHTML = '';
  },
  refresh(ctx) { if (_root) { const p = _root.querySelector('#sec-panel'); if (p) _renderSecurity(p); } },
};
