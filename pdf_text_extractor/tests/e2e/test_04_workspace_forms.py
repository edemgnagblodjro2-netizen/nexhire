"""
Test 04 — Formulaires workspace : présence, boutons, labels
============================================================
Vérifie que chaque module contenant un formulaire :
- Affiche bien ses champs (input, select, textarea)
- Affiche ses boutons avec du texte
- N'est pas bloqué par un état d'erreur ou loading infini
- Que les boutons soient cliquables

Note : ces tests vérifient l'existence des formulaires, pas leur soumission
(les soumissions nécessitent un vrai backend connecté).
"""

from __future__ import annotations

import pytest
from playwright.sync_api import Page, expect

from tests.e2e.helpers import nav_to


# ── Helper local ──────────────────────────────────────────────────────────────


def wait_module_ready(page: Page, timeout: int = 4_000) -> None:
    """Attend que le spinner de chargement disparaisse."""
    try:
        page.wait_for_selector(".ds-spinner, .dash-spin, .ws-spinner", state="detached", timeout=timeout)
    except Exception:
        pass  # pas de spinner = déjà chargé ou autre state


def get_form_info(page: Page) -> dict:
    """Inspecte le contenu du module actif."""
    return page.evaluate("""() => {
        const container = document.getElementById('ws-app-container');
        if (!container) return {};
        return {
            inputs: container.querySelectorAll('input:not([type="hidden"])').length,
            selects: container.querySelectorAll('select').length,
            textareas: container.querySelectorAll('textarea').length,
            buttons: [...container.querySelectorAll('button')]
                .filter(b => b.textContent.trim().length > 0)
                .map(b => b.textContent.trim().substring(0, 60)),
            labels: [...container.querySelectorAll('label')]
                .map(l => l.textContent.trim().substring(0, 60)),
        };
    }""")


# ── Contrats ──────────────────────────────────────────────────────────────────


class TestContractsForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        nav_to(demo_workspace, "contracts")
        wait_module_ready(demo_workspace, 4_000)

    def test_contracts_module_has_content(self, demo_workspace: Page) -> None:
        html = demo_workspace.locator("#ws-app-container").inner_html()
        assert len(html.strip()) > 100, "Module Contrats : aucun contenu"

    def test_contracts_has_add_button(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        add_labels = [b for b in info.get("buttons", []) if
                      any(w in b.lower() for w in ["ajouter", "créer", "nouveau", "add", "new", "create"])]
        assert add_labels, (
            f"Aucun bouton d'ajout dans Contrats. Boutons trouvés : {info.get('buttons', [])}"
        )

    def test_contracts_add_button_opens_form(self, demo_workspace: Page) -> None:
        """Cliquer sur le premier bouton d'ajout doit révéler un formulaire."""
        container = demo_workspace.locator("#ws-app-container")
        add_btn = container.locator("button").filter(
            has_text=lambda t: any(w in t.lower() for w in ["ajouter", "créer", "nouveau"])
        ).first
        if add_btn.count() == 0:
            pytest.skip("Pas de bouton d'ajout trouvé dans Contrats")
        add_btn.click()
        demo_workspace.wait_for_timeout(500)
        info = get_form_info(demo_workspace)
        assert info.get("inputs", 0) >= 1, "Clic bouton ajout : aucun champ de formulaire apparu"


# ── Assets / Actifs ───────────────────────────────────────────────────────────


class TestAssetsForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        btn = demo_workspace.locator(".ws-nav-item[data-id='assets']")
        if btn.count() == 0:
            pytest.skip("Module Assets absent de la nav")
        nav_to(demo_workspace, "assets")
        wait_module_ready(demo_workspace, 4_000)

    def test_assets_has_add_button(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        add_labels = [b for b in info.get("buttons", []) if
                      any(w in b.lower() for w in ["ajouter", "actif", "add", "new"])]
        assert add_labels, f"Aucun bouton ajout actif. Boutons : {info.get('buttons', [])}"

    def test_assets_save_button_has_text(self, demo_workspace: Page) -> None:
        """Le bouton save doit afficher soit 'Enregistrer' soit 'Ajouter l'actif'."""
        container = demo_workspace.locator("#ws-app-container")
        save_btns = container.locator("button").all()
        texts = [b.text_content().strip() for b in save_btns if b.text_content().strip()]
        has_save = any(
            "enregistrer" in t.lower() or "ajouter" in t.lower() or "save" in t.lower()
            for t in texts
        )
        assert has_save, f"Aucun bouton save/enregistrer. Boutons : {texts[:10]}"


# ── Budget ────────────────────────────────────────────────────────────────────


class TestBudgetForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        btn = demo_workspace.locator(".ws-nav-item[data-id='budget']")
        if btn.count() == 0:
            pytest.skip("Module Budget absent de la nav")
        nav_to(demo_workspace, "budget")
        wait_module_ready(demo_workspace, 4_000)

    def test_budget_has_content(self, demo_workspace: Page) -> None:
        html = demo_workspace.locator("#ws-app-container").inner_html()
        assert len(html) > 200

    def test_budget_generation_button_exists(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        btns = info.get("buttons", [])
        has_generate = any(
            "génér" in b.lower() or "generat" in b.lower() or "rapport" in b.lower()
            for b in btns
        )
        assert has_generate, f"Bouton génération absent. Boutons : {btns[:10]}"


# ── Settings ──────────────────────────────────────────────────────────────────


class TestSettingsForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        nav_to(demo_workspace, "settings")
        wait_module_ready(demo_workspace, 5_000)

    def test_settings_has_content(self, demo_workspace: Page) -> None:
        html = demo_workspace.locator("#ws-app-container").inner_html()
        assert len(html.strip()) > 100, "Module Settings : contenu vide"

    def test_settings_has_input_fields(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        assert info.get("inputs", 0) >= 1, "Settings : aucun champ input"

    def test_settings_has_save_button(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        has_save = any(
            "enregistrer" in b.lower() or "save" in b.lower() or "modifier" in b.lower()
            for b in info.get("buttons", [])
        )
        assert has_save, f"Settings : aucun bouton Enregistrer. Boutons : {info.get('buttons', [])[:10]}"

    def test_settings_password_field_is_password_type(self, demo_workspace: Page) -> None:
        pw_fields = demo_workspace.locator("#ws-app-container input[type='password']").count()
        assert pw_fields >= 1, "Settings : aucun champ mot de passe"

    def test_settings_invitation_input_exists(self, demo_workspace: Page) -> None:
        """Champ email pour inviter un utilisateur."""
        email_inputs = demo_workspace.locator("#ws-app-container input[type='email'], #ws-app-container input[placeholder*='@']").count()
        assert email_inputs >= 1, "Settings : aucun champ email (invitation)"


# ── Identity ──────────────────────────────────────────────────────────────────


class TestIdentityForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        nav_to(demo_workspace, "identity")
        wait_module_ready(demo_workspace, 5_000)

    def test_identity_has_content(self, demo_workspace: Page) -> None:
        html = demo_workspace.locator("#ws-app-container").inner_html()
        assert len(html.strip()) > 100

    def test_identity_activate_deactivate_button_exists(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        btns = info.get("buttons", [])
        has_toggle = any(
            any(w in b.lower() for w in ["activer", "désactiver", "activate", "deactivate"])
            for b in btns
        )
        assert has_toggle, f"Identity : bouton Activer/Désactiver absent. Boutons : {btns[:10]}"


# ── Integrations ──────────────────────────────────────────────────────────────


class TestIntegrationsForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        btn = demo_workspace.locator(".ws-nav-item[data-id='integrations']")
        if btn.count() == 0:
            pytest.skip("Module Integrations absent de la nav")
        nav_to(demo_workspace, "integrations")
        wait_module_ready(demo_workspace, 5_000)

    def test_integrations_has_connector_buttons(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        btns = info.get("buttons", [])
        has_connect = any(
            any(w in b.lower() for w in ["connexion", "connect", "déconnecter", "disconnect", "activer"])
            for b in btns
        )
        assert has_connect, f"Integrations : aucun bouton de connexion. Boutons : {btns[:10]}"


# ── Service accounts ──────────────────────────────────────────────────────────


class TestServiceAccountsForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        btn = demo_workspace.locator(".ws-nav-item[data-id='service-accounts']")
        if btn.count() == 0:
            pytest.skip("Module Service Accounts absent de la nav")
        nav_to(demo_workspace, "service-accounts")
        wait_module_ready(demo_workspace, 4_000)

    def test_service_accounts_create_button_exists(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        btns = info.get("buttons", [])
        has_create = any(
            "créer" in b.lower() or "create" in b.lower() or "compte" in b.lower()
            for b in btns
        )
        assert has_create, f"Service Accounts : bouton Créer absent. Boutons : {btns[:10]}"


# ── SSO / MFA ─────────────────────────────────────────────────────────────────


class TestSSOForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        btn = demo_workspace.locator(".ws-nav-item[data-id='sso-mfa']")
        if btn.count() == 0:
            pytest.skip("Module SSO/MFA absent de la nav")
        nav_to(demo_workspace, "sso-mfa")
        wait_module_ready(demo_workspace, 4_000)

    def test_sso_module_has_content(self, demo_workspace: Page) -> None:
        html = demo_workspace.locator("#ws-app-container").inner_html()
        assert len(html) > 200

    def test_mfa_toggle_button_exists(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        btns = info.get("buttons", [])
        has_mfa = any(
            any(w in b.lower() for w in ["activé", "désactivé", "enabled", "disabled", "mfa"])
            for b in btns
        )
        assert has_mfa, f"SSO/MFA : bouton statut MFA absent. Boutons : {btns[:10]}"


# ── Diagnostic IA ─────────────────────────────────────────────────────────────


class TestDiagnosticForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        btn = demo_workspace.locator(".ws-nav-item[data-id='diagnostic-ia']")
        if btn.count() == 0:
            pytest.skip("Module Diagnostic IA absent de la nav")
        nav_to(demo_workspace, "diagnostic-ia")
        wait_module_ready(demo_workspace, 4_000)

    def test_diagnostic_has_start_button(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        btns = info.get("buttons", [])
        has_start = any(
            any(w in b.lower() for w in ["lancer", "démarrer", "commencer", "start", "évaluation"])
            for b in btns
        )
        assert has_start, f"Diagnostic : bouton démarrage absent. Boutons : {btns[:10]}"

    def test_diagnostic_has_profile_selector(self, demo_workspace: Page) -> None:
        """Le diagnostic doit proposer un choix de profil."""
        info = get_form_info(demo_workspace)
        has_selector = info.get("selects", 0) >= 1 or info.get("inputs", 0) >= 1
        assert has_selector, "Diagnostic : aucun sélecteur ou champ de profil"


# ── Knowledge base ────────────────────────────────────────────────────────────


class TestKnowledgeForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        btn = demo_workspace.locator(".ws-nav-item[data-id='knowledge']")
        if btn.count() == 0:
            pytest.skip("Module Knowledge absent de la nav")
        nav_to(demo_workspace, "knowledge")
        wait_module_ready(demo_workspace, 4_000)

    def test_knowledge_has_discover_button(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        btns = info.get("buttons", [])
        has_discover = any(
            any(w in b.lower() for w in ["découvrir", "discover", "sites", "detect"])
            for b in btns
        )
        assert has_discover, f"Knowledge : bouton découverte absent. Boutons : {btns[:10]}"


# ── Sales Intelligence ────────────────────────────────────────────────────────


class TestSalesIntelligenceForm:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        btn = demo_workspace.locator(".ws-nav-item[data-id='sales-intelligence']")
        if btn.count() == 0:
            pytest.skip("Module Sales Intelligence absent de la nav")
        nav_to(demo_workspace, "sales-intelligence")
        wait_module_ready(demo_workspace, 4_000)

    def test_sales_has_add_prospect_button(self, demo_workspace: Page) -> None:
        info = get_form_info(demo_workspace)
        btns = info.get("buttons", [])
        has_add = any(
            any(w in b.lower() for w in ["prospect", "créer", "ajouter", "create", "add"])
            for b in btns
        )
        assert has_add, f"Sales : bouton ajout prospect absent. Boutons : {btns[:10]}"


# ── Boutons globaux — vérifie qu'aucun bouton sans texte n'existe ──────────────


class TestNoEmptyButtons:
    def test_nav_buttons_all_have_text_or_aria(self, demo_workspace: Page) -> None:
        """Tous les boutons nav doivent avoir un texte ou un aria-label."""
        empty = demo_workspace.evaluate("""() => {
            const btns = [...document.querySelectorAll('.ws-nav-item')];
            return btns.filter(b =>
                !b.textContent.trim() &&
                !b.getAttribute('aria-label')
            ).length;
        }""")
        assert empty == 0, f"{empty} nav item(s) sans texte ni aria-label"

    def test_topbar_buttons_have_aria_labels(self, demo_workspace: Page) -> None:
        """Tous les boutons icône du topbar doivent avoir title ou aria-label."""
        result = demo_workspace.evaluate("""() => {
            const btns = [...document.querySelectorAll('#ws-topbar-right .ws-icon-btn')];
            return btns.filter(b =>
                !b.getAttribute('title') &&
                !b.getAttribute('aria-label')
            ).map(b => b.id || b.className);
        }""")
        assert result == [], f"Boutons topbar sans label accessibilité : {result}"
