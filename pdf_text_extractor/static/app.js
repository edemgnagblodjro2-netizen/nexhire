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

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(uploadForm);

  setStatus("Extraction en cours...");
  disableAssistant(true);

  try {
    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });
    const payload = await parseJson(response);

    activeDocumentId = payload.id;
    preview.textContent = payload.text_preview || "Aucun texte extractible.";
    setStatus(
      `${payload.filename} traite: ${payload.character_count} caracteres extraits.`
    );
    summaryBox.textContent =
      payload.warning || "Document pret. Cliquez pour generer un resume IA.";
    summaryBox.classList.toggle("muted", Boolean(payload.warning));
    chatLog.innerHTML =
      '<div class="message assistant">Document charge. Posez votre question.</div>';
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
  summaryBox.textContent = "Generation du resume...";

  try {
    const response = await fetch(`/api/documents/${activeDocumentId}/summary`, {
      method: "POST",
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
      body: JSON.stringify({ question }),
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

async function parseJson(response) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || "Une erreur est survenue.");
  }
  return payload;
}
