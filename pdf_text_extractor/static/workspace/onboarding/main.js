/**
 * Wizard d'onboarding — Sprint 2
 * Déclenché automatiquement à la première connexion (should_show: true)
 * 5 étapes : Bienvenue → Org type → Connecteurs → Équipe → Terminé
 *
 * Exposed: mount(container, ctx, onComplete)
 */

const ORG_TYPES = [
  { value: 'pme',           icon: '🏢', label: 'PME',              desc: 'Petite et Moyenne Entreprise' },
  { value: 'pmi',           icon: '🏭', label: 'PMI',              desc: 'Petite et Moyenne Industrie' },
  { value: 'municipalite',  icon: '🏛️', label: 'Municipalité',     desc: 'Administration municipale' },
  { value: 'hopital',       icon: '🏥', label: 'Hôpital / Santé',  desc: 'Centre de soins et services' },
  { value: 'universite',    icon: '🎓', label: 'Université / Cégep', desc: 'Établissement d\'enseignement' },
  { value: 'entrepreneur',  icon: '🚀', label: 'Entrepreneur',     desc: 'Micro-entreprise / Consultant' },
  { value: 'entreprise',    icon: '🏗️', label: 'Grande entreprise', desc: 'Organisation multi-départements' },
];

const CONNECTORS = [
  { type: 'microsoft_365', icon: '🪟', label: 'Microsoft 365',  desc: 'Teams, Outlook, SharePoint, Entra ID' },
  { type: 'jira',          icon: '📋', label: 'Jira',           desc: 'Projets, tickets, sprints' },
  { type: 'quickbooks',    icon: '💼', label: 'QuickBooks',     desc: 'Comptabilité et finances' },
  { type: 'slack',         icon: '💬', label: 'Slack',          desc: 'Messagerie et communication' },
  { type: 'google',        icon: '🔵', label: 'Google Workspace', desc: 'Gmail, Drive, Calendar' },
  { type: 'hubspot',       icon: '🧡', label: 'HubSpot',        desc: 'CRM et marketing' },
];

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _h() { const t = _token(); return t ? { Authorization: `Bearer ${t}` } : {}; }
async function _api(path, opts = {}) {
  const r = await fetch(path, { headers: { ..._h(), 'Content-Type': 'application/json' }, credentials: 'include', ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || r.status); }
  if (r.status === 204) return null;
  return r.json();
}

