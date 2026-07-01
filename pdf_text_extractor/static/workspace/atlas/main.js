/**
 * ATLAS AI — Copilote IA
 * Connecté à /api/agent/query — OpenAI GPT-4o via connecteurs organisationnels
 */

const CSS = `<style>
.atlas-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--topbar-h, 56px));
  background: #f8fafc;
}

.atlas-header {
  padding: 14px 24px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.atlas-header-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 99px;
  letter-spacing: .02em;
}

.atlas-header-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.atlas-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  flex-shrink: 0;
}

.atl-controls {
  margin-left: auto;
  display: flex;
  gap: 6px;
  align-items: center;
}

.atl-select {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 4px 7px;
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
  cursor: pointer;
  outline: none;
  font-family: inherit;
}

.atl-select:hover { border-color: #6366f1; }

.atl-quota-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: #64748b;
  white-space: nowrap;
}

.atl-quota-track {
  width: 60px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
}

.atl-quota-fill {
  height: 100%;
  border-radius: 99px;
  transition: width .4s;
}

.atlas-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

.atlas-msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 82%;
  animation: atl-in .18s ease;
}

@keyframes atl-in {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

.atlas-msg.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.atlas-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.atlas-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.atl-msg-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.atlas-bubble {
  padding: 12px 16px;
  font-size: 13.5px;
  line-height: 1.65;
  color: #0f172a;
}

.atlas-msg:not(.user) .atlas-bubble {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px 12px 12px 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.atlas-msg.user .atlas-bubble {
  background: #6366f1;
  color: #fff;
  border-radius: 12px 4px 12px 12px;
}

.atlas-bubble strong { font-weight: 700; }
.atlas-bubble p { margin: 0 0 7px; }
.atlas-bubble p:last-child { margin: 0; }
.atlas-bubble ul { margin: 6px 0; padding-left: 18px; }
.atlas-bubble li { margin-bottom: 4px; }

.atlas-bubble-err {
  background: #fef2f2 !important;
  border-color: #fecaca !important;
  color: #991b1b !important;
  border-radius: 4px 12px 12px 12px !important;
}

.atlas-warning {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  border: 1px solid;
}

.atlas-warning.warn-connector {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #92400e;
}

.atlas-warning.warn-simulated {
  background: #fffbeb;
  border-color: #fde68a;
  color: #78350f;
}

.atlas-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.atlas-source-chip {
  padding: 2px 9px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 99px;
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.atlas-typing-bubble {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 4px 12px 12px 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.atlas-typing-bubble span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3b8;
  animation: atl-dot .8s ease-in-out infinite;
}

.atlas-typing-bubble span:nth-child(2) { animation-delay: .15s; }
.atlas-typing-bubble span:nth-child(3) { animation-delay: .30s; }

@keyframes atl-dot {
  0%, 60%, 100% { opacity: .3; transform: translateY(0); }
  30%           { opacity: 1;  transform: translateY(-4px); }
}

.atlas-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 28px 16px;
}

.atlas-chip {
  padding: 7px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 99px;
  font-size: 12.5px;
  color: #475569;
  background: #fff;
  cursor: pointer;
  transition: border-color .12s, color .12s, background .12s;
  white-space: nowrap;
}

.atlas-chip:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: #f5f3ff;
}

.atlas-input-area {
  padding: 14px 24px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
}

.atlas-input {
  flex: 1;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13.5px;
  font-family: inherit;
  resize: none;
  outline: none;
  max-height: 120px;
  line-height: 1.5;
  color: #0f172a;
  background: #f8fafc;
  transition: border-color .12s, background .12s;
}

.atlas-input:focus {
  border-color: #6366f1;
  background: #fff;
}

.atlas-input::placeholder { color: #94a3b8; }

.atl-vision-btn {
  width: 38px;
  height: 38px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  background: #f8fafc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  flex-shrink: 0;
  transition: border-color .12s, color .12s;
}

.atl-vision-btn:hover { border-color: #6366f1; color: #6366f1; }

.atlas-send-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #6366f1;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  transition: background .12s, transform .1s;
}

.atlas-send-btn:hover:not(:disabled) { background: #4f46e5; }
.atlas-send-btn:active:not(:disabled) { transform: scale(.94); }
.atlas-send-btn:disabled { background: #e2e8f0; cursor: not-allowed; }

.atlas-send-btn svg, .atl-vision-btn svg {
  width: 16px; height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 680px) {
  .atlas-messages { padding: 16px; }
  .atlas-suggestions { padding: 0 16px 12px; }
  .atlas-input-area { padding: 10px 16px; }
  .atlas-msg { max-width: 92%; }
  .atl-controls { margin-left: 0; width: 100%; }
}
</style>`;

