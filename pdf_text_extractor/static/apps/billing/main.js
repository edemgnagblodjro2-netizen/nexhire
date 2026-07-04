/**
 * Billing & Abonnement
 * GET  /api/billing/status   → état de l'abonnement (manager+)
 * POST /api/billing/checkout → session Stripe Checkout (owner only)
 * POST /api/billing/portal   → Stripe Customer Portal  (owner only)
 */

const CSS = `<style>
.bl-root {
  padding: 28px 32px;
  max-width: 900px;
  margin: 0 auto;
}

.bl-header { margin-bottom: 28px; }
.bl-header h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.bl-header p  { font-size: 13px; color: #64748b; margin: 0; }

/* Status banner */
.bl-status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}

.bl-status-icon { font-size: 24px; }

.bl-status-info { flex: 1; }
.bl-status-info strong { font-size: 14.5px; font-weight: 700; color: #0f172a; }
.bl-status-info p { font-size: 12.5px; color: #64748b; margin: 2px 0 0; }

.bl-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 99px;
  letter-spacing: .03em;
}

.bl-badge.trialing  { background: #eff6ff; color: #1d4ed8; }
.bl-badge.active    { background: #f0fdf4; color: #166534; }
.bl-badge.past_due  { background: #fef9c3; color: #a16207; }
.bl-badge.cancelled { background: #fef2f2; color: #dc2626; }
.bl-badge.trial     { background: #f5f3ff; color: #6d28d9; }

/* Plan cards */
.bl-plans {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}

@media (max-width: 640px) {
  .bl-plans { grid-template-columns: 1fr; }
  .bl-root { padding: 16px; }
}

.bl-plan-card {
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  position: relative;
  transition: border-color .15s, box-shadow .15s;
}

.bl-plan-card.recommended {
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99,102,241,.08);
}

.bl-plan-card.current-plan {
  border-color: #10b981;
}

.bl-plan-tag {
  position: absolute;
  top: -1px;
  right: 20px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 0 0 8px 8px;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.bl-plan-tag.popular  { background: #6366f1; color: #fff; }
.bl-plan-tag.current  { background: #10b981; color: #fff; }

.bl-plan-name  { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.bl-plan-price { font-size: 28px; font-weight: 800; color: #0f172a; margin: 12px 0 2px; }
.bl-plan-price span { font-size: 14px; font-weight: 500; color: #64748b; }

.bl-plan-desc { font-size: 12.5px; color: #64748b; margin: 0 0 16px; line-height: 1.5; }

.bl-plan-features {
  list-style: none;
  padding: 0; margin: 0 0 20px;
}

.bl-plan-features li {
  font-size: 13px;
  color: #334155;
  padding: 5px 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.bl-plan-features li::before {
  content: '✓';
  color: #10b981;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

.bl-btn {
  width: 100%;
  padding: 11px 20px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background .12s, transform .1s;
}

.bl-btn:active  { transform: scale(.97); }
.bl-btn:disabled { opacity: .5; cursor: not-allowed; }

.bl-btn-primary   { background: #6366f1; color: #fff; }
.bl-btn-primary:hover:not(:disabled) { background: #4f46e5; }

.bl-btn-outline {
  background: transparent;
  color: #334155;
  border: 1.5px solid #e2e8f0;
}

.bl-btn-outline:hover:not(:disabled) { background: #f8fafc; }

.bl-btn-green   { background: #10b981; color: #fff; }
.bl-btn-green:hover:not(:disabled) { background: #059669; }

/* Portal section */
.bl-portal-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.bl-portal-icon { font-size: 24px; flex-shrink: 0; }
.bl-portal-info { flex: 1; }
.bl-portal-info strong { font-size: 14px; font-weight: 600; color: #0f172a; }
.bl-portal-info p { font-size: 12.5px; color: #64748b; margin: 3px 0 0; }
.bl-portal-btn {
  padding: 9px 20px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
  font-family: inherit;
  white-space: nowrap;
  transition: background .12s;
  flex-shrink: 0;
}
.bl-portal-btn:hover:not(:disabled) { background: #e2e8f0; }
.bl-portal-btn:disabled { opacity: .5; cursor: not-allowed; }

/* Alert */
.bl-alert {
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
  border: 1px solid;
}

.bl-alert.info { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.bl-alert.err  { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
.bl-alert.warn { background: #fef9c3; border-color: #fde68a; color: #92400e; }

/* Spinner */
.bl-spin {
  display: inline-block;
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: bl-spin .7s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}
.bl-spin.dark {
  border-color: rgba(0,0,0,.15);
  border-top-color: #334155;
}

@keyframes bl-spin { to { transform: rotate(360deg); } }

.bl-skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: bl-skel 1.2s infinite;
  border-radius: 6px;
  height: 14px;
}
@keyframes bl-skel { to { background-position: -200% 0; } }
</style>`;

// ── State ─────────────────────────────────────────────────────────────────────

let _container = null;
let _status    = null;

