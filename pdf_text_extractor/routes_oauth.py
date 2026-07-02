"""OAuth 2.0 — Authorization Code Flow pour les connecteurs d'entreprise.

Connecteurs OAuth complets : microsoft_365, salesforce, servicenow, jira,
                              zendesk, hubspot, google_workspace, slack, quickbooks
Connecteurs API-key         : sap, workday, autotask  (via /api/connectors/{type}/credentials)
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse

from audit import AuditEvent, client_ip, log_audit
from auth import CurrentUser
from crypto import decrypt, encrypt
from db import get_db, rows, row
from rbac import require_active_subscription, require_min_role

router = APIRouter(prefix="/api/connectors", tags=["connectors-oauth"])

_STATE_TTL = 10  # minutes
APP_URL = os.environ.get("APP_URL", "https://myportal.nexhire.ca")
# URL de callback unique pour tous les connecteurs OAuth
OAUTH_CALLBACK_URL = os.environ.get("BASE_URL", APP_URL) + "/api/connectors/oauth/callback"

# ── Config des connecteurs OAuth ──────────────────────────────────────────────

_OAUTH_CFG: dict[str, dict] = {
    "microsoft_365": {
        "auth_url":    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url":   "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        # Scopes délégués — admin consent requis pour les scopes *.All
        # Mail/Files/Calendar/Chat : recherche agent pour l'utilisateur connecté
        # User.Read.All / Directory.Read.All : collecteur identités & licences tenant-wide
        # Reports.Read.All : rapport d'utilisation M365 30j (activity score)
        # UserAuthenticationMethod.Read.All : statut MFA (beta endpoint)
        # AuditLog.Read.All : signInActivity (Entra ID P1/P2 — graceful fallback si absent)
        "scopes":      "openid profile email offline_access "
                       "Mail.Read Files.Read.All Sites.Read.All Calendars.Read Chat.Read "
                       "User.Read User.Read.All Directory.Read.All "
                       "Reports.Read.All UserAuthenticationMethod.Read.All AuditLog.Read.All",
        "client_id_env":     "M365_CLIENT_ID",
        "client_secret_env": "M365_CLIENT_SECRET",
        "redirect_uri_env":  "M365_REDIRECT_URI",
        "extra_params": {"prompt": "consent"},  # force le consentement admin à chaque connexion
    },
    "salesforce": {
        "auth_url":   "https://login.salesforce.com/services/oauth2/authorize",
        "token_url":  "https://login.salesforce.com/services/oauth2/token",
        "scopes":     "api refresh_token offline_access",
        "client_id_env":     "SF_CLIENT_ID",
        "client_secret_env": "SF_CLIENT_SECRET",
        "redirect_uri_env":  "SF_REDIRECT_URI",
        "pkce":       True,
    },
    "jira": {
        "auth_url":  "https://auth.atlassian.com/authorize",
        "token_url": "https://auth.atlassian.com/oauth/token",
        "scopes":    "read:jira-work read:jira-user read:confluence-content.all "
                     "read:confluence-space.summary offline_access",
        "client_id_env":     "JIRA_CLIENT_ID",
        "client_secret_env": "JIRA_CLIENT_SECRET",
        "redirect_uri_env":  "JIRA_REDIRECT_URI",
        "extra_params": {"audience": "api.atlassian.com", "prompt": "consent"},
    },
    "hubspot": {
        "auth_url":  "https://app.hubspot.com/oauth/authorize",
        "token_url": "https://api.hubapi.com/oauth/v1/token",
        "scopes":    "crm.objects.contacts.read crm.objects.deals.read "
                     "crm.objects.companies.read tickets",
        "client_id_env":     "HUBSPOT_CLIENT_ID",
        "client_secret_env": "HUBSPOT_CLIENT_SECRET",
        "redirect_uri_env":  "HUBSPOT_REDIRECT_URI",
    },
    "google_workspace": {
        "auth_url":  "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scopes":    "openid email profile "
                     "https://www.googleapis.com/auth/drive.readonly "
                     "https://www.googleapis.com/auth/gmail.readonly "
                     "https://www.googleapis.com/auth/calendar.readonly "
                     "https://www.googleapis.com/auth/admin.directory.user.readonly",
        "client_id_env":     "GOOGLE_CLIENT_ID",
        "client_secret_env": "GOOGLE_CLIENT_SECRET",
        "redirect_uri_env":  "GOOGLE_REDIRECT_URI",
        "extra_params": {"access_type": "offline", "prompt": "consent"},
    },
    "slack": {
        "auth_url":   "https://slack.com/oauth/v2/authorize",
        "token_url":  "https://slack.com/api/oauth.v2.access",
        # Bot scopes — installed at workspace level
        "scopes":     "channels:read channels:history files:read users:read team:read",
        # User scope — search:read is user-only in Slack v2; passed as user_scope in auth URL
        "user_scopes": "search:read",
        "client_id_env":     "SLACK_CLIENT_ID",
        "client_secret_env": "SLACK_CLIENT_SECRET",
        "redirect_uri_env":  "SLACK_REDIRECT_URI",
    },
    "quickbooks": {
        "auth_url":  "https://appcenter.intuit.com/connect/oauth2",
        "token_url": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        "scopes":    "com.intuit.quickbooks.accounting",
        "client_id_env":     "QUICKBOOKS_CLIENT_ID",
        "client_secret_env": "QUICKBOOKS_CLIENT_SECRET",
        "redirect_uri_env":  "QUICKBOOKS_REDIRECT_URI",
    },
}

# ServiceNow is handled separately (instance URL in DB, not env)
_SNOW_OAUTH = {
    "client_id_env":     "SNOW_CLIENT_ID",
    "client_secret_env": "SNOW_CLIENT_SECRET",
    "instance_url_env":  "SNOW_INSTANCE_URL",
    "redirect_uri_env":  "SNOW_REDIRECT_URI",
    "scopes":            "useraccount",
}

_APIKEY_TYPES = frozenset({"sap", "workday", "autotask"})


# ── PKCE helpers ──────────────────────────────────────────────────────────────

def _pkce_pair() -> tuple[str, str]:
    """Retourne (code_verifier, code_challenge) pour PKCE S256."""
    verifier = secrets.token_urlsafe(32)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge


# ── CSRF state helpers ────────────────────────────────────────────────────────

def _make_state(org_id: str, user_id: str, connector: str, extra: dict | None = None) -> str:
    payload = json.dumps({
        "org_id":     org_id,
        "user_id":    user_id,
        "connector":  connector,
        "expires_at": (datetime.now(UTC) + timedelta(minutes=_STATE_TTL)).isoformat(),
        **(extra or {}),
    })
    return encrypt(payload)


def _parse_state(state: str) -> dict:
    try:
        data = json.loads(decrypt(state))
    except Exception:
        raise HTTPException(status_code=400, detail="State OAuth invalide ou altéré.")
    if datetime.fromisoformat(data["expires_at"]) < datetime.now(UTC):
        raise HTTPException(status_code=400, detail="State OAuth expiré — relancez la connexion.")
    return data


# ── Upsert helper ─────────────────────────────────────────────────────────────

# Colonnes autorisées dans la table connectors — whitelist anti-injection SQL
_CONNECTOR_ALLOWED_COLS: frozenset[str] = frozenset({
    "status", "encrypted_credentials", "connected_at", "last_error",
    "updated_at", "token_expires_at", "instance_url", "domain", "base_url",
    "app_id", "client_id", "refresh_token", "access_token_encrypted",
    "scopes", "expires_at", "user_info", "refresh_token_issued_at",
})


def _upsert_connector(org_id: str, connector_type: str, credentials: dict, extra: dict | None = None):
    encrypted = encrypt(json.dumps(credentials))
    now = datetime.now(UTC).isoformat()
    # Merge extra après filtrage whitelist — empêche l'injection de noms de colonnes
    safe_extra = {k: v for k, v in (extra or {}).items() if k in _CONNECTOR_ALLOWED_COLS}
    payload_fields = {
        "status":                "connected",
        "encrypted_credentials": encrypted,
        "connected_at":          now,
        "last_error":            None,
        "updated_at":            now,
        "token_expires_at":      None,
        **safe_extra,
    }

    with get_db() as cur:
        cur.execute(
            """
            SELECT id FROM connectors
            WHERE organization_id = %s AND connector_type = %s
            LIMIT 1
            """,
            (org_id, connector_type),
        )
        existing = row(cur)

    if existing:
        set_parts = ", ".join(f"{k} = %s" for k in payload_fields)
        values = list(payload_fields.values()) + [existing["id"]]
        with get_db() as cur:
            cur.execute(
                f"UPDATE connectors SET {set_parts} WHERE id = %s",
                values,
            )
    else:
        all_fields = {"organization_id": org_id, "connector_type": connector_type, **payload_fields}
        cols = ", ".join(all_fields.keys())
        placeholders = ", ".join(["%s"] * len(all_fields))
        with get_db() as cur:
            cur.execute(
                f"INSERT INTO connectors ({cols}) VALUES ({placeholders})",
                list(all_fields.values()),
            )


# ── Generic OAuth start ───────────────────────────────────────────────────────

def _resolve_cfg(connector_type: str, state_extra: dict | None = None) -> dict:
    """Returns OAuth config. state_extra carries per-org credentials for ServiceNow/Zendesk."""
    if connector_type == "servicenow":
        # Per-org: credentials come from state (passed by frontend) or env fallback
        se           = state_extra or {}
        instance_url = (se.get("snow_instance_url") or os.environ.get("SNOW_INSTANCE_URL", "")).rstrip("/")
        client_id    = se.get("snow_client_id")    or os.environ.get("SNOW_CLIENT_ID", "")
        client_secret= se.get("snow_client_secret") or os.environ.get("SNOW_CLIENT_SECRET", "")
        if not client_id or not instance_url:
            raise HTTPException(503, "Credentials ServiceNow manquants (instance URL + Client ID requis).")
        return {
            "client_id":     client_id,
            "client_secret": client_secret,
            "redirect_uri":  f"{APP_URL}/api/connectors/oauth/callback",
            "auth_url":      f"{instance_url}/oauth_auth.do",
            "token_url":     f"{instance_url}/oauth_token.do",
            "scopes":        _SNOW_OAUTH["scopes"],
            "extra_params":  {},
        }

    if connector_type == "zendesk":
        # Per-org: each client registers NexHire in their own Zendesk instance
        se            = state_extra or {}
        subdomain     = (se.get("zendesk_subdomain") or os.environ.get("ZENDESK_SUBDOMAIN", "")).strip().rstrip("/")
        client_id     = se.get("zendesk_client_id")    or os.environ.get("ZENDESK_CLIENT_ID", "")
        client_secret = se.get("zendesk_client_secret") or os.environ.get("ZENDESK_CLIENT_SECRET", "")
        if not subdomain or not client_id:
            raise HTTPException(503, "Credentials Zendesk manquants (subdomain + Client ID requis).")
        return {
            "client_id":     client_id,
            "client_secret": client_secret,
            "redirect_uri":  f"{APP_URL}/api/connectors/oauth/callback",
            "auth_url":      f"https://{subdomain}.zendesk.com/oauth/authorizations/new",
            "token_url":     f"https://{subdomain}.zendesk.com/oauth/tokens",
            "scopes":        "read",
            "extra_params":  {},
        }

    cfg = _OAUTH_CFG.get(connector_type)
    if not cfg:
        raise HTTPException(422, f"Connecteur OAuth inconnu : {connector_type}")

    client_id = os.environ.get(cfg["client_id_env"], "")
    if not client_id:
        raise HTTPException(503, f"{cfg['client_id_env']} non configuré sur le serveur.")

    if "subdomain_env" in cfg:
        # Zendesk: subdomain per-org from state, or global env fallback
        sub = (state_extra or {}).get("zendesk_subdomain") or os.environ.get(cfg["subdomain_env"], "")
        if not sub:
            raise HTTPException(503, "Sous-domaine Zendesk manquant.")
        auth_url  = cfg["auth_url_tpl"].format(subdomain=sub)
        token_url = cfg["token_url_tpl"].format(subdomain=sub)
    else:
        auth_url  = cfg["auth_url"]
        token_url = cfg["token_url"]

    return {
        "client_id":     client_id,
        "client_secret": os.environ.get(cfg["client_secret_env"], ""),
        "redirect_uri":  os.environ.get(cfg.get("redirect_uri_env", ""), "") or OAUTH_CALLBACK_URL,
        "auth_url":      auth_url,
        "token_url":     token_url,
        "scopes":        cfg["scopes"],
        "extra_params":  cfg.get("extra_params", {}),
    }


@router.post("/{connector_type}/oauth/start")
def oauth_start(
    connector_type: str,
    body: dict = Body(default={}),
    user: CurrentUser = Depends(require_min_role("admin")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Retourne l'URL d'autorisation OAuth pour le connecteur demandé.
    Pour ServiceNow et Zendesk, le body peut contenir les credentials per-org :
      ServiceNow : {snow_instance_url, snow_client_id, snow_client_secret}
      Zendesk    : {zendesk_subdomain}
    """
    if connector_type not in _OAUTH_CFG and connector_type not in ("servicenow", "zendesk"):
        raise HTTPException(422, f"OAuth non supporté pour : {connector_type}")
    if not user.organization_id:
        raise HTTPException(400, "Compte non rattaché à une organisation.")

    # Extrait les extras per-org pour ServiceNow / Zendesk
    extra: dict = {}
    if connector_type == "servicenow":
        for k in ("snow_instance_url", "snow_client_id", "snow_client_secret"):
            if body.get(k): extra[k] = body[k]
    if connector_type == "zendesk":
        for k in ("zendesk_subdomain", "zendesk_client_id", "zendesk_client_secret"):
            if body.get(k): extra[k] = body[k]

    # Stocker le slug workspace pour la redirect post-callback
    partner_slug = (body.get("partner_slug") or "").strip()
    if partner_slug:
        extra["partner_slug"] = partner_slug

    c = _resolve_cfg(connector_type, state_extra=extra)

    # PKCE — génère verifier/challenge si le connecteur l'exige (ex: Salesforce)
    cfg_entry = _OAUTH_CFG.get(connector_type, {})
    pkce_verifier: str | None = None
    if cfg_entry.get("pkce"):
        pkce_verifier, pkce_challenge = _pkce_pair()
        extra["pkce_verifier"] = pkce_verifier

    state = _make_state(user.organization_id, user.id, connector_type, extra=extra if extra else None)
    params: dict = {
        "client_id":     c["client_id"],
        "response_type": "code",
        "redirect_uri":  c["redirect_uri"],
        "scope":         c["scopes"],
        "state":         state,
        **c["extra_params"],
    }
    if pkce_verifier:
        params["code_challenge"]        = pkce_challenge
        params["code_challenge_method"] = "S256"

    # M365 wants response_mode=query
    if connector_type == "microsoft_365":
        params["response_mode"] = "query"
        params["prompt"] = "select_account"

    # Slack v2: user scopes (e.g. search:read) go in a separate user_scope param
    cfg_entry_full = _OAUTH_CFG.get(connector_type, {})
    if cfg_entry_full.get("user_scopes"):
        params["user_scope"] = cfg_entry_full["user_scopes"]

    return {"authorization_url": f"{c['auth_url']}?{urlencode(params)}"}


