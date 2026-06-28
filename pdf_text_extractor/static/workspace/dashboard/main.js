/**
 * Dashboard — module principal AgentHub Platform
 * Sprint 1: KPIs démo, activité récente, actions rapides, recommandations ATLAS
 */

const CSS = `
<style>
.db-root {
  padding: 28px 32px 48px;
  max-width: 1200px;
}

/* Header */
.db-header {
  margin-bottom: 28px;
}
.db-greeting {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 4px;
}
.db-sub {
  font-size: 14px;
  color: #64748b;
}

/* KPI grid */
.db-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.db-kpi {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: box-shadow .15s;
}

.db-kpi:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }

.db-kpi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.db-kpi-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #94a3b8;
}

.db-kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.db-kpi-val {
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -1px;
  color: #0f172a;
  line-height: 1;
}

.db-kpi-delta {
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
}

.db-kpi-delta.up   { color: #16a34a; }
.db-kpi-delta.demo { color: #94a3b8; }

/* Main grid */
.db-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
}

.db-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.db-card-header {
  padding: 18px 22px 14px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.db-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.db-card-action {
  font-size: 12px;
  color: #6366f1;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  background: none;
  border: none;
  padding: 0;
}

.db-card-body { padding: 16px 22px; }

/* Activity */
.db-activity-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.db-activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f8fafc;
}

.db-activity-item:last-child { border-bottom: none; }

.db-activity-dot {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.db-activity-text { flex: 1; min-width: 0; }

.db-activity-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 2px;
}

.db-activity-meta {
  font-size: 12px;
  color: #94a3b8;
}

/* Quick actions */
.db-actions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.db-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  text-align: left;
  width: 100%;
}

.db-action-btn:hover {
  border-color: #6366f1;
  background: #fff;
}

.db-action-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.db-action-text strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.db-action-text span {
  font-size: 12px;
  color: #94a3b8;
}

/* ATLAS recommendations */
.db-atlas-card {
  margin-top: 20px;
}

.db-atlas-header {
  padding: 18px 22px 14px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 10px;
}

.db-atlas-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 99px;
  letter-spacing: .03em;
}

.db-atlas-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.db-rec-list {
  padding: 16px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.db-rec-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
}

.db-rec-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #6366f1;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.db-rec-content strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 3px;
}

.db-rec-content p {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

/* Demo notice */
.db-demo-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  color: #92400e;
  margin-bottom: 24px;
}

/* Progress bar */
.db-prog-card {
  background: linear-gradient(135deg, var(--primary, #6366f1) 0%, var(--primary-dk, #4f46e5) 100%);
  border-radius: 12px;
  padding: 22px 26px;
  color: #fff;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.db-prog-text { flex: 1; }
.db-prog-text h3 { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.db-prog-text p { font-size: 13px; opacity: .8; }
.db-prog-pct { font-size: 42px; font-weight: 900; letter-spacing: -2px; }
.db-prog-pct span { font-size: 18px; opacity: .7; }

@media (max-width: 900px) {
  .db-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .db-grid { grid-template-columns: 1fr; }
  .db-root { padding: 16px; }
}
</style>`;

const DEMO_RECS = [
  {
    dim: 'Stratégie',
    text: 'Organisez un atelier de 2 h pour cartographier 3 cas d\'usage IA à fort potentiel dans les 30 prochains jours.',
  },
  {
    dim: 'Personnes',
    text: 'Identifiez un « champion numérique » dans votre équipe et évaluez les compétences IA actuelles.',
  },
  {
    dim: 'Gouvernance',
    text: 'Prenez connaissance de la Loi 25 et vos obligations concernant la protection des renseignements personnels avec l\'IA.',
  },
];

const DEMO_ACTIVITY = [
  { icon: '📊', color: '#ede9fe', title: 'Diagnostic IA disponible', meta: 'Évaluez la maturité IA de votre organisation', time: 'Maintenant' },
  { icon: '🤖', color: '#dbeafe', title: 'ATLAS est prêt', meta: 'Votre copilote IA personnel vous attend', time: 'Disponible' },
  { icon: '📄', color: '#dcfce7', title: 'Rapport régional', meta: 'Synthèse de votre programme partenaire', time: 'Disponible' },
];

function _kpiCard({ label, value, icon, iconBg, delta, deltaUp }) {
  return `
    <div class="db-kpi">
      <div class="db-kpi-header">
        <span class="db-kpi-label">${label}</span>
        <span class="db-kpi-icon" style="background:${iconBg}">${icon}</span>
      </div>
      <div class="db-kpi-val">${value}</div>
      <div class="db-kpi-delta ${deltaUp ? 'up' : 'demo'}">${delta}</div>
    </div>`;
}

