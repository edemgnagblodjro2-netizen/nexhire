"""Slack — messages, canaux, fichiers et users via Slack Web API.

Auth : Bot Token (xoxb-) pour channels/files/users.
       User Token (xoxp- via authed_user_token) pour search.messages.
Bot tokens n'expirent pas — pas de refresh OAuth nécessaire.
Env vars : SLACK_CLIENT_ID, SLACK_CLIENT_SECRET
"""
from __future__ import annotations

import httpx
from connector_loader import load_creds

_BASE = "https://slack.com/api"


def _bot_headers(creds: dict) -> dict:
    return {"Authorization": f"Bearer {creds['access_token']}"}


def _user_headers(creds: dict) -> dict:
    token = creds.get("authed_user_token") or creds.get("access_token")
    return {"Authorization": f"Bearer {token}"}


def search_slack(query: str, org_id: str,
                 channel: str | None = None, limit: int = 5) -> list[dict]:
    creds, _ = load_creds("slack", org_id)
    if not creds:
        return [{"error": "Slack non connecté"}]

    results: list[dict] = []

    # Messages — requiert user token (search:read user scope)
    try:
        params: dict = {"query": query, "count": limit, "sort": "timestamp", "sort_dir": "desc"}
        if channel:
            params["query"] = f"in:#{channel.lstrip('#')} {query}"
        r = httpx.get(f"{_BASE}/search.messages", headers=_user_headers(creds),
                      params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
        if not data.get("ok"):
            results.append({"error": data.get("error", "search.messages error")})
        else:
            for m in (data.get("messages") or {}).get("matches", []):
                results.append({
                    "type":      "message",
                    "source":    "slack",
                    "texte":     m.get("text", "")[:300],
                    "canal":     (m.get("channel") or {}).get("name"),
                    "auteur":    m.get("username") or m.get("user"),
                    "date":      m.get("ts"),
                    "permalink": m.get("permalink"),
                })
    except Exception:
        pass

    # Fichiers — bot token (files:read)
    if len(results) < limit:
        try:
            r = httpx.get(f"{_BASE}/files.list", headers=_bot_headers(creds),
                          params={"count": min(5, limit - len(results))}, timeout=10)
            r.raise_for_status()
            data = r.json()
            if data.get("ok"):
                for f in data.get("files", []):
                    if not query or query.lower() in (f.get("name") or "").lower():
                        results.append({
                            "type":       "fichier",
                            "source":     "slack",
                            "nom":        f.get("name"),
                            "url":        f.get("url_private"),
                            "taille":     f.get("size"),
                            "partagé_par": f.get("username"),
                        })
        except Exception:
            pass

    return results[:limit]


def list_channels(org_id: str, limit: int = 200) -> list[dict]:
    """Retourne la liste des canaux publics (bot token, channels:read)."""
    creds, _ = load_creds("slack", org_id)
    if not creds:
        return []
    channels = []
    cursor = None
    try:
        while True:
            params: dict = {"types": "public_channel", "limit": min(limit, 200), "exclude_archived": True}
            if cursor:
                params["cursor"] = cursor
            r = httpx.get(f"{_BASE}/conversations.list", headers=_bot_headers(creds),
                          params=params, timeout=12)
            r.raise_for_status()
            data = r.json()
            if not data.get("ok"):
                break
            for ch in data.get("channels", []):
                channels.append({
                    "id":      ch["id"],
                    "name":    ch["name"],
                    "members": ch.get("num_members", 0),
                    "topic":   (ch.get("topic") or {}).get("value", ""),
                    "purpose": (ch.get("purpose") or {}).get("value", ""),
                })
            cursor = (data.get("response_metadata") or {}).get("next_cursor")
            if not cursor or len(channels) >= limit:
                break
    except Exception:
        pass
    return channels


def get_workspace_info(org_id: str) -> dict:
    """Retourne les infos du workspace (auth.test + team.info)."""
    creds, _ = load_creds("slack", org_id)
    if not creds:
        return {"error": "Slack non connecté"}
    try:
        r = httpx.get(f"{_BASE}/auth.test", headers=_bot_headers(creds), timeout=10)
        r.raise_for_status()
        data = r.json()
        if not data.get("ok"):
            return {"error": data.get("error")}
        return {
            "team":    data.get("team"),
            "team_id": data.get("team_id"),
            "bot_id":  data.get("bot_id"),
            "user_id": data.get("user_id"),
            "url":     data.get("url"),
        }
    except Exception as exc:
        return {"error": str(exc)}
