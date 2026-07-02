"""Fixtures partagées — Sprint 2 CivicAI Engineering Pack."""

from __future__ import annotations

import os
from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret-key-for-hs256-fallback-testing")
os.environ.setdefault("ALLOW_HS256_FALLBACK", "true")

from auth import CurrentUser, get_current_user  # noqa: E402
from main import create_app  # noqa: E402

# ── Builders ──────────────────────────────────────────────────────────────────


def make_user(
    role: str = "owner",
    org_id: str = "org-test-uuid-1234",
    user_id: str = "user-test-uuid-5678",
    email: str = "admin@civicai.ca",
    subscription_status: str = "active",
) -> CurrentUser:
    return CurrentUser(
        id=user_id,
        email=email,
        organization_id=org_id,
        role=role,
        subscription_status=subscription_status,
        subscription_plan="starter",
        currency="CAD",
    )


# ── DB mock helper ─────────────────────────────────────────────────────────────


def make_cursor(fetchone_values: list = (), fetchall_values: list = ()) -> MagicMock:
    """Construit un curseur mock consommant les valeurs en séquence."""
    cur = MagicMock()
    cur.fetchone.side_effect = list(fetchone_values)
    cur.fetchall.side_effect = list(fetchall_values)
    return cur


@contextmanager
def db_ctx(cursor: MagicMock):
    """Context manager qui yield toujours le même curseur mock."""
    yield cursor


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def client_owner(app):
    user = make_user(role="owner")
    app.dependency_overrides[get_current_user] = lambda: user
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


@pytest.fixture
def client_admin(app):
    user = make_user(role="admin")
    app.dependency_overrides[get_current_user] = lambda: user
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


@pytest.fixture
def client_user(app):
    user = make_user(role="user")
    app.dependency_overrides[get_current_user] = lambda: user
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


@pytest.fixture
def client_anon(app):
    """Client sans override d'auth — teste les vrais flux d'authentification."""
    yield TestClient(app, raise_server_exceptions=False)
