/**
 * ATLAS AI — Module de chat IA
 * Copilote IA pour la transformation numérique des PME
 * Sprint 2 · AgentHub Platform
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

.atlas-header-sub {
  margin-left: auto;
  font-size: 11.5px;
  color: #94a3b8;
  font-style: italic;
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

.atlas-disclaimer {
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  padding: 4px 24px 8px;
}

.atlas-input-area {
  padding: 14px 24px;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 10px;
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

.atlas-send-btn svg {
  width: 16px; height: 16px;
  stroke: currentColor;
}

@media (max-width: 680px) {
  .atlas-messages { padding: 16px; }
  .atlas-suggestions { padding: 0 16px 12px; }
  .atlas-input-area { padding: 10px 16px; }
  .atlas-msg { max-width: 92%; }
}
</style>`;

// ── Demo response engine ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Qu'est-ce que l'IMAI ?",
  "Par où commencer avec l'IA ?",
  "Comment réduire mes coûts ?",
  "Qu'est-ce que la Loi 25 ?",
  "Quel est mon plan d'action ?",
];

const RESPONSES = [
  {
    match: /imai|score|maturit/i,
    reply: `L'**Indice de Maturité en Intelligence Artificielle (IMAI)** est notre mesure propriétaire, de 0 à 100, qui évalue la préparation IA de votre organisation sur 5 dimensions :\n\n• **Stratégie** — vision et planification IA\n• **Personnes** — compétences et adoption du changement\n• **Processus** — intégration dans les opérations\n• **Technologies** — outils et infrastructure\n• **Gouvernance** — éthique, données et conformité\n\nUn score de 70+ indique une organisation prête à passer à l'échelle IA.`,
  },
  {
    match: /commencer|début|par où|premiers? pas|start/i,
    reply: `La meilleure première étape est toujours le **Diagnostic IA**. Il prend moins de 10 minutes et vous donne :\n\n• Votre score IMAI personnalisé\n• Un portrait de vos 5 dimensions de maturité\n• Un plan d'action sur 30 / 90 / 180 jours\n\nVous pouvez le lancer maintenant depuis le menu **Diagnostic IA** à gauche.`,
  },
  {
    match: /coût|économ|réduire|budget|opérationnel/i,
    reply: `L'IA peut réduire vos coûts opérationnels de **15 à 40 %** selon votre secteur. Les gains les plus rapides viennent de :\n\n1. **Automatisation des tâches répétitives** — rapports, saisies de données, relances clients\n2. **Service client IA** — chatbots pour les demandes de premier niveau\n3. **Analyse prédictive** — anticiper les problèmes avant qu'ils coûtent cher\n\nVotre Diagnostic IA identifiera les opportunités spécifiques à votre contexte.`,
  },
  {
    match: /loi 25|confidential|vie priv|données personnelles|rgpd|privacy/i,
    reply: `La **Loi 25** (Québec) impose des obligations importantes lorsque vous utilisez l'IA avec des données personnelles :\n\n• **Consentement éclairé** — les individus doivent savoir si une décision automatisée les concerne\n• **Responsable désigné** — nommer un responsable de la protection formellement\n• **Évaluation des facteurs relatifs à la vie privée** — obligatoire avant tout nouveau projet IA\n• **Droit d'accès et de correction** — les personnes peuvent consulter et corriger leurs données\n\nNotre dimension **Gouvernance IA** vous aide à évaluer votre conformité actuelle.`,
  },
  {
    match: /plan|action|roadmap|feuille de route|étape|priorité/i,
    reply: `Votre plan d'action IA personnalisé se construit en 3 horizons :\n\n**30 jours** — Audit interne, identification de 2-3 cas d'usage prioritaires, formation initiale de l'équipe\n\n**90 jours** — Pilote sur le cas d'usage #1, mise en place des politiques de gouvernance de base\n\n**180 jours** — Déploiement élargi, mesure des résultats, passage au cas d'usage #2\n\nCompletez votre **Diagnostic IA** pour obtenir un plan adapté à votre niveau de maturité actuel.`,
  },
  {
    match: /secteur|industrie|pme|manufactur|santé|éducation|commerce|hospit/i,
    reply: `L'IA offre des opportunités dans tous les secteurs, mais les applications varient :\n\n• **Manufacturier** — maintenance prédictive, optimisation de la chaîne logistique\n• **Santé** — aide au triage, gestion des dossiers, prise de rendez-vous\n• **Commerce** — personnalisation client, gestion des stocks, prévision de la demande\n• **Services professionnels** — automatisation documentaire, analyse contractuelle\n\nMentionnez votre secteur dans le **Diagnostic IA** pour des recommandations ciblées.`,
  },
  {
    match: /atlas|qui es.tu|qui êtes-vous|présente-toi|c.est quoi/i,
    reply: `Je suis **ATLAS**, votre copilote IA personnel sur AgentHub Platform.\n\nJe suis conçu pour vous accompagner dans votre parcours de transformation numérique : expliquer les concepts IA, vous guider vers les bons outils, et interpréter vos résultats de diagnostic.\n\nEn mode démo, je fonctionne avec des réponses préprogrammées. Lorsque votre compte sera activé, je me connecterai à vos données réelles pour des recommandations encore plus précises.`,
  },
  {
    match: /diagnostic|parcours|évaluation|questionnaire/i,
    reply: `Le **Diagnostic IA** est votre point de départ. En 10 minutes, il évalue vos 5 dimensions de maturité IA :\n\n• 📋 **Stratégie** — Vision et planification\n• 👥 **Personnes** — Compétences et adoption\n• ⚙️ **Processus** — Intégration opérationnelle\n• 💻 **Technologies** — Outils et infrastructure\n• ⚖️ **Gouvernance** — Éthique et conformité\n\nRésultat : votre score IMAI + un plan d'action personnalisé sur 3 horizons temporels.`,
  },
];

const DEFAULT_REPLY = `Bonne question ! En tant que copilote IA d'AgentHub, je peux vous aider à :\n\n• Comprendre votre **score IMAI** et vos dimensions de maturité\n• Explorer les **opportunités IA** pour votre secteur\n• Naviguer dans votre **plan d'action** personnalisé\n• Comprendre les **obligations légales** (Loi 25)\n\nQue souhaitez-vous explorer ?`;

const WELCOME_MSG = `Bonjour ! Je suis **ATLAS**, votre copilote IA pour la transformation numérique de votre organisation.\n\nJe suis ici pour répondre à vos questions sur l'intelligence artificielle, interpréter vos résultats de diagnostic et vous guider vers les bonnes actions.\n\nComment puis-je vous aider aujourd'hui ?`;

function _matchResponse(text) {
  for (const { match, reply } of RESPONSES) {
    if (match.test(text)) return reply;
  }
  return DEFAULT_REPLY;
}

function _md(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ── Module state ──────────────────────────────────────────────────────────────

let _msgs       = [];
let _container  = null;
let _isTyping   = false;

// ── Chat helpers ──────────────────────────────────────────────────────────────

function _addMessage(role, text) {
  _msgs.push({ role, text });
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
    <div class="atlas-typing-bubble">
      <span></span><span></span><span></span>
    </div>`;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
}

function _hideTyping() {
  document.getElementById('atl-typing')?.remove();
}

function _renderMessages() {
  const msgs = _container?.querySelector('.atlas-messages');
  if (!msgs) return;
  msgs.innerHTML = _msgs.map(m => `
    <div class="atlas-msg ${m.role === 'user' ? 'user' : ''}">
      ${m.role === 'atlas'
        ? `<div class="atlas-avatar">✨</div>`
        : `<div class="atlas-user-avatar">Vous</div>`}
      <div class="atlas-bubble">${_md(m.text)}</div>
    </div>`).join('');
  msgs.scrollTop = msgs.scrollHeight;
}

async function _sendMessage(text) {
  if (_isTyping || !text.trim()) return;
  _isTyping = true;

  const sugg = _container?.querySelector('.atlas-suggestions');
  if (sugg) sugg.style.display = 'none';

  _addMessage('user', text);
  _showTyping();

  const input  = _container?.querySelector('.atlas-input');
  const sendBtn = _container?.querySelector('.atlas-send-btn');
  if (input)   { input.value = ''; input.style.height = 'auto'; input.disabled = true; }
  if (sendBtn) sendBtn.disabled = true;

  await new Promise(r => setTimeout(r, 700 + Math.random() * 700));

  if (!_container) return; // unmounted during delay
  _hideTyping();
  _addMessage('atlas', _matchResponse(text));

  if (input)   { input.disabled = false; input.focus(); }
  if (sendBtn) sendBtn.disabled = false;
  _isTyping = false;
}

// ── Mount ─────────────────────────────────────────────────────────────────────

function _mount(container, ctx) {
  _msgs      = [];
  _container = container;
  _isTyping  = false;

  container.innerHTML = CSS + `
  <div class="atlas-root">
    <div class="atlas-header">
      <div class="atlas-status-dot"></div>
      <span class="atlas-header-badge">✨ ATLAS AI</span>
      <span class="atlas-header-title">Copilote IA</span>
      <span class="atlas-header-sub">Mode démo · Réponses préprogrammées</span>
    </div>

    <div class="atlas-messages"></div>

    <div class="atlas-suggestions">
      ${SUGGESTIONS.map(s => `<button class="atlas-chip">${s}</button>`).join('')}
    </div>

    <div class="atlas-disclaimer">
      ATLAS est en mode démo. Activez votre compte pour les recommandations personnalisées basées sur vos données.
    </div>

    <div class="atlas-input-area">
      <textarea class="atlas-input" rows="1"
        placeholder="Posez votre question à ATLAS…"
        maxlength="500"></textarea>
      <button class="atlas-send-btn" title="Envoyer">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>
  </div>`;

  // Welcome message with slight delay for polish
  setTimeout(() => _addMessage('atlas', WELCOME_MSG), 280);

  // Suggestion chips
  container.querySelectorAll('.atlas-chip').forEach(chip => {
    chip.addEventListener('click', () => _sendMessage(chip.textContent.trim()));
  });

  // Textarea: auto-resize + Enter to send
  const input   = container.querySelector('.atlas-input');
  const sendBtn = container.querySelector('.atlas-send-btn');

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      _sendMessage(input.value.trim());
    }
  });

  sendBtn.addEventListener('click', () => _sendMessage(input.value.trim()));
}

export default {
  mount(container, ctx)  { _mount(container, ctx); },
  unmount(container)     {
    container.innerHTML = '';
    _msgs = []; _container = null; _isTyping = false;
  },
};
