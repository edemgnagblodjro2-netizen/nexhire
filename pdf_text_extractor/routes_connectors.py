from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser
from crypto import encrypt
from db import get_db, rows, row
from rbac import require_active_subscription, require_min_role

VALID_TYPES = frozenset({
    "microsoft_365", "salesforce", "servicenow", "jira", "sap", "workday",
    "zendesk", "autotask", "hubspot",
})

router = APIRouter(prefix="/api/connectors", tags=["connectors"])


def _check_type(connector_type: str) -> None:
    if connector_type not in VALID_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Type de connecteur inconnu : {connector_type}. "
                   f"Valeurs acceptées : {sorted(VALID_TYPES)}",
        )


def _now() -> str:
    return datetime.now(UTC).isoformat()


@router.get("")
def list_connectors(user: CurrentUser = Depends(require_min_role("user"))):
    """Liste tous les connecteurs de l'organisation."""
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, connector_type, status, connected_at, last_error, updated_at
            FROM connectors
            WHERE organization_id = %s
            """,
            (user.organization_id,),
        )
        return rows(cur)


@router.get("/{connector_type}/status")
def connector_status(
    connector_type: str,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Statut d'un connecteur spécifique."""
    _check_type(connector_type)
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, connector_type, status, connected_at, last_error, updated_at
            FROM connectors
            WHERE organization_id = %s AND connector_type = %s
            LIMIT 1
            """,
            (user.organization_id, connector_type),
        )
        result = row(cur)
    if not result:
        return {"connector_type": connector_type, "status": "disconnected"}
    return result


@router.post("/{connector_type}/connect", status_code=status.HTTP_200_OK)
def connect(
    connector_type: str,
    request: Request,
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("admin")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Simule la connexion (option B : stocke {"simulated": true} chiffré Fernet)."""
    _check_type(connector_type)
    creds = encrypt(json.dumps({"simulated": True}))
    now = _now()

    with get_db() as cur:
        cur.execute(
            "SELECT id FROM connectors WHERE organization_id = %s AND connector_type = %s LIMIT 1",
            (user.organization_id, connector_type),
        )
        existing = row(cur)

    if existing:
        with get_db() as cur:
            cur.execute(
                """
                UPDATE connectors SET
                    status = %s,
                    encrypted_credentials = %s,
                    connected_at = %s,
                    last_error = NULL,
                    updated_at = %s
                WHERE id = %s
                """,
                ("connected", creds, now, now, existing["id"]),
            )
    else:
        with get_db() as cur:
            cur.execute(
                """
                INSERT INTO connectors (
                    organization_id, connector_type, status,
                    encrypted_credentials, connected_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (user.organization_id, connector_type, "connected", creds, now, now),
            )

    background.add_task(log_audit, AuditEvent(
        action="connector_connect",
        query=connector_type,
        organization_id=user.organization_id,
        user_id=user.id,
        connector=connector_type,
        ip_address=client_ip(request),
        http_status=200,
    ))
    return {"connector_type": connector_type, "status": "connected"}


@router.post("/{connector_type}/disconnect", status_code=status.HTTP_200_OK)
def disconnect(
    connector_type: str,
    request: Request,
    background: BackgroundTasks,
    user: CurrentUser = Depends(require_min_role("admin")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Déconnecte et efface les credentials chiffrés."""
    _check_type(connector_type)

    with get_db() as cur:
        cur.execute(
            """
            UPDATE connectors SET
                status = %s,
                encrypted_credentials = NULL,
                connected_at = NULL,
                updated_at = %s
            WHERE organization_id = %s AND connector_type = %s
            """,
            ("disconnected", _now(), user.organization_id, connector_type),
        )

    background.add_task(log_audit, AuditEvent(
        action="connector_disconnect",
        query=connector_type,
        organization_id=user.organization_id,
        user_id=user.id,
        connector=connector_type,
        ip_address=client_ip(request),
        http_status=200,
    ))
    return {"connector_type": connector_type, "status": "disconnected"}
