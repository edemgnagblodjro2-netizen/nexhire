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
  };
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
