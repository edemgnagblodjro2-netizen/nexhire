/**
 * Dashboard — module principal AgentHub Platform
 * UI/UX Polish: design system tokens, cockpit Enterprise
 */

const CSS = `
<style>
.db-root {
  padding: 28px 32px 48px;
  max-width: 1200px;
  font-family: var(--font);
}

/* ── Demo notice ──────────────────────────────────────────────────── */
.db-demo-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-info-soft);
  border: 1px solid var(--color-info-border);
  border-radius: var(--r);
  padding: 10px 14px;
  font-size: 12px;
  color: var(--color-info-on);
  margin-bottom: 22px;
}

/* ── Header ───────────────────────────────────────────────────────── */
.db-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}
.db-greeting {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 3px;
}
.db-sub {
  font-size: 13px;
  color: var(--text-sub);
}

/* ── Welcome / onboarding card ────────────────────────────────────── */
.db-welcome {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dk) 100%);
  border-radius: var(--r-xl);
  padding: 22px 28px;
  color: #fff;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  position: relative;
  overflow: hidden;
}
.db-welcome::before {
  content: '';
  position: absolute;
  top: -48px; right: -16px;
  width: 140px; height: 140px;
  background: rgba(255,255,255,.07);
  border-radius: 50%;
  pointer-events: none;
}
.db-welcome::after {
  content: '';
  position: absolute;
  bottom: -36px; right: 100px;
  width: 90px; height: 90px;
  background: rgba(255,255,255,.04);
  border-radius: 50%;
  pointer-events: none;
}
.db-welcome-body { flex: 1; position: relative; }
.db-welcome-body h3 { font-size: 14px; font-weight: 700; margin-bottom: 10px; opacity: .96; }
.db-welcome-track {
  height: 4px;
  background: rgba(255,255,255,.22);
  border-radius: 2px;
  margin-bottom: 7px;
  overflow: hidden;
}
.db-welcome-fill { height: 100%; background: rgba(255,255,255,.85); border-radius: 2px; }
.db-welcome-hint { font-size: 11px; opacity: .65; }
.db-welcome-cta {
  background: rgba(255,255,255,.18);
  color: #fff;
  border: 1.5px solid rgba(255,255,255,.35);
  border-radius: var(--r);
  padding: 9px 18px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  transition: background .15s;
  position: relative; font-family: var(--font);
}
.db-welcome-cta:hover { background: rgba(255,255,255,.28); }

/* ── KPI grid ─────────────────────────────────────────────────────── */
.db-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.db-kpi {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  transition: box-shadow .15s, transform .15s;
  cursor: default;
}
.db-kpi:hover {
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.db-kpi-hd {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.db-kpi-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--muted);
}

.db-kpi-icon {
  width: 30px; height: 30px;
  border-radius: var(--r);
  display: flex; align-items: center;
  justify-content: center; font-size: 14px;
}

.db-kpi-val {
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -1px;
  color: var(--text);
  line-height: 1;
  margin-bottom: 6px;
}

.db-kpi-delta {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
}
.db-kpi-delta.up { color: var(--color-ok-text); }

/* ── Main content grid ────────────────────────────────────────────── */
.db-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 16px;
  margin-bottom: 16px;
}

.db-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.db-card-hd {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-2);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.db-card-title {
  font-size: 13px; font-weight: 700;
  color: var(--text);
}

/* ── Activity list ────────────────────────────────────────────────── */
.db-activity-list { display: flex; flex-direction: column; }

.db-activity-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 13px 20px;
  border-bottom: 1px solid var(--border-2);
  transition: background .1s;
  cursor: default;
}
.db-activity-item:last-child { border-bottom: none; }
.db-activity-item:hover { background: var(--bg); }

.db-activity-dot {
  width: 32px; height: 32px;
  border-radius: var(--r);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0; margin-top: 1px;
}

.db-activity-body { flex: 1; min-width: 0; }
.db-activity-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.db-activity-meta { font-size: 12px; color: var(--muted); line-height: 1.4; }

.db-activity-time {
  font-size: 11px; color: var(--muted);
  flex-shrink: 0; white-space: nowrap; margin-top: 2px;
}

/* ── Quick actions ────────────────────────────────────────────────── */
.db-actions-list {
  display: flex; flex-direction: column;
  padding: 6px 8px; gap: 2px;
}

.db-action-btn {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border: none; background: none;
  border-radius: var(--r);
  cursor: pointer; transition: background .1s;
  text-align: left; width: 100%;
  font-family: var(--font); text-decoration: none;
}
.db-action-btn:hover { background: var(--bg); }

.db-action-icon {
  width: 30px; height: 30px; border-radius: var(--r);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}

.db-action-body { flex: 1; }
.db-action-body strong { display: block; font-size: 13px; font-weight: 600; color: var(--text); }
.db-action-body span { font-size: 11px; color: var(--muted); }

.db-action-chevron {
  color: var(--muted); flex-shrink: 0; font-size: 16px;
  font-weight: 300; opacity: 0; transition: opacity .1s; line-height: 1;
}
.db-action-btn:hover .db-action-chevron { opacity: 1; }

/* ── ATLAS recommendations ────────────────────────────────────────── */
.db-atlas-wrap {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary) 5%, var(--card)),
    var(--card)
  );
  border: 1px solid color-mix(in srgb, var(--primary) 15%, transparent);
  border-radius: var(--r-lg);
  overflow: hidden;
}

.db-atlas-hd {
  padding: 14px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--primary) 10%, transparent);
  display: flex; align-items: center; gap: 10px;
}

.db-atlas-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--primary); color: #fff;
  font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: var(--r-pill);
  letter-spacing: .03em;
}

.db-atlas-title { font-size: 13px; font-weight: 700; color: var(--text); }

.db-rec-list {
  padding: 16px 20px;
  display: flex; flex-direction: column; gap: 8px;
}

.db-rec {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 13px 16px;
  background: var(--card);
  border-radius: var(--r);
  border: 1px solid var(--border-2);
  transition: box-shadow .12s;
}
.db-rec:hover { box-shadow: var(--shadow-sm); }

.db-rec-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--primary); color: #fff;
  font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}

.db-rec strong { display: block; font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
.db-rec p { font-size: 12px; color: var(--text-sub); line-height: 1.5; margin: 0; }

/* ── Responsive ───────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .db-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .db-grid { grid-template-columns: 1fr; }
  .db-root { padding: 16px 16px 40px; }
  .db-welcome { flex-direction: column; align-items: flex-start; }
  .db-welcome-cta { width: 100%; text-align: center; }
}
</style>`;