const CSS = `
<style id="ob-css">
.ob-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; box-sizing: border-box;
  animation: ob-fade-in .35s ease;
}
@keyframes ob-fade-in { from { opacity: 0; } to { opacity: 1; } }

.ob-card {
  background: #fff;
  border-radius: 20px;
  width: min(680px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 32px 80px rgba(0,0,0,.45);
  display: flex; flex-direction: column;
  animation: ob-slide-up .35s cubic-bezier(.16,1,.3,1);
}
@keyframes ob-slide-up { from { transform: translateY(24px); opacity:0; } to { transform: none; opacity:1; } }

/* Progress bar */
.ob-progress {
  padding: 20px 32px 0;
  display: flex; align-items: center; gap: 8px;
}
.ob-step-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #e2e8f0; transition: all .25s;
  flex-shrink: 0;
}
.ob-step-dot.done { background: #818cf8; }
.ob-step-dot.active { background: #4f46e5; width: 24px; border-radius: 4px; }
.ob-step-label {
  margin-left: auto; font-size: 11px; font-weight: 600;
  color: #94a3b8; letter-spacing: .05em; text-transform: uppercase;
}

/* Body */
.ob-body { padding: 32px 32px 0; flex: 1; }
.ob-icon { font-size: 40px; margin-bottom: 16px; line-height: 1; }
.ob-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 8px; line-height: 1.2; }
.ob-sub   { font-size: 14px; color: #64748b; margin: 0 0 28px; line-height: 1.5; }

/* Org type grid */
.ob-org-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px;
}
.ob-org-card {
  padding: 14px 12px; border: 2px solid #e2e8f0; border-radius: 12px;
  cursor: pointer; text-align: center; transition: all .15s; background: #fff;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.ob-org-card:hover { border-color: #a5b4fc; background: #eef2ff; }
.ob-org-card.selected { border-color: #4f46e5; background: #eef2ff; box-shadow: 0 0 0 3px rgba(79,70,229,.15); }
.ob-org-icon { font-size: 22px; }
.ob-org-label { font-size: 12px; font-weight: 700; color: #1e293b; }
.ob-org-desc  { font-size: 10px; color: #94a3b8; line-height: 1.3; }

/* Connector grid */
.ob-conn-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;
}
.ob-conn-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border: 2px solid #e2e8f0; border-radius: 10px;
  cursor: pointer; transition: all .15s; background: #fff;
}
.ob-conn-card:hover { border-color: #a5b4fc; background: #f8faff; }
.ob-conn-card.selected { border-color: #4f46e5; background: #eef2ff; }
.ob-conn-icon { font-size: 22px; flex-shrink: 0; }
.ob-conn-info { flex: 1; min-width: 0; }
.ob-conn-name { font-size: 12px; font-weight: 700; color: #1e293b; }
.ob-conn-desc { font-size: 11px; color: #94a3b8; margin-top: 1px; }
.ob-conn-check { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #e2e8f0; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
.ob-conn-card.selected .ob-conn-check { background: #4f46e5; border-color: #4f46e5; color: #fff; font-size: 11px; }

/* Invite */
.ob-invite-row { display: flex; gap: 8px; margin-bottom: 10px; }
.ob-invite-email {
  flex: 1; padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; font-family: inherit; outline: none; transition: border-color .15s;
}
.ob-invite-email:focus { border-color: #4f46e5; }
.ob-invite-role {
  padding: 10px 12px; border: 1.5px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; font-family: inherit; outline: none; background: #fff;
  width: 140px; flex-shrink: 0;
}
.ob-invite-add {
  padding: 10px 14px; border-radius: 8px; background: #4f46e5; color: #fff;
  border: none; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; font-family: inherit;
}
.ob-invite-add:hover { background: #4338ca; }
.ob-invites-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.ob-invite-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: #f1f5f9; border-radius: 8px; font-size: 12px;
}
.ob-invite-item span { flex: 1; color: #334155; }
.ob-invite-item button { border: none; background: none; cursor: pointer; color: #94a3b8; font-size: 14px; padding: 0 4px; }
.ob-invite-status { font-size: 12px; color: #16a34a; font-weight: 600; display: none; }

/* Success screen */
.ob-success { text-align: center; padding: 16px 0 8px; }
.ob-success-ring {
  width: 72px; height: 72px; border-radius: 50%;
  background: linear-gradient(135deg, #818cf8, #4f46e5);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px; font-size: 32px;
  box-shadow: 0 8px 24px rgba(79,70,229,.35);
}
.ob-success-title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 10px; }
.ob-success-sub { font-size: 14px; color: #64748b; margin: 0 0 24px; line-height: 1.5; }
.ob-success-bullets { list-style: none; padding: 0; margin: 0 0 24px; display: flex; flex-direction: column; gap: 8px; text-align: left; }
.ob-success-bullets li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; }
.ob-success-bullets li::before { content: '✅'; flex-shrink: 0; }

/* Footer */
.ob-footer {
  padding: 20px 32px 28px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border-top: 1px solid #f1f5f9; margin-top: 24px;
}
.ob-skip { font-size: 13px; color: #94a3b8; background: none; border: none; cursor: pointer; font-family: inherit; padding: 8px 0; }
.ob-skip:hover { color: #64748b; }
.ob-btns { display: flex; gap: 8px; }
.ob-btn-next {
  padding: 10px 24px; background: #4f46e5; color: #fff;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: inherit; transition: all .15s;
  display: flex; align-items: center; gap: 6px;
}
.ob-btn-next:hover { background: #4338ca; }
.ob-btn-next:disabled { opacity: .5; cursor: default; }
.ob-btn-back {
  padding: 10px 18px; background: #f1f5f9; color: #475569;
  border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: inherit;
}
.ob-btn-back:hover { background: #e2e8f0; }
.ob-msg { font-size: 12px; color: #dc2626; margin-top: 4px; min-height: 16px; }

@media(max-width:600px) {
  .ob-org-grid { grid-template-columns: repeat(2,1fr); }
  .ob-conn-grid { grid-template-columns: 1fr; }
  .ob-body { padding: 24px 20px 0; }
  .ob-footer { padding: 16px 20px 24px; flex-wrap: wrap; }
  .ob-progress { padding: 16px 20px 0; }
}
</style>`;

