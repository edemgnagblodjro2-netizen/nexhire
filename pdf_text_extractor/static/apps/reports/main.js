/**
 * AgentHub Platform — App: Rapports
 * Rapports diagnostics · Rapport régional · Exports
 */

const API = '/api/diagnostic';

let _st = null;

function _render(el) {
  el.innerHTML = `
<div class="rpt-wrap">
  <div class="ds-page-header">
    <div class="ds-ph-left">
      <h1 class="ds-ph-title">Rapports</h1>
      <p class="ds-ph-sub">Diagnostics individuels, rapport régional de cohorte et exports de données.</p>
    </div>
    <div class="ds-ph-right">
      <a class="rpt-btn-primary" href="/rapport/regional/${_st.slug}" target="_blank" style="white-space:nowrap">📊 Rapport régional →</a>
    </div>
  </div>

  <div class="rpt-grid-top">
    <div class="rpt-card rpt-card-featured">
      <div class="rpt-card-icon">📊</div>
      <div class="rpt-card-body">
        <h3>Rapport régional de cohorte</h3>
        <p>Vue d'ensemble consolidée : score IMAI moyen, répartition par secteur, niveaux de maturité et tendances. Idéal pour le CA et les partenaires.</p>
        <div class="rpt-tags"><span>PDF</span><span>Cobranding</span><span>Partageable</span></div>
      </div>
    </div>

    <div class="rpt-card">
      <div class="rpt-card-icon">🎯</div>
      <div class="rpt-card-body">
        <h3>Rapports individuels</h3>
        <p>Rapport personnalisé par organisation : score par dimension, priorités d'action et recommandations ATLAS ciblées.</p>
        <div class="rpt-tags"><span>PDF</span><span>Cobranding</span><span>Email auto</span></div>
      </div>
      <p class="rpt-card-note">↓ Sélectionner une session ci-dessous</p>
    </div>
  </div>

  <div class="rpt-section">
    <div class="rpt-section-hd">
      <h2 class="rpt-section-title">Sessions récentes</h2>
      <span class="rpt-section-sub">20 dernières sessions complétées</span>
    </div>
    <div id="rpt-sessions">
      <div class="rpt-loading"><div class="ds-spinner ds-spinner-sm"></div><span>Chargement des sessions…</span></div>
    </div>
  </div>

  <div class="rpt-section">
    <div class="rpt-section-hd">
      <h2 class="rpt-section-title">Exports de données</h2>
    </div>
    <div class="rpt-exports">
      <button class="rpt-export-btn" id="rpt-csv">
        <span class="rpt-export-icon">📥</span>
        <div><strong>Export CSV</strong><br><span>Toutes les sessions — données brutes</span></div>
      </button>
      <div class="rpt-export-btn rpt-soon">
        <span class="rpt-export-icon">📑</span>
        <div><strong>PowerPoint automatique</strong><br><span>Généré par ATLAS · Bientôt disponible</span></div>
        <span class="rpt-badge">Bientôt</span>
      </div>
      <div class="rpt-export-btn rpt-soon">
        <span class="rpt-export-icon">📈</span>
        <div><strong>Rapport Excel complet</strong><br><span>Toutes métriques exportées · Bientôt disponible</span></div>
        <span class="rpt-badge">Bientôt</span>
      </div>
    </div>
  </div>
</div>`;

  _loadSessions(el);
  _bindExports(el);
}

async function _loadSessions(el) {
  const box = el.querySelector('#rpt-sessions');

  // Skeleton rows pendant le chargement
  box.innerHTML = `
<div class="ds-table-wrap">
  <table class="ds-table">
    <thead><tr>
      <th>Entreprise</th><th>Secteur</th><th>Score IMAI</th><th>Niveau</th><th>Date</th><th>Rapport</th>
    </tr></thead>
    <tbody>
      ${Array(5).fill(`
      <tr>
        <td><div class="ds-skeleton rpt-skel" style="width:68%"></div></td>
        <td><div class="ds-skeleton rpt-skel" style="width:80%"></div></td>
        <td><div class="ds-skeleton rpt-skel" style="width:40%"></div></td>
        <td><div class="ds-skeleton rpt-skel" style="width:55%"></div></td>
        <td><div class="ds-skeleton rpt-skel" style="width:50%"></div></td>
        <td><div class="ds-skeleton rpt-skel" style="width:30%"></div></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;

  try {
    const res = await fetch(`${API}/${_st.slug}/sessions`);
    if (!res.ok) throw new Error();
    const { sessions } = await res.json();

    if (!sessions?.length) {
      box.innerHTML = `
<div class="ds-empty ds-empty-card" style="padding:40px 24px">
  <div class="ds-empty-icon">📊</div>
  <div class="ds-empty-title">Aucun diagnostic complété</div>
  <div class="ds-empty-desc">Les rapports individuels apparaîtront ici dès qu'une organisation membre termine son diagnostic.</div>
</div>`;
      return;
    }

    const niv = { debutant:'🟡 Débutant', intermediaire:'🔵 Intermédiaire', avance:'🟢 Avancé' };
    box.innerHTML = `
<div class="ds-table-wrap">
  <table class="ds-table">
    <thead><tr>
      <th>Entreprise</th><th>Secteur</th><th>Score IMAI</th><th>Niveau</th><th>Date</th><th>Rapport</th>
    </tr></thead>
    <tbody>
      ${sessions.map(s => `
      <tr>
        <td class="rpt-td-name">${s.company_name || 'Anonyme'}</td>
        <td class="rpt-td-sector">${s.sector || '—'}</td>
        <td><span class="rpt-score" style="color:${_scoreColor(s.imai_score)}">${Math.round(s.imai_score)}</span>/100</td>
        <td><span class="rpt-niv">${niv[s.niveau] || s.niveau || '—'}</span></td>
        <td class="rpt-td-date">${s.completed_at ? new Date(s.completed_at).toLocaleDateString('fr-CA') : '—'}</td>
        <td><a class="rpt-link" href="/rapport/${s.id}" target="_blank">Voir →</a></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
  } catch {
    box.innerHTML = `
<div class="ds-empty ds-empty-card" style="padding:40px 24px">
  <div class="ds-empty-icon">⚠️</div>
  <div class="ds-empty-title">Impossible de charger les sessions</div>
  <div class="ds-empty-desc">Vérifiez votre connexion et actualisez la page.</div>
</div>`;
  }
}

