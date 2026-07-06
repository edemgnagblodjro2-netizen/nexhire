"""
Test 02 — Workspace : preuve que FR→EN est NON FONCTIONNEL
===========================================================
Ces tests documentent les chaînes qui NE changent PAS après NH_I18N.setLang('en').
Chaque test qui ÉCHOUE confirme une régression i18n réelle dans l'interface.

Règle QA (verbatim) :
  « Si UNE SEULE chaîne reste en français lorsque EN est sélectionné,
    ALORS la fonctionnalité est considérée NON FONCTIONNELLE. »

Verdict attendu sur le codebase actuel : TOUS LES TESTS CI-DESSOUS ÉCHOUENT.
"""

from __future__ import annotations

import pytest
from playwright.sync_api import Page, expect

from tests.e2e.helpers import (
    get_i18n_texts,
    get_nav_item_labels,
    get_nav_section_labels,
    switch_lang,
)


# ── Pré-condition critique : zéro data-i18n dans workspace.html ───────────────


class TestWorkspaceI18nInfrastructure:
    def test_nh_i18n_loads_in_workspace(self, demo_workspace: Page) -> None:
        exists = demo_workspace.evaluate("() => typeof NH_I18N !== 'undefined'")
        assert exists, "NH_I18N absent dans workspace.html — i18n.js non chargé"

    def test_lang_toggle_buttons_exist(self, demo_workspace: Page) -> None:
        fr_btn = demo_workspace.locator(".nh-lang-btn[data-lang='fr']")
        en_btn = demo_workspace.locator(".nh-lang-btn[data-lang='en']")
        expect(fr_btn).to_be_visible()
        expect(en_btn).to_be_visible()

    def test_CRITICAL_zero_data_i18n_in_workspace_html(self, demo_workspace: Page) -> None:
        """
        CRITIQUE — workspace.html n'a aucun attribut data-i18n.
        NH_I18N._apply() ne peut donc rien mettre à jour dans le workspace.
        Ce test documente le problème architectural fondamental.
        """
        count = demo_workspace.evaluate(
            "() => document.querySelectorAll('[data-i18n]').length"
        )
        # Si ce test PASSE (count == 0) → preuve que workspace.html est non instrumenté
        # Si ce test ÉCHOUE (count > 0) → workspace a été partiellement corrigé
        assert count == 0, (
            f"workspace.html a maintenant {count} éléments [data-i18n] — "
            "l'infrastructure i18n a été ajoutée, re-valider les tests suivants."
        )

    def test_setLang_en_changes_nh_i18n_lang_state(self, demo_workspace: Page) -> None:
        """NH_I18N.lang passe bien à 'en' en mémoire — le moteur fonctionne."""
        switch_lang(demo_workspace, "en")
        lang = demo_workspace.evaluate("() => NH_I18N.lang")
        assert lang == "en", "NH_I18N.lang ne passe pas à 'en'"


# ── Nav sections — HARDCODÉES FR ─────────────────────────────────────────────


class TestNavSectionLabelsStayFrench:
    """
    Les sections de navigation sont rendues par _renderNav() avec des chaînes
    hardcodées dans _NAV_GROUPS.section. Elles ne passent jamais par data-i18n.
    Ces tests ÉCHOUENT sur le codebase actuel — c'est le comportement attendu.
    """

    @pytest.fixture(autouse=True)
    def switch_en(self, demo_workspace: Page) -> None:
        switch_lang(demo_workspace, "en")

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — section hardcodée FR dans workspace.js:41",
        strict=True,
    )
    def test_section_diagnostic_in_en(self, demo_workspace: Page) -> None:
        sections = get_nav_section_labels(demo_workspace)
        assert "Diagnostic & IA" not in sections, (
            "Section 'Diagnostic & IA' toujours présente en FR après switch EN"
        )

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — section hardcodée FR dans workspace.js:49",
        strict=True,
    )
    def test_section_intelligence_in_en(self, demo_workspace: Page) -> None:
        sections = get_nav_section_labels(demo_workspace)
        assert "Intelligence Décisionnelle" not in sections

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — section hardcodée FR dans workspace.js:92",
        strict=True,
    )
    def test_section_centre_integrations_in_en(self, demo_workspace: Page) -> None:
        sections = get_nav_section_labels(demo_workspace)
        assert "Centre d'intégrations" not in sections

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — section hardcodée FR dans workspace.js:106",
        strict=True,
    )
    def test_section_finance_contrats_in_en(self, demo_workspace: Page) -> None:
        sections = get_nav_section_labels(demo_workspace)
        assert "Finance & Contrats" not in sections

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — section hardcodée FR dans workspace.js:127",
        strict=True,
    )
    def test_section_productivite_in_en(self, demo_workspace: Page) -> None:
        sections = get_nav_section_labels(demo_workspace)
        assert "Productivité" not in sections


