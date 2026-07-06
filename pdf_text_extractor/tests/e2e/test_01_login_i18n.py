"""
Test 01 — Page de connexion : i18n FR ↔ EN
=========================================
Vérifie que NH_I18N fonctionne sur portal-login.html :
- Tous les éléments [data-i18n] sont présents et affichent le texte FR par défaut
- Après clic sur EN, tous les textes basculent en anglais
- Les placeholders ([data-i18n-ph]) basculent
- Retour FR restaure les textes originaux
- Navigation onglets (Connexion / Créer un compte)
- Section SSO
- Formulaire oublié mot de passe
"""

from __future__ import annotations

import pytest
from playwright.sync_api import Page, expect

from tests.e2e.helpers import (
    EN_EXPECTED,
    FR_EXPECTED,
    count_data_i18n_elements,
    get_i18n_placeholders,
    get_i18n_texts,
    switch_lang,
)


# ── Pré-condition ──────────────────────────────────────────────────────────────


class TestLoginPageLoads:
    def test_page_loads_without_js_error(self, login_page: Page) -> None:
        errors: list[str] = []
        login_page.on("pageerror", lambda e: errors.append(str(e)))
        login_page.reload()
        login_page.wait_for_load_state("networkidle")
        assert errors == [], f"Erreurs JS au chargement : {errors}"

    def test_nh_i18n_singleton_exists(self, login_page: Page) -> None:
        exists = login_page.evaluate("() => typeof NH_I18N !== 'undefined'")
        assert exists, "NH_I18N introuvable — i18n.js non chargé"

    def test_default_lang_is_fr(self, login_page: Page) -> None:
        lang = login_page.evaluate("() => NH_I18N.lang")
        assert lang == "fr", f"Langue par défaut attendue 'fr', obtenue '{lang}'"

    def test_data_i18n_elements_present(self, login_page: Page) -> None:
        n = count_data_i18n_elements(login_page)
        assert n >= 15, (
            f"Trop peu d'éléments [data-i18n] : {n} — la page n'est pas instrumentée"
        )


# ── Textes FR par défaut ───────────────────────────────────────────────────────


class TestDefaultFrenchTexts:
    def test_tab_login_label_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='tab.login']").first
        expect(el).to_have_text("Connexion")

    def test_tab_signup_label_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='tab.signup']").first
        expect(el).to_have_text("Créer un compte")

    def test_login_title_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.title']").first
        expect(el).to_have_text("Bon retour 👋")

    def test_login_email_label_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.email.label']").first
        expect(el).to_have_text("Adresse courriel")

    def test_login_password_label_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.password.label']").first
        expect(el).to_have_text("Mot de passe")

    def test_login_btn_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.btn']").first
        expect(el).to_have_text("Connexion")

    def test_login_forgot_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.forgot']").first
        expect(el).to_have_text("Mot de passe oublié ?")

    def test_sso_divider_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='sso.divider']").first
        expect(el).to_have_text("ou connexion via SSO")

    def test_brand_footer_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='brand.footer']").first
        expect(el).to_have_text("© 2026 CivicAI Inc. · Propulsé par ATLAS AI")


# ── Toggle FR → EN ────────────────────────────────────────────────────────────


