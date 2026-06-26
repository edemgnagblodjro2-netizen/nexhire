/**
 * AgentHub Platform — Workspace Shell
 * Navigation + catalogue d'apps + lazy loading des modules
 */

const $ = (id) => document.getElementById(id);

// ── State ─────────────────────────────────────────────────────────────────────
let _partner   = null;
let _apps      = [];
let _activeApp = null;
let _module    = null;

const _slug = () => {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[1] || null;
};

const _appSlugFromPath = () => {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[2] || null;
};

// Display name overrides — frontend aliases without touching app_registry
const APP_NAME_OVERRIDES = {
  "diagnostic-ia": "Parcours IA",
  "observatoire":  "Observatoire",
};

function _displayName(app) {
  return APP_NAME_OVERRIDES[app.slug] || app.name;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function boot() {
  const slug = _slug();
  if (!slug) { showError("URL de workspace invalide."); return; }

  try {
    const [partnerRes, appsRes] = await Promise.all([
      fetch(`/api/workspace/${slug}`, { credentials: "include" }),
      fetch(`/api/workspace/${slug}/apps`, { credentials: "include" }),
    ]);

    if (!partnerRes.ok) throw new Error((await partnerRes.json()).detail || "Workspace introuvable.");
    if (!appsRes.ok)    throw new Error((await appsRes.json()).detail    || "Erreur chargement apps.");

    _partner = await partnerRes.json();
    const data = await appsRes.json();
    _apps = data.apps || [];

    applyBranding(_partner);
    renderSidebar(_apps);

    const appFromUrl = _appSlugFromPath();
    if (appFromUrl) {
      const app = _apps.find(a => a.slug === appFromUrl && a.is_installed);
      if (app) { navigateTo(slug, app); return; }
    }

    showHomeDashboard();

  } catch (err) {
    showErrorBanner(err.message);
  }
}

// ── Branding ──────────────────────────────────────────────────────────────────
function applyBranding(partner) {
  document.title = partner.name + " · Accélérateur IA";
  $("ws-partner-name").textContent = partner.name;

  if (partner.logo_url) {
    const logo = $("ws-logo");
    logo.src = partner.logo_url;
    logo.style.display = "block";
  }

  if (partner.primary_color) {
    document.documentElement.style.setProperty("--primary", partner.primary_color);
    document.documentElement.style.setProperty("--primary-dk", partner.primary_color);
  }

  if (partner.favicon_url) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = partner.favicon_url;
  }
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar(apps) {
  const list = $("ws-app-list");
  list.innerHTML = "";

  if (!apps.length) {
    list.innerHTML = '<div style="padding:12px;font-size:13px;color:var(--muted)">Aucune application.</div>';
    return;
  }

  for (const app of apps) {
    const btn = document.createElement("button");
    btn.className = "ws-app-btn";
    btn.dataset.slug = app.slug;

    if (!app.is_installed) btn.disabled = true;

    let badge = "";
    if (app.catalog_status === "coming_soon") {
      badge = `<span class="ws-badge-soon">Bientôt</span>`;
    } else if (app.catalog_status === "available_beta") {
      badge = `<span class="ws-badge-beta">Bêta</span>`;
    }

    btn.innerHTML = `
      <span class="ws-app-icon">${app.icon || "📦"}</span>
      <span class="ws-app-label">
        <span class="ws-app-name">${_displayName(app)}</span>
      </span>
      ${badge}
    `;

    if (app.is_installed) {
      btn.addEventListener("click", () => navigateTo(_slug(), app));
    }

    list.appendChild(btn);
  }
}

function setActiveBtn(slug) {
  document.querySelectorAll(".ws-app-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.slug === slug);
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────
async function navigateTo(partnerSlug, app) {
  if (_activeApp === app.slug) return;

  if (_module && typeof _module.unmount === "function") {
    _module.unmount($("ws-app-container"));
  }
  _module    = null;
  _activeApp = null;

  setActiveBtn(app.slug);
  showLoading();

  try {
    const mod = await import(`/static/apps/${app.slug}/main.js`);
    _module    = mod.default;
    _activeApp = app.slug;

    const newPath = `/workspace/${partnerSlug}/${app.slug}`;
    if (location.pathname !== newPath) {
      history.pushState({ appSlug: app.slug }, "", newPath);
    }

    const context = {
      partnerSlug,
      partner:   _partner,
      appConfig: app.config || {},
      user:      null,
    };

    $("ws-app-container").innerHTML = "";
    _module.mount($("ws-app-container"), context);

  } catch (err) {
    _activeApp = null;
    setActiveBtn(null);
    showAppError(_displayName(app), err.message);
  }
}

window.addEventListener("popstate", (e) => {
  const appSlug = e.state?.appSlug || _appSlugFromPath();
  if (appSlug) {
    const app = _apps.find(a => a.slug === appSlug && a.is_installed);
    if (app) { navigateTo(_slug(), app); return; }
  }
  if (_module?.unmount) _module.unmount($("ws-app-container"));
  _module = null; _activeApp = null;
  setActiveBtn(null);
  showHomeDashboard();
});

// ── Home Dashboard ────────────────────────────────────────────────────────────
function showHomeDashboard() {
  const container = $("ws-app-container");
  setActiveBtn(null);

  const partnerName = _partner?.name || "AgentHub";

  const appCards = _apps.map(app => {
    const name = _displayName(app);
    if (app.is_installed) {
      return `
        <div class="wsh-app-card">
          <div class="wsh-app-card-icon">${app.icon || "📦"}</div>
          <div class="wsh-app-card-name">${name}</div>
          <button class="wsh-app-card-btn" data-slug="${app.slug}">
            Commencer →
          </button>
        </div>`;
    }
    return `
      <div class="wsh-app-card wsh-app-card-soon">
        <div class="wsh-app-card-icon">${app.icon || "📦"}</div>
        <div class="wsh-app-card-name">${name}</div>
        <span class="wsh-soon-badge">🚀 Disponible prochainement</span>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="wsh-home">
      <div class="wsh-hero">
        <div class="wsh-hero-eyebrow">Programme officiel · ${partnerName}</div>
        <h1 class="wsh-hero-title">Accélérateur IA</h1>
        <p class="wsh-hero-sub">Propulsé par AgentHub Platform</p>
      </div>

      <div class="wsh-progress-card">
        <div class="wsh-progress-header">
          <span>Votre progression</span>
          <strong>0 %</strong>
        </div>
        <div class="wsh-progress-track">
          <div class="wsh-progress-fill" style="width:0%"></div>
        </div>
        <p class="wsh-progress-hint">Commencez par le Parcours IA pour débuter votre progression.</p>
      </div>

      <div class="wsh-value-prop">
        <p class="wsh-vp-title">Ce programme vous permettra de :</p>
        <ul class="wsh-vp-list">
          <li>✓ Évaluer la maturité IA de votre organisation</li>
          <li>✓ Obtenir un plan d'action personnalisé</li>
          <li>✓ Vous comparer aux organisations de votre secteur</li>
          <li>✓ Suivre votre progression dans le temps</li>
        </ul>
        <p class="wsh-vp-duration">⏱ Durée estimée : 10 minutes</p>
      </div>

      <div>
        <h2 class="wsh-apps-title">Applications</h2>
        <div class="wsh-app-grid">${appCards}</div>
      </div>
    </div>`;

  container.querySelectorAll(".wsh-app-card-btn").forEach(btn => {
    const app = _apps.find(a => a.slug === btn.dataset.slug);
    if (app) btn.addEventListener("click", () => navigateTo(_slug(), app));
  });
}

// ── États visuels ─────────────────────────────────────────────────────────────
function showLoading() {
  $("ws-app-container").innerHTML = `
    <div class="ws-state">
      <div class="ws-spinner"></div>
      <div class="ws-state-msg">Chargement…</div>
    </div>`;
}

function showAppError(appName, msg) {
  $("ws-app-container").innerHTML = `
    <div class="ws-state">
      <div class="ws-state-icon">⚠️</div>
      <div class="ws-state-title">Impossible de charger ${appName}</div>
      <div class="ws-state-msg">${msg || "Une erreur est survenue. Veuillez réessayer."}</div>
    </div>`;
}

function showError(msg) {
  document.body.innerHTML = `
    <div class="ws-state" style="height:100vh">
      <div class="ws-state-icon">❌</div>
      <div class="ws-state-title">Workspace introuvable</div>
      <div class="ws-state-msg">${msg}</div>
    </div>`;
}

function showErrorBanner(msg) {
  const banner = $("ws-error-banner");
  banner.textContent = msg;
  banner.style.display = "block";
  setTimeout(() => { banner.style.display = "none"; }, 5000);
}

// ── Start ─────────────────────────────────────────────────────────────────────
boot();
