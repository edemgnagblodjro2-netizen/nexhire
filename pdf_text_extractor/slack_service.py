"""Slack — recherche messages, canaux et fichiers via Slack Web API.

Auth : Bot Token OAuth 2.0 stocké dans encrypted_credentials.
Le token Slack ne nécessite pas de refresh — durée de vie indéfinie jusqu'à révocation.
Env vars requises : SLACK_CLIENT_ID, SLACK_CLIENT_SECRET
"""
from __future__ import annotations

import httpx
from connector_loader import bearer, load_creds, refresh_oauth

_TOKEN_URL = "https://slack.com/api/oauth.v2.access"
_BASE      = "https://slack.com/api"


def search_slack(query: str, org_id: str,
                 source: str = "all", limit: int = 5) -> list[dict]:
    creds, cid = load_creds("slack", org_id)
    if not creds:
        return [{"error": "Slack non connecté"}]
    creds = refresh_oauth(creds, cid, _TOKEN_URL, "SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET")

    results: list[dict] = []

    # Messages
    if source in ("all", "messages"):
        try:
            r = httpx.get(f"{_BASE}/search.messages", headers=bearer(creds),
                          params={"query": query, "count": limit,
                                  "sort": "timestamp", "sort_dir": "desc"},
                          timeout=10)
            r.raise_for_status()
            data = r.json()
            if not data.get("ok"):
                results.append({"error": data.get("error", "Slack API error")})
            else:
                for m in (data.get("messages") or {}).get("matches", []):
                    results.append({
                        "type": "message", "source": "slack",
                        "texte": m.get("text", "")[:300],
                        "canal": (m.get("channel") or {}).get("name"),
                        "auteur": (m.get("username") or m.get("user")),
                        "date": m.get("ts"),
                        "permalink": m.get("permalink"),
                    })
        except Exception:
            pass

    # Files
    if source in ("all", "files") and len(results) < limit:
        try:
            r = httpx.get(f"{_BASE}/files.list", headers=bearer(creds),
                          params={"count": 3}, timeout=10)
            r.raise_for_status()
            data = r.json()
            if data.get("ok"):
                for f in data.get("files", []):
                    if query.lower() in (f.get("name") or "").lower() or not query:
                        results.append({
                            "type": "fichier", "source": "slack",
                            "nom": f.get("name"),
                            "url": f.get("url_private"),
                            "taille": f.get("size"),
                            "partagé_par": f.get("username"),
                        })
        except Exception:
            pass

    return results[:limit]
