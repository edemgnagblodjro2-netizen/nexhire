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
  debutant:      "#ef4444",
  intermediaire: "#f59e0b",
  avance:        "#10b981",
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
    container.style.setProperty("--dia-primary", context.partner?.primary_color || "#2563eb");
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
    <div class="dia-wrap" style="display:flex;align-items:center;justify-content:center;min-height:300px">
      <div class="dia-spinner"></div>
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
    debutant: "#ef4444", intermediaire: "#f59e0b", avance: "#10b981",
  };
  const NIVEAU_LABEL = {
    debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé",
  };

  const cards = _state.historySessions.map(s => {
    const color = NIVEAU_COLOR[s.niveau] || "#6b7280";
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

  container.innerHTML = `
    <div class="dia-wrap">
      <div class="dia-progress-bar-wrap">
        <div class="dia-progress-bar" style="width:${progress}%"></div>
      </div>
      <div class="dia-progress-label">
        <span class="dia-dim-chip">${dimLabel}</span>
        <span class="dia-progress-count">${_state.answeredCore} / ${_state.totalCore} questions</span>
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
      <div class="dia-card" style="text-align:center;padding:48px 24px">
        <div style="font-size:48px;margin-bottom:16px">🧮</div>
        <div class="dia-spinner" style="margin:0 auto 16px"></div>
        <p style="font-size:16px;font-weight:600;color:var(--dia-text)">Calcul de votre IMAI…</p>
        <p style="font-size:14px;color:var(--dia-muted);margin-top:8px">
          Atlas analyse vos réponses et prépare vos recommandations.
        </p>
      </div>
    </div>`;
}

async function _finalize(container) {
  try {
    const results = await _post(`${API}/session/${_state.sessionId}/complete`, {}, 15000);
    _state.results = results;
    _state.step = "results";
    _render(container);
  } catch (err) {
    _showCalculatingError(container, err.message);
  }
}

function _showCalculatingError(container, msg) {
  container.innerHTML = `
    <div class="dia-wrap">
      <div class="dia-card" style="text-align:center;padding:48px 24px;gap:16px">
        <div style="font-size:40px">⚠️</div>
        <p style="font-size:15px;font-weight:600;color:var(--dia-text)">Une erreur est survenue</p>
        <p style="font-size:13px;color:var(--dia-muted)">${msg || "Impossible de finaliser le parcours."}</p>
        <button class="dia-btn-primary" id="dia-retry-btn">Réessayer</button>
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
  const r     = _state.results;
  const score = r.imai_score;
  const niv   = r.niveau;
  const color = NIVEAU_COLORS[niv] || "#2563eb";

  // Scores par dimension
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
    const demoNote = b.is_demo ? `<span class="dia-demo-badge">DÉMO</span>` : `<span class="dia-sample">${b.sample_size} organisations</span>`;
    benchHtml = `
      <div class="dia-section">
        <h3>Comparaison sectorielle ${demoNote}</h3>
        <div class="dia-bench-row">
          <div class="dia-bench-item">
            <span class="dia-bench-val">${b.imai_avg.toFixed(1)}</span>
            <span class="dia-bench-label">Moyenne</span>
          </div>
          <div class="dia-bench-item">
            <span class="dia-bench-val">${b.imai_p25.toFixed(1)}</span>
            <span class="dia-bench-label">25e percentile</span>
          </div>
          <div class="dia-bench-item highlight" style="--bench-color:${color}">
            <span class="dia-bench-val">${score.toFixed(1)}</span>
            <span class="dia-bench-label">Votre score</span>
          </div>
          <div class="dia-bench-item">
            <span class="dia-bench-val">${b.imai_p75.toFixed(1)}</span>
            <span class="dia-bench-label">75e percentile</span>
          </div>
        </div>
      </div>`;
  }

  // Recommandations
  const recsHtml = Object.entries(r.recommendations).map(([dim, text], i) => `
    <div class="dia-rec">
      <div class="dia-rec-num">${i + 1}</div>
      <div>
        <strong>${DIMENSION_LABELS[dim]}</strong>
        <p>${text}</p>
      </div>
    </div>`).join("");

  container.innerHTML = `
    <div class="dia-wrap dia-results-wrap">
      <div class="dia-results-header">
        <div class="dia-gauge-wrap">
          <svg class="dia-gauge" viewBox="0 0 120 70">
            <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#e5e7eb" stroke-width="10" stroke-linecap="round"/>
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

      <div class="dia-section">
        <h3>Scores par dimension</h3>
        ${dimBars}
      </div>

      ${benchHtml}

      <div class="dia-section">
        <h3>Vos 3 priorités d'action</h3>
        ${recsHtml}
      </div>

      <div class="dia-section" id="dia-gate-section">
        <h3>📄 Votre rapport complet</h3>
        <p style="font-size:14px;color:var(--dia-muted);margin-bottom:16px">Entrez votre courriel pour accéder à votre rapport personnalisé : forces, plan d'action 30/90/180 jours et recommandations ATLAS.</p>
        <form id="dia-email-form" class="dia-email-form" novalidate>
          <input id="dia-email-input" type="email" placeholder="votre@courriel.com" maxlength="254" required />
          <button type="submit" class="dia-btn-primary">Accéder au rapport →</button>
        </form>
        <div id="dia-email-msg" style="display:none;margin-top:10px;font-size:13px"></div>
        <div id="dia-rapport-revealed" style="display:none;margin-top:16px">
          <a class="dia-btn-primary" href="/rapport/${r.session_id}" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none">
            Voir mon rapport complet →
          </a>
          <p style="font-size:12px;color:var(--dia-muted);margin-top:8px;text-align:center">Un lien vous a également été envoyé par courriel.</p>
        </div>
      </div>

      <div class="dia-restart">
        <button class="dia-btn-ghost" id="dia-restart-btn">
          ${_state.historySessions?.length > 0 ? "← Retour à l'historique" : "← Recommencer le parcours"}
        </button>
      </div>
    </div>`;

  _el("dia-email-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = _el("dia-email-input").value.trim();
    if (!email) return;
    const btn = _el("dia-email-form").querySelector("button");
    btn.disabled = true;
    btn.textContent = "…";
    try {
      await _patch(`${API}/session/${_state.sessionId}/email`, { company_email: email });
      _revealRapport();
    } catch {
      const msg = _el("dia-email-msg");
      msg.textContent = "Erreur lors de l'envoi. Réessayez.";
      msg.style.display = "block";
      msg.style.color = "#ef4444";
      btn.disabled = false;
      btn.textContent = "Accéder au rapport →";
    }
  });

  _el("dia-restart-btn")?.addEventListener("click", () => {
    const hasHistory = _state.historySessions?.length > 0;
    _state.step = hasHistory ? "history" : "welcome";
    _state.sessionId = null;
    _state.results = null;
    _render(container);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _el(id) { return document.getElementById(id); }

function _showFormError(id, msg) {
  const el = _el(id);
  if (el) { el.textContent = msg; el.style.display = "block"; }
}

function _dimColor(val) {
  if (val >= 67) return "#10b981";
  if (val >= 34) return "#f59e0b";
  return "#ef4444";
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
    msg.style.color = "#10b981";
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
    :root {
      --dia-primary: #2563eb;
      --dia-text:    #111827;
      --dia-muted:   #6b7280;
      --dia-bg:      #f9fafb;
      --dia-card:    #ffffff;
      --dia-border:  #e5e7eb;
      --dia-radius:  12px;
    }

    .dia-wrap {
      max-width: 680px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }

    .dia-results-wrap { max-width: 720px; }

    .dia-card {
      background: var(--dia-card);
      border: 1px solid var(--dia-border);
      border-radius: var(--dia-radius);
      padding: 28px 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Atlas avatar + bubble */
    .dia-atlas-avatar {
      font-size: 40px;
      width: 56px; height: 56px;
      background: linear-gradient(135deg, var(--dia-primary), color-mix(in srgb, var(--dia-primary) 60%, #000));
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .dia-atlas-avatar.small { font-size: 22px; width: 36px; height: 36px; }

    .dia-atlas-bubble {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 0 12px 12px 12px;
      padding: 16px 18px;
      display: flex; flex-direction: column; gap: 8px;
    }

    .dia-atlas-name {
      font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em;
      color: var(--dia-primary);
    }

    .dia-atlas-bubble p { font-size: 15px; line-height: 1.6; color: var(--dia-text); }

    /* Welcome */
    .dia-welcome-card { align-items: center; text-align: center; }

    .dia-value-prop {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 14px 16px;
      text-align: left;
      width: 100%;
    }

    .dia-vp-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--dia-text);
      margin-bottom: 8px;
    }

    .dia-vp-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 10px;
    }

    .dia-vp-list li { font-size: 13px; color: #0369a1; }

    .dia-vp-duration { font-size: 12px; color: var(--dia-muted); font-style: italic; }

    .dia-dimensions-preview {
      display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
    }

    .dia-dim-tag {
      background: var(--dia-bg); border: 1px solid var(--dia-border);
      border-radius: 20px; padding: 4px 12px;
      font-size: 13px; color: var(--dia-muted);
    }

    /* Buttons */
    .dia-btn-primary {
      background: var(--dia-primary); color: #fff;
      border: none; border-radius: 8px;
      padding: 13px 28px; font-size: 15px; font-weight: 600;
      cursor: pointer; transition: opacity .15s;
      align-self: stretch; text-align: center;
    }
    .dia-btn-primary:hover:not(:disabled) { opacity: .9; }
    .dia-btn-primary:disabled { opacity: .6; cursor: default; }

    .dia-btn-secondary {
      background: transparent; color: var(--dia-primary);
      border: 1px solid var(--dia-primary); border-radius: 8px;
      padding: 10px 20px; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: background .15s;
      white-space: nowrap;
    }
    .dia-btn-secondary:hover { background: color-mix(in srgb, var(--dia-primary) 8%, transparent); }

    .dia-btn-ghost {
      background: none; border: none; color: var(--dia-muted);
      font-size: 14px; cursor: pointer; padding: 8px 0;
      text-decoration: underline;
    }

    /* Form */
    .dia-form { display: flex; flex-direction: column; gap: 16px; }
    .dia-field { display: flex; flex-direction: column; gap: 6px; }
    .dia-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .dia-field label { font-size: 14px; font-weight: 500; color: var(--dia-text); }
    .dia-req { color: #ef4444; }
    .dia-field input, .dia-field select {
      border: 1px solid var(--dia-border); border-radius: 8px;
      padding: 10px 12px; font-size: 14px;
      transition: border-color .15s;
    }
    .dia-field input:focus, .dia-field select:focus {
      outline: none; border-color: var(--dia-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--dia-primary) 15%, transparent);
    }
    .dia-error {
      color: #ef4444; font-size: 13px;
      background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 6px; padding: 8px 12px;
    }

    /* Progress */
    .dia-progress-bar-wrap {
      height: 4px; background: var(--dia-border);
      border-radius: 2px; margin-bottom: 10px; overflow: hidden;
    }
    .dia-progress-bar {
      height: 100%; background: var(--dia-primary);
      border-radius: 2px; transition: width .4s ease;
    }
    .dia-progress-label {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 16px;
    }
    .dia-dim-chip {
      background: color-mix(in srgb, var(--dia-primary) 12%, transparent);
      color: var(--dia-primary); border-radius: 20px;
      padding: 3px 12px; font-size: 12px; font-weight: 600;
    }
    .dia-progress-count { font-size: 13px; color: var(--dia-muted); }

    /* Question */
    .dia-question-card { gap: 16px; }
    .dia-q-text { font-size: 17px; line-height: 1.6; font-weight: 500; }
    .dia-q-hint { font-size: 13px; color: var(--dia-muted); font-style: italic; margin-top: 2px; }

    .dia-answer-btns {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;
    }
    .dia-answer-btn {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 16px 8px; border: 2px solid var(--dia-border);
      border-radius: 10px; background: var(--dia-card);
      cursor: pointer; transition: border-color .15s, background .15s;
    }
    .dia-answer-btn:hover:not(:disabled) {
      border-color: var(--dia-primary);
      background: color-mix(in srgb, var(--dia-primary) 5%, transparent);
    }
    .dia-answer-btn.selected {
      border-color: var(--dia-primary);
      background: color-mix(in srgb, var(--dia-primary) 10%, transparent);
    }
    .dia-answer-btn:disabled { opacity: .7; cursor: default; }
    .dia-answer-icon { font-size: 24px; }
    .dia-answer-label { font-size: 14px; font-weight: 600; }
    .dia-answer-sub { font-size: 11px; color: var(--dia-muted); text-align: center; }

    /* Spinner */
    .dia-spinner {
      width: 32px; height: 32px;
      border: 3px solid var(--dia-border);
      border-top-color: var(--dia-primary);
      border-radius: 50%;
      animation: dia-spin .7s linear infinite;
    }
    @keyframes dia-spin { to { transform: rotate(360deg); } }

    /* Results */
    .dia-results-header {
      display: flex; align-items: center; gap: 32px;
      background: var(--dia-card); border: 1px solid var(--dia-border);
      border-radius: var(--dia-radius); padding: 28px 24px; margin-bottom: 16px;
    }

    .dia-gauge-wrap { position: relative; flex-shrink: 0; width: 120px; }
    .dia-gauge { width: 120px; }
    .dia-gauge-score {
      position: absolute; bottom: -4px; left: 50%;
      transform: translateX(-50%);
      font-size: 28px; font-weight: 800; letter-spacing: -1px;
    }
    .dia-gauge-score span { font-size: 14px; font-weight: 500; color: var(--dia-muted); }

    .dia-niveau-badge {
      display: inline-block; padding: 5px 16px;
      border-radius: 20px; font-size: 14px; font-weight: 700;
      margin-bottom: 8px;
    }
    .dia-niveau-desc { font-size: 14px; color: var(--dia-muted); line-height: 1.5; }

    .dia-section {
      background: var(--dia-card); border: 1px solid var(--dia-border);
      border-radius: var(--dia-radius); padding: 24px;
      margin-bottom: 16px;
    }
    .dia-section h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; }

    /* Dim bars */
    .dia-dim-row {
      display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
    }
    .dia-dim-name { font-size: 13px; color: var(--dia-muted); min-width: 100px; }
    .dia-dim-bar-wrap {
      flex: 1; height: 8px; background: var(--dia-bg);
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
      background: var(--dia-bg); border-radius: 8px; padding: 12px 8px;
    }
    .dia-bench-item.highlight {
      background: color-mix(in srgb, var(--bench-color, #2563eb) 12%, transparent);
      border: 1px solid var(--bench-color, #2563eb);
    }
    .dia-bench-val { font-size: 22px; font-weight: 700; }
    .dia-bench-label { font-size: 11px; color: var(--dia-muted); text-align: center; }
    .dia-demo-badge {
      display: inline-block; font-size: 10px; font-weight: 700;
      background: #fef3c7; color: #92400e; padding: 1px 8px;
      border-radius: 4px; margin-left: 8px; vertical-align: middle;
    }
    .dia-sample { font-size: 12px; color: var(--dia-muted); margin-left: 8px; }

    /* Recommendations */
    .dia-rec {
      display: flex; gap: 16px; align-items: flex-start;
      padding: 14px 0; border-bottom: 1px solid var(--dia-border);
    }
    .dia-rec:last-child { border-bottom: none; }
    .dia-rec-num {
      flex-shrink: 0; width: 28px; height: 28px;
      background: var(--dia-primary); color: #fff;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700;
    }
    .dia-rec strong { font-size: 14px; display: block; margin-bottom: 4px; }
    .dia-rec p { font-size: 14px; color: var(--dia-muted); line-height: 1.5; margin: 0; }

    /* Email */
    .dia-email-form {
      display: flex; gap: 10px; margin-top: 12px;
    }
    .dia-email-form input {
      flex: 1; border: 1px solid var(--dia-border); border-radius: 8px;
      padding: 10px 12px; font-size: 14px;
    }
    .dia-email-form input:focus {
      outline: none; border-color: var(--dia-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--dia-primary) 15%, transparent);
    }

    .dia-restart { text-align: center; padding-top: 8px; }

    /* History */
    .dia-history-list {
      display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;
    }
    .dia-hist-card {
      background: var(--dia-card); border: 1px solid var(--dia-border);
      border-radius: var(--dia-radius); padding: 16px 20px;
      display: flex; align-items: center; gap: 16px;
    }
    .dia-hist-score {
      font-size: 24px; font-weight: 900; min-width: 54px;
      text-align: center; flex-shrink: 0; line-height: 1;
    }
    .dia-hist-score small {
      display: block; font-size: 11px; font-weight: 500;
      color: var(--dia-muted); margin-top: 1px;
    }
    .dia-hist-info { flex: 1; min-width: 0; }
    .dia-hist-company {
      font-size: 14px; font-weight: 600; color: var(--dia-text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .dia-hist-meta { font-size: 12px; color: var(--dia-muted); margin-top: 3px; }
    .dia-hist-niveau {
      display: inline-block; padding: 2px 9px; border-radius: 20px;
      font-size: 11px; font-weight: 700; margin-left: 6px;
    }
    .dia-hist-view {
      font-size: 13px; font-weight: 600; color: var(--dia-primary);
      background: none; border: 1px solid var(--dia-primary);
      border-radius: 7px; padding: 6px 14px; cursor: pointer;
      flex-shrink: 0; white-space: nowrap; transition: background .12s;
    }
    .dia-hist-view:hover {
      background: color-mix(in srgb, var(--dia-primary) 8%, transparent);
    }

    /* Responsive */
    @media (max-width: 540px) {
      .dia-field-row { grid-template-columns: 1fr; }
      .dia-answer-btns { grid-template-columns: 1fr; }
      .dia-results-header { flex-direction: column; text-align: center; }
      .dia-email-form { flex-direction: column; }
      .dia-dim-name { min-width: 80px; font-size: 12px; }
    }
  `;
  document.head.appendChild(style);
}
