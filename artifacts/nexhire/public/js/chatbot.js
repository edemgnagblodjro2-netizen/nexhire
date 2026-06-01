/* ── Nex Chatbot Widget ─────────────────────────────────────── */
(function () {
  'use strict';

  const BASE = (window.__nexBase || '').replace(/\/$/, '');

  const nexBot = {
    open: false,
    history: [],   // {role, content}
    lang: 'fr',

    init() {
      this.lang = (document.documentElement.lang || navigator.language || 'fr').startsWith('fr') ? 'fr' : 'en';
      this._buildDOM();
      this._greet();
    },

    _buildDOM() {
      const w = document.createElement('div');
      w.id = 'nex-bot-widget';
      w.innerHTML = `
        <div id="nex-bot-window" class="nex-bot-window" style="display:none">
          <div class="nex-bot-header">
            <div class="nex-bot-avatar"><i class="ti ti-sparkles"></i></div>
            <div>
              <div class="nex-bot-name">Nex &middot; ${this.lang === 'fr' ? 'Assistant Emploi IA' : 'AI Career Assistant'}</div>
              <div class="nex-bot-status">${this.lang === 'fr' ? 'En ligne' : 'Online'}</div>
            </div>
            <button class="nex-bot-close" id="nex-bot-close" aria-label="Close"><i class="ti ti-x"></i></button>
          </div>
          <div id="nex-bot-messages" class="nex-bot-messages"></div>
          <div id="nex-bot-chips" class="nex-bot-chips"></div>
          <div class="nex-bot-input-row">
            <input type="text" id="nex-bot-input"
              placeholder="${this.lang === 'fr' ? 'Votre message…' : 'Your message…'}"
              autocomplete="off" maxlength="400">
            <button class="nex-bot-send" id="nex-bot-send" aria-label="Send">
              <i class="ti ti-send"></i>
            </button>
          </div>
        </div>
        <button class="nex-bot-trigger" id="nex-bot-trigger" aria-label="Open chat">
          <i class="ti ti-message-chatbot" id="nex-bot-icon"></i>
          <span class="nex-bot-badge" id="nex-bot-badge" style="display:none">1</span>
        </button>`;
      document.body.appendChild(w);

      document.getElementById('nex-bot-trigger').addEventListener('click', () => this.toggle());
      document.getElementById('nex-bot-close').addEventListener('click', () => this.toggle());
      document.getElementById('nex-bot-send').addEventListener('click', () => this.send());
      document.getElementById('nex-bot-input').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
      });
    },

    toggle() {
      this.open = !this.open;
      const win = document.getElementById('nex-bot-window');
      const icon = document.getElementById('nex-bot-icon');
      const badge = document.getElementById('nex-bot-badge');
      win.style.display = this.open ? 'flex' : 'none';
      icon.className = this.open ? 'ti ti-x' : 'ti ti-message-chatbot';
      badge.style.display = 'none';
      if (this.open) {
        setTimeout(() => document.getElementById('nex-bot-input').focus(), 120);
      }
    },

    _greet() {
      const greeting = this.lang === 'fr'
        ? '👋 Bonjour ! Je suis **Nex**, votre assistant emploi IA. Quel type de poste recherchez-vous ?'
        : '👋 Hi! I\'m **Nex**, your AI career assistant. What type of role are you looking for?';
      this._addBotMsg(greeting);

      const chips = this.lang === 'fr'
        ? ['💻 Tech / Dev', '📊 Marketing', '⚕️ Santé', '🏗️ Construction', '🎓 Éducation', '💼 Finance']
        : ['💻 Tech / Dev', '📊 Marketing', '⚕️ Healthcare', '🏗️ Construction', '🎓 Education', '💼 Finance'];
      this._setChips(chips, chip => {
        const text = chip.replace(/^[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✈-🛿⌀-⏿☀-⛿✀-✿❀-➿]\s*/u, '');
        this._sendText(text);
      });

      const badge = document.getElementById('nex-bot-badge');
      badge.style.display = 'flex';
    },

    _setChips(chips, cb) {
      const el = document.getElementById('nex-bot-chips');
      el.innerHTML = '';
      chips.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'nex-chip';
        btn.textContent = c;
        btn.addEventListener('click', () => { el.innerHTML = ''; cb(c); });
        el.appendChild(btn);
      });
    },

    _clearChips() {
      document.getElementById('nex-bot-chips').innerHTML = '';
    },

    send() {
      const input = document.getElementById('nex-bot-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this._sendText(text);
    },

    _sendText(text) {
      this._clearChips();
      this._addUserMsg(text);
      this.history.push({ role: 'user', content: text });
      this._callBot();
    },

    async _callBot() {
      const typingId = this._showTyping();
      try {
        const res = await fetch(BASE + '/api/ai/jobbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: this.history, lang: this.lang }),
        });
        const data = await res.json();
        this._removeTyping(typingId);

        if (!data.success) {
          this._addBotMsg(data.error || (this.lang === 'fr' ? 'Erreur, réessayez.' : 'Error, please retry.'));
          return;
        }

        this._addBotMsg(data.reply);
        this.history.push({ role: 'assistant', content: data.reply });

        if (data.search_params) {
          await this._loadJobs(data.search_params);
        }
        if (data.show_profile_cta) {
          this._addProfileCTA();
        }
      } catch {
        this._removeTyping(typingId);
        this._addBotMsg(this.lang === 'fr' ? '⚠️ Connexion impossible. Réessayez.' : '⚠️ Connection error. Please retry.');
      }
    },

    async _loadJobs(params) {
      const introEl = this._addBotMsg(this.lang === 'fr' ? '🔍 Je cherche des offres pour vous…' : '🔍 Searching jobs for you…');
      try {
        const qs = new URLSearchParams();
        if (params.q) qs.set('q', params.q);
        if (params.work_mode) qs.set('work_mode', params.work_mode);
        if (params.province) qs.set('province', params.province);
        if (params.salary_min) qs.set('salary_min', params.salary_min);
        qs.set('limit', '4');

        const res = await fetch(BASE + '/api/jobs?' + qs.toString());
        const data = await res.json();
        const jobs = data.jobs || [];

        if (jobs.length === 0) {
          introEl.querySelector('.nex-msg-bubble').innerHTML =
            this.lang === 'fr'
              ? '😕 Aucune offre trouvée pour ces critères. Essayez de reformuler !'
              : '😕 No jobs found for these criteria. Try rephrasing!';
          this._addProfileCTA();
          return;
        }

        introEl.querySelector('.nex-msg-bubble').innerHTML =
          this.lang === 'fr'
            ? `✅ J'ai trouvé **${jobs.length} offre${jobs.length > 1 ? 's' : ''}** qui correspondent :`
            : `✅ Found **${jobs.length} matching job${jobs.length > 1 ? 's' : ''}**:`;

        const container = document.createElement('div');
        container.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:0 0 4px';
        jobs.forEach(job => {
          const card = this._makeJobCard(job);
          container.appendChild(card);
        });
        const msgs = document.getElementById('nex-bot-messages');
        msgs.appendChild(container);
        this._scrollBottom();

        this._addProfileCTA();

        const followUp = this.lang === 'fr'
          ? 'Une offre vous intéresse ? Créez votre profil gratuit pour postuler en 2 minutes !'
          : 'Interested in a role? Create your free profile to apply in 2 minutes!';
        this.history.push({ role: 'assistant', content: followUp });
      } catch {
        introEl.querySelector('.nex-msg-bubble').textContent =
          this.lang === 'fr' ? '⚠️ Impossible de charger les offres.' : '⚠️ Could not load jobs.';
      }
    },

    _makeJobCard(job) {
      const el = document.createElement('div');
      el.className = 'nex-job-card';

      const title = job.title_fr || job.title_en || 'Poste';
      const company = job.company_name || '';
      const location = [job.city, job.province].filter(Boolean).join(', ') || (this.lang === 'fr' ? 'Canada' : 'Canada');
      const mode = job.work_mode ? `<span class="nex-job-card-tag">${job.work_mode}</span>` : '';
      const salary = job.salary_min ? `<span class="nex-job-card-tag">${Math.round(job.salary_min / 1000)}k+</span>` : '';
      const isNew = job.created_at && (Date.now() - new Date(job.created_at).getTime()) < 48 * 3600 * 1000;
      const newBadge = isNew ? `<span class="nex-job-card-tag new">${this.lang === 'fr' ? 'Nouveau' : 'New'}</span>` : '';

      el.innerHTML = `
        <div class="nex-job-card-title">${this._esc(title)}</div>
        <div class="nex-job-card-co"><i class="ti ti-building"></i> ${this._esc(company)} · ${this._esc(location)}</div>
        <div class="nex-job-card-tags">${mode}${salary}${newBadge}</div>`;

      el.addEventListener('click', () => {
        window.location.hash = '#jobs';
        if (typeof filterJobs === 'function') {
          document.getElementById('search-input').value = title;
          filterJobs();
        }
        this.toggle();
      });
      return el;
    },

    _addProfileCTA() {
      const msgs = document.getElementById('nex-bot-messages');
      const cta = document.createElement('div');
      cta.className = 'nex-cta-card';
      cta.innerHTML = this.lang === 'fr'
        ? `<p>Créez votre profil gratuit pour postuler en un clic et recevoir des offres personnalisées.</p>
           <a href="#register" class="btn-primary" onclick="nexBot.toggle()">Créer mon profil gratuitement</a>`
        : `<p>Create your free profile to apply in one click and receive personalized job matches.</p>
           <a href="#register" class="btn-primary" onclick="nexBot.toggle()">Create my free profile</a>`;
      msgs.appendChild(cta);
      this._scrollBottom();
    },

    _addBotMsg(text) {
      const msgs = document.getElementById('nex-bot-messages');
      const row = document.createElement('div');
      row.className = 'nex-msg bot';
      row.innerHTML = `
        <div class="nex-msg-avatar"><i class="ti ti-sparkles"></i></div>
        <div class="nex-msg-bubble">${this._md(text)}</div>`;
      msgs.appendChild(row);
      this._scrollBottom();
      return row;
    },

    _addUserMsg(text) {
      const msgs = document.getElementById('nex-bot-messages');
      const row = document.createElement('div');
      row.className = 'nex-msg user';
      row.innerHTML = `<div class="nex-msg-bubble">${this._esc(text)}</div>`;
      msgs.appendChild(row);
      this._scrollBottom();
    },

    _showTyping() {
      const id = 'nex-typing-' + Date.now();
      const msgs = document.getElementById('nex-bot-messages');
      const row = document.createElement('div');
      row.className = 'nex-msg bot';
      row.id = id;
      row.innerHTML = `
        <div class="nex-msg-avatar"><i class="ti ti-sparkles"></i></div>
        <div class="nex-typing">
          <div class="nex-dot"></div><div class="nex-dot"></div><div class="nex-dot"></div>
        </div>`;
      msgs.appendChild(row);
      this._scrollBottom();
      return id;
    },

    _removeTyping(id) {
      const el = document.getElementById(id);
      if (el) el.remove();
    },

    _scrollBottom() {
      const msgs = document.getElementById('nex-bot-messages');
      requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
    },

    _esc(str) {
      return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },

    _md(str) {
      return this._esc(str)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => nexBot.init());
  } else {
    nexBot.init();
  }

  window.nexBot = nexBot;
})();
