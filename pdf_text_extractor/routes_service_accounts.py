from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import CurrentUser
from db import get_db, rows, row
from rbac import ROLE_RANK, require_min_role

router = APIRouter(prefix="/api/service-accounts", tags=["service-accounts"])


class CreateSAPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    description: str | None = None
    role: str = Field("user", pattern="^(user|manager|admin)$")


class UpdateSAPayload(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    description: str | None = None
    is_active: bool | None = None


@router.get("")
def list_service_accounts(user: CurrentUser = Depends(require_min_role("admin"))):
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, name, description, role, token_prefix,
                   created_at, last_used_at, is_active
            FROM service_accounts
            WHERE organization_id = %s
            ORDER BY created_at DESC
            """,
            (user.organization_id,),
        )
        return rows(cur)


@router.post("", status_code=201)
def create_service_account(
    payload: CreateSAPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    token = "svc_" + secrets.token_hex(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    token_prefix = token[:12]

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO service_accounts (
                organization_id, name, description, role,
                token_hash, token_prefix, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user.organization_id,
                payload.name,
                payload.description,
                payload.role,
                token_hash,
                token_prefix,
                None if user.is_service_account else user.id,
            ),
        )
        result = row(cur)

    # Token affiché une seule fois — jamais stocké en clair
    return {**result, "token": token}


@router.patch("/{sa_id}")
def update_service_account(
    sa_id: str,
    payload: UpdateSAPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    _sa_or_404(sa_id, user.organization_id)

    updates: dict = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.description is not None:
        updates["description"] = payload.description
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active

    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour.")

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [sa_id, str(user.organization_id)]

    with get_db() as cur:
        cur.execute(
            f"UPDATE service_accounts SET {set_clause} WHERE id = %s AND organization_id = %s RETURNING *",
            values,
        )
        return row(cur)


@router.delete("/{sa_id}", status_code=204)
def delete_service_account(
    sa_id: str,
    user: CurrentUser = Depends(require_min_role("owner")),
):
    _sa_or_404(sa_id, user.organization_id)
    with get_db() as cur:
        cur.execute("DELETE FROM service_accounts WHERE id = %s", (sa_id,))


def _sa_or_404(sa_id: str, organization_id: str) -> dict:
    with get_db() as cur:
        cur.execute(
            "SELECT id FROM service_accounts WHERE id = %s AND organization_id = %s LIMIT 1",
            (sa_id, organization_id),
        )
        result = row(cur)
    if not result:
        raise HTTPException(status_code=404, detail="Service account introuvable.")
    return result
