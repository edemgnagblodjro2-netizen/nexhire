/**
 * AgentHub Platform — Recommandations IA
 * Plan d'action personnalisé basé sur le diagnostic IMAI + ATLAS.
 * API: GET /api/diagnostic/rapport  GET /api/agent/recommendations
 */

const _CSS_ID = 'reco-css';
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

function _css() {
  if (document.getElementById(_CSS_ID)) return;
  const s = document.createElement('style');
  s.id = _CSS_ID;
  s.textContent = `
.reco{padding:28px 32px;max-width:1100px;margin:0 auto;font-family:var(--font);animation:ds-fade-in .25s ease}
.reco-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:12px}
.reco-hd-left{display:flex;align-items:center;gap:14px}
.reco-logo{width:42px;height:42px;border-radius:var(--r-lg);background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;flex-shrink:0}
.reco-title{font-size:20px;font-weight:800;color:var(--text);margin:0}
.reco-sub{font-size:13px;color:var(--muted);margin:2px 0 0}

/* Score banner */
.reco-score-banner{background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%);border-radius:var(--r-xl);padding:28px 32px;margin-bottom:28px;display:flex;align-items:center;gap:32px;position:relative;overflow:hidden}
.reco-score-banner::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");pointer-events:none}
.reco-score-ring{width:90px;height:90px;flex-shrink:0;position:relative}
.reco-score-ring svg{transform:rotate(-90deg)}
.reco-score-val{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.reco-score-num{font-size:24px;font-weight:800;color:#fff;line-height:1}
.reco-score-max{font-size:10px;color:rgba(255,255,255,.5);margin-top:1px}
.reco-score-body{flex:1}
.reco-score-label{font-size:13px;font-weight:600;color:rgba(255,255,255,.6);letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px}
.reco-score-title{font-size:22px;font-weight:800;color:#fff;margin:0 0 8px}
.reco-score-desc{font-size:13px;color:rgba(255,255,255,.75);margin:0;line-height:1.5;max-width:440px}
.reco-score-actions{display:flex;gap:10px;margin-top:16px}
.reco-score-btn{padding:8px 20px;border-radius:var(--r);font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit}
.reco-score-btn-primary{background:#fff;color:#312e81}
.reco-score-btn-primary:hover{background:#e8e8ff}
.reco-score-btn-ghost{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2)}
.reco-score-btn-ghost:hover{background:rgba(255,255,255,.2)}

/* KPIs */
.reco-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
.reco-kpi{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px}
.reco-kpi-icon{font-size:20px;margin-bottom:8px}
.reco-kpi-val{font-size:22px;font-weight:800;color:var(--text);line-height:1}
.reco-kpi-lbl{font-size:11px;color:var(--muted);margin:4px 0 0;font-weight:500;text-transform:uppercase;letter-spacing:.04em}

/* Tabs */
.reco-tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:24px}
.reco-tab{background:none;border:none;border-bottom:2px solid transparent;padding:10px 18px;font-size:13px;font-weight:600;color:var(--text-sub);cursor:pointer;font-family:inherit;transition:color .15s;margin-bottom:-1px;white-space:nowrap}
.reco-tab:hover:not(.active){color:var(--text-2)}
.reco-tab.active{color:var(--primary);border-bottom-color:var(--primary)}

/* Section */
.reco-section-label{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}

/* Recommendation cards */
.reco-list{display:flex;flex-direction:column;gap:10px;margin-bottom:28px}
.reco-item{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 20px;display:flex;align-items:center;gap:16px;transition:box-shadow .15s,border-color .15s;cursor:pointer}
.reco-item:hover{box-shadow:var(--shadow);border-color:var(--primary)}
.reco-item-pri{border-left:3px solid var(--primary)}
.reco-item-warn{border-left:3px solid #f59e0b}
.reco-item-ok{border-left:3px solid #22c55e}
.reco-item-icon{font-size:26px;flex-shrink:0;width:44px;height:44px;border-radius:var(--r-lg);background:var(--bg-2);display:flex;align-items:center;justify-content:center}
.reco-item-body{flex:1;min-width:0}
.reco-item-title{font-size:14px;font-weight:700;color:var(--text);margin:0 0 3px}
.reco-item-desc{font-size:12px;color:var(--muted);margin:0;line-height:1.4}
.reco-item-meta{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap}
.reco-chip{font-size:10px;font-weight:700;padding:2px 8px;border-radius:var(--r-pill);letter-spacing:.04em;text-transform:uppercase}
.reco-chip-high{background:#ede9fe;color:#5b21b6}
.reco-chip-med{background:#fef3c7;color:#92400e}
.reco-chip-low{background:#dcfce7;color:#15803d}
.reco-chip-effort{background:var(--bg-2);color:var(--muted)}
.reco-item-action{flex-shrink:0}
.reco-item-btn{padding:6px 16px;border-radius:var(--r);font-size:12px;font-weight:600;background:var(--primary);color:#fff;border:none;cursor:pointer;font-family:inherit;white-space:nowrap}
.reco-item-btn:hover{opacity:.85}
.reco-item-btn-outline{background:var(--card);color:var(--text-2);border:1px solid var(--border)}
.reco-item-btn-outline:hover{border-color:var(--primary);color:var(--primary)}

/* Atlas panel */
.reco-atlas{background:linear-gradient(135deg,var(--primary-lt),#fff);border:1px solid var(--primary-a20);border-radius:var(--r-xl);padding:20px 24px;margin-bottom:28px}
.reco-atlas-hd{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.reco-atlas-icon{font-size:24px}
.reco-atlas-title{font-size:14px;font-weight:700;color:var(--text)}
.reco-atlas-sub{font-size:12px;color:var(--muted);margin:1px 0 0}
.reco-atlas-list{display:flex;flex-direction:column;gap:8px}
.reco-atlas-item{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--text-body);line-height:1.45}
.reco-atlas-dot{width:6px;height:6px;border-radius:50%;background:var(--primary);margin-top:5px;flex-shrink:0}

/* Plan d'action */
.reco-plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
.reco-plan-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px;display:flex;flex-direction:column;gap:10px}
.reco-plan-card-hd{display:flex;align-items:center;gap:10px}
.reco-plan-card-icon{font-size:22px;width:40px;height:40px;border-radius:var(--r-md);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.reco-plan-card-icon-a{background:#ede9fe}
.reco-plan-card-icon-b{background:#fef3c7}
.reco-plan-card-icon-c{background:#dcfce7}
.reco-plan-card-title{font-size:13px;font-weight:700;color:var(--text)}
.reco-plan-card-sub{font-size:11px;color:var(--muted);margin:1px 0 0}
.reco-plan-items{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}
.reco-plan-item{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-body);padding:6px 0;border-bottom:1px solid var(--border-2)}
.reco-plan-item:last-child{border-bottom:none}
.reco-plan-check{width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border);flex-shrink:0}
.reco-plan-check.done{background:var(--color-ok);border-color:var(--color-ok);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px}

/* Progress bar */
.reco-progress-wrap{margin-bottom:28px}
.reco-progress-card{background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px 24px}
.reco-progress-hd{display:flex;justify-content:space-between;margin-bottom:16px;align-items:center}
.reco-progress-title{font-size:14px;font-weight:700;color:var(--text)}
.reco-progress-pct{font-size:18px;font-weight:800;color:var(--primary)}
.reco-progress-bar-track{height:8px;background:var(--bg-2);border-radius:99px;overflow:hidden;margin-bottom:16px}
.reco-progress-bar-fill{height:100%;border-radius:99px;background:var(--primary);transition:width .6s ease}
.reco-progress-cats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.reco-progress-cat{display:flex;flex-direction:column;gap:5px}
.reco-progress-cat-lbl{font-size:11px;font-weight:600;color:var(--text-2)}
.reco-progress-cat-bar{height:5px;background:var(--bg-2);border-radius:99px;overflow:hidden}
.reco-progress-cat-fill{height:100%;border-radius:99px;background:var(--primary)}
.reco-progress-cat-val{font-size:10px;color:var(--muted);text-align:right}

/* Empty */
.reco-empty{text-align:center;padding:60px 20px}
.reco-empty-icon{font-size:52px;margin-bottom:14px}
.reco-empty-title{font-size:18px;font-weight:700;color:var(--text);margin:0 0 8px}
.reco-empty-desc{font-size:14px;color:var(--muted);max-width:380px;margin:0 auto 24px;line-height:1.6}
.reco-empty-btn{padding:10px 24px;border-radius:var(--r);font-size:14px;font-weight:600;background:var(--primary);color:#fff;border:none;cursor:pointer;font-family:inherit}
.reco-empty-btn:hover{opacity:.85}

@media(max-width:768px){
  .reco{padding:16px}
  .reco-kpis{grid-template-columns:repeat(2,1fr)}
  .reco-plan-grid{grid-template-columns:1fr}
  .reco-score-banner{flex-direction:column;gap:20px}
  .reco-score-ring{width:70px;height:70px}
}
`;
  document.head.appendChild(s);
}