const DEMO_RECS = [
  { dim: 'Stratégie',   text: 'Organisez un atelier de 2 h pour cartographier 3 cas d\'usage IA à fort potentiel dans les 30 prochains jours.' },
  { dim: 'Personnes',   text: 'Identifiez un « champion numérique » dans votre équipe et évaluez les compétences IA actuelles de l\'organisation.' },
  { dim: 'Gouvernance', text: 'Prenez connaissance de la Loi 25 et vos obligations concernant la protection des renseignements personnels avec l\'IA.' },
];

const DEMO_ACTIVITY = [
  { icon: '📊', color: 'var(--primary-lt)',    title: 'Diagnostic IA disponible', meta: 'Évaluez la maturité IA de votre organisation', time: 'Maintenant' },
  { icon: '🤖', color: 'var(--color-info-bg)', title: 'ATLAS est prêt',           meta: 'Votre copilote IA personnel vous attend',       time: 'Disponible' },
  { icon: '📄', color: 'var(--color-ok-bg)',   title: 'Rapport régional',         meta: 'Synthèse de votre programme partenaire',        time: 'Disponible' },
];

const DIM_LABELS_DB = {
  strategie: 'Stratégie', personnes: 'Personnes', processus: 'Processus',
  technologies: 'Technologies', gouvernance: 'Gouvernance',
};
const DIM_GUIDANCE = {
  strategie:    'Définissez vos objectifs IA à 6 et 12 mois avec une feuille de route claire et des indicateurs mesurables.',
  personnes:    'Identifiez un champion IA dans votre équipe et planifiez la montée en compétences de votre organisation.',
  processus:    'Cartographiez vos tâches répétitives à fort potentiel d\'automatisation et priorisez les gains rapides.',
  technologies: 'Évaluez vos outils actuels et identifiez les solutions IA adaptées à votre secteur d\'activité.',
  gouvernance:  'Complétez la checklist Loi 25, rédigez votre politique d\'utilisation de l\'IA et inventoriez vos outils.',
};

