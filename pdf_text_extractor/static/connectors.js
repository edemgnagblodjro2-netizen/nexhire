// Connector Hub — Phase 2 (connecteurs simulés)
// Dépend d'un token JWT stocké dans sessionStorage sous la clé "nexhire_token".
// Ce token est obtenu via POST /api/auth/login.

const CONNECTOR_LABELS = {
  microsoft_365: "Microsoft 365",
  salesforce: "Salesforce",
  servicenow: "ServiceNow",
  jira: "Jira",
  sap: "SAP",
  workday: "Workday",
};

function getToken() {
  return sessionStorage.getItem("nexhire_token");
}

function authHeaders() {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function apiCall(path, method = "GET") {
  const res = await fetch(path, { method, headers: authHeaders() });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

// ── Rendu ────────────────────────────────────────────────────────────────────

function renderConnectorCard(container, connectorType, data) {
  const isConnected = data?.status === "connected";
  const label = CONNECTOR_LABELS[connectorType] || connectorType;
  const connectedAt = data?.connected_at
    ? new Date(data.connected_at).toLocaleString("fr-CA")
    : null;

  const card = document.createElement("div");
  card.className = `connector-card ${isConnected ? "connected" : "disconnected"}`;
  card.dataset.type = connectorType;
  card.innerHTML = `
    <div class="connector-header">
      <span class="connector-name">${label}</span>
      <span class="connector-badge">${isConnected ? "Connecté" : "Déconnecté"}</span>
    </div>
    ${connectedAt ? `<div class="connector-meta">Depuis le ${connectedAt}</div>` : ""}
    ${data?.last_error ? `<div class="connector-error">${data.last_error}</div>` : ""}
    <button class="connector-btn" data-type="${connectorType}" data-action="${isConnected ? "disconnect" : "connect"}">
      ${isConnected ? "Déconnecter" : "Connecter (simulé)"}
    </button>
  `;
  container.appendChild(card);
}

async function loadConnectorHub(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "<p>Chargement des connecteurs…</p>";

  let connectors = {};
  try {
    const list = await apiCall("/api/connectors");
    for (const c of list) connectors[c.connector_type] = c;
  } catch (err) {
    container.innerHTML = `<p class="error">Erreur : ${err.message}</p>`;
    return;
  }

  container.innerHTML = "";
  for (const type of Object.keys(CONNECTOR_LABELS)) {
    renderConnectorCard(container, type, connectors[type] || null);
  }

  container.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const { type, action } = btn.dataset;
    btn.disabled = true;
    btn.textContent = "En cours…";

    try {
      await apiCall(`/api/connectors/${type}/${action}`, "POST");
      await loadConnectorHub(containerId);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = action === "connect" ? "Connecter (simulé)" : "Déconnecter";
      alert(`Erreur : ${err.message}`);
    }
  });
}

// ── Login rapide (si pas de token en session) ─────────────────────────────

async function quickLogin(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Connexion échouée");
  }
  const data = await res.json();
  sessionStorage.setItem("nexhire_token", data.access_token);
  return data;
}

export { loadConnectorHub, quickLogin, getToken };