let _st = null;

// Données chargées depuis l'API — plus aucune donnée statique
let _apiRecs  = null; // /api/optimization/recommendations
let _apiScore = null; // /api/optimization/efficiency-score

function _priorityChip(p) {
  const map = { high: ['reco-chip-high', 'Priorité haute'], medium: ['reco-chip-med', 'Priorité moyenne'], low: ['reco-chip-low', 'Priorité faible'] };
  const [cls, label] = map[p] || map.low;
  return `<span class="reco-chip ${cls}">${label}</span>`;
}

function _impactToPriority(impact) {
  return impact === 'high' ? 'high' : impact === 'medium' ? 'medium' : 'low';
}

function _impactIcon(impact) {
  return impact === 'high' ? '⚡' : impact === 'medium' ? '📊' : '💡';
}

function _renderRecos(container, filter) {
  if (!_apiRecs) {
    container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted)">Chargement des recommandations…</div>';
    return;
  }

  const all = _apiRecs.recommendations || [];
  if (all.length === 0) {
    container.innerHTML = `
<div class="reco-empty">
  <div class="reco-empty-icon">✅</div>
  <div class="reco-empty-title">Aucune recommandation</div>
  <div class="reco-empty-desc">Votre organisation ne présente pas de lacune détectable avec les données actuelles. Connectez vos outils et actifs pour obtenir des recommandations personnalisées.</div>
</div>`;
    return;
  }

  const high = all.filter(r => r.impact === 'high').length;
  const med  = all.filter(r => r.impact === 'medium').length;
  const low  = all.filter(r => r.impact === 'low').length;
  const items = filter === 'all' ? all : all.filter(r => r.impact === filter);
  const totalSavings = _apiRecs.total_savings || 0;

  container.innerHTML = `
${totalSavings > 0 ? `
<div class="reco-atlas" style="margin-bottom:24px">
  <div class="reco-atlas-hd">
    <span class="reco-atlas-icon">🤖</span>
    <div>
      <div class="reco-atlas-title">ATLAS a détecté ${all.length} opportunités</div>
      <div class="reco-atlas-sub">Économies potentielles identifiées : <strong>${Number(totalSavings).toLocaleString('fr-CA')} $/an</strong></div>
    </div>
  </div>
