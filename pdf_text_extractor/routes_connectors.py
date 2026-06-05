from __future__ import annotations

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status

from auth import CurrentUser
from crypto import encrypt
from rbac import require_min_role
from supabase_client import service_client

VALID_TYPES = frozenset({
    "microsoft_365", "salesforce", "servicenow", "jira", "sap", "workday"
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
    sb = service_client()
    res = (
        sb.table("connectors")
        .select("id, connector_type, status, connected_at, last_error, updated_at")
        .eq("organization_id", user.organization_id)
        .execute()
    )
    return res.data or []


@router.get("/{connector_type}/status")
def connector_status(
    connector_type: str,
    user: CurrentUser = Depends(require_min_role("user")),
):
    """Statut d'un connecteur spécifique."""
    _check_type(connector_type)
    sb = service_client()
    res = (
        sb.table("connectors")
        .select("id, connector_type, status, connected_at, last_error, updated_at")
        .eq("organization_id", user.organization_id)
        .eq("connector_type", connector_type)
        .limit(1)
        .execute()
    )
    if not res.data:
        return {"connector_type": connector_type, "status": "disconnected"}
    return res.data[0]


@router.post("/{connector_type}/connect", status_code=status.HTTP_200_OK)
def connect(
    connector_type: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Simule la connexion (option B : stocke {"simulated": true} chiffré Fernet)."""
    _check_type(connector_type)
    sb = service_client()
    creds = encrypt(json.dumps({"simulated": True}))
    now = _now()

    existing = (
        sb.table("connectors")
        .select("id")
        .eq("organization_id", user.organization_id)
        .eq("connector_type", connector_type)
        .limit(1)
        .execute()
    )

    if existing.data:
        sb.table("connectors").update({
            "status": "connected",
            "encrypted_credentials": creds,
            "connected_at": now,
            "last_error": None,
            "updated_at": now,
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        sb.table("connectors").insert({
            "organization_id": user.organization_id,
            "connector_type": connector_type,
            "status": "connected",
            "encrypted_credentials": creds,
            "connected_at": now,
            "updated_at": now,
        }).execute()

    return {"connector_type": connector_type, "status": "connected"}


@router.post("/{connector_type}/disconnect", status_code=status.HTTP_200_OK)
def disconnect(
    connector_type: str,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Déconnecte et efface les credentials chiffrés."""
    _check_type(connector_type)
    sb = service_client()

    sb.table("connectors").update({
        "status": "disconnected",
        "encrypted_credentials": None,
        "connected_at": None,
        "updated_at": _now(),
    }).eq("organization_id", user.organization_id).eq("connector_type", connector_type).execute()

    return {"connector_type": connector_type, "status": "disconnected"}
