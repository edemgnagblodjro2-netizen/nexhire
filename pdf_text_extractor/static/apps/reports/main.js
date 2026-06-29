/**
 * AgentHub Platform — App: Rapports
 * Rapports diagnostics · Rapport régional · Exports
 */

const API = '/api/diagnostic';

let _st = null;

function _render(el) {
  el.innerHTML = `
<div class="rpt-wrap">
  <div class="rpt-header">
    <div>
      <h1 class="rpt-h1">Rapports</h1>
      <p class="rpt-sub">Rapports de diagnostic, rapport régional de cohorte et exports de données.</p>
    </div>
  </div>

  <div class="rpt-grid-top">
    <div class="rpt-card rpt-card-featured">
      <div class="rpt-card-icon">📊</div>
      <div class="rpt-card-body">
        <h3>Rapport régional de cohorte</h3>
        <p>Vue d'ensemble consolidée de la cohorte : score IMAI moyen, répartition par secteur, niveaux de maturité et tendances. Idéal pour le conseil d'administration et les partenaires.</p>
        <div class="rpt-tags"><span>PDF</span><span>Cobranding</span><span>Partageable</span></div>
      </div>
      <a class="rpt-btn-primary" href="/rapport/regional/${_st.slug}" target="_blank">Voir le rapport régional →</a>
    </div>

    <div class="rpt-card">
      <div class="rpt-card-icon">🎯</div>
      <div class="rpt-card-body">
        <h3>Rapports individuels</h3>
        <p>Rapport personnalisé pour chaque entreprise membre : score détaillé par dimension, priorités d'action et recommandations ciblées.</p>
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
      <div class="rpt-loading"><div class="rpt-spinner"></div><span>Chargement des sessions…</span></div>
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
  try {
    const res = await fetch(`${API}/${_st.slug}/sessions`);
    if (!res.ok) throw new Error();
    const { sessions } = await res.json();

    if (!sessions?.length) {
      box.innerHTML = `<div class="rpt-empty">Aucune session complétée pour le moment. Les rapports individuels apparaîtront ici dès qu'une entreprise membre complète le diagnostic.</div>`;
      return;
    }

    const niv = { debutant:'🟡 Débutant', intermediaire:'🔵 Intermédiaire', avance:'🟢 Avancé' };
    box.innerHTML = `
<div class="rpt-table-wrap">
  <table class="rpt-table">
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
    box.innerHTML = `<div class="rpt-empty">Impossible de charger les sessions. Vérifiez votre connexion.</div>`;
  }
}

function _scoreColor(s) { return s >= 70 ? '#10b981' : s >= 45 ? '#f59e0b' : '#ef4444'; }

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
.rpt-wrap{padding:32px;max-width:1000px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif}
.rpt-header{margin-bottom:28px}
.rpt-h1{font-size:22px;font-weight:700;color:#0f172a;margin:0 0 4px}
.rpt-sub{font-size:13px;color:#64748b;margin:0}
.rpt-grid-top{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px}
.rpt-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:24px;display:flex;flex-direction:column;gap:12px}
.rpt-card-featured{border-color:#7c3aed;background:linear-gradient(135deg,#faf5ff,#f8fafc)}
.rpt-card-icon{font-size:32px}
.rpt-card-body h3{font-size:15px;font-weight:700;color:#0f172a;margin:0 0 6px}
.rpt-card-body p{font-size:13px;color:#475569;margin:0;line-height:1.5}
.rpt-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.rpt-tags span{font-size:11px;background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:99px;font-weight:500}
.rpt-btn-primary{display:inline-block;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:600;text-align:center;margin-top:4px}
.rpt-btn-primary:hover{background:#6d28d9}
.rpt-card-note{font-size:12px;color:#94a3b8;margin:auto 0 0;text-align:center}
.rpt-section{margin-bottom:32px}
.rpt-section-hd{display:flex;align-items:baseline;gap:12px;margin-bottom:16px}
.rpt-section-title{font-size:16px;font-weight:700;color:#0f172a;margin:0}
.rpt-section-sub{font-size:12px;color:#94a3b8}
.rpt-loading{display:flex;align-items:center;gap:10px;padding:32px;color:#94a3b8;font-size:13px}
.rpt-spinner{width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#7c3aed;border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.rpt-empty{padding:32px;text-align:center;color:#94a3b8;font-size:13px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px}
.rpt-table-wrap{overflow-x:auto;border-radius:12px;border:1px solid #e2e8f0}
.rpt-table{width:100%;border-collapse:collapse;font-size:13px}
.rpt-table th{text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.rpt-table td{padding:11px 14px;border-bottom:1px solid #f8fafc;color:#334155;vertical-align:middle}
.rpt-table tr:last-child td{border-bottom:none}
.rpt-td-name{font-weight:600;color:#0f172a}
.rpt-td-sector{color:#64748b;font-size:12px}
.rpt-td-date{color:#94a3b8;font-size:12px}
.rpt-score{font-weight:700;font-size:15px}
.rpt-niv{font-size:12px}
.rpt-link{color:#7c3aed;text-decoration:none;font-weight:600}
.rpt-link:hover{text-decoration:underline}
.rpt-exports{display:flex;flex-direction:column;gap:8px}
.rpt-export-btn{display:flex;align-items:center;gap:14px;padding:14px 18px;border:1px solid #e2e8f0;border-radius:10px;background:white;cursor:pointer;text-align:left;font-family:inherit;transition:border-color .15s,background .15s}
.rpt-export-btn:not(.rpt-soon):hover{border-color:#7c3aed;background:#faf5ff}
.rpt-export-btn strong{font-size:13px;color:#0f172a;font-weight:600}
.rpt-export-btn span:not(.rpt-badge):not(.rpt-export-icon){font-size:12px;color:#94a3b8}
.rpt-export-icon{font-size:22px;flex-shrink:0}
.rpt-export-btn > div{flex:1}
.rpt-soon{opacity:.6;cursor:default}
.rpt-badge{background:#f1f5f9;color:#94a3b8;font-size:11px;padding:2px 8px;border-radius:99px;font-weight:500;white-space:nowrap;flex-shrink:0}
@media(max-width:640px){.rpt-wrap{padding:16px}.rpt-grid-top{grid-template-columns:1fr}}
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
