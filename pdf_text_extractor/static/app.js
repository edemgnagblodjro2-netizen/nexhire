/* ═══════════════════════════════════════════════════════════════════════════
   NexHire Enterprise Assistant — SPA frontend
   ═══════════════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  token: null,
  user:  null,        // { id, email, role, organization_id, subscription_status }
  tab:   "agent",
  docId: null,        // PDF document currently loaded
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

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const authScreen  = $("auth-screen");
const appScreen   = $("app-screen");
const loginForm   = $("login-form");
const loginEmail  = $("login-email");
const loginPwd    = $("login-password");
const loginBtn    = $("login-btn");
const loginError  = $("login-error");
const logoutBtn   = $("logout-btn");
const navEmail    = $("nav-user-email");
const navRole     = $("nav-user-role");

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════

function saveToken(t) {
  state.token = t;
  localStorage.setItem("nexhire_token", t);
}

function clearAuth() {
  state.token = null;
  state.user  = null;
  localStorage.removeItem("nexhire_token");
}

async function apiCall(path, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 401) { doLogout(); throw new Error("Session expirée — reconnectez-vous."); }
  const data = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
  return data;
}

async function fetchMe() {
  state.user = await apiCall("/api/auth/me");
}

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = "Connexion…";
  loginError.classList.add("hidden");
  try {
    const data = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: loginEmail.value, password: loginPwd.value }),
    });
    const json = await data.json();
    if (!data.ok) throw new Error(json.detail || "Connexion échouée.");
    saveToken(json.access_token);
    await fetchMe();
    showApp();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove("hidden");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Se connecter";
  }
});

logoutBtn.addEventListener("click", doLogout);

function doLogout() {
  clearAuth();
  authScreen.classList.remove("hidden");
  appScreen.classList.add("hidden");
  loginEmail.value = "";
  loginPwd.value   = "";
}

function showApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  navEmail.textContent = state.user?.email || "";
  navRole.textContent  = state.user?.role  || "user";

  // Show audit tab only for admin/owner
  const isAdmin = ["admin", "owner"].includes(state.user?.role);
  document.querySelectorAll(".admin-only").forEach(el => {
    el.classList.toggle("hidden", !isAdmin);
  });

  // Check OAuth return params
  const params = new URLSearchParams(window.location.search);
  if (params.get("connected")) {
    switchTab("connectors");
    const name = CONNECTORS[params.get("connected")]?.label || params.get("connected");
    const banner = $("connector-success");
    banner.textContent = `✓ ${name} connecté avec succès via OAuth.`;
    banner.classList.remove("hidden");
    setTimeout(() => banner.classList.add("hidden"), 6000);
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

// ═══════════════════════════════════════════════════════════════════════════
// TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(name) {
  state.tab = name;
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-content").forEach(s =>
    s.classList.toggle("hidden", s.id !== `tab-${name}`));
  loadActiveTab();
}

function loadActiveTab() {
  if (state.tab === "connectors") loadConnectors();
  if (state.tab === "audit")      loadAudit();
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENT TAB
// ═══════════════════════════════════════════════════════════════════════════

const agentForm    = $("agent-form");
const agentQ       = $("agent-question");
const agentBtn     = $("agent-btn");
const agentLoading = $("agent-loading");
const agentError   = $("agent-error");
const agentResult  = $("agent-result");
const agentSources = $("agent-sources");
const agentAnswer  = $("agent-answer");
const agentTools   = $("agent-tools-json");

document.querySelectorAll(".prompt-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    agentQ.value = chip.dataset.prompt;
    agentQ.focus();
  });
});

agentForm.addEventListener("submit", async e => {
  e.preventDefault();
  const question = agentQ.value.trim();
  if (!question) return;

  agentBtn.disabled = true;
  agentResult.classList.add("hidden");
  agentError.classList.add("hidden");
  agentLoading.classList.remove("hidden");

  try {
    const data = await apiCall("/api/agent/query", "POST", {
      question,
      assistant_mode: $("agent-mode").value,
      language:       $("agent-lang").value,
    });
    renderAgentResult(data);
  } catch (err) {
    agentError.textContent = err.message;
    agentError.classList.remove("hidden");
  } finally {
    agentBtn.disabled = false;
    agentLoading.classList.add("hidden");
  }
});

function renderAgentResult(data) {
  // Sources
  agentSources.innerHTML = "";
  if (data.sources?.length) {
    const label = document.createElement("span");
    label.style.cssText = "font-size:.78rem;color:var(--slate);font-weight:600;";
    label.textContent = "Sources : ";
    agentSources.appendChild(label);
    data.sources.forEach(s => {
      const chip = document.createElement("span");
      chip.className = "source-chip";
      chip.textContent = CONNECTORS[s]?.label || s;
      agentSources.appendChild(chip);
    });
  } else {
    agentSources.style.display = "none";
  }
  // Answer
  agentAnswer.textContent = data.answer || "(aucune réponse)";
  // Tools
  agentTools.textContent = JSON.stringify(data.tools_called, null, 2);
  agentResult.classList.remove("hidden");
  agentResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTORS TAB
// ═══════════════════════════════════════════════════════════════════════════

const connectorGrid = $("connector-grid");

$("refresh-connectors").addEventListener("click", loadConnectors);

async function loadConnectors() {
  connectorGrid.innerHTML = "<p class='muted'>Chargement…</p>";
  let connected = {};
  try {
    const list = await apiCall("/api/connectors");
    list.forEach(c => { connected[c.connector_type] = c; });
  } catch {
    connectorGrid.innerHTML = "<p class='error-text'>Impossible de charger les connecteurs.</p>";
    return;
  }

  connectorGrid.innerHTML = "";
  Object.entries(CONNECTORS).forEach(([type, meta]) => {
    const info = connected[type] || null;
    connectorGrid.appendChild(buildConnectorCard(type, meta, info));
  });
}

function buildConnectorCard(type, meta, info) {
  const isConnected = info?.status === "connected";
  const connectedAt = info?.connected_at
    ? new Date(info.connected_at).toLocaleString("fr-CA")
    : null;

  const card = document.createElement("div");
  card.className = `connector-card ${isConnected ? "connected" : ""}`;

  // Header
  const head = document.createElement("div");
  head.className = "connector-head";
  head.innerHTML = `
    <div class="connector-icon" style="background:${meta.color}">${meta.icon}</div>
    <span class="connector-name">${meta.label}</span>
    <span class="connector-badge ${isConnected ? (meta.oauth && isConnected ? "badge-oauth" : "badge-connected") : "badge-disconnected"}">
      ${isConnected ? (meta.oauth ? "OAuth ✓" : "Connecté") : "Déconnecté"}
    </span>
  `;
  card.appendChild(head);

  if (connectedAt) {
    const meta_ = document.createElement("p");
    meta_.className = "connector-meta";
    meta_.textContent = `Connecté depuis le ${connectedAt}`;
    card.appendChild(meta_);
  }
  if (info?.last_error) {
    const err = document.createElement("p");
    err.className = "connector-error";
    err.textContent = info.last_error;
    card.appendChild(err);
  }

  // Button
  const btn = document.createElement("button");
  if (isConnected) {
    btn.className = "btn-disconnect";
    btn.textContent = "Déconnecter";
    btn.addEventListener("click", () => doDisconnect(type, btn));
  } else if (meta.oauth) {
    btn.className = "btn-connect real";
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-3px;margin-right:6px"><path d="M11.5 2.999L2 7.5v9l9.5 4.5 9.5-4.5v-9z"/></svg>Connecter avec Microsoft`;
    btn.addEventListener("click", () => doOAuthStart(type, btn));
  } else {
    btn.className = "btn-connect sim";
    btn.textContent = `Connecter (simulé)`;
    btn.addEventListener("click", () => doConnect(type, btn));
  }
  card.appendChild(btn);
  return card;
}

async function doOAuthStart(type, btn) {
  btn.disabled = true;
  btn.textContent = "Redirection…";
  try {
    const data = await apiCall(`/api/connectors/${type}/oauth/start`, "POST");
    window.location.href = data.authorization_url;
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Connecter avec Microsoft";
    alert(`Erreur : ${err.message}`);
  }
}

async function doConnect(type, btn) {
  btn.disabled = true;
  btn.textContent = "Connexion…";
  try {
    await apiCall(`/api/connectors/${type}/connect`, "POST");
    await loadConnectors();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Connecter (simulé)";
    alert(`Erreur : ${err.message}`);
  }
}

async function doDisconnect(type, btn) {
  if (!confirm(`Déconnecter ${CONNECTORS[type]?.label || type} ?`)) return;
  btn.disabled = true;
  btn.textContent = "Déconnexion…";
  try {
    await apiCall(`/api/connectors/${type}/disconnect`, "POST");
    await loadConnectors();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Déconnecter";
    alert(`Erreur : ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTS TAB
// ═══════════════════════════════════════════════════════════════════════════

const uploadForm    = $("upload-form");
const uploadStatus  = $("upload-status");
const summaryBtn    = $("summary-button");
const summaryBox    = $("summary");
const preview       = $("preview");
const chatLog       = $("chat-log");
const chatForm      = $("chat-form");
const docQuestion   = $("doc-question");
const chatBtn       = $("chat-button");
const fileLabel     = $("file-label");
const pdfFile       = $("pdf-file");

pdfFile.addEventListener("change", () => {
  fileLabel.textContent = pdfFile.files[0]?.name || "Choisir un fichier PDF";
});

uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(uploadForm);
  setDocStatus("Extraction en cours…");
  toggleDocAssistant(true);

  try {
    const res = await fetch("/api/documents", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erreur téléversement.");
    state.docId = data.id;
    preview.textContent = data.text_preview || "Aucun texte extractible.";
    setDocStatus(`${data.filename} — ${data.character_count.toLocaleString()} caractères extraits.`);
    summaryBox.textContent = data.warning || "Document prêt. Cliquez pour générer un résumé IA.";
    summaryBox.classList.toggle("muted", Boolean(data.warning));
    chatLog.innerHTML = '<div class="message assistant">Document chargé. Posez votre question en français ou en anglais.</div>';
    toggleDocAssistant(false);
  } catch (err) {
    state.docId = null;
    setDocStatus(err.message, true);
  }
});

summaryBtn.addEventListener("click", async () => {
  if (!state.docId) return;
  summaryBtn.disabled = true;
  summaryBox.textContent = "Génération du résumé…";
  try {
    const data = await fetch(`/api/documents/${state.docId}/summary`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ assistant_mode: $("doc-mode").value, language: $("doc-lang").value }),
    });
    const json = await data.json();
    if (!data.ok) throw new Error(json.detail);
    summaryBox.textContent = json.summary;
    summaryBox.classList.remove("muted");
  } catch (err) {
    summaryBox.textContent = `Erreur : ${err.message}`;
  } finally {
    summaryBtn.disabled = false;
  }
});

chatForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (!state.docId) return;
  const q = docQuestion.value.trim();
  if (!q) return;
  appendMsg("user", q);
  docQuestion.value = "";
  chatBtn.disabled = true;
  try {
    const res = await fetch(`/api/documents/${state.docId}/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ question: q, assistant_mode: $("doc-mode").value, language: $("doc-lang").value }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.detail);
    appendMsg("assistant", json.answer);
  } catch (err) {
    appendMsg("assistant", `Erreur : ${err.message}`);
  } finally {
    chatBtn.disabled = false;
    docQuestion.focus();
  }
});

function toggleDocAssistant(disabled) {
  summaryBtn.disabled = disabled;
  docQuestion.disabled = disabled;
  chatBtn.disabled = disabled;
}

function setDocStatus(msg, isError = false) {
  uploadStatus.textContent = msg;
  uploadStatus.classList.toggle("error", isError);
}

function appendMsg(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
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
    if (!logs.length) {
      wrap.innerHTML = "<p class='muted' style='padding:20px'>Aucun événement enregistré.</p>";
      return;
    }
    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr>
        <th>Date</th><th>Action</th><th>Utilisateur</th>
        <th>Connecteur</th><th>Statut</th><th>IP</th>
      </tr></thead>
      <tbody>${logs.map(renderAuditRow).join("")}</tbody>
    `;
    wrap.innerHTML = "";
    wrap.appendChild(table);
  } catch (err) {
    wrap.innerHTML = `<p class='error-text' style='padding:20px'>Erreur : ${err.message}</p>`;
  }
}

function renderAuditRow(log) {
  const date = log.created_at ? new Date(log.created_at).toLocaleString("fr-CA") : "—";
  const ok   = log.success !== false;
  return `<tr>
    <td>${date}</td>
    <td>${log.action || "—"}</td>
    <td>${log.user_id ? log.user_id.slice(0, 8) + "…" : "—"}</td>
    <td>${log.connector || "—"}</td>
    <td class="${ok ? "badge-success" : "badge-fail"}">${ok ? "✓" : "✗"}</td>
    <td>${log.ip_address || "—"}</td>
  </tr>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  const stored = localStorage.getItem("nexhire_token");
  if (!stored) return; // stay on login screen

  state.token = stored;
  try {
    await fetchMe();
    showApp();
  } catch {
    clearAuth(); // token expired or invalid
  }
}

init();
