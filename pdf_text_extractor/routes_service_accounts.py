from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth import CurrentUser
from rbac import ROLE_RANK, require_min_role
from supabase_client import service_client

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
    sb = service_client()
    res = (
        sb.table("service_accounts")
        .select("id, name, description, role, token_prefix, created_at, last_used_at, is_active")
        .eq("organization_id", user.organization_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.post("", status_code=201)
def create_service_account(
    payload: CreateSAPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    token = "svc_" + secrets.token_hex(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    token_prefix = token[:12]

    sb = service_client()
    res = sb.table("service_accounts").insert({
        "organization_id": user.organization_id,
        "name": payload.name,
        "description": payload.description,
        "role": payload.role,
        "token_hash": token_hash,
        "token_prefix": token_prefix,
        "created_by": None if user.is_service_account else user.id,
    }).execute()

    row = res.data[0]
    # Token affiché une seule fois — jamais stocké en clair
    return {**row, "token": token}


@router.patch("/{sa_id}")
def update_service_account(
    sa_id: str,
    payload: UpdateSAPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    sb = service_client()
    _sa_or_404(sb, sa_id, user.organization_id)

    updates: dict = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.description is not None:
        updates["description"] = payload.description
    if payload.is_active is not None:
        updates["is_active"] = payload.is_active

    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ à mettre à jour.")

    res = sb.table("service_accounts").update(updates).eq("id", sa_id).execute()
    return res.data[0]


@router.delete("/{sa_id}", status_code=204)
def delete_service_account(
    sa_id: str,
    user: CurrentUser = Depends(require_min_role("owner")),
):
    sb = service_client()
    _sa_or_404(sb, sa_id, user.organization_id)
    sb.table("service_accounts").delete().eq("id", sa_id).execute()


def _sa_or_404(sb, sa_id: str, organization_id: str) -> dict:
    res = (
        sb.table("service_accounts")
        .select("id")
        .eq("id", sa_id)
        .eq("organization_id", organization_id)
        .limit(1)
        .execute()
    )
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="Service account introuvable.")
    return res.data[0]
