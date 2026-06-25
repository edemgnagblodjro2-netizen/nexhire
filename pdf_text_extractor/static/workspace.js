/**
 * AgentHub Platform — Workspace Shell
 * Navigation + catalogue d'apps + lazy loading des modules
 */

const $ = (id) => document.getElementById(id);

// ── State ─────────────────────────────────────────────────────────────────────
let _partner   = null;   // config partenaire chargée depuis /api/workspace/{slug}
let _apps      = [];     // catalogue complet
let _activeApp = null;   // slug de l'app montée
let _module    = null;   // module JS actif ({ mount, unmount })

// Extrait le slug depuis /workspace/{slug}/... ou /workspace/{slug}
const _slug = () => {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[1] || null;   // ['workspace', 'cci3r', 'diagnostic-ia'] → 'cci3r'
};

const _appSlugFromPath = () => {
  const parts = location.pathname.split("/").filter(Boolean);
  return parts[2] || null;   // 'diagnostic-ia' or null
};

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

    // Naviguer vers l'app dans l'URL si présente
    const appFromUrl = _appSlugFromPath();
    if (appFromUrl) {
      const app = _apps.find(a => a.slug === appFromUrl && a.is_installed);
      if (app) navigateTo(slug, app);
    }

  } catch (err) {
    showErrorBanner(err.message);
  }
}

// ── Branding ──────────────────────────────────────────────────────────────────
function applyBranding(partner) {
  document.title = partner.name + " · AgentHub";
  $("ws-partner-name").textContent = partner.name;

  if (partner.logo_url) {
    const logo = $("ws-logo");
    logo.src = partner.logo_url;
    logo.style.display = "block";
    $("ws-partner-name").style.display = "none";
  }

  if (partner.primary_color) {
    document.documentElement.style.setProperty("--primary", partner.primary_color);
    // Génère une version légèrement plus foncée pour les hovers
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

    const isComing = !app.is_installed;
    if (isComing) btn.disabled = true;

    let badge = "";
    if (app.catalog_status === "coming_soon") {
      badge = `<span class="ws-badge-soon">Bientôt</span>`;
    } else if (app.catalog_status === "available_beta") {
      badge = `<span class="ws-badge-beta">Bêta</span>`;
    }

    btn.innerHTML = `
      <span class="ws-app-icon">${app.icon || "📦"}</span>
      <span class="ws-app-label">
        <span class="ws-app-name">${app.name}</span>
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

  // Unmount app précédente
  if (_module && typeof _module.unmount === "function") {
    _module.unmount($("ws-app-container"));
  }
  _module    = null;
  _activeApp = null;

  setActiveBtn(app.slug);
  showLoading();

  try {
    // Import dynamique du module app
    const mod = await import(`/static/apps/${app.slug}/main.js`);
    _module    = mod.default;
    _activeApp = app.slug;

    // Mettre à jour l'URL sans recharger la page
    const newPath = `/workspace/${partnerSlug}/${app.slug}`;
    if (location.pathname !== newPath) {
      history.pushState({ appSlug: app.slug }, "", newPath);
    }

    // Contexte passé à l'app
    const context = {
      partnerSlug,
      partner:  _partner,
      appConfig: app.config || {},
      user:     null,   // injecté par l'app si auth nécessaire
    };

    $("ws-app-container").innerHTML = "";
    _module.mount($("ws-app-container"), context);

  } catch (err) {
    _activeApp = null;
    setActiveBtn(null);
    showAppError(app.name, err.message);
  }
}

// Gestion du bouton Retour du navigateur
window.addEventListener("popstate", (e) => {
  const appSlug = e.state?.appSlug || _appSlugFromPath();
  if (appSlug) {
    const app = _apps.find(a => a.slug === appSlug && a.is_installed);
    if (app) navigateTo(_slug(), app);
  } else {
    if (_module?.unmount) _module.unmount($("ws-app-container"));
    _module = null; _activeApp = null;
    setActiveBtn(null);
    showWelcome();
  }
});

// ── États visuels ─────────────────────────────────────────────────────────────
function showLoading() {
  $("ws-app-container").innerHTML = `
    <div class="ws-state">
      <div class="ws-spinner"></div>
      <div class="ws-state-msg">Chargement…</div>
    </div>`;
}

function showWelcome() {
  $("ws-app-container").innerHTML = `
    <div class="ws-state" id="ws-welcome">
      <div class="ws-state-icon">🚀</div>
      <div class="ws-state-title">Bienvenue sur AgentHub Platform</div>
      <div class="ws-state-msg">Sélectionnez une application dans le menu pour commencer.</div>
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
