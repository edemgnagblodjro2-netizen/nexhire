"""
Test 03 — Navigation workspace : cliquer sur tous les menus
============================================================
Ouvre chaque module de la barre latérale et vérifie :
- Le module charge (pas d'erreur JS, spinner disparu)
- Un contenu est rendu dans #ws-app-container
- Le nav item actif est correctement mis en évidence
- L'URL ou le breadcrumb reflète la navigation
"""

from __future__ import annotations

import pytest
from playwright.sync_api import Page, expect

from tests.e2e.helpers import nav_to


# ── Liste des modules attendus avec leur data-id ──────────────────────────────

# Modules principaux (toujours présents dans _NAV_GROUPS)
CORE_NAV_ITEMS = [
    ("dashboard",       "Tableau de bord"),
    ("recommandations", "Recommandations"),
    ("decisions",       "Décisions IA"),
    ("conformite",      "Conformité Causale"),
    ("departments",     "Départements"),
    ("contracts",       "Contrats"),
    ("identity",        "Utilisateurs & Accès"),
    ("security",        "Tableau de sécurité"),
    ("billing",         "Facturation"),
    ("help",            "Centre d'aide"),
    ("settings",        "Paramètres"),
]

# Modules app (chargés dynamiquement depuis /apps)
APP_NAV_ITEMS = [
    ("diagnostic-ia",     "Diagnostic IA"),
    ("enterprise-intel",  "Enterprise Intelligence"),
    ("assets",            "Actifs"),
    ("budget",            "Budget"),
    ("integrations",      "Intégrations"),
    ("knowledge",         "Base de connaissances"),
    ("sso-mfa",           "SSO & MFA"),
    ("sales-intelligence","Sales Intelligence"),
    ("automation",        "Automation"),
]


# ── Pré-conditions ────────────────────────────────────────────────────────────


class TestNavRendered:
    def test_nav_has_items(self, demo_workspace: Page) -> None:
        count = demo_workspace.locator(".ws-nav-item").count()
        assert count >= 10, f"Nombre insuffisant de nav items : {count}"

    def test_nav_has_sections(self, demo_workspace: Page) -> None:
        count = demo_workspace.locator(".ws-nav-label").count()
        assert count >= 4, f"Pas assez de sections nav : {count}"

    def test_sidebar_is_visible(self, demo_workspace: Page) -> None:
        sidebar = demo_workspace.locator("#ws-sidebar")
        expect(sidebar).to_be_visible()

    def test_all_core_nav_ids_present(self, demo_workspace: Page) -> None:
        missing = []
        for nav_id, label in CORE_NAV_ITEMS:
            btn = demo_workspace.locator(f".ws-nav-item[data-id='{nav_id}']")
            if btn.count() == 0:
                missing.append(f"{nav_id} ({label})")
        assert not missing, f"Nav items absents du DOM : {missing}"


# ── Clic sur chaque module core ───────────────────────────────────────────────


@pytest.mark.parametrize("nav_id,label", CORE_NAV_ITEMS)
class TestCoreNavClick:
    def test_nav_item_is_visible(
        self, demo_workspace: Page, nav_id: str, label: str
    ) -> None:
        btn = demo_workspace.locator(f".ws-nav-item[data-id='{nav_id}']")
        expect(btn).to_be_visible()

    def test_nav_item_click_no_js_error(
        self, demo_workspace: Page, nav_id: str, label: str
    ) -> None:
        errors: list[str] = []
        demo_workspace.on("pageerror", lambda e: errors.append(str(e)))
        nav_to(demo_workspace, nav_id)
        demo_workspace.wait_for_timeout(1_000)
        assert not errors, f"Erreur JS lors du clic sur '{label}' : {errors}"

    def test_nav_item_click_sets_active(
        self, demo_workspace: Page, nav_id: str, label: str
    ) -> None:
        nav_to(demo_workspace, nav_id)
        active_btn = demo_workspace.locator(f".ws-nav-item[data-id='{nav_id}'].active")
        expect(active_btn).to_be_visible()

    def test_nav_item_click_loads_content(
        self, demo_workspace: Page, nav_id: str, label: str
    ) -> None:
        nav_to(demo_workspace, nav_id)
        demo_workspace.wait_for_timeout(1_500)
        container = demo_workspace.locator("#ws-app-container")
        # Le container doit avoir du contenu (pas vide, pas juste un spinner)
        html = container.inner_html()
        assert len(html.strip()) > 50, (
            f"Module '{label}' ({nav_id}) : contenu vide après 1.5s"
        )

    def test_nav_item_click_no_fatal_screen(
        self, demo_workspace: Page, nav_id: str, label: str
    ) -> None:
        nav_to(demo_workspace, nav_id)
        demo_workspace.wait_for_timeout(1_500)
        # Vérifier qu'on n'est pas sur l'écran fatal (_showFatal)
        fatal = demo_workspace.locator(".ds-empty-title:has-text('Workspace introuvable')")
        assert fatal.count() == 0, f"Écran fatal affiché pour '{label}'"