</div>` : ''}

<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
  <div class="reco-section-label">${items.length} recommandation(s)</div>
  <div style="display:flex;gap:6px">
    ${[['all',`Toutes (${all.length})`],['high',`Haute (${high})`],['medium',`Moyenne (${med})`],['low',`Faible (${low})`]].map(([f,lbl]) =>
      `<button class="reco-tab" style="border-bottom:2px solid ${f===filter?'var(--primary)':'transparent'};color:${f===filter?'var(--primary)':'var(--muted)'};padding:6px 12px;font-size:12px" onclick="window._recoFilter('${f}')">${lbl}</button>`
    ).join('')}
  </div>
</div>
<div class="reco-list">
  ${items.length === 0
    ? '<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">Aucune recommandation dans cette catégorie.</div>'
    : items.map(r => `
  <div class="reco-item reco-item-${r.impact === 'high' ? 'pri' : r.impact === 'medium' ? 'warn' : 'ok'}">
    <div class="reco-item-icon">${_impactIcon(r.impact)}</div>
    <div class="reco-item-body">
      <div class="reco-item-title">${r.action}</div>
      ${r.savings > 0 ? `<div class="reco-item-desc">Économies estimées : <strong>${Number(r.savings).toLocaleString('fr-CA')} $/an</strong></div>` : ''}
      <div class="reco-item-meta">
        ${_priorityChip(_impactToPriority(r.impact))}
        ${r.timeline ? `<span class="reco-chip reco-chip-effort">⏱ ${r.timeline}</span>` : ''}
      </div>
    </div>
    <div class="reco-item-action">
      <button class="reco-item-btn" onclick="window._recoNav('${r.nav_tab||''}')">Voir →</button>
    </div>
  </div>`).join('')}
</div>`;

  window._recoFilter = (f) => { _st.filter = f; _renderRecos(container, f); };
  window._recoNav = (tab) => {
    if (!tab) return;
    const navMap = { licenses: 'assets', duplicates: 'assets', contracts: 'contracts', processes: 'automation', dashboard: 'executive' };
    const slug = navMap[tab] || tab;
    document.dispatchEvent(new CustomEvent('ws:navigate', { detail: { appSlug: slug } }));
  };
}

