let activeDocumentId = null;

const uploadForm = document.querySelector("#upload-form");
const uploadStatus = document.querySelector("#upload-status");
const summaryButton = document.querySelector("#summary-button");
const summaryBox = document.querySelector("#summary");
const preview = document.querySelector("#preview");
const chatForm = document.querySelector("#chat-form");
const questionInput = document.querySelector("#question");
const chatButton = document.querySelector("#chat-button");
const chatLog = document.querySelector("#chat-log");
const assistantMode = document.querySelector("#assistant-mode");
const language = document.querySelector("#language");
const promptButtons = document.querySelectorAll("[data-prompt-fr]");
const slides = document.querySelectorAll(".slide");
const sliderDots = document.querySelectorAll(".slider-dot");
const planButtons = document.querySelectorAll(".select-plan");
const signupPlan = document.querySelector("#signup-plan");
const authTabs = document.querySelectorAll(".auth-tab");
const signupForm = document.querySelector("#signup-form");
const loginForm = document.querySelector("#login-form");
const authStatus = document.querySelector("#auth-status");
const connectorButtons = document.querySelectorAll("[data-connector-id]");
const connectorStatus = document.querySelector("#connector-status");
let activeSlide = 0;
const selectedConnectorIds = new Set();

const translations = {
  fr: {
    extracting: "Extraction en cours...",
    noText: "Aucun texte extractible.",
    processed: (filename, count) =>
      `${filename} traite: ${count} caracteres extraits.`,
    ready: "Document pret. Cliquez pour generer un resume IA.",
    documentLoaded:
      "Document charge. Posez votre question en francais ou en anglais.",
    generating: "Generation du resume...",
  },
  en: {
    extracting: "Extracting text...",
    noText: "No extractable text.",
    processed: (filename, count) =>
      `${filename} processed: ${count} characters extracted.`,
    ready: "Document ready. Click to generate an AI summary.",
    documentLoaded: "Document loaded. Ask your question in English or French.",
    generating: "Generating summary...",
  },
};

language.addEventListener("change", updateUiLanguage);
updateUiLanguage();
loadConnectors();

sliderDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    showSlide(Number(dot.dataset.slide));
  });
});

window.setInterval(() => {
  showSlide((activeSlide + 1) % slides.length);
}, 6000);

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    signupPlan.value = button.dataset.plan;
    document.querySelector("#auth").scrollIntoView({ behavior: "smooth" });
    showAuthTab("signup");
    setAuthStatus(
      button.dataset.plan === "annual"
        ? "Plan annuel selectionne: 990 $/annee apres 14 jours gratuits."
        : "Plan mensuel selectionne: 99 $/mois apres 14 jours gratuits."
    );
  });
});

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => showAuthTab(tab.dataset.authTab));
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(signupForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    setAuthStatus(
      `Compte cree pour ${data.email}. Essai gratuit actif ${data.trial_days} jours, plan ${data.plan_label}.`
    );
  } catch (error) {
    setAuthStatus(error.message, true);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    setAuthStatus(`Connexion reussie. Bienvenue ${data.name}.`);
  } catch (error) {
    setAuthStatus(error.message, true);
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(uploadForm);

  setStatus(t("extracting"));
  disableAssistant(true);

  try {
    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });
    const payload = await parseJson(response);

    activeDocumentId = payload.id;
    preview.textContent = payload.text_preview || t("noText");
    setStatus(t("processed", payload.filename, payload.character_count));
    summaryBox.textContent = payload.warning || t("ready");
    summaryBox.classList.toggle("muted", Boolean(payload.warning));
    chatLog.innerHTML = `<div class="message assistant">${t("documentLoaded")}</div>`;
    disableAssistant(false);
  } catch (error) {
    activeDocumentId = null;
    setStatus(error.message, true);
    disableAssistant(true);
  }
});

summaryButton.addEventListener("click", async () => {
  if (!activeDocumentId) return;

  summaryButton.disabled = true;
  summaryBox.textContent = t("generating");

  try {
    const response = await fetch(`/api/documents/${activeDocumentId}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assistantContext()),
    });
    const payload = await parseJson(response);
    summaryBox.textContent = payload.summary;
  } catch (error) {
    summaryBox.textContent = error.message;
  } finally {
    summaryButton.disabled = false;
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeDocumentId) return;

  const question = questionInput.value.trim();
  if (!question) return;

  appendMessage("user", question);
  questionInput.value = "";
  chatButton.disabled = true;

  try {
    const response = await fetch(`/api/documents/${activeDocumentId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, ...assistantContext() }),
    });
    const payload = await parseJson(response);
    appendMessage("assistant", payload.answer);
  } catch (error) {
    appendMessage("assistant", error.message);
  } finally {
    chatButton.disabled = false;
    questionInput.focus();
  }
});

connectorButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const connectorId = button.dataset.connectorId;
    await connectConnector(connectorId);
  });
});

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    questionInput.value = button.dataset[`prompt${language.value === "en" ? "En" : "Fr"}`];
    questionInput.focus();
  });
});

function disableAssistant(disabled) {
  summaryButton.disabled = disabled;
  questionInput.disabled = disabled;
  chatButton.disabled = disabled;
}

function setStatus(message, isError = false) {
  uploadStatus.textContent = message;
  uploadStatus.classList.toggle("error", isError);
}

function appendMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = text;
  chatLog.appendChild(message);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function assistantContext() {
  return {
    assistant_mode: assistantMode.value,
    language: language.value,
    connector_ids: Array.from(selectedConnectorIds),
  };
}

async function loadConnectors() {
  try {
    const response = await fetch("/api/connectors");
    const connectors = await parseJson(response);
    connectors.forEach((connector) => updateConnectorButtons(connector));
  } catch (error) {
    if (connectorStatus) {
      connectorStatus.textContent = error.message;
      connectorStatus.classList.add("error");
    }
  }
}

async function connectConnector(connectorId) {
  try {
    const response = await fetch(`/api/connectors/${connectorId}/connect`, {
      method: "POST",
    });
    const connector = await parseJson(response);
    selectedConnectorIds.add(connector.id);
    updateConnectorButtons(connector);
    connectorStatus.classList.remove("error");
    connectorStatus.textContent = `${connector.name} connecte au CivicAI Chat (${connector.priority_label}).`;
  } catch (error) {
    connectorStatus.textContent = error.message;
    connectorStatus.classList.add("error");
  }
}

function updateConnectorButtons(connector) {
  document
    .querySelectorAll(`[data-connector-id="${connector.id}"]`)
    .forEach((button) => {
      button.classList.toggle("connected", connector.status === "connected");
      button.dataset.status = connector.status;
      button.setAttribute(
        "aria-pressed",
        connector.status === "connected" ? "true" : "false",
      );
      if (button.classList.contains("connector-button")) {
        const phase = button.querySelector("span");
        if (phase) phase.textContent = `${connector.priority_label} · ${connector.status}`;
      }
    });
}

function showSlide(index) {
  activeSlide = index;
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === index);
  });
  sliderDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === index);
  });
}

function showAuthTab(tabName) {
  authTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authTab === tabName);
  });
  signupForm.classList.toggle("active", tabName === "signup");
  loginForm.classList.toggle("active", tabName === "login");
}

function setAuthStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.classList.toggle("error", isError);
}

function updateUiLanguage() {
  const currentLanguage = language.value;

  document.querySelectorAll("[data-i18n-fr]").forEach((element) => {
    element.textContent = element.dataset[`i18n${currentLanguage === "en" ? "En" : "Fr"}`];
  });

  document.querySelectorAll("[data-placeholder-fr]").forEach((element) => {
    element.placeholder =
      element.dataset[`placeholder${currentLanguage === "en" ? "En" : "Fr"}`];
  });

  if (!activeDocumentId && preview.dataset.emptyFr) {
    preview.textContent =
      preview.dataset[`empty${currentLanguage === "en" ? "En" : "Fr"}`];
  }

  if (!activeDocumentId) {
    summaryBox.textContent =
      currentLanguage === "en"
        ? "Upload a PDF to enable the summary."
        : "Televersez un PDF pour activer le resume.";
    chatLog.innerHTML = `<div class="message assistant">${
      currentLanguage === "en"
        ? "Ask a question after upload. Posez votre question en francais ou en anglais."
        : "Posez une question apres le televersement. Ask in French or English."
    }</div>`;
  }
}

function t(key, ...args) {
  const value = translations[language.value][key];
  return typeof value === "function" ? value(...args) : value;
}

async function parseJson(response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || "Une erreur est survenue.");
  }
  return payload;
}
