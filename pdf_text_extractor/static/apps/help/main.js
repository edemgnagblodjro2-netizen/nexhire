/**
 * Centre d'aide
 * FAQ accordéon + ticket de support
 * POST /api/settings/support → { category, subject, description } (user+)
 */

const CSS = `<style>
.help-root {
  padding: 28px 32px;
  max-width: 840px;
  margin: 0 auto;
}

.help-header { margin-bottom: 28px; }
.help-header h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.help-header p  { font-size: 13px; color: #64748b; margin: 0; }

.help-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 28px;
}

.help-tab {
  padding: 10px 20px;
  font-size: 13.5px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color .12s, border-color .12s;
  font-family: inherit;
}

.help-tab:hover { color: #334155; }
.help-tab.active { color: #6366f1; border-bottom-color: #6366f1; font-weight: 600; }

.help-panel { display: none; }
.help-panel.active { display: block; }

/* Quick links */
.help-quick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}

@media (max-width: 600px) {
  .help-quick { grid-template-columns: 1fr; }
  .help-root { padding: 16px; }
}

.help-quick-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color .12s, box-shadow .12s;
}

.help-quick-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 2px 8px rgba(99,102,241,.08);
}

.help-quick-card .icon { font-size: 24px; margin-bottom: 8px; }
.help-quick-card strong { display: block; font-size: 13.5px; color: #0f172a; font-weight: 600; margin-bottom: 4px; }
.help-quick-card span  { font-size: 12px; color: #64748b; }

/* FAQ */
.help-faq-section { margin-bottom: 28px; }
.help-faq-section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: #94a3b8;
  margin: 0 0 10px;
  padding-left: 4px;
}

.help-faq-item {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 6px;
  background: #fff;
  transition: border-color .12s;
}

.help-faq-item.open { border-color: #c7d2fe; }

.help-faq-q {
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition: background .1s;
}

.help-faq-q:hover { background: #f8fafc; }

.help-faq-chevron {
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
  transition: transform .2s;
}

.help-faq-item.open .help-faq-chevron { transform: rotate(180deg); }

.help-faq-a {
  max-height: 0;
  overflow: hidden;
  transition: max-height .25s ease;
}

.help-faq-item.open .help-faq-a { max-height: 400px; }

.help-faq-a-inner {
  padding: 0 16px 14px;
  font-size: 13.5px;
  line-height: 1.7;
  color: #334155;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}

/* Support form */
.help-form-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px 28px;
}

.help-field { margin-bottom: 16px; }
.help-field label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 5px;
}

.help-input, .help-select, .help-textarea {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13.5px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  outline: none;
  box-sizing: border-box;
  transition: border-color .12s;
}

.help-input:focus, .help-select:focus, .help-textarea:focus { border-color: #6366f1; }
.help-textarea { resize: vertical; min-height: 120px; }

.help-char { font-size: 11.5px; color: #94a3b8; text-align: right; margin-top: 3px; }

.help-btn {
  padding: 11px 28px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  background: #6366f1;
  color: #fff;
  transition: background .12s, transform .1s;
}

.help-btn:hover:not(:disabled) { background: #4f46e5; }
.help-btn:active { transform: scale(.97); }
.help-btn:disabled { opacity: .5; cursor: not-allowed; }

.help-alert {
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
  border: 1px solid;
}

.help-alert.err { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
.help-alert.ok  { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
.help-alert.info { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }

.help-spin {
  display: inline-block;
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: help-spin .7s linear infinite;
  vertical-align: middle;
  margin-right: 5px;
}

@keyframes help-spin { to { transform: rotate(360deg); } }
</style>`;

