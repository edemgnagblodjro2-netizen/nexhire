/**
 * AgentHub Platform — portal-login.js
 * Gestion connexion / inscription via lien d'invitation partenaire.
 * Stocke les tokens sous les mêmes clés que app.js (nexhire_token / nexhire_refresh_token)
 * pour que workspace.js puisse les lire sur le même origin.
 */

const _params  = new URLSearchParams(location.search);
const _partnerSlug = _params.get('partenaire') || null;

// ── Onglets ──────────────────────────────────────────────────────────────────

function switchTab(tab) {
  const tabs     = ['login', 'signup', 'forgot'];
  const sections = ['section-login', 'section-signup', 'section-forgot'];
  const tabBtns  = ['tab-login', 'tab-signup'];

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === `section-${tab}`);
  });
  tabBtns.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', id === `tab-${tab}`);
  });
  _clearErrors();
}

function _clearErrors() {
  ['login-error', 'forgot-error', 'signup-error'].forEach(id => _hideEl(id));
}

// ── Gestion du partenaire ─────────────────────────────────────────────────────

async function _initPartner() {
  if (!_partnerSlug) {
    // Pas de lien partenaire → bloquer l'inscription, autoriser la connexion
    _showInviteWall();
    return;
  }

  try {
    const res = await fetch(`/api/workspace/${_partnerSlug}/config`);
    if (!res.ok) throw new Error('invalid');
    const config = await res.json();

    // Appliquer la couleur primaire du partenaire
    if (config.primary_color) {
      document.documentElement.style.setProperty('--primary', config.primary_color);
    }

    // Badge "Vous rejoignez {nom}"
    const badge = document.getElementById('pl-partner-badge');
    const name  = document.getElementById('pl-partner-name');
    if (badge && name) {
      name.textContent = config.name || _partnerSlug;
      badge.classList.add('visible');
    }

    // Sous-titre du formulaire d'inscription
    const sub = document.getElementById('signup-sub');
    if (sub && config.name) {
      sub.textContent = `Rejoignez l'espace ${config.name} sur AgentHub Platform.`;
    }

    // Activer le formulaire d'inscription
    _showSignupForm();

  } catch {
    // Slug invalide ou partenaire inactif → bloquer l'inscription
    const errAlert = document.createElement('div');
    errAlert.className = 'ds-alert ds-alert-err';
    errAlert.style.cssText = 'margin-bottom:20px';
    errAlert.textContent = 'Ce lien d\'invitation n\'est plus valide. Contactez votre organisation partenaire.';
    document.getElementById('section-signup').prepend(errAlert);
    _showInviteWall();
  }
}

function _showInviteWall() {
  const wall = document.getElementById('pl-invite-wall');
  const form = document.getElementById('signup-form-wrap');
  if (wall) wall.classList.add('visible');
  if (form) form.style.display = 'none';
}

function _showSignupForm() {
  const wall = document.getElementById('pl-invite-wall');
  const form = document.getElementById('signup-form-wrap');
  if (wall) wall.classList.remove('visible');
  if (form) form.style.display = 'block';
}

// ── Helpers token ─────────────────────────────────────────────────────────────

function _saveToken(data) {
  // Mêmes clés que app.js saveToken() pour compatibilité cross-page
  if (data.access_token)  localStorage.setItem('nexhire_token',         data.access_token);
  if (data.refresh_token) localStorage.setItem('nexhire_refresh_token', data.refresh_token);
}

function _showEl(id)  { const el = document.getElementById(id); if (el) el.style.display = ''; }
function _hideEl(id)  { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function _setText(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
function _setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

function _setBtnLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn._orig = btn._orig || btn.innerHTML;
  btn.innerHTML = loading
    ? `<span class="pl-btn-spinner"></span>Chargement…`
    : btn._orig;
}

// ── Connexion ─────────────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  _hideEl('login-error');
  _setBtnLoading('login-btn', true);

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res  = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      const msg = data.detail === 'INVALID_CREDENTIALS'
        ? 'Courriel ou mot de passe incorrect.'
        : (data.detail || 'Connexion échouée. Veuillez réessayer.');
      _setHTML('login-error', msg);
      _showEl('login-error');
      return;
    }

    _saveToken(data);

    // Déterminer la destination via /api/auth/me
    const meRes  = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const me = meRes.ok ? await meRes.json() : null;

    if (me && me.partner_slug) {
      window.location.href = `/workspace/${me.partner_slug}`;
    } else {
      window.location.href = '/app';
    }

  } catch {
    _setHTML('login-error', 'Erreur réseau. Vérifiez votre connexion et réessayez.');
    _showEl('login-error');
  } finally {
    _setBtnLoading('login-btn', false);
  }
}