// ── API ────────────────────────────────────────────────────────────────────────

function _token() { return localStorage.getItem('nexhire_token') || ''; }
function _hdrs(json = false) {
  const h = { Authorization: `Bearer ${_token()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function _apiFetch(url, opts = {}) {
  const r = await fetch(url, { credentials: 'include', ...opts });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw Object.assign(new Error(e.detail || `Erreur ${r.status}`), { status: r.status });
  }
  return r.status === 204 ? null : r.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmtDate(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString('fr-CA', { year:'numeric', month:'long', day:'numeric' }); }
  catch (_) { return iso; }
}

function _daysLeft(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

const STATUS_LABELS = {
  trialing:  'Essai gratuit',
  trial:     'Essai gratuit',
  active:    'Actif',
  past_due:  'Paiement en retard',
  cancelled: 'Résilié',
};

const STATUS_ICONS = {
  trialing: '🎯', trial: '🎯', active: '✅', past_due: '⚠️', cancelled: '❌',
};

const PLAN_LABELS = { trial: 'Essai', starter: 'Starter', professional: 'Professionnel' };

// ── Plan definitions ───────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '99',
    desc: 'Pour les PME qui débutent leur transformation IA.',
    features: [
      '500 requêtes ATLAS / mois',
      'Jusqu\'à 10 utilisateurs',
      'Knowledge Hub (50 Mo)',
      'Connecteurs M365 & Google',
      'Rapport de maturité IA',
      'Support par courriel',
    ],
    tag: null,
  },
  {
    id: 'professional',
    name: 'Professionnel',
    price: '299',
    desc: 'Pour les organisations qui veulent accélérer à grande échelle.',
    features: [
      '5 000 requêtes ATLAS / mois',
      'Utilisateurs illimités',
      'Knowledge Hub (2 Go)',
      'Connecteurs avancés (SAP, HubSpot…)',
      'Rapports & exports personnalisés',
      'Dashboard exécutif complet',
      'Webhooks & API access',
      'Support prioritaire',
    ],
    tag: 'Populaire',
  },
];

// ── Render ─────────────────────────────────────────────────────────────────────

function _render() {
  if (!_container) return;
  const s = _status;
  const root = _container.querySelector('.bl-root');

  const statusKey  = s?.status || 'trialing';
  const planKey    = s?.plan   || 'trial';
  const trialDays  = _daysLeft(s?.trial_ends_at);
  const endsDate   = _fmtDate(s?.ends_at);
  const isOwner    = true; // Buttons are owner-only; API returns 403 for non-owners, handled on click

  let statusDesc = '';
  if (statusKey === 'trialing' || statusKey === 'trial') {
    statusDesc = trialDays !== null
      ? `Votre essai se termine dans <strong>${trialDays} jour${trialDays !== 1 ? 's' : ''}</strong>.`
      : 'Essai en cours.';
  } else if (statusKey === 'active') {
    statusDesc = endsDate ? `Prochain renouvellement : ${endsDate}.` : 'Abonnement actif.';
  } else if (statusKey === 'past_due') {
    statusDesc = 'Un paiement est en attente — accès limité jusqu\'à régularisation.';
  } else if (statusKey === 'cancelled') {
    statusDesc = endsDate ? `Accès disponible jusqu\'au ${endsDate}.` : 'Votre abonnement a été résilié.';
  }

  const stripeOk   = s?.stripe_configured && s?.price_starter_set && s?.price_professional_set;
  const stripeWarn = s && !stripeOk
    ? `<div class="bl-alert warn">⚠️ Stripe n'est pas entièrement configuré. Contactez l'administrateur pour finaliser l'intégration paiement.</div>`
    : '';

  const trialBanner = (statusKey === 'trialing' || statusKey === 'trial') && trialDays !== null
    ? `<div class="bl-alert info">🎯 Il vous reste <strong>${trialDays} jour${trialDays !== 1 ? 's' : ''}</strong> d'essai gratuit. Souscrivez un plan pour conserver l'accès complet.</div>`
    : '';

  const pastDueBanner = statusKey === 'past_due'
    ? `<div class="bl-alert err">⚠️ Paiement en retard — accès aux modules avancés suspendu. Mettez à jour votre moyen de paiement dans le portail Stripe.</div>`
    : '';

  const plansHtml = PLANS.map(p => {
    const isCurrent = planKey === p.id;
    const btnLabel  = isCurrent ? 'Plan actuel' : 'Choisir ce plan';
    const btnClass  = isCurrent ? 'bl-btn bl-btn-green' : 'bl-btn bl-btn-primary';
    const disabled  = isCurrent || !stripeOk ? 'disabled' : '';
    const tagHtml   = isCurrent
      ? `<div class="bl-plan-tag current">Actuel</div>`
      : (p.tag ? `<div class="bl-plan-tag popular">${p.tag}</div>` : '');

    return `
      <div class="bl-plan-card ${p.id === 'professional' && !isCurrent ? 'recommended' : ''} ${isCurrent ? 'current-plan' : ''}">
        ${tagHtml}
        <div class="bl-plan-name">${p.name}</div>
        <div class="bl-plan-price">${p.price} $<span> CAD / mois</span></div>
        <p class="bl-plan-desc">${p.desc}</p>
        <ul class="bl-plan-features">
          ${p.features.map(f => `<li>${_esc(f)}</li>`).join('')}
        </ul>
        <button class="${btnClass}" data-plan="${p.id}" ${disabled}>${btnLabel}</button>
      </div>`;
  }).join('');

  const hasStripe = s?.has_stripe;
  const portalHtml = hasStripe
    ? `<div class="bl-portal-card">
        <div class="bl-portal-icon">💳</div>
        <div class="bl-portal-info">
          <strong>Gérer l'abonnement</strong>
          <p>Modifier le moyen de paiement, consulter les factures, ou résilier via le portail Stripe.</p>
        </div>
        <button class="bl-portal-btn" id="bl-portal-btn">Portail de paiement →</button>
      </div>`
    : '';

  root.innerHTML = `
    <div class="bl-header">
      <h1>💳 Facturation & Abonnement</h1>
      <p>Gérez votre plan AgentHub et vos informations de paiement</p>
    </div>

    ${trialBanner}
    ${pastDueBanner}
    ${stripeWarn}

    <div class="bl-status-bar">
      <div class="bl-status-icon">${STATUS_ICONS[statusKey] || '🎯'}</div>
      <div class="bl-status-info">
        <strong>${PLAN_LABELS[planKey] || planKey}</strong>
        <p>${statusDesc}</p>
      </div>
      <span class="bl-badge ${statusKey}">${STATUS_LABELS[statusKey] || statusKey}</span>
    </div>

    <div id="bl-msg"></div>

    <div class="bl-plans">${plansHtml}</div>

    ${portalHtml}`;

  // Checkout buttons
  root.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const plan  = btn.dataset.plan;
      const msg   = root.querySelector('#bl-msg');
      btn.disabled = true;
      btn.innerHTML = '<span class="bl-spin"></span>Redirection…';
      msg.innerHTML = '';
      try {
        const res = await _apiFetch('/api/billing/checkout', {
          method: 'POST', headers: _hdrs(true),
          body: JSON.stringify({ plan }),
        });
        window.location.href = res.checkout_url;
      } catch (e) {
        let errMsg = e.message;
        if (e.status === 403) errMsg = 'Seul le propriétaire du compte peut modifier l\'abonnement.';
        msg.innerHTML = `<div class="bl-alert err">${_esc(errMsg)}</div>`;
        // re-render plan buttons
        root.querySelectorAll('[data-plan]').forEach(b => { b.disabled = false; b.textContent = b.dataset.plan === planKey ? 'Plan actuel' : 'Choisir ce plan'; });
      }
    });
  });

  // Portal button
  const portalBtn = root.querySelector('#bl-portal-btn');
  if (portalBtn) {
    portalBtn.addEventListener('click', async () => {
      const msg = root.querySelector('#bl-msg');
      portalBtn.disabled = true;
      portalBtn.innerHTML = '<span class="bl-spin dark"></span>Chargement…';
      msg.innerHTML = '';
      try {
        const res = await _apiFetch('/api/billing/portal', { method: 'POST', headers: _hdrs() });
        window.location.href = res.portal_url;
      } catch (e) {
        let errMsg = e.message;
        if (e.status === 403) errMsg = 'Seul le propriétaire du compte peut accéder au portail Stripe.';
        if (e.status === 404) errMsg = 'Aucun abonnement Stripe trouvé. Souscrivez d\'abord un plan.';
        msg.innerHTML = `<div class="bl-alert err">${_esc(errMsg)}</div>`;
        portalBtn.disabled = false;
        portalBtn.textContent = 'Portail de paiement →';
      }
    });
  }
}

// ── Mount ─────────────────────────────────────────────────────────────────────

async function _mount(container) {
  _status = null; _container = container;

  container.innerHTML = CSS + `
  <div class="bl-root">
    <div class="bl-header">
      <h1>💳 Facturation & Abonnement</h1>
      <p>Chargement en cours…</p>
    </div>
    <div style="padding:24px 0">
      <div class="bl-skeleton" style="width:60%;margin-bottom:12px"></div>
      <div class="bl-skeleton" style="width:40%"></div>
    </div>
  </div>`;

  try {
    _status = await _apiFetch('/api/billing/status', { headers: _hdrs() });
  } catch (e) {
    container.querySelector('.bl-root').innerHTML = `
      <div class="bl-header"><h1>💳 Facturation & Abonnement</h1></div>
      <div class="bl-alert err">${_esc(e.message)}</div>`;
    return;
  }

  _render();
}

export default {
  mount(container)   { _mount(container); },
  unmount(container) {
    container.innerHTML = '';
    _status = null; _container = null;
  },
  refresh(ctx) { if (_container) _render(); },
};