const SUGGESTIONS = [
  "Analyse mes licences inutilisées",
  "Résume l'état de mon budget",
  "Quelles sont mes priorités IA ?",
  "Qu'est-ce que la Loi 25 ?",
  "Comment optimiser mes coûts IT ?",
];

const WELCOME_MSG = `Bonjour ! Je suis **ATLAS**, votre copilote IA connecté à vos données organisationnelles.\n\nJe peux analyser vos licences, votre budget, vos contrats, vos effectifs et vous guider dans votre transformation numérique — en m'appuyant sur vos connecteurs actifs.\n\nComment puis-je vous aider aujourd'hui ?`;

// ── State ──────────────────────────────────────────────────────────────────────

let _msgs      = [];
let _container = null;
let _isTyping  = false;
let _lang      = 'fr';
let _mode      = 'enterprise';

// ── API helpers ────────────────────────────────────────────────────────────────

function _token() {
  return localStorage.getItem('nexhire_token') || '';
}

function _headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${_token()}` };
}

async function _loadQuota() {
  try {
    const r = await fetch('/api/agent/quota', { headers: _headers(), credentials: 'include' });
    if (!r.ok || !_container) return;
    const q = await r.json();
    const el = _container.querySelector('#atl-quota');
    if (!el) return;
    const pct = Math.min(100, Math.round(q.used / q.limit * 100));
    const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
    el.innerHTML = `
      <span>${q.used} / ${q.limit}</span>
      <div class="atl-quota-track">
        <div class="atl-quota-fill" style="width:${pct}%;background:${color}"></div>
      </div>`;
  } catch (_) {}
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function _md(raw) {
  let s = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#{1,3}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return s.split(/\n\n+/).map(block => {
    block = block.trim();
    if (!block) return '';
    const lines = block.split('\n');
    const allList = lines.every(l => /^[-•*]\s/.test(l) || /^\d+\.\s/.test(l));
    if (allList) {
      return '<ul>' + lines.map(l => `<li>${l.replace(/^[-•*\d.]+\s+/, '')}</li>`).join('') + '</ul>';
    }
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

// ── Render ────────────────────────────────────────────────────────────────────

function _addMessage(role, text, meta = {}) {
  _msgs.push({ role, text, ...meta });
  _renderMessages();
}

function _showTyping() {
  const msgs = _container?.querySelector('.atlas-messages');
  if (!msgs) return;
  const el = document.createElement('div');
  el.className = 'atlas-msg';
  el.id = 'atl-typing';
  el.innerHTML = `
    <div class="atlas-avatar">✨</div>
    <div class="atlas-typing-bubble"><span></span><span></span><span></span></div>`;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function _hideTyping() {
  document.getElementById('atl-typing')?.remove();
}

function _renderMessages() {
  const msgs = _container?.querySelector('.atlas-messages');
  if (!msgs) return;

  msgs.innerHTML = _msgs.map(m => {
    const isUser  = m.role === 'user';
    const isError = m.role === 'error';

    const escapedText = m.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const bubbleHtml = isUser || isError
      ? `<div class="atlas-bubble${isError ? ' atlas-bubble-err' : ''}">${escapedText}</div>`
      : `<div class="atlas-bubble">${_md(m.text)}</div>`;

    const warningsHtml = [
      m.connectorWarnings?.length
        ? `<div class="atlas-warning warn-connector">⚠️ Connecteurs en erreur : ${m.connectorWarnings.join(', ')} — données potentiellement incomplètes.</div>`
        : '',
      m.hasSimulated
        ? `<div class="atlas-warning warn-simulated">🔶 Certaines données sont simulées (connecteurs non configurés).</div>`
        : '',
    ].join('');

    const sourcesHtml = m.sources?.length
      ? `<div class="atlas-sources">${m.sources.map(s => `<span class="atlas-source-chip">${s}</span>`).join('')}</div>`
      : '';

    if (isUser) {
      return `
        <div class="atlas-msg user">
          <div class="atlas-user-avatar">Vous</div>
          ${bubbleHtml}
        </div>`;
    }
    return `
      <div class="atlas-msg">
        <div class="atlas-avatar">✨</div>
        <div class="atl-msg-body">
          ${warningsHtml}
          ${bubbleHtml}
          ${sourcesHtml}
        </div>
      </div>`;
  }).join('');

  msgs.scrollTop = msgs.scrollHeight;
}

// ── Send message ──────────────────────────────────────────────────────────────

function _setInputState(disabled) {
  const input   = _container?.querySelector('.atlas-input');
  const sendBtn = _container?.querySelector('.atlas-send-btn');
  const visBtn  = _container?.querySelector('.atl-vision-btn');
  if (input)   { input.disabled = disabled; if (!disabled) input.focus(); }
  if (sendBtn) sendBtn.disabled = disabled;
  if (visBtn)  visBtn.disabled  = disabled;
}

async function _sendMessage(text) {
  if (_isTyping || !text.trim()) return;
  _isTyping = true;

  const sugg = _container?.querySelector('.atlas-suggestions');
  if (sugg) sugg.style.display = 'none';

  const input = _container?.querySelector('.atlas-input');
  if (input) { input.value = ''; input.style.height = 'auto'; }

  _addMessage('user', text);
  _showTyping();
  _setInputState(true);

  try {
    const r = await fetch('/api/agent/query', {
      method: 'POST',
      headers: _headers(),
      credentials: 'include',
      body: JSON.stringify({ question: text, assistant_mode: _mode, language: _lang }),
    });

    if (!_container) return;
    _hideTyping();

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      const msg = r.status === 402
        ? 'Votre abonnement est inactif. Veuillez renouveler votre plan pour utiliser ATLAS.'
        : err.detail || `Erreur ${r.status} — réessayez dans quelques instants.`;
      _addMessage('error', msg);
    } else {
      const data = await r.json();
      _addMessage('atlas', data.answer, {
        sources:           data.sources,
        connectorWarnings: data.connector_warnings,
        hasSimulated:      data.has_simulated_data,
      });
      _loadQuota();
    }
  } catch (_) {
    if (!_container) return;
    _hideTyping();
    _addMessage('error', 'Connexion impossible. Vérifiez votre réseau et réessayez.');
  }

  _setInputState(false);
  _isTyping = false;
}

// ── Vision ────────────────────────────────────────────────────────────────────

async function _sendVision(file) {
  if (_isTyping) return;
  _isTyping = true;

  _addMessage('user', `📎 Image : ${file.name || 'capture'}`);
  _showTyping();
  _setInputState(true);

  const question = _container?.querySelector('.atlas-input')?.value?.trim()
    || 'Analyse cette image.';

  const reader = new FileReader();
  reader.onload = async (e) => {
    const b64  = e.target.result.split(',')[1];
    const mime = file.type || 'image/png';

    try {
      const r = await fetch('/api/agent/vision', {
        method: 'POST',
        headers: _headers(),
        credentials: 'include',
        body: JSON.stringify({ image_b64: b64, mime_type: mime, question, language: _lang }),
      });

      if (!_container) return;
      _hideTyping();

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        _addMessage('error', err.detail || `Erreur ${r.status}`);
      } else {
        const data = await r.json();
        _addMessage('atlas', data.answer);
        _loadQuota();
      }
    } catch (_) {
      if (!_container) return;
      _hideTyping();
      _addMessage('error', 'Connexion impossible pendant l\'analyse visuelle.');
    }

    _setInputState(false);
    _isTyping = false;
  };
  reader.readAsDataURL(file);
}

// ── Mount ─────────────────────────────────────────────────────────────────────

function _mount(container) {
  _msgs      = [];
  _container = container;
  _isTyping  = false;
  _lang      = 'fr';
  _mode      = 'enterprise';

  container.innerHTML = CSS + `
  <div class="atlas-root">
    <div class="atlas-header">
      <div class="atlas-status-dot"></div>
      <span class="atlas-header-badge">✨ ATLAS AI</span>
      <span class="atlas-header-title">Copilote IA</span>

      <div class="atl-controls">
        <select class="atl-select" id="atl-lang">
          <option value="fr">FR</option>
          <option value="en">EN</option>
        </select>
        <select class="atl-select" id="atl-mode">
          <option value="enterprise">Entreprise</option>
          <option value="municipal">Municipalité</option>
          <option value="recruiting">Recrutement</option>
        </select>
      </div>

      <div class="atl-quota-wrap" id="atl-quota">
        <span>—</span>
      </div>
    </div>

    <div class="atlas-messages"></div>

    <div class="atlas-suggestions">
      ${SUGGESTIONS.map(s => `<button class="atlas-chip">${s}</button>`).join('')}
    </div>

    <div class="atlas-input-area">
      <textarea class="atlas-input" rows="1"
        placeholder="Posez votre question à ATLAS… (Ctrl+V pour coller une image)"
        maxlength="2000"></textarea>
      <button class="atl-vision-btn" title="Analyser une image">
        <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </button>
      <button class="atlas-send-btn" title="Envoyer">
        <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>`;

  // Welcome message
  setTimeout(() => _addMessage('atlas', WELCOME_MSG), 280);

  // Quota
  _loadQuota();

  // Suggestion chips
  container.querySelectorAll('.atlas-chip').forEach(chip => {
    chip.addEventListener('click', () => _sendMessage(chip.textContent.trim()));
  });

  // Language / mode selectors
  container.querySelector('#atl-lang').addEventListener('change', e => { _lang = e.target.value; });
  container.querySelector('#atl-mode').addEventListener('change', e => { _mode = e.target.value; });

  // Textarea: auto-resize + Enter to send + Ctrl+V image paste
  const input   = container.querySelector('.atlas-input');
  const sendBtn = container.querySelector('.atlas-send-btn');
  const visBtn  = container.querySelector('.atl-vision-btn');

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      _sendMessage(input.value.trim());
    }
  });

  // Ctrl+V paste — detect image in clipboard
  input.addEventListener('paste', e => {
    const items = Array.from(e.clipboardData?.items || []);
    const img   = items.find(i => i.type.startsWith('image/'));
    if (img) {
      e.preventDefault();
      _sendVision(img.getAsFile());
    }
  });

  sendBtn.addEventListener('click', () => _sendMessage(input.value.trim()));

  // Vision button — file picker
  const fileInput = document.createElement('input');
  fileInput.type   = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  container.appendChild(fileInput);

  visBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) _sendVision(fileInput.files[0]);
    fileInput.value = '';
  });
}

export default {
  mount(container)  { _mount(container); },
  unmount(container) {
    container.innerHTML = '';
    _msgs = []; _container = null; _isTyping = false;
  },
};
