/**
 * AgentHub Platform — App: Observatoire
 * Tableau de bord analytique partenaire — données agrégées Parcours IA
 */

const API = '/api/diagnostic';

const DIM_LABELS = {
  strategie:    "Stratégie",
  personnes:    "Personnes",
  processus:    "Processus",
  technologies: "Technologies",
  gouvernance:  "Gouvernance",
};

const DIM_ORDER = ["strategie", "processus", "technologies", "personnes", "gouvernance"];

const DIM_ACTIONS = {
  strategie:    { icon: "🧭", title: "Atelier Stratégie IA",    desc: "Définir une feuille de route IA sur 12 mois" },
  personnes:    { icon: "👥", title: "Formation équipes",        desc: "Programme de montée en compétences IA" },
  processus:    { icon: "⚙️", title: "Atelier Automatisation",  desc: "Identifier les processus à fort potentiel" },
  technologies: { icon: "💻", title: "Déploiement outils IA",   desc: "Copilot, automatisation et outils sectoriels" },
  gouvernance:  { icon: "⚖️", title: "Atelier Gouvernance IA",  desc: "Charte d'utilisation responsable de l'IA" },
};

const CHALLENGE_SHORT = {
  "Automatiser des tâches répétitives":          "Automatisation",
  "Analyser mes données pour mieux décider":     "Analyse de données",
  "Améliorer le service à la clientèle":         "Service client",
  "Réduire mes coûts opérationnels":             "Réduction des coûts",
  "Rester compétitif face à mes concurrents":    "Compétitivité",
};

// ── Données démo — affichées si moins de 5 sessions réelles ──────────────────
function _demoData() {
  return {
    total:    42,
    imai_avg: 58.3,
    is_demo:  true,
    niveaux:  { debutant: 16, intermediaire: 21, avance: 5 },
    by_sector: [
      { sector: "Professionnels",                            count: 5, imai_avg: 66.4 },
      { sector: "Commercial",                                count: 4, imai_avg: 59.5 },
      { sector: "Communications",                            count: 4, imai_avg: 70.2 },
      { sector: "Associations et regroupements",             count: 4, imai_avg: 49.8 },
      { sector: "Alimentation, hôtellerie et restauration",  count: 4, imai_avg: 47.6 },
      { sector: "Industriel manufacturier",                  count: 3, imai_avg: 67.5 },
      { sector: "Immobilier",                                count: 3, imai_avg: 57.8 },
      { sector: "Événementiel",                              count: 3, imai_avg: 61.4 },
      { sector: "Finances",                                  count: 2, imai_avg: 70.5 },
      { sector: "Construction",                              count: 2, imai_avg: 52.7 },
      { sector: "Santé",                                     count: 2, imai_avg: 56.9 },
      { sector: "Arts et culture",                           count: 2, imai_avg: 45.9 },
      { sector: "Éducation",                                 count: 1, imai_avg: 55.2 },
      { sector: "Environnement",                             count: 1, imai_avg: 50.3 },
      { sector: "Entreprises de services",                   count: 1, imai_avg: 63.8 },
      { sector: "Administration publique",                   count: 1, imai_avg: 48.4 },
    ],
    dimensions: {
      strategie:    62.1,
      processus:    55.8,
      technologies: 50.2,
      personnes:    46.3,
      gouvernance:  38.7,
    },
    challenges: [
      { label: "Automatiser des tâches répétitives",     count: 16 },
      { label: "Analyser mes données pour mieux décider", count: 11 },
      { label: "Améliorer le service à la clientèle",    count:  8 },
      { label: "Réduire mes coûts opérationnels",        count:  5 },
      { label: "Rester compétitif face à mes concurrents", count: 2 },
    ],
  };
}

// ── State ─────────────────────────────────────────────────────────────────────
let _state = null;
let _styleInjected = false;

// ── Platform Contract ─────────────────────────────────────────────────────────
export default {
  slug:    "observatoire",
  name:    "Observatoire",
  version: "1.0",

  mount(container, context) {
    _state = { partnerSlug: context.partnerSlug, context };
    _injectStyles(context.partner?.primary_color || "#2563eb");
    _showSkeleton(container);
    _loadAndRender(container);
  },

  unmount(container) {
    container.innerHTML = "";
    _state = null;
  },
};

