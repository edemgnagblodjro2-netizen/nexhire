/**
 * AgentHub Platform — App: Diagnostic IA
 * Parcours IA PME · Agent Atlas · IMAI /100
 *
 * Contrat Platform :
 *   export default { slug, name, version, mount(container, context), unmount(container) }
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const API = '/api/diagnostic';

const SECTORS = [
  "Professionnels", "Commercial", "Communications",
  "Associations et regroupements", "Alimentation, hôtellerie et restauration",
  "Industriel manufacturier", "Immobilier", "Événementiel",
  "Finances", "Construction", "Santé",
  "Arts et culture", "Éducation", "Environnement",
  "Entreprises de services", "Administration publique", "Autre",
];

const CHALLENGES = [
  "Automatiser des tâches répétitives",
  "Améliorer le service à la clientèle",
  "Analyser mes données pour mieux décider",
  "Réduire mes coûts opérationnels",
  "Rester compétitif face à mes concurrents",
  "Autre",
];

const DIMENSION_LABELS = {
  strategie:    "Stratégie",
  personnes:    "Personnes",
  processus:    "Processus",
  technologies: "Technologies",
  gouvernance:  "Gouvernance",
};

const NIVEAU_LABELS = {
  debutant:      "Débutant",
  intermediaire: "Intermédiaire",
  avance:        "Avancé",
};

const NIVEAU_COLORS = {
  debutant:      "var(--color-err)",
  intermediaire: "var(--color-warn)",
  avance:        "var(--color-ok)",
};

// ── State ─────────────────────────────────────────────────────────────────────
let _state = null;
let _styleInjected = false;

function _reset(partnerSlug, context) {
  _state = {
    partnerSlug,
    context,
    sessionId:        null,
    currentQ:         null,
    totalCore:        10,
    answeredCore:     0,
    dimensionsSeen:   [],
    results:          null,
    historySessions:  [],
    step: "loading",  // loading | history | welcome | profile | questions | calculating | results
  };
}

// ── Platform Contract ─────────────────────────────────────────────────────────
export default {
  slug:    "diagnostic-ia",
  name:    "Parcours IA",
  version: "1.0",

  mount(container, context) {
    _reset(context.partnerSlug, context);
    _injectStyles();
    _render(container);            // shows loading spinner immediately
    _loadHistory(container);       // async: transitions to history or welcome
  },

  unmount(container) {
    container.innerHTML = "";
    _state = null;
  },
};

// ── Render dispatcher ─────────────────────────────────────────────────────────
function _render(container) {
  switch (_state.step) {
    case "loading":     _showLoading(container);    break;
    case "history":     _showHistory(container);    break;
    case "welcome":     _showWelcome(container);    break;
    case "profile":     _showProfile(container);    break;
    case "questions":   _showQuestion(container);   break;
    case "calculating": _showCalculating(container); break;
    case "results":     _showResults(container);    break;
  }
}

// ── Screen: Loading ───────────────────────────────────────────────────────────
function _showLoading(container) {
  container.innerHTML = `
    <div class="dia-wrap">
      <div class="ds-empty" style="padding:80px 24px">
        <div class="ds-spinner"></div>
        <div class="ds-empty-desc" style="margin-top:12px">Chargement…</div>
      </div>
    </div>`;
}

// ── Screen: History ───────────────────────────────────────────────────────────
async function _loadHistory(container) {
  try {
    const res = await fetch(`${API}/${_state.partnerSlug}/sessions`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (data.sessions?.length > 0) {
      _state.historySessions = data.sessions;
      _state.step = "history";
    } else {
      _state.step = "welcome";
    }
  } catch {
    _state.step = "welcome";
  }
  if (_state) _render(container);
}

function _showHistory(container) {
  const NIVEAU_COLOR = {
    debutant: "var(--color-err)", intermediaire: "var(--color-warn)", avance: "var(--color-ok)",
  };
  const NIVEAU_LABEL = {
    debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé",
  };

  const cards = _state.historySessions.map(s => {
    const color = NIVEAU_COLOR[s.niveau] || "var(--muted)";
    const label = NIVEAU_LABEL[s.niveau] || s.niveau || "—";
    const score = Math.round(s.imai_score);
    const date  = s.completed_at
      ? new Date(s.completed_at).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })
      : "";
    return `
      <div class="dia-hist-card">
        <div class="dia-hist-score" style="color:${color}">
          ${score}<small>/100</small>
        </div>
        <div class="dia-hist-info">
          <div class="dia-hist-company">${s.company_name || "—"}</div>
          <div class="dia-hist-meta">
            ${s.sector || ""}
            <span class="dia-hist-niveau" style="background:${color}22;color:${color}">${label}</span>
            ${date ? `· ${date}` : ""}
          </div>
        </div>
        <button class="dia-hist-view" data-id="${s.id}">Voir résultats</button>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="dia-wrap">
      <div class="dia-atlas-avatar small" style="margin-bottom:4px">🤖</div>
      <div class="dia-atlas-bubble" style="margin-bottom:20px">
        <p class="dia-atlas-name">Atlas</p>
        <p>Voici vos diagnostics récents. Consultez un rapport ou démarrez une nouvelle évaluation.</p>
      </div>
      <div class="dia-history-list">${cards}</div>
      <button class="dia-btn-primary" id="dia-new-btn">
        + Nouveau diagnostic
      </button>
    </div>`;

  container.querySelectorAll('.dia-hist-view').forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = "Chargement…";
      try {
        const res = await fetch(`${API}/session/${id}/result`);
        if (!res.ok) throw new Error("Résultat introuvable.");
        const data = await res.json();
        _state.results  = data;
        _state.sessionId = id;
        _state.step     = "results";
        _render(container);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Voir résultats";
        alert(err.message);
      }
    });
  });

  _el("dia-new-btn").addEventListener("click", () => {
    _state.step = "welcome";
    _render(container);
  });
}

// ── Screen: Welcome ───────────────────────────────────────────────────────────
function _showWelcome(container) {
  container.innerHTML = `
    <div class="dia-wrap">
      <div class="dia-card dia-welcome-card">
        <div class="dia-atlas-avatar">🤖</div>
        <div class="dia-atlas-bubble">
          <p class="dia-atlas-name">Atlas — Conseiller IA</p>
          <p>Bonjour ! Je suis <strong>ATLAS</strong>, votre conseiller IA. En quelques minutes, je vais mieux comprendre votre entreprise afin de vous proposer un <strong>plan d'action personnalisé</strong>.</p>
          <p>Ce parcours est <strong>gratuit et confidentiel</strong>. Aucun compte requis.</p>
        </div>
        <div class="dia-value-prop">
          <p class="dia-vp-label">Ce parcours vous permettra de :</p>
          <ul class="dia-vp-list">
            <li>✓ Évaluer votre maturité IA (score IMAI /100)</li>
            <li>✓ Obtenir un plan d'action sur 5 dimensions</li>
            <li>✓ Identifier vos priorités d'action</li>
          </ul>
          <p class="dia-vp-duration">⏱ Durée : 10 minutes</p>
        </div>
        <div class="dia-dimensions-preview">
          <span class="dia-dim-tag">📋 Stratégie</span>
          <span class="dia-dim-tag">👥 Personnes</span>
          <span class="dia-dim-tag">⚙️ Processus</span>
          <span class="dia-dim-tag">💻 Technologies</span>
          <span class="dia-dim-tag">⚖️ Gouvernance</span>
        </div>
        <button class="dia-btn-primary" id="dia-start-btn">
          Commencer mon parcours →
        </button>
      </div>
    </div>`;

  _el("dia-start-btn").addEventListener("click", () => {
    _state.step = "profile";
    _render(container);
  });
}

// ── Screen: Profile ───────────────────────────────────────────────────────────
function _showProfile(container) {
  const sectorOpts = SECTORS.map(s =>
    `<option value="${s}">${s}</option>`
  ).join("");
  const challengeOpts = CHALLENGES.map(c =>
    `<option value="${c}">${c}</option>`
  ).join("");

  container.innerHTML = `
    <div class="dia-wrap">
      <div class="dia-card">
        <div class="dia-atlas-avatar small">🤖</div>
        <div class="dia-atlas-bubble">
          <p class="dia-atlas-name">Atlas</p>
          <p>Avant de commencer, dites-moi un peu plus sur votre organisation.</p>
        </div>
        <form id="dia-profile-form" class="dia-form" novalidate>
          <div class="dia-field">
            <label for="dia-company">Nom de votre organisation <span class="dia-req">*</span></label>
            <input id="dia-company" type="text" maxlength="255" placeholder="Ex: Industries Tremblay Inc." required />
          </div>
          <div class="dia-field-row">
            <div class="dia-field">
              <label for="dia-sector">Secteur d'activité <span class="dia-req">*</span></label>
              <select id="dia-sector" required>
                <option value="">Choisir…</option>
                ${sectorOpts}
              </select>
            </div>
            <div class="dia-field">
              <label for="dia-size">Taille de l'organisation <span class="dia-req">*</span></label>
              <select id="dia-size" required>
                <option value="">Choisir…</option>
                <option value="1-9">1 à 9 employés</option>
                <option value="10-49">10 à 49 employés</option>
                <option value="50-199">50 à 199 employés</option>
                <option value="200+">200 employés et plus</option>
              </select>
            </div>
          </div>
          <div class="dia-field">
            <label for="dia-challenge">Votre principal défi lié à l'IA</label>
            <select id="dia-challenge">
              <option value="">Choisir (optionnel)…</option>
              ${challengeOpts}
            </select>
          </div>
          <div id="dia-profile-error" class="dia-error" style="display:none"></div>
          <button type="submit" class="dia-btn-primary" id="dia-profile-submit">
            Lancer mon évaluation →
          </button>
        </form>
      </div>
    </div>`;

  _el("dia-profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const company   = _el("dia-company").value.trim();
    const sector    = _el("dia-sector").value;
    const size      = _el("dia-size").value;
    const challenge = _el("dia-challenge").value || null;

    if (!company || !sector || !size) {
      _showFormError("dia-profile-error", "Merci de remplir les champs obligatoires.");
      return;
    }

    _el("dia-profile-submit").disabled = true;
    _el("dia-profile-submit").textContent = "Démarrage…";

    try {
      const res = await _post(`${API}/session`, {
        partner_slug:       _state.partnerSlug,
        company_name:       company,
        sector,
        size_range:         size,
        priority_challenge: challenge,
      });

      _state.sessionId   = res.session_id;
      _state.currentQ    = res.first_question;
      _state.totalCore   = res.total_core;
      _state.answeredCore = 0;
      _state.step        = "questions";
      _render(container);
    } catch (err) {
      _el("dia-profile-submit").disabled = false;
      _el("dia-profile-submit").textContent = "Lancer mon évaluation →";
      _showFormError("dia-profile-error", err.message);
    }
  });
}

// ── Screen: Question ──────────────────────────────────────────────────────────
function _showQuestion(container) {
  const q        = _state.currentQ;
  const progress = Math.round((_state.answeredCore / _state.totalCore) * 100);
  const dimLabel = DIMENSION_LABELS[q.dimension] || q.dimension;

  // Track dimension order (driven by API sequence)
  if (!_state.dimensionsSeen.includes(q.dimension)) {
    _state.dimensionsSeen.push(q.dimension);
  }
  const dimIndex = _state.dimensionsSeen.length;
  const dimTotal = 5;

  // Estimated time remaining (avg ~30s per question)
  const remaining = _state.totalCore - _state.answeredCore;
  const timeLeft  = Math.ceil(remaining * 0.5);
  const timeLabel = timeLeft <= 1 ? '< 1 min' : `~${timeLeft} min`;

  const motivText = remaining <= 2 && remaining > 0
    ? `<p class="dia-progress-motiv">Plus que ${remaining} question${remaining > 1 ? 's' : ''} — vous êtes presque au bout de votre diagnostic. 🎯</p>`
    : '';

  container.innerHTML = `
    <div class="dia-wrap">
      <div class="dia-progress-hd">
        <div class="dia-progress-top">
          <span class="dia-dim-chip">${dimLabel}</span>
          <span class="dia-dim-pos">Dimension ${dimIndex} sur ${dimTotal}</span>
        </div>
        <div class="dia-progress-bar-wrap">
          <div class="dia-progress-bar" style="width:${progress}%"></div>
        </div>
        <div class="dia-progress-foot">
          <span class="dia-progress-num">Question <strong>${_state.answeredCore + 1}</strong> sur ${_state.totalCore}</span>
          <span class="dia-progress-time">⏱ ${timeLabel} restante${timeLeft > 1 ? 's' : ''}</span>
        </div>
        ${motivText}
      </div>
      <div class="dia-card dia-question-card">
        <div class="dia-atlas-avatar small">🤖</div>
        <div class="dia-atlas-bubble">
          <p class="dia-atlas-name">Atlas</p>
          <p class="dia-q-text">${q.text}</p>
          ${q.hint ? `<p class="dia-q-hint">💡 ${q.hint}</p>` : ""}
        </div>
        <div class="dia-answer-btns" id="dia-answers">
          <button class="dia-answer-btn" data-answer="oui">
            <span class="dia-answer-icon">✅</span>
            <span class="dia-answer-label">Oui</span>
            <span class="dia-answer-sub">Nous le faisons</span>
          </button>
          <button class="dia-answer-btn" data-answer="partiellement">
            <span class="dia-answer-icon">🔄</span>
            <span class="dia-answer-label">Partiellement</span>
            <span class="dia-answer-sub">En cours / incomplet</span>
          </button>
          <button class="dia-answer-btn" data-answer="non">
            <span class="dia-answer-icon">❌</span>
            <span class="dia-answer-label">Non</span>
            <span class="dia-answer-sub">Pas encore</span>
          </button>
        </div>
        <div id="dia-q-error" class="dia-error" style="display:none"></div>
      </div>
    </div>`;

  container.querySelectorAll(".dia-answer-btn").forEach(btn => {
    btn.addEventListener("click", () => _submitAnswer(container, btn.dataset.answer));
  });
}

async function _submitAnswer(container, answer) {
  container.querySelectorAll(".dia-answer-btn").forEach(b => b.disabled = true);
  container.querySelector(`[data-answer="${answer}"]`)?.classList.add("selected");

  try {
    const res = await _post(`${API}/session/${_state.sessionId}/answer`, {
      question_code: _state.currentQ.code,
      answer,
    });

    _state.answeredCore = res.progress.answered_core;

    if (res.completed) {
      _state.step = "calculating";
      _render(container);
      await _finalize(container);
    } else {
      _state.currentQ = res.next_question;
      _render(container);
    }
  } catch (err) {
    container.querySelectorAll(".dia-answer-btn").forEach(b => b.disabled = false);
    container.querySelector(`[data-answer="${answer}"]`)?.classList.remove("selected");
    _showFormError("dia-q-error", err.message);
  }
}

// ── Screen: Calculating ───────────────────────────────────────────────────────
function _showCalculating(container) {
  container.innerHTML = `
    <div class="dia-wrap">
      <div class="ds-empty ds-empty-card" style="padding:64px 24px">
        <div class="ds-empty-icon">🧮</div>
        <div class="ds-spinner" style="margin:4px 0 8px"></div>
        <div class="ds-empty-title">Calcul de votre score IMAI…</div>
        <div class="ds-empty-desc">Atlas analyse vos réponses et prépare vos recommandations personnalisées.</div>
      </div>
    </div>`;
}

async function _finalize(container) {
  try {
    const results = await _post(`${API}/session/${_state.sessionId}/complete`, {}, 15000);
    _state.results = results;
    // Persist summary for Dashboard dynamic update
    try {
      const _uid = _state.context?.userProfile?.id || _state.context?.user?.user_id || 'anon';
      localStorage.setItem(`nh_last_diag_${_state.partnerSlug}_${_uid}`, JSON.stringify({
        score:     Math.round(results.imai_score),
        niveau:    results.niveau,
        company:   results.company_name || '',
        date:      new Date().toISOString(),
        sessionId: results.session_id,
        scores:    results.scores || {},
      }));
    } catch {}
    _state.step = "results";
    _render(container);
  } catch (err) {
    _showCalculatingError(container, err.message);
  }
}

function _showCalculatingError(container, msg) {
  container.innerHTML = `
    <div class="dia-wrap">
      <div class="ds-empty ds-empty-card" style="padding:64px 24px">
        <div class="ds-empty-icon">⚠️</div>
        <div class="ds-empty-title">Une erreur est survenue</div>
        <div class="ds-empty-desc">${msg || "Impossible de finaliser le parcours."}</div>
        <button class="ds-empty-action-ghost" id="dia-retry-btn">Réessayer</button>
      </div>
    </div>`;
  _el("dia-retry-btn").addEventListener("click", () => {
    _state.step = "calculating";
    _render(container);
    _finalize(container);
  });
}

// ── Screen: Results ───────────────────────────────────────────────────────────
function _showResults(container) {
  const r       = _state.results;
  const score   = r.imai_score;
  const niv     = r.niveau;
  const color   = NIVEAU_COLORS[niv] || "var(--primary)";
  const company = r.company_name || "Votre organisation";

  // Dimension la plus faible → étape 1 personnalisée
  const sortedDims  = Object.entries(r.scores).sort(([,a],[,b]) => a - b);
  const weakestDim  = sortedDims[0][0];
  const strongestDim = sortedDims[sortedDims.length - 1][0];

  // Narration contextuelle ATLAS
  const NIV_NARRATIVE = {
    debutant:      "est au début de son parcours IA. Des gains rapides sont accessibles dès maintenant.",
    intermediaire: "a de bonnes bases en IA. Il est temps de structurer et d'accélérer.",
    avance:        "est en avance sur la maturité IA. L'enjeu est de consolider et d'innover.",
  };
  const narrative = `<strong>${company}</strong> ${NIV_NARRATIVE[niv] || NIV_NARRATIVE.intermediaire}
    Point fort : <strong>${DIMENSION_LABELS[strongestDim]}</strong>.
    Priorité d'action : <strong>${DIMENSION_LABELS[weakestDim]}</strong>.`;

  // Barres de dimension
  const dimBars = Object.entries(r.scores).map(([dim, val]) => `
    <div class="dia-dim-row">
      <span class="dia-dim-name">${DIMENSION_LABELS[dim]}</span>
      <div class="dia-dim-bar-wrap">
        <div class="dia-dim-bar" style="width:${val}%;background:${_dimColor(val)}"></div>
      </div>
      <span class="dia-dim-val">${val.toFixed(0)}</span>
    </div>`).join("");

  // Benchmark
  let benchHtml = "";
  if (r.benchmark) {
    const b = r.benchmark;
    const demoNote = b.is_demo
      ? `<span class="dia-demo-badge">DÉMO</span>`
      : `<span class="dia-sample">${b.sample_size} organisations</span>`;
    benchHtml = `
      <div class="dia-section">
        <h3>Comparaison sectorielle ${demoNote}</h3>
        <div class="dia-bench-row">
          <div class="dia-bench-item"><span class="dia-bench-val">${b.imai_avg.toFixed(1)}</span><span class="dia-bench-label">Moyenne</span></div>
          <div class="dia-bench-item"><span class="dia-bench-val">${b.imai_p25.toFixed(1)}</span><span class="dia-bench-label">25e percentile</span></div>
          <div class="dia-bench-item highlight" style="--bench-color:${color}"><span class="dia-bench-val">${score.toFixed(1)}</span><span class="dia-bench-label">Votre score</span></div>
          <div class="dia-bench-item"><span class="dia-bench-val">${b.imai_p75.toFixed(1)}</span><span class="dia-bench-label">75e percentile</span></div>
        </div>
      </div>`;
  }

  // Recommandations
  const recsHtml = Object.entries(r.recommendations).map(([dim, text], i) => `
    <div class="dia-rec">
      <div class="dia-rec-num">${i + 1}</div>
      <div><strong>${DIMENSION_LABELS[dim]}</strong><p>${text}</p></div>
    </div>`).join("");

  container.innerHTML = `
    <div class="dia-wrap dia-results-wrap">

      <!-- Score header -->
      <div class="dia-results-header">
        <div class="dia-gauge-wrap">
          <svg class="dia-gauge" viewBox="0 0 120 70">
            <path d="M10,60 A50,50 0 0,1 110,60" fill="none" style="stroke:var(--border)" stroke-width="10" stroke-linecap="round"/>
            <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="${color}"
              stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${(score / 100 * 157).toFixed(1)} 157"
              style="transition:stroke-dasharray 1s ease"/>
          </svg>
          <div class="dia-gauge-score" style="color:${color}">${score.toFixed(0)}<span>/100</span></div>
        </div>
        <div class="dia-niveau-wrap">
          <span class="dia-niveau-badge" style="background:${color}20;color:${color}">
            ${NIVEAU_LABELS[niv] || niv}
          </span>
          <p class="dia-niveau-desc">${_niveauDesc(niv)}</p>
        </div>
      </div>

      <!-- Narration ATLAS -->
      <div class="ds-ph-context">
        <span class="ds-ph-context-icon">🤖</span>
        <div><strong>Atlas ·</strong> ${narrative}</div>
      </div>

      <!-- 3 Prochaines étapes — section la plus visible -->
      <div class="dia-section">
        <h3>🎯 Vos 3 prochaines étapes</h3>
        ${_buildStepsHtml(weakestDim)}
      </div>

      <!-- Scores par dimension -->
      <div class="dia-section">
        <h3>Scores par dimension</h3>
        ${dimBars}
      </div>

      ${benchHtml}

      <!-- Recommandations ATLAS -->
      <div class="dia-section" id="dia-recs">
        <h3>Recommandations ATLAS</h3>
        ${recsHtml}
      </div>

      <!-- Rapport complet (gate email) -->
      <div class="dia-section" id="dia-gate-section">
        <h3>📄 Votre rapport complet</h3>
        <p style="font-size:14px;color:var(--text-sub);margin-bottom:16px">Entrez votre courriel pour accéder à votre rapport personnalisé : forces, plan d'action 30/90/180 jours et recommandations ATLAS.</p>
        <form id="dia-email-form" class="dia-email-form" novalidate>
          <input id="dia-email-input" type="email" placeholder="votre@courriel.com" maxlength="254" required />
          <button type="submit" class="dia-btn-primary">Recevoir mon rapport personnalisé →</button>
        </form>
        <div id="dia-email-msg" style="display:none;margin-top:10px;font-size:13px"></div>
        <div id="dia-rapport-revealed" style="display:none;margin-top:16px">
          <a class="dia-btn-primary" href="/rapport/${r.session_id}" target="_blank" rel="noopener"
            style="display:block;text-align:center;text-decoration:none">
            Voir mon rapport complet →
          </a>
          <p style="font-size:12px;color:var(--muted);margin-top:8px;text-align:center">
            Un lien vous a également été envoyé par courriel.
          </p>
        </div>
      </div>

      <div class="dia-restart">
        <button class="dia-btn-ghost" id="dia-restart-btn">
          ${_state.historySessions?.length > 0 ? "← Retour à l'historique" : "← Recommencer le parcours"}
        </button>
      </div>
    </div>`;

  _bindResultsActions(container);

  _el("dia-email-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = _el("dia-email-input").value.trim();
    if (!email) return;
    const btn = _el("dia-email-form").querySelector("button");
    btn.disabled = true; btn.textContent = "…";
    try {
      await _patch(`${API}/session/${_state.sessionId}/email`, { company_email: email });
      _revealRapport();
    } catch {
      const msg = _el("dia-email-msg");
      msg.textContent = "Erreur lors de l'envoi. Réessayez.";
      msg.style.display = "block";
      msg.style.color = "var(--color-err)";
      btn.disabled = false; btn.textContent = "Recevoir mon rapport personnalisé →";
    }
  });

  _el("dia-restart-btn")?.addEventListener("click", () => {
    const hasHistory = _state.historySessions?.length > 0;
    _state.step    = hasHistory ? "history" : "welcome";
    _state.sessionId = null; _state.results = null;
    _render(container);
  });
}

// ── 3 étapes personnalisées (basées sur la dimension la plus faible) ───────────
function _buildStepsHtml(weakestDim) {
  const STEP1 = {
    gouvernance:  { icon: '⚖️', title: 'Renforcer la gouvernance IA',      desc: 'Complétez la checklist Loi 25, rédigez votre politique d\'utilisation de l\'IA et inventoriez vos outils.',           navId: 'gouvernance', cta: 'Ouvrir Gouvernance IA →' },
    strategie:    { icon: '🎯', title: 'Structurer votre stratégie IA',     desc: 'Définissez vos objectifs IA à 6 et 12 mois avec les recommandations personnalisées d\'ATLAS ci-dessous.',           navId: null,           cta: 'Voir les recommandations ↓' },
    personnes:    { icon: '👥', title: 'Former et mobiliser vos équipes',   desc: 'Identifiez les profils prioritaires à sensibiliser et planifiez un programme de montée en compétences IA.',        navId: null,           cta: 'Voir les recommandations ↓' },
    processus:    { icon: '⚙️', title: 'Automatiser vos processus clés',    desc: 'Cartographiez les tâches répétitives à fort potentiel d\'automatisation dans vos opérations quotidiennes.',        navId: null,           cta: 'Voir les recommandations ↓' },
    technologies: { icon: '💻', title: 'Optimiser vos outils IA',           desc: 'Évaluez et documentez les solutions IA utilisées dans votre organisation pour assurer leur conformité Loi 25.',  navId: 'gouvernance', cta: 'Registre des outils IA →' },
  };
  const s1 = STEP1[weakestDim] || STEP1.strategie;

  return `
    <div class="dia-steps-grid">
      <div class="dia-step-card dia-step-accent">
        <div class="dia-step-num">Priorité 1</div>
        <div class="dia-step-icon">${s1.icon}</div>
        <div class="dia-step-title">${s1.title}</div>
        <div class="dia-step-desc">${s1.desc}</div>
        ${s1.navId
          ? `<button class="dia-step-btn" data-nav="${s1.navId}">${s1.cta}</button>`
          : `<button class="dia-step-btn dia-step-btn-outline" data-scroll="dia-recs">${s1.cta}</button>`}
      </div>
      <div class="dia-step-card">
        <div class="dia-step-num">Priorité 2</div>
        <div class="dia-step-icon">👁️</div>
        <div class="dia-step-title">Comparer avec la cohorte</div>
        <div class="dia-step-desc">Voyez où votre score se situe par rapport aux autres organisations de votre secteur et identifiez les meilleures pratiques.</div>
        <button class="dia-step-btn" data-nav="observatoire">Voir l'Observatoire →</button>
      </div>
      <div class="dia-step-card">
        <div class="dia-step-num">Priorité 3</div>
        <div class="dia-step-icon">📄</div>
        <div class="dia-step-title">Accéder à votre rapport complet</div>
        <div class="dia-step-desc">Plan d'action 30/90/180 jours, forces, axes de progrès — votre feuille de route IA personnalisée par ATLAS.</div>
        <button class="dia-step-btn dia-step-btn-outline" data-scroll="dia-gate-section">Recevoir mon rapport personnalisé →</button>
      </div>
    </div>`;
}

// ── Navigation depuis les résultats ──────────────────────────────────────────
function _bindResultsActions(container) {
  container.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const navId = btn.dataset.nav;
      history.pushState({ id: navId }, '', `/workspace/${_state.partnerSlug}/${navId}`);
      window.dispatchEvent(new PopStateEvent('popstate', { state: { id: navId } }));
    });
  });
  container.querySelectorAll('[data-scroll]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.scroll)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _el(id) { return document.getElementById(id); }

function _showFormError(id, msg) {
  const el = _el(id);
  if (el) { el.textContent = msg; el.style.display = "block"; }
}

function _dimColor(val) {
  if (val >= 67) return "var(--color-ok)";
  if (val >= 34) return "var(--color-warn)";
  return "var(--color-err)";
}

function _niveauDesc(niv) {
  if (niv === "debutant")      return "Votre organisation débute son parcours IA. Des gains rapides sont accessibles dès maintenant.";
  if (niv === "intermediaire") return "Vous avez de bonnes bases. Il est temps de structurer et d'accélérer votre démarche.";
  return "Votre organisation est en avance sur la maturité IA. Continuez à innover et à partager vos apprentissages.";
}

function _revealRapport() {
  const form = _el("dia-email-form");
  if (form) form.style.display = "none";
  const msg = _el("dia-email-msg");
  if (msg) {
    msg.textContent = "✅ Rapport envoyé — vérifiez votre courriel d'ici quelques minutes.";
    msg.style.display = "block";
    msg.style.color = "var(--color-ok)";
  }
  const revealed = _el("dia-rapport-revealed");
  if (revealed) revealed.style.display = "block";
}

async function _patch(url, body) {
  const res = await fetch(url, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data.detail)
      ? data.detail.map(e => e.msg || JSON.stringify(e)).join(" · ")
      : (data.detail || `Erreur ${res.status}`);
    throw new Error(msg);
  }
  return data;
}

async function _post(url, body, timeoutMs) {
  const opts = {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  };
  if (timeoutMs) opts.signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) {
    const msg = Array.isArray(data.detail)
      ? data.detail.map(e => e.msg || JSON.stringify(e)).join(" · ")
      : (data.detail || `Erreur ${res.status}`);
    throw new Error(msg);
  }
  return data;
}

// ── Styles ────────────────────────────────────────────────────────────────────
function _injectStyles() {
  if (_styleInjected) return;
  _styleInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    .dia-wrap {
      max-width: 680px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }

    .dia-results-wrap { max-width: 720px; }

    .dia-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Atlas avatar + bubble */
    .dia-atlas-avatar {
      font-size: 40px;
      width: 56px; height: 56px;
      background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .dia-atlas-avatar.small { font-size: 22px; width: 36px; height: 36px; }

    .dia-atlas-bubble {
      background: var(--color-info-soft);
      border: 1px solid var(--color-info-border);
      border-radius: 0 12px 12px 12px;
      padding: 16px 18px;
      display: flex; flex-direction: column; gap: 8px;
    }

    .dia-atlas-name {
      font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
      color: var(--primary);
    }

    .dia-atlas-bubble p { font-size: 15px; line-height: 1.6; color: var(--text); }

    /* Welcome */
    .dia-welcome-card { align-items: center; text-align: center; }

    .dia-value-prop {
      background: var(--color-info-soft);
      border: 1px solid var(--color-info-border);
      border-radius: 8px;
      padding: 14px 16px;
      text-align: left;
      width: 100%;
    }

    .dia-vp-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 8px;
    }

    .dia-vp-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 10px;
    }

    .dia-vp-list li { font-size: 13px; color: var(--color-info-text); }

    .dia-vp-duration { font-size: 12px; color: var(--text-sub); font-style: italic; }

    .dia-dimensions-preview {
      display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
    }

    .dia-dim-tag {
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 20px; padding: 4px 12px;
      font-size: 13px; color: var(--text-sub);
    }

    /* Buttons */
    .dia-btn-primary {
      background: var(--primary); color: #fff;
      border: none; border-radius: 8px;
      padding: 13px 28px; font-size: 15px; font-weight: 600;
      cursor: pointer; transition: opacity .15s;
      align-self: stretch; text-align: center;
    }
    .dia-btn-primary:hover:not(:disabled) { opacity: .9; }
    .dia-btn-primary:disabled { opacity: .6; cursor: default; }

    .dia-btn-secondary {
      background: transparent; color: var(--primary);
      border: 1px solid var(--primary); border-radius: 8px;
      padding: 10px 20px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: background .15s;
      white-space: nowrap;
    }
    .dia-btn-secondary:hover { background: color-mix(in srgb, var(--primary) 8%, transparent); }

    .dia-btn-ghost {
      background: none; border: none; color: var(--text-sub);
      font-size: 14px; cursor: pointer; padding: 8px 0;
      text-decoration: underline;
    }

    /* Form */
    .dia-form { display: flex; flex-direction: column; gap: 16px; }
    .dia-field { display: flex; flex-direction: column; gap: 6px; }
    .dia-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .dia-field label { font-size: 13px; font-weight: 600; color: var(--text-2); }
    .dia-req { color: var(--color-err); }
    .dia-field input, .dia-field select {
      border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 12px; font-size: 14px;
      font-family: var(--font); color: var(--text); background: var(--card);
      transition: border-color .15s;
    }
    .dia-field input:focus, .dia-field select:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
    }
    .dia-error {
      color: var(--color-err); font-size: 13px;
      background: var(--color-err-soft); border: 1px solid var(--color-err-border);
      border-radius: 6px; padding: 8px 12px;
    }

    /* Progress */
    .dia-progress-hd { margin-bottom: 20px; }
    .dia-progress-top {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 10px;
    }
    .dia-dim-chip {
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      color: var(--primary); border-radius: 20px;
      padding: 3px 12px; font-size: 12px; font-weight: 700;
    }
    .dia-dim-pos { font-size: 12px; color: var(--text-sub); font-weight: 500; }
    .dia-progress-bar-wrap {
      height: 8px; background: var(--border);
      border-radius: 4px; margin-bottom: 8px; overflow: hidden;
    }
    .dia-progress-bar {
      height: 100%; background: var(--primary);
      border-radius: 4px; transition: width .5s ease;
    }
    .dia-progress-foot {
      display: flex; justify-content: space-between; align-items: center;
    }
    .dia-progress-num { font-size: 13px; color: var(--text-sub); }
    .dia-progress-num strong { color: var(--text); }
    .dia-progress-time { font-size: 12px; color: var(--primary); font-weight: 600; }
    .dia-progress-motiv {
      margin: 10px 0 0; font-size: 13px; font-weight: 600; color: var(--primary);
      text-align: center; padding: 8px 14px; border-radius: var(--r);
      background: color-mix(in srgb, var(--primary) 8%, transparent);
    }

    /* Question */
    .dia-question-card { gap: 16px; }
    .dia-q-text { font-size: 17px; line-height: 1.6; font-weight: 500; }
    .dia-q-hint { font-size: 13px; color: var(--text-sub); font-style: italic; margin-top: 2px; }

    .dia-answer-btns {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
    }
    .dia-answer-btn {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 16px 8px; border: 2px solid var(--border);
      border-radius: 10px; background: var(--card);
      cursor: pointer; transition: border-color .15s, background .15s;
    }
    .dia-answer-btn:hover:not(:disabled) {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 5%, transparent);
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    .dia-answer-btn.selected {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }
    .dia-answer-btn:disabled { opacity: .7; cursor: default; transform: none; box-shadow: none; }
    .dia-answer-icon { font-size: 24px; }
    .dia-answer-label { font-size: 14px; font-weight: 600; }
    .dia-answer-sub { font-size: 11px; color: var(--text-sub); text-align: center; }

    /* Results */
    .dia-results-header {
      display: flex; align-items: center; gap: 32px;
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 28px 24px; margin-bottom: 16px;
    }

    .dia-gauge-wrap { position: relative; flex-shrink: 0; width: 120px; }
    .dia-gauge { width: 120px; }
    .dia-gauge-score {
      position: absolute; bottom: -4px; left: 50%;
      transform: translateX(-50%);
      font-size: 28px; font-weight: 800; letter-spacing: -1px;
    }
    .dia-gauge-score span { font-size: 14px; font-weight: 500; color: var(--text-sub); }

    .dia-niveau-badge {
      display: inline-block; padding: 5px 16px;
      border-radius: 20px; font-size: 14px; font-weight: 700;
      margin-bottom: 8px;
    }
    .dia-niveau-desc { font-size: 14px; color: var(--text-sub); line-height: 1.5; }

    .dia-section {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 24px;
      margin-bottom: 16px;
    }
    .dia-section h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; }

    /* Dim bars */
    .dia-dim-row {
      display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
    }
    .dia-dim-name { font-size: 13px; color: var(--text-sub); min-width: 100px; }
    .dia-dim-bar-wrap {
      flex: 1; height: 8px; background: var(--bg);
      border-radius: 4px; overflow: hidden;
    }
    .dia-dim-bar { height: 100%; border-radius: 4px; transition: width .8s ease; }
    .dia-dim-val { font-size: 13px; font-weight: 600; min-width: 32px; text-align: right; }

    /* Benchmark */
    .dia-bench-row {
      display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
    }
    .dia-bench-item {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      flex: 1; min-width: 72px;
      background: var(--bg); border-radius: 8px; padding: 12px 8px;
    }
    .dia-bench-item.highlight {
      background: color-mix(in srgb, var(--bench-color, var(--primary)) 12%, transparent);
      border: 1px solid var(--bench-color, var(--primary));
    }
    .dia-bench-val { font-size: 22px; font-weight: 700; }
    .dia-bench-label { font-size: 11px; color: var(--text-sub); text-align: center; }
    .dia-demo-badge {
      display: inline-block; font-size: 10px; font-weight: 700;
      background: var(--color-warn-bg); color: var(--color-warn-on); padding: 1px 8px;
      border-radius: 4px; margin-left: 8px; vertical-align: middle;
    }
    .dia-sample { font-size: 12px; color: var(--text-sub); margin-left: 8px; }

    /* Recommendations */
    .dia-rec {
      display: flex; gap: 16px; align-items: flex-start;
      padding: 14px 0; border-bottom: 1px solid var(--border);
    }
    .dia-rec:last-child { border-bottom: none; }
    .dia-rec-num {
      flex-shrink: 0; width: 28px; height: 28px;
      background: var(--primary); color: #fff;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700;
    }
    .dia-rec strong { font-size: 14px; display: block; margin-bottom: 4px; }
    .dia-rec p { font-size: 14px; color: var(--text-sub); line-height: 1.5; margin: 0; }

    /* Email */
    .dia-email-form {
      display: flex; gap: 10px; margin-top: 12px;
    }
    .dia-email-form input {
      flex: 1; border: 1px solid var(--border); border-radius: 8px;
      padding: 10px 12px; font-size: 14px;
      font-family: var(--font); color: var(--text); background: var(--card);
    }
    .dia-email-form input:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
    }

    .dia-restart { text-align: center; padding-top: 8px; }

    /* History */
    .dia-history-list {
      display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;
    }
    .dia-hist-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 16px 20px;
      display: flex; align-items: center; gap: 16px;
      transition: box-shadow .15s, border-color .15s;
    }
    .dia-hist-card:hover { box-shadow: var(--shadow-sm); border-color: var(--border-2); }
    .dia-hist-score {
      font-size: 24px; font-weight: 900; min-width: 54px;
      text-align: center; flex-shrink: 0; line-height: 1;
    }
    .dia-hist-score small {
      display: block; font-size: 11px; font-weight: 500;
      color: var(--text-sub); margin-top: 1px;
    }
    .dia-hist-info { flex: 1; min-width: 0; }
    .dia-hist-company {
      font-size: 14px; font-weight: 600; color: var(--text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .dia-hist-meta { font-size: 12px; color: var(--text-sub); margin-top: 3px; }
    .dia-hist-niveau {
      display: inline-block; padding: 2px 9px; border-radius: 20px;
      font-size: 11px; font-weight: 700; margin-left: 6px;
    }
    .dia-hist-view {
      font-size: 13px; font-weight: 600; color: var(--primary);
      background: none; border: 1px solid var(--primary);
      border-radius: 7px; padding: 6px 14px; cursor: pointer;
      flex-shrink: 0; white-space: nowrap; transition: background .12s;
    }
    .dia-hist-view:hover {
      background: color-mix(in srgb, var(--primary) 8%, transparent);
    }

    /* Step cards (3 prochaines étapes) */
    .dia-steps-grid {
      display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-top: 8px;
    }
    .dia-step-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--r-lg); padding: 20px 18px;
      display: flex; flex-direction: column; gap: 8px;
      transition: box-shadow .15s, border-color .15s;
    }
    .dia-step-card:hover { box-shadow: var(--shadow-sm); border-color: var(--border-2); }
    .dia-step-accent { border-left: 3px solid var(--primary); }
    .dia-step-num { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
    .dia-step-icon { font-size: 26px; }
    .dia-step-title { font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.3; }
    .dia-step-desc { font-size: 13px; color: var(--text-sub); line-height: 1.5; flex: 1; }
    .dia-step-btn {
      background: var(--primary); color: #fff;
      border: none; border-radius: var(--r);
      padding: 9px 14px; font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: var(--font);
      text-align: center; transition: opacity .15s; margin-top: 4px;
    }
    .dia-step-btn:hover { opacity: .88; }
    .dia-step-btn-outline {
      background: transparent; color: var(--primary);
      border: 1.5px solid var(--primary);
    }
    .dia-step-btn-outline:hover { background: var(--primary-a10); opacity: 1; }

    /* Responsive */
    @media (max-width: 540px) {
      .dia-field-row { grid-template-columns: 1fr; }
      .dia-answer-btns { grid-template-columns: 1fr; }
      .dia-results-header { flex-direction: column; text-align: center; }
      .dia-email-form { flex-direction: column; }
      .dia-dim-name { min-width: 80px; font-size: 12px; }
      .dia-steps-grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.appendChild(style);
}
