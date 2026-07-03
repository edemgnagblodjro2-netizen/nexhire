/**
 * AgentHub Platform — portal-login.js
 * Gestion connexion / inscription via lien d'invitation partenaire.
 * Stocke les tokens sous les mêmes clés que app.js (nexhire_token / nexhire_refresh_token)
 * pour que workspace.js puisse les lire sur le même origin.
 */

const _params      = new URLSearchParams(location.search);
const _partnerSlug = _params.get('partenaire') || null;
const _inviteToken = _params.get('invite')     || null;
if (_inviteToken) sessionStorage.setItem('nh_pending_invite', _inviteToken);

// ── Onglets ──────────────────────────────────────────────────────────────────

function switchTab(tab) {
  const sections = ['section-login', 'section-signup', 'section-forgot', 'section-reset'];
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
    // B2B direct — inscription autonome sans partenaire
    _showSignupForm();
    const sub = document.getElementById('signup-sub');
    if (sub) sub.textContent = 'Créez votre espace de travail IA. 14 jours d\'essai gratuit — aucune carte requise.';
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

async function _initInvite() {
  const token = _inviteToken || sessionStorage.getItem('nh_pending_invite');
  if (!token) return;
  try {
    const res = await fetch(`/api/members/invite/validate?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      sessionStorage.removeItem('nh_pending_invite');
      return;
    }
    const inv = await res.json();
    // Pré-remplir le courriel dans les deux formulaires
    const loginEmail  = document.getElementById('login-email');
    const signupEmail = document.getElementById('signup-email');
    if (loginEmail  && inv.email) loginEmail.value  = inv.email;
    if (signupEmail && inv.email) signupEmail.value = inv.email;
    // Bannière d'invitation dans les deux sections
    const orgName   = inv.org_name || 'votre organisation';
    const roleLabel = { user: 'Utilisateur', manager: 'Manager', admin: 'Administrateur' }[inv.role] || inv.role;
    const bannerHtml = `<div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:.88rem;color:#3730a3">
      <strong>Invitation reçue</strong> — Rejoignez <strong>${orgName}</strong> en tant que <em>${roleLabel}</em>. Connectez-vous ou créez un compte pour accepter.
    </div>`;
    ['section-login', 'section-signup'].forEach(sId => {
      const sec = document.getElementById(sId);
      if (!sec) return;
      const div = document.createElement('div');
      div.innerHTML = bannerHtml;
      sec.insertBefore(div.firstElementChild, sec.firstChild);
    });
  } catch {}
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

    // Appliquer l'invitation en attente si présente
    const pendingInvite = _inviteToken || sessionStorage.getItem('nh_pending_invite');
    if (pendingInvite) {
      try {
        await fetch('/api/members/apply-invite', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.access_token}` },
          body:    JSON.stringify({ token: pendingInvite }),
        });
        sessionStorage.removeItem('nh_pending_invite');
      } catch {}
    }

    // Rediriger : partner depuis l'URL d'invitation, sinon via /api/auth/me
    if (_partnerSlug) {
      window.location.href = `/workspace/${_partnerSlug}`;
      return;
    }
    const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } });
    const me    = meRes.ok ? await meRes.json() : null;
    const dest  = me && (me.partner_slug || me.org_slug)
      ? `/workspace/${me.partner_slug || me.org_slug}`
      : '/inscription';
    window.location.href = dest;

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
  const org_name = document.getElementById('signup-org-name').value.trim();
  const org_type = (document.querySelector('input[name="org_type"]:checked') || {}).value || '';
  const currency = (document.getElementById('signup-currency') || {}).value || 'CAD';
  const password = document.getElementById('signup-password').value;
  const cgu      = document.getElementById('signup-cgu');

  const full_name = `${fname} ${lname}`.trim();

  if (!org_type) {
    _setHTML('signup-error', 'Veuillez sélectionner le type de votre organisation.');
    _showEl('signup-error');
    _setBtnLoading('signup-btn', false);
    return;
  }

  if (cgu && !cgu.checked) {
    _setHTML('signup-error', 'Vous devez accepter les conditions d\'utilisation pour continuer.');
    _showEl('signup-error');
    _setBtnLoading('signup-btn', false);
    return;
  }

  try {
    const body = {
      full_name,
      email,
      phone,
      password,
      organization_name: org_name || 'Mon organisation',
      org_type,
      currency,
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

    // Dans tous les cas : afficher l'écran de succès, jamais de redirect automatique.
    document.getElementById('signup-email-sent').textContent = email;
    document.getElementById('signup-form').style.display = 'none';

    if (!data.confirmation_required) {
      // Supabase a créé la session sans confirmation email.
      // On NE sauvegarde PAS le token — l'utilisateur doit se connecter explicitement.
      const titleEl = document.querySelector('#signup-success .pl-success-title');
      if (titleEl) titleEl.textContent = 'Connectez-vous pour accéder à votre espace';
      document.querySelectorAll('#signup-success .pl-success-desc').forEach(el => el.style.display = 'none');
      const emailBox = document.querySelector('#signup-success .pl-success-email');
      if (emailBox) emailBox.style.display = 'none';
      const gmailBtn = document.getElementById('btn-open-gmail');
      if (gmailBtn) gmailBtn.style.display = 'none';
    } else {
      // Confirmation email requise → adapter le bouton messagerie selon le domaine
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

// ── Réinitialisation mot de passe ─────────────────────────────────────────────

let _recoveryToken = null;

async function handleResetPassword(e) {
  e.preventDefault();
  _hideEl('reset-error');
  _hideEl('reset-success');
  _setBtnLoading('reset-btn', true);

  const password = document.getElementById('reset-password').value;
  const confirm  = document.getElementById('reset-confirm').value;

  if (password !== confirm) {
    _setHTML('reset-error', 'Les mots de passe ne correspondent pas.');
    _showEl('reset-error');
    _setBtnLoading('reset-btn', false);
    return;
  }
  if (password.length < 12) {
    _setHTML('reset-error', 'Le mot de passe doit contenir au moins 12 caractères.');
    _showEl('reset-error');
    _setBtnLoading('reset-btn', false);
    return;
  }

  try {
    const res  = await fetch('/api/auth/update-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ access_token: _recoveryToken, new_password: password }),
    });
    const data = await res.json();

    if (!res.ok) {
      _setHTML('reset-error', data.detail || 'Échec de la mise à jour. Réessayez ou demandez un nouveau lien.');
      _showEl('reset-error');
      return;
    }

    _setHTML('reset-success', 'Mot de passe mis à jour avec succès. Vous pouvez maintenant vous connecter.');
    _showEl('reset-success');
    document.getElementById('reset-form').style.display = 'none';

    setTimeout(() => switchTab('login'), 2500);
  } catch {
    _setHTML('reset-error', 'Erreur réseau. Vérifiez votre connexion et réessayez.');
    _showEl('reset-error');
  } finally {
    _setBtnLoading('reset-btn', false);
  }
}

// ── Retour de confirmation Supabase ────────────────────────────────────────────
// Quand l'utilisateur clique le lien de confirmation dans son email,
// Supabase redirige vers /inscription avec les tokens dans le hash (#access_token=...).

function _handleRecoveryRedirect() {
  const hash        = new URLSearchParams(location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const type        = hash.get('type');

  if (!accessToken || type !== 'recovery') return false;

  history.replaceState(null, '', location.pathname + location.search);
  _recoveryToken = accessToken;
  switchTab('reset');
  return true;
}

async function _handleConfirmationRedirect() {
  const hash         = new URLSearchParams(location.hash.replace(/^#/, ''));
  const accessToken  = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  const type         = hash.get('type');

  if (!accessToken || type !== 'signup') return false;

  // Nettoyer l'URL (supprimer le hash avec les tokens)
  history.replaceState(null, '', location.pathname + location.search);

  _saveToken({ access_token: accessToken, refresh_token: refreshToken });

  // Appliquer l'invitation stockée avant la confirmation email
  const storedInvite = sessionStorage.getItem('nh_pending_invite');
  if (storedInvite) {
    try {
      await fetch('/api/members/apply-invite', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body:    JSON.stringify({ token: storedInvite }),
      });
      sessionStorage.removeItem('nh_pending_invite');
    } catch {}
  }

  try {
    const meRes = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const me = meRes.ok ? await meRes.json() : null;
    const dest = me && (me.partner_slug || me.org_slug)
      ? `/workspace/${me.partner_slug || me.org_slug}`
      : '/inscription';
    window.location.href = dest;
  } catch {
    window.location.href = '/inscription';
  }

  return true;
}

// ── Init ──────────────────────────────────────────────────────────────────────

(async () => {
  if (_handleRecoveryRedirect()) return;
  const handled = await _handleConfirmationRedirect();
  if (!handled) {
    await _initPartner();
    await _initInvite();
  }
})();
