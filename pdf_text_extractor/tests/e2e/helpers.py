"""Helpers partagés pour la suite E2E i18n."""

from __future__ import annotations

from playwright.sync_api import Page

# ── Dictionnaire EN attendu (extrait de i18n.js) ──────────────────────────────

EN_EXPECTED: dict[str, str] = {
    # Auth
    "tab.login": "Sign In",
    "tab.signup": "Create Account",
    "login.title": "Welcome back 👋",
    "login.sub": "Sign in to your AgentHub workspace.",
    "login.email.label": "Email address",
    "login.password.label": "Password",
    "login.remember": "Remember me",
    "login.btn": "Sign in",
    "login.forgot": "Forgot password?",
    "login.no_account": "No account yet?",
    "login.free_trial": "14-day free trial →",
    "forgot.title": "Forgot password",
    "forgot.btn": "Send reset link",
    "forgot.back": "← Back to sign in",
    "reset.title": "New password",
    "reset.btn": "Save new password",
    "signup.title": "Create your account",
    "signup.btn": "Create my account →",
    "signup.already": "Already have an account?",
    "signup.trial": "14-day free trial",
    "sso.divider": "or sign in with SSO",
    "sso.section.title": "Sign in via your organisation",
    "sso.btn": "Sign in with SSO →",
    "invite.title": "Invitation required",
    "brand.tagline": "The AI platform for",
    "brand.tagline.em": "modern organisations",
    "brand.footer": "© 2026 CivicAI Inc. · Powered by ATLAS AI",
    "brand.trust.hosting": "Canada-hosted",
    "brand.trust.law25": "Law 25 compliant",
}

FR_EXPECTED: dict[str, str] = {
    "tab.login": "Connexion",
    "tab.signup": "Créer un compte",
    "login.title": "Bon retour 👋",
    "login.sub": "Connectez-vous à votre espace AgentHub.",
    "login.email.label": "Adresse courriel",
    "login.password.label": "Mot de passe",
    "login.remember": "Se souvenir de moi",
    "login.btn": "Connexion",
    "login.forgot": "Mot de passe oublié ?",
    "sso.divider": "ou connexion via SSO",
    "sso.btn": "Se connecter avec SSO →",
    "brand.footer": "© 2026 CivicAI Inc. · Propulsé par ATLAS AI",
}

# Chaînes FR hardcodées dans workspace.js qui NE devraient PAS rester en FR après setLang('en')
WORKSPACE_SHELL_HARDCODED_FR: dict[str, str] = {
    # nav sections
    "nav_section_diagnostic": "Diagnostic & IA",
    "nav_section_intelligence": "Intelligence Décisionnelle",
    "nav_section_gouvernance": "Gouvernance",
    "nav_section_centre": "Centre d'intégrations",
    "nav_section_org": "Organisation",
    "nav_section_finance": "Finance & Contrats",
    "nav_section_prod": "Productivité",
    "nav_section_admin": "Administration",
    # nav item labels
    "nav_dashboard": "Tableau de bord",
    "nav_recommandations": "Recommandations",
    "nav_decisions": "Décisions IA",
    "nav_facturation": "Facturation",
    "nav_parametres": "Paramètres",
    "nav_contrats": "Contrats",
    "nav_departements": "Départements",
    "nav_securite": "Tableau de sécurité",
    "nav_aide": "Centre d'aide",
}

WORKSPACE_SHELL_EXPECTED_EN: dict[str, str] = {
    "nav_dashboard": "Dashboard",
    "nav_recommandations": "Recommendations",
    "nav_decisions": "AI Decisions",
    "nav_facturation": "Billing",
    "nav_parametres": "Settings",
    "nav_contrats": "Contracts",
    "nav_departements": "Departments",
}

# ── Helpers ───────────────────────────────────────────────────────────────────


def switch_lang(page: Page, lang: str) -> None:
    """Change la langue via NH_I18N et attend la propagation DOM."""
    page.evaluate(f"NH_I18N.setLang('{lang}')")
    page.wait_for_timeout(400)


def get_i18n_texts(page: Page) -> dict[str, str]:
    """Retourne {key: textContent} pour tous les éléments [data-i18n]."""
    return page.evaluate("""() => {
        const out = {};
        document.querySelectorAll('[data-i18n]').forEach(el => {
            out[el.dataset.i18n] = el.textContent.trim();
        });
        return out;
    }""")


def get_i18n_placeholders(page: Page) -> dict[str, str]:
    """Retourne {key: placeholder} pour tous les éléments [data-i18n-ph]."""
    return page.evaluate("""() => {
        const out = {};
        document.querySelectorAll('[data-i18n-ph]').forEach(el => {
            out[el.dataset.i18nPh] = el.placeholder || '';
        });
        return out;
    }""")


def count_data_i18n_elements(page: Page) -> int:
    """Compte les éléments avec data-i18n dans le DOM actuel."""
    return page.evaluate(
        "() => document.querySelectorAll('[data-i18n]').length"
    )


def get_nav_item_labels(page: Page) -> dict[str, str]:
    """Retourne {data-id: label} pour chaque nav item rendu."""
    return page.evaluate("""() => {
        const out = {};
        document.querySelectorAll('.ws-nav-item[data-id]').forEach(btn => {
            const span = btn.querySelector('.ws-nav-name');
            if (span) out[btn.dataset.id] = span.textContent.trim();
        });
        return out;
    }""")


def get_nav_section_labels(page: Page) -> list[str]:
    """Retourne la liste des labels de sections de nav."""
    return page.evaluate("""() =>
        [...document.querySelectorAll('.ws-nav-label')]
            .map(el => el.textContent.trim())
    """)


def get_user_menu_items(page: Page) -> list[str]:
    """Texte des boutons dans le panneau utilisateur."""
    page.click("#ws-user-btn")
    page.wait_for_selector("#ws-user-panel.open, #ws-user-panel[style*='display']", timeout=2_000)
    items = page.evaluate("""() =>
        [...document.querySelectorAll('#ws-user-panel .ws-menu-item')]
            .map(el => el.querySelector('.ws-menu-item-title')?.textContent.trim() || el.textContent.trim())
    """)
    page.click("#ws-user-btn")  # fermer le panel
    return items


def wait_for_module_load(page: Page, timeout: int = 8_000) -> None:
    """Attend que le module en cours soit chargé (spinner disparu)."""
    page.wait_for_selector(".ws-state", state="detached", timeout=timeout)


def nav_to(page: Page, nav_id: str) -> None:
    """Clique sur un nav item par data-id et attend le chargement du module."""
    btn = page.locator(f".ws-nav-item[data-id='{nav_id}']")
    btn.wait_for(state="visible", timeout=5_000)
    btn.click()
    page.wait_for_timeout(500)


def get_console_errors(page: Page) -> list[str]:
    """Retourne les erreurs console capturées (à utiliser avec page.on handler)."""
    return []  # voir fixture console_errors
