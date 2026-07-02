"""Sprint 2 — 10 tests critiques CivicAI Engineering Pack."""

from __future__ import annotations

import time
from contextlib import contextmanager
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from conftest import db_ctx, make_cursor, make_user

# ════════════════════════════════════════════════════════════════════
# 1. Login valide → 200 + tokens
# ════════════════════════════════════════════════════════════════════


def test_login_valid_returns_tokens(client_anon):
    fake_session = MagicMock()
    fake_session.access_token = "eyJ.access.token"
    fake_session.refresh_token = "eyJ.refresh.token"
    fake_session.expires_in = 3600

    fake_user = MagicMock()
    fake_user.id = "user-uuid-abc"
    fake_user.user_metadata = {}

    fake_result = MagicMock()
    fake_result.session = fake_session
    fake_result.user = fake_user

    mock_sb = MagicMock()
    mock_sb.auth.sign_in_with_password.return_value = fake_result

    with patch("routes_auth.anon_client", return_value=mock_sb), patch("routes_auth.log_audit"):
        r = client_anon.post(
            "/api/auth/login",
            json={"email": "admin@civicai.ca", "password": "ValidPass1!"},
        )

    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] == "eyJ.access.token"
    assert body["refresh_token"] == "eyJ.refresh.token"
    assert body["token_type"] == "bearer"
    assert body["user_id"] == "user-uuid-abc"


# ════════════════════════════════════════════════════════════════════
# 2. Mot de passe incorrect → 401
# ════════════════════════════════════════════════════════════════════


def test_login_wrong_password_returns_401(client_anon):
    mock_sb = MagicMock()
    mock_sb.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")

    with patch("routes_auth.anon_client", return_value=mock_sb), patch("routes_auth.log_audit"):
        r = client_anon.post(
            "/api/auth/login",
            json={"email": "admin@civicai.ca", "password": "WrongPass99!"},
        )

    assert r.status_code == 401
    assert "Identifiants invalides" in r.json()["detail"]


# ════════════════════════════════════════════════════════════════════
# 3. JWT expiré → 401
# ════════════════════════════════════════════════════════════════════


def test_jwt_expired_returns_401(client_anon):
    from fastapi import HTTPException as FastAPIHTTPException

    # Simule directement la levée d'exception que _verify_token produit
    # pour un token expiré (ExpiredSignatureError → HTTPException 401).
    with patch(
        "auth._verify_token", side_effect=FastAPIHTTPException(status_code=401, detail="Jeton invalide ou expiré.")
    ):
        r = client_anon.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer eyJ.fake.expired"},
        )

    assert r.status_code == 401
    assert "expiré" in r.json()["detail"]


# ════════════════════════════════════════════════════════════════════
# 4. Refresh token → 200 + nouveaux tokens
# ════════════════════════════════════════════════════════════════════


def test_refresh_token_returns_new_tokens(client_anon):
    fake_session = MagicMock()
    fake_session.access_token = "eyJ.new.access"
    fake_session.refresh_token = "eyJ.new.refresh"
    fake_session.expires_in = 3600

    fake_result = MagicMock()
    fake_result.session = fake_session

    mock_sb = MagicMock()
    mock_sb.auth.refresh_session.return_value = fake_result

    with patch("routes_auth.anon_client", return_value=mock_sb):
        r = client_anon.post(
            "/api/auth/refresh",
            json={"refresh_token": "eyJ.old.refresh"},
        )

    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] == "eyJ.new.access"
    assert body["refresh_token"] == "eyJ.new.refresh"


# ════════════════════════════════════════════════════════════════════
# 5. Inscription — confirmation requise (email non confirmé)
# ════════════════════════════════════════════════════════════════════


def test_signup_returns_confirmation_required(client_anon):
    fake_user = MagicMock()
    fake_user.id = "new-user-uuid"

    fake_result = MagicMock()
    fake_result.session = None  # pas encore confirmé
    fake_result.user = fake_user

    mock_sb = MagicMock()
    mock_sb.auth.sign_up.return_value = fake_result

    # routes_auth.py importe get_db localement (lazy import inside functions)
    # → patch à la source : db.get_db
    cur = make_cursor(fetchone_values=[None])  # INVITE_PENDING check → rien

    with (
        patch("routes_auth.anon_client", return_value=mock_sb),
        patch("db.get_db", lambda: db_ctx(cur)),
        patch("routes_auth._send_welcome"),
    ):
        r = client_anon.post(
            "/api/auth/signup",
            json={
                "organization_name": "TestOrg Inc.",
                "full_name": "Alice Tremblay",
                "email": "alice@testorg.ca",
                "password": "SecurePass1!ABC",
                "phone": "5141234567",
            },
        )

    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["confirmation_required"] is True
    assert body["access_token"] is None