# ── Callback universel ────────────────────────────────────────────────────────

@router.get("/oauth/callback")
def oauth_callback(
    request: Request,
    background: BackgroundTasks,
    code:              str        = Query(default=None),
    state:             str        = Query(default=None),
    error:             str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    realmId:           str | None = Query(default=None),
):
    if error or not code or not state:
        return RedirectResponse(url=f"/?oauth_error={error or 'missing_params'}", status_code=302)

    state_data     = _parse_state(state)
    connector_type = state_data["connector"]
    org_id         = state_data["org_id"]
    user_id        = state_data["user_id"]

    c = _resolve_cfg(connector_type, state_extra=state_data)

    token_data: dict = {
        "client_id":     c["client_id"],
        "client_secret": c["client_secret"],
        "code":          code,
        "redirect_uri":  c["redirect_uri"],
        "grant_type":    "authorization_code",
    }
    # PKCE — inclure le verifier si présent dans le state
    if state_data.get("pkce_verifier"):
        token_data["code_verifier"] = state_data["pkce_verifier"]

    try:
        resp = httpx.post(c["token_url"], data=token_data, timeout=20)
    except httpx.RequestError as exc:
        return RedirectResponse(url=f"/?oauth_error=network_error", status_code=302)

    if resp.status_code != 200:
        return RedirectResponse(url="/?oauth_error=token_exchange_failed", status_code=302)

    tokens      = resp.json()
    expires_in  = tokens.get("expires_in", 3600)
    credentials = {
        "access_token":  tokens.get("access_token", ""),
        "refresh_token": tokens.get("refresh_token"),
        "expires_at":    (datetime.now(UTC) + timedelta(seconds=expires_in)).isoformat(),
        "scope":         tokens.get("scope", c["scopes"]),
        "token_type":    tokens.get("token_type", "Bearer"),
    }
    # Salesforce also returns instance_url for API calls
    if connector_type == "salesforce" and "instance_url" in tokens:
        credentials["instance_url"] = tokens["instance_url"]
    # QuickBooks realmId (company ID) arrives as a query param, not in the token
    # QUICKBOOKS_SANDBOX=true → sandbox-quickbooks.api.intuit.com (dev/test)
    if connector_type == "quickbooks" and realmId:
        credentials["realm_id"] = realmId
        import os
        credentials["sandbox"] = os.environ.get("QUICKBOOKS_SANDBOX", "true").lower() == "true"
    # Slack v2: bot token is under access_token but authed_user has a separate user token
    if connector_type == "slack" and "authed_user" in tokens:
        credentials["authed_user_token"] = tokens["authed_user"].get("access_token", "")
    # Jira: fetch cloud_id now while the token is fresh — évite un aller-retour à chaque appel agent
    if connector_type == "jira":
        try:
            r_res = httpx.get(
                "https://api.atlassian.com/oauth/token/accessible-resources",
                headers={"Authorization": f"Bearer {credentials['access_token']}"},
                timeout=10,
            )
            if r_res.status_code == 200:
                resources = r_res.json()
                if resources:
                    credentials["cloud_id"]  = resources[0]["id"]
                    credentials["cloud_url"] = resources[0].get("url", "")
        except Exception:
            pass

    # QuickBooks refresh tokens expire after 101 days (Intuit policy).
    # Write token_expires_at so the health endpoint can alert 7 days before.
    db_extra: dict | None = None
    if connector_type == "quickbooks":
        db_extra = {"token_expires_at": (datetime.now(UTC) + timedelta(days=101)).isoformat()}
    # M365 refresh tokens expirent après 90 jours d'inactivité — horodater l'émission
    if connector_type == "microsoft_365":
        db_extra = {"refresh_token_issued_at": datetime.now(UTC).isoformat()}

    _upsert_connector(org_id, connector_type, credentials, extra=db_extra)

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
    _slug = state_data.get("partner_slug", "")
    _dest = (f"/workspace/{_slug}/integrations?connected={connector_type}"
             if _slug else f"/?connected={connector_type}&tab=connectors")
    return RedirectResponse(url=_dest, status_code=302)