// ── Mot de passe oublié ───────────────────────────────────────────────────────

async function handleForgot(e) {
  e.preventDefault();
  _hideEl('forgot-error');
  _hideEl('forgot-success');
  _setBtnLoading('forgot-btn', true);

  const email = document.getElementById('forgot-email').value.trim();

  try {
    const res  = await fetch('/api/auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    });

    if (res.ok) {
      _setHTML('forgot-success', `Un lien de réinitialisation a été envoyé à <strong>${email}</strong> si ce compte existe.`);
      _showEl('forgot-success');
      document.getElementById('forgot-form').reset();
    } else {
      _setHTML('forgot-error', 'Erreur lors de l\'envoi. Vérifiez l\'adresse et réessayez.');
      _showEl('forgot-error');
    }
  } catch {
    _setHTML('forgot-error', 'Erreur réseau. Vérifiez votre connexion.');
    _showEl('forgot-error');
  } finally {
    _setBtnLoading('forgot-btn', false);
  }
}

// ── Inscription ───────────────────────────────────────────────────────────────

async function handleSignup(e) {
  e.preventDefault();
  _hideEl('signup-error');
  _setBtnLoading('signup-btn', true);

  const fname    = document.getElementById('signup-fname').value.trim();
  const lname    = document.getElementById('signup-lname').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const phone    = document.getElementById('signup-phone').value.trim();
  const password = document.getElementById('signup-password').value;

  const full_name = `${fname} ${lname}`.trim();

  try {
    const body = {
      full_name,
      email,
      phone,
      password,
      partner_slug: _partnerSlug || undefined,
    };

    const res  = await fetch('/api/auth/signup', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      let msg;
      if      (data.detail === 'PARTNER_INVALID')  msg = 'Ce lien d\'invitation n\'est plus valide.';
      else if (data.detail === 'INVITE_PENDING')    msg = 'Un lien d\'invitation est déjà en attente pour ce courriel.';
      else if (typeof data.detail === 'string')     msg = data.detail;
      else                                          msg = 'Inscription échouée. Vérifiez les informations saisies.';
      _setHTML('signup-error', msg);
      _showEl('signup-error');
      return;
    }

    // Confirmation non requise (Supabase email confirm désactivé) → auto-login
    if (!data.confirmation_required && data.access_token) {
      _saveToken(data);
      const meRes = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const me = meRes.ok ? await meRes.json() : null;
      window.location.href = (me && me.partner_slug)
        ? `/workspace/${me.partner_slug}`
        : '/app';
      return;
    }

    // Confirmation requise → afficher l'écran de succès
    document.getElementById('signup-email-sent').textContent = email;
    document.getElementById('signup-form').style.display = 'none';

    // Adapter le bouton d'ouverture de messagerie selon le domaine
    const gmailBtn = document.getElementById('btn-open-gmail');
    if (gmailBtn) {
      const domain = email.split('@')[1] || '';
      if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) {
        gmailBtn.href = 'https://outlook.live.com/mail/inbox';
        gmailBtn.innerHTML = gmailBtn.innerHTML.replace('Ouvrir Gmail', 'Ouvrir Outlook');
        gmailBtn.style.background = '#0078D4';
      } else if (domain.includes('yahoo')) {
        gmailBtn.href = 'https://mail.yahoo.com';
        gmailBtn.innerHTML = gmailBtn.innerHTML.replace('Ouvrir Gmail', 'Ouvrir Yahoo Mail');
        gmailBtn.style.background = '#6001D2';
      }
    }

    const successEl = document.getElementById('signup-success');
    if (successEl) successEl.classList.add('visible');

  } catch {
    _setHTML('signup-error', 'Erreur réseau. Vérifiez votre connexion et réessayez.');
    _showEl('signup-error');
  } finally {
    _setBtnLoading('signup-btn', false);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

_initPartner();