# ════════════════════════════════════════════════════════════════════
# 6. GET /api/auth/me — profil utilisateur retourné
# ════════════════════════════════════════════════════════════════════


def test_get_me_returns_user_profile(client_admin):
    # routes_auth.py lazy-import get_db inside the function body → patch à la source
    cur = make_cursor(
        fetchall_values=[[]],  # dept_types → []
        fetchone_values=[
            {"name": "CivicAI Inc.", "logo_url": None, "brand_color": None},  # org info
        ],
    )

    with patch("db.get_db", lambda: db_ctx(cur)):
        r = client_admin.get("/api/auth/me")

    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "admin@civicai.ca"
    assert body["role"] == "admin"


# ════════════════════════════════════════════════════════════════════
# 7. RBAC — admin peut inviter un membre → 200
# ════════════════════════════════════════════════════════════════════


def test_invite_as_admin_succeeds(app):
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: make_user(role="admin")

    cur = make_cursor(
        fetchone_values=[
            # INSERT pending_invitations RETURNING *
            {
                "token": "inv-tok-xyz",
                "expires_at": "2026-09-01T00:00:00+00:00",
                "org_id": "org-test-uuid-1234",
                "invited_by": "user-test-uuid-5678",
                "email": "nouveau@example.com",
                "role": "user",
                "id": "inv-uuid-1",
            },
            None,  # org_name/sender meta (dans le try email)
            None,  # partner slug (dans le try email)
        ],
        fetchall_values=[[]],  # rows() → aucun membre existant
    )

    with (
        patch("routes_members.get_db", lambda: db_ctx(cur)),
        patch("email_service.send_invite_email", return_value=True),
    ):
        r = TestClient(app, raise_server_exceptions=False).post(
            "/api/members/invite",
            json={"email": "nouveau@example.com", "role": "user"},
        )

    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert r.json()["ok"] is True
    assert r.json()["email"] == "nouveau@example.com"


# ════════════════════════════════════════════════════════════════════
# 8. RBAC — utilisateur ordinaire ne peut pas inviter → 403
# ════════════════════════════════════════════════════════════════════


def test_invite_as_user_returns_403(client_user):
    r = client_user.post(
        "/api/members/invite",
        json={"email": "test@example.com", "role": "user"},
    )
    assert r.status_code == 403
    assert "administrateurs" in r.json()["detail"].lower()


# ════════════════════════════════════════════════════════════════════
# 9. Création d'un connecteur (admin) → 201
# ════════════════════════════════════════════════════════════════════


def test_create_connector_as_admin_returns_201(app):
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: make_user(role="admin")

    cur = make_cursor(
        fetchone_values=[
            None,  # pas de connecteur existant → va en créer un
            {"id": "conn-uuid-new"},  # INSERT connector RETURNING id
            {"id": "dept-uuid-1"},  # département existe dans la même org
            # INSERT connector_department → pas de fetch
        ]
    )

    dept_id = "dept-uuid-1"

    with patch("routes_connectors.get_db", lambda: db_ctx(cur)):
        r = TestClient(app, raise_server_exceptions=False).post(
            f"/api/connectors/slack/departments/{dept_id}",
        )

    app.dependency_overrides.clear()
    assert r.status_code == 201
    body = r.json()
    assert body["connector_type"] == "slack"
    assert body["department_id"] == dept_id
    assert body["status"] == "added"


# ════════════════════════════════════════════════════════════════════
# 10. Suppression d'un connecteur (admin) → 204
# ════════════════════════════════════════════════════════════════════


def test_remove_connector_department_as_admin_returns_204(app):
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: make_user(role="admin")

    cur = make_cursor(fetchone_values=[{"id": "conn-uuid-existing"}])  # _connector_id_or_404

    dept_id = "dept-uuid-1"

    with patch("routes_connectors.get_db", lambda: db_ctx(cur)):
        r = TestClient(app, raise_server_exceptions=False).delete(
            f"/api/connectors/slack/departments/{dept_id}",
        )

    app.dependency_overrides.clear()
    assert r.status_code == 204