function _scoreColor(s) { return s >= 70 ? 'var(--color-ok)' : s >= 45 ? 'var(--color-warn)' : 'var(--color-err)'; }

function _bindExports(el) {
  el.querySelector('#rpt-csv')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API}/${_st.slug}/sessions`);
      const { sessions } = await res.json();
      if (!sessions?.length) { alert('Aucune donnée à exporter.'); return; }

      const header = 'Entreprise,Secteur,Score IMAI,Niveau,Date\n';
      const rows = sessions.map(s =>
        `"${s.company_name||''}","${s.sector||''}",${Math.round(s.imai_score||0)},"${s.niveau||''}","${s.completed_at ? new Date(s.completed_at).toLocaleDateString('fr-CA') : ''}"`
      ).join('\n');

      const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `diagnostic-${_st.slug}-${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Erreur lors de l\'export.'); }
  });
}

function _css() {
  if (document.getElementById('rpt-css')) return;
  const s = document.createElement('style'); s.id = 'rpt-css';
  s.textContent = `
.rpt-wrap{padding:var(--sp-8);max-width:1000px;margin:0 auto;font-family:var(--font)}
.rpt-grid-top{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px}
.rpt-card{background:var(--bg);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--sp-6);display:flex;flex-direction:column;gap:12px}
.rpt-card-featured{border-color:var(--primary);background:linear-gradient(135deg,var(--primary-lt),var(--bg))}
.rpt-card-icon{font-size:32px}
.rpt-card-body h3{font-size:15px;font-weight:700;color:var(--text);margin:0 0 6px}
.rpt-card-body p{font-size:13px;color:var(--text-2);margin:0;line-height:1.5}
.rpt-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.rpt-tags span{font-size:11px;background:var(--primary-lt);color:var(--primary-dk);padding:2px 8px;border-radius:var(--r-pill);font-weight:500}
.rpt-btn-primary{display:inline-block;background:var(--primary);color:white;text-decoration:none;border-radius:var(--r);padding:9px 16px;font-size:13px;font-weight:600;text-align:center;margin-top:4px}
.rpt-btn-primary:hover{background:var(--primary-dk)}
.rpt-card-note{font-size:12px;color:var(--muted);margin:auto 0 0;text-align:center}
.rpt-section{margin-bottom:32px}
.rpt-section-hd{display:flex;align-items:baseline;gap:12px;margin-bottom:16px}
.rpt-section-title{font-size:16px;font-weight:700;color:var(--text);margin:0}
.rpt-section-sub{font-size:12px;color:var(--muted)}
.rpt-loading{display:flex;align-items:center;gap:10px;padding:32px;color:var(--muted);font-size:13px}
.rpt-skel{height:12px;display:block;border-radius:var(--r-sm)}
.rpt-td-name{font-weight:600;color:var(--text)}
.rpt-td-sector{color:var(--text-sub);font-size:12px}
.rpt-td-date{color:var(--muted);font-size:12px}
.rpt-score{font-weight:700;font-size:15px}
.rpt-niv{font-size:12px}
.rpt-link{color:var(--primary);text-decoration:none;font-weight:600}
.rpt-link:hover{text-decoration:underline}
.rpt-exports{display:flex;flex-direction:column;gap:8px}
.rpt-export-btn{display:flex;align-items:center;gap:14px;padding:14px 18px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--card);cursor:pointer;text-align:left;font-family:inherit;transition:border-color .15s,background .15s}
.rpt-export-btn:not(.rpt-soon):hover{border-color:var(--primary);background:var(--primary-lt)}
.rpt-export-btn strong{font-size:13px;color:var(--text);font-weight:600}
.rpt-export-btn span:not(.rpt-badge):not(.rpt-export-icon){font-size:12px;color:var(--muted)}
.rpt-export-icon{font-size:22px;flex-shrink:0}
.rpt-export-btn > div{flex:1}
.rpt-soon{opacity:.6;cursor:default}
.rpt-badge{background:var(--bg-2);color:var(--muted);font-size:11px;padding:2px 8px;border-radius:var(--r-pill);font-weight:500;white-space:nowrap;flex-shrink:0}
@media(max-width:640px){.rpt-wrap{padding:var(--sp-4)}.rpt-grid-top{grid-template-columns:1fr}}
`;
  document.head.appendChild(s);
}

export default {
  mount(container, ctx) {
    _css();
    _st = { slug: ctx.partnerSlug, partner: ctx.partner };
    _render(container);
  },
  unmount(container) {
    _st = null;
    container.innerHTML = '';
  },
};