# ── Nav item labels — HARDCODÉS FR ───────────────────────────────────────────


class TestNavItemLabelsStayFrench:
    """
    Les labels des items de nav viennent de _NAV_GROUPS[].label (hardcodé FR).
    Ils sont injectés dans innerHTML sans data-i18n.
    Ces tests prouvent l'échec et sont marqués xfail.
    """

    @pytest.fixture(autouse=True)
    def switch_en(self, demo_workspace: Page) -> None:
        switch_lang(demo_workspace, "en")

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — label hardcodé 'Tableau de bord' dans workspace.js:37",
        strict=True,
    )
    def test_dashboard_nav_label_in_en(self, demo_workspace: Page) -> None:
        labels = get_nav_item_labels(demo_workspace)
        assert labels.get("dashboard") != "Tableau de bord", (
            "Nav item 'dashboard' affiche encore 'Tableau de bord' en mode EN"
        )

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — label hardcodé 'Facturation' dans workspace.js:136",
        strict=True,
    )
    def test_billing_nav_label_in_en(self, demo_workspace: Page) -> None:
        labels = get_nav_item_labels(demo_workspace)
        assert labels.get("billing") != "Facturation"

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — label hardcodé 'Paramètres' dans workspace.js:139",
        strict=True,
    )
    def test_settings_nav_label_in_en(self, demo_workspace: Page) -> None:
        labels = get_nav_item_labels(demo_workspace)
        assert labels.get("settings") != "Paramètres"

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — label hardcodé 'Contrats' dans workspace.js:109",
        strict=True,
    )
    def test_contracts_nav_label_in_en(self, demo_workspace: Page) -> None:
        labels = get_nav_item_labels(demo_workspace)
        assert labels.get("contracts") != "Contrats"

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — label hardcodé 'Centre d\\'aide' dans workspace.js:138",
        strict=True,
    )
    def test_help_nav_label_in_en(self, demo_workspace: Page) -> None:
        labels = get_nav_item_labels(demo_workspace)
        assert labels.get("help") != "Centre d'aide"

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — label hardcodé 'Utilisateurs & Accès' workspace.js:115",
        strict=True,
    )
    def test_identity_nav_label_in_en(self, demo_workspace: Page) -> None:
        labels = get_nav_item_labels(demo_workspace)
        assert labels.get("identity") != "Utilisateurs & Accès"

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — label hardcodé 'Tableau de sécurité' workspace.js:122",
        strict=True,
    )
    def test_security_nav_label_in_en(self, demo_workspace: Page) -> None:
        labels = get_nav_item_labels(demo_workspace)
        assert labels.get("security") != "Tableau de sécurité"

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — badge 'Bientôt' hardcodé dans workspace.js:661",
        strict=True,
    )
    def test_soon_badge_in_en(self, demo_workspace: Page) -> None:
        badges = demo_workspace.evaluate(
            "() => [...document.querySelectorAll('.ws-nav-badge.ws-badge-soon')].map(b => b.textContent)"
        )
        for badge in badges:
            assert badge != "Bientôt", f"Badge 'Bientôt' toujours en FR en mode EN : '{badge}'"


# ── User menu — HARDCODÉ FR dans HTML statique ───────────────────────────────