function _kpiCard({ label, value, icon, iconBg, delta }) {
  return `
    <div class="db-kpi">
      <div class="db-kpi-hd">
        <span class="db-kpi-label">${label}</span>
        <span class="db-kpi-icon" style="background:${iconBg}">${icon}</span>
      </div>
      <div class="db-kpi-val">${value}</div>
      <div class="db-kpi-delta">${delta}</div>
    </div>`;
}

function _render(container, ctx) {
  const partnerName = ctx?.partner?.name || 'AgentHub';
  const partnerSlug = ctx?.partnerSlug  || 'demo';
  const today    = new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  // Read last diagnostic result from localStorage
  let diag = null;
  try {
    const raw = localStorage.getItem(`nh_last_diag_${partnerSlug}`);
    if (raw) diag = JSON.parse(raw);
  } catch {}
  const hasDiag = !!diag;

  // Derived display values (only used when hasDiag)
  const SCORE_COLOR = { debutant: 'var(--color-err)', intermediaire: 'var(--color-warn)', avance: 'var(--color-ok)' };
  const NIVEAU_LBL  = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' };
  const scoreColor  = hasDiag ? (SCORE_COLOR[diag.niveau] || 'var(--primary)') : null;
  const scoreLabel  = hasDiag ? (NIVEAU_LBL[diag.niveau]  || '')               : null;
  const dateLabel   = hasDiag ? new Date(diag.date).toLocaleDateString('fr-CA', { month: 'long', day: 'numeric' }) : null;

  // Activity items — real if diagnostic done
  const activityItems = hasDiag
    ? [
        { icon: '✅', color: 'var(--color-ok-bg)',   title: `Diagnostic complété · Score ${diag.score}/100`,   meta: `${diag.company} · Niveau ${scoreLabel}`, time: dateLabel },
        { icon: '🤖', color: 'var(--color-info-bg)', title: 'ATLAS est prêt',                                   meta: 'Consultez vos recommandations personnalisées', time: 'Disponible' },
        { icon: '📄', color: 'var(--color-ok-bg)',   title: 'Rapport régional',                                 meta: 'Synthèse de votre programme partenaire',       time: 'Disponible' },
      ]
    : DEMO_ACTIVITY;

  // ATLAS recs — personalized from weakest dims if diagnostic done
  const atlasRecs = hasDiag
    ? Object.entries(diag.scores || {})
        .sort(([, a], [, b]) => a - b)
        .slice(0, 3)
        .map(([dim]) => ({ dim: DIM_LABELS_DB[dim] || dim, text: DIM_GUIDANCE[dim] || '' }))
    : DEMO_RECS;

  container.innerHTML = CSS + `
<div class="db-root">

  ${!hasDiag ? `<div class="db-demo-notice">
    ℹ️ <strong>Données de démonstration</strong> — Complétez votre premier diagnostic pour voir vos vraies métriques.
  </div>` : ''}

  <div class="db-header">
    <div>
      <div class="db-greeting">Bonjour, ${partnerName}</div>
      <div class="db-sub">${todayCap} · Programme Accélérateur IA</div>
    </div>
  </div>

  <div class="db-welcome">
    <div class="db-welcome-body">
      ${hasDiag
        ? `<h3>Score IMAI <strong style="color:rgba(255,255,255,.95)">${diag.score}/100</strong> · ${scoreLabel}</h3>
           <div class="db-welcome-track"><div class="db-welcome-fill" style="width:${diag.score}%"></div></div>
           <div class="db-welcome-hint">Évalué le ${dateLabel} · ${diag.company}</div>`
        : `<h3>Démarrez votre programme Accélérateur IA</h3>
           <div class="db-welcome-track"><div class="db-welcome-fill" style="width:0%"></div></div>
           <div class="db-welcome-hint">0 % complété · Complétez le diagnostic pour obtenir votre score</div>`
      }
    </div>
    <button class="db-welcome-cta" data-action="diagnostic">
      ${hasDiag ? 'Voir mes résultats →' : 'Démarrer le diagnostic →'}
    </button>
  </div>

  <div class="db-kpi-grid">
    ${_kpiCard({ label: 'Maturité IA',
      value: hasDiag ? `<span style="color:${scoreColor}">${diag.score}</span>` : '—',
      icon: '🧠', iconBg: 'var(--primary-lt)',
      delta: hasDiag ? `Niveau ${scoreLabel}` : 'Complétez le diagnostic' })}
    ${_kpiCard({ label: 'Diagnostics',
      value: hasDiag ? '1' : '0',
      icon: '📊', iconBg: 'var(--color-info-bg)',
      delta: hasDiag ? `Dernier : ${dateLabel}` : '1 diagnostic à démarrer' })}
    ${_kpiCard({ label: 'Recommandations', value: '3', icon: '💡', iconBg: 'var(--color-warn-bg)',
      delta: hasDiag ? 'Basées sur votre score IMAI' : 'Prêtes pour votre équipe' })}
    ${_kpiCard({ label: 'Alertes', value: '0', icon: '🔔', iconBg: 'var(--bg-2)',
      delta: 'Aucune alerte active' })}
  </div>

  <div class="db-grid">

    <div class="db-card">
      <div class="db-card-hd">
        <span class="db-card-title">Activité récente</span>
      </div>
      <div class="db-activity-list">
        ${activityItems.map(a => `
        <div class="db-activity-item">
          <div class="db-activity-dot" style="background:${a.color}">${a.icon}</div>
          <div class="db-activity-body">
            <div class="db-activity-title">${a.title}</div>
            <div class="db-activity-meta">${a.meta}</div>
          </div>
          <span class="db-activity-time">${a.time}</span>
        </div>`).join('')}
      </div>
    </div>

    <div class="db-card">
      <div class="db-card-hd">
        <span class="db-card-title">Actions rapides</span>
      </div>
      <div class="db-actions-list">
        <button class="db-action-btn" data-action="diagnostic">
          <div class="db-action-icon" style="background:var(--primary-lt)">📊</div>
          <div class="db-action-body">
            <strong>${hasDiag ? 'Refaire le diagnostic' : 'Démarrer le diagnostic'}</strong>
            <span>${hasDiag ? 'Mesurer votre progression' : 'Évaluer votre maturité IA'}</span>
          </div>
          <span class="db-action-chevron">›</span>
        </button>
        <button class="db-action-btn" data-action="observatoire">
          <div class="db-action-icon" style="background:var(--color-info-bg)">🔭</div>
          <div class="db-action-body">
            <strong>Observatoire IA</strong>
            <span>Tableau de bord du programme</span>
          </div>
          <span class="db-action-chevron">›</span>
        </button>
        <a class="db-action-btn" href="/rapport/regional/${partnerSlug}" target="_blank" rel="noopener">
          <div class="db-action-icon" style="background:var(--color-ok-bg)">📄</div>
          <div class="db-action-body">
            <strong>Rapport régional</strong>
            <span>Synthèse du programme</span>
          </div>
          <span class="db-action-chevron">›</span>
        </a>
      </div>
    </div>

  </div>

  <div class="db-atlas-wrap">
    <div class="db-atlas-hd">
      <span class="db-atlas-badge">✨ ATLAS AI</span>
      <span class="db-atlas-title">${hasDiag ? 'Vos priorités d\'action personnalisées' : 'Recommandations prioritaires'}</span>
      ${!hasDiag ? '<span style="font-size:11px;color:var(--muted);margin-left:auto;font-weight:500">Démo</span>' : ''}
    </div>
    <div class="db-rec-list">
      ${atlasRecs.map((r, i) => `
      <div class="db-rec">
        <div class="db-rec-num">${i + 1}</div>
        <div>
          <strong>${r.dim}</strong>
          <p>${r.text}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>

</div>`;

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slug = ctx?.partnerSlug || 'demo';
      const target = btn.dataset.action;
      history.pushState({ id: target }, '', `/workspace/${slug}/${target}`);
      window.dispatchEvent(new PopStateEvent('popstate', { state: { id: target } }));
    });
  });
}

export default {
  mount(container, ctx) { _render(container, ctx); },
  unmount(container)    { container.innerHTML = ''; },
};