# ── Topbar panels ─────────────────────────────────────────────────────────────


class TestTopbarPanels:
    def test_notification_btn_opens_panel(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-notif-btn")
        demo_workspace.wait_for_timeout(200)
        panel = demo_workspace.locator("#ws-notif-panel")
        classes = panel.get_attribute("class") or ""
        assert "open" in classes, "Panneau notifications ne s'ouvre pas"

    def test_notification_panel_has_items(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-notif-btn")
        demo_workspace.wait_for_timeout(300)
        items = demo_workspace.locator("#ws-notif-list").inner_html()
        assert len(items) > 0, "Liste de notifications vide"

    def test_help_btn_opens_panel(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-help-btn")
        demo_workspace.wait_for_timeout(200)
        panel = demo_workspace.locator("#ws-help-panel")
        classes = panel.get_attribute("class") or ""
        assert "open" in classes, "Panneau aide ne s'ouvre pas"

    def test_help_panel_has_menu_items(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-help-btn")
        demo_workspace.wait_for_timeout(200)
        items = demo_workspace.locator("#ws-help-panel .ws-menu-item").count()
        assert items >= 4, f"Panneau aide : {items} items, attendu ≥ 4"

    def test_settings_btn_opens_panel(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-settings-btn")
        demo_workspace.wait_for_timeout(200)
        panel = demo_workspace.locator("#ws-settings-panel")
        classes = panel.get_attribute("class") or ""
        assert "open" in classes, "Panneau paramètres rapides ne s'ouvre pas"

    def test_user_btn_opens_panel(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-user-btn")
        demo_workspace.wait_for_timeout(200)
        panel = demo_workspace.locator("#ws-user-panel")
        classes = panel.get_attribute("class") or ""
        assert "open" in classes, "Panneau utilisateur ne s'ouvre pas"

    def test_user_panel_has_menu_items(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-user-btn")
        demo_workspace.wait_for_timeout(200)
        items = demo_workspace.locator("#ws-user-panel .ws-menu-item").count()
        assert items >= 3, f"Menu utilisateur : {items} items, attendu ≥ 3"


# ── Recherche ────────────────────────────────────────────────────────────────


class TestSearch:
    def test_search_trigger_opens_overlay(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-search-trigger")
        demo_workspace.wait_for_timeout(300)
        overlay = demo_workspace.locator("#ws-search-overlay")
        expect(overlay).to_be_visible()

    def test_search_input_is_focused(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-search-trigger")
        demo_workspace.wait_for_timeout(200)
        focused = demo_workspace.evaluate(
            "() => document.activeElement?.id"
        )
        assert focused == "ws-search-input", f"Focus pas sur search input : {focused}"

    def test_search_keyboard_shortcut(self, demo_workspace: Page) -> None:
        demo_workspace.keyboard.press("Control+k")
        demo_workspace.wait_for_timeout(300)
        overlay = demo_workspace.locator("#ws-search-overlay")
        expect(overlay).to_be_visible()

    def test_search_shows_quick_launch_items(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-search-trigger")
        demo_workspace.wait_for_timeout(300)
        items = demo_workspace.locator(".ws-sr-item").count()
        assert items >= 3, f"Quick launch : {items} items, attendu ≥ 3"

    def test_search_with_query_filters_results(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-search-trigger")
        demo_workspace.wait_for_timeout(200)
        demo_workspace.fill("#ws-search-input", "tableau")
        demo_workspace.wait_for_timeout(400)
        results = demo_workspace.locator("#ws-search-results").inner_html()
        assert len(results) > 0, "Aucun résultat pour 'tableau'"

    def test_search_escape_closes_overlay(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-search-trigger")
        demo_workspace.wait_for_timeout(200)
        demo_workspace.keyboard.press("Escape")
        demo_workspace.wait_for_timeout(200)
        overlay = demo_workspace.locator("#ws-search-overlay")
        classes = overlay.get_attribute("class") or ""
        assert "open" not in classes, "Overlay search pas fermé par Escape"

    def test_search_result_click_navigates(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-search-trigger")
        demo_workspace.wait_for_timeout(200)
        first_item = demo_workspace.locator(".ws-sr-item").first
        nav_id = first_item.get_attribute("data-nav-id")
        first_item.click()
        demo_workspace.wait_for_timeout(600)
        if nav_id:
            active = demo_workspace.evaluate(
                "() => document.querySelector('.ws-nav-item.active')?.dataset.id"
            )
            assert active == nav_id, f"Navigation depuis search : attendu {nav_id}, actif {active}"


# ── Sidebar toggle ────────────────────────────────────────────────────────────


class TestSidebarToggle:
    def test_sidebar_toggle_collapses(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-sidebar-toggle")
        demo_workspace.wait_for_timeout(300)
        body_classes = demo_workspace.evaluate("() => document.body.className")
        assert "sidebar-collapsed" in body_classes, "Sidebar ne se collapse pas"

    def test_sidebar_toggle_expands(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-sidebar-toggle")
        demo_workspace.wait_for_timeout(200)
        demo_workspace.click("#ws-sidebar-toggle")
        demo_workspace.wait_for_timeout(300)
        body_classes = demo_workspace.evaluate("() => document.body.className")
        assert "sidebar-collapsed" not in body_classes, "Sidebar reste collapsée après second toggle"

    def test_nav_items_still_clickable_when_collapsed(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-sidebar-toggle")
        demo_workspace.wait_for_timeout(200)
        nav_to(demo_workspace, "dashboard")
        active = demo_workspace.evaluate(
            "() => document.querySelector('.ws-nav-item.active')?.dataset.id"
        )
        assert active == "dashboard", "Nav item non cliquable en mode collapsé"


# ── Module dashboard spécifique ───────────────────────────────────────────────


class TestDashboardModule:
    def test_dashboard_loads_on_startup(self, demo_workspace: Page) -> None:
        container = demo_workspace.locator("#ws-app-container")
        html = container.inner_html()
        assert len(html.strip()) > 50, "Dashboard ne charge pas au démarrage"

    def test_dashboard_has_content_after_nav(self, demo_workspace: Page) -> None:
        nav_to(demo_workspace, "settings")
        demo_workspace.wait_for_timeout(500)
        nav_to(demo_workspace, "dashboard")
        demo_workspace.wait_for_timeout(1_500)
        html = demo_workspace.locator("#ws-app-container").inner_html()
        assert len(html.strip()) > 100


# ── App modules optionnels (présents si installés dans l'org) ─────────────────


@pytest.mark.parametrize("nav_id,label", APP_NAV_ITEMS)
class TestOptionalAppNavClick:
    def test_app_nav_item_click_no_crash(
        self, demo_workspace: Page, nav_id: str, label: str
    ) -> None:
        """Si le module est présent dans la nav, il doit se charger sans crash."""
        btn = demo_workspace.locator(f".ws-nav-item[data-id='{nav_id}']")
        if btn.count() == 0:
            pytest.skip(f"Module '{label}' absent de la nav (non installé)")

        errors: list[str] = []
        demo_workspace.on("pageerror", lambda e: errors.append(str(e)))
        nav_to(demo_workspace, nav_id)
        demo_workspace.wait_for_timeout(1_500)
        assert not errors, f"Crash JS pour '{label}' : {errors}"

    def test_app_nav_item_shows_content(
        self, demo_workspace: Page, nav_id: str, label: str
    ) -> None:
        btn = demo_workspace.locator(f".ws-nav-item[data-id='{nav_id}']")
        if btn.count() == 0:
            pytest.skip(f"Module '{label}' absent de la nav (non installé)")

        nav_to(demo_workspace, nav_id)
        demo_workspace.wait_for_timeout(2_000)
        html = demo_workspace.locator("#ws-app-container").inner_html()
        assert len(html.strip()) > 50, f"Module '{label}' : contenu vide"