// ── API ────────────────────────────────────────────────────────────────────────

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _hdrs() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${_token()}` }; }

async function _postSupport(payload) {
  const r = await fetch('/api/settings/support', {
    method: 'POST', credentials: 'include',
    headers: _hdrs(), body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || `Erreur ${r.status}`);
  }
  return r.json();
}

function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── FAQ data ───────────────────────────────────────────────────────────────────

const FAQ = [
  {
    section: 'Démarrage',
    items: [
      {
        q: 'Comment inviter des membres dans mon organisation ?',
        a: 'Rendez-vous dans <strong>Identity & Access → Utilisateurs</strong>. Cliquez sur "Inviter un membre", entrez l\'adresse courriel et choisissez le rôle. Un courriel d\'invitation est envoyé automatiquement.',
      },
      {
        q: 'Qu\'est-ce que le score de maturité IA ?',
        a: 'C\'est une évaluation sur 100 points (basée sur le modèle IMAI) qui mesure maturité de votre organisation sur 5 axes : Données, Gouvernance, Compétences, Technologie et Processus. Effectuez le <strong>Diagnostic IA</strong> pour obtenir votre score initial.',
      },
      {
        q: 'Comment connecter Microsoft 365 ?',
        a: 'Allez dans <strong>Intégrations → Microsoft 365</strong>. Cliquez sur "Connecter" et suivez le flux OAuth Microsoft. Vous aurez besoin d\'un compte avec droits d\'administration sur votre tenant Azure.',
      },
    ],
  },
  {
    section: 'ATLAS & Knowledge Hub',
    items: [
      {
        q: 'Quelle est la différence entre ATLAS et le Knowledge Hub ?',
        a: '<strong>ATLAS</strong> est votre conseiller IA conversationnel — il répond à des questions générales sur la transformation IA, la gouvernance et les stratégies. Le <strong>Knowledge Hub</strong> l\'augmente avec VOS documents internes : politiques RH, procédures, contrats — la recherche devient alors sémantique sur votre propre base de connaissance.',
      },
      {
        q: 'Quels formats de fichiers puis-je indexer dans le Knowledge Hub ?',
        a: 'PDF, TXT et Markdown (.md) via upload manuel. Via la synchronisation Microsoft 365, les bibliothèques SharePoint et OneDrive sont indexées automatiquement.',
      },
      {
        q: 'Pourquoi ATLAS répond-il parfois avec des données simulées ?',
        a: 'Lorsqu\'un connecteur (ex. M365) n\'est pas encore actif ou que des données sont manquantes, ATLAS peut générer des données illustratives pour montrer ce que la réponse ressemblerait. Un bandeau jaune vous l\'indique clairement.',
      },
    ],
  },
  {
    section: 'Facturation',
    items: [
      {
        q: 'Que se passe-t-il à la fin de l\'essai gratuit ?',
        a: 'Votre accès passe en mode limité : ATLAS n\'accepte plus de nouvelles requêtes, et les rapports ne peuvent plus être générés. Vos données et configurations sont conservées pendant 30 jours. Souscrivez un plan dans <strong>Facturation</strong> pour restaurer l\'accès complet.',
      },
      {
        q: 'Puis-je changer de plan en cours de période ?',
        a: 'Oui. Un changement d\'abonnement est pris en compte immédiatement via le portail Stripe. La différence de montant est calculée au prorata.',
      },
      {
        q: 'Où puis-je consulter mes factures ?',
        a: 'Dans <strong>Facturation → Portail de paiement</strong>. Cela ouvre le portail Stripe sécurisé où vous pouvez voir l\'historique des factures, modifier votre moyen de paiement et gérer votre abonnement.',
      },
    ],
  },
  {
    section: 'Sécurité & Conformité',
    items: [
      {
        q: 'Où sont stockées mes données ?',
        a: 'Toutes les données sont stockées dans Supabase (PostgreSQL) hébergé sur AWS Canada (ca-central-1). Les vecteurs sémantiques du Knowledge Hub sont également stockés dans la même région.',
      },
      {
        q: 'AgentHub est-il conforme à la Loi 25 ?',
        a: 'AgentHub intègre les outils de gouvernance de la Loi 25 : évaluation des facteurs relatifs à la vie privée (EFVP), registre des actifs de données, et politiques de protection. Le module <strong>Gouvernance & Loi 25</strong> vous guide étape par étape.',
      },
    ],
  },
];

// ── Tab 1: FAQ ────────────────────────────────────────────────────────────────

function _mountFAQ(panel) {
  const quickHtml = `
    <div class="help-quick">
      <div class="help-quick-card" data-tab-goto="support">
        <div class="icon">💬</div>
        <strong>Contacter le support</strong>
        <span>Soumettre un ticket</span>
      </div>
      <div class="help-quick-card" data-action="atlas">
        <div class="icon">🤖</div>
        <strong>Discuter avec ATLAS</strong>
        <span>Conseiller IA 24/7</span>
      </div>
      <div class="help-quick-card" data-tab-goto="support">
        <div class="icon">📧</div>
        <strong>support@nexhire.ca</strong>
        <span>Lun–Ven 9h–17h EST</span>
      </div>
    </div>`;

  const faqHtml = FAQ.map(sec => `
    <div class="help-faq-section">
      <div class="help-faq-section-title">${_esc(sec.section)}</div>
      ${sec.items.map((item, i) => `
        <div class="help-faq-item" data-faq="${sec.section}-${i}">
          <button class="help-faq-q">
            ${_esc(item.q)}
            <span class="help-faq-chevron">▼</span>
          </button>
          <div class="help-faq-a">
            <div class="help-faq-a-inner">${item.a}</div>
          </div>
        </div>`).join('')}
    </div>`).join('');

  panel.innerHTML = quickHtml + faqHtml;

  // FAQ accordion
  panel.querySelectorAll('.help-faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.help-faq-item');
      const wasOpen = item.classList.contains('open');
      panel.querySelectorAll('.help-faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // Quick links — tab switching
  panel.querySelectorAll('[data-tab-goto]').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.dataset.tabGoto;
      panel.closest('.help-root')?.querySelector(`.help-tab[data-tab="${target}"]`)?.click();
    });
  });

  // ATLAS shortcut — fires workspace nav event
  panel.querySelectorAll('[data-action="atlas"]').forEach(card => {
    card.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('ws:navigate', { detail: { id: 'atlas' } }));
    });
  });
}

// ── Tab 2: Support ticket ──────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'bug',         label: 'Problème technique ou bug' },
  { value: 'billing',     label: 'Facturation et abonnement' },
  { value: 'access',      label: 'Accès, permissions ou authentification' },
  { value: 'integration', label: 'Intégrations et connecteurs' },
  { value: 'migration',   label: 'Migration et import de données' },
  { value: 'feature',     label: 'Demande de fonctionnalité' },
  { value: 'training',    label: 'Formation et prise en main' },
  { value: 'security',    label: 'Sécurité et conformité' },
  { value: 'other',       label: 'Autre' },
];

function _mountSupport(panel) {
  panel.innerHTML = `
    <div class="help-form-card">
      <div class="help-alert info" style="margin-bottom:20px">
        📧 Votre message sera envoyé à <strong>support@nexhire.ca</strong>. Nous répondons sous 24h ouvrables (Lun–Ven, 9h–17h EST).
      </div>

      <div id="help-form-msg"></div>

      <form id="help-support-form" novalidate>
        <div class="help-field">
          <label>Catégorie <span style="color:#dc2626">*</span></label>
          <select class="help-select" id="help-cat">
            ${CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
          </select>
        </div>

        <div class="help-field">
          <label>Sujet <span style="color:#dc2626">*</span></label>
          <input class="help-input" id="help-subject" maxlength="300"
            placeholder="Décrivez brièvement votre problème ou question">
        </div>

        <div class="help-field">
          <label>Description détaillée</label>
          <textarea class="help-textarea" id="help-desc" maxlength="5000"
            placeholder="Étapes pour reproduire, messages d'erreur, captures d'écran (décrivez les)…"></textarea>
          <div class="help-char"><span id="help-char-count">0</span> / 5000</div>
        </div>

        <button class="help-btn" type="submit" id="help-submit-btn">Envoyer le ticket</button>
      </form>
    </div>`;

  const msgEl   = panel.querySelector('#help-form-msg');
  const descEl  = panel.querySelector('#help-desc');
  const countEl = panel.querySelector('#help-char-count');
  const btn     = panel.querySelector('#help-submit-btn');

  descEl.addEventListener('input', () => {
    countEl.textContent = descEl.value.length;
  });

  panel.querySelector('#help-support-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const category    = panel.querySelector('#help-cat')?.value;
    const subject     = panel.querySelector('#help-subject')?.value.trim();
    const description = descEl.value.trim();

    if (!subject) {
      msgEl.innerHTML = '<div class="help-alert err">Le sujet est requis.</div>';
      panel.querySelector('#help-subject')?.focus();
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="help-spin"></span>Envoi en cours…';
    msgEl.innerHTML = '';

    try {
      await _postSupport({ category, subject, description });
      panel.querySelector('#help-support-form').reset();
      countEl.textContent = '0';
      msgEl.innerHTML = '<div class="help-alert ok">✅ Votre ticket a bien été envoyé. Notre équipe vous répondra sous 24h ouvrables.</div>';
    } catch (err) {
      msgEl.innerHTML = `<div class="help-alert err">${_esc(err.message)}</div>`;
    }

    btn.disabled = false;
    btn.textContent = 'Envoyer le ticket';
  });
}

// ── Mount ─────────────────────────────────────────────────────────────────────

function _mount(container) {
  container.innerHTML = CSS + `
  <div class="help-root">
    <div class="help-header">
      <h1>❓ Centre d'aide</h1>
      <p>Trouvez des réponses dans la FAQ ou contactez l'équipe NexHire</p>
    </div>

    <div class="help-tabs">
      <button class="help-tab active" data-tab="faq">FAQ</button>
      <button class="help-tab" data-tab="support">Contacter le support</button>
    </div>

    <div id="help-panel-faq"     class="help-panel active"></div>
    <div id="help-panel-support" class="help-panel"></div>
  </div>`;

  const panels = {
    faq:     container.querySelector('#help-panel-faq'),
    support: container.querySelector('#help-panel-support'),
  };

  container.querySelectorAll('.help-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.help-tab').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.help-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      panels[btn.dataset.tab].classList.add('active');
    });
  });

  _mountFAQ(panels.faq);
  _mountSupport(panels.support);
}

export default {
  mount(container)   { _mount(container); },
  unmount(container) { container.innerHTML = ''; },
};