function _renderPlan(container) {
  if (!_apiScore) {
    container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted)">Chargement…</div>';
    return;
  }

  const s = _apiScore;
  const cats = [
    ['Logiciels',       s.software,        '#7c3aed'],
    ['Licences',        s.licenses,        '#0ea5e9'],
    ['Infrastructure',  s.infrastructure,  '#10b981'],
    ['Processus',       s.process,         '#f59e0b'],
  ];

  container.innerHTML = `
<div class="reco-progress-wrap">
  <div class="reco-progress-card">
    <div class="reco-progress-hd">
      <div class="reco-progress-title">Score d'efficacité organisationnelle</div>
      <div class="reco-progress-pct">${Math.round(s.overall)}%</div>
    </div>
    <div class="reco-progress-bar-track"><div class="reco-progress-bar-fill" style="width:${Math.round(s.overall)}%"></div></div>
    <div class="reco-progress-cats">
      ${cats.map(([l, v, c]) => `
      <div class="reco-progress-cat">
        <div class="reco-progress-cat-lbl">${l}</div>
        <div class="reco-progress-cat-bar"><div class="reco-progress-cat-fill" style="width:${Math.round(v)}%;background:${c}"></div></div>
        <div class="reco-progress-cat-val">${Math.round(v)}%</div>
      </div>`).join('')}
    </div>
  </div>
</div>

${_apiRecs && (_apiRecs.recommendations||[]).length > 0 ? `
<div class="reco-section-label" style="margin-bottom:14px">Plan d'action prioritaire</div>
<div class="reco-plan-grid">
  <div class="reco-plan-card">
    <div class="reco-plan-card-hd">
      <div class="reco-plan-card-icon reco-plan-card-icon-a">⚡</div>
      <div>
        <div class="reco-plan-card-title">Actions immédiates</div>
        <div class="reco-plan-card-sub">Impact élevé</div>
      </div>
    </div>
    <ul class="reco-plan-items">
      ${(_apiRecs.recommendations||[]).filter(r=>r.impact==='high').slice(0,4).map(r=>`
      <li class="reco-plan-item">
        <div class="reco-plan-check"></div>
        <span>${r.action}</span>
      </li>`).join('') || '<li class="reco-plan-item"><div class="reco-plan-check done">✓</div><span style="color:var(--muted)">Aucune action urgente</span></li>'}
    </ul>
  </div>
  <div class="reco-plan-card">
    <div class="reco-plan-card-hd">
      <div class="reco-plan-card-icon reco-plan-card-icon-b">🚀</div>
      <div>
        <div class="reco-plan-card-title">Optimisations</div>
        <div class="reco-plan-card-sub">Impact moyen</div>
      </div>
    </div>
    <ul class="reco-plan-items">
      ${(_apiRecs.recommendations||[]).filter(r=>r.impact==='medium').slice(0,4).map(r=>`
      <li class="reco-plan-item">
        <div class="reco-plan-check"></div>
        <span>${r.action}</span>
      </li>`).join('') || '<li class="reco-plan-item"><div class="reco-plan-check done">✓</div><span style="color:var(--muted)">Aucune action requise</span></li>'}
    </ul>
  </div>
  <div class="reco-plan-card">
    <div class="reco-plan-card-hd">
      <div class="reco-plan-card-icon reco-plan-card-icon-c">🏆</div>
      <div>
        <div class="reco-plan-card-title">Améliorations</div>
        <div class="reco-plan-card-sub">Impact faible</div>
      </div>
    </div>
    <ul class="reco-plan-items">
      ${(_apiRecs.recommendations||[]).filter(r=>r.impact==='low').slice(0,4).map(r=>`
      <li class="reco-plan-item">
        <div class="reco-plan-check"></div>
        <span>${r.action}</span>
      </li>`).join('') || '<li class="reco-plan-item"><div class="reco-plan-check done">✓</div><span style="color:var(--muted)">Aucune action requise</span></li>'}
    </ul>
  </div>
