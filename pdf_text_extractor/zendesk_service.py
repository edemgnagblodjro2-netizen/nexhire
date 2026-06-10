"""Zendesk REST API — API Token par organisation.

Les credentials sont saisis par l'admin dans le formulaire connecteur
et stockés chiffrés en base. Aucune variable d'env, aucune app OAuth à créer.
Auth : email/token (format Basic — email:token encodé en base64).
"""
from __future__ import annotations

import base64

import httpx
from connector_loader import load_creds


def _auth_header(email: str, api_token: str) -> dict:
    token = base64.b64encode(f"{email}/token:{api_token}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def search_zendesk(
    query: str, org_id: str, status: str = "all", priority: str = "all", limit: int = 5
) -> list[dict]:
    creds, _ = load_creds("zendesk", org_id)
    if not creds:
        return [{"error": "Zendesk non connecté"}]

    subdomain = creds.get("subdomain", "").strip()
    email     = creds.get("email", "").strip()
    api_token = creds.get("api_token", "").strip()

    if not subdomain or not email or not api_token:
        return [{"error": "Credentials Zendesk incomplets — reconfigurer le connecteur"}]

    search_q = f"type:ticket {query}"
    if status != "all":
        search_q += f" status:{status}"
    if priority != "all":
        search_q += f" priority:{priority}"

    try:
        r = httpx.get(
            f"https://{subdomain}.zendesk.com/api/v2/search.json",
            headers=_auth_header(email, api_token),
            params={"query": search_q, "per_page": limit,
                    "sort_by": "updated_at", "sort_order": "desc"},
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
    except httpx.HTTPStatusError as exc:
        return [{"error": f"Zendesk HTTP {exc.response.status_code}", "source": "zendesk"}]
    except Exception as exc:
        return [{"error": str(exc), "source": "zendesk"}]
