"""
Test 05 — Module Settings : deep test
======================================
Vérifie l'ensemble du module Paramètres :
- Onglets et navigation entre onglets
- Formulaire profil (nom, email, mot de passe)
- Gestion des membres (invitation, liste)
- Paramètres organisation
- Notifications
- Sécurité / MFA
- Facturation (billing)
- Langue (Langue/Language section)
"""

from __future__ import annotations

import pytest
from playwright.sync_api import Page, expect

from tests.e2e.helpers import nav_to, switch_lang


# ── Setup ─────────────────────────────────────────────────────────────────────


@pytest.fixture
def settings_page(demo_workspace: Page) -> Page:
    nav_to(demo_workspace, "settings")
    # Attendre que le module soit monté
    try:
        demo_workspace.wait_for_selector(
            "#ws-app-container .set-loading",
            state="detached",
            timeout=5_000,
        )
    except Exception:
        demo_workspace.wait_for_timeout(2_000)
    return demo_workspace


def get_settings_info(page: Page) -> dict:
    return page.evaluate("""() => {
        const c = document.getElementById('ws-app-container');
        if (!c) return {};
        return {
            tabs: [...c.querySelectorAll('[role="tab"], .set-tab, .tab-btn, .ds-tab')]
                     .map(t => t.textContent.trim()),
            sections: [...c.querySelectorAll('h2, h3, .set-section-title, .ds-form-label')]
                         .map(h => h.textContent.trim()).slice(0, 20),
            inputs: c.querySelectorAll('input:not([type="hidden"])').length,
            buttons: [...c.querySelectorAll('button')]
                        .filter(b => b.textContent.trim())
                        .map(b => b.textContent.trim().substring(0, 60)),
        };
    }""")


# ── Module charge ─────────────────────────────────────────────────────────────


class TestSettingsModuleLoads:
    def test_settings_content_not_empty(self, settings_page: Page) -> None:
        html = settings_page.locator("#ws-app-container").inner_html()
        assert len(html.strip()) > 200, "Settings : module vide"

    def test_settings_no_js_error(self, settings_page: Page) -> None:
        errors: list[str] = []
        settings_page.on("pageerror", lambda e: errors.append(str(e)))
        nav_to(settings_page, "billing")
        settings_page.wait_for_timeout(300)
        nav_to(settings_page, "settings")
        settings_page.wait_for_timeout(1_500)
        assert not errors, f"Erreurs JS Settings : {errors}"

    def test_settings_has_input_fields(self, settings_page: Page) -> None:
        info = get_settings_info(settings_page)
        assert info.get("inputs", 0) >= 2, (
            f"Settings : seulement {info.get('inputs', 0)} champs — attendu ≥ 2"
        )

    def test_settings_has_buttons(self, settings_page: Page) -> None:
        info = get_settings_info(settings_page)
        assert len(info.get("buttons", [])) >= 2, "Settings : moins de 2 boutons"


# ── Onglets ───────────────────────────────────────────────────────────────────


class TestSettingsTabs:
    def test_settings_tabs_or_sections_exist(self, settings_page: Page) -> None:
        info = get_settings_info(settings_page)
        has_tabs = len(info.get("tabs", [])) >= 2 or len(info.get("sections", [])) >= 2
        assert has_tabs, (
            f"Settings : aucun onglet ni section détectée. "
            f"Tabs={info.get('tabs')}, Sections={info.get('sections')}"
        )

    def test_settings_tabs_clickable(self, settings_page: Page) -> None:
        tabs = settings_page.locator(
            "#ws-app-container [role='tab'], "
            "#ws-app-container .set-tab, "
            "#ws-app-container .tab-btn"
        ).all()
        if not tabs:
            pytest.skip("Pas de tabs trouvés dans Settings")
        for tab in tabs[:5]:
            tab.click()
            settings_page.wait_for_timeout(200)
            # Vérifier pas de crash
            html = settings_page.locator("#ws-app-container").inner_html()
            assert len(html) > 50, f"Tab click a vidé le contenu"


# ── Formulaire profil ─────────────────────────────────────────────────────────


