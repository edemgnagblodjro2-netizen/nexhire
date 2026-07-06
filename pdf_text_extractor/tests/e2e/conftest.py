"""Fixtures Playwright partagées — Suite QA E2E AgentHub Platform."""

from __future__ import annotations

import os

import pytest
from playwright.sync_api import Page, expect

# ── Paramètres d'environnement ─────────────────────────────────────────────────

BASE_URL = os.environ.get("NEXHIRE_BASE_URL", "http://localhost:8000")
TEST_EMAIL = os.environ.get("NEXHIRE_TEST_EMAIL", "")
TEST_PASSWORD = os.environ.get("NEXHIRE_TEST_PASSWORD", "")
TEST_TOKEN = os.environ.get("NEXHIRE_TEST_TOKEN", "")
TEST_SLUG = os.environ.get("NEXHIRE_TEST_SLUG", "demo")

# ── Fixtures de base ───────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture
def login_page(page: Page) -> Page:
    """Page de connexion — portal-login.html."""
    page.goto(f"{BASE_URL}/inscription")
    page.wait_for_load_state("networkidle")
    # S'assurer que NH_I18N est chargé
    page.wait_for_function("() => typeof NH_I18N !== 'undefined'", timeout=8_000)
    return page


@pytest.fixture
def demo_workspace(page: Page) -> Page:
    """Workspace /demo — accessible sans authentification."""
    page.goto(f"{BASE_URL}/workspace/{TEST_SLUG}")
    page.wait_for_load_state("networkidle")
    # Attendre que le JS principal soit chargé (nav rendue)
    page.wait_for_selector(".ws-nav-item", timeout=10_000)
    return page


@pytest.fixture
def auth_workspace(page: Page) -> Page:
    """Workspace authentifié — nécessite NEXHIRE_TEST_TOKEN ou EMAIL+PASSWORD."""
    if not TEST_TOKEN and not (TEST_EMAIL and TEST_PASSWORD):
        pytest.skip(
            "Auth credentials manquantes — définir NEXHIRE_TEST_TOKEN ou "
            "NEXHIRE_TEST_EMAIL + NEXHIRE_TEST_PASSWORD"
        )

    page.goto(f"{BASE_URL}/inscription")
    page.wait_for_load_state("domcontentloaded")

    if TEST_TOKEN:
        page.evaluate(
            "token => { localStorage.setItem('nexhire_token', token); }",
            TEST_TOKEN,
        )
    else:
        # Login via le formulaire
        page.wait_for_selector("#login-email", timeout=8_000)
        page.fill("#login-email", TEST_EMAIL)
        page.fill("#login-password", TEST_PASSWORD)
        page.click("[data-i18n='login.btn']")
        page.wait_for_url(f"**/workspace/**", timeout=20_000)

    page.goto(f"{BASE_URL}/workspace/{TEST_SLUG}")
    page.wait_for_selector(".ws-nav-item", timeout=10_000)
    return page


# ── Helper fixture : reset langue FR avant chaque test ───────────────────────


@pytest.fixture(autouse=True)
def reset_lang(page: Page) -> None:
    """Remet la langue à FR dans localStorage avant chaque test."""
    yield
    try:
        page.evaluate("localStorage.removeItem('nh_lang')")
    except Exception:
        pass


# ── Fixtures de navigation ─────────────────────────────────────────────────────


@pytest.fixture
def workspace_with_en(demo_workspace: Page) -> Page:
    """Workspace déjà en langue EN."""
    demo_workspace.evaluate("NH_I18N.setLang('en')")
    demo_workspace.wait_for_timeout(300)
    return demo_workspace
