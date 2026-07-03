"""Tests pagination — Sprint 3B CivicAI Engineering Pack."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from conftest import db_ctx, make_cursor, make_user
from pagination import PageParams, paginated, paginated_union

# ════════════════════════════════════════════════════════════════════
# Tests unitaires — module pagination.py
# ════════════════════════════════════════════════════════════════════


def test_page_params_defaults():
    """Paramètres par défaut : limit=50, offset=0."""
    p = PageParams(limit=50, offset=0)
    assert p.limit == 50
    assert p.offset == 0


def test_page_response_empty():
    """Réponse correcte pour un résultat vide."""
    p = PageParams(limit=50, offset=0)
    result = p.response([])
    assert result["total"] == 0
    assert result["items"] == []
    assert result["has_more"] is False


def test_page_response_with_items():
    """_total extrait, items nettoyés, has_more calculé."""
    p = PageParams(limit=2, offset=0)
    rows = [
        {"id": "a", "name": "Alice", "_total": 5},
        {"id": "b", "name": "Bob", "_total": 5},
    ]
    result = p.response(rows)
    assert result["total"] == 5
    assert result["has_more"] is True
    assert len(result["items"]) == 2
    # _total ne doit pas apparaître dans les items
    assert "_total" not in result["items"][0]


def test_page_response_last_page():
    """has_more=False sur la dernière page."""
    p = PageParams(limit=3, offset=2)
    rows = [{"id": "c", "_total": 3}]
    result = p.response(rows)
    assert result["has_more"] is False  # offset(2) + len(1) = 3 = total → pas de suite


def test_paginated_sql_wraps_correctly():
    """paginated() enveloppe correctement avec COUNT(*) OVER () et LIMIT/OFFSET."""
    sql = paginated("SELECT id FROM items WHERE org = %s", order_by="id")
    assert "COUNT(*) OVER () AS _total" in sql
    assert "ORDER BY id" in sql
    assert "LIMIT %s OFFSET %s" in sql


def test_paginated_union_alias():
    """paginated_union() est un alias de paginated() — même résultat."""
    inner = "SELECT id FROM a UNION SELECT id FROM b"
    sql1 = paginated(inner, order_by="id")
    sql2 = paginated_union(inner, order_by="id")
    assert sql1.strip() == sql2.strip()


# ════════════════════════════════════════════════════════════════════
# Tests d'intégration — GET /api/audit
# ════════════════════════════════════════════════════════════════════


def test_audit_pagination_default(app):
    """GET /api/audit retourne l'enveloppe standard avec items + total + has_more."""
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: make_user(role="admin")

    cur = make_cursor(
        fetchall_values=[
            [
                {
                    "id": "log-1",
                    "action": "auth_login",
                    "query": "admin@civicai.ca",
                    "connector": None,
                    "success": True,
                    "ip_address": "1.2.3.4",
                    "http_status": 200,
                    "resource_ids": None,
                    "error_detail": None,
                    "user_id": "user-1",
                    "created_at": "2026-07-01T10:00:00",
                    "_total": 1,
                }
            ]
        ]
    )

    with patch("routes_audit.get_db", lambda: db_ctx(cur)):
        r = TestClient(app, raise_server_exceptions=False).get("/api/audit")

    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "total" in body
    assert "has_more" in body
    assert "logs" in body  # rétrocompatibilité
    assert body["total"] == 1
    assert body["has_more"] is False
    assert "_total" not in body["items"][0]


def test_audit_pagination_params(app):
    """GET /api/audit?limit=10&offset=20 transmet les bons paramètres."""
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: make_user(role="admin")
    cur = make_cursor(fetchall_values=[[]])  # aucun résultat

    with patch("routes_audit.get_db", lambda: db_ctx(cur)):
        r = TestClient(app, raise_server_exceptions=False).get("/api/audit?limit=10&offset=20")

    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert body["limit"] == 10
    assert body["offset"] == 20


def test_audit_limit_max_enforced(app):
    """limit > 200 doit être rejeté (validation FastAPI)."""
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: make_user(role="admin")

    r = TestClient(app, raise_server_exceptions=False).get("/api/audit?limit=999")
    app.dependency_overrides.clear()
    assert r.status_code == 422


# ════════════════════════════════════════════════════════════════════
# Tests d'intégration — GET /api/members
# ════════════════════════════════════════════════════════════════════


def test_members_pagination_envelope(app):
    """GET /api/members retourne items + total + members (rétrocompat)."""
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: make_user(role="admin")

    member_row = {
        "id": "u-1",
        "email": "alice@civicai.ca",
        "full_name": "Alice",
        "role": "user",
        "is_active": True,
        "created_at": "2026-01-01T00:00:00",
        "conflicted": False,
        "_total": 1,
    }
    cur = make_cursor(fetchall_values=[[member_row]])

    with patch("routes_members.get_db", lambda: db_ctx(cur)):
        r = TestClient(app, raise_server_exceptions=False).get("/api/members")

    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert "members" in body  # rétrocompatibilité
    assert body["total"] == 1
    assert body["items"][0]["email"] == "alice@civicai.ca"


def test_members_has_more_true(app):
    """has_more=True quand total > offset + len(items)."""
    from auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: make_user(role="admin")

    # 2 items retournés mais total = 50
    items = [
        {
            "id": f"u-{i}",
            "email": f"u{i}@x.ca",
            "full_name": f"User {i}",
            "role": "user",
            "is_active": True,
            "created_at": "2026-01-01",
            "conflicted": False,
            "_total": 50,
        }
        for i in range(2)
    ]
    cur = make_cursor(fetchall_values=[items])

    with patch("routes_members.get_db", lambda: db_ctx(cur)):
        r = TestClient(app, raise_server_exceptions=False).get("/api/members?limit=2&offset=0")

    app.dependency_overrides.clear()
    assert r.json()["has_more"] is True
    assert r.json()["total"] == 50
