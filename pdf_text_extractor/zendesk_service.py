"""Zendesk REST API — vrais appels à partir des tokens OAuth stockés."""
from __future__ import annotations

import os

import httpx
from connector_loader import bearer, load_creds, refresh_oauth


def _subdomain() -> str:
    return os.environ.get("ZENDESK_SUBDOMAIN", "")


def search_zendesk(
    query: str, org_id: str, status: str = "all", priority: str = "all", limit: int = 5
) -> list[dict]:
    creds, cid = load_creds("zendesk", org_id)
    if not creds:
        return [{"error": "Zendesk non connecté"}]

    sub = _subdomain()
    if not sub:
        return [{"error": "ZENDESK_SUBDOMAIN non configuré"}]

    token_url = f"https://{sub}.zendesk.com/oauth/tokens"
    creds = refresh_oauth(creds, cid, token_url, "ZENDESK_CLIENT_ID", "ZENDESK_CLIENT_SECRET")

    search_q = f"type:ticket {query}"
    if status != "all":
        search_q += f" status:{status}"
    if priority != "all":
        search_q += f" priority:{priority}"

    try:
        r = httpx.get(
            f"https://{sub}.zendesk.com/api/v2/search.json",
            headers=bearer(creds),
            params={"query": search_q, "per_page": limit, "sort_by": "updated_at", "sort_order": "desc"},
            timeout=12,
        )
        r.raise_for_status()
        return [
            {
                "id":       f"ZD-{t.get('id')}",
                "sujet":    t.get("subject"),
                "statut":   t.get("status"),
                "priorité": t.get("priority"),
                "assigné":  (t.get("assignee") or {}).get("name"),
                "créé":     t.get("created_at"),
                "source":   "zendesk",
            }
            for t in r.json().get("results", [])
        ]
    except Exception as exc:
        return [{"error": str(exc), "source": "zendesk"}]