class TestUserMenuStaysFrench:
    """
    Les items du menu utilisateur sont hardcodés en FR dans workspace.html
    (lignes 643-644). Pas de data-i18n → ne changent jamais.
    """

    @pytest.fixture(autouse=True)
    def switch_en(self, demo_workspace: Page) -> None:
        switch_lang(demo_workspace, "en")

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — 'Mon profil' hardcodé FR dans workspace.html:643",
        strict=True,
    )
    def test_user_menu_profile_item_in_en(self, demo_workspace: Page) -> None:
        item = demo_workspace.locator("#ws-user-panel .ws-menu-item-title").first
        text = item.text_content() or ""
        assert text != "Mon profil", (
            f"Menu utilisateur : 'Mon profil' toujours en FR, attendu 'My profile'"
        )

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — 'Mon organisation' hardcodé FR dans workspace.html:644",
        strict=True,
    )
    def test_user_menu_org_item_in_en(self, demo_workspace: Page) -> None:
        items = demo_workspace.locator("#ws-user-panel .ws-menu-item-title").all_text_contents()
        assert "Mon organisation" not in items, (
            "Menu utilisateur : 'Mon organisation' toujours en FR"
        )

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — _userNavMap mappe par texte FR (workspace.js:1118), boutons morts en EN",
        strict=True,
    )
    def test_user_menu_profile_click_navigates_in_en(self, demo_workspace: Page) -> None:
        """
        En mode EN, si le texte du bouton change, _userNavMap['Mon profil']
        ne matche plus → click sans effet. Ce test vérifie que la navigation fonctionne.
        """
        demo_workspace.click("#ws-user-btn")
        demo_workspace.wait_for_timeout(200)
        profile_btn = demo_workspace.locator("#ws-user-panel .ws-menu-item").first
        profile_btn.click()
        demo_workspace.wait_for_timeout(500)
        # On s'attend à ce que le module Settings soit chargé
        active_nav = demo_workspace.evaluate(
            "() => document.querySelector('.ws-nav-item.active')?.dataset.id"
        )
        assert active_nav == "settings", (
            f"Clic 'Mon profil' en mode EN n'a pas navigué vers Settings (actif: {active_nav})"
        )


# ── Topbar hardcodé FR ────────────────────────────────────────────────────────


class TestTopbarHardcodedFrench:

    @pytest.fixture(autouse=True)
    def switch_en(self, demo_workspace: Page) -> None:
        switch_lang(demo_workspace, "en")

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — 'Notifications' hardcodé FR dans workspace.html:569",
        strict=True,
    )
    def test_notif_panel_title_in_en(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-notif-btn")
        demo_workspace.wait_for_timeout(200)
        title = demo_workspace.locator("#ws-notif-panel .ws-panel-hd-title").first
        expect(title).not_to_have_text("Notifications")  # attendu "Notifications" en EN aussi, mais les autres items...

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — 'Tout marquer lu' hardcodé FR dans workspace.html:570",
        strict=True,
    )
    def test_notif_mark_all_in_en(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-notif-btn")
        demo_workspace.wait_for_timeout(200)
        btn = demo_workspace.locator("#ws-notif-mark-all")
        expect(btn).not_to_have_text("Tout marquer lu")

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — 'Centre d\\'aide' hardcodé FR dans workspace.html:583",
        strict=True,
    )
    def test_help_panel_title_in_en(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-help-btn")
        demo_workspace.wait_for_timeout(200)
        title = demo_workspace.locator("#ws-help-panel .ws-panel-hd-title").first
        expect(title).not_to_have_text("Centre d'aide")

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — 'Tutoriels vidéo' hardcodé FR dans workspace.html:586",
        strict=True,
    )
    def test_help_panel_tutorials_in_en(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-help-btn")
        demo_workspace.wait_for_timeout(200)
        items = demo_workspace.locator("#ws-help-panel .ws-menu-item-title").all_text_contents()
        assert "Tutoriels vidéo" not in items

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — 'Discuter avec ATLAS' hardcodé FR dans workspace.html:589",
        strict=True,
    )
    def test_help_panel_atlas_in_en(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-help-btn")
        demo_workspace.wait_for_timeout(200)
        items = demo_workspace.locator("#ws-help-panel .ws-menu-item-title").all_text_contents()
        assert "Discuter avec ATLAS" not in items

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — 'Paramètres rapides' hardcodé FR dans workspace.html:602",
        strict=True,
    )
    def test_settings_panel_title_in_en(self, demo_workspace: Page) -> None:
        demo_workspace.click("#ws-settings-btn")
        demo_workspace.wait_for_timeout(200)
        title = demo_workspace.locator("#ws-settings-panel .ws-panel-hd-title").first
        expect(title).not_to_have_text("Paramètres rapides")

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — search placeholder hardcodé 'Rechercher…' workspace.html:553",
        strict=True,
    )
    def test_search_trigger_placeholder_in_en(self, demo_workspace: Page) -> None:
        placeholder = demo_workspace.locator(".ws-search-placeholder").first
        expect(placeholder).not_to_have_text("Rechercher…")

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — role 'Utilisateur' hardcodé par roleMap FR (workspace.js:615)",
        strict=True,
    )
    def test_user_role_display_in_en(self, demo_workspace: Page) -> None:
        role_el = demo_workspace.locator("#ws-up-role")
        text = role_el.text_content() or ""
        fr_roles = {"Propriétaire", "Administrateur", "Utilisateur", "Collaborateur"}
        assert text not in fr_roles, (
            f"Rôle affiché en FR après switch EN : '{text}'"
        )