function _render(container, ctx) {
  const partnerName = ctx?.partner?.name || 'AgentHub';
  const partnerSlug = ctx?.partnerSlug  || 'demo';

  container.innerHTML = CSS + `
  <div class="db-root">

    <div class="db-demo-notice">
      ℹ️ <strong>Données de démonstration</strong> — complétez votre premier diagnostic pour voir vos vraies métriques.
    </div>

    <div class="db-header">
      <div class="db-greeting">Bonjour, ${partnerName} 👋</div>
      <div class="db-sub">Voici l'état de votre programme Accélérateur IA · ${new Date().toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    </div>

    <!-- Progression -->
    <div class="db-prog-card">
      <div class="db-prog-text">
        <h3>Progression du programme</h3>
        <p>Commencez votre diagnostic IA pour démarrer votre parcours de maturité.</p>
      </div>
      <div class="db-prog-pct">0<span>%</span></div>
    </div>

    <!-- KPIs -->
    <div class="db-kpi-grid">
      ${_kpiCard({ label: 'Score de maturité', value: '—',   icon: '🧠', iconBg: '#ede9fe', delta: 'Complétez le diagnostic', deltaUp: false })}
      ${_kpiCard({ label: 'Diagnostics',       value: '0',   icon: '📊', iconBg: '#dbeafe', delta: 'Premier diagnostic à faire', deltaUp: false })}
      ${_kpiCard({ label: 'Recommandations',   value: '3',   icon: '💡', iconBg: '#fef9c3', delta: 'Prêtes pour votre équipe', deltaUp: false })}
      ${_kpiCard({ label: 'Alertes actives',   value: '0',   icon: '🔔', iconBg: '#fee2e2', delta: 'Aucune alerte', deltaUp: false })}
    </div>

    <!-- Main grid -->
    <div class="db-grid">

      <!-- Activité -->
      <div class="db-card">
        <div class="db-card-header">
          <span class="db-card-title">Activité récente</span>
        </div>
        <div class="db-card-body">
          <div class="db-activity-list">
            ${DEMO_ACTIVITY.map(a => `
              <div class="db-activity-item">
                <div class="db-activity-dot" style="background:${a.color}">${a.icon}</div>
                <div class="db-activity-text">
                  <div class="db-activity-title">${a.title}</div>
                  <div class="db-activity-meta">${a.meta}</div>
                </div>
                <div style="font-size:11px;color:#94a3b8;flex-shrink:0">${a.time}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Actions rapides -->
      <div>
        <div class="db-card">
          <div class="db-card-header">
            <span class="db-card-title">Actions rapides</span>
          </div>
          <div class="db-card-body">
            <div class="db-actions-list">
              <button class="db-action-btn" data-action="diagnostic">
                <div class="db-action-icon" style="background:#ede9fe">📊</div>
                <div class="db-action-text">
                  <strong>Démarrer le diagnostic</strong>
                  <span>Évaluer votre maturité IA</span>
                </div>
              </button>
              <button class="db-action-btn" data-action="observatoire">
                <div class="db-action-icon" style="background:#dbeafe">🔭</div>
                <div class="db-action-text">
                  <strong>Voir l'Observatoire</strong>
                  <span>Tableau de bord du programme</span>
                </div>
              </button>
              <a class="db-action-btn" href="/rapport/regional/${partnerSlug}" target="_blank" rel="noopener">
                <div class="db-action-icon" style="background:#dcfce7">📄</div>
                <div class="db-action-text">
                  <strong>Rapport régional</strong>
                  <span>Synthèse du programme</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ATLAS recommendations -->
    <div class="db-card db-atlas-card">
      <div class="db-atlas-header">
        <span class="db-atlas-badge">✨ ATLAS AI</span>
        <span class="db-atlas-title">Recommandations prioritaires</span>
      </div>
      <div class="db-rec-list">
        ${DEMO_RECS.map((r, i) => `
          <div class="db-rec-item">
            <div class="db-rec-num">${i + 1}</div>
            <div class="db-rec-content">
              <strong>${r.dim}</strong>
              <p>${r.text}</p>
            </div>
          </div>`).join('')}
      </div>
    </div>

  </div>`;

  // Quick actions routing
  container.querySelectorAll('.db-action-btn[data-action]').forEach(btn => {
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