class TestFrToEnToggle:
    @pytest.fixture(autouse=True)
    def switch_to_en(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        yield
        switch_lang(login_page, "fr")  # cleanup

    def test_lang_state_is_en(self, login_page: Page) -> None:
        lang = login_page.evaluate("() => NH_I18N.lang")
        assert lang == "en", f"NH_I18N.lang attendu 'en', obtenu '{lang}'"

    def test_en_button_has_active_class(self, login_page: Page) -> None:
        en_btn = login_page.locator(".nh-lang-btn[data-lang='en']").first
        expect(en_btn).to_have_class("nh-lang-btn active")

    def test_fr_button_loses_active_class(self, login_page: Page) -> None:
        fr_btn = login_page.locator(".nh-lang-btn[data-lang='fr']").first
        classes = fr_btn.get_attribute("class") or ""
        assert "active" not in classes, "Bouton FR toujours actif après switch EN"

    def test_tab_login_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='tab.login']").first
        expect(el).to_have_text("Sign In")

    def test_tab_signup_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='tab.signup']").first
        expect(el).to_have_text("Create Account")

    def test_login_title_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.title']").first
        expect(el).to_have_text("Welcome back 👋")

    def test_login_sub_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.sub']").first
        expect(el).to_have_text("Sign in to your AgentHub workspace.")

    def test_login_email_label_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.email.label']").first
        expect(el).to_have_text("Email address")

    def test_login_password_label_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.password.label']").first
        expect(el).to_have_text("Password")

    def test_login_remember_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.remember']").first
        expect(el).to_have_text("Remember me")

    def test_login_btn_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.btn']").first
        expect(el).to_have_text("Sign in")

    def test_login_forgot_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.forgot']").first
        expect(el).to_have_text("Forgot password?")

    def test_login_no_account_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='login.no_account']").first
        expect(el).to_have_text("No account yet?")

    def test_sso_divider_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='sso.divider']").first
        expect(el).to_have_text("or sign in with SSO")

    def test_sso_section_title_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='sso.section.title']").first
        expect(el).to_have_text("Sign in via your organisation")

    def test_sso_btn_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='sso.btn']").first
        expect(el).to_have_text("Sign in with SSO →")

    def test_brand_footer_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='brand.footer']").first
        expect(el).to_have_text("© 2026 CivicAI Inc. · Powered by ATLAS AI")

    def test_brand_trust_hosting_switches_to_en(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='brand.trust.hosting']").first
        expect(el).to_have_text("Canada-hosted")

    def test_all_data_i18n_keys_have_en_value(self, login_page: Page) -> None:
        """Aucun élément data-i18n ne doit rester en FR après switch EN."""
        texts = get_i18n_texts(login_page)
        fr_values = set(FR_EXPECTED.values())
        remaining_fr = {k: v for k, v in texts.items() if v in fr_values}
        assert not remaining_fr, (
            f"Ces clés restent en français après switch EN :\n"
            + "\n".join(f"  {k!r}: {v!r}" for k, v in remaining_fr.items())
        )


# ── Placeholders ──────────────────────────────────────────────────────────────


