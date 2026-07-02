"""Microsoft 365 — vrais appels Microsoft Graph API.

Gère l'accès aux emails, fichiers OneDrive/SharePoint et réunions Teams
à partir des tokens OAuth stockés chiffrés en base.
"""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timedelta

import httpx

from crypto import decrypt, encrypt
from supabase_client import service_client

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"


# ── Gestion des tokens ────────────────────────────────────────────────────────


def _load_tokens(org_id: str) -> tuple[dict, str] | tuple[None, None]:
    """Retourne (tokens_dict, connector_id) ou (None, None) si non connecté."""
    sb = service_client()
    res = (
        sb.table("connectors")
        .select("id, encrypted_credentials")
        .eq("organization_id", org_id)
        .eq("connector_type", "microsoft_365")
        .eq("status", "connected")
        .limit(1)
        .execute()
    )
    if not res.data:
        return None, None
    row = res.data[0]
    try:
        return json.loads(decrypt(row["encrypted_credentials"])), row["id"]
    except Exception:
        return None, None


def _refresh_if_needed(tokens: dict, connector_id: str) -> dict:
    """Rafraîchit l'access_token si expiré ou expirant dans moins de 5 minutes."""
    try:
        expires_at = datetime.fromisoformat(tokens["expires_at"])
    except (KeyError, ValueError):
        return tokens

    if expires_at > datetime.now(UTC) + timedelta(minutes=5):
        return tokens

    try:
        resp = httpx.post(
            TOKEN_URL,
            data={
                "client_id": os.environ["M365_CLIENT_ID"],
                "client_secret": os.environ["M365_CLIENT_SECRET"],
                "refresh_token": tokens["refresh_token"],
                "grant_type": "refresh_token",
            },
            timeout=10,
        )

        if resp.status_code in (400, 401):
            # Refresh token expiré ou révoqué → marque le connecteur en erreur
            service_client().table("connectors").update(
                {
                    "status": "error",
                    "last_error": "Token expiré — le compte de service M365 doit être reconnecté.",
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", connector_id).execute()
            return tokens

        if resp.status_code != 200:
            return tokens

        data = resp.json()
        now = datetime.now(UTC)
        new_expires_at = (now + timedelta(seconds=data.get("expires_in", 3600))).isoformat()
        got_new_refresh = bool(data.get("refresh_token"))
        tokens = {
            **tokens,
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token", tokens["refresh_token"]),
            "expires_at": new_expires_at,
        }
        update_payload: dict = {
            "encrypted_credentials": encrypt(json.dumps(tokens)),
            "token_expires_at": new_expires_at,
            "updated_at": now.isoformat(),
            "status": "connected",
            "last_error": None,
        }
        # Réinitialise l'horloge d'expiration si un nouveau refresh token est émis
        if got_new_refresh:
            update_payload["refresh_token_issued_at"] = now.isoformat()

        service_client().table("connectors").update(update_payload).eq("id", connector_id).execute()
    except Exception:
        pass

    return tokens


def _headers(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


# ── Appels Graph API ──────────────────────────────────────────────────────────


def search_emails(query: str, tokens: dict, limit: int = 5) -> list[dict]:
    try:
        r = httpx.get(
            f"{GRAPH_BASE}/me/messages",
            headers=_headers(tokens),
            params={
                "$search": f'"{query}"',
                "$top": limit,
                "$select": "subject,from,receivedDateTime,isRead,bodyPreview",
            },
            timeout=10,
        )
        if r.status_code != 200:
            return []
        return [
            {
                "type": "email",
                "de": m.get("from", {}).get("emailAddress", {}).get("address"),
                "objet": m.get("subject"),
                "date": m.get("receivedDateTime"),
                "lu": m.get("isRead"),
                "apercu": m.get("bodyPreview", "")[:200],
            }
            for m in r.json().get("value", [])
        ]
    except httpx.RequestError:
        return []


def search_files(query: str, tokens: dict, limit: int = 5) -> list[dict]:
    try:
        r = httpx.get(
            f"{GRAPH_BASE}/me/drive/search(q='{query}')",
            headers=_headers(tokens),
            params={"$top": limit, "$select": "name,webUrl,lastModifiedDateTime,lastModifiedBy,size"},
            timeout=10,
        )
        if r.status_code != 200:
            return []
        return [
            {
                "type": "fichier",
                "nom": f.get("name"),
                "url": f.get("webUrl"),
                "modifie": f.get("lastModifiedDateTime"),
                "par": f.get("lastModifiedBy", {}).get("user", {}).get("displayName"),
            }
            for f in r.json().get("value", [])
        ]
    except httpx.RequestError:
        return []


def search_calendar(query: str, tokens: dict, limit: int = 5) -> list[dict]:
    try:
        r = httpx.get(
            f"{GRAPH_BASE}/me/events",
            headers=_headers(tokens),
            params={
                "$top": limit,
                "$orderby": "start/dateTime desc",
                "$filter": f"contains(subject,'{query}')",
                "$select": "subject,start,end,organizer,isOnlineMeeting",
            },
            timeout=10,
        )
        if r.status_code != 200:
            return []
        return [
            {
                "type": "evenement",
                "sujet": e.get("subject"),
                "debut": e.get("start", {}).get("dateTime"),
                "fin": e.get("end", {}).get("dateTime"),
                "organisateur": e.get("organizer", {}).get("emailAddress", {}).get("name"),
                "teams": e.get("isOnlineMeeting", False),
            }
            for e in r.json().get("value", [])
        ]
    except httpx.RequestError:
        return []


# ── Point d'entrée principal ──────────────────────────────────────────────────


def search_microsoft_365(query: str, org_id: str, limit: int = 5) -> list[dict]:
    """Recherche emails + fichiers + calendrier dans le tenant M365 de l'org."""
    tokens, connector_id = _load_tokens(org_id)
    if tokens is None:
        return [{"error": "Microsoft 365 non connecté ou tokens invalides"}]

    tokens = _refresh_if_needed(tokens, connector_id)

    results: list[dict] = []
    results.extend(search_emails(query, tokens, limit))
    results.extend(search_files(query, tokens, limit))
    results.extend(search_calendar(query, tokens, limit))
    return results[:limit]