</div>` : '<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">Connectez vos actifs, licences et processus pour obtenir un plan d\'action personnalisé.</div>'}`;
}

function _renderHistorique(container) {
  container.innerHTML = `
<div class="reco-empty">
  <div class="reco-empty-icon">📜</div>
  <div class="reco-empty-title">Aucune action complétée</div>
  <div class="reco-empty-desc">Commencez à implémenter vos recommandations pour voir votre historique d'adoption IA ici. Chaque action complétée est enregistrée avec sa date et son impact.</div>
  <button class="reco-empty-btn" onclick="document.querySelector('[data-tab=recommandations]')?.click()">Voir mes recommandations</button>
</div>`;
}

function _renderView() {
  const area = document.getElementById('reco-content');
  if (!area) return;
  const view = _st.view;
  const filter = _st.filter || 'all';
  if (view === 'recommandations') _renderRecos(area, filter);
  else if (view === 'plan') _renderPlan(area);
  else if (view === 'historique') _renderHistorique(area);
  document.querySelectorAll('.reco-tab[data-tab]').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === view);
  });
}

function _renderShell(container) {
  const score  = _apiScore ? Math.round(_apiScore.overall) : null;
  const recs   = _apiRecs ? (_apiRecs.recommendations || []) : [];
  const high   = recs.filter(r => r.impact === 'high').length;
  const total  = recs.length;
  const savings = _apiRecs ? (_apiRecs.total_savings || 0) : 0;

  const r = 32;
  const circumf = 2 * Math.PI * r;
  const dash = score != null ? (score / 100) * circumf : 0;
  const level = score == null ? '—' : score >= 80 ? 'Avancé' : score >= 60 ? 'Intermédiaire' : score >= 40 ? 'Débutant' : 'Démarrage';

  container.innerHTML = `
<div class="reco">
  <div class="reco-hd">
    <div class="reco-hd-left">
      <div class="reco-logo">💡</div>
      <div>
        <div class="reco-title">Recommandations IA</div>
        <div class="reco-sub">Analyse de votre organisation — données en temps réel</div>
      </div>
    </div>
    <button class="reco-score-btn-primary" style="padding:8px 18px;border-radius:var(--r);font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;background:var(--primary);color:#fff"
      onclick="document.dispatchEvent(new CustomEvent('ws:navigate',{detail:{appSlug:'diagnostic-ia'}}))">
      Refaire le diagnostic →
    </button>
  </div>

  <div class="reco-score-banner">
    <div class="reco-score-ring">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="${r}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8"/>
        ${score != null ? `<circle cx="45" cy="45" r="${r}" fill="none" stroke="#a78bfa" stroke-width="8"
          stroke-dasharray="${dash.toFixed(2)} ${(circumf - dash).toFixed(2)}" stroke-linecap="round"/>` : ''}
      </svg>
      <div class="reco-score-val">
        <span class="reco-score-num">${score != null ? score : '?'}</span>
        <span class="reco-score-max">/100</span>
      </div>
    </div>
    <div class="reco-score-body">
      <div class="reco-score-label">Score d'efficacité</div>
      <div class="reco-score-title">${level}</div>
      <div class="reco-score-desc">
        ${total === 0
          ? 'Aucune lacune détectée avec les données actuelles. Connectez davantage de sources pour enrichir l\'analyse.'
          : `${total} action${total > 1 ? 's' : ''} identifiée${total > 1 ? 's' : ''} pour améliorer l'efficacité de votre organisation.${savings > 0 ? ` Économies potentielles : ${Number(savings).toLocaleString('fr-CA')} $/an.` : ''}`}
      </div>
      <div class="reco-score-actions">
        <button class="reco-score-btn reco-score-btn-primary" onclick="document.querySelector('[data-tab=plan]')?.click()">Voir le plan →</button>
      </div>
    </div>
  </div>

  <div class="reco-kpis">
    <div class="reco-kpi"><div class="reco-kpi-icon">⚡</div><div class="reco-kpi-val">${high}</div><div class="reco-kpi-lbl">Impact élevé</div></div>
    <div class="reco-kpi"><div class="reco-kpi-icon">📋</div><div class="reco-kpi-val">${total}</div><div class="reco-kpi-lbl">Total recommandations</div></div>
    <div class="reco-kpi"><div class="reco-kpi-icon">💰</div><div class="reco-kpi-val">${savings > 0 ? Number(savings).toLocaleString('fr-CA') + '$' : '—'}</div><div class="reco-kpi-lbl">Économies /an</div></div>
    <div class="reco-kpi"><div class="reco-kpi-icon">📊</div><div class="reco-kpi-val">${score != null ? score + '%' : '—'}</div><div class="reco-kpi-lbl">Score efficacité</div></div>
  </div>

  <div class="reco-tabs">
    <button class="reco-tab active" data-tab="recommandations">Recommandations</button>
    <button class="reco-tab" data-tab="plan">Analyse détaillée</button>
    <button class="reco-tab" data-tab="historique">Historique</button>
  </div>

  <div id="reco-content"></div>
</div>`;

  container.querySelector('.reco-tabs').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    _st.view = tab.dataset.tab;
    _renderView();
  });
}

export default {
  async mount(container, ctx) {
    _css();
    _apiRecs  = null;
    _apiScore = null;
    _st = { ctx, view: 'recommandations', filter: 'all' };

    // Affichage loading initial
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px;gap:12px;color:#757575"><div style="width:24px;height:24px;border:2px solid #E0E0E0;border-top-color:#0078D4;border-radius:50%;animation:reco-spin .7s linear infinite"></div>Chargement des recommandations…</div>';
    if (!document.getElementById('reco-spin-kf')) {
      const ks = document.createElement('style');
      ks.id = 'reco-spin-kf';
      ks.textContent = '@keyframes reco-spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(ks);
    }

    try {
      [_apiRecs, _apiScore] = await Promise.all([
        _api('/api/optimization/recommendations'),
        _api('/api/optimization/efficiency-score'),
      ]);
    } catch (_) {
      // Dégradation gracieuse — module fonctionne avec état vide
      _apiRecs  = { recommendations: [], total_savings: 0 };
      _apiScore = { overall: 0, software: 0, licenses: 0, infrastructure: 0, process: 0 };
    }

    _renderShell(container);
    _renderView();
  },
  unmount(container) {
    _st = null;
    _apiRecs = null;
    _apiScore = null;
    container.innerHTML = '';
    delete window._recoFilter;
    delete window._recoNav;
  },
  refresh(ctx) { if (_st) _renderView(); },
};
