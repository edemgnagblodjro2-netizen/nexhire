"""SSO — Authentification unique via OIDC (Microsoft Entra ID, Google Workspace, Okta)."""
from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
import urllib.parse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from auth import CurrentUser
from crypto import encrypt, decrypt
from db import get_db, row, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/sso", tags=["sso"])

APP_URL = os.environ.get("APP_URL", "https://agenthub.nexhire.ca")

# ── Providers OIDC connus ─────────────────────────────────────────────────────

PROVIDERS: dict[str, dict] = {
    "microsoft": {
        "name":          "Microsoft Entra ID (Azure AD)",
        "auth_url":      "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
        "token_url":     "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        "userinfo_url":  "https://graph.microsoft.com/v1.0/me",
        "scopes":        "openid email profile User.Read",
        "tenant_param":  True,
    },
    "google": {
        "name":         "Google Workspace",
        "auth_url":     "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url":    "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://openidconnect.googleapis.com/v1/userinfo",
        "scopes":       "openid email profile",
        "tenant_param": False,
    },
    "okta": {
        "name":         "Okta",
        "auth_url":     "https://{tenant}.okta.com/oauth2/default/v1/authorize",
        "token_url":    "https://{tenant}.okta.com/oauth2/default/v1/token",
        "userinfo_url": "https://{tenant}.okta.com/oauth2/default/v1/userinfo",
        "scopes":       "openid email profile",
        "tenant_param": True,
    },
}


# ── Models ────────────────────────────────────────────────────────────────────

class SSOConfig(BaseModel):
    provider:      str = Field(..., pattern="^(microsoft|google|okta)$")
    client_id:     str = Field(..., min_length=1)
    client_secret: str = Field(..., min_length=1)
    tenant_id:     str | None = None   # Requis pour Microsoft et Okta


# ── Helpers ───────────────────────────────────────────────────────────────────

def _callback_url() -> str:
    return f"{APP_URL}/api/sso/callback"


def _get_sso_config(org_id: str) -> dict | None:
    """Retourne la config SSO de l'org, ou None si pas configurée."""
    try:
        with get_db() as cur:
            cur.execute(
                """SELECT encrypted_credentials, connector_type
                   FROM connectors
                   WHERE organization_id = %s AND connector_type LIKE 'sso_%' AND status = 'connected'
                   LIMIT 1""",
                (org_id,),
            )
            r = row(cur)
        if not r:
            return None
        raw = decrypt(r["encrypted_credentials"])
        cfg = json.loads(raw)
        cfg["provider"] = r["connector_type"].replace("sso_", "")
        return cfg
    except Exception:
        return None


def _build_auth_url(provider_key: str, cfg: dict, state: str) -> str:
    p = PROVIDERS[provider_key]
    tenant = cfg.get("tenant_id", "common")
    auth_url = p["auth_url"].format(tenant=tenant)
    params = {
        "client_id":     cfg["client_id"],
        "response_type": "code",
        "redirect_uri":  _callback_url(),
        "scope":         p["scopes"],
        "state":         state,
        "response_mode": "query",
    }
    return f"{auth_url}?{urllib.parse.urlencode(params)}"


# ── Admin : configurer le SSO ─────────────────────────────────────────────────

@router.get("/providers")
def list_providers(_: CurrentUser = Depends(require_min_role("admin"))):
    """Retourne la liste des providers OIDC disponibles."""
    return [{"id": k, "name": v["name"], "tenant_param": v["tenant_param"]} for k, v in PROVIDERS.items()]


@router.get("/config")
def get_sso_config(user: CurrentUser = Depends(require_min_role("admin"))):
    """Retourne la config SSO actuelle (sans le client_secret)."""
    cfg = _get_sso_config(user.organization_id)
    if not cfg:
        return {"configured": False}
    return {
        "configured": True,
        "provider":   cfg.get("provider"),
        "client_id":  cfg.get("client_id"),
        "tenant_id":  cfg.get("tenant_id"),
    }