// ── Load ──────────────────────────────────────────────────────────────────────
async function _loadAndRender(container) {
  try {
    const res = await fetch(`${API}/${_state.partnerSlug}/stats`, { credentials: "include" });
    if (res.status === 401 || res.status === 403) return _renderAccessDenied(container);
    if (!res.ok) return _renderError(container);
    const data = await res.json();
    _render(container, data.total >= 5 ? data : _demoData());
  } catch {
    _renderError(container);
  }
}

function _renderAccessDenied(container) {
  container.innerHTML = `
    <div class="obs-wrap">
      <div class="obs-loading">
        <p style="font-size:15px;font-weight:600;color:#1e293b">Accès non autorisé</p>
        <p style="font-size:13px;color:#6b7280">Vous devez être administrateur de ce programme pour accéder à l'Observatoire.</p>
      </div>
    </div>`;
}

function _renderError(container) {
  container.innerHTML = `
    <div class="obs-wrap">
      <div class="obs-loading">
        <p style="font-size:15px;font-weight:600;color:#1e293b">Erreur de chargement</p>
        <p style="font-size:13px;color:#6b7280">Impossible de récupérer les données. Rechargez la page ou réessayez plus tard.</p>
      </div>
    </div>`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function _showSkeleton(container) {
  container.innerHTML = `
    <div class="obs-wrap">
      <div class="obs-loading">
        <div class="obs-spinner"></div>
        <p>Chargement des données…</p>
      </div>
    </div>`;
}

// ── Insights auto-générés depuis les données ──────────────────────────────────
function _buildInsights(d) {
  const items = [];

  if (d.challenges.length > 0) {
    const top = d.challenges[0];
    const pct = Math.round(top.count / d.total * 100);
    const short = CHALLENGE_SHORT[top.label] || top.label;
    items.push(`${pct}% des organisations participantes identifient <strong>${short.toLowerCase()}</strong> comme priorité numéro un.`);
  }

  const weakest = DIM_ORDER.reduce((a, b) => d.dimensions[a] < d.dimensions[b] ? a : b);
  items.push(`La dimension <strong>${DIM_LABELS[weakest]}</strong> constitue le principal point de progression — score moyen : ${d.dimensions[weakest].toFixed(0)}/100.`);

  if (d.by_sector.length > 0) {
    const best = [...d.by_sector].sort((a, b) => b.imai_avg - a.imai_avg)[0];
    items.push(`Le secteur <strong>${best.sector}</strong> affiche l'indice de maturité le plus élevé parmi les participants (${best.imai_avg.toFixed(0)}/100).`);
  }

  return items;
}

// ── Actions recommandées depuis les dimensions faibles ────────────────────────
function _buildActions(d) {
  return DIM_ORDER
    .slice()
    .sort((a, b) => d.dimensions[a] - d.dimensions[b])
    .slice(0, 3)
    .map(dim => DIM_ACTIONS[dim]);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function _render(container, d) {
  const today    = new Date().toLocaleDateString("fr-CA", { year: "numeric", month: "long", day: "numeric" });
  const nTotal   = d.niveaux.debutant + d.niveaux.intermediaire + d.niveaux.avance;
  const pDeb     = nTotal ? Math.round(d.niveaux.debutant      / nTotal * 100) : 0;
  const pInt     = nTotal ? Math.round(d.niveaux.intermediaire / nTotal * 100) : 0;
  const pAdv     = 100 - pDeb - pInt;

  const avgColor = d.imai_avg < 34 ? "#ef4444" : d.imai_avg < 67 ? "#f59e0b" : "#10b981";
  const avgLabel = d.imai_avg < 34 ? "Débutant"   : d.imai_avg < 67 ? "Intermédiaire" : "Avancé";

  // KPI secondaires
  const roi          = Math.round(d.total * 3.5);
  const topChallenge = d.challenges.length > 0
    ? (CHALLENGE_SHORT[d.challenges[0].label] || d.challenges[0].label)
    : "Automatisation";

  const sectorMax    = Math.max(...d.by_sector.map(s => s.count), 1);

  const sectorBars = d.by_sector.map(s => {
    const pct   = Math.round(s.count / sectorMax * 100);
    const share = Math.round(s.count / d.total * 100);
    return `
      <div class="obs-bar-row">
        <span class="obs-bar-label" title="${s.sector}">${s.sector}</span>
        <div class="obs-bar-track">
          <div class="obs-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="obs-bar-val">${s.count} <span class="obs-bar-pct">(${share}%)</span></span>
      </div>`;
  }).join("");

  const dimBars = DIM_ORDER.map(dim => {
    const val   = d.dimensions[dim] || 0;
    const color = val >= 67 ? "#10b981" : val >= 34 ? "#f59e0b" : "#ef4444";
    return `
      <div class="obs-dim-row">
        <span class="obs-dim-label">${DIM_LABELS[dim]}</span>
        <div class="obs-dim-track">
          <div class="obs-dim-bar" style="width:${val}%;background:${color}"></div>
        </div>
        <span class="obs-dim-val" style="color:${color}">${val.toFixed(0)}</span>
      </div>`;
  }).join("");

  const challengeItems = d.challenges.length
    ? d.challenges.map((c, i) => `
        <div class="obs-ch-row">
          <span class="obs-ch-rank">${i + 1}</span>
          <span class="obs-ch-label">${c.label}</span>
          <span class="obs-ch-count">${c.count}</span>
        </div>`).join("")
    : `<p class="obs-no-data">Disponible après 10+ parcours complétés.</p>`;

  const insights    = _buildInsights(d);
  const insightItems = insights.map(txt => `
    <div class="obs-insight-item">
      <span class="obs-insight-dot"></span>
      <p>${txt}</p>
    </div>`).join("");

  const actions     = _buildActions(d);
  const actionItems = actions.map(a => `
    <div class="obs-action-item">
      <span class="obs-action-icon">${a.icon}</span>
      <div>
        <strong>${a.title}</strong>
        <p>${a.desc}</p>
      </div>
    </div>`).join("");

  container.innerHTML = `
    <div class="obs-wrap">

      <!-- En-tête -->
      <div class="obs-header">
        <div>
          <h1 class="obs-title">Observatoire IA</h1>
          <p class="obs-subtitle">Vision en temps réel de l'adoption de l'intelligence artificielle par les organisations participantes.</p>
        </div>
        <div class="obs-header-right">
          ${d.is_demo ? '<span class="obs-demo-badge">Données démo</span>' : ""}
          <span class="obs-updated">Mis à jour le ${today}</span>
        </div>
      </div>

      <!-- KPIs principaux -->
      <div class="obs-kpi-grid">
        <div class="obs-kpi-card">
          <div class="obs-kpi-icon">🏢</div>
          <div class="obs-kpi-value">${d.total}</div>
          <div class="obs-kpi-label">Organisations</div>
          <div class="obs-kpi-sub">Diagnostics complétés</div>
        </div>
        <div class="obs-kpi-card obs-kpi-accent" style="--accent:${avgColor}">
          <div class="obs-kpi-icon">🧮</div>
          <div class="obs-kpi-value" style="color:${avgColor}">${d.imai_avg.toFixed(1)}<span class="obs-kpi-unit">/100</span></div>
          <div class="obs-kpi-label">Indice de maturité IA moyen</div>
          <div class="obs-kpi-sub" style="color:${avgColor}">Niveau ${avgLabel}</div>
        </div>
        <div class="obs-kpi-card">
          <div class="obs-kpi-icon">📊</div>
          <div class="obs-kpi-value">${pInt}%</div>
          <div class="obs-kpi-label">Niveau intermédiaire</div>
          <div class="obs-kpi-sub">${d.niveaux.intermediaire} organisations</div>
        </div>
      </div>

      <!-- KPIs secondaires -->
      <div class="obs-kpi-secondary">
        <div class="obs-kpi-card obs-kpi-sm">
          <div class="obs-kpi-sm-icon">🎯</div>
          <div>
            <div class="obs-kpi-sm-label">Priorité #1</div>
            <div class="obs-kpi-sm-value">${topChallenge}</div>
          </div>
        </div>
        <div class="obs-kpi-card obs-kpi-sm">
          <div class="obs-kpi-sm-icon">⏱</div>
          <div>
            <div class="obs-kpi-sm-label">ROI estimé</div>
            <div class="obs-kpi-sm-value">${roi} h <span class="obs-kpi-sm-sub">/ mois</span></div>
          </div>
        </div>
      </div>

      <!-- Insights IA -->
      <div class="obs-section obs-insights-section">
        <div class="obs-insights-header">
          <span class="obs-insights-badge">✦ Insights IA</span>
          <span class="obs-insights-sub">Observations générées automatiquement</span>
        </div>
        <div class="obs-insights-list">${insightItems}</div>
      </div>

      <!-- Niveaux de maturité -->
      <div class="obs-section">
        <h3>Répartition par niveau de maturité</h3>
        <div class="obs-stacked-bar">
          <div class="obs-stacked-seg obs-seg-deb" style="width:${pDeb}%" title="Débutant ${pDeb}%"></div>
          <div class="obs-stacked-seg obs-seg-int" style="width:${pInt}%" title="Intermédiaire ${pInt}%"></div>
          <div class="obs-stacked-seg obs-seg-adv" style="width:${pAdv}%" title="Avancé ${pAdv}%"></div>
        </div>
        <div class="obs-niveau-legend">
          <div class="obs-niv-item">
            <span class="obs-niv-dot obs-seg-deb"></span>
            <span><strong>${pDeb}%</strong> Débutant (0–33)</span>
            <span class="obs-niv-count">${d.niveaux.debutant} org.</span>
          </div>
          <div class="obs-niv-item">
            <span class="obs-niv-dot obs-seg-int"></span>
            <span><strong>${pInt}%</strong> Intermédiaire (34–66)</span>
            <span class="obs-niv-count">${d.niveaux.intermediaire} org.</span>
          </div>
          <div class="obs-niv-item">
            <span class="obs-niv-dot obs-seg-adv"></span>
            <span><strong>${pAdv}%</strong> Avancé (67–100)</span>
            <span class="obs-niv-count">${d.niveaux.avance} org.</span>
          </div>
        </div>
      </div>

      <!-- Secteurs + Défis -->
      <div class="obs-two-col">
        <div class="obs-section">
          <h3>Répartition par secteur</h3>
          <div class="obs-bars">${sectorBars}</div>
        </div>
        <div class="obs-section">
          <h3>Défis prioritaires</h3>
          <div class="obs-challenges">${challengeItems}</div>
        </div>
      </div>

      <!-- Dimensions -->
      <div class="obs-section">
        <h3>Scores moyens par dimension</h3>
        <div class="obs-dims">${dimBars}</div>
        <p class="obs-dims-note">Pondérations : Stratégie 25% · Gouvernance 25% · Technologies 20% · Processus 20% · Personnes 10%</p>
      </div>

      <!-- Actions recommandées -->
      <div class="obs-section">
        <h3>Actions recommandées pour votre programme</h3>
        <p class="obs-actions-intro">Basées sur les dimensions les plus faibles de vos organisations membres.</p>
        <div class="obs-actions">${actionItems}</div>
      </div>

      <!-- Rapport régional -->
      <div class="obs-report-card">
        <div class="obs-report-text">
          <strong>Rapport régional · Accélérateur IA</strong>
          <p>Synthèse complète — indicateurs, tendances, recommandations sectorielles.</p>
        </div>
        <button class="obs-report-btn" id="obs-dl-btn">
          ⬇ Télécharger le rapport
        </button>
      </div>

    </div>`;

  document.getElementById("obs-dl-btn")?.addEventListener("click", () => {
    window.open(`/rapport/regional/${_state.partnerSlug}`, "_blank", "noopener");
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────
function _injectStyles(primaryColor) {
  if (_styleInjected) return;
  _styleInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --obs-primary: ${primaryColor};
      --obs-text:    #111827;
      --obs-muted:   #6b7280;
      --obs-bg:      #f9fafb;
      --obs-card:    #ffffff;
      --obs-border:  #e5e7eb;
      --obs-radius:  10px;
    }

    .obs-wrap {
      max-width: 900px;
      margin: 0 auto;
      padding: 28px 24px 56px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Header */
    .obs-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .obs-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--obs-text);
      margin-bottom: 4px;
    }

    .obs-subtitle {
      font-size: 13px;
      color: var(--obs-muted);
      max-width: 520px;
      line-height: 1.5;
    }

    .obs-header-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .obs-demo-badge {
      font-size: 11px;
      font-weight: 700;
      background: #fef3c7;
      color: #92400e;
      border-radius: 4px;
      padding: 3px 8px;
    }

    .obs-updated { font-size: 12px; color: var(--obs-muted); }

    /* Loading */
    .obs-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      gap: 12px;
      color: var(--obs-muted);
      font-size: 14px;
    }

    .obs-spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--obs-border);
      border-top-color: var(--obs-primary);
      border-radius: 50%;
      animation: obs-spin .7s linear infinite;
    }
    @keyframes obs-spin { to { transform: rotate(360deg); } }

    /* KPI Grid */
    .obs-kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .obs-kpi-secondary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .obs-kpi-card {
      background: var(--obs-card);
      border: 1px solid var(--obs-border);
      border-radius: var(--obs-radius);
      padding: 20px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .obs-kpi-accent {
      border-color: color-mix(in srgb, var(--accent, var(--obs-primary)) 30%, transparent);
      background: color-mix(in srgb, var(--accent, var(--obs-primary)) 5%, white);
    }

    .obs-kpi-icon { font-size: 22px; margin-bottom: 6px; }
    .obs-kpi-value { font-size: 32px; font-weight: 800; line-height: 1; color: var(--obs-text); }
    .obs-kpi-unit  { font-size: 16px; font-weight: 500; color: var(--obs-muted); }
    .obs-kpi-label { font-size: 13px; font-weight: 600; color: var(--obs-text); margin-top: 4px; }
    .obs-kpi-sub   { font-size: 12px; color: var(--obs-muted); }

    /* KPI secondaires */
    .obs-kpi-sm {
      flex-direction: row;
      align-items: center;
      gap: 14px;
      padding: 16px 18px;
    }

    .obs-kpi-sm-icon { font-size: 24px; flex-shrink: 0; }
    .obs-kpi-sm-label { font-size: 11px; color: var(--obs-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .obs-kpi-sm-value { font-size: 18px; font-weight: 700; color: var(--obs-text); margin-top: 2px; }
    .obs-kpi-sm-sub   { font-size: 13px; font-weight: 400; color: var(--obs-muted); }

    /* Sections */
    .obs-section {
      background: var(--obs-card);
      border: 1px solid var(--obs-border);
      border-radius: var(--obs-radius);
      padding: 20px 24px;
    }

    .obs-section h3 {
      font-size: 13px;
      font-weight: 700;
      color: var(--obs-text);
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    /* Insights IA */
    .obs-insights-section {
      background: linear-gradient(135deg,
        color-mix(in srgb, var(--obs-primary) 6%, white),
        color-mix(in srgb, var(--obs-primary) 3%, white));
      border-color: color-mix(in srgb, var(--obs-primary) 20%, transparent);
    }

    .obs-insights-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    .obs-insights-badge {
      font-size: 12px;
      font-weight: 700;
      background: var(--obs-primary);
      color: #fff;
      border-radius: 4px;
      padding: 3px 10px;
    }

    .obs-insights-sub { font-size: 12px; color: var(--obs-muted); }

    .obs-insights-list { display: flex; flex-direction: column; gap: 10px; }

    .obs-insight-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .obs-insight-dot {
      width: 6px; height: 6px;
      background: var(--obs-primary);
      border-radius: 50%;
      margin-top: 7px;
      flex-shrink: 0;
    }

    .obs-insight-item p {
      font-size: 14px;
      color: var(--obs-text);
      line-height: 1.5;
      margin: 0;
    }

    /* Stacked bar */
    .obs-stacked-bar {
      height: 20px;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      margin-bottom: 14px;
    }

    .obs-stacked-seg { height: 100%; transition: width .6s ease; }
    .obs-seg-deb { background: #ef4444; }
    .obs-seg-int { background: #f59e0b; }
    .obs-seg-adv { background: #10b981; }

    .obs-niveau-legend { display: flex; gap: 20px; flex-wrap: wrap; }

    .obs-niv-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--obs-text);
    }

    .obs-niv-dot {
      width: 10px; height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .obs-niv-count { font-size: 12px; color: var(--obs-muted); margin-left: 2px; }

    /* Two-col */
    .obs-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    /* Sector bars */
    .obs-bars { display: flex; flex-direction: column; gap: 10px; }

    .obs-bar-row { display: flex; align-items: center; gap: 10px; }

    .obs-bar-label {
      font-size: 12px;
      color: var(--obs-text);
      min-width: 130px;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .obs-bar-track {
      flex: 1; height: 10px;
      background: var(--obs-bg);
      border-radius: 5px; overflow: hidden;
      border: 1px solid var(--obs-border);
    }

    .obs-bar-fill {
      height: 100%;
      background: var(--obs-primary);
      border-radius: 5px;
      transition: width .6s ease;
    }

    .obs-bar-val { font-size: 12px; font-weight: 600; min-width: 52px; text-align: right; color: var(--obs-text); }
    .obs-bar-pct { font-weight: 400; color: var(--obs-muted); }

    /* Challenges */
    .obs-challenges { display: flex; flex-direction: column; gap: 8px; }

    .obs-ch-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; background: var(--obs-bg); border-radius: 6px;
    }

    .obs-ch-rank {
      width: 20px; height: 20px;
      background: var(--obs-primary);
      color: #fff; border-radius: 50%;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .obs-ch-label { font-size: 12px; color: var(--obs-text); flex: 1; line-height: 1.3; }
    .obs-ch-count { font-size: 12px; font-weight: 700; color: var(--obs-muted); flex-shrink: 0; }

    .obs-no-data { font-size: 13px; color: var(--obs-muted); font-style: italic; }

    /* Dimension bars */
    .obs-dims { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }

    .obs-dim-row { display: flex; align-items: center; gap: 12px; }

    .obs-dim-label { font-size: 13px; color: var(--obs-muted); min-width: 100px; }

    .obs-dim-track {
      flex: 1; height: 10px; background: var(--obs-bg);
      border-radius: 5px; overflow: hidden; border: 1px solid var(--obs-border);
    }

    .obs-dim-bar { height: 100%; border-radius: 5px; transition: width .8s ease; }
    .obs-dim-val { font-size: 13px; font-weight: 700; min-width: 28px; text-align: right; }

    .obs-dims-note { font-size: 11px; color: var(--obs-muted); font-style: italic; }

    /* Actions recommandées */
    .obs-actions-intro { font-size: 13px; color: var(--obs-muted); margin-bottom: 14px; }

    .obs-actions { display: flex; flex-direction: column; gap: 10px; }

    .obs-action-item {
      display: flex; gap: 14px; align-items: flex-start;
      padding: 12px 14px;
      background: var(--obs-bg);
      border-radius: 8px;
      border-left: 3px solid var(--obs-primary);
    }

    .obs-action-icon { font-size: 20px; flex-shrink: 0; margin-top: 1px; }

    .obs-action-item strong { font-size: 14px; display: block; margin-bottom: 2px; }
    .obs-action-item p      { font-size: 13px; color: var(--obs-muted); margin: 0; }

    /* Rapport CTA */
    .obs-report-card {
      background: var(--obs-card);
      border: 1px solid var(--obs-border);
      border-radius: var(--obs-radius);
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .obs-report-text { flex: 1; min-width: 180px; }
    .obs-report-text strong { font-size: 14px; display: block; margin-bottom: 3px; }
    .obs-report-text p      { font-size: 13px; color: var(--obs-muted); }

    .obs-report-btn {
      padding: 10px 20px;
      background: var(--obs-primary);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .obs-report-btn:hover:not(:disabled) { opacity: .9; }
    .obs-report-btn:disabled { cursor: default; }

    /* Responsive */
    @media (max-width: 640px) {
      .obs-kpi-grid      { grid-template-columns: 1fr 1fr; }
      .obs-kpi-grid > :last-child { grid-column: span 2; }
      .obs-kpi-secondary { grid-template-columns: 1fr; }
      .obs-two-col       { grid-template-columns: 1fr; }
      .obs-wrap          { padding: 16px 12px 40px; }
      .obs-bar-label     { min-width: 90px; max-width: 90px; }
    }
  `;
  document.head.appendChild(style);
}