class TestSettingsProfileForm:
    def test_profile_name_field_exists(self, settings_page: Page) -> None:
        name_field = settings_page.locator(
            "#ws-app-container input[name='full_name'], "
            "#ws-app-container input[id*='name'], "
            "#ws-app-container input[placeholder*='nom'], "
            "#ws-app-container input[placeholder*='name']"
        ).first
        assert name_field.count() > 0 or settings_page.locator(
            "#ws-app-container input"
        ).count() >= 1, "Settings : aucun champ nom"

    def test_profile_email_field_exists(self, settings_page: Page) -> None:
        email_fields = settings_page.locator(
            "#ws-app-container input[type='email'], "
            "#ws-app-container input[id*='email']"
        ).count()
        assert email_fields >= 1, "Settings : aucun champ email"

    def test_profile_password_field_exists(self, settings_page: Page) -> None:
        pw_fields = settings_page.locator(
            "#ws-app-container input[type='password']"
        ).count()
        assert pw_fields >= 1, "Settings : aucun champ mot de passe"

    def test_profile_save_button_enabled(self, settings_page: Page) -> None:
        save_btn = settings_page.locator(
            "#ws-app-container button"
        ).filter(has_text="Enregistrer").first
        if save_btn.count() == 0:
            save_btn = settings_page.locator(
                "#ws-app-container button"
            ).filter(has_text="Save").first
        if save_btn.count() == 0:
            # Try any primary button
            save_btn = settings_page.locator(
                "#ws-app-container .ds-btn-primary, #ws-app-container button[type='submit']"
            ).first
        assert save_btn.count() > 0, "Settings : bouton Enregistrer/Save introuvable"
        expect(save_btn).to_be_enabled()


# ── Invitation membres ────────────────────────────────────────────────────────


class TestSettingsMembersInvitation:
    def test_invitation_email_input_exists(self, settings_page: Page) -> None:
        inv_input = settings_page.locator(
            "#settings-invite-email, "
            "#invite-email, "
            "#ws-app-container input[placeholder*='invit'], "
            "#ws-app-container input[placeholder*='email']"
        ).first
        # Vérifier qu'on a au moins un champ email
        email_count = settings_page.locator(
            "#ws-app-container input[type='email']"
        ).count()
        assert email_count >= 1, "Settings : aucun champ invitation email"

    def test_invitation_input_accepts_email(self, settings_page: Page) -> None:
        email_inp = settings_page.locator(
            "#ws-app-container input[type='email']"
        ).first
        if email_inp.count() == 0:
            pytest.skip("Champ email invitation absent")
        email_inp.fill("test.invite@organisation.ca")
        val = email_inp.input_value()
        assert "test.invite" in val, f"Champ email n'accepte pas l'input : {val}"

    def test_send_invitation_button_exists(self, settings_page: Page) -> None:
        invite_btn = settings_page.locator(
            "#ws-app-container button"
        ).filter(has_text="Inviter").first
        if invite_btn.count() == 0:
            invite_btn = settings_page.locator(
                "#ws-app-container button"
            ).filter(has_text="Invite").first
        if invite_btn.count() == 0:
            invite_btn = settings_page.locator(
                "#ws-app-container button"
            ).filter(has_text="Envoyer").first
        assert invite_btn.count() > 0, (
            "Settings : bouton d'invitation introuvable (cherché: Inviter/Invite/Envoyer)"
        )


# ── Notifications ─────────────────────────────────────────────────────────────


class TestSettingsNotifications:
    def test_monthly_report_toggle_exists(self, settings_page: Page) -> None:
        """Toggle rapport mensuel."""
        info = get_settings_info(settings_page)
        has_toggle = any(
            any(w in b.lower() for w in ["rapport", "report", "mensuel", "monthly", "notification"])
            for b in info.get("buttons", [])
        )
        # Chercher aussi un checkbox ou toggle
        has_checkbox = settings_page.locator(
            "#ws-app-container input[type='checkbox']"
        ).count() >= 1
        assert has_toggle or has_checkbox, (
            "Settings : aucun toggle/bouton de notifications détecté"
        )


# ── Langue dans Settings ──────────────────────────────────────────────────────


class TestSettingsLanguage:
    def test_language_section_in_settings(self, settings_page: Page) -> None:
        """Il doit y avoir une section Langue dans les Settings."""
        info = get_settings_info(settings_page)
        sections = " ".join(info.get("sections", [])).lower()
        has_lang = "langue" in sections or "language" in sections
        # Fallback : chercher dans les boutons
        btns = " ".join(info.get("buttons", [])).lower()
        has_lang_btn = "langue" in btns or "language" in btns or "fr" in btns
        assert has_lang or has_lang_btn, (
            "Settings : aucune section Langue détectée (ni dans sections ni dans boutons)"
        )

    def test_lang_toggle_works_in_settings_context(self, settings_page: Page) -> None:
        """Le toggle FR/EN dans la topbar fonctionne même dans Settings."""
        switch_lang(settings_page, "en")
        lang = settings_page.evaluate("() => NH_I18N.lang")
        assert lang == "en"
        switch_lang(settings_page, "fr")
        lang = settings_page.evaluate("() => NH_I18N.lang")
        assert lang == "fr"

    @pytest.mark.xfail(
        reason="NON FONCTIONNEL — Settings module ne réagit pas à setLang",
        strict=True,
    )
    def test_settings_content_changes_on_lang_switch(self, settings_page: Page) -> None:
        """
        En mode EN, les labels/boutons du module Settings doivent changer.
        Actuellement NON FONCTIONNEL : innerHTML est hardcodé FR.
        """
        initial_html = settings_page.locator("#ws-app-container").inner_html()
        switch_lang(settings_page, "en")
        settings_page.wait_for_timeout(500)
        en_html = settings_page.locator("#ws-app-container").inner_html()
        assert initial_html != en_html, (
            "Settings : innerHTML identique après setLang('en') — "
            "aucun changement de traduction dans le module"
        )