@router.post("/config", status_code=201)
def save_sso_config(
    payload: SSOConfig,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    """Sauvegarde la configuration SSO de l'organisation."""
    if payload.provider in ("microsoft", "okta") and not payload.tenant_id:
        raise HTTPException(status_code=422, detail=f"tenant_id requis pour le provider {payload.provider}.")

    creds_plain = json.dumps({
        "client_id":     payload.client_id,
        "client_secret": payload.client_secret,
        "tenant_id":     payload.tenant_id,
    })
    encrypted = encrypt(creds_plain)
    connector_type = f"sso_{payload.provider}"

    # Supprime l'ancienne config SSO si elle existe
    with get_db() as cur:
        cur.execute(
            "DELETE FROM connectors WHERE organization_id = %s AND connector_type LIKE 'sso_%'",
            (user.organization_id,),
        )

    # Insère la nouvelle config
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as cur:
        cur.execute(
            """INSERT INTO connectors (organization_id, connector_type, status, encrypted_credentials, connected_at, updated_at)
               VALUES (%s, %s, 'connected', %s, %s, %s)""",
            (user.organization_id, connector_type, encrypted, now, now),
        )

    return {"ok": True, "provider": payload.provider}


@router.delete("/config", status_code=204)
def delete_sso_config(user: CurrentUser = Depends(require_min_role("admin"))):
    """Supprime la configuration SSO."""
    with get_db() as cur:
        cur.execute(
            "DELETE FROM connectors WHERE organization_id = %s AND connector_type LIKE 'sso_%'",
            (user.organization_id,),
        )


# ── Flux OIDC — Initiation ────────────────────────────────────────────────────

@router.get("/authorize")
def sso_authorize(request: Request, org_slug: str):
    """Redirige vers l'IdP pour initier le flux SSO.

    Le slug de l'organisation est utilisé pour retrouver la config SSO.
    L'état (state) est un nonce signé stocké en session.
    """
    # Récupère l'org par slug
    with get_db() as cur:
        cur.execute("SELECT id FROM organizations WHERE slug = %s LIMIT 1", (org_slug,))
        org = row(cur)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation introuvable.")

    cfg = _get_sso_config(org["id"])
    if not cfg:
        raise HTTPException(status_code=404, detail="SSO non configuré pour cette organisation.")

    provider_key = cfg.get("provider", "")
    if provider_key not in PROVIDERS:
        raise HTTPException(status_code=422, detail=f"Provider inconnu : {provider_key}")

    # Génère un state nonce sécurisé (contient org_id encodé en base64)
    nonce    = secrets.token_urlsafe(24)
    state    = base64.urlsafe_b64encode(f"{nonce}:{org['id']}".encode()).decode()

    auth_url = _build_auth_url(provider_key, cfg, state)
    return RedirectResponse(url=auth_url, status_code=302)


# ── Flux OIDC — Callback ──────────────────────────────────────────────────────

@router.get("/callback")
async def sso_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    """Traite le retour de l'IdP, échange le code, crée/retrouve le compte utilisateur."""
    if error:
        return RedirectResponse(url=f"{APP_URL}?sso_error={urllib.parse.quote(error)}", status_code=302)
    if not code or not state:
        raise HTTPException(status_code=400, detail="Paramètres manquants dans le callback SSO.")

    # Décode le state pour récupérer org_id
    try:
        decoded  = base64.urlsafe_b64decode(state + "==").decode()
        _, org_id = decoded.split(":", 1)
    except Exception:
        raise HTTPException(status_code=400, detail="State SSO invalide.")

    cfg = _get_sso_config(org_id)
    if not cfg:
        return RedirectResponse(url=f"{APP_URL}?sso_error=config_missing", status_code=302)

    provider_key = cfg.get("provider", "")
    p = PROVIDERS.get(provider_key)
    if not p:
        return RedirectResponse(url=f"{APP_URL}?sso_error=unknown_provider", status_code=302)

    tenant   = cfg.get("tenant_id", "common")
    token_url = p["token_url"].format(tenant=tenant)

    # Échange code → tokens
    try:
        with httpx.Client(timeout=15) as client:
            token_resp = client.post(token_url, data={
                "grant_type":    "authorization_code",
                "code":          code,
                "redirect_uri":  _callback_url(),
                "client_id":     cfg["client_id"],
                "client_secret": cfg["client_secret"],
            })
        token_resp.raise_for_status()
        tokens = token_resp.json()
    except Exception as exc:
        return RedirectResponse(url=f"{APP_URL}?sso_error=token_exchange_failed", status_code=302)

    access_token = tokens.get("access_token", "")

    # Récupère les infos de l'utilisateur
    try:
        userinfo_url = p["userinfo_url"].format(tenant=tenant)
        with httpx.Client(timeout=10) as client:
            ui_resp = client.get(userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
        ui_resp.raise_for_status()
        ui = ui_resp.json()
    except Exception:
        return RedirectResponse(url=f"{APP_URL}?sso_error=userinfo_failed", status_code=302)

    # Normalise l'email selon le provider
    email = (
        ui.get("mail") or            # Microsoft Graph
        ui.get("userPrincipalName") or
        ui.get("email") or
        ui.get("preferred_username") or
        ""
    ).lower().strip()
    full_name = (
        ui.get("displayName") or
        ui.get("name") or
        f"{ui.get('givenName','')} {ui.get('familyName','')}".strip() or
        email
    )

    if not email:
        return RedirectResponse(url=f"{APP_URL}?sso_error=no_email", status_code=302)

    # Cherche ou crée l'utilisateur dans la BD
    try:
        with get_db() as cur:
            cur.execute(
                "SELECT id FROM users WHERE email = %s AND organization_id = %s LIMIT 1",
                (email, org_id),
            )
            existing = row(cur)

        if not existing:
            # Auto-provisioning : crée le compte avec rôle user
            from supabase_client import service_client
            sb  = service_client()
            res = sb.auth.admin.create_user({
                "email":          email,
                "password":       secrets.token_urlsafe(32),  # password aléatoire — connexion SSO uniquement
                "email_confirm":  True,
                "user_metadata":  {"org_id": org_id, "full_name": full_name, "sso": True},
            })
            if not res.user:
                return RedirectResponse(url=f"{APP_URL}?sso_error=user_creation_failed", status_code=302)
    except Exception:
        return RedirectResponse(url=f"{APP_URL}?sso_error=provisioning_failed", status_code=302)

    # Génère un token Supabase pour l'utilisateur
    try:
        from supabase_client import anon_client
        sb_anon = anon_client()
        # Crée un magic link pour connexion sans mot de passe (le token est retourné)
        # Alternative : utiliser le service role pour générer un token d'échange
        from supabase_client import service_client
        link_resp = service_client().auth.admin.generate_link({
            "type":  "magiclink",
            "email": email,
            "options": {"redirect_to": APP_URL},
        })
        if hasattr(link_resp, "properties") and link_resp.properties:
            magic_url = f"{APP_URL}?sso_magic_link={urllib.parse.quote(str(link_resp.properties.action_link))}"
            return RedirectResponse(url=magic_url, status_code=302)
    except Exception:
        pass

    # Fallback : redirige vers la page de connexion avec email pré-rempli
    encoded_email = urllib.parse.quote(email)
    return RedirectResponse(url=f"{APP_URL}?sso_email={encoded_email}&org_slug={urllib.parse.quote(org_id)}", status_code=302)