# ── Breadcrumb ────────────────────────────────────────────────────────────────


class TestBreadcrumbStaysFrench:
    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — breadcrumb set par _setBreadcrumb(navItem.label) en FR",
        strict=True,
    )
    def test_breadcrumb_in_en_after_nav(self, demo_workspace: Page) -> None:
        switch_lang(demo_workspace, "en")
        # Clic sur "Tableau de bord" (toujours en FR)
        demo_workspace.locator(".ws-nav-item[data-id='dashboard']").click()
        demo_workspace.wait_for_timeout(500)
        breadcrumb = demo_workspace.locator("#ws-breadcrumb").text_content() or ""
        assert breadcrumb != "Tableau de bord", (
            f"Breadcrumb affiche le label FR 'Tableau de bord' en mode EN"
        )


# ── Résumé récapitulatif ──────────────────────────────────────────────────────


class TestI18nSummary:
    def test_VERDICT_workspace_i18n_is_non_functional(self, demo_workspace: Page) -> None:
        """
        Test de synthèse : compte le nombre de chaînes FR visibles après setLang('en').
        Un seul élément FR restant suffit à invalider la fonctionnalité.
        """
        switch_lang(demo_workspace, "en")

        fr_strings_found: list[str] = []

        # Nav sections
        sections = get_nav_section_labels(demo_workspace)
        fr_sections = [s for s in sections if any(
            c in s for c in "àâäéèêëîïôùûüÀÂÄÉÈÊËÎÏÔÙÛÜ"
        ) or "Centre" in s or "Vue" in s or "Organisation" in s or "Productivité" in s]
        fr_strings_found.extend([f"NavSection: {s}" for s in fr_sections])

        # Nav labels
        labels = get_nav_item_labels(demo_workspace)
        fr_labels = {k: v for k, v in labels.items() if any(
            c in v for c in "àâäéèêëîïôùûüÀÂÄÉÈÊËÎÏÔÙÛÜ"
        ) or "Tableau" in v or "Paramètres" in v or "Contrats" in v}
        fr_strings_found.extend([f"NavLabel[{k}]: {v}" for k, v in fr_labels.items()])

        # User menu
        user_items = demo_workspace.evaluate("""() =>
            [...document.querySelectorAll('#ws-user-panel .ws-menu-item-title')]
                .map(el => el.textContent.trim())
        """)
        fr_user = [i for i in user_items if "Mon " in i or "Déconnexion" in i]
        fr_strings_found.extend([f"UserMenu: {i}" for i in fr_user])

        # On documente toutes les occurrences trouvées
        if fr_strings_found:
            formatted = "\n".join(f"  • {s}" for s in fr_strings_found[:30])
            pytest.fail(
                f"VERDICT : NON FONCTIONNEL\n"
                f"{len(fr_strings_found)} chaîne(s) FR visibles après setLang('en') :\n"
                f"{formatted}\n\n"
                f"Règle QA : si UNE SEULE chaîne reste en FR → NON FONCTIONNEL."
            )