# ── API-key credential endpoint (SAP, Workday, Autotask, …) ──────────────────

@router.post("/{connector_type}/credentials")
def save_credentials(
    connector_type: str,
    request: Request,
    background: BackgroundTasks,
    payload: dict = Body(...),
    user: CurrentUser = Depends(require_min_role("admin")),
    _active: CurrentUser = Depends(require_active_subscription),
):
    """Stocke des credentials API-key / basic-auth chiffrés (Fernet)."""
    if connector_type not in _APIKEY_TYPES:
        # Also allow any VALID_TYPES connector to store API-key creds as fallback
        from routes_connectors import VALID_TYPES
        if connector_type not in VALID_TYPES:
            raise HTTPException(422, f"Connecteur inconnu : {connector_type}")

    if not payload:
        raise HTTPException(400, "Aucune credential fournie.")

    # Sanitize — strip empty values
    creds = {k: v for k, v in payload.items() if v}
    if not creds:
        raise HTTPException(400, "Toutes les credentials sont vides.")

    _upsert_connector(user.organization_id, connector_type, creds)

    background.add_task(log_audit, AuditEvent(
        action="connector_connect",
        query=connector_type,
        organization_id=user.organization_id,
        user_id=user.id,
        connector=connector_type,
        ip_address=client_ip(request),
        http_status=200,
        metadata={"method": "api_key", "fields": list(creds.keys())},
    ))
    return {"connector_type": connector_type, "status": "connected"}


