"""Chargement et rafraîchissement des credentials de connecteurs.

Utilisé par tous les _service.py pour obtenir les tokens/credentials déchiffrés.
"""
from __future__ import annotations

import json
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from crypto import decrypt, encrypt
from supabase_client import service_client


def load_creds(connector_type: str, org_id: str) -> tuple[dict, str] | tuple[None, None]:
    """Retourne (credentials_dict, connector_id) ou (None, None) si non connecté."""
    try:
        sb = service_client()
        res = (
            sb.table("connectors")
            .select("id, encrypted_credentials")
            .eq("organization_id", org_id)
            .eq("connector_type", connector_type)
            .eq("status", "connected")
            .limit(1)
            .execute()
        )
        if not res.data:
            return None, None
        row = res.data[0]
        return json.loads(decrypt(row["encrypted_credentials"])), row["id"]
    except Exception:
        return None, None


def refresh_oauth(
    creds: dict,
    connector_id: str,
    token_url: str,
    client_id_env: str,
    client_secret_env: str,
) -> dict:
    """Rafraîchit l'access_token si expiré (< 5 min restantes)."""
    try:
        expires_at = datetime.fromisoformat(creds.get("expires_at", "2000-01-01T00:00:00+00:00"))
    except ValueError:
        return creds

    if expires_at > datetime.now(UTC) + timedelta(minutes=5):
        return creds

    refresh_token = creds.get("refresh_token")
    if not refresh_token:
        return creds

    try:
        resp = httpx.post(token_url, data={
            "client_id":     os.environ.get(client_id_env, ""),
            "client_secret": os.environ.get(client_secret_env, ""),
            "refresh_token": refresh_token,
            "grant_type":    "refresh_token",
        }, timeout=12)
        if resp.status_code != 200:
            _mark_connector_error(
                connector_id,
                f"Token refresh failed: HTTP {resp.status_code} — {resp.text[:200]}",
            )
            return creds
        data = resp.json()
        new_expires_at = (datetime.now(UTC) + timedelta(seconds=data.get("expires_in", 3600))).isoformat()
        creds = {
            **creds,
            "access_token":  data.get("access_token", creds["access_token"]),
            "refresh_token": data.get("refresh_token", refresh_token),
            "expires_at":    new_expires_at,
        }
        service_client().table("connectors").update({
            "encrypted_credentials": encrypt(json.dumps(creds)),
            "token_expires_at":      new_expires_at,
            "updated_at":            datetime.now(UTC).isoformat(),
        }).eq("id", connector_id).execute()
    except Exception as exc:
        _mark_connector_error(connector_id, f"Token refresh exception: {exc}")

    return creds


def save_creds(connector_id: str, creds: dict) -> None:
    """Met à jour les credentials chiffrés d'un connecteur (ex: ajout de cloud_id dynamique)."""
    try:
        service_client().table("connectors").update({
            "encrypted_credentials": encrypt(json.dumps(creds)),
            "updated_at":            datetime.now(UTC).isoformat(),
        }).eq("id", connector_id).execute()
    except Exception:
        pass


def _mark_connector_error(connector_id: str, error_msg: str) -> None:
    """Passe le connecteur en status=error et persiste le message d'erreur."""
    try:
        service_client().table("connectors").update({
            "status":     "error",
            "last_error": error_msg[:500],
            "updated_at": datetime.now(UTC).isoformat(),
        }).eq("id", connector_id).execute()
    except Exception:
        pass


def bearer(creds: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {creds['access_token']}"}