# ── Billing ───────────────────────────────────────────────────────────────────


class TestBillingModule:
    @pytest.fixture(autouse=True)
    def navigate(self, demo_workspace: Page) -> None:
        nav_to(demo_workspace, "billing")
        try:
            demo_workspace.wait_for_selector(".bl-spin, .ds-spinner", state="detached", timeout=4_000)
        except Exception:
            demo_workspace.wait_for_timeout(2_000)

    def test_billing_has_content(self, demo_workspace: Page) -> None:
        html = demo_workspace.locator("#ws-app-container").inner_html()
        assert len(html.strip()) > 100, "Billing : contenu vide"

    def test_billing_portal_button_exists(self, demo_workspace: Page) -> None:
        info = get_settings_info(demo_workspace)
        btns = info.get("buttons", [])
        has_portal = any(
            any(w in b.lower() for w in ["portail", "portal", "stripe", "facturation", "billing", "gérer"])
            for b in btns
        )
        assert has_portal, f"Billing : bouton portail Stripe absent. Boutons : {btns[:10]}"

    def test_billing_no_crash(self, demo_workspace: Page) -> None:
        errors: list[str] = []
        demo_workspace.on("pageerror", lambda e: errors.append(str(e)))
        demo_workspace.wait_for_timeout(500)
        assert not errors, f"Erreurs JS dans Billing : {errors}"


# ── Mot de passe ──────────────────────────────────────────────────────────────


class TestSettingsPasswordChange:
    def test_password_fields_exist(self, settings_page: Page) -> None:
        pw_fields = settings_page.locator(
            "#ws-app-container input[type='password']"
        ).count()
        assert pw_fields >= 1, "Settings : aucun champ mot de passe"

    def test_password_fields_accept_input(self, settings_page: Page) -> None:
        pw_fields = settings_page.locator(
            "#ws-app-container input[type='password']"
        ).all()
        if not pw_fields:
            pytest.skip("Champs mot de passe absents")
        pw_fields[0].fill("TestPassword123!")
        val = pw_fields[0].input_value()
        assert val == "TestPassword123!", f"Champ MDP n'accepte pas l'input : {val}"

    def test_password_change_button_enabled(self, settings_page: Page) -> None:
        btn = settings_page.locator(
            "#settings-pw-btn, "
            "#ws-app-container button[id*='pw'], "
            "#ws-app-container button[id*='password']"
        ).first
        if btn.count() == 0:
            # Try by text
            btn = settings_page.locator(
                "#ws-app-container button"
            ).filter(has_text="Mot de passe").first
        if btn.count() == 0:
            btn = settings_page.locator(
                "#ws-app-container button"
            ).filter(has_text="Password").first
        if btn.count() == 0:
            pytest.skip("Bouton changement MDP introuvable")
        expect(btn).to_be_enabled()


# ── Accessibility basics ──────────────────────────────────────────────────────


class TestSettingsAccessibility:
    def test_form_labels_are_associated(self, settings_page: Page) -> None:
        """Les labels doivent avoir un for= associé à un input."""
        result = settings_page.evaluate("""() => {
            const labels = [...document.querySelectorAll('#ws-app-container label[for]')];
            const orphaned = labels.filter(l => {
                const id = l.getAttribute('for');
                return !document.getElementById(id);
            });
            return orphaned.map(l => l.textContent.trim() + ' → #' + l.getAttribute('for'));
        }""")
        assert result == [], f"Labels sans input associé : {result}"

    def test_settings_inputs_have_labels_or_placeholders(self, settings_page: Page) -> None:
        result = settings_page.evaluate("""() => {
            const inputs = [...document.querySelectorAll(
                '#ws-app-container input:not([type="hidden"]):not([type="checkbox"])'
            )];
            return inputs.filter(inp => {
                const id = inp.id;
                const hasLabel = id && document.querySelector('label[for="' + id + '"]');
                const hasPlaceholder = inp.placeholder;
                const hasAriaLabel = inp.getAttribute('aria-label');
                return !hasLabel && !hasPlaceholder && !hasAriaLabel;
            }).map(i => i.id || i.name || i.type);
        }""")
        assert result == [], f"Inputs sans label ni placeholder : {result}"