# ── Token refresh (internal helper) ──────────────────────────────────────────

def refresh_token_if_needed(connector_type: str, org_id: str) -> dict | None:
    """Refreshes the OAuth access token if expired. Returns updated credentials or None."""
    if connector_type not in _OAUTH_CFG and connector_type not in ("servicenow", "zendesk"):
        return None
    try:
        with get_db() as cur:
            cur.execute(
                """
                SELECT encrypted_credentials FROM connectors
                WHERE organization_id = %s AND connector_type = %s AND status = 'connected'
                LIMIT 1
                """,
                (org_id, connector_type),
            )
            r = row(cur)
        if not r:
            return None
        creds = json.loads(decrypt(r["encrypted_credentials"]))
        expires_at = datetime.fromisoformat(creds.get("expires_at", "2000-01-01T00:00:00+00:00"))
        if expires_at > datetime.now(UTC) + timedelta(minutes=5):
            return creds  # still valid

        refresh_token = creds.get("refresh_token")
        if not refresh_token:
            return creds  # no refresh token, return as-is

        c = _resolve_cfg(connector_type)
        resp = httpx.post(c["token_url"], data={
            "client_id":     c["client_id"],
            "client_secret": c["client_secret"],
            "refresh_token": refresh_token,
            "grant_type":    "refresh_token",
        }, timeout=15)
        if resp.status_code != 200:
            return creds
        tokens = resp.json()
        creds["access_token"] = tokens.get("access_token", creds["access_token"])
        if tokens.get("refresh_token"):
            creds["refresh_token"] = tokens["refresh_token"]
        creds["expires_at"] = (
            datetime.now(UTC) + timedelta(seconds=tokens.get("expires_in", 3600))
        ).isoformat()
        _upsert_connector(org_id, connector_type, creds)
        return creds
    except Exception:
        return None
