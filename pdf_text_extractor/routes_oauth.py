"""OAuth 2.0 — flux Authorization Code pour les connecteurs d'entreprise.

Endpoints :
  POST /api/connectors/microsoft_365/oauth/start  → retourne {"authorization_url": "..."}
  GET  /api/connectors/oauth/callback             → échange le code, stocke les tokens
"""
from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser
from crypto import decrypt, encrypt
from rbac import require_active_subscription, require_min_role
from supabase_client import service_client

router = APIRouter(prefix="/api/connectors", tags=["connectors-oauth"])

# ── Microsoft 365 ─────────────────────────────────────────────────────────────
_M365_SCOPES = " ".join([
    "openid", "profile", "email", "offline_access",
    "Mail.Read", "Files.Read.All", "Sites.Read.All",
    "Calendars.Read", "Chat.Read", "User.Read",
])
_M365_AUTH_URL  = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
_M365_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"

_STATE_TTL = 10  # minutes


# ── State CSRF ────────────────────────────────────────────────────────────────

def _make_state(org_id: str, user_id: str, connector: str) -> str:
    payload = json.dumps({
        "org_id":     org_id,
        "user_id":    user_id,
        "connector":  connector,
        "expires_at": (datetime.now(UTC) + timedelta(minutes=_STATE_TTL)).isoformat(),
    })
    return encrypt(payload)


def _parse_state(state: str) -> dict:
    try:
        data = json.loads(decrypt(state))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="State OAuth invalide ou altéré.")
    if datetime.fromisoformat(data["expires_at"]) < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="State OAuth expiré — relance la connexion.")
    return data


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/microsoft_365/oauth/start")
def m365_oauth_start(
    user: CurrentUser = Depends(require_min_role("admin")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Crée l'URL d'autorisation Microsoft 365 (Authorization Code Flow)."""
    if not user.organization_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Votre compte n'est pas rattaché à une organisation.")
    client_id    = os.environ.get("M365_CLIENT_ID")
    redirect_uri = os.environ.get("M365_REDIRECT_URI", "")
    if not client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="M365_CLIENT_ID non configuré sur le serveur.")

    state = _make_state(user.organization_id, user.id, "microsoft_365")
    params = urlencode({
        "client_id":     client_id,
        "response_type": "code",
        "redirect_uri":  redirect_uri,
        "scope":         _M365_SCOPES,
        "state":         state,
        "response_mode": "query",
        "prompt":        "select_account",
    })
    return {"authorization_url": f"{_M365_AUTH_URL}?{params}"}


@router.get("/oauth/callback")
def oauth_callback(
    request: Request,
    background: BackgroundTasks,
    code:              str       = Query(...),
    state:             str       = Query(...),
    error:             str | None = Query(default=None),
    error_description: str | None = Query(default=None),
):
    """Callback OAuth générique — échange le code contre les tokens et stocke."""
    if error:
        # Redirige vers le frontend avec le message d'erreur
        return RedirectResponse(url=f"/?oauth_error={error}", status_code=302)

    state_data     = _parse_state(state)
    connector_type = state_data["connector"]
    org_id         = state_data["org_id"]
    user_id        = state_data["user_id"]

    # Paramètres selon le type de connecteur
    if connector_type == "microsoft_365":
        client_id    = os.environ.get("M365_CLIENT_ID", "")
        client_secret = os.environ.get("M365_CLIENT_SECRET", "")
        redirect_uri = os.environ.get("M365_REDIRECT_URI", "")
        token_url    = _M365_TOKEN_URL
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Connecteur OAuth non supporté : {connector_type}")

    # Échange code → tokens
    try:
        resp = httpx.post(token_url, data={
            "client_id":     client_id,
            "client_secret": client_secret,
            "code":          code,
            "redirect_uri":  redirect_uri,
            "grant_type":    "authorization_code",
        }, timeout=15)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"Token exchange réseau échoué : {exc}") from exc

    if resp.status_code != 200:
        return RedirectResponse(url="/?oauth_error=token_exchange_failed", status_code=302)

    tokens_data  = resp.json()
    expires_in   = tokens_data.get("expires_in", 3600)
    credentials  = {
        "access_token":  tokens_data["access_token"],
        "refresh_token": tokens_data.get("refresh_token"),
        "expires_at":    (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat(),
        "scope":         tokens_data.get("scope", ""),
        "token_type":    tokens_data.get("token_type", "Bearer"),
    }
    encrypted = encrypt(json.dumps(credentials))
    now = datetime.now(UTC).isoformat()
    sb  = service_client()

    existing = (
        sb.table("connectors")
        .select("id")
        .eq("organization_id", org_id)
        .eq("connector_type", connector_type)
        .limit(1)
        .execute()
    )
    if existing.data:
        sb.table("connectors").update({
            "status":                "connected",
            "encrypted_credentials": encrypted,
            "connected_at":          now,
            "last_error":            None,
            "updated_at":            now,
        }).eq("id", existing.data[0]["id"]).execute()
    else:
        sb.table("connectors").insert({
            "organization_id":       org_id,
            "connector_type":        connector_type,
            "status":                "connected",
            "encrypted_credentials": encrypted,
            "connected_at":          now,
            "updated_at":            now,
        }).execute()

    background.add_task(log_audit, AuditEvent(
        action="connector_connect",
        query=connector_type,
        organization_id=org_id,
        user_id=user_id,
        connector=connector_type,
        ip_address=client_ip(request),
        http_status=200,
        metadata={"oauth": True, "scope": credentials["scope"][:120]},
    ))

    return RedirectResponse(url="/?connected=microsoft_365&tab=connectors", status_code=302)
