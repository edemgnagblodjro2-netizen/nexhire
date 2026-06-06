/* ═══════════════════════════════════════════════════════════════════════════
   NexHire Enterprise Assistant — SPA
   ═══════════════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  token: null,
  user:  null,
  tab:   "agent",
  docId: null,
};

// ── Connector metadata ─────────────────────────────────────────────────────
const CONNECTORS = {
  microsoft_365: { label: "Microsoft 365",  icon: "M",  color: "#0078d4", oauth: true  },
  salesforce:    { label: "Salesforce",     icon: "SF", color: "#00a1e0", oauth: false },
  servicenow:    { label: "ServiceNow",     icon: "SN", color: "#62d2cc", oauth: false },
  jira:          { label: "Jira",           icon: "J",  color: "#0052cc", oauth: false },
  sap:           { label: "SAP",            icon: "S",  color: "#0070b8", oauth: false },
  workday:       { label: "Workday",        icon: "W",  color: "#f78b1f", oauth: false },
};

// ── DOM shortcuts ──────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════════════════════════════════════
// VIEW ROUTING
// ═══════════════════════════════════════════════════════════════════════════

function showLanding() {
  $("view-landing").classList.remove("hidden");
  $("view-auth").classList.add("hidden");
  $("view-app").classList.add("hidden");
}

function showAuth(mode = "login") {
  $("view-landing").classList.add("hidden");
  $("view-auth").classList.remove("hidden");
  $("view-app").classList.add("hidden");
  $("auth-login").classList.toggle("hidden",  mode !== "login");
  $("auth-signup").classList.toggle("hidden", mode !== "signup");
  if (mode === "login")  { $("login-error").classList.add("hidden"); $("login-email").focus(); }
  if (mode === "signup") { $("signup-error").classList.add("hidden"); $("signup-success").classList.add("hidden"); $("signup-org").focus(); }
}

function showApp() {
  $("view-landing").classList.add("hidden");
  $("view-auth").classList.add("hidden");
  $("view-app").classList.remove("hidden");

  // User info
  const u = state.user;
  $("nav-user-email").textContent  = u?.email || "";
  $("nav-user-role").textContent   = u?.role  || "user";
  $("user-avatar").textContent     = (u?.email || "?")[0].toUpperCase();

  // Admin-only elements
  const isAdmin = ["admin", "owner"].includes(u?.role);
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));

  // Trial banner
  if (u?.subscription_status === "trialing") {
    const banner = $("trial-banner");
    $("trial-text").textContent = "Vous êtes en période d'essai gratuit (14 jours) — passez au Premium pour continuer.";
    banner.classList.remove("hidden");
  }

  // Notifications
  buildNotifications();

  // OAuth return params
  const params = new URLSearchParams(window.location.search);
  if (params.get("connected")) {
    switchTab("connectors");
    const name = CONNECTORS[params.get("connected")]?.label || params.get("connected");
    const banner = $("connector-success");
    banner.textContent = `✓ ${name} connecté avec succès via OAuth.`;
    banner.classList.remove("hidden");
    setTimeout(() => banner.classList.add("hidden"), 7000);
    window.history.replaceState({}, "", "/");
  } else if (params.get("oauth_error")) {
    switchTab("connectors");
    alert(`Erreur OAuth : ${params.get("oauth_error")}`);
    window.history.replaceState({}, "", "/");
  } else if (params.get("tab")) {
    switchTab(params.get("tab"));
    window.history.replaceState({}, "", "/");
  }

  loadActiveTab();
}

// Trial banner dismiss
$("trial-dismiss")?.addEventListener("click", () => {
  $("trial-banner").classList.add("hidden");
});

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

function buildNotifications() {
  const notifs = [];
  if (state.user?.subscription_status === "trialing") {
    notifs.push({ icon: "🕐", title: "Essai gratuit actif", body: "Passez au Premium pour continuer après la période d'essai — 99 $/mois." });
  }
  notifs.push({ icon: "✅", title: "Système opérationnel", body: "Tous les services NexHire fonctionnent normalement." });

  const list = $("notif-list");
  list.innerHTML = notifs.map(n => `
    <div class="notif-item">
      <div class="notif-item-icon">${n.icon}</div>
      <div class="notif-item-body"><strong>${n.title}</strong><span>${n.body}</span></div>
    </div>
  `).join("");

  $("notif-dot").classList.toggle("hidden", notifs.length === 0);
}

$("notif-btn")?.addEventListener("click", e => {
  e.stopPropagation();
  $("notif-dropdown").classList.toggle("hidden");
});

document.addEventListener("click", () => {
  $("notif-dropdown")?.classList.add("hidden");
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

function saveToken(t) { state.token = t; localStorage.setItem("nexhire_token", t); }
function clearAuth()  { state.token = null; state.user = null; localStorage.removeItem("nexhire_token"); }

async function apiCall(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) { clearAuth(); showAuth("login"); throw new Error("Session expirée."); }
  const data = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
  return data;
}

async function fetchMe() {
  state.user = await apiCall("/api/auth/me");
}

// Login
$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("login-btn");
  const err = $("login-error");
  btn.disabled = true; btn.textContent = "Connexion…"; err.classList.add("hidden");
  try {
    const data = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("login-email").value, password: $("login-password").value }),
    });
    const json = await data.json();
    if (!data.ok) throw new Error(json.detail || "Connexion échouée.");
    saveToken(json.access_token);
    await fetchMe();
    showApp();
  } catch (ex) {
    err.textContent = ex.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Se connecter";
  }
});

// Signup
$("signup-form").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = $("signup-btn");
  const err = $("signup-error");
  const suc = $("signup-success");
  btn.disabled = true; btn.textContent = "Création…";
  err.classList.add("hidden"); suc.classList.add("hidden");
  const fullName = `${$("signup-fname").value.trim()} ${$("signup-lname").value.trim()}`.trim();
  try {
    await apiCall("/api/auth/signup", "POST", {
      organization_name: $("signup-org").value.trim(),
      full_name: fullName,
      email: $("signup-email").value.trim(),
      password: $("signup-password").value,
    });
    suc.textContent = "Compte créé ! Vérifiez votre courriel pour activer votre compte, puis connectez-vous.";
    suc.classList.remove("hidden");
    setTimeout(() => showAuth("login"), 4000);
  } catch (ex) {
    err.textContent = ex.message; err.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Créer mon compte gratuitement";
  }
});

// Logout
$("logout-btn").addEventListener("click", () => {
  clearAuth();
  showLanding();
});

// ═══════════════════════════════════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(name) {
  state.tab = name;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-content").forEach(s => s.classList.toggle("hidden", s.id !== `tab-${name}`));
  loadActiveTab();
}

function loadActiveTab() {
  if (state.tab === "connectors") loadConnectors();
  if (state.tab === "audit")      loadAudit();
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT TAB
// ═══════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".prompt-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    $("agent-question").value = chip.dataset.prompt;
    $("agent-question").focus();
  });
});

$("agent-form").addEventListener("submit", async e => {
  e.preventDefault();
  const q = $("agent-question").value.trim();
  if (!q) return;
  $("agent-btn").disabled = true;
  $("agent-result").classList.add("hidden");
  $("agent-error").classList.add("hidden");
  $("agent-loading").classList.remove("hidden");
  try {
    const data = await apiCall("/api/agent/query", "POST", {
      question: q,
      assistant_mode: $("agent-mode").value,
      language:       $("agent-lang").value,
    });
    renderAgentResult(data);
  } catch (ex) {
    $("agent-error").textContent = ex.message;
    $("agent-error").classList.remove("hidden");
  } finally {
    $("agent-btn").disabled = false;
    $("agent-loading").classList.add("hidden");
  }
});

function renderAgentResult(data) {
  const sources = $("agent-sources");
  sources.innerHTML = "";
  if (data.sources?.length) {
    const lbl = document.createElement("span"); lbl.textContent = "Sources :"; sources.appendChild(lbl);
    data.sources.forEach(s => {
      const chip = document.createElement("span");
      chip.className = "source-chip";
      chip.textContent = CONNECTORS[s]?.label || s;
      sources.appendChild(chip);
    });
  } else {
    sources.style.display = "none";
  }
  $("agent-answer").textContent  = data.answer || "(aucune réponse)";
  $("agent-tools-json").textContent = JSON.stringify(data.tools_called, null, 2);
  $("agent-result").classList.remove("hidden");
  $("agent-result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTORS TAB
// ═══════════════════════════════════════════════════════════════════════════

$("refresh-connectors").addEventListener("click", loadConnectors);

async function loadConnectors() {
  const grid = $("connector-grid");
  grid.innerHTML = "<p class='muted'>Chargement…</p>";
  let connected = {};
  try {
    const list = await apiCall("/api/connectors");
    list.forEach(c => { connected[c.connector_type] = c; });
  } catch {
    grid.innerHTML = "<p class='error-text'>Impossible de charger les connecteurs.</p>";
    return;
  }
  grid.innerHTML = "";
  Object.entries(CONNECTORS).forEach(([type, meta]) => {
    grid.appendChild(buildConnectorCard(type, meta, connected[type] || null));
  });
}

function buildConnectorCard(type, meta, info) {
  const isConnected = info?.status === "connected";
  const connectedAt = info?.connected_at ? new Date(info.connected_at).toLocaleString("fr-CA") : null;

  const card = document.createElement("div");
  card.className = `connector-card${isConnected ? " connected" : ""}`;

  const head = document.createElement("div");
  head.className = "connector-head";
  head.innerHTML = `
    <div class="connector-icon" style="background:${meta.color}">${meta.icon}</div>
    <span class="connector-name">${meta.label}</span>
    <span class="connector-badge ${isConnected ? (meta.oauth ? "badge-oauth" : "badge-connected") : "badge-disconnected"}">
      ${isConnected ? (meta.oauth ? "OAuth ✓" : "Connecté") : "Déconnecté"}
    </span>`;
  card.appendChild(head);

  if (connectedAt) {
    const m = document.createElement("p");
    m.className = "connector-meta";
    m.textContent = `Connecté depuis le ${connectedAt}`;
    card.appendChild(m);
  }
  if (info?.last_error) {
    const er = document.createElement("p");
    er.className = "connector-error";
    er.textContent = info.last_error;
    card.appendChild(er);
  }

  const btn = document.createElement("button");
  if (isConnected) {
    btn.className = "btn-disconnect";
    btn.textContent = "Déconnecter";
    btn.addEventListener("click", () => doDisconnect(type, btn));
  } else if (meta.oauth) {
    btn.className = "btn-connect real";
    btn.textContent = "Connecter avec Microsoft";
    btn.addEventListener("click", () => doOAuthStart(type, btn));
  } else {
    btn.className = "btn-connect sim";
    btn.textContent = "Connecter (simulé)";
    btn.addEventListener("click", () => doConnect(type, btn));
  }
  card.appendChild(btn);
  return card;
}

async function doOAuthStart(type, btn) {
  btn.disabled = true; btn.textContent = "Redirection…";
  try {
    const data = await apiCall(`/api/connectors/${type}/oauth/start`, "POST");
    window.location.href = data.authorization_url;
  } catch (ex) {
    btn.disabled = false; btn.textContent = "Connecter avec Microsoft";
    alert(`Erreur : ${ex.message}`);
  }
}

async function doConnect(type, btn) {
  btn.disabled = true; btn.textContent = "Connexion…";
  try {
    await apiCall(`/api/connectors/${type}/connect`, "POST");
    await loadConnectors();
  } catch (ex) {
    btn.disabled = false; btn.textContent = "Connecter (simulé)";
    alert(`Erreur : ${ex.message}`);
  }
}

async function doDisconnect(type, btn) {
  if (!confirm(`Déconnecter ${CONNECTORS[type]?.label || type} ?`)) return;
  btn.disabled = true; btn.textContent = "Déconnexion…";
  try {
    await apiCall(`/api/connectors/${type}/disconnect`, "POST");
    await loadConnectors();
  } catch (ex) {
    btn.disabled = false; btn.textContent = "Déconnecter";
    alert(`Erreur : ${ex.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════

$("pdf-file").addEventListener("change", () => {
  $("file-label").textContent = $("pdf-file").files[0]?.name || "Choisir un fichier PDF";
});

$("upload-form").addEventListener("submit", async e => {
  e.preventDefault();
  const st = $("upload-status");
  st.textContent = "Extraction en cours…"; st.classList.remove("error");
  toggleDoc(true);
  try {
    const res = await fetch("/api/documents", { method: "POST", body: new FormData($("upload-form")) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erreur téléversement.");
    state.docId = data.id;
    $("preview").textContent = data.text_preview || "Aucun texte extractible.";
    st.textContent = `${data.filename} — ${data.character_count.toLocaleString()} caractères extraits.`;
    $("summary").textContent = data.warning || "Document prêt. Cliquez pour générer un résumé IA.";
    $("summary").classList.toggle("muted", Boolean(data.warning));
    $("chat-log").innerHTML = '<div class="message assistant">Document chargé. Posez votre question en français ou en anglais.</div>';
    toggleDoc(false);
  } catch (ex) {
    state.docId = null; st.textContent = ex.message; st.classList.add("error");
  }
});

$("summary-button").addEventListener("click", async () => {
  if (!state.docId) return;
  $("summary-button").disabled = true;
  $("summary").textContent = "Génération du résumé…";
  try {
    const res = await fetch(`/api/documents/${state.docId}/summary`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistant_mode: $("doc-mode").value, language: $("doc-lang").value }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail);
    $("summary").textContent = json.summary;
    $("summary").classList.remove("muted");
  } catch (ex) { $("summary").textContent = `Erreur : ${ex.message}`; }
  finally { $("summary-button").disabled = false; }
});

$("chat-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (!state.docId) return;
  const q = $("doc-question").value.trim();
  if (!q) return;
  appendMsg("user", q);
  $("doc-question").value = "";
  $("chat-button").disabled = true;
  try {
    const res = await fetch(`/api/documents/${state.docId}/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, assistant_mode: $("doc-mode").value, language: $("doc-lang").value }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail);
    appendMsg("assistant", json.answer);
  } catch (ex) { appendMsg("assistant", `Erreur : ${ex.message}`); }
  finally { $("chat-button").disabled = false; $("doc-question").focus(); }
});

function toggleDoc(disabled) {
  $("summary-button").disabled = disabled;
  $("doc-question").disabled   = disabled;
  $("chat-button").disabled    = disabled;
}

function appendMsg(role, text) {
  const d = document.createElement("div");
  d.className = `message ${role}`; d.textContent = text;
  $("chat-log").appendChild(d);
  $("chat-log").scrollTop = $("chat-log").scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT TAB
// ═══════════════════════════════════════════════════════════════════════════

$("refresh-audit").addEventListener("click", loadAudit);

async function loadAudit() {
  const wrap = $("audit-wrap");
  wrap.innerHTML = "<p class='muted' style='padding:20px'>Chargement…</p>";
  try {
    const resp = await apiCall("/api/audit");
    const logs = resp.logs || [];
    if (!logs.length) { wrap.innerHTML = "<p class='muted' style='padding:20px'>Aucun événement enregistré.</p>"; return; }
    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr><th>Date</th><th>Action</th><th>Utilisateur</th><th>Connecteur</th><th>Statut</th><th>IP</th></tr></thead>
      <tbody>${logs.map(l => `<tr>
        <td>${l.created_at ? new Date(l.created_at).toLocaleString("fr-CA") : "—"}</td>
        <td>${l.action || "—"}</td>
        <td>${l.user_id ? l.user_id.slice(0,8)+"…" : "—"}</td>
        <td>${l.connector || "—"}</td>
        <td class="${l.success !== false ? "badge-ok" : "badge-fail"}">${l.success !== false ? "✓" : "✗"}</td>
        <td>${l.ip_address || "—"}</td>
      </tr>`).join("")}</tbody>`;
    wrap.innerHTML = ""; wrap.appendChild(table);
  } catch (ex) {
    wrap.innerHTML = `<p class='error-text' style='padding:20px'>Erreur : ${ex.message}</p>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  const stored = localStorage.getItem("nexhire_token");
  if (!stored) { showLanding(); return; }
  state.token = stored;
  try {
    await fetchMe();
    showApp();
  } catch {
    clearAuth();
    showLanding();
  }
}

init();