export async function mount(container, ctx, onComplete) {
  if (document.getElementById('ob-css')) document.getElementById('ob-css').remove();
  document.head.insertAdjacentHTML('beforeend', CSS);

  const slug = ctx.partnerSlug || '';
  const partnerName = ctx.partner?.name || 'AgentHub';

  const state = {
    step: 1,
    orgType: null,
    selectedConnectors: [],
    invites: [],
    deptCount: 0,
  };

  const overlay = document.createElement('div');
  overlay.className = 'ob-overlay';
  document.body.appendChild(overlay);

  function _render() {
    overlay.innerHTML = `<div class="ob-card">${_stepHtml()}</div>`;
    _bindStep();
  }

  function _stepHtml() {
    const progress = `
      <div class="ob-progress">
        ${[1,2,3,4,5].map(i => `<div class="ob-step-dot ${i < state.step ? 'done' : i === state.step ? 'active' : ''}"></div>`).join('')}
        <span class="ob-step-label">Étape ${state.step} / 5</span>
      </div>`;

    if (state.step === 1) return progress + `
      <div class="ob-body">
        <div class="ob-icon">👋</div>
        <h2 class="ob-title">Bienvenue dans ${partnerName}</h2>
        <p class="ob-sub">Votre espace de travail intelligent est prêt. En 3 minutes, nous allons configurer votre environnement pour qu'il reflète parfaitement votre organisation.</p>
        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:8px">
          ${[['🏢','Vos départements','Créés automatiquement selon votre type d\'organisation'],
             ['🔗','Vos outils','Connectez Microsoft 365, Jira, QuickBooks et plus'],
             ['👥','Votre équipe','Invitez vos collègues en quelques secondes']].map(([i,t,d]) => `
          <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:#f8fafc;border-radius:10px">
            <span style="font-size:20px;flex-shrink:0">${i}</span>
            <div><div style="font-size:13px;font-weight:700;color:#1e293b">${t}</div><div style="font-size:12px;color:#64748b">${d}</div></div>
          </div>`).join('')}
        </div>
      </div>
      <div class="ob-footer">
        <span></span>
        <div class="ob-btns">
          <button class="ob-btn-next" id="ob-next">Commencer la configuration →</button>
        </div>
      </div>`;

    if (state.step === 2) return progress + `
      <div class="ob-body">
        <div class="ob-icon">🏗️</div>
        <h2 class="ob-title">Quel type d'organisation ?</h2>
        <p class="ob-sub">Vos départements seront créés automatiquement selon votre secteur. Vous pourrez les modifier ensuite.</p>
        <div class="ob-org-grid">
          ${ORG_TYPES.map(o => `
          <div class="ob-org-card ${state.orgType === o.value ? 'selected' : ''}" data-org="${o.value}">
            <span class="ob-org-icon">${o.icon}</span>
            <span class="ob-org-label">${o.label}</span>
            <span class="ob-org-desc">${o.desc}</span>
          </div>`).join('')}
        </div>
        <div class="ob-msg" id="ob-msg"></div>
      </div>
      <div class="ob-footer">
        <button class="ob-btn-back" id="ob-back">← Retour</button>
        <div class="ob-btns">
          <button class="ob-btn-next ${!state.orgType ? '' : ''}" id="ob-next" ${!state.orgType ? 'disabled' : ''}>
            Créer mes départements →
          </button>
        </div>
      </div>`;

    if (state.step === 3) return progress + `
      <div class="ob-body">
        <div class="ob-icon">🔗</div>
        <h2 class="ob-title">Connectez vos outils</h2>
        <p class="ob-sub">Branchez vos applications pour que la plateforme analyse vos données en temps réel. Vous pouvez ajouter d'autres connecteurs plus tard.</p>
        <div class="ob-conn-grid">
          ${CONNECTORS.map(c => `
          <div class="ob-conn-card ${state.selectedConnectors.includes(c.type) ? 'selected' : ''}" data-conn="${c.type}">
            <span class="ob-conn-icon">${c.icon}</span>
            <div class="ob-conn-info">
              <div class="ob-conn-name">${c.label}</div>
              <div class="ob-conn-desc">${c.desc}</div>
            </div>
            <div class="ob-conn-check">${state.selectedConnectors.includes(c.type) ? '✓' : ''}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="ob-footer">
        <button class="ob-btn-back" id="ob-back">← Retour</button>
        <div class="ob-btns">
          <button class="ob-skip" id="ob-skip">Passer cette étape</button>
          <button class="ob-btn-next" id="ob-next">
            ${state.selectedConnectors.length ? `Connecter (${state.selectedConnectors.length}) →` : 'Continuer →'}
          </button>
        </div>
      </div>`;

    if (state.step === 4) return progress + `
      <div class="ob-body">
        <div class="ob-icon">👥</div>
        <h2 class="ob-title">Invitez votre équipe</h2>
        <p class="ob-sub">Ajoutez vos collègues pour commencer à collaborer. Ils recevront un email d'invitation.</p>
        <div class="ob-invite-row">
          <input class="ob-invite-email" id="ob-email" type="email" placeholder="prenom.nom@organisation.ca" />
          <select class="ob-invite-role" id="ob-role">
            <option value="user">Utilisateur</option>
            <option value="manager">Gestionnaire</option>
            <option value="admin">Admin</option>
          </select>
          <button class="ob-invite-add" id="ob-add-invite">+ Ajouter</button>
        </div>
        <div class="ob-invites-list" id="ob-invites-list">
          ${state.invites.map((inv, i) => `
          <div class="ob-invite-item">
            <span>✉️ ${inv.email} <span style="color:#94a3b8">— ${inv.role}</span></span>
            <button data-idx="${i}" class="ob-remove-invite">✕</button>
          </div>`).join('')}
        </div>
        <div class="ob-invite-status" id="ob-inv-status"></div>
        <div class="ob-msg" id="ob-msg"></div>
      </div>
      <div class="ob-footer">
        <button class="ob-btn-back" id="ob-back">← Retour</button>
        <div class="ob-btns">
          <button class="ob-skip" id="ob-skip">Passer cette étape</button>
          <button class="ob-btn-next" id="ob-next" ${!state.invites.length ? 'disabled' : ''}>
            Envoyer ${state.invites.length ? `(${state.invites.length})` : ''} →
          </button>
        </div>
      </div>`;

    if (state.step === 5) return progress + `
      <div class="ob-body ob-success">
        <div class="ob-success-ring">🎉</div>
        <h2 class="ob-success-title">Votre espace est prêt !</h2>
        <p class="ob-success-sub">Configuration terminée. Voici ce qui a été mis en place pour <strong>${partnerName}</strong>.</p>
        <ul class="ob-success-bullets">
          ${state.deptCount > 0 ? `<li>${state.deptCount} départements créés automatiquement</li>` : ''}
          ${state.selectedConnectors.length > 0 ? `<li>${state.selectedConnectors.length} connecteur(s) en cours de configuration</li>` : ''}
          ${state.invites.length > 0 ? `<li>${state.invites.length} invitation(s) envoyée(s) à votre équipe</li>` : ''}
          <li>Tableau de bord disponible avec vos données en temps réel</li>
          <li>ATLAS AI prêt à répondre à vos questions</li>
        </ul>
      </div>
      <div class="ob-footer" style="justify-content:center;border-top:none;padding-top:0">
        <button class="ob-btn-next" id="ob-next" style="padding:12px 32px;font-size:15px">
          🚀 Accéder au tableau de bord
        </button>
      </div>`;

    return '';
  }

  function _bindStep() {
    const card = overlay.querySelector('.ob-card');

    card.querySelector('#ob-back')?.addEventListener('click', () => { state.step--; _render(); });
    card.querySelector('#ob-skip')?.addEventListener('click', () => { state.step++; _render(); });

    if (state.step === 2) {
      card.querySelectorAll('.ob-org-card').forEach(c => {
        c.addEventListener('click', () => {
          state.orgType = c.dataset.org;
          card.querySelectorAll('.ob-org-card').forEach(x => x.classList.remove('selected'));
          c.classList.add('selected');
          card.querySelector('#ob-next').disabled = false;
        });
      });
    }

    if (state.step === 3) {
      card.querySelectorAll('.ob-conn-card').forEach(c => {
        c.addEventListener('click', () => {
          const t = c.dataset.conn;
          const idx = state.selectedConnectors.indexOf(t);
          if (idx >= 0) state.selectedConnectors.splice(idx, 1);
          else state.selectedConnectors.push(t);
          _render();
        });
      });
    }

    if (state.step === 4) {
      const emailInput = card.querySelector('#ob-email');
      const addBtn = card.querySelector('#ob-add-invite');

      const _addInvite = () => {
        const email = emailInput.value.trim();
        const role = card.querySelector('#ob-role').value;
        if (!email || !email.includes('@')) { emailInput.focus(); return; }
        if (state.invites.find(i => i.email === email)) { emailInput.value = ''; return; }
        state.invites.push({ email, role });
        emailInput.value = '';
        _render();
      };
      addBtn.addEventListener('click', _addInvite);
      emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _addInvite(); } });

      card.querySelectorAll('.ob-remove-invite').forEach(btn => {
        btn.addEventListener('click', () => { state.invites.splice(parseInt(btn.dataset.idx), 1); _render(); });
      });
    }

    card.querySelector('#ob-next')?.addEventListener('click', () => _handleNext(card));
  }

  async function _handleNext(card) {
    const btn = card.querySelector('#ob-next');

    if (state.step === 2) {
      if (!state.orgType) return;
      btn.disabled = true; btn.textContent = '⏳ Création des départements…';
      try {
        const res = await _api(`/api/departments/initialize?org_type=${state.orgType}`, { method: 'POST' });
        state.deptCount = res?.created || res?.departments?.length || 0;
        state.step++;
        _render();
      } catch (err) {
        btn.disabled = false; btn.textContent = 'Créer mes départements →';
        const msg = card.querySelector('#ob-msg');
        if (msg) msg.textContent = `Erreur : ${err.message}`;
      }
      return;
    }

    if (state.step === 3 && state.selectedConnectors.length > 0) {
      btn.disabled = true; btn.textContent = '⏳ Configuration…';
      for (const type of state.selectedConnectors) {
        try {
          await _api(`/api/connectors/${type}/oauth/start`, {
            method: 'POST',
            body: JSON.stringify({ partner_slug: slug }),
          });
        } catch {}
      }
      if (state.selectedConnectors.length === 1) {
        try {
          const res = await _api(`/api/connectors/${state.selectedConnectors[0]}/oauth/start`, {
            method: 'POST',
            body: JSON.stringify({ partner_slug: slug }),
          });
          if (res?.authorization_url) {
            window.location.href = res.authorization_url;
            return;
          }
        } catch {}
      }
      state.step++;
      _render();
      return;
    }

    if (state.step === 4 && state.invites.length > 0) {
      btn.disabled = true; btn.textContent = '⏳ Envoi des invitations…';
      let sent = 0;
      for (const inv of state.invites) {
        try { await _api('/api/members/invite', { method: 'POST', body: JSON.stringify(inv) }); sent++; }
        catch {}
      }
      const status = card.querySelector('#ob-inv-status');
      if (status) { status.style.display = 'block'; status.textContent = `✅ ${sent} invitation(s) envoyée(s).`; }
      await new Promise(r => setTimeout(r, 900));
      state.step++;
      _render();
      return;
    }

    if (state.step === 5) {
      overlay.remove();
      document.getElementById('ob-css')?.remove();
      onComplete();
      return;
    }

    state.step++;
    _render();
  }

  _render();
}

export default { mount };