class TestPlaceholderTranslation:
    def test_email_placeholder_fr(self, login_page: Page) -> None:
        ph = get_i18n_placeholders(login_page)
        assert "login.email.ph" in ph, "data-i18n-ph='login.email.ph' absent"
        assert "organisation.ca" in ph["login.email.ph"].lower() or "vous@" in ph["login.email.ph"]

    def test_email_placeholder_switches_to_en(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        ph = get_i18n_placeholders(login_page)
        assert "login.email.ph" in ph
        assert "organisation.com" in ph["login.email.ph"] or "you@" in ph["login.email.ph"], (
            f"Placeholder email reste en FR : {ph.get('login.email.ph')}"
        )


# ── Onglet Inscription ────────────────────────────────────────────────────────


class TestSignupTabTranslation:
    @pytest.fixture(autouse=True)
    def open_signup_tab(self, login_page: Page) -> None:
        login_page.locator("[data-i18n='tab.signup']").first.click()
        login_page.wait_for_timeout(300)

    def test_signup_title_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='signup.title']").first
        expect(el).to_have_text("Créer votre compte")

    def test_signup_btn_fr(self, login_page: Page) -> None:
        el = login_page.locator("[data-i18n='signup.btn']").first
        expect(el).to_have_text("Créer mon compte →")

    def test_signup_title_switches_to_en(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        el = login_page.locator("[data-i18n='signup.title']").first
        expect(el).to_have_text("Create your account")

    def test_signup_btn_switches_to_en(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        el = login_page.locator("[data-i18n='signup.btn']").first
        expect(el).to_have_text("Create my account →")

    def test_signup_trial_switches_to_en(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        el = login_page.locator("[data-i18n='signup.trial']").first
        expect(el).to_have_text("14-day free trial")

    def test_cgu_text_switches_to_en(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        el = login_page.locator("[data-i18n='signup.cgu.pre']").first
        expect(el).to_have_text("I accept the")


# ── Retour FR ─────────────────────────────────────────────────────────────────


class TestReturnToFrench:
    def test_fr_restored_after_en_then_fr(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        switch_lang(login_page, "fr")
        el = login_page.locator("[data-i18n='login.title']").first
        expect(el).to_have_text("Bon retour 👋")

    def test_fr_button_becomes_active_again(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        switch_lang(login_page, "fr")
        fr_btn = login_page.locator(".nh-lang-btn[data-lang='fr']").first
        expect(fr_btn).to_have_class("nh-lang-btn active")


# ── Formulaire de connexion — interactions ────────────────────────────────────


class TestLoginForm:
    def test_email_field_exists_and_accepts_input(self, login_page: Page) -> None:
        field = login_page.locator("#login-email")
        expect(field).to_be_visible()
        field.fill("test@example.com")
        assert field.input_value() == "test@example.com"

    def test_password_field_type_is_password(self, login_page: Page) -> None:
        field = login_page.locator("#login-password")
        expect(field).to_be_visible()
        assert field.get_attribute("type") == "password"

    def test_remember_checkbox_exists(self, login_page: Page) -> None:
        cb = login_page.locator("#login-remember")
        expect(cb).to_be_visible()

    def test_login_button_is_clickable(self, login_page: Page) -> None:
        btn = login_page.locator("[data-i18n='login.btn']").first
        expect(btn).to_be_enabled()

    def test_forgot_link_is_clickable(self, login_page: Page) -> None:
        link = login_page.locator("[data-i18n='login.forgot']").first
        expect(link).to_be_visible()
        link.click()
        login_page.wait_for_timeout(300)
        # Vérifier que le formulaire oublié est affiché
        forgot_title = login_page.locator("[data-i18n='forgot.title']").first
        expect(forgot_title).to_be_visible()

    def test_forgot_form_has_email_field(self, login_page: Page) -> None:
        login_page.locator("[data-i18n='login.forgot']").first.click()
        login_page.wait_for_timeout(300)
        field = login_page.locator("#forgot-email")
        expect(field).to_be_visible()

    def test_forgot_btn_in_en(self, login_page: Page) -> None:
        login_page.locator("[data-i18n='login.forgot']").first.click()
        login_page.wait_for_timeout(300)
        switch_lang(login_page, "en")
        btn = login_page.locator("[data-i18n='forgot.btn']").first
        expect(btn).to_have_text("Send reset link")


# ── SSO — block interactif ────────────────────────────────────────────────────


class TestSSOBlock:
    def test_sso_slug_input_exists(self, login_page: Page) -> None:
        inp = login_page.locator("#sso-slug")
        expect(inp).to_be_visible()

    def test_sso_btn_exists(self, login_page: Page) -> None:
        btn = login_page.locator("#sso-btn")
        expect(btn).to_be_visible()

    def test_sso_placeholder_switches_to_en(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        ph = get_i18n_placeholders(login_page)
        assert "sso.slug.ph" in ph, "data-i18n-ph='sso.slug.ph' absent"
        assert "montreal" in ph["sso.slug.ph"].lower() or "city" in ph["sso.slug.ph"].lower(), (
            f"Placeholder SSO pas traduit : {ph.get('sso.slug.ph')}"
        )

    def test_sso_btn_text_switches_to_en(self, login_page: Page) -> None:
        switch_lang(login_page, "en")
        el = login_page.locator("[data-i18n='sso.btn']").first
        expect(el).to_have_text("Sign in with SSO →")
